export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  CRON_SECRET: process.env.CRON_SECRET ?? "",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  OTP_FROM_EMAIL: process.env.OTP_FROM_EMAIL ?? "",
  ALERT_TO_EMAIL: process.env.ALERT_TO_EMAIL ?? "",
  SESSION_SECRET: process.env.SESSION_SECRET ?? ""
} as const;

export function requireEnv(name: keyof typeof env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
