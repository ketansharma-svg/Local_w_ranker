"use client";

/**
 * Wranker • Competitor Profiles — Section 2: Organic Traffic Summary (#traffic)
 * Redesigned drop‑in React + Tailwind TSX
 * ---------------------------------------------------------------------------
 * Requirements addressed:
 * - Inter font (with Inter Fallback)
 * - No emoji usage
 * - Branded (#008CCD) icons for section title & action types
 * - Project/Domain favicon support in the header
 * - Modular Buttons / Chips / Toggle switch components (latest UI look)
 * - Pointer cursor on all clickable elements
 * - Smart popovers include colored dot annotations
 * - Countries table rows have a subtle hover animation
 *
 * Dependencies: react, lucide-react, recharts, tailwindcss
 */

import React, { useMemo, useState } from "react";
import {
  Info as InfoIcon,
  ChevronDown,
  LineChart,
  Globe2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  Legend as RLegend,
} from "recharts";

/* -------------------------------- TOKENS -------------------------------- */
const TOKENS = {
  brand: "#008CCD",
  brandSoft: "rgba(0,140,205,0.10)",
  brandHover: "#007DB8",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  border2: "#E5E7EB",
  success: "#10B981",
  danger: "#EF4444",
  neutral: "#9CA3AF",
  chipBg: "#F5F7FA",
  slate: "#6B7280",
  slateLight: "#CBD5E1",
} as const;

/* ------------------------------- FORMATTERS ------------------------------ */
const intFmt = new Intl.NumberFormat();
function fmtNum(n?: number | null, compact = true) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (compact && Math.abs(n) >= 10000) {
    const units = [
      { v: 1e9, s: "B" },
      { v: 1e6, s: "M" },
      { v: 1e3, s: "K" },
    ];
    for (const u of units) if (Math.abs(n) >= u.v) return `${(n / u.v).toFixed(1)}${u.s}`;
  }
  return intFmt.format(n);
}
function fmtPct01(p?: number | null, decimals = 1) {
  if (p === undefined || p === null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(decimals)}%`;
}
function fmtDateISO(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function toneByPct(delta?: number) {
  if (typeof delta !== "number") return TOKENS.neutral;
  return delta > 0 ? TOKENS.success : delta < 0 ? TOKENS.danger : TOKENS.neutral;
}

/* --------------------------------- TYPES -------------------------------- */
export type TrafficTimeseriesPoint = { t: string; comp: number; you?: number };
export type TrafficCountryRow = {
  code: string;
  name: string;
  comp: { traffic: number; share: number; kws: number };
  you?: { traffic: number; share: number; kws: number };
};
export type BrandSplit = {
  comp: { branded: number; non: number; examples?: { branded?: string[]; non?: string[] } };
  you?: { branded: number; non: number; examples?: { branded?: string[]; non?: string[] } };
};

export type TrafficSectionData = {
  timeseries: TrafficTimeseriesPoint[];
  granularity: "day" | "week" | "month";
  countries: TrafficCountryRow[];
  total_comp?: number;
  total_you?: number;
  brand_split: BrandSplit;
  source?: string; // SERanking|InternalModel
};

type ExportFmt = "PNG" | "CSV" | "PDF";

/* ------------------------------ UI PRIMITIVES ---------------------------- */

const fontInter: React.CSSProperties["fontFamily"] =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

function Button({
  children,
  variant = "outline",
  onClick,
  className = "",
  title,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  const base =
    "cursor-pointer inline-flex items-center gap-2 h-9 rounded-md px-3 text-sm transition";
  const styles =
    variant === "primary"
      ? "text-white bg-[var(--wr-brand,#008CCD)] hover:bg-[#007DB8] shadow-sm"
      : variant === "ghost"
      ? "text-[var(--wr-text,#111827)] hover:bg-gray-50"
      : "text-[var(--wr-text,#111827)] bg-white border hover:bg-gray-50";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${base} ${styles} ${className}`}
      style={{ borderColor: variant === "outline" ? TOKENS.border : undefined }}
    >
      {children}
    </button>
  );
}

function Chip({
  children,
  active = false,
  onClick,
  className = "",
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`cursor-pointer inline-flex items-center gap-2 h-8 rounded-full border px-3 text-xs font-medium transition ${className}`}
      style={{
        borderColor: TOKENS.border2,
        background: active ? "#FFFFFF" : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
}) {
  return (
    <Chip
      active={checked}
      onClick={() => onChange?.(!checked)}
      title="Toggle"
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-[var(--wr-brand,#008CCD)]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      {label}
    </Chip>
  );
}

function TitleWithInfo({
  title,
  info,
  faviconUrl,
}: {
  title: string;
  info: string;
  /** Optional project/domain favicon for header */
  faviconUrl?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid h-8 w-8 place-items-center rounded-md border"
        style={{ background: TOKENS.brandSoft, borderColor: TOKENS.border2 }}
      >
        {faviconUrl ? (
          // Project/Domain favicon
          <img
            src={faviconUrl}
            alt="Project favicon"
            width={18}
            height={18}
            className="rounded-sm"
          />
        ) : (
          // Branded section icon fallback
          <LineChart size={16} color={TOKENS.brand} />
        )}
      </span>
      <div className="truncate text-[16px] font-semibold" style={{ color: TOKENS.text }}>
        {title}
      </div>
      <div className="relative group">
        <InfoIcon size={15} style={{ color: TOKENS.neutral }} />
        <div
          role="tooltip"
          className="invisible group-hover:visible absolute z-50 ml-2 mt-1 w-[280px] rounded-md border bg-white p-2 text-xs leading-snug shadow transition-opacity"
          style={{ borderColor: TOKENS.border }}
        >
          {/* Smart popover with colored dot annotations */}
          <div className="mb-1" style={{ color: TOKENS.muted }}>
            {info}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: TOKENS.muted }}>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: TOKENS.valueBlue }}
              />
              Competitor
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: TOKENS.slate }}
              />
              You
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportMenu({
  onExport,
  canPdf = true,
}: {
  onExport?: (fmt: ExportFmt) => void;
  canPdf?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((s) => !s)} title="Export">
        Export
        <ChevronDown size={16} style={{ color: TOKENS.neutral }} />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-md border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
          onMouseLeave={() => setOpen(false)}
        >
          {(["PNG", "CSV", "PDF"] as ExportFmt[]).map((fmt) => (
            <button
              key={fmt}
              className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
                fmt === "PDF" && !canPdf ? "text-gray-400 cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (fmt === "PDF" && !canPdf) return;
                onExport?.(fmt);
                setOpen(false);
              }}
            >
              Export {fmt}
              {fmt === "PDF" && !canPdf && <span className="ml-2 text-xs">(Upgrade)</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ compareOn }: { compareOn: boolean }) {
  return (
    <div className="flex items-center gap-4 text-xs" style={{ color: TOKENS.muted }}>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.valueBlue }} />
        Competitor
      </span>
      {compareOn && (
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.slate }} />
          You
        </span>
      )}
    </div>
  );
}

/* ------------------------------- UTILITIES ------------------------------- */
function movingAverage(arr: number[], window: number) {
  if (window <= 1) return arr.slice();
  const out: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0,
      count = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < arr.length) {
        sum += arr[j];
        count++;
      }
    }
    out.push(count ? sum / count : arr[i]);
  }
  return out;
}
function applySmoothing(points: TrafficTimeseriesPoint[], granularity: TrafficSectionData["granularity"], on: boolean) {
  if (!on) return points;
  const w =
    granularity === "day" && points.length <= 90 ? 7 :
    granularity === "week" ? 3 :
    1;
  if (w <= 1) return points;
  const compArr = points.map((p) => p.comp);
  const youArr = points.map((p) => p.you ?? 0);
  const compSm = movingAverage(compArr, w);
  const youSm = movingAverage(youArr, w);
  return points.map((p, i) => ({ ...p, comp: Math.round(compSm[i]), you: p.you !== undefined ? Math.round(youSm[i]) : undefined }));
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/* --------------------------------- BLOCK A --------------------------------
 * Organic Traffic Trend (Primary Chart)
 * -------------------------------------------------------------------------*/
function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

function TrendTooltip({
  active,
  payload,
  label,
  compareOn,
}: any & { compareOn: boolean }) {
  if (!active || !payload || !payload.length) return null;
  const comp = payload.find((p: any) => p.dataKey === "comp")?.value as number | undefined;
  const you = payload.find((p: any) => p.dataKey === "you")?.value as number | undefined;
  const deltaPct = compareOn && typeof comp === "number" && typeof you === "number" && you > 0 ? ((comp - you) / you) * 100 : undefined;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 12,
        pointerEvents: "none",
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
      }}
    >
      <div style={{ color: TOKENS.muted, marginBottom: 4 }}>{fmtDateISO(label)}</div>
      <div className="flex items-center gap-2" style={{ color: TOKENS.text }}>
        <Dot color={TOKENS.valueBlue} /> Competitor: <b>{fmtNum(comp, false)}</b>
      </div>
      {compareOn && (
        <div className="flex items-center gap-2" style={{ color: TOKENS.text }}>
          <Dot color={TOKENS.slate} /> You: <b>{fmtNum(you, false)}</b>
        </div>
      )}
      {typeof deltaPct === "number" && (
        <div className="mt-1" style={{ color: toneByPct(deltaPct) }}>
          Δ {Math.abs(deltaPct).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function TrafficTrendBlock({
  data,
  compareOn,
  smoothingOn,
}: {
  data: TrafficSectionData;
  compareOn: boolean;
  smoothingOn: boolean;
}) {
  const smoothed = useMemo(
    () => applySmoothing(data.timeseries, data.granularity, smoothingOn),
    [data.timeseries, data.granularity, smoothingOn]
  );
  const chartData = useMemo(
    () => smoothed.map((p) => ({ date: p.t, comp: p.comp, you: p.you })),
    [smoothed]
  );

  return (
    <div
      className="rounded-[16px] border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="flex items-center justify-between">
        <TitleWithInfo
          title="Organic Traffic Trend"
          info="Estimated monthly organic traffic over time. Smoothing applies a centered moving average depending on range."
        />
        <Legend compareOn={compareOn} />
      </div>

      <div className="mt-2 h-[260px]" role="img" aria-label="Organic traffic over time">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-traffic-comp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TOKENS.valueBlue} stopOpacity={0.45} />
                <stop offset="100%" stopColor={TOKENS.pastelBlue} stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={TOKENS.border} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              tick={{ fontSize: 12, fill: TOKENS.muted }}
            />
            <YAxis tickFormatter={(n) => fmtNum(n as number)} tick={{ fontSize: 12, fill: TOKENS.muted }} />
            <RTooltip content={<TrendTooltip compareOn={compareOn} />} />
            {/* Competitor */}
            <Area
              type="monotone"
              dataKey="comp"
              name="Competitor"
              stroke={TOKENS.valueBlue}
              fill="url(#grad-traffic-comp)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
            {/* You */}
            {compareOn && (
              <Area
                type="monotone"
                dataKey="you"
                name="You"
                stroke={TOKENS.slate}
                fill="transparent"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.source && (
        <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
          Source: {data.source}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- BLOCK B --------------------------------
 * Traffic Distribution by Country (Table + Animated row hover)
 * -------------------------------------------------------------------------*/

function CountryBadge({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const [err, setErr] = useState(false);
  const url = `https://flagcdn.com/24x18/${code.toLowerCase()}.png`;

  return (
    <div className="flex items-center gap-2">
      {!err ? (
        <img
          src={url}
          width={18}
          height={12}
          alt={`${name} flag`}
          className="rounded-[2px] border"
          style={{ borderColor: TOKENS.border2 }}
          onError={() => setErr(true)}
        />
      ) : (
        <Globe2 size={14} color={TOKENS.brand} />
      )}
      <span className="font-medium">{name}</span>
      <span className="text-xs" style={{ color: TOKENS.neutral }}>
        • {code.toUpperCase()}
      </span>
    </div>
  );
}

function ShareBar({
  leftPct,
  rightPct,
  compareOn,
}: {
  leftPct: number; // competitor share 0..1
  rightPct?: number; // your share 0..1
  compareOn: boolean;
}) {
  const compW = Math.max(0, Math.min(1, leftPct)) * 100;
  const youW = Math.max(0, Math.min(1, rightPct ?? 0)) * 100;
  if (!compareOn) {
    return (
      <div className="h-2 w-full rounded bg-[#E5E7EB] overflow-hidden">
        <div
          className="h-2 rounded transition-all duration-200 ease-out group-hover:scale-x-[1.02] origin-left"
          style={{ width: `${compW}%`, background: TOKENS.valueBlue }}
        />
      </div>
    );
  }
  return (
    <div className="flex h-2 w-full overflow-hidden rounded">
      <div
        className="h-2 transition-all duration-200 ease-out group-hover:scale-x-[1.02] origin-left"
        style={{ width: `${compW}%`, background: TOKENS.valueBlue }}
      />
      <div
        className="h-2 transition-all duration-200 ease-out group-hover:scale-x-[1.02] origin-left"
        style={{ width: `${youW}%`, background: TOKENS.slate }}
      />
    </div>
  );
}

function CountriesTable({
  rows,
  compareOn,
}: {
  rows: TrafficCountryRow[];
  compareOn: boolean;
}) {
  const sorted = useMemo(
    () => rows.slice().sort((a, b) => (b.comp.traffic || 0) - (a.comp.traffic || 0)),
    [rows]
  );
  const top10 = sorted.slice(0, 10);

  return (
    <>
      {/* Desktop / Tablet table */}
      <div
        className="hidden rounded-[16px] border p-4 shadow-sm md:block"
        style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
      >
        <div className="mb-2 flex items-center justify-between">
          <TitleWithInfo
            title="Traffic Distribution by Country"
            info="Top countries sending organic traffic during the selected period."
          />
          <Legend compareOn={compareOn} />
        </div>

        <div className="overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left" style={{ color: TOKENS.muted }}>
                <th className="py-2 pr-3 font-medium">Country</th>
                <th className="py-2 pr-3 font-medium text-right">Traffic (Comp)</th>
                <th className="py-2 pr-3 font-medium">Share % (Comp)</th>
                <th className="py-2 pr-3 font-medium text-right">Keywords (Comp)</th>
                {compareOn && (
                  <>
                    <th className="py-2 pr-3 font-medium text-right">Traffic (You)</th>
                    <th className="py-2 pr-3 font-medium">Share % (You)</th>
                    <th className="py-2 pr-3 font-medium text-right">Keywords (You)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {top10.map((r) => (
                <tr
                  key={r.code}
                  className="group border-t transition-colors duration-200"
                  style={{ borderColor: TOKENS.border, cursor: "default" }}
                >
                  {/* Animated left accent + country badge (no emoji) */}
                  <td className="relative py-2 pr-3">
                    <div className="absolute left-0 top-1/2 h-5 w-0 -translate-y-1/2 rounded-r bg-[var(--wr-brand,#008CCD)] transition-all duration-200 group-hover:w-1.5" />
                    <CountryBadge code={r.code} name={r.name} />
                  </td>

                  <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.comp.traffic)}</td>

                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <ShareBar leftPct={r.comp.share} compareOn={false} />
                      </div>
                      <span className="text-xs" style={{ color: TOKENS.muted }}>
                        {fmtPct01(r.comp.share)}
                      </span>
                    </div>
                  </td>

                  <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.comp.kws)}</td>

                  {compareOn && (
                    <>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.you?.traffic)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-32">
                            <ShareBar leftPct={r.comp.share} rightPct={r.you?.share ?? 0} compareOn />
                          </div>
                          <span className="text-xs" style={{ color: TOKENS.muted }}>
                            {fmtPct01(r.comp.share)} • {fmtPct01(r.you?.share ?? 0)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(r.you?.kws)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sorted.length > 10 && (
          <div className="mt-3 text-right">
            <Button variant="ghost" className="underline" onClick={() => {}}>
              View all countries
            </Button>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        <div
          className="rounded-[16px] border p-4 shadow-sm"
          style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
        >
          <div className="mb-2 flex items-center justify-between">
            <TitleWithInfo
              title="Traffic Distribution by Country"
              info="Top countries sending organic traffic during the selected period."
            />
            <Legend compareOn={compareOn} />
          </div>

          <div className="space-y-3">
            {top10.map((r) => (
              <div
                key={r.code}
                className="rounded-md border p-3 transition-colors hover:bg-[rgba(0,140,205,0.05)]"
                style={{ borderColor: TOKENS.border }}
              >
                <div className="flex items-center gap-2">
                  <CountryBadge code={r.code} name={r.name} />
                </div>

                <div className="mt-2">
                  <div className="mb-1 text-xs" style={{ color: TOKENS.muted }}>
                    Share
                  </div>
                  <ShareBar leftPct={r.comp.share} rightPct={r.you?.share ?? 0} compareOn={!!compareOn} />
                  <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                    {compareOn ? (
                      <>
                        {fmtPct01(r.comp.share)} • {fmtPct01(r.you?.share ?? 0)}
                      </>
                    ) : (
                      <>{fmtPct01(r.comp.share)}</>
                    )}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded bg-[#F5F7FA] p-2">
                    <div className="text-xs" style={{ color: TOKENS.muted }}>
                      Traffic
                    </div>
                    <div className="tabular-nums">{fmtNum(r.comp.traffic)}</div>
                    {compareOn && (
                      <div className="text-xs" style={{ color: TOKENS.muted }}>
                        You: {fmtNum(r.you?.traffic)}
                      </div>
                    )}
                  </div>
                  <div className="rounded bg-[#F5F7FA] p-2">
                    <div className="text-xs" style={{ color: TOKENS.muted }}>
                      Keywords
                    </div>
                    <div className="tabular-nums">{fmtNum(r.comp.kws)}</div>
                    {compareOn && (
                      <div className="text-xs" style={{ color: TOKENS.muted }}>
                        You: {fmtNum(r.you?.kws)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sorted.length > 10 && (
            <div className="mt-3 text-right">
              <Button variant="ghost" className="underline" onClick={() => {}}>
                View all countries
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* --------------------------------- BLOCK C --------------------------------
 * Branded vs Non‑Branded Traffic (100% stacked bars)
 * -------------------------------------------------------------------------*/

function BrandTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload as any;
  const who = row?.entity as "Competitor" | "You";
  const branded = row?.branded as number | undefined;
  const non = row?.non as number | undefined;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 8,
        padding: "8px 10px",
        fontSize: 12,
        pointerEvents: "none",
        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
      }}
    >
      <div style={{ color: TOKENS.muted, marginBottom: 4 }}>{label}</div>
      <div className="mb-1" style={{ color: TOKENS.text }}>
        <b>{who}</b>
      </div>
      <div className="flex flex-col gap-1" style={{ color: TOKENS.text }}>
        <span className="inline-flex items-center gap-2">
          <Dot color={TOKENS.valueBlue} /> Branded: {(branded! * 100).toFixed(1)}%
        </span>
        <span className="inline-flex items-center gap-2">
          <Dot color={TOKENS.pastelBlue} /> Non‑branded: {(non! * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function BrandSplitBlock({
  data,
  compareOn,
}: {
  data: BrandSplit;
  compareOn: boolean;
}) {
  const chartData = useMemo(() => {
    const rows: Array<{ entity: string; branded: number; non: number }> = [];
    if (data?.comp) rows.push({ entity: "Competitor", branded: clamp01(data.comp.branded), non: clamp01(data.comp.non) });
    if (compareOn && data?.you) rows.push({ entity: "You", branded: clamp01(data.you.branded), non: clamp01(data.you.non) });
    return rows;
  }, [data, compareOn]);

  return (
    <div
      className="rounded-[16px] border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="mb-2 flex items-center justify-between">
        <TitleWithInfo
          title="Branded vs Non‑Branded Traffic"
          info="Share of traffic driven by branded vs non‑branded keywords. Smart popover uses colored annotations."
        />
        <Legend compareOn={compareOn} />
      </div>

      <div className="h-[240px]" role="img" aria-label="Branded vs Non-branded share">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} stackOffset="expand">
            <CartesianGrid vertical={false} stroke={TOKENS.border} />
            <XAxis dataKey="entity" tick={{ fontSize: 12, fill: TOKENS.muted }} />
            <YAxis tickFormatter={(n) => `${Math.round((n as number) * 100)}%`} tick={{ fontSize: 12, fill: TOKENS.muted }} />
            <RLegend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 12, color: TOKENS.muted }}
              payload={[
                { value: "Branded", type: "square", color: TOKENS.valueBlue },
                { value: "Non‑Branded", type: "square", color: TOKENS.pastelBlue },
              ]}
            />
            <RTooltip content={<BrandTooltip />} />
            <Bar dataKey="branded" name="Branded" stackId="s" fill={TOKENS.valueBlue} />
            <Bar dataKey="non" name="Non‑Branded" stackId="s" fill={TOKENS.pastelBlue} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
        Entities: <span className="font-medium">Competitor</span>
        {compareOn && " • "}
        <span className="font-medium">{compareOn ? "You" : ""}</span>
      </div>
    </div>
  );
}

/* ----------------------------- MAIN SECTION ------------------------------ */
export type ProfilesTrafficSectionProps = {
  data: TrafficSectionData;
  compareOn?: boolean;
  smoothingDefault?: boolean;
  onToggleSmoothing?: (on: boolean) => void;
  onExport?: (fmt: ExportFmt) => void;
  onViewDetailed?: () => void;
  className?: string;
  canExportPdf?: boolean;
  /** Optional project/domain favicon shown in the section title */
  faviconUrl?: string;
};

export function ProfilesTrafficSection({
  data,
  compareOn = false,
  smoothingDefault = false,
  onToggleSmoothing,
  onExport,
  onViewDetailed,
  canExportPdf = true,
  className,
  faviconUrl,
}: ProfilesTrafficSectionProps) {
  const [smoothingOn, setSmoothingOn] = useState<boolean>(smoothingDefault);

  return (
    <section id="traffic" className={className} style={{ fontFamily: fontInter }}>
      {/* Header row (title + controls) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TitleWithInfo
            title="Organic Traffic Summary"
            info="Trends • Countries • Brand Split"
            faviconUrl={faviconUrl}
          />
        </div>

        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={smoothingOn}
            onChange={(next) => {
              setSmoothingOn(next);
              onToggleSmoothing?.(next);
            }}
            label="Smoothing"
          />
          <Button
            variant="primary"
            onClick={onViewDetailed}
            title="View detailed analysis"
          >
            View detailed Analysis
          </Button>
          <ExportMenu onExport={onExport} canPdf={canExportPdf} />
        </div>
      </div>

      {/* Grid: Trend (full) + Countries / Brand split */}
      <div className="grid grid-cols-1 gap-4 lg:gap-5">
        {/* Trend full width */}
        <TrafficTrendBlock data={data} compareOn={!!compareOn} smoothingOn={smoothingOn} />

        {/* Second row: Countries + Brand split */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CountriesTable rows={data.countries} compareOn={!!compareOn} />
          </div>
          <div className="lg:col-span-2">
            <BrandSplitBlock data={data.brand_split} compareOn={!!compareOn} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Optional Demo Wrapper (remove in prod) -------------------- */
function makeTS(days = 60, baseC = 3800, baseY = 2900, chaos = 0.12): TrafficTimeseriesPoint[] {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const arr: TrafficTimeseriesPoint[] = [];
  let c = baseC, y = baseY;
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime()); d.setDate(start.getDate() + i);
    c = Math.max(0, c + (Math.random() - 0.5) * baseC * chaos);
    y = Math.max(0, y + (Math.random() - 0.5) * baseY * chaos);
    arr.push({ t: d.toISOString().slice(0, 10), comp: Math.round(c), you: Math.round(y) });
  }
  return arr;
}

export default function Demo_ProfilesTrafficSection() {
  const data: TrafficSectionData = {
    timeseries: makeTS(60, 3800, 2900, 0.1),
    granularity: "day",
    countries: [
      { code: "US", name: "United States", comp: { traffic: 48000, share: 0.39, kws: 860 }, you: { traffic: 22000, share: 0.32, kws: 410 } },
      { code: "GB", name: "United Kingdom", comp: { traffic: 18500, share: 0.15, kws: 330 }, you: { traffic: 9200, share: 0.13, kws: 182 } },
      { code: "IN", name: "India", comp: { traffic: 16200, share: 0.13, kws: 280 }, you: { traffic: 6400, share: 0.09, kws: 120 } },
      { code: "AU", name: "Australia", comp: { traffic: 9800, share: 0.08, kws: 140 }, you: { traffic: 5100, share: 0.07, kws: 86 } },
      { code: "CA", name: "Canada", comp: { traffic: 9300, share: 0.075, kws: 122 }, you: { traffic: 3500, share: 0.05, kws: 64 } },
      { code: "DE", name: "Germany", comp: { traffic: 8400, share: 0.068, kws: 110 }, you: { traffic: 2800, share: 0.04, kws: 46 } },
      { code: "FR", name: "France", comp: { traffic: 7300, share: 0.059, kws: 103 }, you: { traffic: 2500, share: 0.036, kws: 39 } },
      { code: "SG", name: "Singapore", comp: { traffic: 5100, share: 0.041, kws: 88 }, you: { traffic: 2400, share: 0.035, kws: 34 } },
      { code: "ES", name: "Spain", comp: { traffic: 4200, share: 0.034, kws: 70 }, you: { traffic: 1800, share: 0.026, kws: 22 } },
      { code: "BR", name: "Brazil", comp: { traffic: 3600, share: 0.029, kws: 60 }, you: { traffic: 1600, share: 0.023, kws: 18 } },
      { code: "IT", name: "Italy", comp: { traffic: 3200, share: 0.025, kws: 55 }, you: { traffic: 1200, share: 0.017, kws: 14 } }
    ],
    brand_split: {
      comp: { branded: 0.28, non: 0.72, examples: { branded: ["brand", "brand tool"], non: ["seo audit", "rank checker"] } },
      you:  { branded: 0.22, non: 0.78, examples: { branded: ["yourbrand"], non: ["keyword research"] } }
    },
    source: "SERanking"
  };

  const [compareOn, setCompareOn] = useState(true);

  return (
    <div className="w-full bg-white mt-4" style={{ fontFamily: fontInter }}>
      <div className="mx-auto w-full">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm" style={{ color: TOKENS.muted }}>
            Demo: toggle compare in parent
          </div>
          <Chip onClick={() => setCompareOn((s) => !s)} className="cursor-pointer">
            Compare: <b>{compareOn ? "ON" : "OFF"}</b>
          </Chip>
        </div>

        <ProfilesTrafficSection
          data={data}
          compareOn={compareOn}
          smoothingDefault={false}
          onToggleSmoothing={() => {}}
          onExport={(fmt) => alert(`Export ${fmt}`)}
          onViewDetailed={() => alert("Open Domain Analysis")}
          canExportPdf={false}
          faviconUrl="https://www.google.com/s2/favicons?sz=32&domain=wranker.example.com"
        />
      </div>
    </div>
  );
}
