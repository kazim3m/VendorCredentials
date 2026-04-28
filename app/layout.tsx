import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vendor Document Collection",
  description: "Collect and manage vendor credentials and exports."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">VendorDocs</p>
              <p className="text-xs text-slate-500">Vercel-hosted document collection system</p>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link className="text-slate-700 hover:text-slate-900" href="/app">
                    App
                  </Link>
                  {user.role === "ADMIN" ? (
                    <>
                      <Link className="text-slate-700 hover:text-slate-900" href="/admin/users">
                        Users
                      </Link>
                      <Link className="text-slate-700 hover:text-slate-900" href="/admin/people">
                        People
                      </Link>
                      <Link className="text-slate-700 hover:text-slate-900" href="/admin/projects">
                        Projects
                      </Link>
                    </>
                  ) : null}
                  <form action="/api/auth/logout" method="post">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                      type="submit"
                    >
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link className="text-slate-700 hover:text-slate-900" href="/login">
                  Login
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
