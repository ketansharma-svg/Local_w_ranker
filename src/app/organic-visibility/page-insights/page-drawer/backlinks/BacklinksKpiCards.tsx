"use client";

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
  ReferenceLine,
} from "recharts";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Info,
  FileDown,
  Link as LinkIcon,
  Globe2,
  Shield,
  Quote,
  GitBranchPlus,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ───────────────────────────────── TOKENS (Wranker) ─────────────────────────────────
   Aligned to brand & design tokens (brand, borders, text, status, focus).
   See: “Wranker – Final Design Tokens (Updated)” and “Wranker Design Tokens”. */
const TK = {
  brand: "#008CCD",
  valueBlue: "#4286F5",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  panel: "#FFFFFF",
  app: "#F5F7FA",
  success: "#34A853",
  warn: "#F9BB04",
  danger: "#E94134",
  gray: "#9CA3AF",
  focus: "#4286F5",
} as const;

/* ───────────────────────────────── Utils ───────────────────────────────── */
const intFmt = new Intl.NumberFormat();
const pctFmt = (v: number, d = 1) => `${v.toFixed(d)}%`;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

type SeriesPoint = { date: string; value: number };
type Row = { t: string } & Record<string, any>;
type SplitSpec = { key: string; label: string; baseShare: number };

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/* Demo series (fallback) — deterministic-ish */
function mkSeries(len = 30, start = 100, amp = 0.15) {
  const base = addDays(todayISO(), -(len - 1));
  return Array.from({ length: len }, (_, i) => {
    const iso = addDays(base, i);
    const w = 1 + Math.sin(i * 0.45) * amp + (Math.random() - 0.5) * 0.1;
    return { date: iso, value: Math.max(0, Math.round(start * w)) };
  });
}
const deltaFrom = (s?: SeriesPoint[]) =>
  !s || s.length < 2 ? undefined : s[s.length - 1].value - s[s.length - 2].value;

function splitSeries(total: SeriesPoint[] | undefined, parts: SplitSpec[], jitter = 0.06): Row[] {
  const src = total ?? [];
  const rows: Row[] = [];
  for (let i = 0; i < src.length; i++) {
    const totalV = Math.max(0, src[i].value || 0);
    let rem = 1;
    const shares: Record<string, number> = {};
    parts.forEach((sp, idx) => {
      const wiggle = clamp01(sp.baseShare * (1 + Math.sin((i + 1) * (idx + 2) * 0.27) * jitter));
      const val = idx === parts.length - 1 ? rem : Math.min(rem, wiggle);
      rem -= val;
      shares[sp.key] = val;
    });
    const sum = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
    Object.keys(shares).forEach((k) => (shares[k] = shares[k] / sum));
    const out: Row = { t: src[i].date };
    parts.forEach((sp) => (out[sp.key] = Math.max(0, Math.round(totalV * shares[sp.key]))));
    rows.push(out);
  }
  return rows;
}
const toShare = (rows: Row[], keys: string[]) =>
  rows.map((r) => {
    const sum = keys.reduce((s, k) => s + (Number(r[k]) || 0), 0) || 1;
    const out: Row = { t: r.t };
    keys.forEach((k) => (out[k] = ((Number(r[k]) || 0) / sum) * 100));
    return out;
  });

function lastParts(rows: Row[], keys: string[], colors: Record<string, string>) {
  if (!rows.length) return [];
  const r = rows[rows.length - 1];
  return keys
    .map((k) => ({ key: k, name: k, value: Number(r[k] || 0), color: colors[k] }))
    .sort((a, b) => b.value - a.value);
}

/* ───────────────────────────────── Portaled Tooltips ───────────────────────────────── */
function PortalTooltipShell({
  x,
  y,
  width = 280,
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
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
      <div
        className="rounded-md p-2 text-xs shadow"
        style={{
          backgroundColor: "#fff",
          border: `1px solid ${TK.border}`,
          color: TK.text,
          borderRadius: 6,
          boxShadow: "0 1px 3px rgba(0,0,0,.1)",
        }}
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
    <PortalTooltipShell x={x} y={y} width={280}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {typeof label === "string" ? new Date(label).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : String(label)}
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

function DonutPortalContent({
  active,
  coordinate,
  containerRect,
  parts,
  nameMap,
  valueFmt,
}: any & {
  coordinate?: { x: number; y: number };
  containerRect?: DOMRect | null;
  parts: { key: string; name: string; value: number; color: string }[];
  nameMap?: Record<string, string>;
  valueFmt?: (v: number) => string;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const fmt = valueFmt ?? ((v: number) => intFmt.format(Math.round(v)));
  return (
    <PortalTooltipShell x={x} y={y} width={260}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Breakdown
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => (
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

/* Snapshot donut (stacked) */
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

/* Stacked trend (area/bars) with portal tooltip */
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
  const data = share ? toShare(rows, keys) : rows;
  const asShare = share;
  const ref = React.useRef<HTMLDivElement | null>(null);
  const valueFmt = (v: number) => (asShare ? pctFmt(v, 1) : intFmt.format(Math.round(v)));

  return (
    <div ref={ref} className="h-16 min-w-[auto]" role="img" aria-label="KPI trend">
      <ResponsiveContainer>
        {mode === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={asShare ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={asShare}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
              cursor={{ stroke: TK.valueBlue, strokeOpacity: 0.15 }}
            />
            {keys.map((k) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stackId="a"
                stroke={colors[k]}
                fill={colors[k]}
                fillOpacity={0.25}
                strokeWidth={2}
                dot={false}
              />
            ))}
            <ReferenceLine y={0} stroke={TK.muted} strokeOpacity={0.12} />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={asShare ? [0, 100] : ["auto", "auto"]} />
            <RTooltip
              content={(tp: any) => (
                <TrendPortalContent
                  {...tp}
                  containerRect={ref.current?.getBoundingClientRect() ?? null}
                  nameMap={names}
                  valueFmt={valueFmt}
                  asShare={asShare}
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

/* Delta chip (up/down/flat) */
function DeltaBadge({
  delta,
  unit = "",
  invert = false,
}: {
  delta?: number;
  unit?: "" | "%" | "pp" | "s" | "pt";
  invert?: boolean;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: TK.muted }}>
        <Minus size={14} />
        —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const color = delta === 0 ? TK.muted : good ? TK.success : TK.danger;
  const label =
    unit === "%"
      ? `${Math.abs(delta).toFixed(1)}%`
      : unit === "pp"
      ? `${Math.abs(delta).toFixed(1)} pp`
      : intFmt.format(Math.round(Math.abs(delta)));
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
      <Icon size={14} />
      {label}
    </span>
  );
}

/* Card shell (brand glyph + donut + value/delta + trend) */
function BrandGlyph({ icon, size = 16 }: { icon?: React.ReactNode; size?: number }) {
  return icon ? <span>{icon}</span> : <BarChart3 size={size} color={TK.brand} />;
}
function KpiCard({
  title,
  info,
  glyph,
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
  info?: string;
  glyph?: React.ReactNode;
  donut: React.ReactNode;
  value: number;
  valueFmt: (v: number) => string;
  delta?: number;
  deltaUnit?: "" | "%" | "pp";
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
    >
      <div
        className="rounded-[10px] border bg-white p-3 shadow-sm transition-transform hover:-translate-y-[1px] focus-within:ring-2"
        style={{ borderColor: TK.border, boxShadow: "var(--wr-shadow-1, 0 1px 3px rgba(0,0,0,.1))", outlineColor: TK.focus }}
      >
        {/* Title row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BrandGlyph icon={glyph} />
            <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
              {title}
            </div>
            <span className="inline-flex items-center pl-1 text-[#9CA3AF]" title={info}>
              <Info size={14} />
            </span>
          </div>
        </div>

        {/* Content row */}
        <div className="flex items-center justify-between gap-3">
          {donut}
          <div className="min-w-[80px] leading-tight">
            <div className="text-[22px] font-bold" style={{ color: TK.valueBlue }}>
              {valueFmt(value)}
            </div>
            <div className="mt-0.5">
              <DeltaBadge delta={delta} unit={deltaUnit} invert={invert} />
            </div>
          </div>
          <div className="min-w-0 flex-1">{trend}</div>
        </div>
      </div>
    </button>
  );
}

/* ───────────────────────────────── Incoming data (compat) ───────────────────────────────── */
type Point = { date: string; [series: string]: number | string };
export type BacklinksKpiData = {
  series: Point[]; // [{ date, refDomains, backlinks, dofollowShare, equity, newLinks, lostLinks, anchors, riskToxic }]
  snapshot?: {
    refDomains?: number;
    backlinks?: number;
    dofollowShare?: number; // %
    equity?: number;
    new30d?: number;
    lost30d?: number;
    anchors?: number;
    topAnchorShare?: number; // %
    toxic?: number;
  };
};
const pluck = (S: Point[], key: string): SeriesPoint[] =>
  (S || []).map((p) => ({ date: String(p.date), value: Number(p[key] ?? 0) }));

/* Demo data if none provided (keeps tooltips real dates) */
function makeDemo(): BacklinksKpiData {
  const len = 30;
  const base = addDays(todayISO(), -(len - 1));
  const series: Point[] = [];
  let ref = 42,
    bl = 180,
    df = 64,
    eq = 820,
    anc = 38,
    tox = 3;
  for (let i = 0; i < len; i++) {
    const day = addDays(base, i);
    ref += Math.round((Math.random() - 0.5) * 2);
    bl += Math.round((Math.random() - 0.3) * 8);
    df = Math.max(20, Math.min(90, df + (Math.random() - 0.5) * 2));
    eq = Math.max(600, eq + Math.round((Math.random() - 0.4) * 16));
    const newL = Math.max(0, Math.round(Math.random() * 6));
    const lostL = Math.max(0, Math.round(Math.random() * 4));
    anc = Math.max(22, anc + Math.round((Math.random() - 0.5) * 2));
    tox = Math.max(0, Math.min(12, tox + Math.round((Math.random() - 0.6) * 2)));
    series.push({
      date: day,
      refDomains: ref,
      backlinks: bl,
      dofollowShare: Math.round(df),
      equity: eq,
      newLinks: newL,
      lostLinks: lostL,
      anchors: anc,
      riskToxic: tox,
    });
  }
  return { series };
}

/* ───────────────────────────────── Main Section ───────────────────────────────── */
export default function BacklinksKpiCards({
  data,
  onNavigate,
  className,
  onExport,
}: {
  data?: BacklinksKpiData;
  onNavigate?: (route: {
    key: "refDomains" | "backlinks" | "dofollow" | "equity" | "newLost" | "anchors" | "risk";
    title: string;
  }) => void;
  onExport?: () => void;
  className?: string;
}) {
  const model = React.useMemo(() => data ?? makeDemo(), [data]);
  const S = model.series ?? [];

  // Series
  const refSP = pluck(S, "refDomains");
  const blSP = pluck(S, "backlinks");
  const dfSP = pluck(S, "dofollowShare"); // %
  const eqSP = pluck(S, "equity");
  const newSP = pluck(S, "newLinks");
  const lostSP = pluck(S, "lostLinks");
  const ancSP = pluck(S, "anchors");
  const toxSP = pluck(S, "riskToxic");

  // Values (latest)
  const vRef = refSP.at(-1)?.value ?? 0;
  const vBacklinks = blSP.at(-1)?.value ?? 0;
  const vDoFollow = dfSP.at(-1)?.value ?? 0;
  const vEquity = eqSP.at(-1)?.value ?? 0;
  const vNew30 = newSP.reduce((a, b) => a + (b.value || 0), 0);
  const vLost30 = lostSP.reduce((a, b) => a + (b.value || 0), 0);
  const vAnchors = ancSP.at(-1)?.value ?? 0;
  const vTox = toxSP.at(-1)?.value ?? 0;

  // Deltas (d/d)
  const dRef = deltaFrom(refSP);
  const dBacklinks = deltaFrom(blSP);
  const dDoFollow = deltaFrom(dfSP);
  const dEquity = deltaFrom(eqSP);

  // Breakdown specs & colors
  // Referring Domains — stable/new/lost (conceptual split)
  const RD: SplitSpec[] = [
    { key: "stable", label: "Stable", baseShare: 0.82 },
    { key: "new", label: "New (30d)", baseShare: 0.10 },
    { key: "lost", label: "Lost (30d)", baseShare: 0.08 },
  ];
  const RD_COL: Record<string, string> = { stable: TK.gray, new: TK.success, lost: TK.danger };
  const RD_NAMES = { stable: "Stable", new: "New (30d)", lost: "Lost (30d)" };

  // Backlinks — attributes
  const ATTR: SplitSpec[] = [
    { key: "follow", label: "Dofollow", baseShare: 0.58 },
    { key: "nofollow", label: "Nofollow", baseShare: 0.28 },
    { key: "ugc", label: "UGC", baseShare: 0.08 },
    { key: "sponsored", label: "Sponsored", baseShare: 0.06 },
  ];
  const ATTR_COL: Record<string, string> = {
    follow: TK.valueBlue,
    nofollow: TK.gray,
    ugc: "#22D3EE",
    sponsored: "#7C3AED",
  };
  const ATTR_NAMES = { follow: "Dofollow", nofollow: "Nofollow", ugc: "UGC", sponsored: "Sponsored" };

  // DoFollow Share — follow vs other (derived from attributes)
  const DF_COL: Record<string, string> = { follow: TK.success, other: TK.danger };
  const DF_NAMES = { follow: "Dofollow", other: "Other rel" };

  // Equity — tiered (high/med/low)
  const EQ: SplitSpec[] = [
    { key: "high", label: "High Authority", baseShare: 0.36 },
    { key: "med", label: "Medium", baseShare: 0.42 },
    { key: "low", label: "Low", baseShare: 0.22 },
  ];
  const EQ_COL: Record<string, string> = { high: "#8B5CF6", med: "#A78BFA", low: "#D8B4FE" };
  const EQ_NAMES = { high: "High Authority", med: "Medium", low: "Low" };

  // Velocity — new vs lost
  const VL_COL: Record<string, string> = { newLinks: TK.success, lostLinks: TK.danger };
  const VL_NAMES = { newLinks: "New", lostLinks: "Lost" };

  // Anchors — diversity
  const ANCH: SplitSpec[] = [
    { key: "exact", label: "Exact‑match", baseShare: 0.26 },
    { key: "partial", label: "Partial‑match", baseShare: 0.34 },
    { key: "branded", label: "Branded", baseShare: 0.24 },
    { key: "generic", label: "Generic", baseShare: 0.16 },
  ];
  const ANCH_COL: Record<string, string> = { exact: TK.valueBlue, partial: "#5CA8FF", branded: TK.success, generic: TK.gray };
  const ANCH_NAMES = { exact: "Exact‑match", partial: "Partial‑match", branded: "Branded", generic: "Generic" };

  // Risk — severity buckets
  const SEV: SplitSpec[] = [
    { key: "sev_critical", label: "Critical", baseShare: 0.18 },
    { key: "sev_high", label: "High", baseShare: 0.34 },
    { key: "sev_medium", label: "Medium", baseShare: 0.32 },
    { key: "sev_low", label: "Low", baseShare: 0.16 },
  ];
  const SEV_COL: Record<string, string> = {
    sev_critical: TK.danger,
    sev_high: TK.warn,
    sev_medium: "#60A5FA",
    sev_low: TK.gray,
  };
  const SEV_NAMES = { sev_critical: "Critical", sev_high: "High", sev_medium: "Medium", sev_low: "Low" };

  // Build stacked rows
  const rdRows = React.useMemo(() => splitSeries(refSP, RD, 0.04), [refSP]);
  const attrRows = React.useMemo(() => splitSeries(blSP, ATTR, 0.05), [blSP]);
  // DF rows derived from attributes (follow vs other)
  const dfRows: Row[] = React.useMemo(() => {
    if (!attrRows.length) return [];
    return attrRows.map((r) => {
      const other = (r["nofollow"] ?? 0) + (r["ugc"] ?? 0) + (r["sponsored"] ?? 0);
      return { t: r.t, follow: r["follow"] ?? 0, other };
    });
  }, [attrRows]);
  const eqRows = React.useMemo(() => splitSeries(eqSP, EQ, 0.05), [eqSP]);
  const vlRows: Row[] = React.useMemo(() => {
    const n = Math.min(newSP.length, lostSP.length);
    const rows: Row[] = [];
    for (let i = 0; i < n; i++) rows.push({ t: newSP[i].date, newLinks: newSP[i].value, lostLinks: lostSP[i].value });
    return rows;
  }, [newSP, lostSP]);
  const anchRows = React.useMemo(
    () => splitSeries(ancSP.length ? ancSP : blSP.map((p) => ({ date: p.date, value: 1 })), ANCH, 0.05),
    [ancSP, blSP]
  );
  const sevRows = React.useMemo(() => splitSeries(toxSP, SEV, 0.06), [toxSP]);

  // % share toggle for trends
  const [shareMode, setShareMode] = React.useState(false);

  // Export (JSON dump of snapshot + series)
  const handleExport = () => {
    if (onExport) return onExport();
    try {
      const payload = { snapshot: { vRef, vBacklinks, vDoFollow, vEquity, vNew30, vLost30, vAnchors, vTox }, series: S };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backlinks-kpi-summary.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  // Icons (branded)
  const icoRef = <Globe2 size={16} color={TK.brand} />;
  const icoBacklinks = <LinkIcon size={16} color={TK.brand} />;
  const icoDF = <GitBranchPlus size={16} color={TK.brand} />;
  const icoEq = <BarChart3 size={16} color={TK.brand} />;
  const icoVL = <ArrowRightLeft size={16} color={TK.brand} />;
  const icoAnch = <Quote size={16} color={TK.brand} />;
  const icoRisk = <Shield size={16} color={TK.brand} />;

  return (
    <section
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header with Export */}
      <div className="mb-3 flex items-center justify-between border-b pb-2" style={{ borderColor: TK.borderSubtle }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h3 className="text-[16px] font-semibold mt-4" style={{ color: TK.text }}>
            Backlinks · KPI Summary
          </h3>
          <button
            className="p-1 rounded text-[#9CA3AF] hover:bg-gray-50"
            title="Each card shows a current stacked snapshot and a stacked trend using the same breakdown."
            aria-label="About this section"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* % share chip */}
          <label
            className="inline-flex items-center gap-2 text-xs rounded-full border px-3 py-1.5"
            style={{ color: TK.muted, borderColor: TK.border, cursor: "pointer", background: "#FFFFFF" }}
            title="Toggle trends between absolute values and % share"
          >
            <input
              type="checkbox"
              checked={shareMode}
              onChange={(e) => setShareMode(e.target.checked)}
              className="h-4 w-4 rounded border"
              style={{ accentColor: TK.valueBlue, borderColor: TK.border, cursor: "pointer" }}
            />
            Show % share
          </label>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50"
            title="Export Backlinks Summary"
            style={{ borderColor: TK.border, background: TK.panel, color: TK.valueBlue, cursor: "pointer" }}
          >
            <FileDown size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Cards grid (7 KPIs) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {/* 1) Referring Domains */}
        <KpiCard
          title="Referring Domains"
          info="Unique domains linking to this page (active). Snapshot: stable/new/lost mix; Trend: same breakdown."
          glyph={icoRef}
          donut={
            <StackedDonut
              parts={lastParts(rdRows, ["stable", "new", "lost"], RD_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={RD_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vRef}
          valueFmt={(v) => intFmt.format(v)}
          delta={dRef}
          trend={<TrendStack rows={rdRows} keys={["stable", "new", "lost"]} colors={RD_COL} names={RD_NAMES} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "refDomains", title: "Referring Domains" })}
        />

        {/* 2) Backlinks */}
        <KpiCard
          title="Backlinks"
          info="Attributes mix (follow/nofollow/UGC/sponsored)."
          glyph={icoBacklinks}
          donut={
            <StackedDonut
              parts={lastParts(attrRows, ["follow", "nofollow", "ugc", "sponsored"], ATTR_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={ATTR_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vBacklinks}
          valueFmt={(v) => intFmt.format(v)}
          delta={dBacklinks}
          trend={<TrendStack rows={attrRows} keys={["follow", "nofollow", "ugc", "sponsored"]} colors={ATTR_COL} names={ATTR_NAMES} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "backlinks", title: "Backlinks" })}
        />

        {/* 3) DoFollow Share */}
        <KpiCard
          title="DoFollow Share"
          info="Share of links with rel=follow vs other rel types."
          glyph={icoDF}
          donut={
            <StackedDonut
              parts={lastParts(dfRows, ["follow", "other"], DF_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={DF_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vDoFollow}
          valueFmt={(v) => pctFmt(v, 0)}
          delta={dDoFollow}
          deltaUnit="pp"
          trend={<TrendStack rows={dfRows} keys={["follow", "other"]} colors={DF_COL} names={DF_NAMES} mode="bars" share={true} />}
          onClick={() => onNavigate?.({ key: "dofollow", title: "DoFollow Share" })}
        />

        {/* 4) Authority‑weighted Equity */}
        <KpiCard
          title="Authority‑weighted Equity"
          info="Composite equity from referring domains (tiered by authority)."
          glyph={icoEq}
          donut={
            <StackedDonut
              parts={lastParts(eqRows, ["high", "med", "low"], EQ_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={EQ_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vEquity}
          valueFmt={(v) => intFmt.format(v)}
          delta={dEquity}
          trend={<TrendStack rows={eqRows} keys={["high", "med", "low"]} colors={EQ_COL} names={EQ_NAMES} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "equity", title: "Authority-weighted Equity" })}
        />

        {/* 5) New vs Lost (30d) */}
        <KpiCard
          title="New vs Lost (30d)"
          info="Link velocity in the last 30 days."
          glyph={icoVL}
          donut={
            <StackedDonut
              parts={[
                { key: "newLinks", name: "newLinks", value: vNew30, color: VL_COL.newLinks },
                { key: "lostLinks", name: "lostLinks", value: vLost30, color: VL_COL.lostLinks },
              ]}
              nameMap={VL_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vNew30 - vLost30}
          valueFmt={(v) => (v >= 0 ? `+${intFmt.format(v)}` : intFmt.format(v))}
          delta={undefined}
          trend={<TrendStack rows={vlRows} keys={["newLinks", "lostLinks"]} colors={VL_COL} names={VL_NAMES} mode="bars" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "newLost", title: "New vs Lost (30d)" })}
        />

        {/* 6) Anchor Diversity */}
        <KpiCard
          title="Anchor Diversity"
          info="Distribution of anchor types."
          glyph={icoAnch}
          donut={
            <StackedDonut
              parts={lastParts(anchRows, ["exact", "partial", "branded", "generic"], ANCH_COL).map((p) => ({ ...p, name: p.key }))}
              nameMap={ANCH_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vAnchors}
          valueFmt={(v) => intFmt.format(v)}
          delta={undefined}
          trend={<TrendStack rows={anchRows} keys={["exact", "partial", "branded", "generic"]} colors={ANCH_COL} names={ANCH_NAMES} mode="area" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "anchors", title: "Anchor Diversity" })}
        />

        {/* 7) Risk / Spam Flags */}
        <KpiCard
          title="Risk / Spam Flags"
          info="Toxicity severity buckets (lower is better)."
          glyph={icoRisk}
          donut={
            <StackedDonut
              parts={lastParts(sevRows, ["sev_critical", "sev_high", "sev_medium", "sev_low"], SEV_COL).map((p) => ({
                ...p,
                name: p.key,
              }))}
              nameMap={SEV_NAMES}
              valueFmt={(v) => intFmt.format(Math.round(v))}
            />
          }
          value={vTox}
          valueFmt={(v) => intFmt.format(v)}
          delta={deltaFrom(toxSP)}
          invert
          trend={<TrendStack rows={sevRows} keys={["sev_critical", "sev_high", "sev_medium", "sev_low"]} colors={SEV_COL} names={SEV_NAMES} mode="bars" share={shareMode} />}
          onClick={() => onNavigate?.({ key: "risk", title: "Risk / Spam Flags" })}
        />
      </div>
    </section>
  );
}

/* Optional demo wrapper */
export function Demo_BacklinksKpiCards() {
  return (
    <div className="mx-auto max-w-6xl p-6" style={{ background: TK.app }}>
      <BacklinksKpiCards />
    </div>
  );
}
