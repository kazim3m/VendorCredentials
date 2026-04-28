import { z } from "zod";

export const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const emailSchema = z.string().trim().email().max(255).transform((v) => v.toLowerCase());
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const requestOtpSchema = z.object({
  email: emailSchema
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/)
});

// Backwards-compatible aliases for any remaining imports.
export const otpRequestSchema = requestOtpSchema;
export const otpVerifySchema = verifyOtpSchema;

export const userCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "USER"]),
  enabled: z.boolean().optional(),
  personId: z.string().cuid().nullable().optional()
});

export const userUpdateSchema = z.object({
  role: z.enum(["ADMIN", "USER"]).optional(),
  enabled: z.boolean().optional(),
  personId: z.string().cuid().nullable().optional()
});

export const personCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().min(1).max(100),
  nationality: z.string().trim().min(1).max(120),
  purpose: z.string().trim().min(1).max(255),
  passportNumber: z.string().trim().min(1).max(100),
  passportIssueDate: dateString,
  passportExpiryDate: dateString,
  eidIssueDate: dateString,
  eidExpiryDate: dateString
});

export const personInputSchema = personCreateSchema;

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable()
});

export const projectInputSchema = projectCreateSchema;

export const projectMembersSchema = z.object({
  personIds: z.array(z.string().cuid()).max(1000)
});

export function parseUploadPathname(pathname: string):
  | { ok: true; personId: string; field: "photo" | "passportScan" | "eidFront" | "eidBack" }
  | { ok: false; error: string } {
  if (!pathname) {
    return { ok: false, error: "Missing upload pathname." };
  }

  // Expected: people/<personId>/<field>/<filename>
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 4 || parts[0] !== "people") {
    return { ok: false, error: "Invalid upload path." };
  }

  const personId = parts[1];
  const field = parts[2];
  if (!z.string().cuid().safeParse(personId).success) {
    return { ok: false, error: "Invalid person id in pathname." };
  }
  if (!["photo", "passportScan", "eidFront", "eidBack"].includes(field)) {
    return { ok: false, error: "Invalid document field in pathname." };
  }

  return {
    ok: true,
    personId,
    field: field as "photo" | "passportScan" | "eidFront" | "eidBack"
  };
}

export function validateUploadFile(input: {
  contentType: string;
  size: number;
  filename?: string;
}): { ok: true } | { ok: false; error: string } {
  const ct = input.contentType.toLowerCase();
  if (!ALLOWED_UPLOAD_TYPES.includes(ct as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return { ok: false, error: "Unsupported content type. Use JPG/JPEG/PNG only." };
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { ok: false, error: "Invalid file size." };
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds 10MB limit." };
  }
  if (input.filename) {
    const lower = input.filename.toLowerCase();
    if (!(lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png"))) {
      return { ok: false, error: "Filename extension must be .jpg, .jpeg, or .png." };
    }
  }
  return { ok: true };
}

export const uploadCompleteSchema = z.object({
  personId: z.string().cuid(),
  field: z.enum(["photo", "passportScan", "eidFront", "eidBack"]),
  blobUrl: z.string().url().or(z.string().startsWith("http://")).or(z.string().startsWith("https://")),
  blobKey: z.string().min(1),
  contentType: z.string().optional(),
  size: z.number().optional()
});
