import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { UserForm, UserToggleForm, UserDeleteButton } from "@/components/forms";

export default async function UsersAdminPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
  const people = await prisma.person.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users Admin</h1>
        <p className="text-sm text-slate-600">Create users, assign role, and enable/disable access.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium">Add User</h2>
        <UserForm people={people} />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Enabled</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Linked Person</th>
              <th className="px-4 py-3 text-left font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.enabled ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  {u.person ? `${u.person.firstName} ${u.person.lastName}` : "Unlinked"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <UserToggleForm id={u.id} enabled={u.enabled} />
                    <UserDeleteButton id={u.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
