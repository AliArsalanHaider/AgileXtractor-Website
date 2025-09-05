// app/components/result.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function Result() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<any | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  // credits/email
  const [email, setEmail] = useState<string>("");
  const [credits, setCredits] = useState<{ remaining: number; total: number } | null>(null);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [registering, setRegistering] = useState(false); // NEW: register button loading

  // pan state for images
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // fullscreen
  const [showFull, setShowFull] = useState(false);
  const fullRef = useRef<HTMLDivElement | null>(null);

  // containers/refs
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const fsWrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // fullscreen close-button visibility
  const [fsControlsVisible, setFsControlsVisible] = useState(false);
  const fsHideTimer = useRef<number | null>(null);
  const fsHoveringClose = useRef(false);

  // Download format menu
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const dlMenuRef = useRef<HTMLDivElement | null>(null);

  const clearFsHideTimer = () => {
    if (fsHideTimer.current) {
      window.clearTimeout(fsHideTimer.current);
      fsHideTimer.current = null;
    }
  };

  const kickShowFsControls = (lingerMs = 1400) => {
    setFsControlsVisible(true);
    clearFsHideTimer();
    fsHideTimer.current = window.setTimeout(() => {
      if (!fsHoveringClose.current) setFsControlsVisible(false);
    }, lingerMs);
  };

  const computeFitTo = (container: HTMLElement | null) => {
    const img = imgRef.current;
    if (!container || !img) return;
    const iw = img.naturalWidth || 0;
    const ih = img.naturalHeight || 0;
    if (!iw || !ih) return;
    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    if (!cw || !ch) return;
    const scale = Math.min(cw / iw, ch / ih);
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  };

  // ===== Credits helpers =====
  async function refreshCredits(e: string): Promise<{ remaining: number; total: number } | null> {
    try {
      const res = await fetch(`/api/credits/status?email=${encodeURIComponent(e)}`, { cache: "no-store" });
      if (!res.ok) {
        setCredits(null);
        setHasRegistered(false);
        return null;
      }
      const json = await res.json();
      const d = json.data || {};
      const out = {
        remaining: d.remainingCredits ?? d.Remaining_Credits ?? 0,
        total: d.totalCredits ?? d.Total_Credits ?? 0,
      };
      setCredits(out);
      setHasRegistered(true);
      return out;
    } catch {
      setCredits(null);
      setHasRegistered(false);
      return null;
    }
  }

  async function handleRegister() {
    if (!email) {
      setError("Enter your email to register.");
      return;
    }
    setError(null);
    setRegistering(true);
    try {
      const r = await fetch("/api/credits/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) {
        setError(j?.error || "Registration failed");
        return;
      }
      try {
        localStorage.setItem("agx_email", email);
      } catch {}
      setHasRegistered(true);
      await refreshCredits(email);
    } finally {
      setRegistering(false);
    }
  }

  // Restore saved email on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("agx_email");
      if (saved) {
        setEmail(saved);
        refreshCredits(saved);
      }
    } catch {}
  }, []);

  // Choose file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setApiResult(null);
    setError(null);
    setPan({ x: 0, y: 0 });
    setShowFull(false);

    if (f) {
      setPreview(URL.createObjectURL(f));
      setIsPdf(f.type === "application/pdf");
    } else {
      setPreview(null);
      setIsPdf(false);
    }
  };

  // Convert file -> base64 (no data: prefix)
  const fileToBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => {
        const res = (reader.result as string) || "";
        resolve(res.includes(",") ? res.split(",")[1] : res);
      };
      reader.onerror = (err) => reject(err);
    });

  // Count "documents" from result (each non-empty detected_data = 1 doc)
  const countDocsFromResult = (result: any): number => {
    const arr = Array.isArray(result?.images_results) ? result.images_results : [];
    const docs = arr.map((x: any) => x?.detected_data || null).filter(Boolean);
    return docs.length;
  };

  // Upload -> extract -> slice to affordable -> charge -> show
  const handleUploadAndExtract = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    if (!email) {
      setError("Please enter your email and click Register to get 500 trial credits.");
      return;
    }

    setLoading(true);
    setError(null);
    setApiResult(null);

    try {
      // pre-check credits (avoid rendering results if <100)
      const c0 = await refreshCredits(email);
      if ((c0?.remaining ?? 0) < 100) {
        setError("All credits are consumed. Please purchase one of our plans.");
        return;
      }

      // extract first (no charge yet)
      const base64 = await fileToBase64(file);
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ data: base64, extension }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || "API request failed");
      }
      const json = await resp.json();

      const docsDetected = Math.max(0, countDocsFromResult(json));
      if (!docsDetected) {
        await refreshCredits(email); // keep UI in sync
        setError("No documents detected. No credits charged.");
        return;
      }

      // re-check credits now
      const c1 = await refreshCredits(email);
      const remaining = c1?.remaining ?? 0;
      const affordableDocs = Math.floor(remaining / 100);
      if (affordableDocs <= 0) {
        setError("All credits are consumed. Please purchase one of our plans.");
        return;
      }

      const docsToCharge = Math.max(1, Math.min(docsDetected, affordableDocs));

      // slice result if needed
      let displayResult = json;
      if (docsDetected > docsToCharge) {
        const arr = Array.isArray(json?.images_results) ? json.images_results : [];
        const sliced = arr.filter((x: any) => x?.detected_data).slice(0, docsToCharge);
        displayResult = { ...json, images_results: sliced };
        setError(`Only processed ${docsToCharge} of ${docsDetected} document(s) due to credit limit.`);
      }

      // charge
      const consumeRes = await fetch("/api/credits/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, docs: docsToCharge }),
      });
      if (!consumeRes.ok) {
        const j = await consumeRes.json().catch(() => ({}));
        if (consumeRes.status === 402 || j?.code === "INSUFFICIENT") {
          setError("All credits are consumed. Please purchase one of our plans.");
        } else if (consumeRes.status === 404 || j?.code === "NO_ACCOUNT") {
          setError("No account found. Please register first to get 500 trial credits.");
        } else {
          setError(j?.error || "Failed to consume credits.");
        }
        return;
      }

      const consumeJson = await consumeRes.json();
      const d = consumeJson?.data || {};
      setCredits({
        remaining: d.remainingCredits ?? d.Remaining_Credits ?? 0,
        total: d.totalCredits ?? d.Total_Credits ?? 0,
      });

      // show result only after successful charge
      setApiResult(displayResult);
    } catch (e: any) {
      console.error("Extract error:", e);
      setError(e?.message || "Error extracting data");
      // report no-op (no charge)
      try {
        await fetch("/api/credits/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ok: false, error: "client-extract-error" }),
        });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const allDetectedData = useMemo(() => {
    if (!apiResult?.images_results) return [];
    return apiResult.images_results.map((res: any) => res?.detected_data || null).filter(Boolean);
  }, [apiResult]);

  const docTitle = useMemo(() => {
    if (allDetectedData.length === 1 && allDetectedData[0]?.Type) {
      return String(allDetectedData[0].Type);
    }
    const meta = apiResult?.images_results?.[0]?.detected_data;
    return meta?.Type ? String(meta.Type) : "Extracted Data";
  }, [apiResult, allDetectedData]);

  const getRowsForExport = () => {
    if (allDetectedData.length) {
      return allDetectedData.map((d: any) =>
        d && typeof d === "object" && !Array.isArray(d) ? d : { value: String(d ?? "") }
      );
    }
    if (apiResult) {
      if (Array.isArray(apiResult)) {
        return apiResult.map((v: any, i: number) =>
          typeof v === "object" && v !== null ? v : { index: i, value: String(v ?? "") }
        );
      }
      if (typeof apiResult === "object") return [apiResult];
      return [{ value: String(apiResult) }];
    }
    return [];
  };

  const toCSV = (rows: any[]) => {
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
  };

  const toTXT = (rows: any[]) => {
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
  };

  const downloadBlob = (content: string, mime: string, ext: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle || "extracted-data"}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (format: "json" | "csv" | "txt") => {
    const rows = getRowsForExport();
    if (!rows.length) return;

    if (format === "json") {
      downloadBlob(JSON.stringify(rows, null, 2), "application/json", "json");
    } else if (format === "csv") {
      downloadBlob(toCSV(rows), "text/csv", "csv");
    } else {
      downloadBlob(toTXT(rows), "text/plain", "txt");
    }
    setShowDownloadMenu(false);
  };

  const canPan = !!preview && !isPdf && zoom > 1;
  const onPointerDown = (e: React.PointerEvent) => {
    if (!canPan) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    const el = e.currentTarget as HTMLElement;
    el.releasePointerCapture?.(e.pointerId);
    setDragging(false);
  };

  useEffect(() => {
    if (zoom <= 1.001) setPan({ x: 0, y: 0 });
  }, [zoom]);

  useEffect(() => {
    if (!showFull) return;
    window.dispatchEvent(new CustomEvent("agx:immersive", { detail: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFull(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullRef.current?.focus();
    requestAnimationFrame(() => computeFitTo(fsWrapRef.current));
    kickShowFsControls();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      clearFsHideTimer();
      setFsControlsVisible(false);
      window.dispatchEvent(new CustomEvent("agx:immersive", { detail: false }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFull]);

  const onImageLoad = () => {
    computeFitTo(showFull ? fsWrapRef.current : previewWrapRef.current);
  };

  useEffect(() => {
    const onR = () => computeFitTo(showFull ? fsWrapRef.current : previewWrapRef.current);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [showFull, preview, isPdf]);

  const openFullscreen = () => {
    if (!preview) return;
    if (isPdf) {
      window.open(preview, "_blank", "noopener,noreferrer");
    } else {
      setPan({ x: 0, y: 0 });
      setShowFull(true);
    }
  };

  useEffect(() => {
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      if (!dlMenuRef.current) return;
      const target = e.target as Node;
      if (!dlMenuRef.current.contains(target)) setShowDownloadMenu(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  return (
    <div className="flex h-[80dvh] w-full bg-gray-100 p-6 gap-4">
      {/* LEFT: File Preview / Controls */}
      <div className="relative flex-1 max-w-[640px] min-w-[300px] rounded-2xl p-5 shadow-lg flex flex-col">
        {/* Video Background */}
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-2xl"
          src="/God rays new.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />

        {/* Foreground content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Email + Register / Status */}
          {!hasRegistered && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email to use trial credits"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-800 bg-white"
              />
              <button
                onClick={handleRegister}
                disabled={registering}
                className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {registering ? "Registering..." : "Register"}
              </button>
            </div>
          )}

          {!preview ? (
            <div className="flex-1 flex items-center justify-center">
              <label className="cursor-pointer btn-blue px-4 py-2 rounded-lg shadow">
                Choose File
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <>
              {/* Choose File button (top-left) */}
              <div className="flex justify-start mb-3">
                <label className="cursor-pointer btn-blue px-4 py-2 rounded-lg shadow">
                  Choose File
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Controls row */}
              <div className="w-full flex items-center justify-center gap-3 pb-3 border-b border-white/40">
                {!isPdf && (
                  <>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.1).toFixed(2))))}
                      className="px-2 py-0.5 rounded-md bg-transparent text-white/90 border border-white/30 hover:bg-white/10 hover:border-white/50 transition shadow-none text-sm"
                      aria-label="Zoom out"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={0.25}
                      max={3.5}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-40"
                      aria-label="Zoom"
                    />
                    <button
                      onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.1).toFixed(2))))}
                      className="px-2 py-0.5 rounded-md bg-transparent text-white/90 border border-white/30 hover:bg-white/10 hover:border-white/50 transition shadow-none text-sm"
                      aria-label="Zoom in"
                    >
                      +
                    </button>
                  </>
                )}

                {/* Fullscreen button */}
                <button
                  onClick={openFullscreen}
                  className="ml-4 inline-flex items-left justify-left p-1.5 rounded-md bg-transparent text-white/90 border border-white/30 hover:bg-white/10 hover:border-white/50 transition shadow-none"
                  aria-label="Open fullscreen"
                  title={isPdf ? "Open PDF in new tab" : "Open fullscreen"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M8 3H3v5M3 16v5h5M16 3h5v5M21 16v5h-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm">{isPdf ? "Open" : ""}</span>
                </button>
              </div>

              {/* File preview frame */}
              <div
                ref={previewWrapRef}
                className={[
                  "mt-4 flex-1 flex items-center justify-center overflow-hidden rounded-lg select-none overscroll-contain",
                  !!preview && !isPdf && zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
                ].join(" ")}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onWheelCapture={(e) => {
                  if (!preview || isPdf) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const delta = -e.deltaY;
                  const step = delta > 0 ? 0.1 : -0.1;
                  setZoom((z) => Math.min(3.5, Math.max(0.25, Number((z + step).toFixed(2)))));
                }}
                onWheel={(e) => {
                  if (!preview || isPdf) return;
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {isPdf ? (
                  <iframe src={preview!} className="w-full h-full rounded-lg" title="PDF Preview" />
                ) : (
                  <img
                    ref={imgRef}
                    src={preview!}
                    alt="Preview"
                    className="max-w-none max-h-none object-contain"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: "center",
                    }}
                    draggable={false}
                    onLoad={() => computeFitTo(showFull ? fsWrapRef.current : previewWrapRef.current)}
                  />
                )}
              </div>

              {/* Upload & Extract button */}
              <div className="pt-4">
                <button
                  onClick={handleUploadAndExtract}
                  disabled={loading}
                  className="w-full btn-blue hover:bg-blue-200 text-blue-800 font-medium py-2 rounded-lg shadow disabled:opacity-60"
                >
                  {loading ? "Extracting..." : "Upload & Extract"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-300 self-stretch" />

      {/* RIGHT: Results */}
      <div className="flex-1 max-w-[640px] min-w-[360px] bg-white rounded-2xl p-6 shadow-lg overflow-y-auto">
        {/* Top row: Credits (left) + Download (right) */}
        <div className="flex items-center justify-between mb-2" ref={dlMenuRef}>
          <div className="text-sm text-sky-500 font-medium">
            {credits ? (
              <>
                Credits: <span className="font-semibold">{credits.remaining}</span> / {credits.total}
              </>
            ) : (
              <span className="opacity-70">Credits: —</span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                if (!allDetectedData.length && !apiResult) return;
                setShowDownloadMenu((s) => !s);
              }}
              disabled={!allDetectedData.length && !apiResult}
              className="cursor-pointer btn-blue text-blue-700 px-4 py-2 rounded-lg shadow hover:bg-blue-50 disabled:opacity-60"
              aria-label="Download Data"
            >
              Download
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => downloadBlob(JSON.stringify(getRowsForExport(), null, 2), "application/json", "json")}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  JSON (.json)
                </button>
                <button
                  onClick={() => downloadBlob(toCSV(getRowsForExport()), "text/csv", "csv")}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  CSV (.csv)
                </button>
                <button
                  onClick={() => downloadBlob(toTXT(getRowsForExport()), "text/plain", "txt")}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                >
                  Text (.txt)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pb-3 border-b border-gray-300" />

        <h2 className="text-2xl font-semibold text-brand-blue mb-5 mt-4">{docTitle}</h2>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700">
            {error}
          </div>
        )}

        {!allDetectedData.length && !error && (
          <p className="text-gray-500">No data extracted yet.</p>
        )}

        {allDetectedData.length > 0 && (
          <div className="flex flex-col gap-6">
            {allDetectedData.map((data: any, idx: number) => (
              <div key={idx} className="grid grid-cols-1 gap-5 border p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-600 mb-2">Document {idx + 1}</h3>
                {Object.entries(data).map(([key, value]) => (
                  <div key={key} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">{key}</label>
                    <input
                      readOnly
                      value={String(value ?? "")}
                      className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal for images */}
      {showFull && !isPdf && preview && (
        <div
          ref={fullRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/90 focus:outline-none overflow-hidden"
          onWheel={(e) => e.preventDefault()}
          onMouseMove={() => kickShowFsControls()}
          onTouchStart={() => kickShowFsControls(2000)}
        >
          {/* Viewer layer */}
          <div
            ref={fsWrapRef}
            className={[
              "absolute inset-0 z-10 flex items-center justify-center overflow-hidden select-none",
              !!preview && !isPdf && zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
            ].join(" ")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img
              ref={imgRef}
              src={preview}
              alt="Fullscreen Preview"
              className="max-w-none max-h-none object-contain"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
              draggable={false}
              onLoad={() => computeFitTo(fsWrapRef.current)}
            />
          </div>

          {/* Bottom-center Close button */}
          <button
            onClick={() => setShowFull(false)}
            onMouseEnter={() => {
              fsHoveringClose.current = true;
              clearFsHideTimer();
              setFsControlsVisible(true);
            }}
            onMouseLeave={() => {
              fsHoveringClose.current = false;
              kickShowFsControls();
            }}
            onFocus={() => setFsControlsVisible(true)}
            onBlur={() => kickShowFsControls()}
            className={[
              "z-20 fixed left-1/2 -translate-x-1/2",
              "bottom-4 transition-all duration-300",
              fsControlsVisible ? "opacity-90 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
              "rounded-full px-3 py-2 bg-white/80 hover:bg-white text-gray-900 shadow-lg ring-1 ring-black/10",
              "backdrop-blur",
            ].join(" ")}
            aria-label="Close fullscreen"
            title="Close (Esc)"
          >
            <span className="inline-flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-sm">Close</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
