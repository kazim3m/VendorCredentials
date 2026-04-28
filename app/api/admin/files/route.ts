import { NextResponse } from "next/server";
import { getPrivateBlobReadable } from "@/lib/blob";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { verifyDownloadToken } from "@/lib/security";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionData = await getAuthSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const url = searchParams.get("url");
  const personId = searchParams.get("personId");
  const field = searchParams.get("field");
  const requestedContentType = searchParams.get("contentType") ?? undefined;
  const sig = searchParams.get("sig");
  const expiresRaw = searchParams.get("expires");
  const expires = expiresRaw ? Number(expiresRaw) : NaN;

  let blobRef = path ?? url;

  if (!blobRef) {
    if (!personId || !field) {
      return NextResponse.json({ error: "Missing file reference." }, { status: 400 });
    }

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        photoBlobKey: true,
        passportBlobKey: true,
        eidFrontBlobKey: true,
        eidBackBlobKey: true,
        pdfBlobKey: true,
      },
    });

    if (!person) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    const allowed =
      sessionData.user.role === "ADMIN" || sessionData.user.personId === person.id;
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    switch (field) {
      case "photo":
        blobRef = person.photoBlobKey;
        break;
      case "passport":
      case "passportScan":
        blobRef = person.passportBlobKey;
        break;
      case "eidFront":
        blobRef = person.eidFrontBlobKey;
        break;
      case "eidBack":
        blobRef = person.eidBackBlobKey;
        break;
      case "pdf":
        blobRef = person.pdfBlobKey;
        break;
      default:
        return NextResponse.json({ error: "Invalid field." }, { status: 400 });
    }
  } else if (sessionData.user.role !== "ADMIN") {
    if (
      !sig ||
      !Number.isFinite(expires) ||
      !verifyDownloadToken(blobRef, expires, sig, env.SESSION_SECRET)
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  if (!blobRef) {
    return NextResponse.json({ error: "File is missing." }, { status: 404 });
  }

  const blob = await getPrivateBlobReadable(blobRef);
  if (!blob || !blob.stream || !blob.blob) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const filename = blob.blob.pathname.split("/").pop() ?? "file";
  const contentType = requestedContentType ?? blob.blob.contentType ?? "application/octet-stream";

  return new NextResponse(blob.stream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
