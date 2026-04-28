import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { projectCreateSchema } from "@/lib/validation";

export async function GET() {
  await requireAdmin();
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true },
      },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  await requireAdmin();
  const payload = await request.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    },
  });

  return NextResponse.json({ project });
}
