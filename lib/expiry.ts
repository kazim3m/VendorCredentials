import { ExpiryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendExpirySummaryEmail } from "@/lib/email";
import { dateOnlyDubai, normalizeDateOnlyUtc } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function statusForDate(expiryDate: Date, today: Date): ExpiryStatus {
  const expiry = normalizeDateOnlyUtc(expiryDate);
  const now = normalizeDateOnlyUtc(today);
  const deltaDays = Math.floor((expiry.getTime() - now.getTime()) / DAY_MS);
  if (deltaDays < 0) return ExpiryStatus.EXPIRED;
  if (deltaDays <= 30) return ExpiryStatus.EXPIRING_SOON;
  return ExpiryStatus.OK;
}

type ExpirySummary = {
  totalUpdated: number;
  alertedCount: number;
  rows: Array<{
    id: string;
    fullName: string;
    passportStatus: ExpiryStatus;
    eidStatus: ExpiryStatus;
    passportExpiryDate: Date;
    eidExpiryDate: Date;
  }>;
};

export async function runExpiryCheck(opts?: { now?: Date; skipEmail?: boolean }) {
  const now = opts?.now ?? new Date();
  const today = dateOnlyDubai(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);

  const people = await prisma.person.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  let totalUpdated = 0;
  const inAlertState: string[] = [];

  for (const p of people) {
    const nextPassport = statusForDate(p.passportExpiryDate, today);
    const nextEid = statusForDate(p.eidExpiryDate, today);

    const shouldUpdateStatus = p.passportStatus !== nextPassport || p.eidStatus !== nextEid;
    const currentlyAlert = nextPassport !== ExpiryStatus.OK || nextEid !== ExpiryStatus.OK;
    const alreadyNotifiedToday =
      p.notifiedAt && p.notifiedAt >= today && p.notifiedAt < tomorrow;

    const data: Prisma.PersonUpdateInput = {};
    if (shouldUpdateStatus) {
      data.passportStatus = nextPassport;
      data.eidStatus = nextEid;
    }
    if (currentlyAlert && !alreadyNotifiedToday) {
      data.notifiedAt = now;
      inAlertState.push(p.id);
    }

    if (Object.keys(data).length > 0) {
      await prisma.person.update({
        where: { id: p.id },
        data,
      });
      totalUpdated += 1;
    }
  }

  const rows = await prisma.person.findMany({
    where: {
      OR: [{ passportStatus: { not: ExpiryStatus.OK } }, { eidStatus: { not: ExpiryStatus.OK } }],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      passportStatus: true,
      eidStatus: true,
      passportExpiryDate: true,
      eidExpiryDate: true,
    },
  });

  const summaryRows = rows.map((row) => ({
    id: row.id,
    fullName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" "),
    passportStatus: row.passportStatus,
    eidStatus: row.eidStatus,
    passportExpiryDate: row.passportExpiryDate,
    eidExpiryDate: row.eidExpiryDate,
  }));

  if (!opts?.skipEmail && summaryRows.length > 0 && inAlertState.length > 0) {
    await sendExpirySummaryEmail({
      dateLabel: today.toISOString().slice(0, 10),
      rows: summaryRows,
    });
  }

  return {
    totalUpdated,
    alertedCount: inAlertState.length,
    rows: summaryRows,
  } satisfies ExpirySummary;
}

export async function runDailyExpiryCheck() {
  const result = await runExpiryCheck();
  const summary = result.rows
    .map(
      (row) =>
        `${row.fullName} | Passport: ${row.passportStatus} (${row.passportExpiryDate
          .toISOString()
          .slice(0, 10)}) | EID: ${row.eidStatus} (${row.eidExpiryDate.toISOString().slice(0, 10)})`
    )
    .join("\n");

  return {
    processedCount: result.totalUpdated,
    requiresAttentionCount: result.alertedCount,
    summary
  };
}

export function computeExpiryStatus(expiryDate: Date, today = new Date()): ExpiryStatus {
  return statusForDate(expiryDate, dateOnlyDubai(today));
}
