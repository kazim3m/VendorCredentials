import { NextRequest, NextResponse } from "next/server";
import { ExpiryStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { personCreateSchema } from "@/lib/validation";
import { computeExpiryStatus } from "@/lib/expiry";

type DateFilters = {
  expiring?: boolean;
  expired?: boolean;
};

function parseFilterFlags(request: NextRequest): DateFilters {
  const sp = request.nextUrl.searchParams;
  return {
    expiring: sp.get("expiring") === "true",
    expired: sp.get("expired") === "true",
  };
}

export async function GET(request: NextRequest) {
  await requireAdmin();
  const { expiring, expired } = parseFilterFlags(request);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const people = await prisma.person.findMany({
    where:
      expiring || expired
        ? {
            OR: [
              ...(expired
                ? [
                    { passportExpiryDate: { lt: today } },
                    { eidExpiryDate: { lt: today } },
                  ]
                : []),
              ...(expiring
                ? [
                    {
                      passportExpiryDate: {
                        gte: today,
                        lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
                      },
                    },
                    {
                      eidExpiryDate: {
                        gte: today,
                        lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
                      },
                    },
                  ]
                : []),
            ],
          }
        : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { users: true, projects: { include: { project: true } } },
  });

  return NextResponse.json({ people });
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const body = await request.json().catch(() => null);
  const parsed = personCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const passportStatus = computeExpiryStatus(new Date(data.passportExpiryDate));
  const eidStatus = computeExpiryStatus(new Date(data.eidExpiryDate));

  const person = await prisma.person.create({
    data: {
      firstName: data.firstName,
      middleName: data.middleName ?? null,
      lastName: data.lastName,
      nationality: data.nationality,
      purpose: data.purpose,
      passportNumber: data.passportNumber,
      passportIssueDate: new Date(`${data.passportIssueDate}T00:00:00.000Z`),
      passportExpiryDate: new Date(`${data.passportExpiryDate}T00:00:00.000Z`),
      eidIssueDate: new Date(`${data.eidIssueDate}T00:00:00.000Z`),
      eidExpiryDate: new Date(`${data.eidExpiryDate}T00:00:00.000Z`),
      passportStatus: passportStatus as ExpiryStatus,
      eidStatus: eidStatus as ExpiryStatus,
    },
  });

  return NextResponse.json({ person }, { status: 201 });
}
