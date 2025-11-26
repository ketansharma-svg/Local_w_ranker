'use client';

import React, { useMemo, useState, useRef } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart3, RefreshCw, Upload } from 'lucide-react';

/* -----------------------------------------------------------------------------
 * Wranker • OVI — Section 12: Competitive Positioning Map
 * - X: Total ranking keywords
 * - Y: Estimated organic traffic
 * - Bubble size: % shared keywords with your domain
 * - “Your Domain” bubble is fully filled with brand color
 * - Single legend (top-left custom chips)
 * - Smart popover: colored dot + favicon + domain
 * - Inter / Inter Fallback; pointer cursors; branded iconography
 * - Colors pulled from Wranker token palette
 * ---------------------------------------------------------------------------*/

/** Tokens (from Wranker design tokens with safe fallbacks) */
const TK = {
  brand: '#008CCD',
  surface: 'var(--bg-panel, #FFFFFF)',
  panelBg: 'var(--bg-panel, #FFFFFF)',
  appBg: 'var(--bg-app, #F5F7FA)',
  textStrong: 'var(--text-strong, #111827)',
  text: 'var(--text, #374151)',
  muted: 'var(--text-muted, #6B7280)',
  border: 'var(--border, #E5E7EB)',
  borderLight: 'var(--border-subtle, #EFF0F6)',
  overlay: 'var(--overlay, rgba(17,24,39,0.96))',
  focus: 'var(--focus, #4286F5)',
  radius: 'var(--radius, 6px)',
};

/** Categorical palette using Wranker tokens (Core Blue, Status & Extended palette) */
const COMP_PALETTE = [
  '#4286F5', // Core Blue (Charts)
  '#34A853', // Success Green
  '#F9BB04', // Warning Yellow
  '#E94134', // Critical Red
  '#14B8A6', // Teal / Aqua
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#84CC16', // Olive / Lime Green
  '#D946EF', // Magenta
  '#EE3EA5', // Pink
];

/** Types */
type Point = {
  domain: string;
  keywords: number;   // X
  traffic: number;    // Y
  sharedPct?: number; // bubble size 0–100 (optional)
  you?: boolean;      // flag for your domain
};

type Props = {
  points?: Point[];
  onExportPNG?: () => void;
  onReset?: () => void;
};

/** Demo data */
const DEMO: Point[] = [
  { domain: 'mydomain.com', keywords: 2130, traffic: 24000, sharedPct: 0, you: true },
  { domain: 'competitor1.com', keywords: 3500, traffic: 36000, sharedPct: 52 },
  { domain: 'competitor2.com', keywords: 1300, traffic: 8000, sharedPct: 33 },
  { domain: 'competitor3.com', keywords: 1800, traffic: 22000, sharedPct: 71 },
  { domain: 'competitor4.com', keywords: 900, traffic: 6000, sharedPct: 15 },
  { domain: 'competitor5.com', keywords: 3100, traffic: 33000, sharedPct: 46 },
];

/** Favicon helper (rendered at runtime by the browser) */
const getFavicon = (domain: string, size = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;

/** Assign a unique color per domain (brand for "you") */
function useColorMap(points: Point[]) {
  const you = points.find((p) => p.you)?.domain;
  const competitors = points.filter((p) => !p.you).map((p) => p.domain);
  const map = new Map<string, string>();
  if (you) map.set(you, TK.brand);
  competitors.forEach((d, i) => {
    map.set(d, COMP_PALETTE[i % COMP_PALETTE.length]);
  });
  return map;
}

/** Custom bubble shape: your domain filled with brand; others in their color */
const makeBubble =
  (stroke: string, fill: string) =>
  function Bubble(props: any) {
    const { cx, cy, size } = props;
    const r = Math.max(2, Math.sqrt(size));
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={2} />
      </g>
    );
  };


/** Smart popover with colored dot + favicon + domain name */
function TooltipContentFactory(colorMap: Map<string, string>) {
  return function TooltipContent({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const p: Point | undefined = payload[0]?.payload;
    if (!p) return null;
    const color = colorMap.get(p.domain) || TK.brand;

    return (
      <div
        className="rounded-md border bg-white p-2 text-xs"
        style={{
          borderColor: TK.border,
          color: TK.textStrong,
          minWidth: 220,
          pointerEvents: 'none',
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ background: color }}
          />
          <img
            src={getFavicon(p.domain, 64)}
            alt={`${p.domain} favicon`}
            width={14}
            height={14}
            className="rounded-sm"
            style={{ display: 'inline-block' }}
          />
          <span className="font-semibold">
            {p.you ? 'Your Domain' : p.domain}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px]" style={{ color: TK.muted }}>Keywords</span>
          <span className="font-medium">{p.keywords.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px]" style={{ color: TK.muted }}>Traffic</span>
          <span className="font-medium">{p.traffic.toLocaleString()}</span>
        </div>
        {typeof p.sharedPct === 'number' && (
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: TK.muted }}>Shared KW %</span>
            <span className="font-medium">{p.sharedPct}%</span>
          </div>
        )}
      </div>
    );
  };
}

/** Legend chip */
function LegendChip({
  domain,
  color,
  isYou,
  hidden,
  onClick,
}: {
  domain: string;
  color: string;
  isYou: boolean;
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition"
      style={{
        borderColor: TK.border,
        color: TK.textStrong,
        opacity: hidden ? 0.4 : 1,
        cursor: 'pointer',
      }}
      title={domain}
      type="button"
    >
      {/* dot uses brand for "Your Domain"; else the assigned color */}
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: isYou ? TK.brand : color }}
      />
      <span className="font-medium">{isYou ? 'Your Domain' : domain}</span>
    </button>
  );
}

/** Component */
export default function CompetitivePositioningMap({
  points = DEMO,
  onExportPNG,
  onReset,
}: Props) {
  const colorMap = useColorMap(points);

  // Group by domain (1 point per domain in this demo, but keeps multi-point future-safe)
  const groups = useMemo(() => {
    const m = new Map<string, Point[]>();
    points.forEach((p) => {
      const arr = m.get(p.domain) ?? [];
      arr.push(p);
      m.set(p.domain, arr);
    });
    return m;
  }, [points]);

  // Legend visibility toggles (domain -> hidden?)
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setHidden((s) => ({ ...s, [k]: !s[k] }));
  const resetLegend = () => setHidden({});

  // Sizing (area in px^2)
  const zDomain: [number, number] = [0, 100];
  const zRange: [number, number] = [64, 1200];

  // Tooltip with colorMap closure
  const TooltipContent = useMemo(() => TooltipContentFactory(colorMap), [colorMap]);

  return (
    <section
      className="w-full rounded-xl border bg-white p-4 sm:p-5 mt-4"
      style={{
        borderColor: TK.borderLight,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" color={TK.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TK.textStrong }}>
            Competitive Positioning Map
          </h3>
          <span
            className="rounded-md border px-2 py-[2px] text-[12px]"
            style={{ borderColor: TK.borderLight, color: TK.muted }}
          >
            X: Keywords • Y: Traffic • Size: Shared KW %
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: TK.border, color: TK.textStrong, cursor: 'pointer' }}
            onClick={() => {
              resetLegend();
              onReset?.();
            }}
            type="button"
            title="Reset"
          >
            <RefreshCw className="h-4 w-4" color={TK.brand} />
            Reset
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: TK.border, color: TK.textStrong, cursor: 'pointer' }}
            onClick={() => onExportPNG?.()}
            type="button"
            title="Export"
          >
            <Upload className="h-4 w-4" color={TK.brand} />
            Export
          </button>
        </div>
      </div>

      {/* Legend — single instance (top-left) */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {Array.from(groups.keys()).map((domain) => {
          const isYou = !!points.find((p) => p.you && p.domain === domain);
          const color = colorMap.get(domain) || TK.brand;
          const isHidden = !!hidden[domain];
          return (
            <LegendChip
              key={domain}
              domain={domain}
              color={color}
              isYou={isYou}
              hidden={isHidden}
              onClick={() => toggle(domain)}
            />
          );
        })}
        {Object.keys(hidden).length > 0 && (
          <button
            onClick={resetLegend}
            className="ml-1 text-xs font-medium underline"
            style={{ color: TK.muted, cursor: 'pointer' }}
            type="button"
            title="Show all"
          >
            Show all
          </button>
        )}
      </div>

      {/* Chart */}
      <div className="h-[460px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 12 }}>
            <CartesianGrid stroke={TK.borderLight} />
            <XAxis
              type="number"
              dataKey="keywords"
              name="Total ranking keywords"
              tick={{ fill: TK.muted, fontSize: 12 }}
              stroke={TK.muted}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)}
              label={{
                value: 'Total ranking keywords',
                position: 'insideBottom',
                offset: -30,
                fill: TK.muted,
              }}
            />
            <YAxis
              type="number"
              dataKey="traffic"
              name="Estimated organic traffic"
              tick={{ fill: TK.muted, fontSize: 12 }}
              stroke={TK.muted}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${v}`)}
              label={{
                value: 'Estimated organic traffic',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: TK.muted,
              }}
            />
            <ZAxis type="number" dataKey="sharedPct" range={zRange} domain={zDomain} />
            <Tooltip cursor={{ stroke: TK.borderLight }} content={<TooltipContent />} />

            {/* One Scatter per domain so each can be toggled independently and colored correctly */}
            {Array.from(groups.entries()).map(([domain, data]) => {
              const isYou = data.some((d) => d.you);
              const color = colorMap.get(domain) || TK.brand;
              const isHidden = !!hidden[domain];

              // Your domain: fully filled brand bubble (brand fill, white stroke)
              const shape = isYou
                ? makeBubble('#FFFFFF', TK.brand)
                : makeBubble(color, color);

              return (
                <Scatter
                  key={domain}
                  name={domain}
                  data={isHidden ? [] : data}
                  fill={isYou ? TK.brand : color}
                  shape={shape}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
