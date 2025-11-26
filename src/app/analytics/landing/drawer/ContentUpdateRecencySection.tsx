"use client";

import * as React from "react";
import {
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  FileText,
  Info,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Tokens (match Wranker theme)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF", // KPI primary values color
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  green: { text: "#059669", bg: "rgba(16,185,129,.12)", border: "#D1FAE5" }, // Fresh
  amber: { text: "#B45309", bg: "rgba(245,158,11,.15)", border: "#FDE68A" }, // Aging
  red: { text: "#B91C1C", bg: "rgba(239,68,68,.12)", border: "#FECACA" }, // Stale
} as const;

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
type RecencyData = {
  pageUrl: string;
  lastModified: Date; // from sitemap <lastmod> or headers
  lastActivity: Date; // most recent GA4 session timestamp for page
  sessionsLast30: number; // GA4 sessions (last 30d)
  conversionsLast30: number;
};

type Status = "Fresh" | "Aging" | "Stale";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const fmt = {
  date: (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  daysAgo: (d: Date) => {
    const ms = Date.now() - d.getTime();
    const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  },
  num: (n: number) => new Intl.NumberFormat().format(n),
};

function daysSince(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function recencyStatus(daysSinceUpdate: number): Status {
  if (daysSinceUpdate < 30) return "Fresh";
  if (daysSinceUpdate < 90) return "Aging";
  return "Stale";
}

function toneForStatus(status: Status) {
  return status === "Fresh" ? TK.green : status === "Aging" ? TK.amber : TK.red;
}

/* ──────────────────────────────────────────────────────────────
   Reusable UI: Tooltip, ChipToggle, ToggleSwitch
   ────────────────────────────────────────────────────────────── */
function Tooltip({
  text,
  children,
  align = "center",
}: {
  text: string;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute z-20 hidden whitespace-nowrap rounded-md border bg-white px-2 py-1 text-[11px] leading-tight text-gray-700 shadow-lg group-hover:block"
        style={{
          borderColor: TK.border,
          bottom: "calc(100% + 6px)",
          left: align === "left" ? 0 : align === "right" ? "auto" : "50%",
          right: align === "right" ? 0 : "auto",
          transform: align === "center" ? "translateX(-50%)" : "translateX(0%)",
        }}
      >
        {text}
      </span>
    </span>
  );
}

function ChipToggle({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 cursor-pointer rounded-full border px-3 text-sm ${
        active ? "font-semibold" : ""
      }`}
      style={{
        borderColor: TK.borderLight,
        background: active ? "#D9EEF8" : "#fff",
        color: active ? TK.valueBlue : "inherit",
      }}
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
      className="inline-flex cursor-pointer select-none items-center gap-2"
      title={label}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </span>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Status Badge
   ────────────────────────────────────────────────────────────── */
function StatusBadge({ status, tooltip }: { status: Status; tooltip: string }) {
  const t = toneForStatus(status);
  const Icon = status === "Fresh" ? CheckCircle2 : AlertTriangle;
  return (
    <Tooltip text={tooltip}>
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
        style={{ color: t.text, background: t.bg, borderColor: t.border }}
      >
        <Icon size={14} />
        {status}
      </span>
    </Tooltip>
  );
}

/* ──────────────────────────────────────────────────────────────
   KPI Card
   ────────────────────────────────────────────────────────────── */
function MiniCard({
  title,
  titleIcon: TitleIcon,
  value,
  hint,
}: {
  title: string;
  titleIcon: React.ComponentType<{ className?: string; size?: number }>;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div
      className="group rounded-lg bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-1"
      style={{
        border: `1px solid ${TK.border}`,
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
        ringColor: `${TK.brand}33`,
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5">
          <TitleIcon className="h-4 w-4 text-[#008CCD]" />
          <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-600">
            {title}
          </div>
        </div>
        {hint && (
          <Tooltip text={hint}>
            <Info className="h-4 w-4 text-gray-400" />
          </Tooltip>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold" style={{ color: TK.valueBlue }}>
          {value}
        </span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Export helpers
   ────────────────────────────────────────────────────────────── */
function exportCSV(filename: string, row: RecencyData, status: Status) {
  const header = [
    "pageUrl",
    "lastModified",
    "lastActivity",
    "sessionsLast30",
    "conversionsLast30",
    "daysSinceUpdate",
    "daysSinceActivity",
    "status",
  ];
  const body = [
    row.pageUrl,
    row.lastModified.toISOString(),
    row.lastActivity.toISOString(),
    String(row.sessionsLast30),
    String(row.conversionsLast30),
    String(daysSince(row.lastModified)),
    String(daysSince(row.lastActivity)),
    status,
  ];
  const csv = [header.join(","), body.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

function exportPNG(el: HTMLElement | null, filename: string) {
  if (!el) return;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; background:#fff;">
        ${el.outerHTML}
      </div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ──────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────── */
export default function ContentUpdateRecencySection({
  data: incoming,
}: {
  /** Pass real values from GA4 + sitemap when wiring; mock used by default. */
  data?: RecencyData;
}) {
  const sectionRef = React.useRef<HTMLDivElement | null>(null);

  // Mock data (replace with real values)
  const today = React.useMemo(() => new Date(), []);
  const mock: RecencyData = React.useMemo(
    () => ({
      pageUrl: "/product/seo-audit-tool",
      lastModified: new Date("2024-05-12T12:00:00Z"),
      lastActivity: new Date(new Date(today).setDate(today.getDate() - 3)), // 3 days ago
      sessionsLast30: 3280,
      conversionsLast30: 94,
    }),
    [today]
  );

  const data = incoming ?? mock;

  // Derived
  const dUpdate = daysSince(data.lastModified);
  const dActive = daysSince(data.lastActivity);
  const status: Status = recencyStatus(dUpdate);
  const statusTooltip =
    status === "Fresh"
      ? `Updated ${fmt.daysAgo(data.lastModified)}. You're within 30 days.`
      : status === "Aging"
      ? `Updated ${fmt.daysAgo(data.lastModified)}. Consider light refresh within 90 days.`
      : `Updated ${fmt.daysAgo(data.lastModified)}. Over 90 days — at risk of going stale.`;

  // Controls (chips + toggle)
  const [windowChip, setWindowChip] = React.useState<"30" | "90" | "any">("any");
  const [issuesOnly, setIssuesOnly] = React.useState<boolean>(false);

  // Insights (simple rules from spec)
  const allInsights: { kind: "tip" | "warn" | "ok"; text: string }[] = [];
  if (data.sessionsLast30 > 1500 && status === "Stale") {
    allInsights.push({
      kind: "warn",
      text: "High traffic to stale page — refresh copy, H1/title, and internal links.",
    });
  }
  if (dUpdate <= 30 && dActive > 21) {
    allInsights.push({
      kind: "warn",
      text: "Page updated recently but no recent sessions — verify indexing or promotion.",
    });
  }
  if (dUpdate <= 30 && dActive <= 7) {
    allInsights.push({
      kind: "ok",
      text: "Updated recently and actively visited — flagged as Fresh.",
    });
  }
  if (allInsights.length === 0) {
    allInsights.push({
      kind: "tip",
      text: "No critical freshness issues detected. Review metadata quarterly to maintain rankings.",
    });
  }
  const insights = issuesOnly ? allInsights.filter((i) => i.kind === "warn") : allInsights;

  // Export dropdown
  const [expOpen, setExpOpen] = React.useState(false);
  const expRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!expRef.current) return;
      if (!expRef.current.contains(e.target as Node)) setExpOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="rounded-md bg-white p-4 mt-4"
      style={{
        border: `1px solid ${TK.border}`,
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue'",
      }}
      aria-label="Section 6: Content Update Recency"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Content Update Recency
          </div>
          <span className="text-xs text-gray-500 truncate max-w-[380px]">{data.pageUrl}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Modular chips (review window) */}
          <div className="hidden sm:flex items-center gap-1">
            <ChipToggle
              active={windowChip === "30"}
              label="Within 30d"
              onClick={() => setWindowChip("30")}
              title="Review last 30 days"
            />
            <ChipToggle
              active={windowChip === "90"}
              label="Within 90d"
              onClick={() => setWindowChip("90")}
              title="Review last 90 days"
            />
            <ChipToggle
              active={windowChip === "any"}
              label="Any time"
              onClick={() => setWindowChip("any")}
              title="Show all"
            />
          </div>

          {/* Issues-only toggle */}
          <ToggleSwitch checked={issuesOnly} onChange={setIssuesOnly} label="Issues only" />

          {/* Single Export button (dropdown) */}
          <div className="relative" ref={expRef}>
            <button
              onClick={() => setExpOpen((s) => !s)}
              className="inline-flex cursor-pointer items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
              style={{ borderColor: TK.border }}
              aria-haspopup="menu"
              aria-expanded={expOpen}
              title="Export"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {expOpen && (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-2 w-48 rounded-md border bg-white p-1 shadow-lg"
                style={{ borderColor: TK.borderLight }}
              >
                <button
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setExpOpen(false);
                    exportCSV(
                      `content-recency-${new Date().toISOString().slice(0, 10)}.csv`,
                      data,
                      status
                    );
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 text-gray-600" />
                  CSV
                </button>
                <button
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => {
                    setExpOpen(false);
                    exportPNG(sectionRef.current, "content-recency.png");
                  }}
                >
                  <ImageIcon className="h-4 w-4 text-gray-600" />
                  PNG
                </button>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border }}
            onClick={() => alert("Open Site Audit drawer")}
            aria-label="View in Site Audit"
            title="View in Site Audit"
          >
            <ExternalLink className="h-4 w-4 text-gray-600" />
            Site Audit
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-1 rounded border px-3 py-2 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border }}
            onClick={() => alert("Assign 'Content Refresh' task")}
            aria-label="Assign Content Refresh Task"
            title="Assign Content Refresh Task"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
            Refresh Task
          </button>
        </div>
      </div>

      {/* Summary grid (KPI cards with hover animation + branded icons + blue values) */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MiniCard
          title="Last Updated"
          titleIcon={CalendarDays}
          value={fmt.date(data.lastModified)}
          hint="Parsed from sitemap <lastmod> or meta 'article:modified_time'."
        />
        <MiniCard
          title="Last User Session"
          titleIcon={Clock}
          value={fmt.date(data.lastActivity)}
          hint="Most recent GA4 session timestamp for this page."
        />
        <MiniCard
          title="Days Since Update"
          titleIcon={FileText}
          value={fmt.daysAgo(data.lastModified)}
          hint="Time since last content/code update detected."
        />
        <MiniCard
          title="Days Since Activity"
          titleIcon={Clock}
          value={fmt.daysAgo(data.lastActivity)}
          hint="Time since last GA4 session on this page."
        />
        {/* Status card */}
        <div
          className="group rounded-lg bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-1"
          style={{
            border: `1px solid ${TK.border}`,
            boxShadow: "0 1px 2px rgba(17,24,39,.06)",
            ringColor: `${TK.brand}33`,
          } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4" style={{ color: TK.brand }} />
              <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-600">
                Content Recency Status
              </div>
            </div>
            <Tooltip text="Status is based on Days Since Update: Fresh <30d, Aging <90d, else Stale.">
              <Info className="h-4 w-4 text-gray-400" />
            </Tooltip>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusBadge status={status} tooltip={statusTooltip} />
            <div className="text-right text-xs text-gray-500">
              Sessions (30d): <b>{fmt.num(data.sessionsLast30)}</b>
              <br />
              Conversions (30d): <b>{fmt.num(data.conversionsLast30)}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div
        className="mt-4 rounded-lg bg-white p-3"
        style={{ border: `1px solid ${TK.borderLight}`, boxShadow: "0 1px 2px rgba(17,24,39,.04)" }}
      >
        <div className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
          <Info className="h-4 w-4" style={{ color: TK.brand }} />
          Insights
        </div>
        <ul className="space-y-2">
          {insights.map((ins, idx) => {
            const Icon = ins.kind === "warn" ? AlertTriangle : ins.kind === "ok" ? CheckCircle2 : Info;
            const tone =
              ins.kind === "warn"
                ? TK.red
                : ins.kind === "ok"
                ? TK.green
                : { text: TK.muted, bg: "transparent", border: TK.border };
            return (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-md px-2 py-1"
                style={{
                  background: ins.kind === "warn" ? TK.red.bg : ins.kind === "ok" ? TK.green.bg : "transparent",
                }}
              >
                <Icon className="mt-0.5" size={16} style={{ color: tone.text, minWidth: 16 }} />
                <p className="text-sm" style={{ color: TK.text }}>
                  {ins.text}
                </p>
              </li>
            );
          })}
          {insights.length === 0 && (
            <li className="text-sm text-gray-500">No insights in the selected view.</li>
          )}
        </ul>
      </div>

      {/* Footer helper (tiny legend) */}
      <div className="mt-3 text-xs text-gray-500">
        Status logic — <b>Fresh</b>: &lt; 30 days · <b>Aging</b>: 30–89 days · <b>Stale</b>: ≥ 90 days since last update.
        {windowChip !== "any" && (
          <span className="ml-1 text-gray-400"> · Window: {windowChip === "30" ? "30 days" : "90 days"}</span>
        )}
      </div>
    </section>
  );
}
