import { NextResponse } from "next/server";
import { createSessionForUser } from "@/lib/auth";
import { verifyOtpForEmail } from "@/lib/otp";
import { verifyOtpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await verifyOtpForEmail(parsed.data.email, parsed.data.otp);
  if (!result.ok || !result.user) {
    return NextResponse.json({ error: result.message }, { status: 401 });
  }

  await createSessionForUser(result.user);
  return NextResponse.json({ ok: true });
}
