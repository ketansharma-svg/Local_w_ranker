// src/components/AddLinkToMonitorModal.tsx
import * as React from "react";
import {
  X,
  Plus,
  Upload,
  Info,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Link2,
} from "lucide-react";
import { BASE_URL_WR } from "@/src/util/api";
import Cookies from "js-cookie";


/* ------------------------------------------------------------------ */
/* Design Tokens (2025) – aligned with recent designs                  */
/* ------------------------------------------------------------------ */
const TOKENS = {
  brand: "#008CCD", // branded icons + primary actions
  // neutrals
  border: "border-slate-200",
  text: "text-slate-800",
  muted: "text-slate-600",
  panel: {
    base: "bg-white",
    black: "bg-black text-white", // backlinks paste panel
  },
} as const;

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */
function cn(...v: (string | false | null | undefined)[]) {
  return v.filter(Boolean).join(" ");
}
function isHttpUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function rowsToKey(src?: string, tgt?: string) {
  return `${(src || "").trim()}__${(tgt || "").trim()}`.toLowerCase();
}
function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ------------------------------------------------------------------ */
/* Smart Popover (hover/focus) with colored dot annotation             */
/* ------------------------------------------------------------------ */
function SmartPopover({
  label,
  dotColor,
  placement = "top",
  children,
}: {
  label: React.ReactNode;
  dotColor?: string;
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  const id = React.useId();
  const pos =
    placement === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -translate-y-2"
      : placement === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 translate-y-2"
      : placement === "left"
      ? "right-full top-1/2 -translate-y-1/2 -translate-x-2"
      : "left-full top-1/2 -translate-y-1/2 translate-x-2";
  return (
    <span className="relative inline-flex items-center group">
      <span tabIndex={0} aria-describedby={id} className="focus:outline-none cursor-pointer">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[999] hidden max-w-xs whitespace-pre-wrap rounded-md border bg-white px-2.5 py-1.5 text-[12px] shadow-lg ring-1 ring-black/5",
          TOKENS.border,
          "group-hover:block group-focus-within:block",
          pos
        )}
      >
        <span className="inline-flex items-center gap-2 text-slate-700">
          {dotColor && (
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: dotColor }}
            />
          )}
          {label}
        </span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Modal Shell                                                         */
/* ------------------------------------------------------------------ */
function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[999] flex items-center justify-center font-[family:var(--font-inter,_Inter,_ui-sans-serif,_system-ui,_-apple-system,_'Segoe UI',_Roboto,_'Helvetica Neue',_Arial,_'Noto Sans',_sans-serif)]"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative mx-3 w-full max-w-[920px] rounded-xl border bg-white shadow-xl">
        {/* Header */}
        <div className={cn("flex items-start justify-between gap-3 border-b p-4", TOKENS.border)}>
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-5 w-5" style={{ color: TOKENS.brand }} aria-hidden />
            <div>
              <h3 className="text-[18px] font-semibold text-slate-900">{title}</h3>
              {subtitle && <p className={cn("mt-1 text-[13px]", TOKENS.muted)}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[72vh] overflow-y-auto p-4">{children}</div>

        {/* Footer */}
        <div className={cn("flex items-center justify-between gap-2 border-t p-4", TOKENS.border)}>
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result Prompt Popup (New)                                           */
/* ------------------------------------------------------------------ */
type ResultSummary = {
  added: number;
  rejected: number;
  errors: { type: string; count: number }[];
};

function ResultPopup({
  open,
  onClose,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  summary: ResultSummary | null;
}) {
  if (!open || !summary) return null;
  const hasErrors = summary.rejected > 0;
  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[1000] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative mx-3 w-full max-w-[520px] rounded-xl border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            <h3 className="text-[16px] font-semibold text-slate-900">Import Summary</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Added: {summary.added}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[12px] text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Rejected: {summary.rejected}
              </span>
            </div>
          </div>

          {summary.errors.length > 0 ? (
            <div className="rounded-md border p-3">
              <div className="text-[12px] font-medium text-slate-700 mb-1">Error breakdown</div>
              <ul className="space-y-1 text-sm">
                {summary.errors.map((e, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-slate-700">{e.type}</span>
                    <span className="text-slate-900 font-medium">{e.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              No errors encountered. All backlinks were added successfully.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 cursor-pointer"
            style={{ background: TOKENS.brand }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Manual Entry (black paste panel)                                    */
/* ------------------------------------------------------------------ */
type ManualRow = {
  id: string;
  source_url: string;
  error?: string | null;
  duplicate?: boolean;
  alreadyMonitored?: boolean;
};

function ManualEntryPanel({
  existingKeys = [],
  onSubmit,
  onResult,
}: {
  existingKeys?: string[];
  onSubmit: (rows: ManualRow[]) => Promise<{ added: number; skipped: number }>;
  onResult: (summary: ResultSummary) => void;
}) {
  const [raw, setRaw] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const existingSources = React.useMemo(() => {
    const s = new Set<string>();
    for (const k of existingKeys) {
      const src = (k || "").split("__")[0];
      if (src) s.add(src);
    }
    return s;
  }, [existingKeys]);

  const parsed = React.useMemo(() => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const out: ManualRow[] = lines.map((u) => {
      const ok = isHttpUrl(u);
      const dupSession = seen.has(u.toLowerCase());
      const dupDb = existingSources.has(u.toLowerCase());
      seen.add(u.toLowerCase());
      return {
        id: crypto.randomUUID(),
        source_url: u,
        error: ok ? null : "Must be an absolute http(s) URL.",
        duplicate: dupSession,
        alreadyMonitored: dupDb,
      };
    });
    return out;
  }, [raw, existingSources]);

  const valid = parsed.filter((r) => !r.error && !r.duplicate && !r.alreadyMonitored);
  const dup = parsed.filter((r) => r.duplicate);
  const invalid = parsed.filter((r) => !!r.error);
  const already = parsed.filter((r) => r.alreadyMonitored);

  const submit = async () => {
    if (!valid.length) return;
    setBusy(true);
    const res = await onSubmit(valid);
    setBusy(false);

    // Build popup summary (with error breakdown)
    const errors: { type: string; count: number }[] = [];
    if (invalid.length) errors.push({ type: "Invalid URL format", count: invalid.length });
    if (dup.length) errors.push({ type: "Duplicate in form", count: dup.length });
    if (already.length) errors.push({ type: "Already monitored", count: already.length });
    if (res.skipped > 0) errors.push({ type: "Skipped by server", count: res.skipped });

    const rejected = invalid.length + dup.length + already.length + res.skipped;
    onResult({ added: res.added, rejected, errors });

    setToast(`${res.added} added • ${rejected} rejected`);
    setTimeout(() => setToast(null), 1200);

    // Clear and focus the black panel so user can paste another batch.
    setRaw("");
    requestAnimationFrame(() => textAreaRef.current?.focus());
  };

  return (
    <div className="space-y-3">
      {/* Instruction under title */}
      <p className={cn("text-[13px]", TOKENS.muted)}>
        Paste the backlink / post URLs in the box below. We validate the URL format and de‑duplicate
        against the current session and your database.
      </p>

      {/* Black paste panel (always black; cleared after submit) */}
      <div className={cn("rounded-lg border p-0 overflow-hidden", TOKENS.border)}>
        <div className={cn("px-3 py-2 text-[12px] font-medium uppercase tracking-wide", TOKENS.panel.black)}>
          Backlink URLs (one per line)
        </div>
        <textarea
          ref={textAreaRef}
          className={cn(
            "w-full resize-y bg-black/95 text-white placeholder:text-slate-400 focus:outline-none px-3 py-3 text-sm min-h-[180px]"
          )}
          placeholder="https://example.com/blog/post-a&#10;https://another-site.net/review/your-brand&#10;https://publisher.org/list/your-tool"
          spellCheck={false}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Valid: {valid.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Duplicates in form: {dup.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[12px] text-rose-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Invalid: {invalid.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[12px] text-sky-700">
          <Info className="h-3.5 w-3.5" /> Already monitored: {already.length}
        </span>
        <div className="ml-auto text-[12px] text-slate-500">No limit on rows.</div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={submit}
          disabled={busy || valid.length === 0}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60 cursor-pointer"
          style={{ background: TOKENS.brand }}
          title="Add to Monitor"
        >
          {busy ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Add to Monitor
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk Upload (unchanged workflow; now reports to the result popup)   */
/* ------------------------------------------------------------------ */
type BulkRow = {
  source_url: string;
  target_url?: string;
  anchor_text?: string;
  link_type?: "dofollow" | "nofollow" | "sponsored" | "ugc" | "unknown";
  tags?: string[];
  status: "valid" | "duplicate" | "invalid";
  reason?: string;
};
function BulkUpload({
  onSubmit,
  onResult,
}: {
  onSubmit: (rows: BulkRow[]) => Promise<{ added: number; skipped: number }>;
  onResult: (summary: ResultSummary) => void;
}) {
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<BulkRow[] | null>(null);
  const [onlyValid, setOnlyValid] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const normalizeLinkType = (v?: string) => {
    if (!v) return undefined;
    const s = v.trim().toLowerCase();
    if (["dofollow", "do_follow", "do follow"].includes(s)) return "dofollow";
    if (["nofollow", "no_follow", "no follow"].includes(s)) return "nofollow";
    if (["sponsored", "sponsor"].includes(s)) return "sponsored";
    if (["ugc"].includes(s)) return "ugc";
    return "unknown";
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const idx = (name: string) => header.findIndex((h) => h.includes(name));
    const iSrc = idx("source") >= 0 ? idx("source") : idx("source_url");
    const iTgt = idx("target") >= 0 ? idx("target") : idx("target_url");
    const iAnc = idx("anchor") >= 0 ? idx("anchor_text") : idx("anchor");
    const iType = idx("link_type");
    const iTags = idx("tags");

    const seen = new Set<string>();
    const out: BulkRow[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = lines[r].split(",").map((c) => c.trim());
      const src = cols[iSrc] || "";
      const tgt = iTgt >= 0 ? cols[iTgt] : "";
      if (!src) continue;

      let status: BulkRow["status"] = "valid";
      let reason: string | undefined = undefined;
      if (!isHttpUrl(src)) {
        status = "invalid";
        reason = "Invalid source URL";
      }
      if (tgt && !isHttpUrl(tgt)) {
        status = "invalid";
        reason = "Invalid target URL";
      }

      const key = rowsToKey(src, tgt);
      if (seen.has(key)) {
        status = "duplicate";
        reason = "Duplicate in file";
      }
      seen.add(key);

      const linkType = normalizeLinkType(iType >= 0 ? cols[iType] : undefined);
      const tags = (iTags >= 0 ? cols[iTags] : "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      out.push({
        source_url: src,
        target_url: tgt || undefined,
        anchor_text: iAnc >= 0 ? cols[iAnc] : undefined,
        link_type: linkType,
        tags,
        status,
        reason,
      });
    }
    return out;
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast("File too large (max 5MB).");
      setTimeout(() => setToast(null), 1400);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      setToast("XLSX preview is not supported in this demo. Use CSV or proceed to import.");
      setTimeout(() => setToast(null), 1800);
      setRows([]);
      return;
    }
    setRows(parseCsv(text));
  };

  const submit = async () => {
    if (!rows) return;
    setBusy(true);
    const use = rows.filter((r) => (onlyValid ? r.status === "valid" : r.status !== "invalid"));
    const res = await onSubmit(use);
    setBusy(false);

    // Compute error breakdown based on excluded rows + any server skips.
    const excluded = rows.filter((r) => (onlyValid ? r.status !== "valid" : r.status === "invalid"));
    const map = new Map<string, number>();
    for (const r of excluded) {
      const key = r.reason || (r.status === "duplicate" ? "Duplicate in file" : "Invalid row");
      map.set(key, (map.get(key) || 0) + 1);
    }
    if (res.skipped > 0) {
      map.set("Skipped by server", (map.get("Skipped by server") || 0) + res.skipped);
    }

    const errors = Array.from(map.entries()).map(([type, count]) => ({ type, count }));
    const rejected = excluded.length + res.skipped;

    onResult({ added: res.added, rejected, errors });

    setToast(`${res.added} added • ${rejected} rejected`);
    setTimeout(() => setToast(null), 1200);
  };

  const valid = rows?.filter((r) => r.status === "valid").length ?? 0;
  const dup = rows?.filter((r) => r.status === "duplicate").length ?? 0;
  const invalid = rows?.filter((r) => r.status === "invalid").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center",
          rows ? "border-slate-300" : "border-sky-300/60 bg-sky-50/40"
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
      >
        <Upload className="h-6 w-6" style={{ color: TOKENS.brand }} />
        <div className="mt-2 text-sm text-slate-800">
          Drag & drop CSV/XLSX (max 500 rows / 5MB) or
          <button
            className="ml-1 underline"
            style={{ color: TOKENS.brand }}
            onClick={() => inputRef.current?.click()}
          >
            browse
          </button>
          .
        </div>
        <div className="mt-1 text-[12px] text-slate-500">
          We’ll validate, de‑dupe, and import.{" "}
          <SmartPopover
            label={
              <span>
                Expected columns: <b>source_url</b> (required), <b>target_url</b>, <b>anchor_text</b>,{" "}
                <b>link_type</b>, <b>tags</b>
              </span>
            }
          >
            <span className="inline-flex items-center gap-1 cursor-pointer">
              <Info className="h-3.5 w-3.5" /> template
            </span>
          </SmartPopover>
          {"  "}
          <button
            className="ml-1 inline-flex items-center gap-1 underline cursor-pointer"
            style={{ color: TOKENS.brand }}
            onClick={() =>
              downloadTextFile(
                "add_links_template.csv",
                "source_url,target_url,anchor_text,link_type,tags\nhttps://example.com/post-a,https://yoursite.com/tools,best seo tools,dofollow,guest-post\nhttps://blog.sample.net/review,https://yoursite.com/pricing,check our pricing,nofollow,review,pricing\n"
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            Download sample CSV
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />

        {fileName && (
          <div className="mt-3 text-[12px] text-slate-600">
            Selected file: <span className="font-medium">{fileName}</span>
          </div>
        )}
      </div>

      {/* Summary chips */}
      {rows && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Valid: {valid}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Duplicates: {dup}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[12px] text-rose-700">
            <AlertTriangle className="h-3.5 w-3.5" /> Invalid: {invalid}
          </span>
          <label className="ml-auto inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyValid}
              onChange={(e) => setOnlyValid(e.target.checked)}
            />
            Only import valid
          </label>
        </div>
      )}

      {/* Preview table */}
      {(rows?.length ?? 0) > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-[12px] text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left">Source URL</th>
                <th className="px-2 py-1.5 text-left">Target URL</th>
                <th className="px-2 py-1.5 text-left">Anchor</th>
                <th className="px-2 py-1.5 text-left">Type</th>
                <th className="px-2 py-1.5 text-left">Tags</th>
                <th className="px-2 py-1.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {rows!.slice(0, 15).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-2">{r.source_url}</td>
                  <td className="px-2 py-2">{r.target_url || "—"}</td>
                  <td className="px-2 py-2">{r.anchor_text || "—"}</td>
                  <td className="px-2 py-2">{r.link_type || "unknown"}</td>
                  <td className="px-2 py-2">{(r.tags || []).join(", ") || "—"}</td>
                  <td className="px-2 py-2">
                    {r.status === "valid" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valid
                      </span>
                    )}
                    {r.status === "duplicate" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Duplicate
                      </span>
                    )}
                    {r.status === "invalid" && (
                      <SmartPopover label={r.reason || "Invalid row"}>
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[12px] text-rose-700 cursor-pointer">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Invalid
                        </span>
                      </SmartPopover>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(rows?.length ?? 0) > 15 && (
            <div className="mt-2 text-[12px] text-slate-500">
              Showing first 15 rows of {(rows?.length ?? 0)}.
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {(rows?.length ?? 0) > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setRows(null);
              setFileName(null);
            }}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" /> Reset file
          </button>
          <button
            onClick={submit}
            disabled={busy || !rows?.length}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60 cursor-pointer"
            style={{ background: TOKENS.brand }}
          >
            {busy ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Add to Monitor
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export function AddLinkToMonitorModal({
  open = true,
  onClose,
  existingMonitoredKeys = [],
  domain,  
  onSuccess, 
}: {
  open?: boolean;
  onClose: () => void;
  existingMonitoredKeys?: string[];
    domain: string;        
  onSuccess?: () => void;  
}) {
  const [tab, setTab] = React.useState<"manual" | "bulk">("manual");
  const token = Cookies.get("login_access_token_wrank");

  async function postJSON<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`, },
    credentials: "include",
    body: JSON.stringify(body),
  });
  // You can tighten this to handle non-2xx as errors:
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}


  // Result popup state (new)
  const [resultOpen, setResultOpen] = React.useState(false);
  const [resultSummary, setResultSummary] = React.useState<ResultSummary | null>(null);
  const showResult = (summary: ResultSummary) => {
    setResultSummary(summary);
    setResultOpen(true);
  };

// Replace previous demo handlers
const submitManual = async (rows: ManualRow[]) => {
  // rows are already validated (absolute http(s) URL)
  const post_urls = rows.map(r => r.source_url);
  const payload = { post_urls, domain };

  // Use relative path so it works on local & production
  // If you must hit production always: "https://dashboard.wranker.co`${BASE_URL_WR}/check-links`
  const data = await postJSON(`${BASE_URL_WR}check-links/`, payload);

  // OPTIONAL: derive counts from API response if it returns per-URL results.
  // For now, count everything as added; adjust if your API returns skips/duplicates.
  const added = post_urls.length;
  const skipped = 0;

  // Fire table refresh
  onSuccess?.();
  return { added, skipped };
};

const submitBulk = async (rows: BulkRow[]) => {
  // Minimal contract: we only need the source (post) URLs for this endpoint
  const post_urls = rows.map(r => r.source_url).filter(Boolean);
  const payload = { post_urls, domain };

  const data = await postJSON(`${BASE_URL_WR}check-links/`, payload);

  const added = post_urls.length;
  const skipped = 0;

  onSuccess?.();
  return { added, skipped };
};

  return (
    <>
      <ModalShell
        open={open}
        title="Add Backlinks to Monitor"
        subtitle="Enter or upload backlink URLs to start tracking status, changes, and risks."
        onClose={onClose}
        footer={
          <div className="flex w-full items-center justify-between">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab("manual")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm border cursor-pointer",
                  tab === "manual" ? "bg-[rgba(0,140,205,0.08)]" : "hover:bg-slate-50",
                  tab === "manual" ? "" : TOKENS.border
                )}
                style={tab === "manual" ? { color: TOKENS.brand, borderColor: TOKENS.brand } : {}}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setTab("bulk")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm border cursor-pointer",
                  tab === "bulk" ? "bg-[rgba(0,140,205,0.08)]" : "hover:bg-slate-50",
                  tab === "bulk" ? "" : TOKENS.border
                )}
                style={tab === "bulk" ? { color: TOKENS.brand, borderColor: TOKENS.brand } : {}}
              >
                Bulk Upload (CSV/XLSX)
              </button>
            </div>
          </div>
        }
      >
        {/* NOTE: Cards removed per request (“Recent Adds”, “Link Type Mix”) */}

        {/* Tabs body */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {tab === "manual" ? (
              <div className={cn("text-sm", TOKENS.text)}>
                <b>Manual Entry</b>{" "}
                <SmartPopover
                  placement="right"
                  label="Paste one URL per line in the black panel. We validate the URL format and de‑duplicate against the current session and your database."
                >
                  <Info className="ml-1 inline h-4 w-4 text-slate-500 align-middle cursor-pointer" />
                </SmartPopover>
              </div>
            ) : (
              <div className={cn("text-sm", TOKENS.text)}>
                <b>Bulk Upload</b>{" "}
                <SmartPopover
                  placement="right"
                  label="Upload a CSV/XLSX (max 500 rows). We validate, normalize, and skip duplicates."
                >
                  <Info className="ml-1 inline h-4 w-4 text-slate-500 align-middle cursor-pointer" />
                </SmartPopover>
              </div>
            )}
          </div>

          {tab === "manual" ? (
            <ManualEntryPanel
              existingKeys={existingMonitoredKeys}
              onSubmit={submitManual}
              onResult={showResult}
            />
          ) : (
            <BulkUpload onSubmit={submitBulk} onResult={showResult} />
          )}
        </div>
      </ModalShell>

      {/* New prompt popup with summary */}
      <ResultPopup
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        summary={resultSummary}
      />
    </>
  );
}


