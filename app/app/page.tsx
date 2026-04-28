import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { formatDateOnly, fullName } from "@/lib/utils";
import { UploadDocsMulti } from "@/components/upload-docs";

export default async function AppHomePage() {
  const user = await requireAuth();

  const people = await prisma.person.findMany({
    where: user.role === "ADMIN" ? {} : { users: { some: { id: user.id } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-slate-900">Welcome, {user.email}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {user.role === "ADMIN"
            ? "Use Admin tools to manage users, people, and project exports."
            : "You can upload and manage documents for your assigned profile."}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">People</h2>
          {user.role === "ADMIN" ? (
            <Link
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              href="/admin/people"
            >
              Manage Directory
            </Link>
          ) : null}
        </div>
        <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Upload / Update Documents</h3>
          <UploadDocsMulti
            people={people.map((person) => ({
              id: person.id,
              label: fullName(person.firstName, person.middleName, person.lastName),
            }))}
            canSelectPerson={user.role === "ADMIN"}
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">Passport Expiry</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">EID Expiry</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="px-3 py-2">{fullName(person.firstName, person.middleName, person.lastName)}</td>
                  <td className="px-3 py-2">{formatDateOnly(person.passportExpiryDate)}</td>
                  <td className="px-3 py-2">{formatDateOnly(person.eidExpiryDate)}</td>
                  <td className="px-3 py-2">
                    {person.pdfBlobKey ? (
                      <a
                        className="text-blue-700 hover:underline"
                        href={`/api/admin/files?path=${encodeURIComponent(person.pdfBlobKey)}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-slate-500">Not generated</span>
                    )}
                  </td>
                </tr>
              ))}
              {people.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    No people available.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
