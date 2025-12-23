"use client";

import React from "react";

/** ---- Types returned by /api/documents/view-extracted ---- */
type ViewExtractedDoc = {
  id: string;
  originalName: string;
  createdAt?: string;
  extractResult?: any; // JSON stored in Prisma (Document.extractResult)
};

/** Utilities for download formats (same behavior as your result.tsx) */
function rowsFromExtract(extractResult: any) {
  const arr = Array.isArray(extractResult?.images_results)
    ? extractResult.images_results
    : [];

  const docs = arr
    .map((x: any) => x?.detected_data || null)
    .filter(Boolean);

  if (docs.length) return docs;

  // fallback: if no images_results → export whole JSON
  if (extractResult && typeof extractResult === "object") return [extractResult];
  return [];
}

function toCSV(rows: any[]) {
  if (!rows.length) return "";
  const keys = Array.from(
    rows.reduce((set: Set<string>, obj: any) => {
      Object.keys(obj || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const esc = (val: any) => {
    const s = val == null ? "" : String(val);
    const needs = /[",\n]/.test(s);
    const e = s.replace(/"/g, '""');
    return needs ? `"${e}"` : e;
  };
  const header = keys.map(esc).join(",");
  const lines = rows.map((r) => keys.map((k) => esc(r?.[k])).join(","));
  return [header, ...lines].join("\n");
}

function toTXT(rows: any[]) {
  if (!rows.length) return "";
  return rows
    .map((r, idx) => {
      if (!r || typeof r !== "object") return `Document ${idx + 1}\nvalue: ${String(r ?? "")}`;
      const body = Object.entries(r)
        .map(([k, v]) => `${k}: ${v ?? ""}`)
        .join("\n");
      return `Document ${idx + 1}\n${body}`;
    })
    .join("\n\n---\n\n");
}

function downloadBlob(content: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ---- Component ---- */
export default function ExtractedViewer({
  docId,
  onClose,
}: {
  docId: string;
  onClose: () => void;
}) {
  const [doc, setDoc] = React.useState<ViewExtractedDoc | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);

  // preview URL (served by your /api/documents/download?id=...)
  const previewUrl = React.useMemo(() => {
    if (!docId) return "";
    // cookie-authenticated; works for <img> and <iframe>
    return `/api/documents/download?id=${encodeURIComponent(docId)}`;
  }, [docId]);

  const allRows = React.useMemo(() => rowsFromExtract(doc?.extractResult), [doc]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/documents/view-extracted?id=${encodeURIComponent(docId)}`, {
          cache: "no-store",
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || "Failed to load extracted data");
        }
        const j = await r.json();
        if (!alive) return;
        if (!j?.ok || !j?.doc) throw new Error("Not found");
        setDoc(j.doc as ViewExtractedDoc);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [docId]);

  // close on ESC
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const docTitle =
    (allRows.length === 1 && allRows[0]?.Type) ? String(allRows[0].Type) :
    String(doc?.originalName || "Extracted Data");

  const handleDownload = (fmt: "json" | "csv" | "txt") => {
    const rows = allRows;
    if (!rows.length) return;
    if (fmt === "json") {
      downloadBlob(JSON.stringify(rows, null, 2), "application/json", `${docTitle}.json`);
    } else if (fmt === "csv") {
      downloadBlob(toCSV(rows), "text/csv", `${docTitle}.csv`);
    } else {
      downloadBlob(toTXT(rows), "text/plain", `${docTitle}.txt`);
    }
    setShowDownloadMenu(false);
  };

  return (
    <div className="fixed inset-0 z-1000">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={onClose} />

      {/* Modal shell */}
      <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 relative">
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-2 md:p-2.5 text-gray-800 shadow hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Video background to match your extraction modal vibe */}
          <video
            className="absolute inset-0 w-full h-44 object-cover pointer-events-none"
            src="/God rays new.mp4"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
          />
          <div className="absolute top-0 left-0 right-0 h-44 bg-black/10 pointer-events-none" />

          {/* Header */}
          <div className="relative z-1 px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {docTitle}
                </h2>
                {doc?.createdAt && (
                  <p className="text-xs text-gray-500">
                    Uploaded: {new Date(doc.createdAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Download */}
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu((s) => !s)}
                  disabled={!allRows.length}
                  className="cursor-pointer btn-blue px-4 py-2 rounded-lg shadow disabled:opacity-60"
                  aria-label="Download Extracted"
                >
                  Download
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
                    <button onClick={() => handleDownload("json")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      JSON (.json)
                    </button>
                    <button onClick={() => handleDownload("csv")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      CSV (.csv)
                    </button>
                    <button onClick={() => handleDownload("txt")} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                      Text (.txt)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body: left preview / right data */}
          <div className="relative z-1 grid grid-cols-1 md:grid-cols-2 gap-0 border-t">
            {/* Left: document preview */}
            <div className="md:min-h-[60vh] h-[38vh] md:h-[70vh] bg-gray-100">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-gray-500">Loading…</div>
              ) : err ? (
                <div className="w-full h-full flex items-center justify-center text-red-600">{err}</div>
              ) : (
                // Use iframe for both images & pdf to keep it simple (browser will render both)
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title={doc?.originalName || "Document Preview"}
                />
              )}
            </div>

            {/* Right: extracted fields */}
            <div className="p-5 overflow-y-auto md:h-[70vh]">
              {loading ? (
                <div className="text-gray-500">Preparing extracted data…</div>
              ) : !allRows.length ? (
                <div className="text-gray-400">No extracted data found for this document.</div>
              ) : (
                <div className="flex flex-col gap-6">
                  {allRows.map((row: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 gap-5 border p-4 rounded-lg">
                      <h3 className="text-lg font-medium text-blue-600 mb-2">Document {idx + 1}</h3>
                      {Object.entries(row).map(([k, v]) => (
                        <div key={k} className="flex flex-col">
                          <label className="text-sm font-medium text-gray-600 mb-1">{k}</label>
                          <input
                            readOnly
                            value={String(v ?? "")}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* small styles to align with your other modal */}
      <style jsx global>{`
        .btn-blue {
          background: #2baeff;
          color: white;
        }
      `}</style>
    </div>
  );
}
