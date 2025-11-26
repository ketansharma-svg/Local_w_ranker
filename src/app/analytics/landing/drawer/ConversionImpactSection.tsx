"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip as RTooltip,
  Cell,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
} from "recharts";
import {
  Info,
  Target,
  Gauge,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Percent,
  Hash,
  TrendingUp,
  TrendingDown,
  BarChart3 as SectionIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Design tokens (aligned with recent panels)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  valueBlue: "#0077ff", // main KPI value color (spec)
  conv: { stroke: "#10B981", fill: "rgba(16,185,129,.18)" }, // green
  rate: { stroke: "#8B5CF6", fill: "rgba(139,92,246,.18)" }, // violet
  time: { stroke: "#4286F5", fill: "rgba(66,134,245,.18)" }, // blue
  funnel: ["#008CCD", "#10B981", "#F59E0B", "#EF4444"], // brand, green, amber, red
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Small UI primitives (chips, toggles, dot)
   ────────────────────────────────────────────────────────────── */
function Chip({
  children,
  onClear,
  title,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
    >
      {children}
      {onClear && (
        <button
          onClick={onClear}
          className="ml-0.5 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer"
          style={{ borderColor: TK.borderLight, color: TK.muted }}
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </span>
  );
}
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer"
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
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}
const Dot = ({ color }: { color: string }) => (
  <span
    className="inline-block h-2.5 w-2.5 rounded-full"
    style={{ background: color }}
    aria-hidden
  />
);

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const fmt = {
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n),
  pct: (v: number) =>
    `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 1,
    }).format(v)}%`,
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  },
};

function DeltaBadge({
  delta,
  inverse = false,
  format = (n: number) => fmt.one(Math.abs(n)),
}: {
  delta: number;
  inverse?: boolean; // lower is better if true
  format?: (n: number) => string;
}) {
  const isZero = Math.abs(delta) < 0.001;
  const positiveGood = !inverse;
  const good = (delta > 0 && positiveGood) || (delta < 0 && !positiveGood);
  const tone = isZero ? TK.muted : good ? "#10B981" : "#EF4444";
  const Icon = isZero ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: tone }}>
      <Icon size={14} />
      {format(delta)}
    </span>
  );
}

/* Mini area sparkline (tooltip uses white card + colored dot + icon label) */
function MiniArea({
  data,
  color,
  aria,
  valueFmt,
  icon,
  label,
}: {
  data: { date: string; value: number }[];
  color: { stroke: string; fill: string };
  aria: string;
  valueFmt: (n: number) => string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="w-full h-10">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={TK.borderLight} />
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
          <RTooltip
            isAnimationActive={false}
            cursor={{ stroke: color.stroke, strokeOpacity: 0.25 }}
            content={({ active, payload, label: l }: any) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              return (
                <div
                  className="rounded-md border bg-white p-2 text-xs shadow"
                  style={{ borderColor: TK.border }}
                  role="tooltip"
                  aria-label={aria}
                >
                  <div className="mb-1 font-medium" style={{ color: TK.muted }}>
                    {String(l)}
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                      <Dot color={color.stroke} />
                      <span className="inline-flex items-center justify-center h-3.5 w-3.5 text-[0]">
                        {/* icon box purely decorative */}
                        <span style={{ color: TK.brand }}>{icon}</span>
                      </span>
                      <span style={{ color: TK.muted }}>{label}</span>
                    </div>
                    <div className="font-semibold" style={{ color: TK.text }}>
                      {valueFmt(Number(p.value))}
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Area
            dataKey="value"
            type="monotone"
            stroke={color.stroke}
            fill={color.fill}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  title,
  tone,
  value,
  hint,
  delta,
  mini,
  valueFmt,
  iconRight,
  iconLabel,
}: {
  title: string;
  tone: { stroke: string; fill: string };
  value: React.ReactNode;
  hint: string;
  delta?: { v: number; inverse?: boolean; fmt?: (n: number) => string };
  mini: { date: string; value: number }[];
  valueFmt: (n: number) => string;
  iconRight: React.ReactNode; // branded icon (single, top-right)
  iconLabel: string; // label for mini-series tooltip
}) {
  return (
    <div
      className="rounded-lg bg-white p-3 h-full"
      style={{
        border: `1px solid ${TK.border}`,
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </div>
        {/* single branded icon (top-right as per spec) */}
        <span className="text-[0]">{iconRight}</span>
      </div>
      <div className="mt-1 flex items-end gap-3">
        <div className="min-w-[120px]">
          {/* main value in blue per spec */}
          <div className="text-2xl font-semibold" style={{ color: TK.valueBlue }}>
            {value}
          </div>
          {delta && (
            <div className="mt-1">
              <DeltaBadge delta={delta.v} inverse={delta.inverse} format={delta.fmt} />
            </div>
          )}
          <div className="mt-0.5 text-xs text-gray-500">{hint}</div>
        </div>
        <div className="w-[58%] ml-auto">
          <MiniArea
            data={mini}
            color={tone}
            aria={`${title} trend`}
            valueFmt={valueFmt}
            icon={<span style={{ color: TK.brand }}>{iconRight}</span>}
            label={iconLabel}
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Mock data + builders
   ────────────────────────────────────────────────────────────── */
type Point = { date: string; value: number };
function dayLabel(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}
function series(len: number, base: number, amp: number, jitter = 0): Point[] {
  const arr: Point[] = [];
  for (let i = len - 1; i >= 0; i--) {
    const s = Math.sin((i + 1) / 3) * amp;
    const j = jitter ? ((i * 7) % jitter) - jitter / 2 : 0;
    arr.push({ date: dayLabel(i), value: Math.max(0, base + s + j) });
  }
  return arr;
}
type FunnelStep = {
  key: string;
  name: string;
  count: number;
  pctTotal: number;
  pctPrev: number;
  dropFromPrev: number;
  color: string;
};
function buildFunnel(): FunnelStep[] {
  const total = 200;
  const passRates = [1, 0.825, 0.561, 0.397];
  const names = [
    "Landing Page View",
    "Scrolled ≥ 50%",
    "Clicked Primary CTA",
    "Goal Conversion",
  ];
  const colors = TK.funnel;
  const steps: FunnelStep[] = [];
  let prev = total;
  passRates.forEach((rate, idx) => {
    const count = idx === 0 ? total : Math.round(prev * rate);
    const pctTotal = (count / total) * 100;
    const pctPrev = idx === 0 ? 100 : (count / prev) * 100;
    const dropFromPrev = 100 - pctPrev;
    steps.push({
      key: `s${idx + 1}`,
      name: names[idx],
      count,
      pctTotal,
      pctPrev,
      dropFromPrev,
      color: colors[Math.min(idx, colors.length - 1)],
    });
    prev = count;
  });
  // pin last count to 37 to match copy
  const last = steps[steps.length - 1];
  last.count = 37;
  last.pctTotal = (last.count / total) * 100;
  last.pctPrev = (last.count / steps[steps.length - 2].count) * 100;
  last.dropFromPrev = 100 - last.pctPrev;
  return steps;
}

/* ──────────────────────────────────────────────────────────────
   Funnel tooltip (smart popover with colored dots & metric icons)
   ────────────────────────────────────────────────────────────── */
function FunnelTooltip({
  active,
  payload,
  showPctTotal,
}: {
  active?: boolean;
  payload?: any[];
  showPctTotal: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as FunnelStep | undefined;
  if (!p) return null;

  return (
    <div
      className="rounded-md text-xs"
      style={{
        background: "#fff",
        border: `1px solid ${TK.border}`,
        boxShadow: "0 6px 20px rgba(0,0,0,.08)",
        padding: "10px 12px",
        minWidth: 240,
      }}
      role="tooltip"
    >
      <div className="mb-1 flex items-center gap-2">
        <SectionIcon size={14} style={{ color: TK.brand }} />
        <span className="font-medium" style={{ color: TK.text }}>
          {p.name}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Dot color={p.color} />
            <Hash size={12} style={{ color: TK.brand }} />
            <span style={{ color: TK.muted }}>At this step</span>
          </div>
          <div className="font-semibold" style={{ color: TK.text }}>
            {fmt.num(p.count)}
          </div>
        </div>

        {showPctTotal ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dot color={p.color} />
              <Percent size={12} style={{ color: TK.brand }} />
              <span style={{ color: TK.muted }}>% of total</span>
            </div>
            <div className="font-semibold" style={{ color: TK.text }}>
              {fmt.pct(p.pctTotal)}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dot color={p.color} />
              <TrendingUp size={12} style={{ color: TK.brand }} />
              <span style={{ color: TK.muted }}>% vs previous</span>
            </div>
            <div className="font-semibold" style={{ color: TK.text }}>
              {fmt.pct(p.pctPrev)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Dot color="#EF4444" />
            <TrendingDown size={12} style={{ color: TK.brand }} />
            <span style={{ color: TK.muted }}>Drop‑off</span>
          </div>
          <div className="font-semibold" style={{ color: "#EF4444" }}>
            {fmt.pct(p.dropFromPrev)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main: Section 5 – Conversion Impact (drop‑in)
   ────────────────────────────────────────────────────────────── */
export default function ConversionImpactSection() {
  const steps = React.useMemo(() => buildFunnel(), []);
  const totalSessions = 200;
  const totalConversions = steps[steps.length - 1].count;
  const convRate = (totalConversions / totalSessions) * 100;

  const convTrend = series(14, totalConversions - 6, 5, 0);
  const rateTrend = series(14, convRate - 0.6, 0.7, 0);
  const timeToConvertSec = 104;
  const timeTrend = series(14, timeToConvertSec, 9, 0);

  const convDelta = 3;
  const rateDelta = 0.4;
  const timeDelta = -6;

  // Controls
  const [showPctTotal, setShowPctTotal] = React.useState(true);
  const [hoverKey, setHoverKey] = React.useState<string | null>(null);

  return (
    <section
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Conversion Impact – Page Detail View
          </div>
          <Chip title="Source">
            <Target size={12} style={{ color: TK.brand }} />
            GA4
          </Chip>
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={showPctTotal}
            onChange={setShowPctTotal}
            label={showPctTotal ? "% of total" : "% vs previous"}
          />
          <div className="inline-flex items-center gap-1 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            GA4 conversions, session‑scoped
          </div>
        </div>
      </div>

      {/* Two-column layout: KPI cards (left) + Funnel (right) */}
      <div
        className="mt-3 grid gap-3 items-stretch"
        style={{ gridTemplateColumns: "360px 1fr" }}
      >
        {/* KPI cards */}
        <div className="grid grid-rows-3 gap-3">
          <KpiCard
            title="Total Conversions"
            tone={TK.conv}
            value={fmt.num(totalConversions)}
            hint="Goals completed from this page"
            delta={{ v: convDelta }}
            mini={convTrend}
            valueFmt={(n) => fmt.num(n)}
            iconRight={<Target className="h-4 w-4" style={{ color: TK.brand }} />}
            iconLabel="Conversions"
          />
          <KpiCard
            title="Conversion Rate"
            tone={TK.rate}
            value={fmt.pct(convRate)}
            hint="This page’s CR vs overall sessions"
            delta={{ v: rateDelta, fmt: (n) => `${fmt.one(Math.abs(n))} pts` }}
            mini={rateTrend}
            valueFmt={(n) => fmt.pct(n)}
            iconRight={<Gauge className="h-4 w-4" style={{ color: TK.brand }} />}
            iconLabel="CR"
          />
          <KpiCard
            title="Avg. Time to Convert"
            tone={TK.time}
            value={fmt.time(timeToConvertSec)}
            hint="Avg. time from entry to goal trigger"
            delta={{ v: timeDelta, inverse: true, fmt: (n) => fmt.time(Math.abs(n)) }}
            mini={timeTrend}
            valueFmt={(n) => fmt.time(n)}
            iconRight={<Timer className="h-4 w-4" style={{ color: TK.brand }} />}
            iconLabel="Time"
          />
        </div>

        {/* Funnel */}
        <div
          className="rounded-lg bg-white h-full p-3"
          style={{
            border: `1px solid ${TK.border}`,
            boxShadow: "0 1px 2px rgba(17,24,39,.06)",
            minHeight: 330,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-gray-700">
              Funnel – Path to Conversion
            </div>
            <div className="text-xs text-gray-500">Hover a step for details</div>
          </div>

          <div className="mt-2 py-2 w-[90%] h-[300px]">
            <ResponsiveContainer>
              <FunnelChart>
                <RTooltip
                  cursor={false}
                  content={(props) => (
                    <FunnelTooltip showPctTotal={showPctTotal} {...props} />
                  )}
                />
                <Funnel dataKey="count" data={steps} isAnimationActive>
                  <LabelList
                    position="left"
                    dataKey="name"
                    className="text-sm"
                    style={{ fill: "#374151" }}
                  />
                  <LabelList
                    position="right"
                    dataKey={showPctTotal ? "pctTotal" : "pctPrev"}
                    formatter={(_value: number, _n: any, entry: any) => {
                      const p: FunnelStep | undefined = entry?.payload;
                      if (!p) return "";
                      const pct = showPctTotal ? fmt.pct(p.pctTotal) : fmt.pct(p.pctPrev);
                      const count = fmt.num(p.count);
                      const drop = fmt.pct(p.dropFromPrev);
                      return `${count} • ${pct} • −${drop}`;
                    }}
                    style={{ fill: "#111827", fontWeight: 600 }}
                  />
                  {steps.map((s) => (
                    <Cell
                      key={s.key}
                      fill={s.color}
                      stroke={hoverKey === s.key ? "rgba(0,0,0,.25)" : "rgba(0,0,0,.08)"}
                      strokeWidth={hoverKey === s.key ? 2 : 1}
                      style={{
                        transition: "opacity 160ms ease, filter 160ms ease, transform 160ms ease",
                        opacity: hoverKey && hoverKey !== s.key ? 0.7 : 1,
                        filter:
                          hoverKey === s.key ? "brightness(1.06) saturate(1.05)" : "none",
                        transform: hoverKey === s.key ? "translateX(2px)" : "translateX(0)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoverKey(s.key)}
                      onMouseLeave={() => setHoverKey(null)}
                    />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with branded icons */}
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
            {steps.map((s) => (
              <div key={s.key} className="inline-flex items-center gap-2">
                <Dot color={s.color} />
                <Target size={12} style={{ color: TK.brand }} />
                <span className="font-medium">{s.name}:</span>
                <span>{fmt.num(s.count)}</span>
                <span>({fmt.pct(s.pctTotal)})</span>
                {s.dropFromPrev > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <TrendingDown size={12} />
                    {fmt.pct(s.dropFromPrev)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal Attribution Table */}
      <div className="mt-4">
        <div className="text-[13px] font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <SectionIcon size={14} style={{ color: TK.brand }} />
          Goal Attribution
        </div>
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: `1px solid ${TK.border}`,
            boxShadow: "0 1px 2px rgba(17,24,39,.06)",
          }}
        >
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2">Goal Name</th>
                <th className="px-3 py-2">Conversions</th>
                <th className="px-3 py-2">CR</th>
                <th className="px-3 py-2">Drop‑off Before</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  goal: "Form Submit",
                  conv: 21,
                  cr: 3.2,
                  drop: "62% dropped before scroll",
                },
                {
                  goal: "Button Click + Lead",
                  conv: 16,
                  cr: 4.5,
                  drop: "49% dropped before CTA",
                },
              ].map((row, i) => (
                <tr
                  key={row.goal}
                  className="border-t transition duration-150 ease-in-out hover:bg-[#FBFDFF] hover:translate-x-[2px]"
                  style={{ borderColor: TK.border }}
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Target size={14} style={{ color: TK.brand }} />
                      <span>{row.goal}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">{fmt.num(row.conv)}</td>
                  <td className="px-3 py-2">{fmt.pct(row.cr)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <Dot color="#EF4444" />
                      {row.drop}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      className="h-8 px-3 rounded border text-xs font-medium cursor-pointer hover:bg-[#F5F7FA]"
                      style={{ borderColor: TK.border }}
                      onClick={() => alert(`Assigning optimization task for: ${row.goal}`)}
                    >
                      Assign Optimization Task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Option: View full funnel in new window (Phase 1.1)
        </div>
      </div>
    </section>
  );
}
