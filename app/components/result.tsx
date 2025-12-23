"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ============================ Identity ============================ */
// read cookie safely
function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
}

// normalized identity (window.__USER__ → cookies → localStorage → /api/auth/me)
async function resolveIdentity(): Promise<{ email?: string; accountId?: string; displayName?: string }> {
  // 1) window.__USER__
  const winUser = (typeof window !== "undefined" ? (window as any).__USER__ : undefined) || {};
  let email: string | undefined = winUser.email || undefined;
  let name: string | undefined = winUser.name || undefined;
  let accountId: string | undefined = winUser.accountId || undefined;

  // 2) cookies
  if (!email) {
    const c = readCookie("agx_email") || readCookie("email");
    if (c) email = decodeURIComponent(c);
  }
  if (!name) {
    const n = readCookie("displayName") || readCookie("userName");
    if (n) name = decodeURIComponent(n);
  }
  if (!accountId) {
    const c = readCookie("accountId");
    if (c) accountId = decodeURIComponent(c);
  }

  // 3) localStorage fallbacks
  if (typeof window !== "undefined") {
    try {
      if (!email) email = localStorage.getItem("email") || undefined;
      if (!name) name = localStorage.getItem("userName") || undefined;
      if (!accountId) accountId = localStorage.getItem("accountId") || undefined;
    } catch {}
  }

  // 4) server check (cookie session)
  if (!email) {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (j?.email) email = j.email;
        if (j?.name) name = j.name;
        if (j?.accountId) accountId = j.accountId;
      }
    } catch {}
  }

  const displayName = name || (email ? email.split("@")[0] : "User");
  return { email, accountId, displayName };
}

/* ============================ Credits ============================ */
async function fetchCredits(email?: string, accountId?: string) {
  if (!email && !accountId) return null;

  const qs = new URLSearchParams();
  if (email) qs.set("email", email);
  if (accountId) qs.set("accountId", accountId);

  // Try GET
  let res = await fetch(`/api/credits/status${qs.toString() ? `?${qs}` : ""}`, { method: "GET", cache: "no-store" });
  // Some routes accept only POST or require body → fallback
  if (!res.ok && (res.status === 400 || res.status === 405)) {
    res = await fetch(`/api/credits/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, accountId }),
    });
  }
  if (!res.ok) return null;

  const json = await res.json();
  const d = json?.data ?? json;
  // normalize field names
  return {
    total: d.total ?? d.totalCredits ?? d.Total_Credits ?? 0,
    used: d.used ?? d.consumedCredits ?? d.Used_Credits ?? 0,
    remaining:
      d.remaining ??
      d.remainingCredits ??
      d.Remaining_Credits ??
      Math.max((d.total ?? d.totalCredits ?? 0) - (d.used ?? d.consumedCredits ?? 0), 0),
  } as { total: number; used: number; remaining: number };
}

async function consumeCredits(email: string, accountId: string | undefined, docs: number) {
  const body: Record<string, any> = { email, docs };
  if (accountId) body.accountId = accountId;
  const res = await fetch("/api/credits/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errMsg = "Failed to consume credits.";
    try {
      const j = await res.json();
      errMsg = j?.error || errMsg;
    } catch {}
    const e: any = new Error(errMsg);
    (e.status = res.status), (e.code = "CONSUME_FAILED");
    throw e;
  }
  const j = await res.json();
  return j?.data ?? j;
}

/* ============================ New helpers ============================ */
/** Compute SHA-256 hex for a File (browser SubtleCrypto). */
async function sha256File(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // @ts-ignore - SubtleCrypto exists in browsers
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Persist extraction against the most recent matching doc (by sha256 + ownership). */
async function saveExtractToDoc(file: File, extractResult: any) {
  try {
    const sha256 = await sha256File(file);
    const res = await fetch("/api/documents/save-extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sha256, extractResult }),
    });
    if (!res.ok) {
      // Non-fatal for UX; log for troubleshooting.
      const t = await res.text();
      console.warn("save-extract failed:", res.status, t);
    }
  } catch (e) {
    console.warn("save-extract error:", e);
  } finally {
    // Tell UploadDoc list to refresh so the “View extracted data” icon appears
    try {
      window.dispatchEvent(new Event("agx:maybe-refresh-docs"));
    } catch {}
  }
}

/* ========================= Main Component ========================= */
export default function Result({ initialFile }: { initialFile?: File | null }) {
  // ---------- Identity ----------
  const [identity, setIdentity] = useState<{ email?: string; accountId?: string; displayName?: string }>({});
  const authEmail = identity.email;

  useEffect(() => {
    let mounted = true;
    resolveIdentity().then((id) => mounted && setIdentity(id));
    return () => {
      mounted = false;
    };
  }, []);

  // ---------- File / viewer state ----------
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pdfScale, setPdfScale] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const fsWrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // ---------- Credits ----------
  const [credits, setCredits] = useState<{ total: number; used: number; remaining: number } | null>(null);

  async function refreshCredits() {
    const c = await fetchCredits(identity.email, identity.accountId);
    setCredits(c);
    return c;
  }

  useEffect(() => {
    if (!identity.email && !identity.accountId) return;
    refreshCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.email, identity.accountId]);

  // ---------- API result / errors ----------
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState<any | null>(null);

  // ---------- fullscreen ----------
  const [showFull, setShowFull] = useState(false);
  const [fsControlsVisible, setFsControlsVisible] = useState(false);
  const fsHideTimer = useRef<number | null>(null);
  const fsHoveringClose = useRef(false);
  const fullRef = useRef<HTMLDivElement | null>(null);
  const dlMenuRef = useRef<HTMLDivElement | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // ---------- helpers ----------
  const revokePreview = () => {
    if (preview) URL.revokeObjectURL(preview);
  };

  const computeFitTo = (container: HTMLElement | null) => {
    const img = imgRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    if (!cw || !ch) return;

    if (isPdf) {
      const needsSwap = (rotation % 180) !== 0;
      const s = needsSwap ? Math.min(cw / ch, ch / cw) : 1;
      setPdfScale(s);
      return;
    }

    if (!img) return;
    const iw = img.naturalWidth || 0;
    const ih = img.naturalHeight || 0;
    if (!iw || !ih) return;
    const needsSwap = (rotation % 180) !== 0;
    const rw = needsSwap ? ih : iw;
    const rh = needsSwap ? iw : ih;
    const scale = Math.min(cw / rw, ch / rh);
    setZoom(scale);
    setPan({ x: 0, y: 0 });
  };

  const kickShowFsControls = (lingerMs = 1400) => {
    setFsControlsVisible(true);
    if (fsHideTimer.current) window.clearTimeout(fsHideTimer.current);
    fsHideTimer.current = window.setTimeout(() => {
      if (!fsHoveringClose.current) setFsControlsVisible(false);
    }, lingerMs);
  };

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

  // pull detected docs from your API response
  const countDocsFromResult = (result: any): number => {
    const arr = Array.isArray(result?.images_results) ? result.images_results : [];
    const docs = arr.map((x: any) => x?.detected_data || null).filter(Boolean);
    return docs.length;
  };

  const loadFileIntoViewer = (f: File) => {
    setError(null);
    setApiResult(null);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setPdfScale(1);

    revokePreview();

    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setIsPdf(f.type === "application/pdf");
  };

  // initial file
  useEffect(() => {
    if (initialFile) loadFileIntoViewer(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f) {
      loadFileIntoViewer(f);
    } else {
      revokePreview();
      setFile(null);
      setPreview(null);
      setIsPdf(false);
      setApiResult(null);
      setError(null);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setPdfScale(1);
    }
  };

  // Upload → Extract → Charge (server uses ENV credit cost)
  const handleUploadAndExtract = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    if (!authEmail) {
      setError("Please log in to use extraction.");
      return;
    }

    setLoading(true);
    setError(null);
    setApiResult(null);

    try {
      // Ensure we have latest credits
      const c0 = await refreshCredits();
      if ((c0?.remaining ?? 0) <= 0) {
        setError("All credits are consumed. Please purchase one of our plans.");
        return;
      }

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
        await refreshCredits(); // nothing charged
        setError("No documents detected. No credits charged.");
        return;
      }

      // Check remaining credits again and decide how many docs to charge
      const c1 = await refreshCredits();
      const remaining = c1?.remaining ?? 0;

      // Server uses ENV cost per doc, but client doesn’t need to know it;
      const docsToCharge = Math.max(1, Math.min(docsDetected, 9999));

      // Ask backend to charge for docsToCharge (backend enforces price/availability)
      const consumed = await consumeCredits(authEmail, identity.accountId, docsToCharge);
      // Normalize and reflect updated credits
      const newRemaining =
        consumed?.remainingCredits ?? consumed?.Remaining_Credits ?? consumed?.remaining ?? remaining;
      const newTotal = consumed?.totalCredits ?? consumed?.Total_Credits ?? consumed?.total ?? (c1?.total ?? 0);
      setCredits({ remaining: newRemaining, used: Math.max(newTotal - newRemaining, 0), total: newTotal });

      // If backend limited the number actually charged, optionally trim display
      let displayResult = json;
      if (docsDetected > docsToCharge) {
        const arr = Array.isArray(json?.images_results) ? json.images_results : [];
        const sliced = arr.filter((x: any) => x?.detected_data).slice(0, docsToCharge);
        displayResult = { ...json, images_results: sliced };
        setError(`Only processed ${docsToCharge} of ${docsDetected} document(s) due to credit limit.`);
      }

      // ✅ Persist extraction to the user's matching document by sha256
      await saveExtractToDoc(file, displayResult);

      // Then reflect in UI
      setApiResult(displayResult);
    } catch (e: any) {
      console.error("Extract error:", e);
      // Show server error or generic
      if (e?.status === 402 || e?.code === "INSUFFICIENT") {
        setError("All credits are consumed. Please purchase one of our plans.");
      } else if (e?.status === 404 || e?.code === "NO_ACCOUNT") {
        setError("No account found for your login. Please contact support.");
      } else {
        setError(e?.message || "Error extracting data");
      }
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
    if (format === "json") downloadBlob(JSON.stringify(rows, null, 2), "application/json", "json");
    else if (format === "csv") downloadBlob(toCSV(rows), "text/csv", "csv");
    else downloadBlob(toTXT(rows), "text/plain", "txt");
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
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowFull(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullRef.current?.focus();
    requestAnimationFrame(() => computeFitTo(fsWrapRef.current));
    setFsControlsVisible(true);
    const t = window.setTimeout(() => setFsControlsVisible(false), 1400);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [showFull]);

  useEffect(() => {
    computeFitTo(showFull ? fsWrapRef.current : previewWrapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotation, isPdf, showFull]);

  useEffect(() => {
    const onR = () => computeFitTo(showFull ? fsWrapRef.current : previewWrapRef.current);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [showFull, preview, isPdf]);

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

  useEffect(() => {
    return () => revokePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- UI ----------
  const [showFullState, setShowFullState] = useState(false);
  const openFullscreen = () => {
    if (!preview) return;
    if (isPdf) {
      window.open(preview, "_blank", "noopener,noreferrer");
    } else {
      setPan({ x: 0, y: 0 });
      setShowFull(true);
      setShowFullState(true);
    }
  };

  return (
    <div className="flex h-[80dvh] w-full bg-gray-100 p-6 gap-4">
      {/* LEFT: File Preview / Controls (with video bg) */}
      <div className="relative flex-1 max-w-[640px] min-w-[300px] rounded-2xl p-5 shadow-lg flex flex-col overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/God rays new.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full">
          {!authEmail && (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You must be logged in to use extraction and credits.{" "}
              <Link href="/login#login" className="underline font-medium">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/signup" className="underline font-medium">
                create an account
              </Link>
              .
            </div>
          )}

          {!preview ? (
            <div className="flex-1 flex items-center justify-center">
              <label className="cursor-pointer btn-blue px-4 py-2 rounded-lg shadow">
                Choose File
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          ) : (
            <>
              <div className="flex justify-start mb-3">
                <label className="cursor-pointer btn-blue px-4 py-2 rounded-lg shadow">
                  Choose File
                  <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
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

                <button
                  onClick={openFullscreen}
                  className="ml-4 inline-flex items-left justify-left p-1.5 rounded-md bg-transparent text-white/90 border border-white/30 hover:bg-white/10 hover:border-white/50 transition shadow-none"
                  aria-label="Open fullscreen"
                  title={isPdf ? "Open PDF in new tab" : "Open fullscreen"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 3H3v5M3 16v5h5M16 3h5v5M21 16v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm">{isPdf ? "Open" : ""}</span>
                </button>

                <div className="ml-2 inline-flex items-center gap-2">
                  <button
                    onClick={() => setRotation((r) => (r + 270) % 360)}
                    className="inline-flex items-center justify-center p-1.5 rounded-md bg-transparent text-white/90 border border-white/30 hover:bg-white/10 hover:border-white/50 transition shadow-none"
                    aria-label="Rotate left"
                    title="Rotate left 90°"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M7 7v4H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 5a7 7 0 1 1-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="inline-flex items-center justify-center p-1.5 rounded-md bg-transparent text-white/90 border border-white/30 hover:bg-white/10 hover:border-white/50 transition shadow-none"
                    aria-label="Rotate right"
                    title="Rotate right 90°"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M17 7v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 5a7 7 0 1 0 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Preview frame */}
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
                  <div className="w-full h-full flex items-center justify-center">
                    <div
                      className="w-full h-full"
                      style={{ transform: `rotate(${rotation}deg) scale(${pdfScale})`, transformOrigin: "center" }}
                    >
                      <iframe src={preview!} className="w-full h-full rounded-lg" title="PDF Preview" />
                    </div>
                  </div>
                ) : (
                  <img
                    ref={imgRef}
                    src={preview!}
                    alt="Preview"
                    className="max-w-none max-h-none object-contain"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: "center",
                    }}
                    draggable={false}
                    onLoad={() => computeFitTo(showFull ? fsWrapRef.current : previewWrapRef.current)}
                  />
                )}
              </div>

              {/* Extract */}
              <div className="pt-4">
                <button
                  onClick={handleUploadAndExtract}
                  disabled={loading || !authEmail}
                  className="w-full btn-blue text-white font-medium py-2 rounded-lg shadow disabled:opacity-60"
                  title={!authEmail ? "Please log in first" : undefined}
                >
                  {loading ? "Extracting..." : "Extract"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-300 self-stretch" />

      {/* RIGHT: Results + Credits */}
      <div className="flex-1 max-w-[640px] min-w-[360px] bg-white rounded-2xl p-6 shadow-lg overflow-y-auto">
        <div className="flex items-center justify-between mb-2" ref={dlMenuRef}>
          <div className="text-sm text-sky-500 font-medium">
            {credits ? (
              <>
                Credits: <span className="font-semibold">{credits.remaining}</span> / {credits.total}
              </>
            ) : authEmail ? (
              <span className="opacity-70">Credits: —</span>
            ) : (
              <span className="opacity-70">Log in to see credits</span>
            )}
          </div>

        <div className="relative">
            <button
              onClick={() => {
                if (!allDetectedData.length && !apiResult) return;
                setShowDownloadMenu((s) => !s);
              }}
              disabled={!allDetectedData.length && !apiResult}
              className="cursor-pointer btn-blue px-4 py-2 rounded-lg shadow disabled:opacity-60"
              aria-label="Download Data"
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

        <div className="pb-3 border-b border-gray-300" />

        {error && <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

        {!allDetectedData.length && !error && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-lg">
            No extracted data yet. Please upload a file and click Extract.
          </div>
        )}

        {allDetectedData.length > 0 && (
          <div className="flex flex-col gap-6 mt-4">
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
          className="fixed inset-0 z-1000 bg-black/95 backdrop-blur-2xl focus:outline-none overflow-hidden"
          onWheel={(e) => e.preventDefault()}
          onMouseMove={() => {
            setFsControlsVisible(true);
            if (fsHideTimer.current) window.clearTimeout(fsHideTimer.current);
            fsHideTimer.current = window.setTimeout(() => setFsControlsVisible(false), 1400);
          }}
          onTouchStart={() => {
            setFsControlsVisible(true);
            if (fsHideTimer.current) window.clearTimeout(fsHideTimer.current);
            fsHideTimer.current = window.setTimeout(() => setFsControlsVisible(false), 2000);
          }}
        >
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
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center",
              }}
              draggable={false}
              onLoad={() => computeFitTo(fsWrapRef.current)}
            />
          </div>

          <button
            onClick={() => setShowFull(false)}
            onMouseEnter={() => {
              fsHoveringClose.current = true;
              setFsControlsVisible(true);
            }}
            onMouseLeave={() => {
              fsHoveringClose.current = false;
            }}
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
