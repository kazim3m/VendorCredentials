import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { projectInputSchema } from "@/lib/validation";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  await requireAdmin();
  try {
    const body = await request.json().catch(() => null);
    const parsed = projectInputSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
      },
    });

    return NextResponse.json({ project: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireAdmin();
  try {
    await prisma.project.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
