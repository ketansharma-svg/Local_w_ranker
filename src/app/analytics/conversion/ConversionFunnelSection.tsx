"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip as RTooltip,
  Cell,
} from "recharts";
import {
  // Branded, lucide icons
  Funnel as FunnelIcon, // alias to avoid name clash with recharts<Funnel>
  Info,
  Download,
  ChevronDown,
  Globe2,
  Target,
  MousePointerClick,
  FileText,
  Send,
  Globe,
  ArrowDownToLine,
  Users,
  Percent,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  CheckCircle2,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Design tokens (aligned to Wranker theme / reference)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,
  funnel: ["#008CCD", "#10B981", "#F59E0B", "#6366F1", "#EF4444", "#14B8A6"], // brand, green, amber, violet, red, teal
};
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
const fmt = {
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n),
  pct: (v: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(v)}%`,
};

type Device = "All" | "Desktop" | "Mobile";
type Goal = "All Conversions" | "Lead Gen" | "Checkout";

type FunnelStep = {
  key: string;
  name: string;
  count: number; // absolute number at this step
  pctTotal: number; // % of total (0-100)
  pctPrev: number; // % vs previous step (0-100)
  dropFromPrev: number; // % drop from previous (0-100)
  color: string;
  isGoal?: boolean;
};

type Props = {
  className?: string;
  /** Click handler for any funnel step (e.g., open Page Analyzer) */
  onStepClick?: (step: FunnelStep) => void;
  /** CTA handler for drop-off analyzer (kept from original) */
  onAnalyzeClick?: () => void;
  /** Optional: override default mock total for prettier math */
  totalSessions?: number;
};

/* ──────────────────────────────────────────────────────────────
   Mock data models
   ────────────────────────────────────────────────────────────── */
function getMockCounts(device: Device, goal: Goal): number[] {
  // Base (All devices) – 10,000 → 7,200 → 4,200 → 3,000 → 2,100 → 1,320
  const base = [10000, 7200, 4200, 3000, 2100, 1320];

  const devScale: Record<Device, number[]> = {
    All: [1, 1, 1, 1, 1, 1],
    Desktop: [0.46, 0.5, 0.53, 0.55, 0.53, 0.54],
    Mobile: [0.54, 0.5, 0.47, 0.45, 0.47, 0.46],
  };

  const goalAdj: Record<Goal, number[]> = {
    "All Conversions": [1, 1, 1, 1, 1, 1],
    "Lead Gen": [1, 0.98, 1.04, 1.02, 1.06, 1.1], // better tail for form submit
    Checkout: [1, 0.95, 0.92, 0.9, 0.88, 0.86], // slightly more drop-off
  };

  const scaled = base.map((v, i) =>
    Math.max(0, Math.round(v * devScale[device][i] * goalAdj[goal][i])),
  );

  // Ensure non-increasing for sane demo
  for (let i = 1; i < scaled.length; i++) {
    if (scaled[i] > scaled[i - 1]) {
      scaled[i] = Math.max(0, scaled[i - 1] - Math.round((scaled[i] - scaled[i - 1]) * 0.5));
    }
  }
  return scaled;
}

function toSteps(counts: number[], colors = TK.funnel): FunnelStep[] {
  const total = counts[0] || 0;
  const names = [
    "Landing Page Visit",
    "Scrolled ≥ 50%",
    "CTA Button Clicked",
    "Form Viewed (opt.)",
    "Form Submitted",
    "Goal Completed",
  ] as const;

  const steps: FunnelStep[] = [];
  let prev = counts[0];

  for (let i = 0; i < counts.length; i++) {
    const count = counts[i];
    const pctTotal = total > 0 ? (count / total) * 100 : 0;
    const pctPrev = i === 0 ? 100 : prev > 0 ? (count / prev) * 100 : 0;
    const dropFromPrev = Math.max(0, 100 - pctPrev);

    steps.push({
      key: `s${i + 1}`,
      name: names[i],
      count,
      pctTotal,
      pctPrev,
      dropFromPrev,
      color: colors[Math.min(i, colors.length - 1)],
      isGoal: i === counts.length - 1,
    });
    prev = count;
  }
  return steps;
}

/* ──────────────────────────────────────────────────────────────
   Export helpers (single Export button)
   ────────────────────────────────────────────────────────────── */
function exportStepsCSV(steps: FunnelStep[], filename = "conversion_funnel_steps.csv") {
  const header = ["Step", "Count", "% of total", "% vs previous", "Drop-off %"].join(",");
  const body = steps
    .map((s) =>
      [s.name, s.count, s.pctTotal.toFixed(1), s.pctPrev.toFixed(1), s.dropFromPrev.toFixed(1)].join(","),
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportPNG(el: HTMLElement | null, filename = "conversion_funnel.png") {
  if (!el) return;
  const wrapper = `
<svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK}">
      ${el.outerHTML}
    </div>
  </foreignObject>
</svg>`;
  const blob = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ──────────────────────────────────────────────────────────────
   Modular chips & toggle switch (shared pattern)
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
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
      title={title}
    >
      {children}
      {onClear && (
        <button
          className="ml-0.5 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer"
          style={{ borderColor: TK.borderLight, color: TK.muted }}
          onClick={onClear}
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

/* ──────────────────────────────────────────────────────────────
   Smart Tooltip (popover) with branded icons and color dots
   ────────────────────────────────────────────────────────────── */
function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
      }}
    />
  );
}
function FunnelTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: FunnelStep | undefined = payload[0]?.payload;
  if (!p) return null;

  const vsPrevUp = p.pctPrev >= 100;

  return (
    <div
      className="rounded-md text-sm"
      style={{
        background: "#fff",
        border: `1px solid ${TK.border}`,
        boxShadow: "0 6px 20px rgba(0,0,0,.08)",
        padding: "10px 12px",
        minWidth: 240,
      }}
    >
      <div className="flex items-center gap-2 font-semibold" style={{ color: TK.text }}>
        <Target className="h-4 w-4" style={{ color: TK.brand }} />
        {p.name}
        {p.isGoal && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: "#10B981", color: "#059669", background: "rgba(16,185,129,.08)" }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <Dot color={p.color} />
          <div className="flex-1 text-gray-600">At this step</div>
          <div className="font-medium" style={{ color: TK.text }}>
            {fmt.num(p.count)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Percent className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <Dot color={TK.brand} />
          <div className="flex-1 text-gray-600">% of total</div>
          <div className="font-medium" style={{ color: TK.text }}>
            {fmt.pct(p.pctTotal)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {vsPrevUp ? (
            <TrendingUp className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          )}
          <Dot color={vsPrevUp ? "#10B981" : "#EF4444"} />
          <div className="flex-1 text-gray-600">% vs previous</div>
          <div className="font-medium" style={{ color: TK.text }}>
            {fmt.pct(p.pctPrev)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowDownRight className="h-3.5 w-3.5" style={{ color: TK.brand }} />
          <Dot color="#EF4444" />
          <div className="flex-1 text-gray-600">Drop‑off</div>
          <div className="font-medium" style={{ color: "#EF4444" }}>
            {fmt.pct(p.dropFromPrev)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Small UI atoms
   ────────────────────────────────────────────────────────────── */
function DropTag({ value }: { value: number }) {
  if (!value || value <= 0) return null;
  return (
    <span
      className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: "rgba(239,68,68,.08)",
        color: "#EF4444",
        border: "1px solid rgba(239,68,68,.25)",
      }}
    >
      <ArrowDownRight size={14} className="mr-1" />
      {fmt.pct(value)}
    </span>
  );
}

/* Step icons (brand colored) for legend list */
function StepIcon({ idx }: { idx: number }) {
  const st = { className: "h-3.5 w-3.5", style: { color: TK.brand } as React.CSSProperties };
  switch (idx) {
    case 0:
      return <Globe2 {...st} />;
    case 1:
      return <ArrowDownToLine {...st} />;
    case 2:
      return <MousePointerClick {...st} />;
    case 3:
      return <FileText {...st} />;
    case 4:
      return <Send {...st} />;
    default:
      return <Target {...st} />;
  }
}

/* ──────────────────────────────────────────────────────────────
   Main: Conversion Funnel Section (Section 4)
   ────────────────────────────────────────────────────────────── */
export default function ConversionFunnelSection({
  className,
  onStepClick,
  onAnalyzeClick,
  totalSessions = 10000,
}: Props) {
  const [device, setDevice] = React.useState<Device>("All");
  const [goal, setGoal] = React.useState<Goal>("All Conversions");
  const [showDropTags, setShowDropTags] = React.useState(true);

  const [hoverKey, setHoverKey] = React.useState<string | null>(null);

  const steps = React.useMemo(() => {
    const counts = getMockCounts(device, goal);
    if (totalSessions && counts.length > 0) {
      const ratio = totalSessions / counts[0];
      for (let i = 0; i < counts.length; i++) counts[i] = Math.round(counts[i] * ratio);
    }
    return toSteps(counts);
  }, [device, goal, totalSessions]);

  // Export dropdown
  const [exportOpen, setExportOpen] = React.useState(false);
  const exportRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <section
      className={["rounded-md bg-white p-4 mt-4", className].filter(Boolean).join(" ")}
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Conversion Funnel Breakdown
          </div>
          <div className="inline-flex items-center gap-1 text-sm text-gray-500">
            <Info className="h-4 w-4" style={{ color: TK.brand }} /> GA4 events, session scoped
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Device select */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2">
              <Globe className="h-4 w-4" style={{ color: TK.brand }} />
            </span>
            <select
              className="h-8 pl-7 pr-2 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={device}
              onChange={(e) => setDevice(e.target.value as Device)}
              aria-label="Device"
            >
              <option>All</option>
              <option>Desktop</option>
              <option>Mobile</option>
            </select>
          </div>

          {/* Goal select */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2">
              <Target className="h-4 w-4" style={{ color: TK.brand }} />
            </span>
            <select
              className="h-8 pl-7 pr-2 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
              aria-label="Goal"
            >
              <option>All Conversions</option>
              <option>Lead Gen</option>
              <option>Checkout</option>
            </select>
          </div>

          {/* Toggle: show drop-off tags in legend */}
          <ToggleSwitch checked={showDropTags} onChange={setShowDropTags} label="Show drop‑off tags" />

          {/* Export (single button dropdown) */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
              style={{ borderColor: TK.border }}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              title="Export"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 z-20 mt-2 w-56 rounded-md border bg-white p-1 shadow"
                style={{ borderColor: TK.border }}
                role="menu"
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportPNG(chartRef.current, "conversion_funnel.png");
                    setExportOpen(false);
                  }}
                >
                  PNG — Funnel
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportStepsCSV(steps);
                    setExportOpen(false);
                  }}
                >
                  CSV — Steps
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chips row (modular summary) */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Chip onClear={() => setDevice("All")} title="Device scope">
          <Globe2 size={12} style={{ color: TK.brand }} />
          Device: <strong>{device}</strong>
        </Chip>
        <Chip onClear={() => setGoal("All Conversions")} title="Selected goal">
          <Target size={12} style={{ color: TK.brand }} />
          Goal: <strong>{goal}</strong>
        </Chip>
      </div>

      {/* Funnel */}
      <div
        ref={chartRef}
        className="mt-3 rounded-lg bg-white p-3"
        style={{
          border: `1px solid ${TK.border}`,
          boxShadow: "0 1px 2px rgba(17,24,39,.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-gray-700">Funnel — Path to Goal</div>
          <div className="text-xs text-gray-500">Hover for counts &amp; rates • Click a step for details</div>
        </div>

        <div className="mt-2 h-[300px] w-full">
          <ResponsiveContainer>
            <FunnelChart
              onMouseLeave={() => setHoverKey(null)}
            >
              <RTooltip content={<FunnelTooltip />} />
              <Funnel dataKey="count" data={steps} isAnimationActive>
                {/* Step titles on the left */}
                <LabelList position="left" dataKey="name" className="text-sm" style={{ fill: "#374151" }} />
                {/* Values + % + drop-off on the right */}
                <LabelList
                  position="right"
                  dataKey="pctTotal"
                  formatter={(value: number, _name: any, entry: any) => {
                    const p: FunnelStep | undefined = entry?.payload;
                    const pct = typeof value === "number" ? fmt.pct(value) : "";
                    const count = p ? fmt.num(p.count) : "";
                    const drop = p && p.dropFromPrev > 0 ? ` • ${fmt.pct(p.dropFromPrev)}` : "";
                    const done = p?.isGoal ? " • Completed" : "";
                    return `${count} • ${pct}${drop}${done}`;
                  }}
                  style={{ fill: "#111827", fontWeight: 600 }}
                />
                {steps.map((s) => {
                  const active = hoverKey === s.key;
                  return (
                    <Cell
                      key={s.key}
                      fill={s.color}
                      stroke="rgba(0,0,0,.08)"
                      cursor="pointer"
                      onClick={() => onStepClick?.(s)}
                      onMouseEnter={() => setHoverKey(s.key)}
                      onMouseLeave={() => setHoverKey((k) => (k === s.key ? null : k))}
                      style={{
                        filter: active ? "drop-shadow(0 6px 14px rgba(0,0,0,.18))" : "none",
                        opacity: active ? 1 : 0.92,
                        transition: "filter .18s ease, opacity .18s ease",
                      }}
                    />
                  );
                })}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-600">
          {steps.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => onStepClick?.(s)}
              className="inline-flex items-center gap-2 hover:opacity-85 cursor-pointer"
              title="Open Analyzer for this step"
            >
              <StepIcon idx={idx} />
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="font-medium">{s.name}:</span>
              <span>{fmt.num(s.count)}</span>
              <span>({fmt.pct(s.pctTotal)} of total)</span>
              {showDropTags && s.dropFromPrev > 0 && <DropTag value={s.dropFromPrev} />}
              {s.isGoal && (
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium"
                  style={{ borderColor: "#10B981", color: "#059669", background: "rgba(16,185,129,.08)" }}
                >
                  <CheckCircle2 size={14} /> Completed
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Footer CTA (kept) */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Time range is inherited from the panel header. Device and goal filters recalc the funnel in place.
        </div>
        <button
          onClick={() => onAnalyzeClick?.()}
          className="h-9 rounded bg-[#1090D0] px-3 text-sm font-medium text-white hover:shadow-md cursor-pointer"
        >
          Analyze Drop‑off Page
        </button>
      </div>
    </section>
  );
}
