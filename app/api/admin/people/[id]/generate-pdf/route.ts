import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generatePersonPdf } from "@/lib/pdf";

type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
  await requireAdmin();

  try {
    const person = await prisma.person.findUnique({ where: { id: params.id } });
    if (!person) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    const result = await generatePersonPdf(person.id);
    return NextResponse.json({ ok: true, pdfUrl: result.downloadUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
