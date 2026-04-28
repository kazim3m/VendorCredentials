import { Resend } from "resend";
import { env } from "@/lib/env";

function getResendClient() {
  if (!env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(env.RESEND_API_KEY);
}

export async function sendOtpEmail(to: string, otp: string) {
  await getResendClient().emails.send({
    from: env.OTP_FROM_EMAIL,
    to,
    subject: "Your OTP Code",
    html: `<p>Your one-time login code is:</p><p style="font-size:22px;font-weight:700;letter-spacing:4px">${otp}</p><p>This code expires in 10 minutes.</p>`
  });
}

type ExpirySummaryRow = {
  fullName: string;
  passportStatus: string;
  eidStatus: string;
  passportExpiryDate: Date;
  eidExpiryDate: Date;
};

export async function sendExpirySummaryEmail(input: {
  dateLabel: string;
  rows: ExpirySummaryRow[];
}) {
  const tableRows = input.rows
    .map(
      (row) =>
        `<tr>
          <td style="padding:6px 8px;border:1px solid #ddd;">${row.fullName}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${row.passportStatus}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${row.eidStatus}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${row.passportExpiryDate.toISOString().slice(0, 10)}</td>
          <td style="padding:6px 8px;border:1px solid #ddd;">${row.eidExpiryDate.toISOString().slice(0, 10)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <h2 style="font-family:Arial,sans-serif;">Daily Document Expiry Summary - ${input.dateLabel}</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">
      <thead>
        <tr>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Name</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Passport Status</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">EID Status</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Passport Expiry</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">EID Expiry</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  await getResendClient().emails.send({
    from: env.OTP_FROM_EMAIL,
    to: env.ALERT_TO_EMAIL,
    subject: `Daily Document Expiry Summary - ${input.dateLabel}`,
    html
  });
}
