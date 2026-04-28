import Link from "next/link";
import { ExpiryStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PersonForm, ProjectMemberForm } from "@/components/forms";
import { formatDateOnly } from "@/lib/utils";

const statusBadge: Record<ExpiryStatus, string> = {
  OK: "bg-emerald-100 text-emerald-800",
  EXPIRING_SOON: "bg-amber-100 text-amber-800",
  EXPIRED: "bg-rose-100 text-rose-800",
};

export default async function AdminPeoplePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();

  const filter = searchParams.status ?? "all";
  const where: Prisma.PersonWhereInput =
    filter === "expiring"
      ? {
          OR: [
            { passportStatus: { in: [ExpiryStatus.EXPIRING_SOON, ExpiryStatus.EXPIRED] } },
            { eidStatus: { in: [ExpiryStatus.EXPIRING_SOON, ExpiryStatus.EXPIRED] } }
          ],
        }
      : filter === "expired"
        ? {
            OR: [{ passportStatus: ExpiryStatus.EXPIRED }, { eidStatus: ExpiryStatus.EXPIRED }],
          }
        : {};

  const [people, projects] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        projects: {
          include: {
            project: true,
          },
        },
      },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">People Directory</h1>
        <p className="text-sm text-slate-600">Create and manage vendor/freelancer canonical records and docs.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium">Create Person</h2>
        <PersonForm />
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Link className={`rounded px-3 py-1.5 ${filter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`} href="/admin/people">
          All
        </Link>
        <Link className={`rounded px-3 py-1.5 ${filter === "expiring" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`} href="/admin/people?status=expiring">
          Expiring/Expired
        </Link>
        <Link className={`rounded px-3 py-1.5 ${filter === "expired" ? "bg-slate-900 text-white" : "bg-white border border-slate-300"}`} href="/admin/people?status=expired">
          Expired
        </Link>
      </div>

      <div className="grid gap-4">
        {people.map((person) => (
          <div key={person.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {person.firstName} {person.middleName ? `${person.middleName} ` : ""}
                  {person.lastName}
                </h3>
                <p className="text-sm text-slate-600">
                  {person.nationality} · {person.purpose}
                </p>
                <p className="mt-1 text-sm text-slate-700">Passport #: {person.passportNumber}</p>
                <p className="text-xs text-slate-500">
                  Passport expiry: {formatDateOnly(person.passportExpiryDate)} · EID expiry: {formatDateOnly(person.eidExpiryDate)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadge[person.passportStatus]}`}>
                  Passport {person.passportStatus}
                </span>
                <span className={`rounded px-2 py-1 text-xs font-medium ${statusBadge[person.eidStatus]}`}>
                  EID {person.eidStatus}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {person.photoBlobKey ? (
                <a
                  className="text-sm text-blue-700 underline"
                  href={`/api/admin/files?path=${encodeURIComponent(person.photoBlobKey ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Photo
                </a>
              ) : (
                <span className="text-sm text-slate-400">Photo missing</span>
              )}
              {person.passportBlobKey ? (
                <a
                  className="text-sm text-blue-700 underline"
                  href={`/api/admin/files?path=${encodeURIComponent(person.passportBlobKey ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Passport scan
                </a>
              ) : (
                <span className="text-sm text-slate-400">Passport missing</span>
              )}
              {person.eidFrontBlobKey ? (
                <a
                  className="text-sm text-blue-700 underline"
                  href={`/api/admin/files?path=${encodeURIComponent(person.eidFrontBlobKey ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  EID front
                </a>
              ) : (
                <span className="text-sm text-slate-400">EID front missing</span>
              )}
              {person.eidBackBlobKey ? (
                <a
                  className="text-sm text-blue-700 underline"
                  href={`/api/admin/files?path=${encodeURIComponent(person.eidBackBlobKey ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  EID back
                </a>
              ) : (
                <span className="text-sm text-slate-400">EID back missing</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {person.pdfBlobKey ? (
                <a
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
                  href={`/api/admin/files?path=${encodeURIComponent(person.pdfBlobKey ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              ) : (
                <span className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">PDF not generated</span>
              )}
              <form action={`/api/admin/people/${person.id}/generate-pdf`} method="post">
                <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">
                  Generate PDF
                </button>
              </form>
            </div>

            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-600">Projects</p>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                {person.projects.length === 0 ? (
                  <span className="text-slate-500">Not assigned to any project.</span>
                ) : (
                  person.projects.map((member) => (
                    <span key={member.id} className="rounded bg-slate-200 px-2 py-1 text-slate-700">
                      {member.project.name}
                    </span>
                  ))
                )}
              </div>
              <ProjectMemberForm mode="add" personId={person.id} projects={projects} />
            </div>
          </div>
        ))}
        {people.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No people found for this filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
