import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { uploadCompleteSchema, validateUploadFile } from "@/lib/validation";

const fieldMap: Record<string, { key: string; url: string }> = {
  photo: { key: "photoBlobKey", url: "photoBlobUrl" },
  passportScan: { key: "passportBlobKey", url: "passportBlobUrl" },
  eidFront: { key: "eidFrontBlobKey", url: "eidFrontBlobUrl" },
  eidBack: { key: "eidBackBlobKey", url: "eidBackBlobUrl" },
};

export async function POST(request: Request) {
  const sessionData = await getAuthSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = uploadCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const valid = validateUploadFile({
    contentType: parsed.data.contentType ?? "image/jpeg",
    size: parsed.data.size ?? 1024,
    filename: parsed.data.blobKey
  });
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const person = await prisma.person.findUnique({
    where: { id: parsed.data.personId },
    select: { id: true },
  });

  if (!person) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }

  const canUpload =
    sessionData.user.role === "ADMIN" || sessionData.user.personId === parsed.data.personId;
  if (!canUpload) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const mapped = fieldMap[parsed.data.field];
  await prisma.person.update({
    where: { id: person.id },
    data: {
      [mapped.key]: parsed.data.blobKey,
      [mapped.url]: parsed.data.blobUrl,
    },
  });

  return NextResponse.json({ ok: true });
}
