import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { personInputSchema } from "@/lib/validation";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  await requireAdmin();
  try {
    const payload = await request.json().catch(() => null);
    const parsed = personInputSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const person = await prisma.person.update({
      where: { id: params.id },
      data: {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        nationality: data.nationality,
        purpose: data.purpose,
        passportNumber: data.passportNumber,
        passportIssueDate: new Date(`${data.passportIssueDate}T00:00:00.000Z`),
        passportExpiryDate: new Date(`${data.passportExpiryDate}T00:00:00.000Z`),
        eidIssueDate: new Date(`${data.eidIssueDate}T00:00:00.000Z`),
        eidExpiryDate: new Date(`${data.eidExpiryDate}T00:00:00.000Z`)
      }
    });
    return NextResponse.json(person);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update person.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireAdmin();
  try {
    await prisma.person.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete person.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
