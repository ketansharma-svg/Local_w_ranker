"use client";

/* =============================================================================
   Wranker — Page Insights · Page Analyzer Drawer
   Tab 1 · Overview — Section 6: Backlinks Overview (Redesigned + Refinements)
   -----------------------------------------------------------------------------
   Refinements delivered:
   1) KPI trend charts are clipped inside the card (no overflow outside borders).
      - Card shell now uses `overflow-hidden`
      - Trend wrapper also uses `overflow-hidden` and a rounded container
   2) Big donut smart popover (Link Types & Top Anchors) is now near the cursor
      and uses colored dot annotations. It uses a real container ref for coords.
   ============================================================================ */

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";
import { createPortal } from "react-dom";
import {
  Info,
  Download,
  BarChart3,
  Globe,
  Link as LinkIcon,
  ArrowRightLeft,
  ShieldAlert,
  Award,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ----------------------------------------------------------------------------- */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  panel: "#FFFFFF",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toDateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const downloadText = (name: string, text: string, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ----------------------------------------------------------------------------- */
/* UI PRIMITIVES */
function Tip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-1 rounded hover:bg-gray-50"
        aria-label="Info"
        style={{ cursor: "pointer" }}
      >
        <Info size={16} color={TK.muted} />
      </button>
      {open && (
        <div
          className="absolute z-10 top-6 left-0 max-w-xs rounded border bg-white p-2 text-xs shadow"
          style={{ borderColor: TK.border, color: TK.text }}
          role="tooltip"
        >
          {text}
        </div>
      )}
    </span>
  );
}

function Segmented({
  value,
  items,
  onChange,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
      role="tablist"
      aria-label="Date range"
    >
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-8 px-3 text-sm rounded-full transition",
            value === it.value ? "bg-[#D9EEF8] font-medium" : "hover:bg-gray-100"
          )}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp" | "pt";
  invert?: boolean;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TK.muted }}>
        <Minus size={14} /> —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TK.muted : good ? TK.success : TK.danger;
  const label =
    unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pt"
      ? `${Math.abs(delta).toFixed(1)}`
      : intFmt.format(Math.round(Math.abs(delta)));

  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

/* ----------------------------------------------------------------------------- */
/* PORTALED SMART POPOVERS */
function PortalTooltipShell({
  x,
  y,
  width = 260,
  children,
}: {
  x: number;
  y: number;
  width?: number;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none", isolation: "isolate" }}>
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{ background: "#fff", border: `1px solid ${TK.border}`, color: TK.text, borderRadius: 6 }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function TrendPortalContent({
  active,
  label,
  payload,
  coordinate,
  containerRect,
  nameMap,
  valueFmt,
  asShare = false,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
  asShare?: boolean;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const rows = (payload ?? []) as Array<{ name: string; value: number; color: string }>;
  const total = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  const fmt = valueFmt ?? ((v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v))));
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? toDateLabel(label) : String(label)}
      </div>
      {!asShare && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px]" style={{ color: TK.muted }}>
            Total
          </span>
          <span className="font-semibold">{intFmt.format(Math.round(total))}</span>
        </div>
      )}
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: TK.muted }}>{nameMap?.[p.name] ?? p.name}</span>
            </div>
            <div className="font-semibold">{fmt(Number(p.value))}</div>
          </div>
        ))}
      </div>
    </PortalTooltipShell>
  );
}

/* Donut list popover (small donuts in KPI cards) */
function DonutPortalContent({
  active,
  coordinate,
  containerRect,
  payload,
  parts,
  nameMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  payload?: any[];
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  const hoveredName = payload?.[0]?.name as string | undefined;

  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const isActive = p.name === hoveredName;
          return (
            <div
              key={i}
              className={cn("flex items-center justify-between gap-6 rounded px-1 py-0.5", isActive && "bg-[rgba(0,0,0,0.03)]")}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className={cn(isActive ? "font-semibold" : "")} style={{ color: TK.muted }}>
                  {nameMap?.[p.name] ?? p.name}
                </span>
              </div>
              <div className={cn("font-semibold", isActive && "text-[color:var(--focus,#0077FF)]")}>
                {fmt(Number(p.value))}
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

/* Big donut single-slice popover (near cursor + colored dot) */
function DonutSinglePortalContent({
  active,
  coordinate,
  containerRect,
  payload,
  nameMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  payload?: any[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate || !payload?.length) return null;
  // Near-cursor placement
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const row = payload[0];
  const color = row?.color;
  const name = row?.name;
  const value = Number(row?.value || 0);
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));

  return (
    <PortalTooltipShell x={x} y={y} width={220}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          <span className="font-medium" style={{ color: TK.muted }}>
            {nameMap?.[name] ?? name}
          </span>
        </div>
        <div className="font-semibold">{fmt(value)}</div>
      </div>
    </PortalTooltipShell>
  );
}

/* ----------------------------------------------------------------------------- */
/* STACKED DONUT + TREND (shared) */
type Row = { t: string } & Record<string, any>;
function to100(rows: Row[], keys: string[]) {
  return rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });
}
function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

function StackedDonut({
  parts,
  size = 92,
  nameMap,
  valueFmt,
}: {
  parts: { key: string; name: string; value: number; color: string }[];
  size?: number;
  nameMap?: Record<string, string>;
  valueFmt?: (n: number) => string;
}) {
  const data = parts.filter((p) => (p.value ?? 0) > 0).map((p) => ({ ...p, v: p.value }));
  const [active, setActive] = React.useState<number | undefined>(undefined);
  const ref = React.useRef<HTMLDivElement | null>(null);
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={(tp: any) => (
              <DonutPortalContent
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={data}
                nameMap={nameMap}
                valueFmt={valueFmt}
              />
            )}
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            cursor={false}
          />
          <Pie
            data={data}
            dataKey="v"
            nameKey="name"
            innerRadius={Math.round(size / 2) - 22}
            outerRadius={Math.round(size / 2) - 10}
            startAngle={90}
            endAngle={-270}
            paddingAngle={1}
            activeIndex={active}
            activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: any) => (
              <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 4}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}
              />
            )}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            isAnimationActive
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="#fff" strokeWidth={1} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendStack({
  rows,
  keys,
  colors,
  names,
  mode,
  share,
}: {
  rows: Row[];
  keys: string[];
  colors: Record<string, string>;
  names: Record<string, string>;
  mode: "area" | "bars";
  share: boolean;
}) {
  const data = share ? to100(rows, keys) : rows;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (share ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[160px]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area key={k} type="monotone" dataKey={k} stackId="a" stroke={colors[k]} fill={colors[k]} fillOpacity={0.25} strokeWidth={2} dot={false} />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={share ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={share}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={colors[k]} radius={i === keys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ----------------------------------------------------------------------------- */
/* CARD SHELL (trend now fully clipped within the card) */
function KpiCard({
  title,
  glyph,
  info,
  donut,
  value,
  valueFmt,
  delta,
  deltaUnit,
  invert,
  trend,
  onClick,
}: {
  title: string;
  glyph: React.ReactNode;
  info?: string;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp" | "pt";
  invert?: boolean;
  trend: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left cursor-pointer"
      aria-label={`${title} card`}
      style={{ cursor: "pointer" }}
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2 focus-within:ring-[#0077FF]/40 overflow-hidden"
        style={{ borderColor: TK.border }}
      >
        <div className="mb-2 flex items-center gap-2 min-w-0">
          {glyph}
          <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
            {title}
          </div>
          {info ? <Tip text={info} /> : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[120px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta} unit={deltaUnit} invert={invert} />
            </div>
          </div>
          {/* Trend wrapper clipped to card borders */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="rounded-md overflow-hidden">{trend}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ----------------------------------------------------------------------------- */
/* DEMO DATA */
type BLPoint = {
  date: string;
  newLinks: number;
  lostLinks: number;
  linksTotal: number;
  newDomains: number;
  refDomainsTotal: number;
  toxic: number;
  aqs: number;
};
type AnchorRow = { anchor: string; count: number };
type RefDomain = { domain: string; wr: number; links: number; dofollowShare: number; firstSeen: string; lastSeen: string };

function lastNDates(n: number) {
  const a: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    a.push(d.toISOString().slice(0, 10));
  }
  return a;
}

function makeBacklinksDemo(days = 180) {
  const dates = lastNDates(days);
  let linksTotal = 2300;
  let refDomTotal = 360;

  const series: BLPoint[] = dates.map((d, i) => {
    const season = 1 + 0.1 * Math.sin(i / 5) + 0.05 * Math.cos(i / 7);
    const newLinks = Math.max(2, Math.round(18 * season + (Math.random() - 0.5) * 10));
    const lostLinks = Math.max(1, Math.round(10 * season * 0.6 + (Math.random() - 0.5) * 6));
    linksTotal = Math.max(0, linksTotal + newLinks - lostLinks);

    const newDomains = Math.max(0, Math.round(newLinks * (0.28 + Math.sin(i / 6) * 0.06 + (Math.random() - 0.5) * 0.06)));
    refDomTotal += newDomains;

    const toxic = Math.max(0, Math.round(newLinks * (0.24 + Math.sin(i / 9) * 0.06)));
    const aqs = Math.max(38, Math.min(92, Math.round(62 + Math.sin(i / 8) * 6 + (Math.random() - 0.5) * 4)));

    return { date: d, newLinks, lostLinks, linksTotal, newDomains, refDomainsTotal: refDomTotal, toxic, aqs };
  });

  const linkTypeShare = [
    { key: "text", label: "Text", value: 0.76, color: "#3B82F6" },
    { key: "image", label: "Image", value: 0.17, color: "#10B981" },
    { key: "redirect", label: "Redirect", value: 0.07, color: "#F59E0B" },
  ];
  const anchors: AnchorRow[] = [
    { anchor: "seo guide", count: 122 },
    { anchor: "brand name", count: 96 },
    { anchor: "learn more", count: 74 },
    { anchor: "click here", count: 51 },
    { anchor: "wranker", count: 44 },
    { anchor: "canonical", count: 33 },
    { anchor: "rank tracker", count: 31 },
    { anchor: "homepage", count: 27 },
  ];
  const refDomains: RefDomain[] = [
    { domain: "example.com", wr: 72, links: 181, dofollowShare: 0.82, firstSeen: dates[dates.length - 30], lastSeen: dates[dates.length - 1] },
    { domain: "partner.io", wr: 64, links: 143, dofollowShare: 0.71, firstSeen: dates[dates.length - 40], lastSeen: dates[dates.length - 1] },
    { domain: "docs.dev", wr: 58, links: 98, dofollowShare: 0.66, firstSeen: dates[dates.length - 35], lastSeen: dates[dates.length - 2] },
    { domain: "blogsite.net", wr: 49, links: 77, dofollowShare: 0.61, firstSeen: dates[dates.length - 50], lastSeen: dates[dates.length - 3] },
    { domain: "catalog.org", wr: 67, links: 69, dofollowShare: 0.75, firstSeen: dates[dates.length - 28], lastSeen: dates[dates.length - 1] },
    { domain: "resourcehub.io", wr: 55, links: 62, dofollowShare: 0.63, firstSeen: dates[dates.length - 60], lastSeen: dates[dates.length - 5] },
  ];

  return { series, linkTypeShare, anchors, refDomains };
}

/* ----------------------------------------------------------------------------- */
/* SPLIT HELPERS / SPECS */
type SP = { t: string; v: number };
type SplitSpec = { key: string; label: string; baseShare: number };

function splitSeries(total: SP[], parts: SplitSpec[], jitter = 0.06): Row[] {
  return total.map((p, i) => {
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const j = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, j);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    const out: any = { t: p.t };
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(p.v * (shares[sp.key] / sum)))));
    return out as Row;
  });
}

const AUTH: SplitSpec[] = [
  { key: "high", label: "High Authority", baseShare: 0.22 },
  { key: "mid", label: "Mid Authority", baseShare: 0.38 },
  { key: "low", label: "Low Authority", baseShare: 0.28 },
  { key: "new", label: "New/Unrated", baseShare: 0.12 },
];
const AUTH_COLORS: Record<string, string> = { high: "#34D399", mid: "#60A5FA", low: "#F59E0B", new: "#A3A3A3" };
const AUTH_NAMES = { high: "High Authority", mid: "Mid Authority", low: "Low Authority", new: "New/Unrated" };

const LINK_TYPES: SplitSpec[] = [
  { key: "text", label: "Text", baseShare: 0.76 },
  { key: "image", label: "Image", baseShare: 0.17 },
  { key: "redirect", label: "Redirect", baseShare: 0.07 },
];
const LINK_COLORS: Record<string, string> = { text: "#3B82F6", image: "#10B981", redirect: "#F59E0B" };
const LINK_NAMES = { text: "Text", image: "Image", redirect: "Redirect" };

const RISK_COLORS: Record<string, string> = { risk_high: TK.danger, risk_med: TK.warn, risk_low: TK.gray };
const RISK_NAMES = { risk_high: "High Risk", risk_med: "Medium Risk", risk_low: "Low/Suspicious" };

const AQS_COLORS: Record<string, string> = { aqs_90_100: TK.success, aqs_75_89: "#60A5FA", aqs_50_74: TK.warn, aqs_lt_50: TK.danger };
const AQS_NAMES = { aqs_90_100: "90–100", aqs_75_89: "75–89", aqs_50_74: "50–74", aqs_lt_50: "<50" };

function riskRows(toxicSP: SP[]): Row[] {
  return toxicSP.map((p, i) => {
    const base = Math.max(0, p.v);
    const high = Math.max(0, Math.round(base * (0.26 + Math.sin(i * 0.21) * 0.05)));
    const med = Math.max(0, Math.round(base * (0.48 + Math.cos(i * 0.19) * 0.05)));
    let low = base - high - med;
    if (low < 0) low = 0;
    return { t: p.t, risk_high: high, risk_med: med, risk_low: low };
  });
}

function aqsShares(avg: number) {
  const x = Math.max(0, Math.min(1, avg / 100));
  const ex = clamp01((x - 0.85) / 0.15);
  const good = clamp01(0.65 - Math.abs(x - 0.80) * 2.0);
  const fair = clamp01(0.55 - Math.abs(x - 0.65) * 1.8);
  const poor = clamp01(0.40 - x * 0.7);
  let s = ex + good + fair + poor;
  if (s <= 0) s = 1;
  return { aqs_90_100: ex / s, aqs_75_89: good / s, aqs_50_74: fair / s, aqs_lt_50: poor / s };
}
function aqsBucketRows(aqsSP: SP[], baselineSP: SP[]): Row[] {
  const n = Math.min(aqsSP.length, baselineSP.length);
  const out: Row[] = [];
  for (let i = 0; i < n; i++) {
    const avg = aqsSP[i].v || 0;
    const base = Math.max(50, Math.round(baselineSP[i].v * 0.08));
    const w = aqsShares(avg);
    const a = Math.round(base * w.aqs_90_100);
    const b = Math.round(base * w.aqs_75_89);
    const c = Math.round(base * w.aqs_50_74);
    const d = Math.max(0, base - a - b - c);
    out.push({ t: aqsSP[i].t, aqs_90_100: a, aqs_75_89: b, aqs_50_74: c, aqs_lt_50: d }as unknown as Row);
  }
  return out;
}

/* ----------------------------------------------------------------------------- */
/* MAIN */
type RangeKey = "7d" | "30d" | "90d" | "180d";

export default function BacklinksOverviewSection() {
  const [range, setRange] = React.useState<RangeKey>("30d");
  const [shareMode, setShareMode] = React.useState(false);

  const DEMO = React.useMemo(() => makeBacklinksDemo(180), []);
  const seriesAll = DEMO.series;

  const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 180;
  const startIdx = Math.max(0, seriesAll.length - rangeDays);
  const prevStartIdx = Math.max(0, startIdx - rangeDays);

  const curr = seriesAll.slice(startIdx);
  const prev = seriesAll.slice(prevStartIdx, startIdx);

  /* Core SP */
  const BL_SP: SP[] = seriesAll.map((p) => ({ t: p.date, v: p.linksTotal }));
  const RD_SP: SP[] = seriesAll.map((p) => ({ t: p.date, v: p.refDomainsTotal }));
  const TOXIC_SP: SP[] = seriesAll.map((p) => ({ t: p.date, v: p.toxic }));
  const AQS_SP: SP[] = seriesAll.map((p) => ({ t: p.date, v: p.aqs }));

  /* KPI rows */
  const rdAuthRows = React.useMemo(() => splitSeries(RD_SP, AUTH, 0.06), []);
  const blTypeRows = React.useMemo(() => splitSeries(BL_SP, LINK_TYPES, 0.04), []);
  const gainLostRows: Row[] = React.useMemo(
    () =>
      seriesAll.map((p) => ({
        t: p.date,
        gain: p.newLinks,
        lost: p.lostLinks,
      })),
    [seriesAll]
  );
  const toxicRows = React.useMemo(() => riskRows(TOXIC_SP), []);
  const aqsRows = React.useMemo(() => aqsBucketRows(AQS_SP, BL_SP), []);

  /* Snapshot parts */
  const rdParts = lastParts(rdAuthRows, ["high", "mid", "low", "new"], AUTH_COLORS);
  const blParts = lastParts(blTypeRows, ["text", "image", "redirect"], LINK_COLORS);
  const toxicParts = lastParts(toxicRows, ["risk_high", "risk_med", "risk_low"], RISK_COLORS);
  const aqsParts = lastParts(aqsRows, ["aqs_90_100", "aqs_75_89", "aqs_50_74", "aqs_lt_50"], AQS_COLORS);

  const gainSum = curr.reduce((a, b) => a + b.newLinks, 0);
  const lostSum = curr.reduce((a, b) => a + b.lostLinks, 0);
  const gainLostParts = [
    { key: "gain", name: "gain", value: gainSum, color: TK.success },
    { key: "lost", name: "lost", value: lostSum, color: TK.danger },
  ];

  /* Values + deltas */
  const lastBL = curr.length ? curr[curr.length - 1].linksTotal : 0;
  const prevBL = prev.length ? prev[prev.length - 1].linksTotal : (seriesAll[startIdx - 1]?.linksTotal ?? 0);
  const dBLPct = prevBL > 0 ? ((lastBL - prevBL) / prevBL) * 100 : 0;

  const lastRD = curr.length ? curr[curr.length - 1].refDomainsTotal : 0;
  const prevRD = prev.length ? prev[prev.length - 1].refDomainsTotal : (seriesAll[startIdx - 1]?.refDomainsTotal ?? 0);
  const dRDPct = prevRD > 0 ? ((lastRD - prevRD) / prevRD) * 100 : 0;

  const netCurr = gainSum - lostSum;
  const netPrev = prev.reduce((a, b) => a + b.newLinks - b.lostLinks, 0);
  const dNet = netCurr - netPrev;

  const toxCurr = curr.reduce((a, b) => a + b.toxic, 0);
  const toxPrev = prev.reduce((a, b) => a + b.toxic, 0);
  const dToxPct = toxPrev > 0 ? ((toxCurr - toxPrev) / toxPrev) * 100 : 0;

  const aqsCurr = curr.length ? curr[curr.length - 1].aqs : 0;
  const aqsPrev = prev.length ? prev[prev.length - 1].aqs : (seriesAll[startIdx - 1]?.aqs ?? 0);
  const dAqsPt = aqsCurr - aqsPrev;

  /* Export */
  const onExport = () => {
    const header = ["date", "new_links", "lost_links", "links_total", "ref_domains_total", "toxic", "aqs"].join(",");
    const body = seriesAll
      .slice(seriesAll.length - rangeDays)
      .map((p) => [p.date, p.newLinks, p.lostLinks, p.linksTotal, p.refDomainsTotal, p.toxic, p.aqs].join(","))
      .join("\n");
    downloadText(`backlinks_overview_${range}.csv`, [header, body].join("\n"));
  };

  /* Name maps */
  const AUTH_NAMES_MAP = AUTH_NAMES;
  const LINK_NAMES_MAP = LINK_NAMES;

  /* Big donut container ref for accurate near-cursor popover */
  const bigDonutRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <section
      className="rounded-md border bg-white p-4 mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Backlinks Overview
          </h2>
          <Tip text="KPI cards: stacked donut snapshot + stacked trend (same breakdown). Hover charts for smart popovers." />
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            items={[
              { label: "7d", value: "7d" },
              { label: "30d", value: "30d" },
              { label: "90d", value: "90d" },
              { label: "180d", value: "180d" },
            ]}
          />
          <label className="inline-flex items-center gap-2 text-xs ml-1" style={{ color: TK.muted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TK.valueBlue, borderColor: TK.border, cursor: "pointer" }}
            />
            Show % share
          </label>
          <button
            onClick={onExport}
            className="ml-2 inline-flex items-center gap-2 rounded-md px-3 py-1.5 border hover:bg-gray-50"
            aria-label="Export Backlinks Overview"
            style={{ borderColor: TK.border, background: TK.panel, color: TK.valueBlue, cursor: "pointer" }}
          >
            <Download size={16} />
            <span className="text-sm">Export</span>
          </button>
        </div>
      </header>

      {/* KPI GRID — exactly 5 cards */}
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total Referring Domains"
          glyph={<Globe size={16} color={TK.brand} />}
          info="Snapshot: Authority tiers. Trend: mix of tiers over time."
          donut={<StackedDonut parts={rdParts.map((p) => ({ ...p, name: p.key }))} nameMap={AUTH_NAMES_MAP} />}
          value={curr.length ? curr[curr.length - 1].refDomainsTotal : 0}
          valueFmt={(v) => intFmt.format(v)}
          delta={dRDPct}
          deltaUnit="%"
          trend={
            <TrendStack
              rows={rdAuthRows.slice(-rangeDays)}
              keys={["high", "mid", "low", "new"]}
              colors={AUTH_COLORS}
              names={AUTH_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
        />

        <KpiCard
          title="Total Backlinks"
          glyph={<LinkIcon size={16} color={TK.brand} />}
          info="Snapshot: Link types. Trend: type mix over time."
          donut={<StackedDonut parts={blParts.map((p) => ({ ...p, name: p.key }))} nameMap={LINK_NAMES_MAP} />}
          value={curr.length ? curr[curr.length - 1].linksTotal : 0}
          valueFmt={(v) => intFmt.format(v)}
          delta={dBLPct}
          deltaUnit="%"
          trend={
            <TrendStack
              rows={blTypeRows.slice(-rangeDays)}
              keys={["text", "image", "redirect"]}
              colors={LINK_COLORS}
              names={LINK_NAMES}
              mode="area"
              share={shareMode}
            />
          }
        />

        <KpiCard
          title="Gain–Lost Trend"
          glyph={<ArrowRightLeft size={16} color={TK.brand} />}
          info={`New vs Lost within the selected window (e.g., last ${range}).`}
          donut={<StackedDonut parts={gainLostParts.map((p) => ({ ...p, name: p.key }))} nameMap={{ gain: "Gain", lost: "Lost" }} />}
          value={gainSum - lostSum}
          valueFmt={(v) => (v >= 0 ? `+${intFmt.format(v)}` : intFmt.format(v))}
          delta={dNet}
          deltaUnit=""
          trend={
            <TrendStack
              rows={gainLostRows.slice(-rangeDays)}
              keys={["gain", "lost"]}
              colors={{ gain: TK.success, lost: TK.danger }}
              names={{ gain: "Gain", lost: "Lost" }}
              mode="bars"
              share={shareMode}
            />
          }
        />

        <KpiCard
          title="Toxic Links"
          glyph={<ShieldAlert size={16} color={TK.brand} />}
          info="Links flagged as risky. Snapshot: risk tiers; trend: risk mix."
          donut={<StackedDonut parts={toxicParts.map((p) => ({ ...p, name: p.key }))} nameMap={RISK_NAMES} />}
          value={toxCurr}
          valueFmt={(v) => intFmt.format(v)}
          delta={dToxPct}
          deltaUnit="%"
          invert
          trend={
            <TrendStack
              rows={toxicRows.slice(-rangeDays)}
              keys={["risk_high", "risk_med", "risk_low"]}
              colors={RISK_COLORS}
              names={RISK_NAMES}
              mode="bars"
              share={shareMode}
            />
          }
        />

        <KpiCard
          title="Avg. AQS Score"
          glyph={<Award size={16} color={TK.brand} />}
          info="Anchor Quality Score (0–100). Snapshot/trend: quality buckets."
          donut={<StackedDonut parts={aqsParts.map((p) => ({ ...p, name: p.key }))} nameMap={AQS_NAMES} />}
          value={aqsCurr}
          valueFmt={(v) => `${v.toFixed(1)}/100`}
          delta={dAqsPt}
          deltaUnit="pt"
          trend={
            <TrendStack
              rows={aqsRows.slice(-rangeDays)}
              keys={["aqs_90_100", "aqs_75_89", "aqs_50_74", "aqs_lt_50"]}
              colors={AQS_COLORS}
              names={AQS_NAMES}
              mode="area"
              share={shareMode}
            />
          }
        />
      </div>

      {/* Lower grid */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Link Types & Top Anchors */}
        <div className="lg:col-span-7">
          <div className="rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon size={16} color={TK.brand} />
                <div className="text-[14px] font-medium" style={{ color: TK.text }}>
                  Link Types & Top Anchors
                </div>
                <Tip text="Stacked donut: backlink types. Popover shows hovered slice right near the cursor. Top 5 anchors table at right." />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Big donut with near-cursor smart popover + legend chips (no borders) */}
              <div className="flex flex-col items-center justify-center">
                <div ref={bigDonutRef} className="h-[240px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={DEMO.linkTypeShare.map((x) => ({
                          key: x.key,
                          name: x.label,
                          value: Math.round(x.value * 100),
                          color: x.color,
                        }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={88}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={1}
                        strokeWidth={0}
                        isAnimationActive
                        activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: any) => (
                          <Sector
                            cx={cx}
                            cy={cy}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius + 4}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))" }}
                          />
                        )}
                      >
                        {DEMO.linkTypeShare.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <RTooltip
                        content={(tp: any) => (
                          <DonutSinglePortalContent
                            {...tp}
                            containerRect={bigDonutRef.current?.getBoundingClientRect() ?? null}
                            nameMap={{ Text: "Text", Image: "Image", Redirect: "Redirect" }}
                            valueFmt={(v) => `${v}%`}
                          />
                        )}
                        wrapperStyle={{ visibility: "hidden" }}
                        allowEscapeViewBox={{ x: true, y: true }}
                        cursor={false}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {DEMO.linkTypeShare.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-2 text-xs">
                      <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
                      <span className="text-gray-700">
                        {s.label} • {Math.round(s.value * 100)}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Top Anchors table */}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Award size={14} color={TK.brand} />
                  <div className="text-sm font-medium text-gray-700">Top Anchors</div>
                  <Tip text="Most used backlink anchors for this page (top 5)." />
                </div>

                <div className="max-h-[240px] overflow-auto rounded-md ring-1 ring-gray-100">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b" style={{ borderColor: TK.border }}>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="px-2 py-1.5 font-medium">Anchor</th>
                        <th className="px-2 py-1.5 font-medium text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEMO.anchors.slice(0, 5).map((a) => (
                        <tr key={a.anchor} className="border-b" style={{ borderColor: TK.border }}>
                          <td className="px-2 py-1.5 truncate" title={a.anchor}>
                            {a.anchor}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{intFmt.format(a.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Referring Domains */}
        <div className="lg:col-span-5">
          <div className="rounded-[10px] border p-3" style={{ borderColor: TK.border }}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} color={TK.brand} />
                <div className="text-[14px] font-medium" style={{ color: TK.text }}>
                  Top Referring Domains
                </div>
                <Tip text="Preview of strongest domains currently linking to this page." />
              </div>
            </div>

            <div className="max-h-[260px] overflow-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead className="sticky top-0 bg-white border-b" style={{ borderColor: TK.border }}>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-2 py-1.5 font-medium">Domain</th>
                    <th className="px-2 py-1.5 font-medium text-right">Links</th>
                    <th className="px-2 py-1.5 font-medium text-right">Dof%</th>
                    <th className="px-2 py-1.5 font-medium text-right">WR</th>
                    <th className="px-2 py-1.5 font-medium text-right">Last Seen</th>
                    <th className="px-2 py-1.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO.refDomains.slice(0, 5).map((r) => (
                    <tr key={r.domain} className="border-b hover:bg-[#F8FAFC]" style={{ borderColor: TK.border }}>
                      <td className="px-2 py-1.5">
                        <a
                          href={`https://${r.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0077FF] underline"
                          style={{ cursor: "pointer" }}
                        >
                          {r.domain}
                        </a>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{intFmt.format(r.links)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{pctFmt(r.dofollowShare * 100, 0)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.wr}</td>
                      <td className="px-2 py-1.5 text-right">{toDateLabel(r.lastSeen)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs hover:bg-gray-50"
                          style={{ borderColor: TK.border, cursor: "pointer" }}
                          onClick={() => alert(`Open domain in Backlinks tab → ${r.domain}`)}
                        >
                          Open <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
