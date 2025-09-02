// lib/credits.ts
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import * as XLSX from "xlsx";

export type CreditRow = {
  Account_ID: string;
  Email_ID: string;
  Total_Credits: number;
  Consumed_Credits: number;
  Remaining_Credits: number;
  Active: "Active" | "Inactive";
};

const FILE_DIR = path.resolve(process.cwd(), "data");
const FILE_PATH = path.join(FILE_DIR, "credits.xlsx");
const SHEET = "Credits";

// --- simple in-process mutex to avoid concurrent read/writes
let _lock: Promise<void> = Promise.resolve();
async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const prev = _lock;
  _lock = new Promise<void>(res => (release = res));
  await prev;
  try { return await fn(); } finally { release(); }
}

async function saveWorkbook(wb: XLSX.WorkBook) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  await fsp.writeFile(FILE_PATH, buf);
}

function newWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const headers = [
    "Account_ID",
    "Email_ID",
    "Total_Credits",
    "Consumed_Credits",
    "Remaining_Credits",
    "Active",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  XLSX.utils.book_append_sheet(wb, ws, SHEET);
  return wb;
}

async function ensureWorkbook(): Promise<XLSX.WorkBook> {
  await fsp.mkdir(FILE_DIR, { recursive: true });

  // create fresh if not exists
  if (!fs.existsSync(FILE_PATH)) {
    const wb = newWorkbook();
    await saveWorkbook(wb);
    return wb;
  }

  // read with Node buffer instead of XLSX.readFile (more robust on Windows)
  try {
    const buf = await fsp.readFile(FILE_PATH);
    return XLSX.read(buf, { type: "buffer" });
  } catch (err) {
    // If locked/corrupted, back it up and recreate
    try {
      const bak = FILE_PATH.replace(/\.xlsx$/, `-${Date.now()}.bak.xlsx`);
      await fsp.rename(FILE_PATH, bak);
    } catch {}
    const wb = newWorkbook();
    await saveWorkbook(wb);
    return wb;
  }
}

function readRows(wb: XLSX.WorkBook): CreditRow[] {
  const ws =
    wb.Sheets[SHEET] ||
    (() => {
      const nws = XLSX.utils.aoa_to_sheet([[
        "Account_ID","Email_ID","Total_Credits","Consumed_Credits","Remaining_Credits","Active"
      ]]);
      XLSX.utils.book_append_sheet(wb, nws, SHEET);
      return nws;
    })();

  const json = XLSX.utils.sheet_to_json<CreditRow>(ws, { defval: "" });
  return json.map((r) => ({
    Account_ID: String(r.Account_ID ?? ""),
    Email_ID: String(r.Email_ID ?? "").toLowerCase(),
    Total_Credits: Number(r.Total_Credits ?? 0),
    Consumed_Credits: Number(r.Consumed_Credits ?? 0),
    Remaining_Credits: Number(r.Remaining_Credits ?? 0),
    Active: (r.Active as any) === "Inactive" ? "Inactive" : "Active",
  }));
}

async function writeRows(wb: XLSX.WorkBook, rows: CreditRow[]) {
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Account_ID",
      "Email_ID",
      "Total_Credits",
      "Consumed_Credits",
      "Remaining_Credits",
      "Active",
    ],
  });
  wb.Sheets[SHEET] = ws;
  await saveWorkbook(wb);
}

export async function getStatus(email: string): Promise<CreditRow | null> {
  return runExclusive(async () => {
    const wb = await ensureWorkbook();
    const rows = readRows(wb);
    return rows.find((r) => r.Email_ID === email.toLowerCase()) || null;
  });
}

export async function register(email: string): Promise<CreditRow> {
  return runExclusive(async () => {
    const wb = await ensureWorkbook();
    const rows = readRows(wb);
    const lower = email.toLowerCase();
    const existing = rows.find((r) => r.Email_ID === lower);
    if (existing) return existing;

    const accountId = `ACC-${Date.now()}`;
    const total = 500;
    const row: CreditRow = {
      Account_ID: accountId,
      Email_ID: lower,
      Total_Credits: total,
      Consumed_Credits: 0,
      Remaining_Credits: total,
      Active: "Active",
    };
    rows.push(row);
    await writeRows(wb, rows);
    return row;
  });
}

export async function consume(email: string, amount: number): Promise<CreditRow> {
  return runExclusive(async () => {
    const wb = await ensureWorkbook();
    const rows = readRows(wb);
    const lower = email.toLowerCase();
    const idx = rows.findIndex((r) => r.Email_ID === lower);

    if (idx === -1) {
      throw Object.assign(new Error("Account not found"), { code: "NO_ACCOUNT" });
    }
    if (rows[idx].Active !== "Active") {
      throw Object.assign(new Error("Account inactive"), { code: "INACTIVE" });
    }
    if (rows[idx].Remaining_Credits < amount) {
      throw Object.assign(new Error("Insufficient credits"), { code: "INSUFFICIENT" });
    }

    rows[idx].Consumed_Credits += amount;
    rows[idx].Remaining_Credits = rows[idx].Total_Credits - rows[idx].Consumed_Credits;
    await writeRows(wb, rows);
    return rows[idx];
  });
}

export async function addPaidCredits(email: string, add: number): Promise<CreditRow> {
  return runExclusive(async () => {
    const wb = await ensureWorkbook();
    const rows = readRows(wb);
    const lower = email.toLowerCase();
    const idx = rows.findIndex((r) => r.Email_ID === lower);
    if (idx === -1) throw Object.assign(new Error("Account not found"), { code: "NO_ACCOUNT" });

    rows[idx].Total_Credits += add;
    rows[idx].Remaining_Credits = rows[idx].Total_Credits - rows[idx].Consumed_Credits;
    await writeRows(wb, rows);
    return rows[idx];
  });
}
