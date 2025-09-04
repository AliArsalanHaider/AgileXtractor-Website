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

  // pan state for images
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // fullscreen for images (custom immersive overlay)
  const [showFull, setShowFull] = useState(false);
  const fullRef = useRef<HTMLDivElement | null>(null);

  // containers/refs for fit-to-container
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const fsWrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // fullscreen close-button visibility controller (inside fullscreen)
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

  // ===== Credits helpers (Prisma-backed API) =====
  async function refreshCredits(e: string) {
    try {
      const res = await fetch(`/api/credits/status?email=${encodeURIComponent(e)}`, { cache: "no-store" });
      if (!res.ok) {
        setCredits(null);
        setHasRegistered(false);
        return;
      }
      const json = await res.json();
      const d = json.data; // Prisma: { totalCredits, remainingCredits, ... }
      setCredits({ remaining: d.remainingCredits, total: d.totalCredits });
      setHasRegistered(true);
    } catch {
      setCredits(null);
      setHasRegistered(false);
    }
  }

  async function handleRegister() {
    if (!email) {
      setError("Enter your email to register.");
      return;
    }
    setError(null);
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
    try { localStorage.setItem("agx_email", email); } catch {}
    setHasRegistered(true);
    await refreshCredits(email);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agx_email");
      if (saved) {
        setEmail(saved);
        refreshCredits(saved);
      }
    } catch {}
  }, []);

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

  // Upload -> extract -> charge only what user can afford; never show results with "out of credits"
  const handleUploadAndExtract = async () => {
    if (!file) return setError("Please select a file first.");
    if (!email) return setError("Please enter your email and click Register to get 500 trial credits.");

    setLoading(true);
    setError(null);
    setApiResult(null);

    try {
      // 0) Pre-check credits (block if < 100 so we don't show results then error)
      await refreshCredits(email);
      const rem0 = credits?.remaining ?? 0;
      if (rem0 < 100) {
        setError("You’ve run out of credits. Please purchase a plan to continue.");
        return;
      }

      // 1) Extract FIRST (no charge yet)
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
      // determine docs in the full result
      const docsDetected = Math.max(0, countDocsFromResult(json));

      // 2) Refresh credits again to be precise at charge time
      await refreshCredits(email);
      const remaining = credits?.remaining ?? 0;

      // How many docs can we afford? (100 credits per doc)
      const affordableDocs = Math.floor(remaining / 100);

      if (affordableDocs <= 0) {
        // Can't afford any -> don't show results
        setError("You’ve run out of credits. Please purchase a plan to continue.");
        return;
      }

      // Decide how many to charge & show
      const docsToCharge = Math.max(1, Math.min(docsDetected || 1, affordableDocs));

      // If we detected more docs than affordable, slice the result before showing
      let displayResult = json;
      if (docsDetected > docsToCharge) {
        const arr = Array.isArray(json?.images_results) ? json.images_results : [];
        const sliced = arr.filter((x: any) => x?.detected_data).slice(0, docsToCharge);
        // keep original order/shape: replace images_results with only the docs we can afford
        displayResult = { ...json, images_results: sliced };
        setError(`Only processed ${docsToCharge} of ${docsDetected} document(s) due to credit limit.`);
      }

      // 3) Charge for the number of docs we are going to show
      const consumeRes = await fetch("/api/credits/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, docs: docsToCharge }),
      });

      if (!consumeRes.ok) {
        const j = await consumeRes.json().catch(() => ({}));
        if (consumeRes.status === 402 || j?.code === "INSUFFICIENT") {
          // Safety: do not show results if charge failed
          setError("You’ve run out of credits. Please purchase a plan to continue.");
          return;
        } else if (consumeRes.status === 404 || j?.code === "NO_ACCOUNT") {
          setError("No account found. Please register first to get 500 trial credits.");
          return;
        } else {
          setError(j?.error || "Failed to consume credits.");
          return;
        }
      }

      const consumeJson = await consumeRes.json();
      const d = consumeJson?.data; // prisma row
      setCredits({ remaining: d.remainingCredits, total: d.totalCredits });

      // Show the (possibly sliced) result only after successful charge
      setApiResult(displayResult);
    } catch (e: any) {
      console.error("Extract error:", e);
      setError(e?.message || "Error extracting data");
      // Absolutely no charge on unexpected errors; optional signal (no-op on server)
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
    return apiResult.images_results
      .map((res: any) => res?.detected_data || null)
      .filter(Boolean);
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
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
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

  const onWheelZoomExclusive: React.WheelEventHandler = (e) => {
    if (!preview || isPdf) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY;
    const step = delta > 0 ? 0.1 : -0.1;
    setZoom((z) => Math.min(3.5, Math.max(0.25, Number((z + step).toFixed(2)))));
  };

  useEffect(() => { if (zoom <= 1.001) setPan({ x: 0, y: 0 }); }, [zoom]);

  useEffect(() => {
    if (!showFull) return;
    window.dispatchEvent(new CustomEvent("agx:immersive", { detail: true }));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowFull(false); };
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
      {/* LEFT panel unchanged ... */}
      {/* (omitted here for brevity—keep your original JSX; only logic above changed) */}
      {/* Paste your original left/preview + right/results JSX here unchanged */}
    </div>
  );
}
