import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateInputValue, fullName } from "@/lib/utils";
import { AddProjectMemberForm, ExportProjectForm, RemoveProjectMemberButton } from "@/components/forms";

type Props = {
  params: { id: string };
};

export default async function ProjectDetailPage({ params }: Props) {
  await requireAdmin();
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { person: true },
        orderBy: { person: { firstName: "asc" } },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const linkedIds = new Set(project.members.map((m) => m.personId));
  const availablePeople = await prisma.person.findMany({
    where: { id: { notIn: Array.from(linkedIds) } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
          <p className="text-sm text-slate-600">{project.description || "No description provided."}</p>
        </div>
        <Link href="/admin/projects" className="text-sm text-indigo-600 hover:text-indigo-700">
          Back to projects
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Export package</h2>
        <p className="mt-1 text-sm text-slate-600">
          Creates a roster CSV and nested ZIP files, then uploads the project ZIP to Vercel Blob.
        </p>
        <div className="mt-4">
          <ExportProjectForm projectId={project.id} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Add project members</h2>
        <div className="mt-4">
          <AddProjectMemberForm projectId={project.id} people={availablePeople} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Project members</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Passport Expiry</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">EID Expiry</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.members.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-2">{fullName(member.person.firstName, member.person.middleName, member.person.lastName)}</td>
                  <td className="px-3 py-2">{formatDateInputValue(member.person.passportExpiryDate)}</td>
                  <td className="px-3 py-2">{formatDateInputValue(member.person.eidExpiryDate)}</td>
                  <td className="px-3 py-2">
                    <span className="mr-2 text-xs">P: {member.person.passportStatus}</span>
                    <span className="text-xs">E: {member.person.eidStatus}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {member.person.pdfBlobKey ? (
                        <a
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          href={`/api/admin/files?path=${encodeURIComponent(member.person.pdfBlobKey)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      ) : null}
                      <RemoveProjectMemberButton projectId={project.id} personId={member.personId} />
                    </div>
                  </td>
                </tr>
              ))}
              {project.members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                    No members yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
