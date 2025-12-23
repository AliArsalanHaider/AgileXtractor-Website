"use client";

import * as React from "react";
import { useAuthUser } from "@/lib/auth-client";

type Item = {
  id: string;
  originalName: string;
  sizeBytes: number;
  contentType: string;
  status: string;
  createdAt: string;
  lastExtractAt?: string | null;
};

export default function UploadDoc() {
  const { user } = useAuthUser(); // assumes you have AuthProvider
  const [file, setFile] = React.useState<File | null>(null);
  const [items, setItems] = React.useState<Item[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  const email = (user?.email || "").toLowerCase().trim();
  const accountId = Number(user?.accountId || 0) || 0;

  async function refresh() {
    if (!email || !accountId) return;
    const res = await fetch(`/api/documents/list?email=${encodeURIComponent(email)}&accountId=${accountId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, accountId]);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    if (!file) return setErr("Pick a file to upload.");
    if (!email || !accountId) return setErr("You must be signed in.");

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("email", email);
      fd.append("accountId", String(accountId));
      fd.append("file", file);

      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setFile(null);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) refresh();
  }

  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow border border-slate-200">
      <h2 className="text-lg font-semibold text-sky-600">Upload Document</h2>
      <form onSubmit={onUpload} className="mt-3 flex items-center gap-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full rounded border border-slate-300 p-2"
        />
        <button
          type="submit"
          disabled={busy || !file}
          className="rounded bg-sky-500 px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </form>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700">Your saved documents</h3>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 mt-2">No documents yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {items.map((it) => (
              <li key={it.id} className="py-2 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{it.originalName}</div>
                  <div className="text-xs text-slate-500">
                    {(it.sizeBytes / 1024).toFixed(1)} KB · {it.status} ·{" "}
                    {new Date(it.createdAt).toLocaleString()}
                  </div>
                </div>
                <a
                  href={`/api/documents/download?id=${encodeURIComponent(it.id)}`}
                  className="text-sky-600 text-sm hover:underline"
                >
                  Download
                </a>
                <button onClick={() => onDelete(it.id)} className="text-red-600 text-sm hover:underline">
                  Delete
                </button>
                {/* Placeholder: Extract later */}
                {/* <button className="text-sky-600 text-sm hover:underline">Extract</button> */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
