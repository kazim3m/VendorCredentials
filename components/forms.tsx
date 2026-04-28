"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PersonOption = { id: string; firstName: string; lastName: string };

export function UserForm({ people }: { people: PersonOption[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [personId, setPersonId] = useState<string>("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          enabled,
          personId: personId || null
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string | { formErrors?: string[] } };
        setError(typeof payload.error === "string" ? payload.error : "Could not create user.");
        return;
      }
      setEmail("");
      setRole("USER");
      setPersonId("");
      setEnabled(true);
      router.refresh();
    });
  };

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
      <label className="text-sm">
        <span className="mb-1 block text-slate-700">Email</span>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-700">Role</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={role}
          onChange={(event) => setRole(event.target.value as "ADMIN" | "USER")}
        >
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-700">Linked Person (optional)</span>
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
        >
          <option value="">Unlinked</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.firstName} {person.lastName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 self-end text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <div className="md:col-span-2">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating..." : "Create User"}
        </button>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </div>
    </form>
  );
}

export function UserToggleForm({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const response = await fetch(`/api/admin/users/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ enabled: !enabled })
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              setError(payload.error ?? "Unable to update user.");
              return;
            }
            router.refresh();
          })
        }
      >
        {enabled ? "Disable" : "Enable"}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function UserDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        className="rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!window.confirm("Delete this user?")) return;
            setError(null);
            const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              setError(payload.error ?? "Unable to delete user.");
              return;
            }
            router.refresh();
          })
        }
      >
        Delete
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function UserRoleToggleForm({ id, role }: { id: string; role: "ADMIN" | "USER" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <button
        className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const response = await fetch(`/api/admin/users/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: role === "ADMIN" ? "USER" : "ADMIN" })
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              setError(payload.error ?? "Unable to update role.");
              return;
            }
            router.refresh();
          })
        }
      >
        Toggle Role
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function PersonForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const payload = {
        firstName: String(fd.get("firstName") ?? ""),
        middleName: String(fd.get("middleName") ?? "") || null,
        lastName: String(fd.get("lastName") ?? ""),
        nationality: String(fd.get("nationality") ?? ""),
        purpose: String(fd.get("purpose") ?? ""),
        passportNumber: String(fd.get("passportNumber") ?? ""),
        passportIssueDate: String(fd.get("passportIssueDate") ?? ""),
        passportExpiryDate: String(fd.get("passportExpiryDate") ?? ""),
        eidIssueDate: String(fd.get("eidIssueDate") ?? ""),
        eidExpiryDate: String(fd.get("eidExpiryDate") ?? "")
      };

      const response = await fetch("/api/admin/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(typeof body.error === "string" ? body.error : "Failed to create person.");
        return;
      }
      event.currentTarget.reset();
      router.refresh();
    });
  };

  return (
    <form className="grid gap-3 md:grid-cols-3" onSubmit={submit}>
      <input className="rounded border border-slate-300 px-3 py-2 text-sm" name="firstName" placeholder="First name" required />
      <input className="rounded border border-slate-300 px-3 py-2 text-sm" name="middleName" placeholder="Middle name (optional)" />
      <input className="rounded border border-slate-300 px-3 py-2 text-sm" name="lastName" placeholder="Last name" required />
      <input className="rounded border border-slate-300 px-3 py-2 text-sm" name="nationality" placeholder="Nationality" required />
      <input className="rounded border border-slate-300 px-3 py-2 text-sm" name="purpose" placeholder="Profession / purpose" required />
      <input className="rounded border border-slate-300 px-3 py-2 text-sm" name="passportNumber" placeholder="Passport number" required />
      <label className="text-xs text-slate-600">
        Passport issue
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" name="passportIssueDate" type="date" required />
      </label>
      <label className="text-xs text-slate-600">
        Passport expiry
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" name="passportExpiryDate" type="date" required />
      </label>
      <label className="text-xs text-slate-600">
        EID issue
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" name="eidIssueDate" type="date" required />
      </label>
      <label className="text-xs text-slate-600">
        EID expiry
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" name="eidExpiryDate" type="date" required />
      </label>
      <div className="md:col-span-3">
        <button
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "Creating..." : "Create Person"}
        </button>
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      </div>
    </form>
  );
}

type ProjectOption = { id: string; name: string };

export function ProjectMemberForm({
  mode,
  personId,
  projects
}: {
  mode: "add";
  personId: string;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (mode !== "add" || projects.length === 0) {
    return <p className="text-xs text-slate-500">Create projects first.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="rounded border border-slate-300 px-3 py-2 text-sm"
        value={projectId}
        onChange={(event) => setProjectId(event.target.value)}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <button
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        type="button"
        disabled={pending || !projectId}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const response = await fetch(`/api/admin/projects/${projectId}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ personId })
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              setError(payload.error ?? "Unable to add person to project.");
              return;
            }
            router.refresh();
          })
        }
      >
        Add to project
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function ProjectForm({ people }: { people: PersonOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const create = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null })
      });
      const data = (await create.json().catch(() => ({}))) as { project?: { id: string }; error?: string };
      if (!create.ok || !data.project) {
        setError(data.error ?? "Could not create project.");
        return;
      }

      for (const personId of selected) {
        await fetch(`/api/admin/projects/${data.project.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personId })
        });
      }

      setName("");
      setDescription("");
      setSelected([]);
      router.refresh();
    });
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded border border-slate-200 p-3 text-sm">
        <p className="mb-2 text-xs text-slate-500">Initial members</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((person) => (
            <label key={person.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={() => toggle(person.id)}
              />
              <span>
                {person.firstName} {person.lastName}
              </span>
            </label>
          ))}
        </div>
      </div>
      <button
        className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        type="submit"
        disabled={pending}
      >
        {pending ? "Creating..." : "Create Project"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </form>
  );
}

export function AddProjectMemberForm({
  projectId,
  people
}: {
  projectId: string;
  people: PersonOption[];
}) {
  const router = useRouter();
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (people.length === 0) {
    return <p className="text-sm text-slate-500">All people are already in this project.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="rounded border border-slate-300 px-3 py-2 text-sm"
        value={personId}
        onChange={(event) => setPersonId(event.target.value)}
      >
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.firstName} {person.lastName}
          </option>
        ))}
      </select>
      <button
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const response = await fetch(`/api/admin/projects/${projectId}/members`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ personId })
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              setError(payload.error ?? "Unable to add member.");
              return;
            }
            router.refresh();
          })
        }
      >
        Add member
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function RemoveProjectMemberButton({
  projectId,
  personId
}: {
  projectId: string;
  personId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1 text-right">
      <button
        className="rounded border border-rose-300 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const response = await fetch(`/api/admin/projects/${projectId}/members`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ personId })
            });
            if (!response.ok) {
              const payload = (await response.json().catch(() => ({}))) as { error?: string };
              setError(payload.error ?? "Unable to remove member.");
              return;
            }
            router.refresh();
          })
        }
      >
        Remove
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}

export function ExportProjectForm({ projectId }: { projectId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        type="button"
        disabled={downloading}
        onClick={async () => {
          setDownloading(true);
          setMessage(null);
          try {
            const response = await fetch(`/api/admin/projects/${projectId}/export`, { method: "POST" });
            const data = (await response.json()) as { downloadUrl?: string; error?: string };
            if (!response.ok || !data.downloadUrl) {
              throw new Error(data.error ?? "Export failed.");
            }
            window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
            setMessage("Export ready. Download opened in a new tab.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Export failed.");
          } finally {
            setDownloading(false);
          }
        }}
      >
        {downloading ? "Generating..." : "Export Project ZIP"}
      </button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}

