import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { hashValue, secureEqual } from "@/lib/security";

const OTP_TTL_MINUTES = 10;

function generateOtpCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestOtpForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Avoid account enumeration.
  if (!user || !user.enabled) {
    return { ok: true };
  }

  const code = generateOtpCode();
  const codeHash = hashValue(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      codeHash,
      expiresAt
    }
  });

  await sendOtpEmail(normalizedEmail, code);
  return { ok: true };
}

export async function verifyOtpForEmail(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.enabled) {
    return { ok: false, message: "Invalid credentials." };
  }

  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      email: normalizedEmail,
      usedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  if (!otpRecord) {
    return { ok: false, message: "No OTP found." };
  }

  if (otpRecord.expiresAt < new Date()) {
    return { ok: false, message: "OTP has expired." };
  }

  const providedHash = hashValue(code.trim());
  if (!secureEqual(providedHash, otpRecord.codeHash)) {
    return { ok: false, message: "Invalid OTP code." };
  }

  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { usedAt: new Date() }
  });

  return { ok: true, user };
}
