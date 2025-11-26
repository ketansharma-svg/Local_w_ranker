"use client";

import React, { useMemo, useState, createContext, useContext } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  AreaChart,
  Area,
} from "recharts";
import { Info as InfoIcon, ChevronDown } from "lucide-react";
import ActivityLogTable from "./ActivityLogTable";
import AutomationSuggestions from "./AutomationSuggestions";
/* ============================================================================
 * TOKENS — align with panel; no emojis
 * ========================================================================== */
const TK = {
  brand: "#1090D0",
  brandSubtle: "#D2EFFF",
  text: "#282829",
  muted: "rgba(40,40,41,0.64)",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  good: "#10B981",
  warn: "#F59E0B",
  risk: "#EF4444",
};

/* ============================================================================
 * LAYER CONTEXT — raise a card above neighbors while any chart tooltip is visible
 * ========================================================================== */
const CardLayerCtx = createContext<{ setRaised: (v: boolean) => void } | null>(null);
const useCardLayer = () => useContext(CardLayerCtx);

/* ============================================================================
 * TYPES — input model for Audit KPI section
 * ========================================================================== */
type RoleKey = "admin" | "editor" | "viewer" | "service" | string;
type Actor = { id: string; name: string; role: RoleKey; avatar?: string };
type ModuleKey = "seo" | "content" | "campaign" | "reporting" | "settings" | string;
type RiskKey = "auth_fail" | "perm_change" | "export_attempt" | "policy_change" | "delete" | string;
type FormatKey = "csv" | "pdf" | "json" | "xlsx" | "other" | string;

type CountBy = { key: string; label: string; count: number };
type DayPoint<T = unknown> = { t: string } & T;

export type AuditKpiModel = {
  periodDays: 7 | 15 | 30;
  actors: Actor[];
  modules: Array<{ key: ModuleKey; label: string; color: string }>;
  summary: {
    totalEvents: { current: number; previous: number; byModule: CountBy[]; bySeverity: CountBy[] };
    riskyEvents: { current: number; previous: number; byCategory: CountBy[]; topActors: CountBy[] };
    uniqueActors: { current: number; previous: number; byRole: CountBy[]; topActors: CountBy[] };
    exports: { current: number; previous: number; byFormat: CountBy[]; byActor: CountBy[] };
    topModule: {
      key: ModuleKey;
      label: string;
      total: number;
      share01: number;
      severity: CountBy[]; // info/warn/critical
    };
  };
  trends: {
    eventsDaily: DayPoint<{ total: number; byModule: CountBy[] }>[]; // tooltip: modules (top 10 + others)
    riskyDaily: DayPoint<{ total: number; byCategory: CountBy[]; topActors: CountBy[] }>[]; // tooltip: actors (top 10)
    uniqueActorsDaily: DayPoint<{ count: number; actorIds: string[] }>[]; // tooltip: actors list (max 10 + others)
    exportsDaily: DayPoint<{ total: number; byActor: CountBy[] }>[]; // tooltip: exporters list (max 10 + others)
    topModuleDaily: DayPoint<{ total: number; bySeverity: CountBy[] }>[]; // tooltip: severity breakdown
  };
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */
const nf = new Intl.NumberFormat();
const pf1 = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });
const dtLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const fmtInt = (n?: number | null) => (n == null ? "—" : nf.format(n));
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function hashColor(key: string, base = TK.brand) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h % 10) / 10;
  const mix = (c: number) => Math.round(c * (0.45 + t * 0.45) + 255 * (0.1 + (1 - t) * 0.1));
  const br = parseInt(base.slice(1, 3), 16);
  const bg = parseInt(base.slice(3, 5), 16);
  const bb = parseInt(base.slice(5, 7), 16);
  const toHex = (x: number) => x.toString(16).padStart(2, "0");
  return `#${toHex(mix(br))}${toHex(mix(bg))}${toHex(mix(bb))}`;
}
const getActor = (actors: Actor[], id: string) => actors.find((u) => u.id === id);

function top10PlusOthers(parts: CountBy[], othersLabel = "Others") {
  const nonZero = parts.filter((p) => (p.count || 0) > 0);
  const sorted = [...nonZero].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, 10);
  const tailSum = sorted.slice(10).reduce((s, x) => s + x.count, 0);
  return tailSum > 0 ? [...head, { key: "_others", label: othersLabel, count: tailSum }] : head;
}

/* ============================================================================
 * ATOMS — Avatar, Title, Card, Popover
 * ========================================================================== */
const Avatar: React.FC<{ actor: Actor; size?: number }> = ({ actor, size = 18 }) => {
  const initials = actor.name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return actor.avatar ? (
    <img
      src={actor.avatar}
      alt={actor.name}
      width={size}
      height={size}
      className="rounded-full border"
      style={{ borderColor: TK.borderStrong, objectFit: "cover" }}
    />
  ) : (
    <div
      className="flex items-center justify-center rounded-full text-[9px] font-semibold text-white"
      style={{ width: size, height: size, background: hashColor(actor.id) }}
      aria-hidden
      title={actor.name}
    >
      {initials || "•"}
    </div>
  );
};

function TitleWithHoverInfo({ title, info }: { title: string; info?: string }) {
  return (
    <div className="relative flex min-w-0 items-center gap-2 group/title">
      <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
        {title}
      </div>
      {info ? <InfoIcon size={15} className="text-[#9CA3AF]" /> : null}
      {info ? (
        <div
          role="tooltip"
          className="invisible group-hover/title:visible absolute left-0 top-5 z-[200] w-[300px] rounded-md border bg-white p-2 text-xs leading-snug shadow"
          style={{ borderColor: TK.border, color: TK.text }}
        >
          {info}
        </div>
      ) : null}
    </div>
  );
}

/** Card that can raise z-index when tooltips are active */
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [raised, setRaised] = useState(false);
  return (
    <div
      className={`relative flex h-full flex-col rounded-[12px] border bg-white p-4 shadow-sm transition-transform hover:-translate-y-[2px] ${
        raised ? "z-[200]" : "z-0"
      }`}
      style={{ borderColor: TK.border, fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <CardLayerCtx.Provider value={{ setRaised }}>{children}</CardLayerCtx.Provider>
    </div>
  );
};

const Popover: React.FC<{ title?: React.ReactNode; children?: React.ReactNode }> = ({ title, children }) => (
  <div
    className="rounded-md border bg-white p-2 text-xs shadow"
    style={{
      borderColor: TK.border,
      color: TK.text,
      pointerEvents: "none",
      width: "max-content",
      maxWidth: 480,
    }}
  >
    {title ? (
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {title}
      </div>
    ) : null}
    <div className="flex flex-col gap-1">{children}</div>
  </div>
);

/* ============================================================================
 * MICRO CHARTS — Donut (split), Bars Tiny, Area Tiny
 * (tooltips: huge z-index + escape viewbox; raise card on hover)
 * ========================================================================== */
type DonutPart = { name: string; count: number; color: string };
function DonutSplit({
  parts,
  aria,
  size = 60,
  tooltipTitle,
}: {
  parts: DonutPart[];
  aria: string;
  size?: number;
  tooltipTitle?: string;
}) {
  const layer = useCardLayer();
  const total = Math.max(1, parts.reduce((s, p) => s + (p.count || 0), 0));
  const data = parts.map((p) => ({ ...p, v: clamp01(p.count / total) }));
  return (
    <div
      className="h-[60px] w-[60px] shrink-0"
      role="img"
      aria-label={aria}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={() => (
              <Popover title={tooltipTitle}>
                {data.map((d, i) => (
                  <div key={i} className="flex items-center gap-6 whitespace-nowrap">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: d.color }} />
                      <span className="truncate" style={{ color: TK.muted, maxWidth: "48ch" }}>
                        {d.name}
                      </span>
                    </span>
                    <span className="ml-auto flex items-baseline gap-2">
                      <span className="font-semibold">{fmtInt(d.count)}</span>
                      <span className="text-[11px]" style={{ color: TK.muted }}>
                        {(d.v * 100).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                ))}
              </Popover>
            )}
            wrapperStyle={{ zIndex: 2147483647, pointerEvents: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
          />
          <Pie data={data} dataKey="v" innerRadius={size / 2 - 12} outerRadius={size / 2} startAngle={90} endAngle={-270} isAnimationActive>
            {data.map((p, i) => (
              <Cell key={i} fill={p.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

type TinyBar = { x: string; y: number; extra?: any };
function BarsTiny({
  data,
  color = TK.brand,
  aria,
  tooltipRender,
}: {
  data: TinyBar[];
  color?: string;
  aria: string;
  tooltipRender: (d: TinyBar) => React.ReactNode;
}) {
  const layer = useCardLayer();
  return (
    <div
      className="h-[70px] w-[220px]"
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <RTooltip
            content={({ active, payload }: any) => {
              const d = payload?.[0]?.payload as TinyBar | undefined;
              return active && d ? <Popover title={dtLabel(d.x)}>{tooltipRender(d)}</Popover> : null;
            }}
            wrapperStyle={{ zIndex: 2147483647, pointerEvents: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="y" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <span className="sr-only">{aria}</span>
    </div>
  );
}

type TinyArea = { x: string; y: number; extra?: any };
function AreaTiny({
  data,
  color = TK.brand,
  aria,
  tooltipRender,
}: {
  data: TinyArea[];
  color?: string;
  aria: string;
  tooltipRender: (d: TinyArea) => React.ReactNode;
}) {
  const layer = useCardLayer();
  return (
    <div
      className="h-[70px] w-[220px]"
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <RTooltip
            content={({ active, payload }: any) => {
              const d = payload?.[0]?.payload as TinyArea | undefined;
              return active && d ? <Popover title={dtLabel(d.x)}>{tooltipRender(d)}</Popover> : null;
            }}
            wrapperStyle={{ zIndex: 2147483647, pointerEvents: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            cursor={{ stroke: "rgba(0,0,0,0.10)" }}
          />
          <defs>
            <linearGradient id="gAudit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill="url(#gAudit)" />
        </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only">{aria}</span>
    </div>
  );
}

/* ============================================================================
 * DELTA CHIP
 * ========================================================================== */
function Delta({
  current,
  previous,
  invert = false,
  note,
}: {
  current: number;
  previous: number;
  invert?: boolean;
  note?: string;
}) {
  const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const good = invert ? pct < 0 : pct > 0;
  const color = good ? TK.good : TK.risk;
  return (
    <div className="mt-1 text-xs font-semibold" style={{ color }}>
      {pct === 0 ? "—" : pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% {note ? <span className="font-normal" style={{ color: TK.muted }}>{note}</span> : null}
    </div>
  );
}

/* ============================================================================
 * MAIN — AUDIT KPI SUMMARY (drop‑in)
 * ========================================================================== */
export function AuditKpiSummarySection({
  model,
  onDrill = (dest, payload) => console.log("audit.kpi.drill", dest, payload),
}: {
  model: AuditKpiModel;
  onDrill?: (dest: string, payload?: any) => void;
}) {
  const { periodDays, actors, modules, summary, trends } = model;

  const exportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-kpis-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  /* --- CARD 1: Total Audit Events --------------------------------------- */
  const modPartsRaw = top10PlusOthers(summary.totalEvents.byModule, "Other Modules").map((p) => ({
    name: p.label,
    count: p.count,
    color: p.key === "_others" ? "#E5E7EB" : modules.find((m) => m.key === (p.key as ModuleKey))?.color || hashColor(p.key),
  }));
  const eventsBars: TinyBar[] = trends.eventsDaily.map((d) => ({ x: d.t, y: d.total, extra: d.byModule }));

  /* --- CARD 2: Risky Events --------------------------------------------- */
  const riskyParts = top10PlusOthers(summary.riskyEvents.byCategory, "Other Categories").map((p) => ({
    name: p.label,
    count: p.count,
    color:
      p.key === "_others"
        ? "#F3F4F6"
        : p.key === "auth_fail"
        ? hashColor("auth", TK.risk)
        : p.key === "perm_change"
        ? hashColor("perm", TK.warn)
        : p.key === "export_attempt"
        ? hashColor("export", TK.brand)
        : p.key === "policy_change"
        ? hashColor("policy", "#8B5CF6")
        : hashColor("delete", "#ef476f"),
  }));
  const riskyBars: TinyBar[] = trends.riskyDaily.map((d) => ({ x: d.t, y: d.total, extra: d.topActors }));

  /* --- CARD 3: Unique Actors -------------------------------------------- */
  const roleParts = top10PlusOthers(summary.uniqueActors.byRole, "Other Roles").map((p) => ({
    name: p.label,
    count: p.count,
    color:
      p.key === "_others"
        ? "#E5E7EB"
        : p.key === "admin"
        ? hashColor("admin", TK.warn)
        : p.key === "editor"
        ? hashColor("editor", TK.brand)
        : p.key === "viewer"
        ? hashColor("viewer", "#6C757D")
        : hashColor("service", "#8B5CF6"),
  }));
  const uniqArea: TinyArea[] = trends.uniqueActorsDaily.map((d) => ({ x: d.t, y: d.count, extra: d.actorIds }));

  /* --- CARD 4: Data Exports --------------------------------------------- */
  const fmtColor = (k: string) =>
    k === "csv" ? "#22C55E" : k === "pdf" ? "#EF4444" : k === "json" ? "#0EA5E9" : k === "xlsx" ? "#10B981" : "#9CA3AF";
  const exportParts = top10PlusOthers(summary.exports.byFormat, "Other Formats").map((p) => ({
    name: p.label,
    count: p.count,
    color: p.key === "_others" ? "#E5E7EB" : fmtColor(p.key),
  }));
  const exportBars: TinyBar[] = trends.exportsDaily.map((d) => ({ x: d.t, y: d.total, extra: d.byActor }));

  /* --- CARD 5: Top Module ----------------------------------------------- */
  const topModLabel = summary.topModule.label;
  const topModParts = summary.topModule.severity.map((p) => ({
    name: p.label,
    count: p.count,
    color: p.key === "info" ? hashColor("info", "#60A5FA") : p.key === "warn" ? hashColor("warn", TK.warn) : hashColor("crit", TK.risk),
  }));
  const topModBars: TinyBar[] = trends.topModuleDaily.map((d) => ({ x: d.t, y: d.total, extra: d.bySeverity }));

  return (
    <section className="w-full" style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      {/* Header bar with Export */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Audit KPI Summary
          </h3>
          <div className="text-xs" style={{ color: TK.muted }}>
            Last {periodDays} days
          </div>
        </div>
        <div className="relative">
          <button
            onClick={exportJSON}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
            style={{ borderColor: TK.border }}
            aria-label="Export section data"
            title="Export JSON"
          >
            Export
            <ChevronDown size={16} className="text-[#9CA3AF]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* 1) Total Audit Events */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4 2xl:col-span-3">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <TitleWithHoverInfo title="Total Audit Events" info="All audit log events in the selected period. Donut: module mix. Trend: events per day with module breakdown on hover." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={modPartsRaw} aria="Events by module" tooltipTitle="Events by module" />
              <div className="min-w-[140px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(summary.totalEvents.current)}
                </div>
                <Delta current={summary.totalEvents.current} previous={summary.totalEvents.previous} />
              </div>
              <BarsTiny
                data={eventsBars}
                aria="Events per day"
                color={TK.brand}
                tooltipRender={(d) => {
                  const rows = top10PlusOthers(d.extra || [], "Other Modules");
                  return (
                    <>
                      {rows.map((r: CountBy) => {
                        const color = r.key === "_others" ? "#E5E7EB" : modules.find((m) => m.key === (r.key as ModuleKey))?.color || hashColor(r.key);
                        return (
                          <div key={r.key + r.label} className="flex items-center gap-6 whitespace-nowrap">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                              <span className="truncate" style={{ color: TK.muted, maxWidth: "48ch" }}>
                                {r.label}
                              </span>
                            </span>
                            <span className="ml-auto font-semibold">{fmtInt(r.count)}</span>
                          </div>
                        );
                      })}
                    </>
                  );
                }}
              />
            </div>
          </Card>
        </div>

        {/* 2) Risky Events */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4 2xl:col-span-3">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <TitleWithHoverInfo title="Risky Events" info="High‑risk categories (failed auth, permission changes, export attempts, policy changes, deletions). Donut: category mix. Trend: risky events per day with top actors listed on hover." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={riskyParts} aria="Risky events by category" tooltipTitle="Risky events by category" />
              <div className="min-w-[140px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(summary.riskyEvents.current)}
                </div>
                <Delta current={summary.riskyEvents.current} previous={summary.riskyEvents.previous} invert={false} />
                <div className="text-[11px]" style={{ color: TK.muted }}>
                  {(summary.riskyEvents.current / Math.max(1, summary.totalEvents.current)) * 100 < 0.1
                    ? ""
                    : `${pf1.format(summary.riskyEvents.current / Math.max(1, summary.totalEvents.current))} of total`}
                </div>
              </div>
              <BarsTiny
                data={riskyBars}
                aria="Risky events per day"
                color={TK.risk}
                tooltipRender={(d) => {
                  const rows = top10PlusOthers(d.extra || [], "Other actors");
                  return (
                    <>
                      {rows.map((r: CountBy) => {
                        const actor = getActor(actors, r.key);
                        return (
                          <div key={r.key} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {actor ? <Avatar actor={actor} /> : <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: hashColor(r.key) }} />}
                              <div className="min-w-0">
                                <div className="truncate font-medium">{actor?.name || r.label}</div>
                                {actor ? (
                                  <div className="text-[11px]" style={{ color: TK.muted }}>
                                    {actor.role}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-[12px] font-semibold">{fmtInt(r.count)}</div>
                          </div>
                        );
                      })}
                    </>
                  );
                }}
              />
            </div>
          </Card>
        </div>

        {/* 3) Unique Actors */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4 2xl:col-span-3">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <TitleWithHoverInfo title="Unique Actors" info="Distinct users/service accounts observed in the period. Donut: role mix. Trend: unique actors per day; hover to see sample actors." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={roleParts} aria="Unique actors by role" tooltipTitle="Actors by role" />
              <div className="min-w-[140px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(summary.uniqueActors.current)}
                </div>
                <Delta current={summary.uniqueActors.current} previous={summary.uniqueActors.previous} />
              </div>
              <AreaTiny
                data={uniqArea}
                color={TK.brand}
                aria="Unique actors per day"
                tooltipRender={(d) => {
                  const ids: string[] = d.extra || [];
                  const rows = ids.slice(0, 10);
                  return (
                    <>
                      {rows.map((id) => {
                        const a = getActor(actors, id);
                        return (
                          <div key={id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {a ? <Avatar actor={a} /> : <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: hashColor(id) }} />}
                              <div className="font-medium">{a?.name || id}</div>
                            </div>
                            {a ? (
                              <div className="text-[11px]" style={{ color: TK.muted }}>
                                {a.role}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {ids.length > 10 ? (
                        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
                          +{ids.length - 10} others
                        </div>
                      ) : null}
                    </>
                  );
                }}
              />
            </div>
          </Card>
        </div>

        {/* 4) Data Exports */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4 2xl:col-span-3">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <TitleWithHoverInfo title="Data Exports" info="Export events (CSV, PDF, JSON/API, XLSX). Donut: format mix. Trend: daily exporters on hover." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={exportParts} aria="Exports by format" tooltipTitle="Exports by format" />
              <div className="min-w-[140px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(summary.exports.current)}
                </div>
                <Delta current={summary.exports.current} previous={summary.exports.previous} />
                <div className="text-[11px]" style={{ color: TK.muted }}>
                  {pf1.format(summary.exports.current / Math.max(1, summary.totalEvents.current))} of events
                </div>
              </div>
              <BarsTiny
                data={exportBars}
                color={TK.warn}
                aria="Exports per day"
                tooltipRender={(d) => {
                  const rows = top10PlusOthers(d.extra || [], "Other actors");
                  return (
                    <>
                      {rows.map((r: CountBy) => {
                        const actor = getActor(actors, r.key);
                        return (
                          <div key={r.key} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {actor ? <Avatar actor={actor} /> : <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: hashColor(r.key) }} />}
                              <div className="min-w-0">
                                <div className="truncate font-medium">{actor?.name || r.label}</div>
                                {actor ? (
                                  <div className="text-[11px]" style={{ color: TK.muted }}>
                                    {actor.role}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-[12px] font-semibold">{fmtInt(r.count)}</div>
                          </div>
                        );
                      })}
                    </>
                  );
                }}
              />
            </div>
          </Card>
        </div>

        {/* 5) Top Module */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4 2xl:col-span-3">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <TitleWithHoverInfo title="Top Module" info="Module with the most events this period. Donut: severity mix. Trend: per‑day totals with severity breakdown on hover." />
            </div>
            <div className="flex items-center justify-between gap-3">
              <DonutSplit parts={topModParts} aria="Top module severity mix" tooltipTitle={`${topModLabel} — severity`} />
              <div className="min-w-[140px]">
                <div className="text-[18px] font-extrabold" style={{ color: TK.text }}>
                  {topModLabel}
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  {pf1.format(summary.topModule.share01)} of all events
                </div>
              </div>
              <BarsTiny
                data={topModBars}
                color={modules.find((m) => m.key === summary.topModule.key)?.color || TK.brand}
                aria="Top module per day"
                tooltipRender={(d) => {
                  const rows: CountBy[] = d.extra || [];
                  return (
                    <>
                      {rows.map((r) => {
                        const color = r.key === "info" ? hashColor("info", "#60A5FA") : r.key === "warn" ? TK.warn : TK.risk;
                        return (
                          <div key={r.key} className="flex items-center gap-6 whitespace-nowrap">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                              <span className="truncate" style={{ color: TK.muted, maxWidth: "48ch" }}>
                                {r.label}
                              </span>
                            </span>
                            <span className="ml-auto font-semibold">{fmtInt(r.count)}</span>
                          </div>
                        );
                      })}
                    </>
                  );
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * DEMO (drop‑in) — deterministic mock model (replace with API wiring)
 * ========================================================================== */
export default function AuditKpiSummaryDemo() {
  const model = useMemo(() => buildMockAuditModel(15), []);
  return (
    <>
    <div className="px-4 pb-3-4" style={{ background: TK.subtle }}>
      <AuditKpiSummarySection
        model={model}
        onDrill={(dest, payload) => alert(`(demo) Drill → ${dest}\n\n${JSON.stringify(payload, null, 2)}`)}
      />
    </div>

          <ActivityLogTable />
              <div className="px-4 pb-3-4" style={{ background: TK.subtle }}><AutomationSuggestions /></div>
      </>
  );
}

/* ============================================================================
 * MOCK BUILDER
 * ========================================================================== */
function buildMockAuditModel(days: 7 | 15 | 30 = 15): AuditKpiModel {
  // deterministic RNG
  let s = 7;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });

  // Actors
  const mkActor = (id: number, name: string, role: RoleKey): Actor => ({ id: `u${id}`, name, role });
  const actors: Actor[] = [
    mkActor(1, "Sara Mehta", "editor"),
    mkActor(2, "Vikash Bharia", "admin"),
    mkActor(3, "Ava Patel", "viewer"),
    mkActor(4, "Diego Rossi", "editor"),
    mkActor(5, "Elena García", "viewer"),
    mkActor(6, "Hugo Silva", "viewer"),
    mkActor(7, "Ivy Chen", "editor"),
    mkActor(8, "Jay Park", "viewer"),
    mkActor(9, "Kai Müller", "admin"),
    mkActor(10, "Lina Novak", "viewer"),
    mkActor(11, "Ben Carter", "editor"),
    mkActor(12, "Chloe Nguyen", "service"),
  ];

  // Modules
  const modules = [
    { key: "seo", label: "SEO", color: "#3B82F6" },
    { key: "content", label: "Content", color: "#8B5CF6" },
    { key: "campaign", label: "Campaign", color: "#F59E0B" },
    { key: "reporting", label: "Reporting", color: "#10B981" },
    { key: "settings", label: "Settings", color: "#9CA3AF" },
  ] as Array<{ key: ModuleKey; label: string; color: string }>;

  // Utility counters
  const countsBy = (keys: string[], base: number, swing: number) =>
    keys.map((k, i) => ({ key: k, label: titleCase(k), count: Math.max(0, Math.round(base + (rnd() - 0.5) * swing + (i % 3))) }));

  // Period totals (baseline)
  const totalEventsCurrent = 520 + Math.round(rnd() * 140);
  const totalEventsPrevious = Math.max(50, Math.round(totalEventsCurrent * (0.88 + rnd() * 0.24)));

  // Module mix for period
  const moduleMix = modules.map((m, i) => ({ key: m.key, label: m.label, count: Math.round(totalEventsCurrent * (0.12 + 0.18 * rnd())) }));
  const mSum = moduleMix.reduce((s, x) => s + x.count, 0);
  // normalize to totalEventsCurrent
  moduleMix[0].count += Math.max(0, totalEventsCurrent - mSum);

  // Severity mix (info/warn/crit)
  const sevKeys = [
    { key: "info", label: "Info" },
    { key: "warn", label: "Warning" },
    { key: "crit", label: "Critical" },
  ];
  const sevMix = countsBy(sevKeys.map((s) => s.key), Math.round(totalEventsCurrent / 4), 50).map((r, i) => ({ key: r.key, label: sevKeys[i].label, count: r.count }));

  // Risky totals
  const riskKeys: Array<{ key: RiskKey; label: string }> = [
    { key: "auth_fail", label: "Failed Login" },
    { key: "perm_change", label: "Permission Change" },
    { key: "export_attempt", label: "Export Attempt" },
    { key: "policy_change", label: "Policy Change" },
    { key: "delete", label: "Deletion" },
  ];
  const riskyCurrent = Math.round(totalEventsCurrent * (0.08 + rnd() * 0.06));
  const riskyPrevious = Math.round(totalEventsPrevious * (0.07 + rnd() * 0.05));
  const riskyByCat = riskKeys.map((r) => ({ key: r.key, label: r.label, count: Math.max(1, Math.round(riskyCurrent * (0.12 + rnd() * 0.32))) }));
  const rbSum = riskyByCat.reduce((s, x) => s + x.count, 0);
  riskyByCat[0].count += Math.max(0, riskyCurrent - rbSum);

  // Unique actors
  const uniqCurrent = 40 + Math.round(rnd() * 28);
  const uniqPrevious = Math.max(10, Math.round(uniqCurrent * (0.88 + rnd() * 0.24)));
  const byRole = [
    { key: "admin", label: "Admin", count: 6 + Math.round(rnd() * 4) },
    { key: "editor", label: "Editor", count: 16 + Math.round(rnd() * 8) },
    { key: "viewer", label: "Viewer", count: 12 + Math.round(rnd() * 6) },
    { key: "service", label: "Service", count: 4 + Math.round(rnd() * 3) },
  ];

  // Exports
  const exportsCurrent = Math.round(totalEventsCurrent * (0.09 + rnd() * 0.04));
  const exportsPrevious = Math.round(totalEventsPrevious * (0.08 + rnd() * 0.04));
  const fmtKeys: Array<{ key: FormatKey; label: string }> = [
    { key: "csv", label: "CSV" },
    { key: "pdf", label: "PDF" },
    { key: "json", label: "JSON/API" },
    { key: "xlsx", label: "XLSX" },
  ];
  const byFormat = fmtKeys.map((f) => ({ key: f.key, label: f.label, count: Math.max(1, Math.round(exportsCurrent * (0.18 + rnd() * 0.32))) }));
  const bfSum = byFormat.reduce((s, x) => s + x.count, 0);
  byFormat[0].count += Math.max(0, exportsCurrent - bfSum);

  // Top module (by count)
  const topModule = [...moduleMix].sort((a, b) => b.count - a.count)[0];
  const topModuleShare = topModule.count / Math.max(1, totalEventsCurrent);
  const topSev = [
    { key: "info", label: "Info", count: Math.round(topModule.count * (0.6 + rnd() * 0.1)) },
    { key: "warn", label: "Warning", count: Math.round(topModule.count * (0.22 + rnd() * 0.1)) },
    { key: "crit", label: "Critical", count: Math.max(0, topModule.count - (Math.round(topModule.count * 0.7) + Math.round(topModule.count * 0.23))) },
  ];

  // Daily series — produce breakdowns for tooltips
  const eventsDaily = dates.map((t) => {
    const byModule = modules.map((m) => ({ key: m.key, label: m.label, count: Math.max(0, Math.round(6 + rnd() * 20)) }));
    const total = byModule.reduce((s, x) => s + x.count, 0);
    return { t, total, byModule };
  });

  const riskyDaily = dates.map((t) => {
    const byCategory = riskKeys.map((r) => ({ key: r.key, label: r.label, count: Math.max(0, Math.round(1 + rnd() * 6)) }));
    const total = byCategory.reduce((s, x) => s + x.count, 0);
    const topActors = actors
      .filter(() => rnd() > 0.35)
      .slice(0, 10)
      .map((a) => ({ key: a.id, label: a.name, count: Math.max(1, Math.round(rnd() * 3)) }));
    return { t, total, byCategory, topActors };
  });

  const uniqueActorsDaily = dates.map((t) => {
    const present = actors.filter(() => rnd() > 0.35).map((a) => a.id);
    return { t, count: new Set(present).size, actorIds: present.slice(0, 18) };
  });

  const exportsDaily = dates.map((t) => {
    const byActor = actors
      .filter(() => rnd() > 0.5)
      .map((a) => ({ key: a.id, label: a.name, count: Math.max(1, Math.round(rnd() * 3)) }));
    const total = byActor.reduce((s, x) => s + x.count, 0);
    return { t, total, byActor };
  });

  const topModuleDaily = dates.map((t) => {
    const info = Math.max(0, Math.round(6 + rnd() * 12));
    const warn = Math.max(0, Math.round(2 + rnd() * 6));
    const crit = Math.max(0, Math.round(1 + rnd() * 3));
    return {
      t,
      total: info + warn + crit,
      bySeverity: [
        { key: "info", label: "Info", count: info },
        { key: "warn", label: "Warning", count: warn },
        { key: "crit", label: "Critical", count: crit },
      ],
    };
  });

  return {
    periodDays: days,
    actors,
    modules,
    summary: {
      totalEvents: { current: totalEventsCurrent, previous: totalEventsPrevious, byModule: moduleMix, bySeverity: sevMix },
      riskyEvents: { current: riskyCurrent, previous: riskyPrevious, byCategory: riskyByCat, topActors: [] },
      uniqueActors: { current: uniqCurrent, previous: uniqPrevious, byRole, topActors: [] },
      exports: { current: exportsCurrent, previous: exportsPrevious, byFormat, byActor: [] },
      topModule: { key: topModule.key as ModuleKey, label: modules.find((m) => m.key === topModule.key)?.label || "Module", total: topModule.count, share01: topModuleShare, severity: topSev },
    },
    trends: {
      eventsDaily,
      riskyDaily,
      uniqueActorsDaily,
      exportsDaily,
      topModuleDaily,
    },
  };
}

function titleCase(s: string) {
  if (!s) return s;
  return s
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
