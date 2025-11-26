import React, { useMemo, useRef, useState } from "react";

/**
 * Drop‑in React + Tailwind TSX for:
 * Section 1 — “Submit & Validate” (Redesigned)
 *
 * Design adjustments per request:
 *  - Uses Inter, Inter Fallback fonts (inline style on root).
 *  - Branded icons (#008CCD) for section title and drawer header.
 *  - Modern modular UI atoms: Button, Chip, ToggleSwitch.
 *  - Pointer cursor for all clickable elements.
 *  - Drawer width increased for easier table viewing.
 *  - Drawer shows mock Indexability Pre‑check data (toggle on by default).
 *  - Favicons displayed for domains (projects/domain).
 *  - No emoji.
 *
 * Functional constraints preserved:
 *  - Endpoints (replace to match your backend):
 *      • POST /api/urls/check-duplicates
 *      • POST /api/urls/enqueue
 *      • POST /api/urls/dryrun
 *  - Client-side validation/normalization identical to prior behavior.
 */

export type SubmitPayload = {
  urls: string[];
  source?: "paste" | "file";
  fileMeta?: { name: string; size: number; columns?: string[] };
  priority?: "low" | "normal" | "high";
};

export type ValidationResult = {
  valid: string[];
  duplicates: string[];
  invalid: Array<{
    input: string;
    reason:
      | "not_url"
      | "unsupported_scheme"
      | "blacklisted"
      | "too_long"
      | "parse_error";
  }>;
};

export type DryRunRequest = { urls: string[] };
export type DryRunRow = {
  url: string;
  status?: number;
  robots?: "allow" | "disallow" | "unknown";
  metaRobots?: "index" | "noindex" | "unknown";
  canonical?: { present: boolean; samePage: boolean; target?: string };
  error?: "timeout" | "dns" | "ssl" | "network";
};
export type DryRunResult = Array<DryRunRow>;

export type DuplicateCheckRequest = { urls: string[] };
export type DuplicateCheckResponse = { alreadyQueued: string[] };

const BRAND = "#008CCD";
const MAX_LINES = 5000;
const MAX_FILE_MB = 10;
const MAX_URL_LENGTH = 2048;
const LONG_PATH_THRESHOLD = 512;

const i18n = {
  submitValidate: {
    title: "Submit & Validate",
    purpose:
      "Capture URLs via paste or CSV/TXT upload; client‑side normalization, de‑dupe & validation before enqueue. Optional Dry‑run checks a sample for indexability.",
    textareaLabel: "URLs",
    textareaPlaceholder: "Paste URLs (one per line)…",
    formattingHelp: "Formatting help",
    or: "OR",
    dropHere: "Drop .csv or .txt here",
    browse: "Browse",
    dryRun: "Indexability Pre‑check",
    enqueue: "Enqueue",
    valid: "Valid",
    dupes: "Duplicates",
    invalid: "Invalid",
    softWarnings: "Soft warnings",
    showAll: "Show all",
    showLess: "Show less",
    invalidReasonsTitle: "Invalid breakdown",
    tooManyLines: "Too many lines (max 5,000 after normalization).",
    toastUnsupportedType: "Unsupported file type; upload .csv or .txt",
    toastTooLarge: "Upload .csv or .txt up to 10 MB.",
    toastNoEncoding: "Couldn't detect encoding",
    toastNoUrlColumn: "No URL column found",
    toastMalformedCsv: (n: number) => `Couldn't parse CSV (line ${n}).`,
    toastDuplicateCheckWarn:
      "Duplicate check failed — continuing with in‑batch results.",
    toastEnqueueOk: (n: number) => `Enqueued ${n} URL${n === 1 ? "" : "s"}.`,
    toastEnqueueErr: "Enqueue failed",
    legendValid: "Valid http/https and not blacklisted",
    legendDupes: "In‑batch or already queued",
    legendInvalid: "Unsupported/Not a URL/Blacklisted/Too long",
    infoTooltip:
      "Paste or upload URLs. We normalize, de‑dupe, and validate locally. “Valid” = unique http/https URLs not blacklisted. “Duplicates” = repeats in your batch or already queued. “Invalid” = not a URL, unsupported scheme, blacklisted, or too long.",
    btnPriority: "Priority",
    modalServerUpdatedTitle: "Server updated your counts",
    modalServerUpdatedBody:
      "The server found additional duplicates/invalids. We will enqueue the remaining Valid unless you cancel.",
    proceed: "Proceed",
    cancel: "Cancel",
    downloadCsv: "Download CSV",
    dryrunTitle: "Indexability Pre‑check (sample)",
    dryrunExport: "Export CSV",
    dryrunBuckets: "Result buckets",
    dryrunTopFailing: "Top failing hosts",
    statusIndexable: "Indexable (OK)",
    statusRobotsBlocked: "Blocked by robots",
    statusNoindex: "Noindex",
    status4xx: "4xx",
    status5xx: "5xx/Timeouts",
    statusRedirects: "Redirect chains > 2",
    useMockData: "Mock data",
  },
};

/* ========================= Small helpers & telemetry ========================= */

function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay = 400) {
  const t = useRef<number | undefined>(undefined);
  return (...args: Parameters<T>) => {
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => fn(...args), delay);
  };
}

function logEvent(name: string, props?: Record<string, any>) {
  // eslint-disable-next-line no-console
  console.debug("[telemetry]", name, props || {});
}

function isCsvOrTxt(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "";
  return ext === "csv" || ext === "txt";
}

type SoftWarnKey =
  | "has_fragment"
  | "suspicious_scheme_seen"
  | "very_long_path"
  | "tracking_params";
type SoftWarnings = Partial<Record<SoftWarnKey, number>>;

function stripQuotes(s: string) {
  const q = s.trim();
  if (
    (q.startsWith('"') && q.endsWith('"')) ||
    (q.startsWith("'") && q.endsWith("'"))
  ) {
    return q.slice(1, -1);
  }
  return q;
}

function normalizeRawLine(s: string): { url?: string|any; warn?: SoftWarnKey[] } {
  const t = stripQuotes(s.trim()).replace(/\s+/g, " ");
  if (!t) return {};
  let candidate = t;
  if (/^\/\//.test(candidate)) candidate = "https:" + candidate;
  if (/^[\w.-]+\.[\w.-]+(\/|$)/.test(candidate) && !/^[a-z]+:\/\//i.test(candidate)) {
    candidate = "https://" + candidate;
  }
  const warns: SoftWarnKey[] = [];
  try {
    const u = new URL(candidate);

    if (u.hash) {
      u.hash = "";
      warns.push("has_fragment");
    }

    u.hostname = u.hostname.replace(/\.$/, "").toLowerCase();

    if (u.port === "80" && u.protocol === "http:") u.port = "";
    if (u.port === "443" && u.protocol === "https:") u.port = "";

    const qp = new URLSearchParams(u.search);
    for (const k of qp.keys()) {
      if (/^(utm_|gclid|fbclid|mc_[a-z]|igshid)/i.test(k)) {
        if (!warns.includes("tracking_params")) warns.push("tracking_params");
        break;
      }
    }

    const normalized = u.toString();
    if (normalized.length > MAX_URL_LENGTH) return {};
    if (u.pathname && u.pathname.length > LONG_PATH_THRESHOLD)
      warns.push("very_long_path");

    return { url: normalized, warn: warns.length ? warns : undefined };
  } catch {
    return {};
  }
}

function validateBatch(
  batch: string[],
  blacklist: RegExp[]
): ValidationResult & { warnings: SoftWarnings } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const duplicates: string[] = [];
  const invalid: Array<{
    input: string;
    reason: ValidationResult["invalid"][number]["reason"];
  }> = [];
  const warnings: SoftWarnings = {};

  for (const raw of batch) {
    const norm = normalizeRawLine(raw);
    if (!norm.url) {
      if (/^(mailto|javascript|ftp|data):/i.test(raw)) {
        invalid.push({ input: raw, reason: "unsupported_scheme" });
        if (/^(mailto|javascript)/i.test(raw)) {
          warnings["suspicious_scheme_seen"] =
            (warnings["suspicious_scheme_seen"] || 0) + 1;
        }
      } else if (raw.length > MAX_URL_LENGTH) {
        invalid.push({ input: raw, reason: "too_long" });
      } else {
        invalid.push({ input: raw, reason: "not_url" });
      }
      continue;
    }

    const scheme = new URL(norm.url).protocol.replace(":", "");
    if (!/^https?$/.test(scheme)) {
      invalid.push({ input: norm.url, reason: "unsupported_scheme" });
      warnings["suspicious_scheme_seen"] =
        (warnings["suspicious_scheme_seen"] || 0) + 1;
      continue;
    }

    norm.warn?.forEach((w) => {
      warnings[w] = (warnings[w] || 0) + 1;
    });

    if (blacklist.some((rx) => rx.test(norm.url))) {
      invalid.push({ input: norm.url, reason: "blacklisted" });
      continue;
    }

    if (seen.has(norm.url)) {
      duplicates.push(norm.url);
      continue;
    }
    seen.add(norm.url);
    valid.push(norm.url);
  }

  return { valid, duplicates, invalid, warnings };
}

/* ========================= File parsing helpers ========================= */

type ParsedFile = {
  rows: string[];
  columns?: string[];
  sourceColumn?: string;
  priority?: "low" | "normal" | "high";
  parseErrorLine?: number;
  fileMeta?: { name: string; size: number; columns?: string[] };
};

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("read_error"));
    fr.onload = () => res(fr.result as ArrayBuffer);
    fr.readAsArrayBuffer(file);
  });
}
function detectEncoding(buf: Uint8Array): { label: "utf-8" | "utf-16le" | "utf-16be" } | null {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return { label: "utf-8" };
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return { label: "utf-16le" };
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return { label: "utf-16be" };

  const sample = buf.slice(0, Math.min(buf.length, 4096));
  const nulls = sample.filter((b) => b === 0x00).length;
  if (sample.length > 0 && nulls / sample.length > 0.1) return { label: "utf-16le" };
  return { label: "utf-8" };
}
function decodeBuffer(buf: ArrayBuffer, enc: "utf-8" | "utf-16le" | "utf-16be"): string {
  const dec = new TextDecoder(enc);
  return dec.decode(buf);
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const head = text.split(/\r?\n/).slice(0, 5).join("\n");
  const count = (c: string) => (head.match(new RegExp(`\\${c}`, "g")) || []).length;
  const commas = count(",");
  const semis = count(";");
  const tabs = count("\t");
  const max = Math.max(commas, semis, tabs);
  if (max === 0) return ",";
  if (max === semis) return ";";
  if (max === tabs) return "\t";
  return ",";
}

function csvSplitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (!inQ && ch === delimiter) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

const URL_HEADER_CANDIDATES = ["url", "link", "target", "address", "href", "destination"];
const SOURCE_HEADER_CANDIDATES = ["source", "campaign", "list", "tag"];
const PRIORITY_HEADER_CANDIDATES = ["priority", "prio", "urgency"];

function looksLikeUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^([a-z]+:)?\/\//i.test(t) || /^[\w-]+\.[\w.-]+(\/|$)/i.test(t);
}

function detectColumns(headers: string[], rows: string[][]) {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^\w]+/g, "").trim());

  let urlIdx = norm.findIndex((h) => URL_HEADER_CANDIDATES.includes(h));
  if (urlIdx === -1) {
    const threshold = 0.8;
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < headers.length; i++) {
      const col = rows.map((r) => r[i] ?? "");
      const nonEmpty = col.filter((v) => v.trim()).length || 1;
      const urlish = col.filter((v) => looksLikeUrl(v)).length;
      const score = urlish / nonEmpty;
      if (score >= threshold && score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    urlIdx = bestIdx;
  }

  const sourceIdx = norm.findIndex((h) => SOURCE_HEADER_CANDIDATES.includes(h));
  const prioIdx = norm.findIndex((h) => PRIORITY_HEADER_CANDIDATES.includes(h));

  return { urlIdx, sourceIdx, prioIdx };
}

function mapPriority(v: string | number | undefined): "low" | "normal" | "high" | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === "3") return "high";
  if (s === "2") return "normal";
  if (s === "1") return "low";
  if (/(high)/.test(s)) return "high";
  if (/(normal|med|medium)/.test(s)) return "normal";
  if (/(low)/.test(s)) return "low";
  return undefined;
}

async function parseCsvOrTxt(file: File): Promise<ParsedFile> {
  const buf = await readFileAsArrayBuffer(file);
  const enc = detectEncoding(new Uint8Array(buf));
  if (!enc) throw new Error("no_encoding");

  const text = decodeBuffer(buf, enc.label);
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  if (!isCsv) {
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const rows = lines.filter((l) => l && !l.startsWith("#"));
    return {
      rows,
      fileMeta: { name: file.name, size: file.size },
    };
  }

  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { rows: [], fileMeta: { name: file.name, size: file.size } };

  const headerLine = lines[0] ?? "";
  const headers = csvSplitLine(headerLine, delimiter);
  const dataRows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;
    try {
      const cols = csvSplitLine(raw, delimiter);
      while (cols.length < headers.length) cols.push("");
      dataRows.push(cols);
    } catch {
      return { rows: [], parseErrorLine: i + 1, fileMeta: { name: file.name, size: file.size } };
    }
  }

  const { urlIdx, sourceIdx, prioIdx } = detectColumns(headers, dataRows);
  if (urlIdx === -1) {
    const err: ParsedFile = {
      rows: [],
      fileMeta: { name: file.name, size: file.size, columns: headers },
    };
    (err as any).__noUrlColumn = true;
    return err;
  }

  const rows: string[] = [];
  let priority: "low" | "normal" | "high" | undefined = undefined;

  for (const row of dataRows) {
    const urlCell = row[urlIdx] ?? "";
    if (!urlCell?.trim()) continue;
    rows.push(urlCell);

    if (priority === undefined && prioIdx !== -1) {
      priority = mapPriority(row[prioIdx]);
    }
  }

  return {
    rows,
    columns: headers,
    priority,
    sourceColumn: sourceIdx !== -1 ? SOURCE_HEADER_CANDIDATES[0] : undefined,
    fileMeta: { name: file.name, size: file.size, columns: headers },
  };
}

/* ========================= CSV export ========================= */

function toCsv(filename: string, rows: Array<Record<string, any>>) {
  const headers = Array.from(
   rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  const esc = (s: any) => {
    const v = s == null ? "" : String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const lines = [headers.join(",")].concat(
    rows.map((r) => headers.map((h) => esc(r[h])).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ========================= Toasts ========================= */

type Toast = {
  id: number;
  kind: "info" | "warn" | "error" | "success";
  msg: string;
  sticky?: boolean;
  action?: { label: string; onClick: () => void };
};
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Math.random();
    const toast = { ...t, id };
    setToasts((prev) => [...prev, toast]);
    if (!t.sticky) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 4000);
    }
  };
  const remove = (id: number) =>
    setToasts((prev) => prev.filter((x) => x.id !== id));
  return { toasts, push, remove };
}

/* ========================= MOCK DATA for Drawer ========================= */

const MOCK_DRYRUN: DryRunResult = [
  {
    url: "https://example.com/",
    status: 200,
    robots: "allow",
    metaRobots: "index",
    canonical: { present: true, samePage: true },
  },
  {
    url: "https://example.com/about",
    status: 200,
    robots: "allow",
    metaRobots: "index",
    canonical: { present: true, samePage: true },
  },
  {
    url: "https://blocked.example.org/account",
    status: 200,
    robots: "disallow",
    metaRobots: "unknown",
    canonical: { present: false, samePage: false, target: "" },
  },
  {
    url: "https://noindex.site/blog/how-to-use",
    status: 200,
    robots: "allow",
    metaRobots: "noindex",
    canonical: { present: false, samePage: false, target: "" },
  },
  {
    url: "https://oops.demo.dev/missing",
    status: 404,
    robots: "allow",
    metaRobots: "unknown",
    canonical: { present: false, samePage: false, target: "" },
  },
  {
    url: "https://timeout.demo.dev/slow-page",
    status: 504,
    robots: "allow",
    metaRobots: "unknown",
    canonical: { present: false, samePage: false, target: "" },
    error: "timeout",
  },
  {
    url: "https://redirects.demo.dev/a",
    status: 301,
    robots: "allow",
    metaRobots: "unknown",
    canonical: { present: true, samePage: false, target: "https://redirects.demo.dev/b" },
  },
  {
    url: "https://cdn.assets.test/lib.js",
    status: 200,
    robots: "disallow",
    metaRobots: "unknown",
    canonical: { present: false, samePage: false, target: "" },
  },
  {
    url: "https://shop.example.com/product/123?utm_source=test",
    status: 200,
    robots: "allow",
    metaRobots: "index",
    canonical: { present: true, samePage: true },
  },
  {
    url: "https://api.example.com/health",
    status: 200,
    robots: "disallow",
    metaRobots: "unknown",
    canonical: { present: false, samePage: false },
  },
];

/* ========================= Main Component ========================= */

type Props = {
  blacklist?: RegExp[];
  defaultPriority?: "low" | "normal" | "high";
};

export default function SubmitAndValidateSection({
  blacklist = [],
  defaultPriority = "normal",
}: Props) {
  const nf = useMemo(() => new Intl.NumberFormat(), []);
  const { toasts, push, remove } = useToasts();

  const [rawInput, setRawInput] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [fileMeta, setFileMeta] = useState<SubmitPayload["fileMeta"]>();
  const [priority, setPriority] = useState<"low" | "normal" | "high">(
    defaultPriority
  );

  const [parsing, setParsing] = useState<
    "idle" | "parsing" | "validated" | "dryrun_running" | "enqueue_running"
  >("idle");

  const [result, setResult] = useState<
    ValidationResult & { warnings: SoftWarnings }
  >({
    valid: [],
    duplicates: [],
    invalid: [],
    warnings: {},
  });

  const [serverDupesAdded, setServerDupesAdded] = useState<string[]>([]);
  const [tooManyLines, setTooManyLines] = useState(false);

  const [showAllInvalid, setShowAllInvalid] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedValidate = useDebouncedCallback(async (text: string) => {
    await runValidateFromLines(text.split(/\r?\n/));
  }, 400);

  async function runValidateFromLines(
    lines: string[],
    meta?: SubmitPayload["fileMeta"]
  ) {
    setParsing("parsing");
    setTooManyLines(false);
    setServerDupesAdded([]);

    const nonEmpty = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    const normalizedCandidates: string[] = [];
    for (const l of nonEmpty) {
      const n = normalizeRawLine(l);
      if (n.url) normalizedCandidates.push(n.url);
      else normalizedCandidates.push(l);
      if (normalizedCandidates.length > MAX_LINES) break;
    }

    if (normalizedCandidates.length > MAX_LINES) {
      setTooManyLines(true);
      setParsing("validated");
      setResult({ valid: [], duplicates: [], invalid: [], warnings: {} });
      push({ kind: "warn", msg: i18n.submitValidate.tooManyLines });
      return;
    }

    const v = validateBatch(nonEmpty, blacklist);

    try {
      if (v.valid.length) {
        const r = await fetch("/api/urls/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: v.valid } as DuplicateCheckRequest),
        });
        if (r.ok) {
          const data = (await r.json()) as DuplicateCheckResponse;
          const already = new Set(data.alreadyQueued || []);
          const newValid: string[] = [];
          const extraDupes: string[] = [];
          for (const url of v.valid) {
            if (already.has(url)) extraDupes.push(url);
            else newValid.push(url);
          }
          if (extraDupes.length) setServerDupesAdded(extraDupes);
          setResult({
            valid: newValid,
            duplicates: [...v.duplicates, ...extraDupes],
            invalid: v.invalid,
            warnings: v.warnings,
          });
        } else {
          setResult(v);
          push({ kind: "warn", msg: i18n.submitValidate.toastDuplicateCheckWarn });
        }
      } else {
        setResult(v);
      }
    } catch {
      setResult(v);
      push({ kind: "warn", msg: i18n.submitValidate.toastDuplicateCheckWarn });
    }

    setParsing("validated");
  }

  function onTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setInputMode("paste");
    setRawInput(v);
    debouncedValidate(v);
  }

  async function onFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!isCsvOrTxt(f.name)) {
      push({ kind: "error", msg: i18n.submitValidate.toastUnsupportedType });
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      push({ kind: "error", msg: i18n.submitValidate.toastTooLarge });
      return;
    }

    setInputMode("file");
    logEvent("submit_validate.file_select", {
      name: f.name,
      size: f.size,
      ext: f.name.split(".").pop(),
    });

    try {
      const parsed = await parseCsvOrTxt(f);
      setFileMeta(parsed.fileMeta);
      if ((parsed as any).__noUrlColumn) {
        push({ kind: "error", msg: i18n.submitValidate.toastNoUrlColumn });
        return;
      }
      if (parsed.parseErrorLine) {
        push({
          kind: "error",
          msg: i18n.submitValidate.toastMalformedCsv(parsed.parseErrorLine),
        });
        return;
      }
      setRawInput(parsed.rows.join("\n"));
      await runValidateFromLines(parsed.rows, parsed.fileMeta);
      if (parsed.priority) setPriority(parsed.priority);
    } catch (e: any) {
      if (e?.message === "no_encoding")
        push({ kind: "error", msg: i18n.submitValidate.toastNoEncoding });
      else push({ kind: "error", msg: i18n.submitValidate.toastMalformedCsv(0) });
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt?.files && dt.files.length > 0) {
      onFilesChosen(dt.files);
      dt.clearData();
    }
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  const canEnqueue =
    parsing !== "enqueue_running" &&
    parsing !== "parsing" &&
    !tooManyLines &&
    result.valid.length > 0;

  async function onEnqueue() {
    if (!canEnqueue) return;
    setParsing("enqueue_running");

    const payload: SubmitPayload = {
      urls: result.valid,
      source: inputMode,
      fileMeta,
      priority,
    };

    logEvent("submit_validate.enqueue_click", { valid: result.valid.length });
    try {
      const res = await fetch("/api/urls/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.updated && (data.updated.valid || []).length !== result.valid.length) {
          setParsing("validated");
          setServerModal({
            open: true,
            updated: data.updated as ValidationResult,
            proceed: async () => {
              setServerModal((m) => ({ ...m, open: false }));
              await finalizeEnqueue(data);
            },
          });
        } else {
          await finalizeEnqueue(data);
        }
      } else {
        const text = await res.text();
        push({
          kind: "error",
          msg: i18n.submitValidate.toastEnqueueErr,
          sticky: true,
          action: {
            label: i18n.submitValidate.downloadCsv,
            onClick: () =>
              toCsv(
                "enqueue_failed.csv",
                result.valid.map((u) => ({ url: u }))
              ),
          },
        });
        setParsing("validated");
        logEvent("submit_validate.enqueue_error", { error: text });
      }
    } catch (err: any) {
      push({
        kind: "error",
        msg: i18n.submitValidate.toastEnqueueErr,
        sticky: true,
        action: {
          label: i18n.submitValidate.downloadCsv,
          onClick: () =>
            toCsv(
              "enqueue_failed.csv",
              result.valid.map((u) => ({ url: u }))
            ),
        },
      });
      setParsing("validated");
      logEvent("submit_validate.enqueue_error", { error: String(err) });
    }
  }

  async function finalizeEnqueue(data: any) {
    const n = Number(data?.enqueued ?? result.valid.length);
    push({ kind: "success", msg: i18n.submitValidate.toastEnqueueOk(n) });
    logEvent("submit_validate.enqueue_done", { enqueued: n });
    if (inputMode === "paste") {
      setRawInput("");
      setResult({ valid: [], duplicates: [], invalid: [], warnings: {} });
      setTooManyLines(false);
    }
    setParsing("idle");
  }

  // Dry‑run (drawer)
  const validForDryRun =
    parsing !== "dryrun_running" && parsing !== "parsing";
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [dryRunData, setDryRunData] = useState<DryRunResult>([]);
  const [useMockData, setUseMockData] = useState(true); // default ON per request
  const [dryRunSummary, setDryRunSummary] = useState<Record<string, number>>({});

  async function onDryRun() {
    // Always open the drawer; show mock data if no real data or toggle is ON
    setDryRunOpen(true);
    if (!result.valid.length) {
      computeDryRunSummaries(MOCK_DRYRUN);
      return;
    }
    if (!validForDryRun) return;

    setParsing("dryrun_running");

    // simple 200 sample: first 200 unique hosts (≤10 per host)
    const byHost = new Map<string, string[]>();
    for (const u of result.valid) {
      try {
        const h = new URL(u).host;
        if (!byHost.has(h)) byHost.set(h, []);
        const list = byHost.get(h)!;
        if (list.length < 10) list.push(u);
      } catch {
        continue;
      }
    }
    const sample: string[] = Array.from(byHost.values())
      .flat()
      .slice(0, 200);

    try {
      const res = await fetch("/api/urls/dryrun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: sample } as DryRunRequest),
      });
      const data = (await res.json()) as DryRunResult;
      setDryRunData(data);
      computeDryRunSummaries(data);
      setParsing("validated");
    } catch {
      setParsing("validated");
      // If fetch fails, mock still visible thanks to default toggle.
    }
  }

  function computeDryRunSummaries(data: DryRunResult) {
    const buckets = {
      [i18n.submitValidate.statusIndexable]: 0,
      [i18n.submitValidate.statusRobotsBlocked]: 0,
      [i18n.submitValidate.statusNoindex]: 0,
      [i18n.submitValidate.status4xx]: 0,
      [i18n.submitValidate.status5xx]: 0,
      [i18n.submitValidate.statusRedirects]: 0,
    } as Record<string, number>;

    for (const r of data) {
      const status = r.status ?? 0;
      const isIndexable =
        status >= 200 &&
        status < 300 &&
        r.robots !== "disallow" &&
        r.metaRobots !== "noindex";
      if (isIndexable) {
        buckets[i18n.submitValidate.statusIndexable]++;
      } else {
        if (r.robots === "disallow")
          buckets[i18n.submitValidate.statusRobotsBlocked]++;
        else if (r.metaRobots === "noindex")
          buckets[i18n.submitValidate.statusNoindex]++;
        else if (status >= 400 && status < 500)
          buckets[i18n.submitValidate.status4xx]++;
        else if (status >= 500 || r.error)
          buckets[i18n.submitValidate.status5xx]++;
        else if (status >= 300 && status < 400)
          buckets[i18n.submitValidate.statusRedirects]++;
      }
    }
    setDryRunSummary(buckets);
  }

  const reasonOrder: ValidationResult["invalid"][number]["reason"][] = [
    "not_url",
    "unsupported_scheme",
    "blacklisted",
    "too_long",
    "parse_error",
  ];
  const invalidByReason = useMemo(() => {
    const map = new Map<typeof reasonOrder[number], string[]>();
    for (const r of reasonOrder) map.set(r, []);
    for (const item of result.invalid) {
      const arr = map.get(item.reason) || [];
      arr.push(item.input);
      map.set(item.reason, arr);
    }
    return map;
  }, [result.invalid]);

  const invalidTop = useMemo(() => {
    const pairs = reasonOrder
      .map((r) => ({ r, count: invalidByReason.get(r)?.length || 0 }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count);
    const top3 = pairs.slice(0, 3);
    const rest = pairs.slice(3);
    return { top3, rest };
  }, [invalidByReason]);

  const brandFocus =
    "focus:outline-none focus:ring-2 focus:ring-[#008CCD]/20 focus:ring-offset-2";

  const [serverModal, setServerModal] = useState<{
    open: boolean;
    updated?: ValidationResult;
    proceed?: () => Promise<void>;
  }>({ open: false });

  return (
    <div
      className="w-full flex justify-center mt-2 px-2"
      style={{
        fontFamily:
          'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      }}
    >
      <div className="w-full bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-2">
              <BrandMark className="h-5 w-5" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {i18n.submitValidate.title}
              </h2>
              <button
                type="button"
                className={`p-1 rounded ${brandFocus} cursor-pointer`}
                aria-label="Info"
                title={i18n.submitValidate.infoTooltip}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill={BRAND}
                  aria-hidden="true"
                >
                  <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-11.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0ZM9 9.75a.75.75 0 0 1 1.5 0V14a.75.75 0 0 1-1.5 0V9.75Z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Priority as modular Chips */}
              <div className="hidden sm:flex items-center gap-1" aria-label={i18n.submitValidate.btnPriority}>
                <Chip
                  label="Low"
                  selected={priority === "low"}
                  onClick={() => setPriority("low")}
                  variant="neutral"
                />
                <Chip
                  label="Normal"
                  selected={priority === "normal"}
                  onClick={() => setPriority("normal")}
                  variant="brand"
                />
                <Chip
                  label="High"
                  selected={priority === "high"}
                  onClick={() => setPriority("high")}
                  variant="danger"
                />
              </div>

              <Button
                variant="secondary"
                onClick={onDryRun}
                disabled={!validForDryRun && !result.valid.length}
                leadingIcon={<IconMagnifier />}
                title={i18n.submitValidate.dryRun}
              >
                {i18n.submitValidate.dryRun}
              </Button>

              <Button
                variant="primary"
                onClick={onEnqueue}
                disabled={!canEnqueue}
                leadingIcon={
                  parsing === "enqueue_running" ? <Spinner invert /> : <IconSend />
                }
                aria-disabled={!canEnqueue}
                title={i18n.submitValidate.enqueue}
              >
                {i18n.submitValidate.enqueue}
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor="urls"
                className="block text-sm font-medium text-gray-700"
              >
                {i18n.submitValidate.textareaLabel}
              </label>
              <textarea
                id="urls"
                value={rawInput}
                onChange={onTextareaChange}
                rows={Math.min(8, Math.max(4, rawInput.split(/\n/).length))}
                className={`mt-1 block w-full resize-y max-h-48 rounded-md border-gray-300 shadow-sm ${brandFocus}`}
                placeholder={i18n.submitValidate.textareaPlaceholder}
                aria-describedby="urls-help validation-counts"
              />
              <p id="urls-help" className="mt-1 text-xs text-gray-500">
                {i18n.submitValidate.purpose}
              </p>
            </div>

            <div className="flex items-center justify-center">
              <span className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                {i18n.submitValidate.or}
              </span>
            </div>

            {/* Dropzone */}
            <div className="flex-1">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("bg-[#008CCD]/5");
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-[#008CCD]/5");
                }}
                onDrop={(e) => {
                  e.currentTarget.classList.remove("bg-[#008CCD]/5");
                  handleDrop(e);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && handleBrowseClick()
                }
                className={`mt-6 sm:mt-7 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-8 text-center ${brandFocus} cursor-pointer`}
                aria-label="File upload dropzone"
                title="Upload CSV/TXT"
              >
                <p className="text-sm text-gray-600">
                  {i18n.submitValidate.dropHere}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={handleBrowseClick} leadingIcon={<IconUpload />}>
                    {i18n.submitValidate.browse}
                  </Button>
                  {fileMeta && (
                    <span className="text-xs text-gray-500">
                      {fileMeta.name} — {nf.format(fileMeta.size)} bytes
                    </span>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => onFilesChosen(e.target.files)}
                />
              </div>
            </div>
          </div>

          {/* Validation summary */}
          <div className="mt-6 space-y-3">
            <div
              id="validation-counts"
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center gap-2"
            >
              <CountBadge tone="success" label={i18n.submitValidate.valid} value={nf.format(result.valid.length)} />
              <CountBadge tone="warn" label={i18n.submitValidate.dupes} value={nf.format(result.duplicates.length)} />
              <CountBadge tone="danger" label={i18n.submitValidate.invalid} value={nf.format(result.invalid.length)} />
            </div>

            {/* Soft warnings as modular chips */}
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(result.warnings).map(([k, v]) => (
                <Chip
                  key={k}
                  label={`${k.replace(/_/g, " ")} — ${nf.format(v || 0)}`}
                  title={k}
                  variant="neutral"
                />
              ))}
            </div>

            {!!result.invalid.length && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-800">
                  {i18n.submitValidate.invalidReasonsTitle}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {invalidTop.top3.map((p) => (
                    <Chip
                      key={p.r}
                      label={`${labelForReason(p.r)} — ${nf.format(p.count)}`}
                      title={p.r}
                      variant="danger"
                    />
                  ))}
                </div>
                {invalidTop.rest.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllInvalid((s) => !s)}
                    className={`mt-2 text-sm font-medium text-[#008CCD] hover:underline ${brandFocus} cursor-pointer`}
                    aria-expanded={showAllInvalid}
                    aria-controls="invalid-details"
                  >
                    {showAllInvalid ? i18n.submitValidate.showLess : i18n.submitValidate.showAll}
                  </button>
                )}
                {showAllInvalid && (
                  <div
                    id="invalid-details"
                    className="mt-2 max-h-40 overflow-y-auto rounded border border-gray-200 p-2"
                  >
                    {reasonOrder.map((r) => {
                      const items = invalidByReason.get(r) || [];
                      if (!items.length) return null;
                      return (
                        <div key={r} className="mb-2">
                          <p className="text-xs font-semibold text-gray-700">
                            {labelForReason(r)} — {nf.format(items.length)}
                          </p>
                          <ul className="mt-1 list-disc pl-5 space-y-0.5">
                            {items.slice(0, 50).map((s, i) => (
                              <li
                                key={i}
                                className="text-[11px] text-gray-600 break-all"
                              >
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Legend + help */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />{" "}
                  {i18n.submitValidate.legendValid}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />{" "}
                  {i18n.submitValidate.legendDupes}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />{" "}
                  {i18n.submitValidate.legendInvalid}
                </span>
              </div>
              <a
                href="#"
                className={`text-xs font-medium text-[#008CCD] hover:underline self-start ${brandFocus} cursor-pointer`}
              >
                {i18n.submitValidate.formattingHelp}
              </a>
            </div>

            {serverDupesAdded.length > 0 && (
              <div className="mt-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 px-3 py-2 text-xs">
                Server flagged {nf.format(serverDupesAdded.length)} additional duplicate
                {serverDupesAdded.length === 1 ? "" : "s"} already in backlog.
              </div>
            )}

            {tooManyLines && (
              <div className="mt-2 rounded-md bg-red-50 text-red-800 border border-red-200 px-3 py-2 text-xs">
                {i18n.submitValidate.tooManyLines}
              </div>
            )}
          </div>
        </div>

        {/* Toasts */}
        {toasts.length > 0 && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`max-w-sm rounded-md border px-3 py-2 text-sm shadow-sm bg-white ${
                  t.kind === "error"
                    ? "border-red-300 text-red-800"
                    : t.kind === "warn"
                    ? "border-amber-300 text-amber-800"
                    : t.kind === "success"
                    ? "border-green-300 text-green-800"
                    : "border-gray-300 text-gray-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{t.msg}</span>
                  <div className="flex items-center gap-2">
                    {t.action && (
                      <button
                        onClick={t.action.onClick}
                        className={`text-xs font-semibold text-[#008CCD] hover:underline ${brandFocus} cursor-pointer`}
                      >
                        {t.action.label}
                      </button>
                    )}
                    <button
                      onClick={() => remove(t.id)}
                      aria-label="Dismiss"
                      className={`rounded p-1 text-gray-500 hover:bg-gray-50 ${brandFocus} cursor-pointer`}
                    >
                      <IconClose />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Server updated modal */}
        {serverModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
              <div className="border-b px-4 py-3 flex items-center gap-2">
                <BrandMark className="h-4 w-4" />
                <h3 className="font-semibold text-gray-900">
                  {i18n.submitValidate.modalServerUpdatedTitle}
                </h3>
              </div>
              <div className="px-4 py-3 text-sm text-gray-700">
                <p>{i18n.submitValidate.modalServerUpdatedBody}</p>
                {serverModal.updated && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <CountBadge tone="success" label={i18n.submitValidate.valid} value={serverModal.updated.valid.length} />
                    <CountBadge tone="warn" label={i18n.submitValidate.dupes} value={serverModal.updated.duplicates.length} />
                    <CountBadge tone="danger" label={i18n.submitValidate.invalid} value={serverModal.updated.invalid.length} />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t px-4 py-3">
                <Button variant="secondary" onClick={() => setServerModal({ open: false })}>
                  {i18n.submitValidate.cancel}
                </Button>
                <Button variant="primary" onClick={() => serverModal.proceed?.()}>
                  {i18n.submitValidate.proceed}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dry‑run drawer (wider, with favicon + mock toggle) */}
        {dryRunOpen && (
          <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[720px] md:w-[900px] 2xl:w-[1100px] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <BrandMark className="h-5 w-5" />
                <h3 className="font-semibold text-gray-900">
                  {i18n.submitValidate.dryrunTitle}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={useMockData}
                  onChange={setUseMockData}
                  label={i18n.submitValidate.useMockData}
                />
                <Button
                  variant="secondary"
                  onClick={() =>
                    toCsv(
                      "dryrun.csv",
                      (useMockData || !dryRunData.length ? MOCK_DRYRUN : dryRunData).map(
                        (r) => ({
                          url: r.url,
                          status: r.status ?? "",
                          robots: r.robots ?? "",
                          metaRobots: r.metaRobots ?? "",
                          canonical_present: r.canonical?.present ?? "",
                          canonical_samePage: r.canonical?.samePage ?? "",
                          canonical_target: r.canonical?.target ?? "",
                          error: r.error ?? "",
                        })
                      )
                    )
                  }
                  leadingIcon={<IconDownload />}
                >
                  {i18n.submitValidate.dryrunExport}
                </Button>
                <button
                  type="button"
                  className={`rounded-md p-1 text-gray-500 hover:bg-gray-50 ${brandFocus} cursor-pointer`}
                  onClick={() => setDryRunOpen(false)}
                  aria-label="Close"
                  title="Close"
                >
                  <IconClose />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 overflow-y-auto">
              {/* Buckets */}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {i18n.submitValidate.dryrunBuckets}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(dryRunSummary).map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                    >
                      <span className="block text-xs text-gray-500">{k}</span>
                      <span className="font-semibold">{nf.format(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top failing hosts (with favicons) */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900">
                  {i18n.submitValidate.dryrunTopFailing}
                </p>
                <FailingHosts
                  data={useMockData || !dryRunData.length ? MOCK_DRYRUN : dryRunData}
                />
              </div>

              {/* Sample list (with favicon in URL cell) */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-900">
                  Sample (
                  {nf.format(
                    (useMockData || !dryRunData.length
                      ? MOCK_DRYRUN
                      : dryRunData
                    ).length
                  )}
                  )
                </p>
                <div className="mt-2 max-h-[48vh] overflow-y-auto rounded border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium">URL</th>
                        <th className="px-2 py-2 text-left font-medium">Status</th>
                        <th className="px-2 py-2 text-left font-medium">Robots</th>
                        <th className="px-2 py-2 text-left font-medium">Meta</th>
                        <th className="px-2 py-2 text-left font-medium">Canonical</th>
                        <th className="px-2 py-2 text-left font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(useMockData || !dryRunData.length
                        ? MOCK_DRYRUN
                        : dryRunData
                      ).map((r, i) => (
                        <tr key={i} className="align-top">
                          <td className="px-2 py-2 break-all">
                            <div className="flex items-start gap-2">
                              <Favicon url={r.url} />
                              <a
                                className="text-[#008CCD] hover:underline break-all cursor-pointer"
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                title={r.url}
                              >
                                {r.url}
                              </a>
                            </div>
                          </td>
                          <td className="px-2 py-2">{r.status ?? ""}</td>
                          <td className="px-2 py-2">{r.robots ?? ""}</td>
                          <td className="px-2 py-2">{r.metaRobots ?? ""}</td>
                          <td className="px-2 py-2">
                            {r.canonical?.present
                              ? r.canonical?.samePage
                                ? "same-page"
                                : r.canonical?.target || ""
                              : ""}
                          </td>
                          <td className="px-2 py-2">{r.error ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================= Small subcomponents (modular) ========================= */

function Spinner({ invert }: { invert?: boolean }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${invert ? "text-white" : "text-[#008CCD]"}`}
      viewBox="0 0 24 24"
      aria-label="Loading…"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={BRAND} aria-hidden="true">
      {/* stylized check-shield */}
      <path d="M12 2.5 4.5 5.5v6.1c0 5 3.2 7.7 7.5 9.9 4.3-2.2 7.5-4.9 7.5-9.9V5.5L12 2.5Zm3.7 7.3-4.5 4.6-2-2a.9.9 0 1 0-1.3 1.3l2.6 2.6c.35.35.92.35 1.27 0l5.1-5.2a.9.9 0 1 0-1.27-1.27Z" />
    </svg>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  leadingIcon?: React.ReactNode;
};
function Button({
  variant = "primary",
  leadingIcon,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#008CCD]/20 focus:ring-offset-2";
  const variants = {
    primary: disabled
      ? "bg-[#008CCD]/60 text-white cursor-not-allowed"
      : "bg-[#008CCD] text-white hover:opacity-90",
    secondary: disabled
      ? "border border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
      : "border border-gray-300 text-gray-700 hover:bg-gray-50",
    ghost: disabled
      ? "text-gray-400 cursor-not-allowed"
      : "text-gray-600 hover:bg-gray-50",
  } as const;
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {leadingIcon}
      {children}
    </button>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  variant?: "neutral" | "brand" | "danger";
};
function Chip({
  label,
  selected,
  onClick,
  title,
  variant = "neutral",
}: ChipProps) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition";
  const map = {
    neutral: "bg-gray-50 text-gray-700 border-gray-200",
    brand: selected
      ? "bg-[#008CCD]/10 text-[#008CCD] border-[#008CCD]/30"
      : "bg-white text-[#008CCD] border-[#008CCD]/30",
    danger: selected
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-white text-red-700 border-red-200",
  };
  return (
    <button
      type="button"
      className={`${base} ${map[variant]} ${onClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
      title={title}
    >
      {label}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group relative inline-flex items-center cursor-pointer select-none ${checked ? "opacity-100" : "opacity-100"}`}
      title={label}
    >
      <span
        className={`h-5 w-9 rounded-full transition ${
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        }`}
      />
      <span
        className={`pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transform transition ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
      {label && (
        <span className="ml-2 text-sm text-gray-700">{label}</span>
      )}
    </button>
  );
}

function CountBadge({
  tone,
  label,
  value,
}: {
  tone: "success" | "warn" | "danger";
  label: string;
  value: string | number;
}) {
  const styles =
    tone === "success"
      ? "bg-green-50 text-green-700 ring-1 ring-green-600/15"
      : tone === "warn"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/15"
      : "bg-red-50 text-red-700 ring-1 ring-red-600/15";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${styles}`}>
      <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" />
      {label}: {value}
    </span>
  );
}

function labelForReason(
  r: ValidationResult["invalid"][number]["reason"]
) {
  switch (r) {
    case "not_url":
      return "Not a URL";
    case "unsupported_scheme":
      return "Unsupported scheme";
    case "blacklisted":
      return "Blacklisted";
    case "too_long":
      return "Too long";
    case "parse_error":
      return "Parse error";
    default:
      return r;
  }
}

/* ===== Icons ===== */
function IconClose() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 1 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M12 3a1 1 0 0 1 1 1v9.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4.004 4.004a1.25 1.25 0 0 1-1.768 0L6.93 12.707a1 1 0 1 1 1.414-1.414L10 13.95V4a1 1 0 0 1 1-1Zm-8 14a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" clipRule="evenodd"/>
    </svg>
  );
}
function IconMagnifier() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 2a8 8 0 1 1 4.9 14.32l4.39 4.39a1 1 0 0 1-1.42 1.42l-4.39-4.39A8 8 0 0 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m2.01 3.73 19.2 8.23c.8.34.8 1.49 0 1.83l-19.2 8.23a1 1 0 0 1-1.37-1.15l2.14-7.84a1 1 0 0 1 .73-.72l8.47-2.04-8.47-2.04a1 1 0 0 1-.73-.72L.64 4.88A1 1 0 0 1 2 3.73Z" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42L11 13.6V4a1 1 0 0 1 1-1ZM4 18a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z"/>
    </svg>
  );
}

/* ===== Favicons ===== */

function Favicon({ url }: { url: string }) {
  const host = safeHost(url);
  const primary = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
    "https://" + host
  )}`;
  const [src, setSrc] = useState(primary);
  const fallback = `https://icons.duckduckgo.com/ip3/${host}.ico`;

    if (!host) return null;
  return (
    <img
      src={src}
      alt={`${host} favicon`}
      className="h-4 w-4 rounded-sm mt-0.5"
      onError={() => setSrc(fallback)}
    />
  );
}
function safeHost(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return null;
  }
}

/* ===== Failing hosts (with favicon + counts) ===== */

function FailingHosts({ data }: { data: DryRunResult }) {
  const map = new Map<string, { count: number; example: string }>();
  for (const r of data) {
    const u = safeHost(r.url);
    if (!u) continue;
    const ok =
      r.status &&
      r.status >= 200 &&
      r.status < 300 &&
      r.robots !== "disallow" &&
      r.metaRobots !== "noindex";
    if (ok) continue;
    const prev = map.get(u) || { count: 0, example: r.url };
    map.set(u, { count: prev.count + 1, example: prev.example });
  }
  const items = Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  if (!items.length) {
    return <p className="mt-1 text-xs text-gray-500">No failing hosts in sample.</p>;
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-2">
      {items.map(([host, v]) => (
        <div key={host} className="rounded border border-gray-200 p-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
                  "https://" + host
                )}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://icons.duckduckgo.com/ip3/${host}.ico`;
                }}
                alt={`${host} favicon`}
                className="h-4 w-4 rounded-sm"
              />
              <a
                className="font-medium text-gray-800 hover:underline cursor-pointer"
                href={v.example}
                target="_blank"
                rel="noreferrer"
                title={host}
              >
                {host}
              </a>
            </div>
            <span className="text-gray-600">{v.count}</span>
          </div>
          <div className="mt-1 break-all">
            <a
              className="text-[#008CCD] hover:underline cursor-pointer"
              href={v.example}
              target="_blank"
              rel="noreferrer"
              title={v.example}
            >
              {v.example}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

