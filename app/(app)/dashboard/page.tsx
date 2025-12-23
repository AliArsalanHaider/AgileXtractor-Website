"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { motion, animate, AnimatePresence } from "framer-motion";
import { getIdentity, PARAM_EMAIL, PARAM_ACCOUNT } from "@/lib/identity";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  // ===== CHANGED: add bars =====
  BarChart,
  Bar,
} from "recharts";

/* ============================== Dynamic Components ============================== */
const ResultView = dynamic(() => import("@/app/components/result"), {
  ssr: false,
}) as React.ComponentType<{ initialFile?: File | null }>;

/* ============================== Utilities ============================== */

function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

function firstOnly(name?: string) {
  if (!name) return "User";
  const clean =
    decodeURIComponent(name).replace(/%/g, " ").replace(/\s+/g, " ").trim() ||
    "User";
  return clean.split(" ")[0] || "User";
}

function useIdentityState() {
  const [id, setId] = React.useState(() => getIdentity());

  React.useEffect(() => {
    const onChange = () => setId(getIdentity());
    window.addEventListener("agx:auth-changed", onChange as EventListener);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("agx:auth-changed", onChange as EventListener);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isAuthed = !!(id?.email || id?.accountId);
  return { identity: id, isAuthed, refresh: () => setId(getIdentity()) };
}

/* ============================== Credits API ============================== */

const fetcher = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status}`);
    try {
      err.body = await res.text();
    } catch {}
    err.status = res.status;
    throw err;
  }
  return res.json();
};

function useCredits() {
  const identity = React.useMemo(() => getIdentity(), []);
  const key = React.useMemo(
    () => ["credits-status", identity.email || "", identity.accountId || ""],
    [identity.email, identity.accountId]
  );

  const fetchStatus = React.useCallback(async () => {
    const qs = new URLSearchParams();
    if (identity.email) qs.set(PARAM_EMAIL, identity.email);
    if (identity.accountId) qs.set(PARAM_ACCOUNT, identity.accountId);

    let data = await fetcher(
      `/api/credits/status${qs.toString() ? `?${qs}` : ""}`
    );
    if (data?.data) data = data.data;
    return data as { total: number; used: number; remaining: number };
  }, [identity.email, identity.accountId]);

  const { data, error, mutate } = useSWR(key, fetchStatus, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  React.useEffect(() => {
    if (!error || (error as any).status !== 404) return;
    (async () => {
      try {
        const body: Record<string, any> = {};
        if (identity.email) body[PARAM_EMAIL] = identity.email;
        if (identity.accountId) body[PARAM_ACCOUNT] = identity.accountId;

        const reg = await fetch("/api/credits/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (reg.ok) await mutate();
      } catch {}
    })();
  }, [error, mutate, identity.email, identity.accountId]);

  const total = data?.total ?? 0;
  const used = data?.used ?? 0;
  const remaining = data?.remaining ?? Math.max(total - used, 0);

  async function consume(amount = 1) {
    const body: Record<string, any> = { amount };
    if (identity.email) body[PARAM_EMAIL] = identity.email;
    if (identity.accountId) body[PARAM_ACCOUNT] = identity.accountId;
    const res = await fetch("/api/credits/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await mutate();
  }

  return { total, used, remaining, consume };
}

/* ============================== Logout helpers ============================== */

function purgeClientIdentity() {
  try {
    // keep activity history; only remove identity + usage caches
    ["agx_email", "email", "displayName", "userName", "accountId"].forEach(
      (n) => {
        document.cookie = `${n}=; Max-Age=0; path=/;`;
        const host = location.hostname.replace(/^www\./, "");
        document.cookie = `${n}=; Max-Age=0; path=/; domain=.${host};`;
      }
    );
    [
      "email",
      "userName",
      "accountId",
      "agx_usage_daily_v1",
      "agx_used_baselines_v1",
      "agx_used_last_total_v1",
      "agx_used_baseline_v1", // legacy single
    ].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
    (window as any).__USER__ = undefined;
  } catch {}
  window.dispatchEvent(new Event("agx:auth-changed"));
}

// Replace your existing handleLogout with this
async function handleLogout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {}

  // Best-effort: clear all non-HttpOnly cookies on host + root in the browser
  try {
    const host = location.hostname.replace(/^www\./, "");
    const cookieNames = document.cookie
      .split(";")
      .map((s) => s.trim().split("=")[0])
      .filter(Boolean);
    const unique = Array.from(new Set(cookieNames));
    for (const name of unique) {
      document.cookie = `${name}=; Max-Age=0; path=/;`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${host};`;
    }
  } catch {}

  // Clear client identity (but keep your 30-day activity history keys if desired)
  purgeClientIdentity();

  // Cross-tab broadcast so other tabs instantly sign out
  try {
    localStorage.setItem("agx:force-logout", String(Date.now()));
    localStorage.removeItem("agx:force-logout");
  } catch {}

  // Bounce to home (logged-out state)
  window.location.href = "/";
}

/* ============================== UI atoms ============================== */

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [key, setKey] = React.useState<number>(0);
  const show = React.useCallback((text: string) => {
    setMsg(text);
    setKey((k) => k + 1);
  }, []);
  const hide = React.useCallback(() => setMsg(null), []);
  return { msg, key, show, hide };
}

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 text-white text-sm px-4 py-2 shadow-lg"
      role="status"
      aria-live="polite"
    >
      {text}
    </motion.div>
  );
}

/* ============================== Credit Donut =============================== */

type DonutProps = { used: number; remaining: number; total: number };

export function CreditDonut({ used, remaining, total }: DonutProps) {
  const safeUsed = Math.max(Number(used) || 0, 0);
  const safeRemainingProp = Math.max(Number(remaining) || 0, 0);
  const safeTotal = Math.max(Number(total) || safeUsed + safeRemainingProp, 0);
  const safeRemaining =
    safeRemainingProp > 0 ? safeRemainingProp : Math.max(safeTotal - safeUsed, 0);

  const [activeMetric, setActiveMetric] =
    React.useState<"used" | "remaining">("used");

  const initialTarget = activeMetric === "used" ? safeUsed : safeRemaining;
  const [fillValue, setFillValue] = React.useState<number>(initialTarget);

  const FILL_FROM_ZERO = true;

  React.useEffect(() => {
    const target = activeMetric === "used" ? safeUsed : safeRemaining;
    const from = FILL_FROM_ZERO ? 0 : fillValue;
    const controls = animate(from, target, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setFillValue(latest),
    });
    return () => controls.stop();
  }, [activeMetric, safeUsed, safeRemaining]); // eslint-disable-line

  const blueSlice = Math.min(Math.max(fillValue, 0), safeTotal);
  const graySlice = Math.max(safeTotal - blueSlice, 0);

  const data =
    activeMetric === "used"
      ? [
          { name: "Used", value: blueSlice },
          { name: "Remaining", value: graySlice },
        ]
      : [
          { name: "Used", value: graySlice },
          { name: "Remaining", value: blueSlice },
        ];

  const COLORS = ["#0ea5e9", "#e2e8f0"];
  const centerValue = Math.round(blueSlice);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={cardVariants}
      className="h-full w-full bg-white rounded-3xl border border-neutral-900/10 p-5"
    >
      <div className="flex items-center justify-between h-12">
        <h3 className="text-sky-500 text-base md:text-lg font-extrabold">
          Credit Information
        </h3>

        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveMetric("used")}
            aria-pressed={activeMetric === "used"}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              activeMetric === "used"
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-900"
            }`}
          >
            Used
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("remaining")}
            aria-pressed={activeMetric === "remaining"}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              activeMetric === "remaining"
                ? "bg-sky-500 text-white"
                : "bg-slate-100 text-slate-900"
            }`}
          >
            Remaining
          </button>
        </div>
      </div>

      <div className="mt-1 flex flex-col items-center gap-2">
        <div className="w-48 h-48 md:w-52 md:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cy="50%"
                cx="50%"
                innerRadius={54}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="-mt-32 md:-mt-36 text-slate-900 text-2xl md:text-3xl font-extrabold select-none">
          {centerValue}
        </div>

        <div className="mt-24 md:mt-28 w-full max-w-xs">
          <div className="flex items-center gap-2 p-0.5 text-xs">
            <span className="w-2.5 h-2.5 bg-sky-500 rounded-sm" />
            <span className="text-slate-800">Total Credits</span>
            <span className="ml-auto text-slate-900 font-bold">{safeTotal}</span>
          </div>
          <div className="flex items-center gap-2 p-0.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor: activeMetric === "used" ? COLORS[0] : COLORS[1],
              }}
            />
            <span className="text-slate-800">Used Credits</span>
            <span className="ml-auto text-slate-900 font-bold">{safeUsed}</span>
          </div>
          <div className="flex items-center gap-2 p-0.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{
                backgroundColor:
                  activeMetric === "remaining" ? COLORS[0] : COLORS[1],
              }}
            />
            <span className="text-slate-800">Remaining Credits</span>
            <span className="ml-auto text-slate-900 font-bold">
              {safeRemaining}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================== Credit Usage (fixed daily bucketing) =============================== */

type UsagePoint = { iso: string; label: string; value: number };

const DAY_MS = 86400000;
const THIRTY_DAYS = 30 * DAY_MS;

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function fromISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function clampDate(d: Date, min: Date, max: Date): Date {
  return d < min ? min : d > max ? max : d;
}
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return String(n);
}
function buildNiceTicks(maxVal: number) {
  const choices = [100, 200, 250, 500, 1000, 1500, 2000, 2500, 5000, 10000, 20000, 50000];
  let step = 100;
  for (const c of choices) {
    if (maxVal / c <= 8) {
      step = c;
      break;
    }
  }
  const niceMax = Math.max(step, Math.ceil(maxVal / step) * step);
  const ticks: number[] = [];
  for (let t = step; t <= niceMax; t += step) ticks.push(t);
  return { ticks, niceMax };
}

/* ===== Daily usage tracker (V3) — browser timezone + legacy migration ===== */

type UsageMap = Record<string, number>;

const DAILY_KEY_V3 = "AGX_DAILY_V3";
const SNAP_KEY_V3  = "AGX_SNAP_V3"; // { iso: 'YYYY-MM-DD', used: number } (start-of-day baseline)
const LAST_KEY_V3  = "AGX_LAST_V3"; // { used: number } (last seen cumulative)

// Legacy (for migration)
const DAILY_KEY_V2 = "AGX_DAILY_V2";
const SNAP_KEY_V2  = "AGX_SNAP_V2";
const LAST_KEY_V2  = "AGX_LAST_V2";

const DAILY_KEY_V1 = "agx_usage_daily_v1";      // Record<iso, number>
const BASE_KEY_V1  = "agx_used_baseline_v1";    // { iso: string, value: number }

/** ISO date (YYYY-MM-DD) in *browser's* current timezone. */
function isoLocal(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function clampToWindow(map: UsageMap, days = 30): UsageMap {
  const todayIso = isoLocal(new Date());
  const anchor = new Date(todayIso + "T00:00:00");
  anchor.setDate(anchor.getDate() - (days - 1));
  const keepIso = isoLocal(anchor);

  const out: UsageMap = {};
  Object.keys(map)
    .sort()
    .forEach((iso) => {
      if (iso >= keepIso) out[iso] = map[iso];
    });
  return out;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}
function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/** Migrate V2 or V1 keys to V3 (runs once automatically). */
function tryMigrateLegacyToV3() {
  // If V3 already exists, skip migration
  const hasV3Daily = !!localStorage.getItem(DAILY_KEY_V3);
  const hasV3Snap  = !!localStorage.getItem(SNAP_KEY_V3);
  if (hasV3Daily && hasV3Snap) return;

  const todayIso = isoLocal(new Date());

  // Prefer V2 if present
  const hasV2 =
    localStorage.getItem(DAILY_KEY_V2) !== null ||
    localStorage.getItem(SNAP_KEY_V2) !== null ||
    localStorage.getItem(LAST_KEY_V2) !== null;

  if (hasV2) {
    const dailyV2 = loadJSON<UsageMap>(DAILY_KEY_V2, {});
    const snapV2  = loadJSON<{ iso: string; used: number }>(
      SNAP_KEY_V2,
      { iso: todayIso, used: 0 }
    );
    const lastV2  = loadJSON<{ used: number }>(LAST_KEY_V2, { used: snapV2.used });

    const pruned = clampToWindow(dailyV2, 30);
    saveJSON(DAILY_KEY_V3, pruned);
    saveJSON(SNAP_KEY_V3, snapV2);
    saveJSON(LAST_KEY_V3, lastV2);

    // Optionally clean old keys so we don't re-migrate
    removeKey(DAILY_KEY_V2);
    removeKey(SNAP_KEY_V2);
    removeKey(LAST_KEY_V2);
    return;
  }

  // Else try V1
  const hasV1 =
    localStorage.getItem(DAILY_KEY_V1) !== null ||
    localStorage.getItem(BASE_KEY_V1) !== null;

  if (hasV1) {
    const dailyV1 = loadJSON<UsageMap>(DAILY_KEY_V1, {});
    const baseV1  = loadJSON<{ iso: string; value: number } | null>(BASE_KEY_V1, null);

    const pruned = clampToWindow(dailyV1, 30);

    // V1 baseline uses {value} not {used}
    const snapV3 = baseV1
      ? { iso: baseV1.iso || todayIso, used: Math.max(0, Number(baseV1.value) || 0) }
      : { iso: todayIso, used: 0 };

    // Best-effort last-used: baseline + today's daily (if any)
    const todayDaily = Number.isFinite(pruned[snapV3.iso]) ? pruned[snapV3.iso] : 0;
    const lastV3 = { used: Math.max(0, (snapV3.used || 0) + (todayDaily || 0)) };

    saveJSON(DAILY_KEY_V3, pruned);
    saveJSON(SNAP_KEY_V3, snapV3);
    saveJSON(LAST_KEY_V3, lastV3);

    // Optionally clean old keys
    removeKey(DAILY_KEY_V1);
    removeKey(BASE_KEY_V1);
  }
}

/**
 * Track per-day *incremental* usage from a cumulative `usedTotalNow` value.
 * - Uses browser timezone
 * - Finalizes previous day at local midnight
 * - No double counting on refresh
 * - 30-day rolling window
 * - Auto-migrates V2/V1 on first run
 * - Optional server hydration if `/api/credits/usage-log` exists (daily map)
 */
function useDailyUsageFromCredits(usedTotalNow: number) {
  const [map, setMap] = React.useState<UsageMap>({});

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // One-time migration
    tryMigrateLegacyToV3();

    const now = new Date();
    const todayIso = isoLocal(now);

    // Load persisted V3 state
    const daily = loadJSON<UsageMap>(DAILY_KEY_V3, {});
    let snap = loadJSON<{ iso: string; used: number }>(
      SNAP_KEY_V3,
      { iso: todayIso, used: usedTotalNow || 0 }
    );
    let last = loadJSON<{ used: number }>(
      LAST_KEY_V3,
      { used: usedTotalNow || 0 }
    );

    // If day changed since last baseline, finalize that day before moving on
    if (snap.iso !== todayIso) {
      const prevIso = snap.iso;
      const finalized = Math.max(0, (last.used || 0) - (snap.used || 0));

      // Only overwrite if not already finalized (or zero)
      if (!Number.isFinite(daily[prevIso]) || daily[prevIso] === 0) {
        daily[prevIso] = finalized;
      }

      // Start new baseline for today
      snap = { iso: todayIso, used: usedTotalNow || 0 };
    }

    // Today's live value = current cumulative − today's baseline
    const todayValue = Math.max(0, (usedTotalNow || 0) - (snap.used || 0));
    daily[todayIso] = todayValue;

    // Keep last 30 days
    let pruned = clampToWindow(daily, 30);

    // ===== Optional server hydration (safe no-op if endpoint missing)
    // If you keep authoritative per-day usage on server, return a map:
    // { "YYYY-MM-DD": number, ... } for recent days.
    // We merge it so the chart can show older true splits.
    // No error bubbles to UI.
    (async () => {
      try {
        const res = await fetch("/api/credits/usage-log", { cache: "no-store", credentials: "include" });
        if (res.ok) {
          const serverMap = (await res.json()) as UsageMap | { data?: UsageMap };
          const m: UsageMap = Array.isArray(serverMap)
            ? {}
            : ("data" in (serverMap as any) ? (serverMap as any).data : (serverMap as UsageMap)) || {};
          if (m && typeof m === "object") {
            // Merge server days (server wins for those days)
            const merged: UsageMap = { ...pruned, ...m };
            pruned = clampToWindow(merged, 30);
          }
        }
      } catch {}
      // Persist, then set map after optional hydration attempt completes
      saveJSON(DAILY_KEY_V3, pruned);
      saveJSON(SNAP_KEY_V3, snap);
      saveJSON(LAST_KEY_V3, { used: usedTotalNow || 0 });
      setMap(pruned);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedTotalNow]);

  return map;
}

/* ===== Helper: force default window to last 20 previous days + today ===== */
function windowFromMap(_: Record<string, number>) {
  const today = new Date();
  const maxISO = toISO(today);           // include today
  const minISO = toISO(addDays(today, -20)); // previous 20 days
  const suggestFrom = minISO;
  const suggestTo = maxISO;
  return { minISO, maxISO, suggestFrom, suggestTo };
}

/* ============================== Credit Usage (V3-aligned, 20-day history) =============================== */
export function CreditUsage() {
  const [bounds, setBounds] = React.useState<{ minISO: string; maxISO: string } | null>(null);
  const [fromISOState, setFromISOState] = React.useState<string>("");
  const [toISOState, setToISOState] = React.useState<string>("");

  const { used } = useCredits();                 // cumulative total from API
  const daysMap = useDailyUsageFromCredits(used); // per-day map (browser TZ)

  // Initialize pickers to: [today-20 ... today]
  React.useEffect(() => {
    const { minISO, maxISO, suggestFrom, suggestTo } = windowFromMap(daysMap);
    setBounds({ minISO, maxISO });
    setFromISOState(suggestFrom);
    setToISOState(suggestTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(daysMap)]);

  const enforce = React.useCallback((fromS: string, toS: string) => {
    if (!bounds) return;
    const { minISO, maxISO } = bounds;
    const min = fromISO(minISO);
    const max = fromISO(maxISO);

    let f = clampDate(fromISO(fromS), min, max);
    let t = clampDate(fromISO(toS), min, max);
    if (f > t) [f, t] = [t, f];

    // limit to 21 days (today + previous 20) for clarity
    const days = Math.floor((+t - +f) / DAY_MS) + 1;
    if (days > 21) f = addDays(t, -20);

    setFromISOState(toISO(f));
    setToISOState(toISO(t));
  }, [bounds]);

  const range = React.useMemo(() => {
    const out: UsagePoint[] = [];
    if (!fromISOState || !toISOState) return out;
    let cur = fromISO(fromISOState);
    const end = fromISO(toISOState);
    while (cur <= end) {
      const iso = toISO(cur);
      out.push({
        iso,
        label: `${iso.slice(5, 7)}/${iso.slice(8, 10)}`,
        value: Number(daysMap[iso] || 0),
      });
      cur = addDays(cur, 1);
    }
    return out;
  }, [fromISOState, toISOState, daysMap]);

  const totalUsedInRange = React.useMemo(
    () => range.reduce((s, d) => s + d.value, 0),
    [range]
  );

  const maxVal = Math.max(100, ...range.map((d) => d.value));
  const { ticks, niceMax } = buildNiceTicks(maxVal);

  const ready = Boolean(bounds && fromISOState && toISOState);
  const minISO = bounds?.minISO ?? "";
  const maxISO = bounds?.maxISO ?? "";

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={cardVariants}
      className="h-full w-full bg-white rounded-3xl border border-neutral-900/10 p-5"
    >
      <div className="flex items-center justify-between gap-10">
        <h3 className="text-sky-500 text-base md:text-lg font-extrabold whitespace-nowrap">
          Credit Usage
        </h3>

        <div className="flex items-stretch gap-1 flex-wrap">
          <div className="w-18 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-600 leading-none">From</span>
            {ready ? (
              <input
                type="date"
                value={fromISOState}
                min={minISO}
                max={maxISO}
                onChange={(e) => e.target.value && enforce(e.target.value, toISOState)}
                className="w-full bg-transparent outline-none text-[12px] font-medium leading-none mt-1"
                suppressHydrationWarning
              />
            ) : (
              <div className="mt-1 h-[18px] w-full rounded bg-slate-100" />
            )}
          </div>

          <div className="w-18 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-600 leading-none">To</span>
            {ready ? (
              <input
                type="date"
                value={toISOState}
                min={minISO}
                max={maxISO}
                onChange={(e) => e.target.value && enforce(fromISOState, e.target.value)}
                className="w-full bg-transparent outline-none text-[12px] font-medium leading-none mt-1"
                suppressHydrationWarning
              />
            ) : (
              <div className="mt-1 h-[18px] w-full rounded bg-slate-100" />
            )}
          </div>

          <div className="w-14 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-600 leading-none">Used</span>
            {ready ? (
              <span
                className="mt-1 text-slate-900 font-extrabold text-sm leading-none tabular-nums"
                suppressHydrationWarning
              >
                {totalUsedInRange}
              </span>
            ) : (
              <span className="mt-1 h-[18px] w-10 rounded bg-slate-200" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 h-48 md:h-56">
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={range} margin={{ top: 2, right: 8, left: 6, bottom: 0 }}>
              <CartesianGrid strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="label"
                height={18}
                tickMargin={2}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={36}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(15,23,42,0.2)", strokeWidth: 1 }}
                ticks={ticks}
                domain={[0, niceMax]}
                tickFormatter={compact}
                padding={{ top: 0, bottom: 0 }}
              />
              <Tooltip
                cursor={{ fillOpacity: 0.06 }}
                formatter={(v: number) => [`${v} credits`, "Used"] as any}
                labelClassName="text-xs"
              />
              <Bar dataKey="value" stroke="#38bdf8" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-xl bg-slate-50" />
        )}
      </div>
    </motion.div>
  );
}
/* ============================== Buy Credit Function =============================== */

function BuyCreditSection() {
  const [selected, setSelected] = React.useState("500");
  const [customValue, setCustomValue] = React.useState(500);

  const effectiveCredits =
    selected === "custom" ? customValue : Number(selected);

  const priceAED = (effectiveCredits / 500) * 10;

  const startCheckout = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({

        amountAED: priceAED,
      }),
    });

    const j = await res.json();
    if (j?.url) {
      window.location.href = j.url; // redirect to Stripe checkout
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
      }}
      className="bg-white rounded-3xl p-6 border border-neutral-900/10"
    >
      <h2 className="text-sky-500 text-xl font-extrabold">Buy Credits</h2>
      <p className="text-slate-600 text-sm mt-1">
        Select the number of credits you want to purchase.
      </p>

      {/* Dropdown */}
      <div className="mt-5">
        <label className="text-sm text-slate-700 font-medium">Credits</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="500">500 credits</option>
          <option value="1000">1000 credits</option>
          <option value="2000">2000 credits</option>
          <option value="custom">Customize…</option>
        </select>
      </div>

      {selected === "custom" && (
        <div className="mt-4">
          <label className="text-sm text-slate-700 font-medium">
            Custom Credits (min 500)
          </label>
          <input
            type="number"
            value={customValue}
            min={500}
            onChange={(e) =>
              setCustomValue(Math.max(500, Number(e.target.value)))
            }
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Price summary */}
      <div className="mt-6 bg-slate-100 rounded-xl p-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-700">Credits Selected</span>
          <span className="font-semibold">{effectiveCredits}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-slate-700">Price (AED)</span>
          <span className="font-bold text-sky-600">{priceAED.toFixed(2)} AED</span>
        </div>
      </div>

      {/* Checkout button */}
      <button
        onClick={startCheckout}
        className="mt-6 w-full bg-sky-500 text-white font-semibold py-3 rounded-xl hover:bg-sky-600 transition"
      >
        Proceed to Payment
      </button>
    </motion.div>
  );
}



/* ============================== Upload Doc (Inline Panel) =============================== */

type DocRow = {
  id: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
  contentType?: string;
  hasExtract?: boolean;
};

function UploadDocPanel({
  onOpenDocViewer,
  onOpenResultModal,
  toastShow,
  onActivity,
}: {
  onOpenDocViewer: (doc: DocRow) => void;
  onOpenResultModal: (file: File) => void;
  toastShow: (msg: string) => void;
  onActivity: (a: ActivityItem) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [docs, setDocs] = React.useState<DocRow[]>([]);

  const refreshList = React.useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/documents/list", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json();
      const arr = Array.isArray(j?.docs) ? j.docs : [];
      setDocs(arr);
    } catch (e: any) {
      setError(e?.message || "Failed to load documents.");
    }
  }, []);

  React.useEffect(() => {
    refreshList();
  }, [refreshList]);

  React.useEffect(() => {
    const onMaybeRefresh = () => refreshList();
    window.addEventListener("agx:maybe-refresh-docs", onMaybeRefresh);
    return () =>
      window.removeEventListener("agx:maybe-refresh-docs", onMaybeRefresh);
  }, [refreshList]);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await refreshList();
      toastShow("File added");

      onActivity({
        id: Date.now(),
        type: "upload",
        title: "Document uploaded",
        subtitle: (file?.name ?? "A file") + " added",
        when: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    try {
      const res = await fetch(`/api/documents/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshList();
      toastShow("File deleted");

      onActivity({
        id: Date.now(),
        type: "delete",
        title: "Document deleted",
        subtitle: id,
        when: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message || "Delete failed.");
    }
  }

  async function openExtractModalFromStoredDoc(d: DocRow) {
    try {
      const url = `/api/documents/download?id=${encodeURIComponent(d.id)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const mime = blob.type || d.contentType || "application/octet-stream";
      const f = new File([blob], d.originalName, { type: mime });
      onOpenResultModal(f);

      onActivity({
        id: Date.now(),
        type: "extract_open",
        title: "Opened extractor",
        subtitle: d.originalName,
        when: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message || "Failed to open extractor.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-900/10">
        <h3 className="text-sky-500 text-base md:text-lg font-extrabold">
          Upload Document
        </h3>
        <p className="text-slate-600 text-sm mt-1">
          Save documents to your account and extract anytime.
        </p>

        <form
          onSubmit={onUpload}
          className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !file}
            className="rounded-xl bg-sky-500 px-5 py-2.5 text-white font-semibold disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </form>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* List card */}
      <div className="bg-white rounded-3xl p-5 border border-neutral-900/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sky-500 text-base md:text-lg font-extrabold">
            Your Documents
          </h3>
          <button
            type="button"
            onClick={refreshList}
            className="text-sm text-sky-600 hover:text-sky-800"
          >
            Refresh
          </button>
        </div>

        {docs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No documents yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {docs.map((d) => (
              <li key={d.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {d.originalName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {Math.round(d.sizeBytes / 1024)} KB •{" "}
                    {new Date(d.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* View document → Split viewer */}
                  <button
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title="View"
                    aria-label="View"
                    onClick={() => onOpenDocViewer(d)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>

                  {/* Extract (open Test Drive modal) */}
                  <button
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title="Extract data"
                    aria-label="Extract data"
                    onClick={() => openExtractModalFromStoredDoc(d)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 21l9-9M14 7l3-3m-1 5l5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>

                  {/* Download */}
                  <a
                    href={`/api/documents/download?id=${encodeURIComponent(d.id)}`}
                    className="p-2 rounded-lg hover:bg-slate-100"
                    title="Download"
                    aria-label="Download"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>

                  {/* Delete */}
                  <button
                    className="p-2 rounded-lg hover:bg-slate-100 text-red-600"
                    title="Delete file"
                    aria-label="Delete file"
                    onClick={() => onDelete(d.id)}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6M9 6l1-2h4l1 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ============================== Sidebar =============================== */

function Sidebar({
  userFullName = "User",
  onCollapse,
  onLogout,
  onSelectTab,
  activeTab,
}: {
  userFullName?: string;
  onCollapse: () => void;
  onLogout: () => void;
  onSelectTab: (tab: DashTab) => void;
  activeTab: DashTab;
}) {
  const mounted = useMounted();
  const isHome = activeTab === "home";
  const isUpload = activeTab === "upload";
  const isHistory = activeTab === "history";

  const baseBtn =
    "w-full flex items-center gap-4 pl-6 pr-4 py-3 rounded-3xl transition";
  const active = "bg-sky-500/90 hover:bg-sky-500 text-white";
  const inactive = "hover:bg-white/10 text-white";

  return (
    <aside
      className="
        relative h-full w-72 text-white flex flex-col
        bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl
        overflow-hidden
      "
    >
      <video
        className="absolute inset-0 w-full h-full object-cover -z-10"
        src="/God rays new.mp4"
        autoPlay
        playsInline
        muted
        loop
        preload="metadata"
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/20 to-black/40 -z-10" />

      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <img
            className="w-10 h-10 rounded-full bg-white/20"
            src="https://placehold.co/40x40"
            alt="user"
          />
          <div className="flex-1">
            <div className="text-sm font-bold" suppressHydrationWarning>
              {mounted ? firstOnly(userFullName) : "User"}
            </div>
            <div className="text-xs opacity-80">Super Admin</div>
          </div>

          <button
            className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg border border-white/20"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            title="Collapse"
          >
            <Image src="/back button.png" alt="Back" width={18} height={18} />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
          <div className="text-xs font-bold">Search</div>
          <div className="ml-auto">🔍</div>
        </div>
      </div>

      <nav className="px-4 space-y-1 text-sm">
        <button
          className={`${baseBtn} ${isHome ? active : inactive}`}
          onClick={() => onSelectTab("home")}
        >
          <span>🏠</span>
          <span className="font-bold">Dashboard</span>
        </button>
        <button
          className={`${baseBtn} ${isUpload ? active : inactive}`}
          onClick={() => onSelectTab("upload")}
        >
          <span>📁</span>
          <span>Upload Doc</span>
        </button>

        <button
          className={`${baseBtn} ${isHistory ? active : inactive}`}
          onClick={() => onSelectTab("history")}
        >
          <span>📊</span>
          <span>History</span>
        </button>

       <button
        className={`${baseBtn} ${activeTab ? active : inactive}`}
        onClick={() => onSelectTab("buy")}
      >
        <span>💳</span>
        <span>Buy Credit</span>
      </button>
      
      </nav>

      <div className="mt-6 px-4">
        <div className="pl-6 py-1 uppercase text-[11px] opacity-85">Settings</div>
        <button className={`${baseBtn} ${inactive}`}>
          <span>💰</span>
          <span>Payment Status</span>
        </button>
        <button
          onClick={onLogout}
          className="mt-2 w-full flex items-center gap-4 pl-6 pr-4 py-3 hover:bg-white/15 rounded-3xl text-sm text-red-100"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      <div className="mt-auto p-4">
        <div className="p-3 bg-white/10 rounded-xl relative overflow-hidden border border-white/15">
          <div className="absolute right-0 -top-8 w-40 h-16 rotate-31 bg-sky-400/10" />
          <div className="flex items-start gap-2">
            <div>✨</div>
            <div>
              <div className="text-sm font-extrabold">Customize Your Own.</div>
              <div className="text-[11px] opacity-80">
                Unlock more on Customize plan.
              </div>
            </div>
          </div>
          <button className="mt-2 w-full px-3 py-1.5 bg-sky-500 rounded-xl text-white text-[11px] font-bold">
            Contact Us Now
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ============================== Activity Types & Storage =============================== */

type ActivityItem = {
  id: number;
  type: "upload" | "delete" | "extract_open" | "extract_done" | "other";
  title: string;
  subtitle?: string;
  when: string; // ISO
};

function activityKeyFor(identity?: { email?: string; accountId?: string }) {
  const id = identity?.accountId || identity?.email || "anon";
  return `agx_activity_v1:${id}`;
}

function readActivitiesFor(identity?: { email?: string; accountId?: string }): ActivityItem[] {
  try {
    const key = activityKeyFor(identity);
    const raw = localStorage.getItem(key);
    const arr: ActivityItem[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const kept = arr.filter((a) => now - new Date(a.when).getTime() <= THIRTY_DAYS);
    if (kept.length !== arr.length) {
      localStorage.setItem(key, JSON.stringify(kept));
    }
    return kept.sort((a, b) => +new Date(b.when) - +new Date(a.when));
  } catch {
    return [];
  }
}

function writeActivitiesFor(
  identity: { email?: string; accountId?: string } | undefined,
  items: ActivityItem[]
) {
  const key = activityKeyFor(identity);
  const now = Date.now();
  const kept = items
    .filter((a) => now - new Date(a.when).getTime() <= THIRTY_DAYS)
    .sort((a, b) => +new Date(b.when) - +new Date(a.when));
  localStorage.setItem(key, JSON.stringify(kept));
}

// Optional: server bootstrap
async function fetchActivities(): Promise<ActivityItem[]> {
  return [];
}

/* ============================== Recent Activity =============================== */

function RecentActivity({
  items,
  onView,
}: {
  items: ActivityItem[];
  onView: (id: number) => void;
}) {
  const top3 = React.useMemo(
    () =>
      [...items]
        .sort((a, b) => +new Date(b.when) - +new Date(a.when))
        .slice(0, 3),
    [items]
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={cardVariants}
      className="bg-white rounded-3xl p-4 border border-neutral-900/10"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sky-500 text-base font-extrabold">Recent Activity</h3>
        <div className="text-xs text-slate-500">{top3.length} items</div>
      </div>

      {top3.length === 0 ? (
        <div className="text-xs text-slate-500">No recent activity.</div>
      ) : (
        <ul className="space-y-3">
          {top3.map((it) => (
            <li key={it.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 grid place-items-center text-sm">
                {it.type === "upload" ? "⬆️" : it.type === "delete" ? "🗑️" : "✨"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {it.title}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {it.subtitle || ""} · {new Date(it.when).toLocaleString()}
                </div>
              </div>
              <button
                className="text-xs text-sky-600 font-bold hover:text-sky-800"
                onClick={() => onView(it.id)}
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/* ============================== History Section =============================== */

function HistorySection({
  items,
  highlightTarget,
}: {
  items: ActivityItem[];
  highlightTarget?: number | null;
}) {
  const refs = React.useRef<Record<number, HTMLLIElement | null>>({ });
  const [glowId, setGlowId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!highlightTarget) return;
    const el = refs.current[highlightTarget];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setGlowId(highlightTarget);
      const t = setTimeout(() => setGlowId(null), 1800);
      return () => clearTimeout(t);
    }
  }, [highlightTarget]);

  const sorted = React.useMemo(
    () => [...items].sort((a, b) => +new Date(b.when) - +new Date(a.when)),
    [items]
  );

  return (
    <div className="bg-white rounded-3xl p-5 border border-neutral-900/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sky-500 text-base md:text-lg font-extrabold">
          History
        </h3>
        <div className="text-xs text-slate-500">{sorted.length} total</div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-slate-600">No activity yet.</div>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[70vh] overflow-auto rounded-xl border border-slate-100">
          {sorted.map((it) => (
            <li
              key={it.id}
              ref={(n) => {
                refs.current[it.id] = n;
              }}
              className={[
                "px-4 py-3 flex items-start gap-3 transition-colors",
                glowId === it.id ? "bg-yellow-50" : "bg-white",
              ].join(" ")}
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 grid place-items-center text-sm mt-0.5">
                {it.type === "upload" ? "⬆️" : it.type === "delete" ? "🗑️" : "✨"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {it.title}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {it.subtitle || ""}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(it.when).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============================== Banner ================================ */

export function HeroBanner() {
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "agx:force-logout") window.location.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="mt-4 relative">
      <div
        className="
          relative mx-auto w-full max-w-5xl
          h-[140px] md:h-40 lg:h-32
          rounded-3xl overflow-hidden
        "
      >
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/God rays new.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div
          className="
            absolute inset-0 pointer-events-none
            mask-[linear-gradient(to_bottom,white_65%,transparent)]
            [-webkit-mask-image:linear-gradient(to_bottom,white_65%,transparent)]
          "
        >
          <div
            className="
              absolute -bottom-1
              left-4
              text-white/10 font-bold tracking-tight
              text-[58px] md:text-[88px] lg:text-[92px] leading-none
              whitespace-nowrap select-none text-right
            "
            aria-hidden="true"
          >
            <span className="pr-1">Agile</span>
            <img
              src="/X White.png"
              alt="X"
              className="inline-block w-10 h-10 md:w-[58px] md:h-[58px] lg:w-20 lg:h-20 -mx-0.5"
            />
            <span className="pl-1">tract</span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0.5 rounded-[22px] ring-1 ring-white/10" />
      </div>

      <div
        className="
          pointer-events-none
          absolute
          top-1/2 -translate-y-[58%] right-10
          z-2
        "
      >
        <Image
          src="/img on bg without shadow.png"
          alt="Document extraction illustration"
          width={800}
          height={800}
          priority
          sizes="(min-width: 1024px) 560px, (min-width: 768px) 480px, 360px"
          className="
            w-[360px] md:w-[480px] lg:w-56
            h-auto
          "
        />
      </div>
    </div>
  );
}

/* ============================== Page ================================== */

type DashTab = "home" | "upload" | "history" | "buy" ;

export default function DashboardPage() {
  const mounted = useMounted();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [tab, setTab] = React.useState<DashTab>("home");

  const { total, used, remaining } = useCredits();

  const { identity, isAuthed } = useIdentityState();
  const fullName = identity?.displayName || identity?.email || "User";

  // Result modal (Test Drive)
  const [resultModalOpen, setResultModalOpen] = React.useState(false);
  const [initialFile, setInitialFile] = React.useState<File | null>(null);
  const [animateIn, setAnimateIn] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Split viewer
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerDoc, setViewerDoc] = React.useState<DocRow | null>(null);
  const [viewerExtract, setViewerExtract] = React.useState<any | null>(null);
  const [viewerLoading, setViewerLoading] = React.useState(false);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [viewerMime, setViewerMime] = React.useState<string>("application/octet-stream");

  // Toast
  const { msg, key, show: toastShow, hide: toastHide } = useToast();

  // Activities
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [historyHighlightId, setHistoryHighlightId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const onFS = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  React.useEffect(() => {
    if (mounted && !isAuthed) {
      router.replace("/");
    }
  }, [mounted, isAuthed, router]);

  // Bootstrap activities (namespaced) + migrate legacy key once
  React.useEffect(() => {
    try {
      const legacy = localStorage.getItem("agx_activity_v1");
      if (legacy && (identity?.email || identity?.accountId)) {
        localStorage.setItem(activityKeyFor(identity), legacy);
        localStorage.removeItem("agx_activity_v1");
      }
    } catch {}
    setActivities(readActivitiesFor(identity));

    const onStorage = (e: StorageEvent) => {
      if (e.key === activityKeyFor(identity)) setActivities(readActivitiesFor(identity));
      if (e.key === "agx:force-logout") window.location.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [identity?.email, identity?.accountId]);

  const pushActivity = React.useCallback(
    (a: ActivityItem) => {
      setActivities((prev) => {
        const next = [a, ...prev].slice(0, 1000);
        writeActivitiesFor(identity, next);
        return next;
      });
      try {
        localStorage.setItem("__agx_activity_ping", String(Date.now()));
        localStorage.removeItem("__agx_activity_ping");
      } catch {}
    },
    [identity?.email, identity?.accountId]
  );

  // Modal controls
  const openResultWithFile = React.useCallback((f: File) => {
    setInitialFile(f);
    setResultModalOpen(true);
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  const closeResultModal = React.useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => {
      setResultModalOpen(false);
      setInitialFile(null);
      window.dispatchEvent(new Event("agx:maybe-refresh-docs"));
    }, 180);
  }, []);

  const onOpenDocViewer = React.useCallback(async (doc: DocRow) => {
    setViewerOpen(true);
    setViewerDoc(doc);
    setViewerExtract(null);
    setViewerLoading(true);
    setViewerUrl(null);
    setViewerMime("application/octet-stream");

    try {
      const fileRes = await fetch(
        `/api/documents/download?id=${encodeURIComponent(doc.id)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (fileRes.ok) {
        const blob = await fileRes.blob();
        const url = URL.createObjectURL(blob);
        setViewerUrl(url);
        setViewerMime(blob.type || doc.contentType || "application/octet-stream");
      }

      const metaRes = await fetch(
        `/api/documents/view-extracted?id=${encodeURIComponent(doc.id)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (metaRes.ok) {
        const j = await metaRes.json();
        const payload =
          j?.doc?.extractResult?.images_results?.[0]?.detected_data ??
          j?.doc?.extractResult?.detected_data ??
          j?.doc?.extractJson?.images_results?.[0]?.detected_data ??
          j?.doc?.extractJson?.detected_data ??
          null;
        setViewerExtract(payload);
      } else {
        setViewerExtract(null);
      }
    } catch {
      setViewerExtract(null);
    } finally {
      setViewerLoading(false);
    }
  }, []);

  const closeViewer = React.useCallback(() => {
    setViewerOpen(false);
    setViewerDoc(null);
    setViewerExtract(null);
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
  }, [viewerUrl]);

  const handleViewActivity = React.useCallback(
    (id: number) => {
      setTab("history");
      setHistoryHighlightId(id);
      setTimeout(() => setHistoryHighlightId(id), 50);
    },
    []
  );

  if (!mounted || !isAuthed) return null;

  return (
    <div className="min-h-screen">
      {/* global toast */}
      <AnimatePresence>
        {msg ? <Toast key={key} text={msg} onDone={toastHide} /> : null}
      </AnimatePresence>

      {/* page background video */}
      <div className="fixed inset-0 -z-10">
        <video
          className="w-full h-full object-cover"
          src="/God rays new.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        ></video>
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
        <div className="flex gap-5 items-stretch">
          {sidebarOpen ? (
            <div className="w-72 shrink-0">
              <Sidebar
                userFullName={fullName}
                onCollapse={() => setSidebarOpen(false)}
                onLogout={handleLogout}
                onSelectTab={setTab}
                activeTab={tab}
              />
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open menu"
              aria-label="Open menu"
              className="shrink-0 h-11 px-3 rounded-full bg-white/90 backdrop-blur border border-neutral-900/10 hover:bg-white"
            >
              ☰ Menu
            </button>
          )}

          {/* Main content */}
          <div className="flex-1 bg-white/92 backdrop-blur-md rounded-2xl p-5 border border-neutral-900/10 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-sky-500 text-2xl md:text-3xl font-extrabold leading-tight">
                  Welcome Back{" "}
                  <span suppressHydrationWarning>
                    {mounted ? firstOnly(fullName) : "User"}
                  </span>
                </h1>
                <p className="text-slate-700/90 mt-1 text-sm">
                  Ready to get things done? Choose what you’d like to start with.
                </p>
              </div>
              <div className="pl-1 pr-3 py-1 bg-white/95 rounded-2xl shadow-[0_2px_24px_rgba(30,20,106,0.08)] flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl overflow-hidden">
                  <div className="w-full h-full bg-sky-400/30 rounded-full" />
                </div>
                <div
                  className="text-xs sm:text-sm font-semibold"
                  suppressHydrationWarning
                >
                  {mounted ? firstOnly(fullName) : "User"}
                </div>
                <div className="w-5 h-5 grid place-items-center">▾</div>
              </div>
            </div>

            <HeroBanner />

            {tab === "home" ? (
              <>
                <motion.div
                  initial="hidden"
                  animate="show"
                  transition={{ staggerChildren: 0.06 }}
                  className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch"
                >
                  <CreditDonut used={used} remaining={remaining} total={total} />
                  <CreditUsage />
                </motion.div>

                <motion.div initial="hidden" animate="show" className="mt-5">
                  <RecentActivity items={activities} onView={handleViewActivity} />
                </motion.div>
              </>
            ) : tab === "upload" ? (
              <div className="mt-5">
                <UploadDocPanel
                  onOpenDocViewer={onOpenDocViewer}
                  onOpenResultModal={openResultWithFile}
                  toastShow={toastShow}
                  onActivity={pushActivity}
                />
              </div>
            ) : tab === "history" ? (
              <div className="mt-5">
                <HistorySection items={activities} highlightTarget={historyHighlightId} />
              </div>
            ) : tab === "buy" ? (
              <div className="mt-5">
                <BuyCreditSection />
              </div>
            ) : null}

          </div>
        </div>
      </div>

      {/* ResultView modal */}
      {resultModalOpen && (
        <div
          className={[
            "fixed inset-0 z-100",
            "transition-opacity duration-200 ease-out",
            animateIn ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />

          {!isFullscreen && (
            <button
              onClick={closeResultModal}
              aria-label="Close"
              title="Close"
              className="absolute top-3 right-3 z-110 rounded-full bg-white/90 p-2 md:p-2.5 text-gray-800 shadow hover:bg-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}

          <div
            className={[
              "fixed inset-0 z-105 flex items-center justify-center p-4 sm:p-6",
              "transform transition-all duration-200 ease-out",
              animateIn ? "opacity-100 scale-100" : "opacity-0 scale-95",
            ].join(" ")}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
            >
              <ResultView initialFile={initialFile ?? undefined} />
            </div>
          </div>
        </div>
      )}

      {/* Split Viewer */}
      {viewerOpen && (
        <div className="fixed inset-0 z-100">
          <div className="absolute inset-0 bg-black/40" onClick={closeViewer} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold text-slate-800 text-sm truncate pr-2">
                  {viewerDoc?.originalName ?? "Document"}
                </div>
                <button
                  onClick={closeViewer}
                  className="p-2 rounded-full hover:bg-slate-100"
                  aria-label="Close"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left: doc preview */}
                <div className="min-h-[70vh] bg-slate-50 p-3 overflow-hidden">
                  {viewerUrl ? (
                    viewerMime?.startsWith("image/") ? (
                      <img
                        src={viewerUrl}
                        alt={viewerDoc?.originalName || "Document"}
                        className="w-full h-[70vh] object-contain rounded-lg bg-white"
                      />
                    ) : viewerMime === "application/pdf" ? (
                      <iframe
                        src={viewerUrl}
                        title={viewerDoc?.originalName || "Document"}
                        className="w-full h-[70vh] rounded-lg bg-white"
                      />
                    ) : (
                      <div className="h-[70vh] grid place-items-center text-sm text-slate-500">
                        Preview not supported. Use Download.
                      </div>
                    )
                  ) : (
                    <div className="h-[70vh] grid place-items-center text-sm text-slate-500">
                      Loading preview…
                    </div>
                  )}
                </div>

                {/* Right: extracted data (scrollable) */}
                <div className="max-h-[70vh] p-4 overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sky-500 font-extrabold">
                      Extracted Data
                    </h3>
                    {viewerExtract ? (
                      <button
                        onClick={() => {
                          const blob = new Blob(
                            [JSON.stringify(viewerExtract, null, 2)],
                            { type: "application/json" }
                          );
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          const base =
                            viewerDoc?.originalName?.replace(/\.[^.]+$/, "") ||
                            "extracted";
                          a.download = `${base}-extracted.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-semibold"
                      >
                        Download JSON
                      </button>
                    ) : null}
                  </div>

                  {viewerLoading ? (
                    <div className="text-slate-500 text-sm">Loading…</div>
                  ) : viewerExtract ? (
                    <div className="flex flex-col gap-4">
                      {Object.entries(viewerExtract).map(([k, v]) => (
                        <div key={k} className="flex flex-col">
                          <label className="text-xs font-medium text-slate-600 mb-1">
                            {k}
                          </label>
                          <input
                            readOnly
                            value={String(v ?? "")}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm">
                      No extracted data available for this file.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
