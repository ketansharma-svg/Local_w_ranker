'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Info,
  TriangleAlert,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  BarChart3,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

/* -----------------------------------------------------------------------------
   SECTION 2 (Left Side): WR Score + Radar Graph
   - Tailwind + Recharts v2
   - Updated to latest design tokens & branded iconography (#008CCD)
   - Inter / Inter Fallback fonts
   - WR metric value uses #0077ff
   - Smart popover with branded icon + colored dot annotations (full names)
   - Info popover on Radar axis labels (full names)
   - Pointer cursor on clickable elements
----------------------------------------------------------------------------- */

type RadarPointKey = 'RDAS' | 'LPDS' | 'LVS' | 'AQS' | 'ITDS';
type RadarDatum = {
  key: RadarPointKey;
  label: string;      // short code shown on axis (e.g., RDAS)
  value: number;      // 0–100
  desc?: string;      // tooltip text
  fullName?: string;  // full name for popovers/tooltips
};

type LeftBlockProps = {
  data?: {
    wrScore?: number;             // 0–100
    wrDelta30d?: number;          // +/- points vs last 30 days
    toxicityDeduction?: number;   // e.g., 6 means "-6 points deducted…"
    toxicDomains?: number;
    radar?: RadarDatum[];         // five points, 0–100
    wrScoreHistory30d?: number[]; // length up to 30 (spark/mini bars)
  };
  className?: string;
};

/** -------------------------------------------------------------------------
 * Latest Design Tokens (aligned with recent panels)
 * ------------------------------------------------------------------------- */
const DS = {
  color: {
    brand: '#008CCD',          // branded icons & accents
    brandSoft: '#E6F6FC',      // subtle bg for brand elements
    metricBlue: '#0077ff',     // WR metric value
    text: '#0B1220',
    subtext: '#64748B',
    border: '#E7ECF2',
    surface: '#FFFFFF',
    surfaceAlt: '#F7FAFC',
    chartGrid: '#E6EEF5',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  ring: '0 0 0 3px rgba(0,140,205,0.20)',
  shadow: '0 2px 10px rgba(11,18,32,0.06)',
  radius: '14px',
  fontStack:
    '"Inter", Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
};

/** Component full names (used by popovers) */
const FULL_NAMES: Record<RadarPointKey, string> = {
  RDAS: 'Referring Domain Authority Score',
  LPDS: 'Link Profile Diversity Score',
  LVS: 'Link Velocity Score',
  AQS: 'Anchor Quality Score',
  ITDS: 'IP & TLD Diversity Score',
};

/** Color dots for Components (brand tints) */
const COMPONENT_COLORS: Record<RadarPointKey, string> = {
  RDAS: '#008CCD',
  LPDS: '#0FA4E9',
  LVS:  '#33B6F0',
  AQS:  '#5CC7F5',
  ITDS: '#85D7FA',
};

/** Map WR score to badge label + color */
function getWrBadge(score: number) {
  if (score >= 81) return { label: 'Excellent', color: DS.color.success };
  if (score >= 61) return { label: 'Very Good', color: '#1D4ED8' };
  if (score >= 41) return { label: 'Moderate', color: DS.color.warning };
  if (score >= 21) return { label: 'Weak', color: '#B91C1C' };
  return { label: 'Toxic', color: DS.color.danger };
}

const DEFAULT_DATA: Required<NonNullable<LeftBlockProps['data']>> = {
  wrScore: 68,
  wrDelta30d: 4,
  toxicityDeduction: 6,
  toxicDomains: 3,
  wrScoreHistory30d: [
    62, 63, 64, 63, 64, 66, 65, 66, 67, 66,
    66, 65, 64, 64, 65, 66, 66, 67, 68, 69,
    68, 67, 66, 66, 67, 68, 69, 70, 69, 68,
  ],
  radar: [
    {
      key: 'RDAS',
      label: 'RDAS',
      value: 72,
      desc: 'Average quality of linking domains.',
      fullName: FULL_NAMES.RDAS,
    },
    {
      key: 'LPDS',
      label: 'LPDS',
      value: 64,
      desc: 'Diversity across sources & follow types.',
      fullName: FULL_NAMES.LPDS,
    },
    {
      key: 'LVS',
      label: 'LVS',
      value: 58,
      desc: 'Natural backlink growth pattern.',
      fullName: FULL_NAMES.LVS,
    },
    {
      key: 'AQS',
      label: 'AQS',
      value: 62,
      desc: 'Anchor diversity & spam prevention.',
      fullName: FULL_NAMES.AQS,
    },
    {
      key: 'ITDS',
      label: 'ITDS',
      value: 70,
      desc: 'IP & TLD diversity of backlinks.',
      fullName: FULL_NAMES.ITDS,
    },
  ],
};

/** Mini-bars tooltip (WR 30d trend) */
function MiniBarsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-md border bg-white px-2.5 py-1.5 text-xs shadow-sm"
         style={{ borderColor: DS.color.border }}>
      <div className="font-medium" style={{ color: DS.color.text }}>Day {label}</div>
      <div className="mt-0.5" style={{ color: DS.color.subtext }}>
        WR Score:{' '}
        <span className="font-semibold" style={{ color: DS.color.text }}>
          {v}
        </span>
      </div>
    </div>
  );
}

/** Radar tooltip for polygon hover (shows full name) */
function RadarTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as RadarDatum | undefined;
  if (!p) return null;
  return (
    <div className="max-w-[240px] rounded-md border bg-white px-2.5 py-2 text-xs shadow-sm"
         style={{ borderColor: DS.color.border }}>
      <div className="font-semibold" style={{ color: DS.color.text }}>
        {p.fullName || p.label}:{' '}
        <span style={{ color: DS.color.subtext }}>{p.value}</span>
      </div>
      {p.desc && <div className="mt-1" style={{ color: DS.color.subtext }}>{p.desc}</div>}
    </div>
  );
}

/** Axis tick with info popover for full names */
type AngleTickProps = {
  payload: { value: string };
  x: number;
  y: number;
  textAnchor: string;
  index: number;
};
function useAxisPopover(ref: React.RefObject<HTMLDivElement>) {
  const [state, setState] = useState<{
    left: number;
    top: number;
    datum?: RadarDatum;
    visible: boolean;
  } | null>(null);

  const show = (e: React.MouseEvent<SVGTextElement>, datum: RadarDatum) => {
    const container = ref.current?.getBoundingClientRect();
    if (!container) return;
    setState({
      left: e.clientX - container.left + 10,
      top: e.clientY - container.top + 10,
      datum,
      visible: true,
    });
  };
  const hide = () => setState(null);
  return { state, show, hide };
}

function Section2LeftInner({ data: incoming, className }: LeftBlockProps) {
  const data = { ...DEFAULT_DATA, ...(incoming ?? {}) };
  const { wrScore, wrDelta30d, toxicityDeduction, toxicDomains, radar, wrScoreHistory30d } = data;

const containerRef = useRef<HTMLDivElement>(null);
const axisPopover = useAxisPopover(containerRef as React.RefObject<HTMLDivElement>);


  const badge = useMemo(() => getWrBadge(wrScore), [wrScore]);
  const deltaPositive = wrDelta30d >= 0;

  const bars = useMemo(
    () => wrScoreHistory30d.map((v, i) => ({ day: i + 1, value: v })),
    [wrScoreHistory30d]
  );

  const radarByLabel = useMemo(() => {
    const map = new Map<string, RadarDatum>();
    radar.forEach((d) =>
      map.set(d.label, {
        ...d,
        fullName: d.fullName || FULL_NAMES[d.key],
      })
    );
    return map;
  }, [radar]);

  const AxisTick = (props: AngleTickProps) => {
    const short = props.payload.value;
    const datum = radarByLabel.get(short);
    return (
      <g transform={`translate(${props.x},${props.y})`}>
        <text
          textAnchor={props.textAnchor as any}
          fontSize={12}
          className="select-none cursor-pointer"
          onMouseEnter={(e) => datum && axisPopover.show(e, datum)}
          onMouseLeave={axisPopover.hide}
          style={{ fill: DS.color.subtext }}
        >
          {short}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className={[
        'w-full max-w-[480px] rounded-2xl border bg-white p-4 sm:p-5',
        'shadow-sm',
        className ?? '',
      ].join(' ')}
      style={{
        borderColor: DS.color.border,
        boxShadow: DS.shadow,
        borderRadius: DS.radius as any,
        fontFamily: DS.fontStack,
        color: DS.color.text,
      }}
    >
      {/* Header: Section Title with branded icon */}
      <div className="mb-1.5 flex items-center gap-2">
        <Gauge className="h-[18px] w-[18px] shrink-0" style={{ color: DS.color.brand }} />
        <h3 className="text-[15px] font-semibold" style={{ color: DS.color.text }}>
          WR Score
        </h3>
        <button
          type="button"
          className="ml-1 inline-flex cursor-pointer items-center rounded p-0.5 transition"
          style={{ color: DS.color.subtext }}
          title="WR Score is your backlink authority score based on domain quality, anchor usage, link growth, and trust signals."
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Metric + trend */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-baseline gap-2">
            <div
              className="text-5xl font-bold leading-none tracking-tight"
              style={{ color: DS.color.metricBlue }}
            >
              {wrScore}
            </div>
            <div
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: DS.color.surfaceAlt, color: DS.color.text }}
            >
              {deltaPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" style={{ color: DS.color.success }} />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" style={{ color: DS.color.danger }} />
              )}
              <span style={{ color: deltaPositive ? DS.color.success : DS.color.danger }}>
                {deltaPositive ? '+' : ''}
                {wrDelta30d} in last 30d
              </span>
            </div>
          </div>
          <div
            className="mt-2 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: badge.color }}
          >
            {badge.label}
          </div>
        </div>

        {/* Mini bar trend (right of value) */}
        <div className="h-[56px] w-[168px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={['dataMin - 3', 'dataMax + 3']} />
              <RechartsTooltip content={<MiniBarsTooltip />} cursor={{ fill: 'rgba(0,140,205,0.08)' }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} fill={DS.color.brand} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toxicity deduction note */}
      {!!toxicityDeduction && toxicityDeduction > 0 && (
        <div className="mt-3 flex items-start gap-2 text-[13px] italic">
          <TriangleAlert className="mt-[2px] h-4 w-4 shrink-0" style={{ color: DS.color.danger }} />
          <div style={{ color: '#B45309' }}>
            −{toxicityDeduction} points deducted
            {typeof toxicDomains === 'number' ? (
              <> due to {toxicDomains} toxic referring {toxicDomains === 1 ? 'domain' : 'domains'}.</>
            ) : (
              <> due to toxic referring domains.</>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mt-4 w-full border-b" style={{ borderColor: DS.color.border }} />

      {/* Components Breakdown header + smart popover trigger */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-[16px] w-[16px]" style={{ color: DS.color.brand }} />
          <div className="text-sm font-medium" style={{ color: DS.color.text }}>
            WR Components Breakdown
          </div>
        </div>

        {/* Smart popover toggle */}
        <SmartComponentsPopover radar={radar} />
      </div>

      {/* Radar (Spider) Graph */}
      <div className="relative mx-auto mt-3 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radar}>
            <PolarGrid gridType="polygon" stroke={DS.color.chartGrid} radialLines />
            <PolarAngleAxis dataKey="label" tick={AxisTick} />
            <PolarRadiusAxis
              angle={90}
              tick={{ fill: DS.color.subtext, fontSize: 10 }}
              tickCount={6}
              domain={[0, 100]}
            />
            <RechartsTooltip content={<RadarTip />} />
            <RechartsRadar
              name="Score"
              dataKey="value"
              stroke={DS.color.brand}
              fill={DS.color.brand}
              fillOpacity={0.28}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Axis-name info popover (full names) */}
        {axisPopover.state?.visible !== false && axisPopover.state?.datum && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-md border bg-white px-2.5 py-2 text-xs shadow-sm"
            style={{
              left: axisPopover.state.left,
              top: axisPopover.state.top,
              borderColor: DS.color.border,
            }}
          >
            <div className="mb-0.5 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" style={{ color: DS.color.brand }} />
              <span className="font-semibold" style={{ color: DS.color.text }}>
                {axisPopover.state.datum.fullName || axisPopover.state.datum.label}
              </span>
            </div>
            {axisPopover.state.datum.desc && (
              <div style={{ color: DS.color.subtext }}>{axisPopover.state.datum.desc}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Smart popover component (Components + colored dots + full names) */
function SmartComponentsPopover({ radar }: { radar: RadarDatum[] }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  const enriched = useMemo(
    () =>
      radar.map((d) => ({
        ...d,
        fullName: d.fullName || FULL_NAMES[d.key],
        dot: COMPONENT_COLORS[d.key],
      })),
    [radar]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition hover:shadow-sm"
        style={{
          borderColor: DS.color.border,
          color: DS.color.text,
          backgroundColor: DS.color.surface,
        }}
      >
        <Layers className="h-3.5 w-3.5" style={{ color: DS.color.brand }} />
        Components
        <Info className="h-3.5 w-3.5" style={{ color: DS.color.brand }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-[280px] rounded-md border bg-white p-3 text-sm shadow-lg"
          style={{ borderColor: DS.color.border, boxShadow: DS.shadow }}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" style={{ color: DS.color.brand }} />
            <span style={{ color: DS.color.text }}>WR Score Components</span>
          </div>

          <ul className="space-y-2">
            {enriched.map((d) => (
              <li key={d.key} className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.dot }}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium" style={{ color: DS.color.text }}>
                      {d.fullName}
                    </span>
                    <span className="text-xs" style={{ color: DS.color.subtext }}>
                      ({d.label})
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold" style={{ color: DS.color.subtext }}>
                  {d.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   DEFAULT EXPORT (drop-in)
   - Customize via <Section2Left data={...} />
-------------------------------------------------------------------------- */
export default function Section2Left(props: LeftBlockProps) {
  return <Section2LeftInner {...props} />;
}

/* --------------------------------------------------------------------------
   Example usage:

   <Section2Left
     data={{
       wrScore: 71,
       wrDelta30d: +5,
       toxicityDeduction: 4,
       toxicDomains: 2,
       wrScoreHistory30d: [/* up to 30 daily WR values * /],
       radar: [
         { key: 'RDAS', label: 'RDAS', value: 74, desc: 'Average quality of linking domains.' },
         { key: 'LPDS', label: 'LPDS', value: 65, desc: 'Diversity across sources & follow types.' },
         { key: 'LVS',  label: 'LVS',  value: 61, desc: 'Natural backlink growth pattern.' },
         { key: 'AQS',  label: 'AQS',  value: 63, desc: 'Anchor diversity & spam prevention.' },
         { key: 'ITDS', label: 'ITDS', value: 72, desc: 'IP & TLD diversity of backlinks.' },
       ],
     }}
   />
-------------------------------------------------------------------------- */
