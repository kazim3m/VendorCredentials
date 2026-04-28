import { PassThrough } from "stream";
import { put } from "@vercel/blob";
import archiver from "archiver";
import { getPrivateBlobStream } from "@/lib/blob";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createDownloadToken } from "@/lib/security";
import { formatDateOnly, makePersonFileBase, normalizeDateOnly, sanitizeFilename } from "@/lib/utils";

type ZipEntry = {
  name: string;
  stream: NodeJS.ReadableStream | ReadableStream;
};

async function createZipBuffer(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const out = new PassThrough();
    const chunks: Buffer[] = [];

    out.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    out.on("end", () => resolve(Buffer.concat(chunks)));
    out.on("error", reject);
    archive.on("error", reject);

    archive.pipe(out);
    for (const entry of entries) {
      archive.append(entry.stream as any, { name: entry.name });
    }
    archive.finalize().catch(reject);
  });
}

async function streamFromUrl(url: string) {
  return getPrivateBlobStream(url);
}

export async function exportProjectToBlob(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          person: true,
        },
        orderBy: {
          person: {
            firstName: "asc",
          },
        },
      },
    },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  const csvRows = [
    [
      "name",
      "nationality",
      "purpose",
      "passportNumber",
      "passportExpiryDate",
      "eidExpiryDate",
      "passportStatus",
      "eidStatus",
    ].join(","),
  ];

  const personZipEntries: ZipEntry[] = [];
  for (const member of project.members) {
    const person = member.person;
    const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
    csvRows.push(
      [
        JSON.stringify(fullName),
        JSON.stringify(person.nationality),
        JSON.stringify(person.purpose),
        JSON.stringify(person.passportNumber),
        normalizeDateOnly(person.passportExpiryDate),
        normalizeDateOnly(person.eidExpiryDate),
        person.passportStatus,
        person.eidStatus,
      ].join(","),
    );

    if (!person.photoBlobUrl || !person.passportBlobUrl || !person.eidFrontBlobUrl || !person.eidBackBlobUrl || !person.pdfBlobUrl) {
      continue;
    }

    const base = makePersonFileBase(person.firstName, person.lastName);
    const nestedZip = await createZipBuffer([
      {
        name: `${base}.pdf`,
        stream: await streamFromUrl(person.pdfBlobUrl),
      },
      {
        name: `${base}_photo.jpg`,
        stream: await streamFromUrl(person.photoBlobUrl),
      },
      {
        name: `${base}_passport.jpg`,
        stream: await streamFromUrl(person.passportBlobUrl),
      },
      {
        name: `${base}_eid_front.jpg`,
        stream: await streamFromUrl(person.eidFrontBlobUrl),
      },
      {
        name: `${base}_eid_back.jpg`,
        stream: await streamFromUrl(person.eidBackBlobUrl),
      },
    ]);

    const nested = new PassThrough();
    nested.end(nestedZip);
    personZipEntries.push({
      name: `${base}.zip`,
      stream: nested,
    });
  }

  const rosterBuffer = Buffer.from(csvRows.join("\n"), "utf8");
  const rosterStream = new PassThrough();
  rosterStream.end(rosterBuffer);

  const projectZipBuffer = await createZipBuffer([
    {
      name: "project_roster.csv",
      stream: rosterStream,
    },
    ...personZipEntries,
  ]);

  const safeProjectName = sanitizeFilename(project.name);
  const day = formatDateOnly(new Date());
  const path = `exports/${project.id}/${safeProjectName}_${day}.zip`;
  const uploaded = await put(path, projectZipBuffer, {
    access: "private",
    addRandomSuffix: true,
    contentType: "application/zip",
  });

  return {
    blobUrl: uploaded.url,
    downloadUrl: uploaded.downloadUrl,
    pathname: uploaded.pathname,
    membersExported: personZipEntries.length,
  };
}

export async function buildProjectExport(projectId: string) {
  const result = await exportProjectToBlob(projectId);
  const expires = Date.now() + 1000 * 60 * 30;
  const token = createDownloadToken(result.pathname, expires, env.SESSION_SECRET);
  return {
    ok: true,
    projectZipKey: result.pathname,
    projectZipUrl: result.blobUrl,
    downloadUrl: `/api/admin/files?path=${encodeURIComponent(result.pathname)}&contentType=${encodeURIComponent("application/zip")}&expires=${expires}&sig=${token}`,
    membersExported: result.membersExported
  };
}
