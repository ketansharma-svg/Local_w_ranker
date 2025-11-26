"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import {
  BarChart3,
  Info,
  Download,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  AlertTriangle,
  Activity,
  FileCode,
  ShieldCheck,
  Smartphone,
  Globe,
  Image as ImageIcon,
  Link2,
  Eye,
  ClipboardList,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
  Latest design tokens (kept identical to recent sections)
──────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root {
  --wr-brand: #008CCD;
  --wr-action: #0077FF;
  --wr-pastel: #D9EEF8;
  --wr-text: #111827;
  --wr-muted: #6B7280;
  --wr-border: #E5E7EB;
  --wr-borderLight: #EFF0F6;
  --wr-bg: #F5F7FA;
  --wr-card: #FFFFFF;
  --wr-success: #10B981;
  --wr-warning: #F59E0B;
  --wr-danger:  #EF4444;
  --wr-radius: 10px;
  --wr-shadow-sm: 0 1px 2px rgba(17,24,39,.06);
  --wr-shadow-md: 0 6px 18px rgba(17,24,39,.08);
}

.wr-card {
  background: var(--wr-card);
  border: 1px solid var(--wr-border);
  border-radius: var(--wr-radius);
  box-shadow: var(--wr-shadow-sm);
}
.wr-card-title {
  display:flex;align-items:center;gap:8px;font-weight:600;color:var(--wr-text);font-size:15px;
}
.wr-chip {
  display:inline-flex;align-items:center;gap:6px;
  height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-border);
  background:#fff;font-size:12px;cursor:pointer;
}
.wr-chip[data-active="true"]{
  background: var(--wr-pastel);
  box-shadow: inset 0 0 0 1px var(--wr-brand);
}
.wr-filter-btn {
  height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-border);
  display:inline-flex;align-items:center;gap:8px;background:#fff;font-size:12px;cursor:pointer;
}
.wr-legend-dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
.wr-kpi {
  transition: box-shadow .2s ease, transform .2s ease;
}
.wr-kpi:hover { box-shadow: var(--wr-shadow-md); transform: translateY(-1px); }

/* Table */
table.wr-table { width:100%; border-collapse:separate; border-spacing:0; }
table.wr-table thead th {
  position:sticky; top:0; background:#FAFBFC; z-index:1; font-size:12px; color:var(--wr-muted);
  font-weight:600; border-bottom:1px solid var(--wr-border); padding:10px 8px; text-align:left;
}
table.wr-table tbody td { border-bottom:1px solid var(--wr-border); padding:10px 8px; font-size:13px; }
.sev-chip { font-size:12px; border-radius:999px; padding:2px 8px; border:1px solid transparent; }
.sev-critical { background: rgba(239,68,68,.10); color:#991B1B; border-color:#FCA5A5; }
.sev-major    { background: rgba(245,158,11,.12); color:#92400E; border-color:#FCD34D; }
.sev-minor    { background: rgba(16,185,129,.12); color:#065F46; border-color:#A7F3D0; }

/* Smart popover */
.wr-pop {
  position:absolute; pointer-events:none; background:#fff; color:var(--wr-text);
  border:1px solid var(--wr-border); border-radius:8px; box-shadow:var(--wr-shadow-sm);
  padding:8px 10px; font-size:12px; min-width:160px;
}

/* Inter font stack */
.wr-font { font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif; }
`}</style>
);

/* ────────────────────────────────────────────────────────────────────────────
  Types
──────────────────────────────────────────────────────────────────────────── */
type SeriesPoint = { date: string; value: number };
type Severity = "critical" | "major" | "minor";
type IssueCategory =
  | "content"
  | "performance"
  | "coverage"
  | "schema"
  | "media"
  | "links"
  | "security"
  | "other";

export type AuditSummaryData = {
  pageId: string;
  url: string;
  lastCrawlAt?: string;
  keyIssues: {
    open: number;
    bySeverity: { critical: number; major: number; minor: number };
    trend?: SeriesPoint[];
  };
  cwv: {
    lcp: { p75: number; series?: SeriesPoint[] };
    inp: { p75: number; series?: SeriesPoint[] };
    cls: { p75: number; series?: SeriesPoint[] };
    status: "good" | "needs" | "poor";
  };
  contentHealth: {
    title: { pass: number; warn: number; fail: number };
    h1: { pass: number; warn: number; fail: number };
    body: { pass: number; warn: number; fail: number };
    images: { pass: number; warn: number; fail: number };
    readability: { pass: number; warn: number; fail: number };
  };
  structuredData: {
    types: Array<{ type: string; errors: number; warnings: number }>;
  };
  securityUx: {
    https: boolean;
    mixedContent: boolean;
    safeBrowsing: boolean;
    mobileFriendly: boolean;
  };
  issues: Array<{
    id: string;
    title: string;
    severity: Severity;
    category: IssueCategory;
    affected: number;
    impact: "High" | "Medium" | "Low";
    status: "Open" | "Ignored" | "Resolved";
    quickFix?: "Autofix" | "Guide" | null;
  }>;
};

/* ────────────────────────────────────────────────────────────────────────────
  Utils
──────────────────────────────────────────────────────────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pct = (num: number, den: number) => (den <= 0 ? 0 : Math.round((num / den) * 100));
const cwvTone = (s: AuditSummaryData["cwv"]["status"]) =>
  s === "good" ? "var(--wr-success)" : s === "needs" ? "var(--wr-warning)" : "var(--wr-danger)";

/* ────────────────────────────────────────────────────────────────────────────
  Smart tooltips (recharts)
──────────────────────────────────────────────────────────────────────────── */
const AreaSmartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.stroke || "var(--wr-action)";
  return (
    <div className="wr-pop">
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--wr-muted)]">
        <span className="wr-legend-dot" style={{ background: color }} />
        <span>{label}</span>
      </div>
      <div className="mt-1 font-semibold">{nf(Number(p.value))}</div>
    </div>
  );
};

const DonutSmartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="wr-pop">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="wr-legend-dot" style={{ background: p.color }} />
          <span className="text-[12px] text-[color:var(--wr-muted)]">{p.label || label}</span>
        </div>
        <div className="font-semibold">{nf(p.value)}</div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
  Micro charts
──────────────────────────────────────────────────────────────────────────── */
const TrendArea: React.FC<{ data?: SeriesPoint[]; ariaLabel: string; stroke?: string }> = ({ data, ariaLabel, stroke = "var(--wr-action)" }) => (
  <div className="h-16 w-full" role="img" aria-label={ariaLabel}>
    <ResponsiveContainer>
      <AreaChart data={data ?? []} margin={{ top: 2, left: 0, right: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="wrArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--wr-borderLight)" />
        <XAxis dataKey="date" hide />
        <YAxis hide />
        <Area type="monotone" dataKey="value" stroke={stroke} fill="url(#wrArea)" strokeWidth={2} dot={false} isAnimationActive />
        <RTooltip content={<AreaSmartTooltip />} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

/* — Stacked Donut (Key Issues / Severity) with hover animation — */
const StackedDonut: React.FC<{
  parts: Array<{ key: string; label: string; value: number; color: string }>;
  center: React.ReactNode;
  ariaLabel: string;
}> = ({ parts, center, ariaLabel }) => {
  const [active, setActive] = useState<number | undefined>();
  return (
    <div className="relative" role="img" aria-label={ariaLabel} style={{ width: 130, height: 130 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={parts}
            dataKey="value"
            innerRadius={38}
            outerRadius={56}
            startAngle={90}
            endAngle={-270}
            activeIndex={active}
            activeShape={(props: any) => <Sector {...props} outerRadius={props.outerRadius + 6} />}
            onMouseLeave={() => setActive(undefined)}
            isAnimationActive
          >
            {parts.map((d, i) => (
              <Cell
                key={d.key}
                fill={d.color}
                onMouseEnter={() => setActive(i)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <RTooltip content={<DonutSmartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] font-semibold"
        style={{ color: "var(--wr-text)" }}
      >
        {center}
      </div>
    </div>
  );
};

/* — Interactive stacked bar for Content Health (Pass/Warn/Fail) — */
const HealthStackBar: React.FC<{
  segments: Array<{ label: string; value: number; color: string }>;
}> = ({ segments }) => {
  const total = segments.reduce((a, b) => a + b.value, 0);
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);
  const onEnter = (i: number) => (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setHover({ i, left: e.clientX - rect.left + 10, top: -8 });
  };
  const onLeave = () => setHover(null);

  return (
    <div className="relative">
      <div className="h-3.5 w-full rounded-full border overflow-hidden" style={{ borderColor: "var(--wr-borderLight)" }}>
        <div className="flex h-full w-full">
          {segments.map((s, i) => {
            const w = total <= 0 ? 0 : (s.value / total) * 100;
            const active = hover?.i === i;
            return (
              <div
                key={s.label}
                className="h-full transition-transform"
                style={{
                  width: `${w}%`,
                  background: s.color,
                  transform: active ? "scaleY(1.2)" : "scaleY(1)",
                  transformOrigin: "center",
                  cursor: "pointer",
                }}
                onMouseEnter={onEnter(i)}
                onMouseLeave={onLeave}
              />
            );
          })}
        </div>
      </div>

      {/* Smart popover near pointer (left/right auto handled by parent scroll) */}
      {hover && total > 0 && (
        <div
          className="wr-pop"
          style={{
            left: hover.left,
            top: hover.top,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span
                className="wr-legend-dot"
                style={{ background: segments[hover.i].color }}
              />
              <span className="text-[12px] text-[color:var(--wr-muted)]">
                {segments[hover.i].label}
              </span>
            </div>
            <div className="font-semibold">
              {nf(segments[hover.i].value)} ({pct(segments[hover.i].value, total)}%)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
  Card shell (consistent title top-left + info icon)
──────────────────────────────────────────────────────────────────────────── */
const CardShell: React.FC<{
  icon: React.ReactNode;
  title: string;
  info?: string;
  children: React.ReactNode;
}> = ({ icon, title, info, children }) => (
  <div className="wr-card wr-kpi p-4">
    <div className="flex items-center justify-between">
      <div className="wr-card-title">
        <span className="inline-flex items-center justify-center rounded-md" aria-hidden>
          {icon}
        </span>
        <span>{title}</span>
      </div>
      {info ? (
        <Info
          size={16}
          className="text-[color:var(--wr-muted)] cursor-pointer"
        //   title={info}
        />
      ) : null}
    </div>
    <div className="mt-3">{children}</div>
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
  Category → icon mapping (branded)
──────────────────────────────────────────────────────────────────────────── */
const categoryIcon = (c: IssueCategory) => {
  const common = { size: 16, color: "var(--wr-brand)" } as const;
  switch (c) {
    case "content":
      return <FileCode {...common} />;
    case "performance":
      return <Activity {...common} />;
    case "coverage":
      return <Globe {...common} />;
    case "schema":
      return <FileCode {...common} />;
    case "media":
      return <ImageIcon {...common} />;
    case "links":
      return <Link2 {...common} />;
    case "security":
      return <ShieldCheck {...common} />;
    default:
      return <AlertTriangle {...common} />;
  }
};

/* ────────────────────────────────────────────────────────────────────────────
  Section Component
──────────────────────────────────────────────────────────────────────────── */
export function AuditSummarySection({
  data,
  onOpenAudit,
  onOpenIssue,
  onExport,
  onRecrawl,
  onCreateTask,
}: {
  data: AuditSummaryData;
  onOpenAudit: (opts: {
    anchor: "issues" | "cwv" | "content" | "schema" | "security";
    pageId: string;
  }) => void;
  onOpenIssue: (issueId: string) => void;
  onExport: (fmt: "csv" | "pdf") => void;
  onRecrawl: () => void;
  onCreateTask: () => void;
}) {
  const [cat, setCat] = useState<"all" | IssueCategory>("all");
  const [sevFilter, setSevFilter] = useState<{
    critical: boolean;
    major: boolean;
    minor: boolean;
  }>({ critical: true, major: true, minor: true });

  const issuesFiltered = useMemo(() => {
    const pool = data.issues.filter((i) => i.status === "Open");
    const byCat = cat === "all" ? pool : pool.filter((i) => i.category === cat);
    return byCat.filter((i) => sevFilter[i.severity]);
  }, [data.issues, cat, sevFilter]);

  const totalIssues = data.keyIssues.open;
  const sev = data.keyIssues.bySeverity;
  const sevTotal = sev.critical + sev.major + sev.minor;

  const toggleSev = useCallback(
    (k: keyof typeof sevFilter) =>
      setSevFilter((s) => ({ ...s, [k]: !s[k] })),
    []
  );

  return (
    <>
      <GlobalTokens />
      <section className="wr-font">
        {/* Header */}
        <div className="wr-card p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--wr-text)]">
              <BarChart3 size={18} color="var(--wr-brand)" />
              <span>Audit Summary</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="wr-filter-btn"
                onClick={() => onRecrawl()}
                title="Re‑crawl"
              >
                <RefreshCw size={14} />
                <span>Re‑crawl</span>
              </button>
              <button
                className="wr-filter-btn"
                onClick={() => onExport("csv")}
                title="Export CSV"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
              <button
                className="wr-filter-btn"
                onClick={() => onExport("pdf")}
                title="Export PDF"
              >
                <Download size={14} />
                <span>PDF</span>
              </button>
              <button
                className="wr-filter-btn"
                onClick={() => onCreateTask()}
                title="Create Task"
              >
                <PlusCircle size={14} />
                <span>Create Task</span>
              </button>
              <button
                className="wr-filter-btn"
                onClick={() => onOpenAudit({ anchor: "issues", pageId: data.pageId })}
                title="Open Page Audit"
              >
                <ExternalLink size={14} />
                <span>Open Audit</span>
              </button>
            </div>
          </div>

          {/* Modern chips row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(
              [
                { k: "all", label: "All" },
                { k: "content", label: "Content" },
                { k: "performance", label: "Performance" },
                { k: "coverage", label: "Coverage" },
                { k: "schema", label: "Schema" },
                { k: "media", label: "Media" },
                { k: "links", label: "Links" },
                { k: "security", label: "Security" },
              ] as { k: "all" | IssueCategory; label: string }[]
            ).map((t) => (
              <button
                key={t.k}
                className="wr-chip"
                data-active={cat === t.k}
                onClick={() => setCat(t.k)}
                title={t.label}
              >
                {categoryIcon((t.k as IssueCategory) || "content")}
                <span>{t.label}</span>
              </button>
            ))}

            <span className="ml-auto inline-flex items-center gap-2">
              <button
                className="wr-chip"
                data-active={sevFilter.critical}
                onClick={() => toggleSev("critical")}
                title="Critical"
              >
                <span className="wr-legend-dot" style={{ background: "var(--wr-danger)" }} />
                Critical
              </button>
              <button
                className="wr-chip"
                data-active={sevFilter.major}
                onClick={() => toggleSev("major")}
                title="Major"
              >
                <span className="wr-legend-dot" style={{ background: "var(--wr-warning)" }} />
                Major
              </button>
              <button
                className="wr-chip"
                data-active={sevFilter.minor}
                onClick={() => toggleSev("minor")}
                title="Minor"
              >
                <span className="wr-legend-dot" style={{ background: "var(--wr-success)" }} />
                Minor
              </button>
            </span>
          </div>
        </div>

        {/* Cards Grid — removed Indexability & Coverage as requested */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {/* Key Issues (Open) */}
          <CardShell
            icon={<AlertTriangle size={18} color="var(--wr-brand)" />}
            title="Key Issues"
            info="Open audit issues by severity and trend"
          >
            <div className="grid grid-cols-[auto,1fr] gap-3 items-center">
              <StackedDonut
                ariaLabel="Issues by severity"
                parts={[
                  { key: "critical", label: "Critical", value: sev.critical, color: "var(--wr-danger)" },
                  { key: "major", label: "Major", value: sev.major, color: "var(--wr-warning)" },
                  { key: "minor", label: "Minor", value: sev.minor, color: "var(--wr-success)" },
                ]}
                center={
                  <div className="text-center">
                    <div className="text-[16px] font-bold">{nf(totalIssues)}</div>
                    <div className="text-[11px] text-[color:var(--wr-muted)]">open</div>
                  </div>
                }
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="wr-chip cursor-default">
                    <span className="wr-legend-dot" style={{ background: "var(--wr-danger)" }} /> Critical · {nf(sev.critical)} ({pct(sev.critical, sevTotal)}%)
                  </span>
                  <span className="wr-chip cursor-default">
                    <span className="wr-legend-dot" style={{ background: "var(--wr-warning)" }} /> Major · {nf(sev.major)} ({pct(sev.major, sevTotal)}%)
                  </span>
                  <span className="wr-chip cursor-default">
                    <span className="wr-legend-dot" style={{ background: "var(--wr-success)" }} /> Minor · {nf(sev.minor)} ({pct(sev.minor, sevTotal)}%)
                  </span>
                </div>
                <TrendArea data={data.keyIssues.trend} ariaLabel="Issues trend" />
              </div>
            </div>
          </CardShell>

          {/* CWV Performance */}
          <CardShell
            icon={<Activity size={18} color="var(--wr-brand)" />}
            title="CWV Performance"
            info="P75 for LCP / INP / CLS (field data)"
          >
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[12px] text-[color:var(--wr-muted)]">LCP (s)</div>
                <div className="text-[18px] font-semibold text-[color:var(--wr-action)]">
                  {(data.cwv.lcp.p75 / 1000).toFixed(2)}
                </div>
                <TrendArea data={data.cwv.lcp.series} ariaLabel="LCP trend" />
              </div>
              <div>
                <div className="text-[12px] text-[color:var(--wr-muted)]">INP (ms)</div>
                <div className="text-[18px] font-semibold text-[color:var(--wr-action)]">
                  {data.cwv.inp.p75}
                </div>
                <TrendArea data={data.cwv.inp.series} ariaLabel="INP trend" />
              </div>
              <div>
                <div className="text-[12px] text-[color:var(--wr-muted)]">CLS</div>
                <div className="text-[18px] font-semibold text-[color:var(--wr-action)]">
                  {data.cwv.cls.p75.toFixed(3)}
                </div>
                <TrendArea data={data.cwv.cls.series} ariaLabel="CLS trend" />
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded-full border text-[12px]"
                style={{ color: cwvTone(data.cwv.status), borderColor: cwvTone(data.cwv.status) }}
              >
                {data.cwv.status === "good" ? "Good" : data.cwv.status === "needs" ? "Needs Improvement" : "Poor"}
              </span>
            </div>
          </CardShell>

          {/* Content Health (stacked bars) */}
          <CardShell
            icon={<FileCode size={18} color="var(--wr-brand)" />}
            title="Content Health"
            info="Pass / Warn / Fail split across key checks"
          >
            {(
              [
                { k: "title", label: "Title", d: data.contentHealth.title },
                { k: "h1", label: "H1", d: data.contentHealth.h1 },
                { k: "body", label: "Body", d: data.contentHealth.body },
                { k: "images", label: "Images", d: data.contentHealth.images },
                { k: "readability", label: "Readability", d: data.contentHealth.readability },
              ] as const
            ).map((row) => {
              const total = row.d.pass + row.d.warn + row.d.fail;
              return (
                <div key={row.k} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-[color:var(--wr-muted)]">{row.label}</span>
                    <span className="font-medium">{pct(row.d.pass, total)}% pass</span>
                  </div>
                  <HealthStackBar
                    segments={[
                      { label: "Pass", value: row.d.pass, color: "var(--wr-success)" },
                      { label: "Warn", value: row.d.warn, color: "var(--wr-warning)" },
                      { label: "Fail", value: row.d.fail, color: "var(--wr-danger)" },
                    ]}
                  />
                </div>
              );
            })}
          </CardShell>

          {/* Structured Data */}
          <CardShell
            icon={<FileCode size={18} color="var(--wr-brand)" />}
            title="Structured Data"
            info="Detected schema types with errors/warnings"
          >
            <div className="flex flex-wrap gap-2">
              {data.structuredData.types.length ? (
                data.structuredData.types.map((t) => (
                  <span key={t.type} className="wr-chip cursor-default">
                    <FileCode size={14} color="var(--wr-brand)" />
                    {t.type}
                    <span className="wr-chip cursor-default" style={{ borderColor: "#FCA5A5", color: "#991B1B" }}>
                      E: {t.errors}
                    </span>
                    <span className="wr-chip cursor-default" style={{ borderColor: "#FCD34D", color: "#92400E" }}>
                      W: {t.warnings}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-[color:var(--wr-muted)]">No structured data detected.</span>
              )}
            </div>
          </CardShell>

          {/* Security & UX */}
          <CardShell
            icon={<ShieldCheck size={18} color="var(--wr-brand)" />}
            title="Security & UX"
            info="HTTPS, Mixed content, Safe‑Browsing, Mobile friendly"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: "var(--wr-border)" }}>
                <ShieldCheck size={16} color="var(--wr-brand)" />
                <span className="text-[13px]">HTTPS</span>
                <span className="ml-auto">{data.securityUx.https ? "✅" : "❌"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: "var(--wr-border)" }}>
                <Link2 size={16} color="var(--wr-brand)" />
                <span className="text-[13px]">No Mixed Content</span>
                <span className="ml-auto">{!data.securityUx.mixedContent ? "✅" : "❌"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: "var(--wr-border)" }}>
                <Globe size={16} color="var(--wr-brand)" />
                <span className="text-[13px]">Safe‑Browsing</span>
                <span className="ml-auto">{data.securityUx.safeBrowsing ? "✅" : "❌"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: "var(--wr-border)" }}>
                <Smartphone size={16} color="var(--wr-brand)" />
                <span className="text-[13px]">Mobile Friendly</span>
                <span className="ml-auto">{data.securityUx.mobileFriendly ? "✅" : "❌"}</span>
              </div>
            </div>
          </CardShell>
        </div>

        {/* Audit List / Table */}
        <div className="wr-card mt-4 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[color:var(--wr-text)]">Audit List</span>
              <span className="wr-chip cursor-default">Open · {nf(issuesFiltered.length)}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="wr-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Severity</th>
                  <th>Issue</th>
                  <th style={{ width: 160 }}>Category</th>
                  <th style={{ width: 140 }}>Affected</th>
                  <th style={{ width: 120 }}>Impact</th>
                  <th style={{ width: 110 }}>Status</th>
                  <th style={{ width: 120 }}>Quick&nbsp;Fix</th>
                  <th style={{ width: 200 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issuesFiltered.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span
                        className={`sev-chip ${
                          i.severity === "critical" ? "sev-critical" : i.severity === "major" ? "sev-major" : "sev-minor"
                        }`}
                      >
                        {i.severity}
                      </span>
                    </td>
                    {/* clickable issue type/title */}
                    <td>
                      <button
                        className="text-[color:var(--wr-action)] hover:underline cursor-pointer font-semibold"
                        onClick={() => onOpenIssue(i.id)}
                        title="Open issue details"
                      >
                        {i.title}
                      </button>
                    </td>
                    <td className="capitalize">
                      <div className="flex items-center gap-2">
                        {categoryIcon(i.category)}
                        <span className="text-[13px]">{i.category}</span>
                      </div>
                    </td>
                    <td>{nf(i.affected)} elements</td>
                    <td className={i.impact === "High" ? "text-red-700" : i.impact === "Medium" ? "text-amber-700" : "text-emerald-700"}>
                      {i.impact}
                    </td>
                    <td>{i.status}</td>
                    <td>
                      {i.quickFix ? (
                        <span className="wr-chip cursor-default">{i.quickFix}</span>
                      ) : (
                        <span className="text-[color:var(--wr-muted)]">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="h-8 px-2 rounded-md border hover:bg-[#F7FAFC] cursor-pointer inline-flex items-center gap-2"
                          style={{ borderColor: "var(--wr-borderLight)" }}
                          onClick={() => onOpenIssue(i.id)}
                          title="View"
                        >
                          <Eye size={16} color="var(--wr-brand)" />
                          <span className="text-[12px]">View</span>
                        </button>
                        <button
                          className="h-8 px-2 rounded-md border hover:bg-[#F7FAFC] cursor-pointer inline-flex items-center gap-2"
                          style={{ borderColor: "var(--wr-borderLight)" }}
                          onClick={onCreateTask}
                          title="Create Task"
                        >
                          <ClipboardList size={16} color="var(--wr-brand)" />
                          <span className="text-[12px]">Task</span>
                        </button>
                        <button
                          className="h-8 px-2 rounded-md border hover:bg-[#F7FAFC] cursor-pointer inline-flex items-center gap-2"
                          style={{ borderColor: "var(--wr-borderLight)" }}
                          onClick={() => onOpenAudit({ anchor: "issues", pageId: data.pageId })}
                          title="Open in Audit"
                        >
                          <ExternalLink size={16} color="var(--wr-brand)" />
                          <span className="text-[12px]">Audit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {issuesFiltered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-[color:var(--wr-muted)] py-6">
                      No open issues for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
  Mock (optional) — remove in production
──────────────────────────────────────────────────────────────────────────── */
const toISO = (d: Date) => d.toISOString().slice(0, 10);
export function createMockAuditSummary(): AuditSummaryData {
  const days = 14;
  const mk = (start: number, amp = 10) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return { date: toISO(d), value: Math.max(0, Math.round(start + Math.sin(i / 2) * amp)) };
    });

  return {
    pageId: "p1",
    url: "https://example.com/page",
    keyIssues: {
      open: 23,
      bySeverity: { critical: 4, major: 9, minor: 10 },
      trend: mk(20, 3),
    },
    cwv: {
      lcp: { p75: 2300, series: mk(2200, 80) },
      inp: { p75: 210, series: mk(200, 20) },
      cls: { p75: 0.09, series: mk(0.1, 0.02) },
      status: "needs",
    },
    contentHealth: {
      title: { pass: 18, warn: 1, fail: 0 },
      h1: { pass: 15, warn: 3, fail: 1 },
      body: { pass: 14, warn: 4, fail: 1 },
      images: { pass: 12, warn: 6, fail: 1 },
      readability: { pass: 10, warn: 6, fail: 3 },
    },
    structuredData: {
      types: [
        { type: "Article", errors: 0, warnings: 1 },
        { type: "BreadcrumbList", errors: 0, warnings: 0 },
        { type: "FAQPage", errors: 2, warnings: 0 },
      ],
    },
    securityUx: {
      https: true,
      mixedContent: false,
      safeBrowsing: true,
      mobileFriendly: true,
    },
    issues: [
      { id: "I-1001", title: "Multiple H1 tags detected", severity: "major", category: "content", affected: 3, impact: "Medium", status: "Open", quickFix: "Guide" },
      { id: "I-1002", title: "LCP above 2.5s on mobile", severity: "critical", category: "performance", affected: 5, impact: "High", status: "Open", quickFix: "Guide" },
      { id: "I-1003", title: "Blocked by robots.txt", severity: "critical", category: "coverage", affected: 2, impact: "High", status: "Open", quickFix: null },
      { id: "I-1004", title: "Missing alt attributes on images", severity: "minor", category: "media", affected: 14, impact: "Low", status: "Open", quickFix: "Autofix" },
      { id: "I-1005", title: "BreadcrumbList invalid itemListElement", severity: "major", category: "schema", affected: 1, impact: "Medium", status: "Open", quickFix: "Guide" },
      { id: "I-1006", title: "Too many outlinks in body", severity: "minor", category: "links", affected: 1, impact: "Low", status: "Open", quickFix: null },
      { id: "I-1007", title: "INP over 200ms on mobile", severity: "major", category: "performance", affected: 4, impact: "Medium", status: "Open", quickFix: "Guide" },
      { id: "I-1008", title: "Non‑mobile friendly viewport", severity: "critical", category: "security", affected: 1, impact: "High", status: "Open", quickFix: null },
    ],
  };
}

/* ────────────────────────────────────────────────────────────────────────────
  Demo wrapper (optional) — remove in production
──────────────────────────────────────────────────────────────────────────── */
export default function DemoAuditSummary() {
  const data = useMemo(() => createMockAuditSummary(), []);
  return (
    <div className="wr-font" style={{ background: "var(--wr-bg)" }}>
      <div className="w-full mx-auto mt-4">
        <AuditSummarySection
          data={data}
          onOpenAudit={({ anchor }) => console.log("Open Audit →", anchor)}
          onOpenIssue={(id) => console.log("Open Issue →", id)}
          onExport={(fmt) => console.log("Export:", fmt)}
          onRecrawl={() => console.log("Recrawl")}
          onCreateTask={() => console.log("Create Task")}
        />
      </div>
    </div>
  );
}
