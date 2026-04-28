import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { userCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        role: parsed.data.role as UserRole,
        enabled: parsed.data.enabled ?? true,
        personId: parsed.data.personId ?? null,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
