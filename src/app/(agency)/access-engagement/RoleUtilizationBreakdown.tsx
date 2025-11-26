/* Section 6 — Role Utilization Breakdown
   Drop‑in React + Tailwind TSX (no emojis)

   Design notes
   • Latest tokens + Inter font stack (matches recent table & chart sections)
   • Modular filter chips + branded toggle switches
   • Bar chart only (donut removed)
   • Branded icons for header, role types, table headers, dashboard types
   • Smart tooltip popover with role icon + item icons
   • Compact suggestion cards below the table (do not expand to fill space)

   Usage
   <RoleUtilizationBreakdown onDrill={(payload)=>console.log(payload)} />
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart2,
  Download,
  SlidersHorizontal,
  ShieldCheck,
  KeyRound,
  FileText,
  Eye,
  Users,
  CheckCircle2,
  XCircle,
  ClipboardList,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  ArrowUpRight,
  Repeat,
  LayoutGrid,
} from "lucide-react";

/* ───────────────────────────────── Tokens (same as recent designs) ───────────────────────────────── */
const TK = {
  brand: "#1090D0",
  blue: "#0077ff",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  subtle: "#F5F7FA",
  card: "#FFFFFF",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};
const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif";

/* ───────────────────────────────── Types ───────────────────────────────── */
type Mode = "capacity" | "role_name";
type Metric =
  | "users_total"
  | "users_active"
  | "users_inactive"
  | "avg_tasks_per_user"
  | "avg_sessions_per_user";

type DashKey = "seo" | "content" | "campaign" | "reporting";
type RoleKey = "owner" | "admin" | "editor" | "viewer" | string;

type Bucket = {
  key: RoleKey;
  label: string;
  users_total: number;
  users_active: number;
  users_inactive: number;
  avg_tasks_per_user: number;
  avg_sessions_per_user: number;
  dashboards_avg: Partial<Record<DashKey, number>>;
  color?: string;
  suggestion?: { type: "change_role" | "upgrade" | "reassign" | "investigate"; rationale: string };
};

/* ───────────────────────────────── Mock API (deterministic) ───────────────────────────────── */
const MOCK_CAPACITY: Bucket[] = [
  {
    key: "owner",
    label: "Owner",
    users_total: 2,
    users_active: 2,
    users_inactive: 0,
    avg_tasks_per_user: 8.2,
    avg_sessions_per_user: 5.6,
    dashboards_avg: { seo: 0.9, content: 0.4, campaign: 0.2, reporting: 0.7 },
    color: "#111827",
  },
  {
    key: "admin",
    label: "Admin",
    users_total: 8,
    users_active: 4,
    users_inactive: 4,
    avg_tasks_per_user: 12.3,
    avg_sessions_per_user: 4.7,
    dashboards_avg: { seo: 0.8, content: 0.4, campaign: 0.2, reporting: 0.6 },
    suggestion: { type: "change_role", rationale: "50% inactive in the last period." },
    color: TK.brand,
  },
  {
    key: "editor",
    label: "Editor",
    users_total: 10,
    users_active: 8,
    users_inactive: 2,
    avg_tasks_per_user: 9.1,
    avg_sessions_per_user: 6.2,
    dashboards_avg: { seo: 0.5, content: 0.6, campaign: 0.3, reporting: 0.4 },
    color: TK.good,
  },
  {
    key: "viewer",
    label: "Viewer",
    users_total: 6,
    users_active: 2,
    users_inactive: 4,
    avg_tasks_per_user: 1.2,
    avg_sessions_per_user: 0.8,
    dashboards_avg: { seo: 0.3, content: 0.1, campaign: 0.0, reporting: 0.2 },
    suggestion: { type: "upgrade", rationale: "Some viewers show high engagement. Consider upgrading." },
    color: "#9CA3AF",
  },
];

const MOCK_ROLE_NAME: Bucket[] = [
  ...MOCK_CAPACITY,
  {
    key: "custom:ga4",
    label: "GA4 Analyst",
    users_total: 4,
    users_active: 3,
    users_inactive: 1,
    avg_tasks_per_user: 7.4,
    avg_sessions_per_user: 5.1,
    dashboards_avg: { seo: 0.1, content: 0.2, campaign: 0.0, reporting: 0.9 },
    color: "#0EA5E9",
  },
];

async function fetchBreakdown(mode: Mode): Promise<Bucket[]> {
  await new Promise((r) => setTimeout(r, 250));
  return mode === "capacity" ? MOCK_CAPACITY : MOCK_ROLE_NAME;
}

/* ───────────────────────────────── Utilities ───────────────────────────────── */
const hashColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 65% 45%)`;
};
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;

/* ───────────────────────────────── Role Icon map ───────────────────────────────── */
function RoleIcon({ role, className }: { role: RoleKey; className?: string }) {
  if (role === "owner") return <ShieldCheck className={className} style={{ color: "#111827" }} />;
  if (role === "admin") return <KeyRound className={className} style={{ color: TK.brand }} />;
  if (role === "editor") return <FileText className={className} style={{ color: TK.good }} />;
  if (role === "viewer") return <Eye className={className} style={{ color: TK.muted }} />;
  return <LayoutGrid className={className} style={{ color: TK.blue }} />;
}

/* ───────────────────────────────── Chip Dropdown (modular) ───────────────────────────────── */
function ChipDropdown({
  label,
  children,
  active,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        className={`inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC] ${
          active ? "font-semibold" : ""
        }`}
        style={{ borderColor: TK.borderSubtle }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <SlidersHorizontal className="h-4 w-4 opacity-80" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-2 w-[320px] rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: TK.borderSubtle }}
          onMouseLeave={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── Switch (branded) ───────────────────────────────── */
function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      title={label}
    >
      <span
        className="inline-flex h-5 w-9 items-center rounded-full border px-0.5 transition-colors"
        style={{
          borderColor: TK.borderSubtle,
          background: checked ? TK.brand : "#FFFFFF",
        }}
      >
        <span
          className="h-4 w-4 rounded-full transition-transform"
          style={{
            background: checked ? "#FFFFFF" : TK.borderSubtle,
            transform: checked ? "translateX(16px)" : "translateX(0px)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

/* ───────────────────────────────── Legend Chip ───────────────────────────────── */
function LegendChip({
  color,
  label,
  off,
  onClick,
}: {
  color: string;
  label: string;
  off?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{
        borderColor: TK.border,
        background: "#fff",
        opacity: off ? 0.55 : 1,
      }}
      onClick={onClick}
      title={`${off ? "Show" : "Hide"} ${label}`}
    >
      <span
        aria-hidden
        className="inline-block h-3.5 w-3.5 rounded-full"
        style={{ background: color, border: `1px solid ${TK.border}` }}
      />
      <span>{label}</span>
    </button>
  );
}

/* ───────────────────────────────── Bar Chart ───────────────────────────────── */
type BarDatum = Bucket & { colorFinal: string; value: number; valuePct?: number };

function HBar({
  data,
  metric,
  normalize,
  onBarClick,
}: {
  data: BarDatum[];
  metric: Metric;
  normalize: boolean;
  onBarClick?: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    const ro = new ResizeObserver((e) => setW(Math.max(520, Math.floor(e[0].contentRect.width))));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padX = 12;
  const labelW = 200;
  const rowH = 34;
  const gap = 8;
  const height = padX * 2 + data.length * (rowH + gap);

  const maxV = normalize ? 100 : Math.max(1, ...data.map((d) => d.value));
  const chartW = w - labelW - padX * 2;

  // tooltip
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    rowY: number;
    d: BarDatum;
  } | null>(null);

  const metricLabel: Record<Metric, string> = {
    users_total: "Users (Total)",
    users_active: "Active Users",
    users_inactive: "Inactive Users",
    avg_tasks_per_user: "Avg Tasks / User",
    avg_sessions_per_user: "Avg Sessions / User",
  };

  return (
    <div ref={ref} className="relative w-full" style={{ fontFamily: FONT }}>
      <svg width={w} height={height} role="img" aria-label="Role utilization bar chart">
        {/* rows */}
        {data.map((d, i) => {
          const y = padX + i * (rowH + gap);
          const v = normalize ? (d.valuePct ?? 0) : d.value;
          const barW = (v / maxV) * chartW;

          return (
            <g key={d.key} transform={`translate(0, ${y})`} onMouseLeave={() => setTip(null)}>
              {/* label area */}
              <g>
                {/* role icon + label (HTML-like rendered in SVG) */}
                <foreignObject x={padX} y={4} width={labelW - 12} height={rowH}>
                  <div className="flex items-center gap-2" style={{ fontFamily: FONT }}>
                    <RoleIcon role={d.key} className="h-4 w-4" />
                    <span className="truncate text-[13px] font-medium text-gray-900">{d.label}</span>
                  </div>
                </foreignObject>
              </g>
              {/* bar */}
              <rect
                x={labelW}
                y={0}
                width={barW}
                height={rowH}
                rx={6}
                fill={d.colorFinal}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setTip({
                    x: e.clientX - r.left + 12,
                    y: e.clientY - r.top - 28,
                    rowY: y,
                    d,
                  });
                }}
                onClick={() => onBarClick?.(String(d.key))}
                style={{ cursor: "pointer" }}
              />
              {/* value */}
              <text
                x={labelW + barW + 8}
                y={rowH * 0.66}
                fontSize={12}
                fill={TK.muted}
              >
                {normalize ? `${(d.valuePct ?? 0).toFixed(0)}%` : d.value.toFixed(1).replace(".0", "")}
              </text>
            </g>
          );
        })}
        {/* baseline */}
        <line
          x1={labelW}
          y1={padX / 2}
          x2={labelW}
          y2={height - padX / 2}
          stroke={TK.border}
        />
      </svg>

      {/* smart popover tooltip (single, branded) */}
      {tip && (
        <div
          className="pointer-events-none absolute z-50 w-[280px] rounded-md border bg-white p-3 text-xs shadow-lg"
          style={{
            left: Math.min(tip.x, w - 300),
            top: Math.max(tip.y, 8),
            borderColor: TK.border,
            color: TK.text,
            fontFamily: FONT,
          }}
          role="tooltip"
        >
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: tip.d.colorFinal, boxShadow: `0 0 0 3px ${TK.subtle}` }}
            />
            <RoleIcon role={tip.d.key} className="h-4 w-4" />
            <span>{tip.d.label}</span>
          </div>
          <ul className="space-y-1">
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gray-700" /> Users
              </span>
              <span className="font-semibold">{tip.d.users_total}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: TK.good }} /> Active
              </span>
              <span className="font-semibold">
                {tip.d.users_active} ({fmtPct(tip.d.users_active / Math.max(1, tip.d.users_total))})
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" style={{ color: TK.danger }} /> Inactive
              </span>
              <span className="font-semibold">
                {tip.d.users_inactive} ({fmtPct(tip.d.users_inactive / Math.max(1, tip.d.users_total))})
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-gray-700" /> Avg tasks/user
              </span>
              <span className="font-semibold">{tip.d.avg_tasks_per_user.toFixed(1)}</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" style={{ color: TK.brand }} /> Avg sessions/user
              </span>
              <span className="font-semibold">{tip.d.avg_sessions_per_user.toFixed(1)}</span>
            </li>
            <li className="mt-1 text-[11px] text-gray-500">
              Metric: <b>{metricLabel[metric]}</b>
              {normalize ? " • normalized %" : ""}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── Helpers: dashboard intensity badge ───────────────────────────────── */
function intensityBg(v: number) {
  // v is 0..1
  if (v <= 0) return TK.subtle;
  if (v < 0.33) return `${TK.good}22`;
  if (v < 0.66) return `${TK.warn}22`;
  return `${TK.blue}22`;
}
function intensityDot(v: number) {
  if (v <= 0) return TK.muted;
  if (v < 0.33) return TK.good;
  if (v < 0.66) return TK.warn;
  return TK.blue;
}

/* ───────────────────────────────── Main Section ───────────────────────────────── */
export default function RoleUtilizationBreakdown({
  onDrill,
}: {
  onDrill?: (payload: any) => void;
}) {
  const [mode, setMode] = useState<Mode>("capacity");
  const [metric, setMetric] = useState<Metric>("users_total");
  const [normalize, setNormalize] = useState<boolean>(false);
  const [highlightUnder, setHighlightUnder] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  // data load
  useEffect(() => {
    setLoading(true);
    fetchBreakdown(mode).then((rows) => {
      setBuckets(rows);
      setLoading(false);
    });
  }, [mode]);

  // build chart data
  const visible = useMemo(
    () => buckets.filter((b) => !hidden.includes(String(b.key)) && b.users_total > 0),
    [buckets, hidden]
  );

  const totalForMetric = useMemo(() => {
    if (metric === "avg_tasks_per_user" || metric === "avg_sessions_per_user") return 0;
    return visible.reduce((s, b) => {
      if (metric === "users_total") return s + b.users_total;
      if (metric === "users_active") return s + b.users_active;
      if (metric === "users_inactive") return s + b.users_inactive;
      return s;
    }, 0);
  }, [visible, metric]);

  const data: BarDatum[] = useMemo(() => {
    return visible.map((b) => {
      const colorFinal = b.color || (mode === "role_name" ? hashColor(b.label) : TK.blue);
      const value =
        metric === "users_total"
          ? b.users_total
          : metric === "users_active"
          ? b.users_active
          : metric === "users_inactive"
          ? b.users_inactive
          : metric === "avg_tasks_per_user"
          ? b.avg_tasks_per_user
          : b.avg_sessions_per_user;
      const valuePct =
        normalize && (metric === "users_total" || metric === "users_active" || metric === "users_inactive")
          ? (value / Math.max(1, totalForMetric)) * 100
          : undefined;
      return { ...b, colorFinal, value, valuePct };
    });
  }, [visible, metric, normalize, totalForMetric, mode]);

  // sorting for table
  const [sort, setSort] = useState<{ key: keyof Bucket | "inactive_pct"; dir: "asc" | "desc" }>({
    key: "users_total",
    dir: "desc",
  });

  const sortedTable = useMemo(() => {
    const rows = buckets.map((b) => ({
      ...b,
      inactive_pct: b.users_total ? b.users_inactive / b.users_total : 0,
    }));
    rows.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const va = (a as any)[sort.key];
      const vb = (b as any)[sort.key];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      // tie-breaker: users_total
      if (a.users_total < b.users_total) return 1;
      if (a.users_total > b.users_total) return -1;
      return 0;
    });
    return rows;
  }, [buckets, sort]);

  // export CSV
  function exportCsv() {
    const header = [
      "mode",
      "role_key",
      "label",
      "users_total",
      "users_active",
      "users_inactive",
      "avg_tasks_per_user",
      "avg_sessions_per_user",
      "seo_avg",
      "content_avg",
      "campaign_avg",
      "reporting_avg",
    ];
    const rows = buckets.map((b) => [
      mode,
      b.key,
      `"${b.label.replace(/"/g, '""')}"`,
      b.users_total,
      b.users_active,
      b.users_inactive,
      b.avg_tasks_per_user.toFixed(2),
      b.avg_sessions_per_user.toFixed(2),
      b.dashboards_avg?.seo ?? 0,
      b.dashboards_avg?.content ?? 0,
      b.dashboards_avg?.campaign ?? 0,
      b.dashboards_avg?.reporting ?? 0,
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `role_utilization_${mode}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const gridCols = `minmax(320px, 420px)`;

  return (
    <section
      className="rounded-md border bg-white p-4"
      style={{ borderColor: TK.border, fontFamily: FONT, color: TK.text }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" style={{ color: TK.brand }} />
          <div>
            <h3 className="m-0 text-[16px] font-semibold text-gray-900">Role Utilization Breakdown</h3>
            <div className="text-xs text-gray-500">
              {mode === "capacity" ? "Users per capability (filtered scope)" : "Users per role name (including Custom)"}
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={exportCsv}
            className="inline-flex h-8 items-center gap-2 rounded border px-3 text-sm hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border p-2"
        style={{ borderColor: TK.border, background: TK.subtle }}
      >
        <ChipDropdown label={<span>Group by</span>} active={mode !== "capacity"}>
          <div className="mb-2 text-sm font-medium">Group roles</div>
          {(["capacity", "role_name"] as Mode[]).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
              <input type="radio" checked={mode === m} onChange={() => setMode(m)} />
              <span className="inline-flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5 text-gray-600" />
                {m === "capacity" ? "Capacity" : "Role Name"}
              </span>
            </label>
          ))}
        </ChipDropdown>

        <ChipDropdown label={<span>Metric</span>}>
          <div className="mb-2 text-sm font-medium">Choose metric</div>
          {(
            [
              ["users_total", "Users (Total)"],
              ["users_active", "Active Users"],
              ["users_inactive", "Inactive Users"],
              ["avg_tasks_per_user", "Avg Tasks / User"],
              ["avg_sessions_per_user", "Avg Sessions / User"],
            ] as [Metric, string][]
          ).map(([k, lbl]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
              <input type="radio" checked={metric === k} onChange={() => setMetric(k)} />
              <span className="inline-flex items-center gap-1.5">
                {k === "avg_tasks_per_user" ? (
                  <ClipboardList className="h-3.5 w-3.5 text-gray-600" />
                ) : (
                  <BarChart2 className="h-3.5 w-3.5 text-gray-600" />
                )}
                {lbl}
              </span>
            </label>
          ))}
        </ChipDropdown>

        <div className="ml-1 flex items-center gap-3">
          <Switch
            label="Normalize (%)"
            checked={normalize}
            onChange={(v) => setNormalize(v)}
          />
          <Switch
            label="Highlight underutilized"
            checked={highlightUnder}
            onChange={(v) => setHighlightUnder(v)}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Legend</span>
        {buckets.map((b) => {
          const color = b.color || (mode === "role_name" ? hashColor(b.label) : TK.blue);
          const off = hidden.includes(String(b.key));
          return (
            <LegendChip
              key={b.key}
              color={color}
              label={b.label}
              off={off}
              onClick={() =>
                setHidden((arr) =>
                  off ? arr.filter((k) => k !== b.key) : [...arr, String(b.key)]
                )
              }
            />
          );
        })}
      </div>

      {/* Chart */}
      <div className="mb-3">
        {loading ? (
          <div className="h-[220px] w-full animate-pulse rounded-md" style={{ background: "#F6F8FA" }} />
        ) : data.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-sm text-gray-500" style={{ borderColor: TK.border }}>
            Not enough data.
          </div>
        ) : (
          <HBar data={data} metric={metric} normalize={normalize} onBarClick={(key) => onDrill?.({ type: "role", key })} />
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border" style={{ borderColor: TK.border }}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b" style={{ borderColor: TK.border }}>
              <ThIcon
                icon={<ShieldCheck className="h-4 w-4" style={{ color: TK.brand }} />}
                label="Role"
                sortKey={"label" as any}
                sort={sort}
                onSort={setSort}
              />
              <ThIcon icon={<Users className="h-4 w-4 text-gray-700" />} label="# Users" sortKey="users_total" sort={sort} onSort={setSort} />
              <ThIcon icon={<CheckCircle2 className="h-4 w-4" style={{ color: TK.good }} />} label="# Active" sortKey="users_active" sort={sort} onSort={setSort} />
              <ThIcon icon={<XCircle className="h-4 w-4" style={{ color: TK.danger }} />} label="# Inactive" sortKey="users_inactive" sort={sort} onSort={setSort} />
              <ThIcon icon={<AlertTriangle className="h-4 w-4" style={{ color: TK.warn }} />} label="% Inactive" sortKey={"inactive_pct" as any} sort={sort} onSort={setSort} />
              <ThIcon icon={<ClipboardList className="h-4 w-4 text-gray-700" />} label="Avg Tasks/User" sortKey="avg_tasks_per_user" sort={sort} onSort={setSort} />
              <ThIcon icon={<BarChart2 className="h-4 w-4" style={{ color: TK.brand }} />} label="Avg Sessions/User" sortKey="avg_sessions_per_user" sort={sort} onSort={setSort} />
              <th className="px-3 py-2 text-left">
                <div className="inline-flex items-center gap-1.5">
                  <Search className="h-4 w-4 text-gray-600" /> Dashboards Used (avg)
                </div>
              </th>
              <th className="px-3 py-2 text-left">
                <div className="inline-flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" style={{ color: TK.warn }} /> Suggested Action
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTable.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  No roles match your filters.
                </td>
              </tr>
            )}
            {sortedTable.map((b) => {
              const color = b.color || (mode === "role_name" ? hashColor(b.label) : TK.blue);
              const inactivePct = b.users_total ? b.users_inactive / b.users_total : 0;
              const under =
                highlightUnder &&
                b.users_total > 0 &&
                b.users_active === 0;

              return (
                <tr
                  key={b.key}
                  className="border-b hover:bg-[rgba(16,144,208,0.04)]"
                  style={{ borderColor: TK.border }}
                  onClick={() => onDrill?.({ type: "filter_role", key: b.key, mode })}
                >
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1"
                      style={{ borderColor: TK.border, background: TK.subtle, boxShadow: under ? `inset 0 0 0 2px ${TK.warn}40` : undefined }}
                    >
                      <RoleIcon role={b.key} className="h-4 w-4" />
                      <span className="font-medium text-gray-900">{b.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">{b.users_total}</td>
                  <td className="px-3 py-2">{b.users_active}</td>
                  <td className="px-3 py-2">{b.users_inactive}</td>
                  <td className="px-3 py-2">{fmtPct(inactivePct)}</td>
                  <td className="px-3 py-2">{b.avg_tasks_per_user.toFixed(1)}</td>
                  <td className="px-3 py-2">{b.avg_sessions_per_user.toFixed(1)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <DashPill icon={<Search className="h-3.5 w-3.5" />} label="SEO" v={b.dashboards_avg?.seo ?? 0} />
                      <DashPill icon={<FileText className="h-3.5 w-3.5" />} label="Content" v={b.dashboards_avg?.content ?? 0} />
                      <DashPill icon={<Eye className="h-3.5 w-3.5" />} label="Campaign" v={b.dashboards_avg?.campaign ?? 0} />
                      <DashPill icon={<BarChart2 className="h-3.5 w-3.5" />} label="Reporting" v={b.dashboards_avg?.reporting ?? 0} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {b.suggestion ? (
                      <SuggestChip
                        bucket={b}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDrill?.({ type: "suggestion", bucket_key: b.key, suggestion: b.suggestion?.type });
                        }}
                      />
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Suggestion cards (compact, do not expand to fill) */}
      {buckets.some((b) => b.suggestion) && (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {buckets
            .filter((b) => b.suggestion)
            .slice(0, 6)
            .map((b) => (
              <SuggestionCard key={b.key} bucket={b} onOpen={() => onDrill?.({ type: "filter_role", key: b.key, mode })} onAct={() => onDrill?.({ type: "suggestion", bucket_key: b.key, suggestion: b.suggestion?.type })} />
            ))}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────────────── Small bits ───────────────────────────────── */
function ThIcon({
  icon,
  label,
  sortKey,
  sort,
  onSort,
}: {
  icon: React.ReactNode;
  label: string;
  sortKey: any;
  sort: { key: any; dir: "asc" | "desc" };
  onSort: (s: { key: any; dir: "asc" | "desc" }) => void;
}) {
  const dir = sort.key === sortKey ? sort.dir : null;
  return (
    <th
      className="px-3 py-2 text-left select-none cursor-pointer"
      onClick={() => onSort({ key: sortKey, dir: dir === "asc" ? "desc" : "asc" })}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon} {label}
        <ArrowUpDown className="h-4 w-4 text-gray-400" />
        {dir ? dir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" /> : null}
      </span>
    </th>
  );
}

function DashPill({ icon, label, v }: { icon: React.ReactNode; label: string; v: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: TK.border, background: intensityBg(v) }}
      title={`${label}: ${(v * 100).toFixed(0)}% of users`}
    >
      {icon}
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: intensityDot(v) }} />
      {label}
    </span>
  );
}

function SuggestChip({ bucket, onClick }: { bucket: Bucket; onClick: (e: React.MouseEvent) => void }) {
  const t = bucket.suggestion?.type;
  const meta =
    t === "change_role"
      ? { label: "Change Role", color: TK.warn, icon: <AlertTriangle className="h-3.5 w-3.5" style={{ color: TK.warn }} /> }
      : t === "upgrade"
      ? { label: "Upgrade Role", color: TK.blue, icon: <ArrowUpRight className="h-3.5 w-3.5" style={{ color: TK.blue }} /> }
      : t === "reassign"
      ? { label: "Reassign", color: TK.danger, icon: <Repeat className="h-3.5 w-3.5" style={{ color: TK.danger }} /> }
      : { label: "Investigate", color: TK.brand, icon: <Search className="h-3.5 w-3.5" style={{ color: TK.brand }} /> };

  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: TK.border, background: TK.subtle, color: meta.color }}
      onClick={onClick}
    >
      {meta.icon}
      {meta.label}
    </button>
  );
}

function SuggestionCard({
  bucket,
  onOpen,
  onAct,
}: {
  bucket: Bucket;
  onOpen: () => void;
  onAct: () => void;
}) {
  const t = bucket.suggestion?.type;
  const Icon =
    t === "change_role"
      ? AlertTriangle
      : t === "upgrade"
      ? ArrowUpRight
      : t === "reassign"
      ? Repeat
      : Search;
  const tone =
    t === "change_role" ? TK.warn : t === "upgrade" ? TK.blue : t === "reassign" ? TK.danger : TK.brand;

  return (
    <div
      className="rounded-md border p-3"
      style={{ borderColor: TK.border, background: TK.card }}
    >
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: tone }} />
        <div className="text-sm font-semibold text-gray-900">
          {t === "change_role" && "Inactive Admins detected"}
          {t === "upgrade" && "High‑engagement Viewers"}
          {t === "reassign" && "Reassign Tasks"}
          {t === "investigate" && "Investigate Usage"}
          <span className="ml-1 text-xs text-gray-500">• {bucket.label}</span>
        </div>
      </div>
      <div className="mb-2 text-xs text-gray-600">{bucket.suggestion?.rationale}</div>
      <div className="flex items-center gap-2">
        <SuggestChip bucket={bucket} onClick={(e) => (e.stopPropagation(), onAct())} />
        <button
          className="text-xs font-semibold"
          style={{ color: TK.brand }}
          onClick={onOpen}
        >
          Open table (filtered)
        </button>
      </div>
    </div>
  );
}

