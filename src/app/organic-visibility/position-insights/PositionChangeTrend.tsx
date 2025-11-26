"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell,
} from "recharts";
import {
  Calendar,
  Download,
  Info,
  MonitorSmartphone,
  Smartphone,
  TrendingUp,
} from "lucide-react";

/* =========================
   Wranker tokens (fallbacks)
   ========================= */
const TOKENS = {
  brand: "var(--wr-brand,#008CCD)",
  brand50: "var(--wr-brand-50,#D2EFFF)",
  surface: "var(--wr-surface,#FFFFFF)",
  text: "var(--wr-text,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  success: "var(--wr-success,#2ECC71)",
  danger: "var(--wr-danger,#FF6B6B)",
  warning: "var(--wr-warning,#F59E0B)",
};

type ChangeKey = "new" | "lost" | "improved" | "declined";
type Mode = "count" | "pct";
type Range = "7d" | "30d" | "90d";
type Device = "desktop" | "mobile";

export type PositionChangeDatum = {
  date: string; // ISO yyyy-mm-dd
  new: number;
  lost: number;
  improved: number;
  declined: number;
};

const ORDER: ChangeKey[] = ["new", "lost", "improved", "declined"]; // bottom -> top
const COLORS: Record<ChangeKey, string> = {
  new: "var(--wr-success,#2ECC71)",
  lost: "var(--wr-danger,#FF6B6B)",
  improved: "var(--wr-brand,#008CCD)",
  declined: "var(--wr-warning,#F59E0B)",
};

const nf = (n: number) => new Intl.NumberFormat().format(n);
const pctf = (n: number) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)}%`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/* Demo data */
function makeDemoData(days: number): PositionChangeDatum[] {
  const out: PositionChangeDatum[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const base = 40 + Math.round(10 * Math.sin(i / 2));
    out.push({
      date: iso(dt),
      new: Math.max(5, Math.round(base * 0.2 + (i % 3))),
      lost: Math.max(3, Math.round(base * 0.12 + ((i + 1) % 3))),
      improved: Math.max(10, Math.round(base * 0.45 + (i % 5))),
      declined: Math.max(8, Math.round(base * 0.23 + ((i + 2) % 4))),
    });
  }
  return out;
}

/* =========================
   Modular UI (chips/toggles)
   ========================= */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
              active ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
            }`}
            type="button"
            title={typeof it.label === "string" ? it.label : undefined}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TOKENS.border, color: active ? TOKENS.text : TOKENS.muted }}
      title={title || label}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{
          borderColor: active ? TOKENS.brand : TOKENS.border,
          background: active ? "rgba(0,140,205,0.15)" : "var(--wr-bg-subtle,#F5F7FA)",
        }}
        aria-hidden
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{
            background: TOKENS.brand,
            transform: active ? "translateX(20px)" : "translateX(2px)",
          }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

function Chip({
  children,
  onClick,
  active = false,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm cursor-pointer ${
        active ? "bg-[var(--wr-bg-subtle,#F5F7FA)]" : "bg-white hover:bg-gray-50"
      }`}
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    >
      {children}
    </button>
  );
}

/* =========================
   Rounded top-only bar shape
   ========================= */
function roundedTopRectPath(x: number, y: number, w: number, h: number, r = 6) {
  // guard for tiny bars
  if (h <= r) return `M${x},${y + h} H${x + w} V${y} H${x} Z`;
  return `
    M${x},${y + r}
    A${r},${r} 0 0 1 ${x + r},${y}
    H${x + w - r}
    A${r},${r} 0 0 1 ${x + w},${y + r}
    V${y + h}
    H${x}
    Z
  `;
}

/** find the visible top-of-stack key for this data point */
function topKeyForPayload(payload: any, visibleOrder: ChangeKey[]): ChangeKey | null {
  for (let i = visibleOrder.length - 1; i >= 0; i--) {
    const k = visibleOrder[i];
    const v = Number(payload?.[k] ?? 0);
    if (v > 0) return k;
  }
  return null;
}

/* =========================
   Tooltip
   ========================= */
function Tip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  mode: Mode;
}) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload
    .map((p) => ({
      name: p.name as string,
      val: p.value as number,
      color: p.fill as string,
    }))
    .sort(
      (a, b) => ORDER.indexOf(a.name as ChangeKey) - ORDER.indexOf(b.name as ChangeKey)
    );
  return (
    <div
      className="rounded-md border bg-white p-2.5 shadow"
      style={{ borderColor: TOKENS.border, boxShadow: "var(--wr-shadow-sm,0 2px 6px rgba(0,0,0,.05))" }}
    >
      <div className="mb-1 text-[13px] font-semibold" style={{ color: TOKENS.text }}>
        {label}
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded"
              style={{ background: r.color }}
            />
            <span className="text-[12px]">{r.name[0].toUpperCase() + r.name.slice(1)}</span>
            <span className="ml-auto text-[12px]" style={{ color: TOKENS.text }}>
              {mode === "pct" ? pctf(r.val) : nf(r.val)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Main
   ========================= */
export default function PositionChangeTrend({
  data,
  defaultRange = "30d",
  defaultMode = "pct",
}: {
  data?: PositionChangeDatum[];
  defaultRange?: Range;
  defaultMode?: Mode;
}) {
  // font at root
  const fontStyle = {
    fontFamily:
      'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
  } as const;

  const [range, setRange] = useState<Range>(defaultRange);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [device, setDevice] = useState<Device>("desktop");

  const [vis, setVis] = useState<Record<ChangeKey, boolean>>({
    new: true,
    lost: true,
    improved: true,
    declined: true,
  });

  const [hoverX, setHoverX] = useState<number | null>(null);
  const [pinnedX, setPinnedX] = useState<number | null>(null);

  /* data */
  const base: PositionChangeDatum[] = useMemo(
    () => (Array.isArray(data) && data.length ? data : makeDemoData(90)),
    [data]
  );

  const filtered: PositionChangeDatum[] = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const sorted = [...base].sort((a, b) => (a.date > b.date ? 1 : -1));
    return sorted.slice(Math.max(0, sorted.length - days));
  }, [base, range]);

  const visibleOrder: ChangeKey[] = useMemo(
    () => ORDER.filter((k) => vis[k]),
    [vis]
  );

  const prepared: PositionChangeDatum[] = useMemo(() => {
    if (!filtered.length) return [];
    return filtered.map((d) => {
      const sum = visibleOrder.reduce((s, k) => s + (d[k] ?? 0), 0) || 1;
      if (mode === "pct") {
        return {
          date: d.date,
          new: vis.new ? (d.new * 100) / sum : 0,
          lost: vis.lost ? (d.lost * 100) / sum : 0,
          improved: vis.improved ? (d.improved * 100) / sum : 0,
          declined: vis.declined ? (d.declined * 100) / sum : 0,
        };
      }
      return {
        date: d.date,
        new: vis.new ? d.new : 0,
        lost: vis.lost ? d.lost : 0,
        improved: vis.improved ? d.improved : 0,
        declined: vis.declined ? d.declined : 0,
      };
    });
  }, [filtered, mode, vis, visibleOrder]);

  const maxY = useMemo(() => {
    if (!prepared.length) return 0;
    if (mode === "pct") return 100;
    return Math.max(
      ...prepared.map(
        (d) => (d.new ?? 0) + (d.lost ?? 0) + (d.improved ?? 0) + (d.declined ?? 0)
      )
    );
  }, [prepared, mode]);

  const activeX = pinnedX ?? hoverX ?? null;

  // keyboard support when pinned
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!prepared.length) return;
      if (e.key === "Escape") {
        setPinnedX(null);
        return;
      }
      if (pinnedX == null) return;
      if (e.key === "ArrowLeft") {
        setPinnedX(Math.max(0, pinnedX - 1));
      } else if (e.key === "ArrowRight") {
        setPinnedX(Math.min(prepared.length - 1, pinnedX + 1));
      }
    },
    [prepared.length, pinnedX]
  );

  const exportCSV = () => {
    const header = ["date", ...ORDER].join(",");
    const lines = filtered.map((d) => [d.date, d.new, d.lost, d.improved, d.declined].join(","));
    const blob = new Blob([header + "\n" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "position-change-trend.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const empty = prepared.length === 0;

  return (
    <section
      className="w-full rounded-xl border bg-white shadow-sm mt-4"
      style={fontStyle}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="Position Change Trend"
    >
      {/* Header */}
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: TOKENS.borderLight }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: TOKENS.brand }} />
          <h3 className="truncate text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Position Change Trend
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* % of total toggle */}
          <ToggleSwitch
            label="% of total"
            active={mode === "pct"}
            onClick={() => setMode((m) => (m === "pct" ? "count" : "pct"))}
            title="Normalize each day to 100%"
          />

          {/* Quick filters */}
          <Chip
            onClick={() =>
              setVis({ new: true, lost: true, improved: true, declined: true })
            }
            title="Show all"
          >
            All
          </Chip>
          <Chip
            onClick={() =>
              setVis((s) => ({ ...s, new: false, lost: false, improved: true, declined: true }))
            }
            title="Improved + Declined only"
          >
            Improved + Declined
          </Chip>

          {/* Range segmented */}
          <Chip title="Date range">
            <Calendar className="h-4 w-4" style={{ color: TOKENS.brand }} />
            <Segmented<Range>
              ariaLabel="Date range"
              value={range}
              onChange={setRange}
              items={[
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
                { value: "90d", label: "90d" },
              ]}
            />
          </Chip>

          {/* Device segmented */}
          <Segmented<Device>
            ariaLabel="Device"
            value={device}
            onChange={setDevice}
            items={[
              {
                value: "desktop",
                label: (
                  <span className="inline-flex items-center gap-1">
                    <MonitorSmartphone className="h-4 w-4" style={{ color: TOKENS.brand }} />
                    Desktop
                  </span>
                ),
              },
              {
                value: "mobile",
                label: (
                  <span className="inline-flex items-center gap-1">
                    <Smartphone className="h-4 w-4" style={{ color: TOKENS.brand }} />
                    Mobile
                  </span>
                ),
              },
            ]}
          />

          {/* Export */}
          <button
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            title="Export CSV"
          >
            <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
            Export CSV
          </button>
        </div>
      </header>

      {/* Legend (top-left) */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        {ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setVis((s) => ({ ...s, [k]: !s[k] }))}
            aria-pressed={vis[k]}
            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs cursor-pointer"
            style={{
              borderColor: TOKENS.border,
              opacity: vis[k] ? 1 : 0.45,
              color: TOKENS.text,
            }}
            title={`Toggle ${k}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded"
              style={{ background: COLORS[k] }}
            />
            <span className="font-medium">{k[0].toUpperCase() + k.slice(1)}</span>
          </button>
        ))}
        <span
          className="ml-auto inline-flex items-center gap-1.5 text-xs"
          style={{ color: TOKENS.muted }}
        >
          <Info className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
          Hover to preview, click to pin
        </span>
      </div>

      {/* Chart */}
      <div className="h-[360px] px-2 pb-2">
        <ResponsiveContainer>
          <BarChart
            data={prepared}
            onMouseMove={(s: any) => {
              if (s?.activeTooltipIndex !== undefined && pinnedX == null) {
                setHoverX(s.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoverX(null)}
            onClick={(s: any) => {
              if (s?.activeTooltipIndex !== undefined) setPinnedX(s.activeTooltipIndex);
            }}
            barGap={0}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke={TOKENS.borderLight} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: TOKENS.muted }}
              axisLine={{ stroke: TOKENS.borderLight }}
              tickLine={{ stroke: TOKENS.borderLight }}
            />
            <YAxis
              domain={[0, maxY]}
              tick={{ fontSize: 12, fill: TOKENS.muted }}
              axisLine={{ stroke: TOKENS.borderLight }}
              tickLine={{ stroke: TOKENS.borderLight }}
              tickFormatter={(v) => (mode === "pct" ? `${Math.round(v)}%` : nf(v))}
            />
            <RTooltip
              cursor={{ fill: "rgba(0,0,0,0.035)" }}
              content={<Tip mode={mode} />}
            />
            {/* Bars bottom->top. Each uses a shape function that rounds ONLY the top-of-stack
                for that specific column (even when legend visibility changes). */}
            {ORDER.map((key) =>
              vis[key] ? (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  stackId="S"
                  fill={COLORS[key]}
                  isAnimationActive
                  shape={(props: any) => {
                    const { x, y, width, height, payload, fill } = props;
                    if (!height || !width) return <g></g>;
                    const top = topKeyForPayload(payload, visibleOrder);
                    const isTop = key === top;
                    if (!isTop) {
                      return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                    }
                    const d = roundedTopRectPath(x, y, width, height, 6);
                    return <path d={d} fill={fill} />;
                  }}
                >
                  {prepared.map((_, i) => (
                    <Cell
                      key={`cell-${key}-${i}`}
                      fill={COLORS[key]}
                      fillOpacity={activeX == null ? 1 : activeX === i ? 1 : 0.35}
                    />
                  ))}
                </Bar>
              ) : null
            )}
            {/* No Recharts <Legend /> — we use our modular legend chips at top-left */}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Empty state */}
      {empty && (
        <div className="px-4 pb-4 text-sm" style={{ color: TOKENS.muted }}>
          No data for the selected filters.
        </div>
      )}
    </section>
  );
}


