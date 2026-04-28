"use client";

import { useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";

const DOC_FIELDS = ["photo", "passportScan", "eidFront", "eidBack"] as const;
type DocField = (typeof DOC_FIELDS)[number];

const LABELS: Record<DocField, string> = {
  photo: "Passport-size Photo",
  passportScan: "Passport Main Scan",
  eidFront: "Emirates ID Front",
  eidBack: "Emirates ID Back"
};

const ACCEPT = "image/jpeg,image/jpg,image/png";
const MAX_BYTES = 10 * 1024 * 1024;

type UploadState = Record<DocField, { uploading: boolean; done: boolean; message?: string }>;

function buildInitial(): UploadState {
  return {
    photo: { uploading: false, done: false },
    passportScan: { uploading: false, done: false },
    eidFront: { uploading: false, done: false },
    eidBack: { uploading: false, done: false }
  };
}

type Props = {
  personId: string;
  canUpload: boolean;
};

export function UploadDocs({ personId, canUpload }: Props) {
  const [state, setState] = useState<UploadState>(buildInitial());
  const [error, setError] = useState<string | null>(null);
  const allDone = useMemo(() => DOC_FIELDS.every((field) => state[field].done), [state]);

  const onFile = async (field: DocField, file: File | null) => {
    if (!file || !canUpload) return;
    setError(null);

    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Only JPG/JPEG/PNG files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Each file must be 10MB or less.");
      return;
    }

    setState((prev) => ({
      ...prev,
      [field]: { ...prev[field], uploading: true, message: undefined }
    }));

    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `people/${personId}/${field}/${Date.now()}_${safe}`;

      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/upload/token",
        clientPayload: JSON.stringify({ personId, field })
      });

      const save = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personId,
          field,
          blobUrl: blob.url,
          blobKey: blob.pathname,
          contentType: file.type,
          size: file.size
        })
      });

      if (!save.ok) {
        const body = (await save.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not save uploaded file.");
      }

      setState((prev) => ({
        ...prev,
        [field]: { uploading: false, done: true, message: "Uploaded." }
      }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        [field]: { uploading: false, done: false, message: "Upload failed." }
      }));
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-700">Upload documents</p>
      {!canUpload ? <p className="text-xs text-rose-700">You are not permitted to upload for this person.</p> : null}
      {DOC_FIELDS.map((field) => (
        <label key={field} className="block text-sm">
          <span className="mb-1 block text-slate-700">{LABELS[field]}</span>
          <input
            type="file"
            accept={ACCEPT}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            disabled={!canUpload || state[field].uploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              void onFile(field, file);
            }}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {state[field].uploading ? "Uploading..." : state[field].message ?? "JPG/PNG, max 10MB"}
          </span>
        </label>
      ))}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {allDone ? <p className="text-xs text-emerald-700">All required files uploaded.</p> : null}
    </div>
  );
}

type UploadDocsMultiProps = {
  people: Array<{ id: string; label: string }>;
  canSelectPerson: boolean;
};

export function UploadDocsMulti({ people, canSelectPerson }: UploadDocsMultiProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>(people[0]?.id ?? "");

  if (people.length === 0) {
    return <p className="text-xs text-slate-600">No people available for uploads.</p>;
  }

  return (
    <div className="space-y-3">
      {canSelectPerson ? (
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">Person</span>
          <select
            value={selectedPersonId}
            onChange={(event) => setSelectedPersonId(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <UploadDocs personId={selectedPersonId || people[0].id} canUpload />
    </div>
  );
}
