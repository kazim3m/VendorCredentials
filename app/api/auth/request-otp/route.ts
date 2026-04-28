import { NextResponse } from "next/server";
import { requestOtpForEmail } from "@/lib/otp";
import { requestOtpSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = requestOtpSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  await requestOtpForEmail(parsed.data.email);
  return NextResponse.json({ ok: true });
}
