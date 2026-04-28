import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProjectForm } from "@/components/forms";

export default async function AdminProjectsPage() {
  await requireAdmin();
  const [projects, people] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
    prisma.person.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-2 text-sm text-slate-600">Create and manage project groups.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Create project</h2>
        <div className="mt-4">
          <ProjectForm people={people} />
        </div>
      </section>

      <section className="grid gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-slate-600">No projects yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
              <div>
                <p className="text-base font-semibold">{project.name}</p>
                <p className="text-sm text-slate-600">{project.description ?? "No description"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{project._count.members} members</p>
                <Link
                  className="mt-2 inline-block rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  href={`/admin/projects/${project.id}`}
                >
                  Open
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
