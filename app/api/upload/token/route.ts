import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, parseUploadPathname } from "@/lib/validation";

export async function POST(request: Request) {
  const sessionData = await getAuthSession();
  if (!sessionData) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, _multipart) => {
        const parsed = parseUploadPathname(pathname);
        if (!parsed.ok) {
          throw new Error(parsed.error);
        }

        const person = await prisma.person.findUnique({
          where: { id: parsed.personId },
          select: { id: true, firstName: true, lastName: true },
        });
        if (!person) {
          throw new Error("Person not found.");
        }

        const canUpload =
          sessionData.user.role === "ADMIN" || sessionData.user.personId === person.id;

        if (!canUpload) {
          throw new Error("You are not allowed to upload for this person.");
        }

        const normalizedName = pathname.toLowerCase();
        if (
          !normalizedName.endsWith(".jpg") &&
          !normalizedName.endsWith(".jpeg") &&
          !normalizedName.endsWith(".png")
        ) {
          throw new Error("Only jpg/jpeg/png extensions are allowed.");
        }

        const safePayload = JSON.stringify({
          personId: person.id,
          field: parsed.field,
          actorId: sessionData.user.id,
          clientPayload: clientPayload ?? null,
        });

        return {
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: false,
          tokenPayload: safePayload,
        };
      },
      onUploadCompleted: async () => {
        // No-op. We update DB in /api/upload/complete from client with returned blob metadata.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate upload token.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
