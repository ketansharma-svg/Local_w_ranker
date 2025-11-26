
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Link2,
  BarChartHorizontal,
  ShieldAlert,
  ExternalLink,
  Info,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ============================================================================
 * TOKENS / STYLES
 * ==========================================================================*/
const TOKENS = {
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  card: "#FFFFFF",
  brandIcon: "#008CCD", // branded icons
  mainBlue: "#0077FF", // main metric color (also used in Risky Anchors main metric)
  pastelBlue: "#D9EEF8",
  danger: "#EF4444",
  warning: "#F59E0B",
  good: "#10B981",
} as const;

const fontFamily =
  'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"';

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
const intFmt = new Intl.NumberFormat();
const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;
const fmtInt = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : Math.abs(n) >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : intFmt.format(n);

/* ============================================================================
 * DATA TYPES
 * ==========================================================================*/
export type Project = {
  id: string;
  name: string;
  domain: string;
  favicon?: string;
  wrScore: number; // 0..100 (current)
  wrDelta?: number; // vs prev period
};

export type RDPoint = {
  date: string; // ISO yyyy-mm-dd
  new: number;
  lost: number;
  breakdown: Record<
    string,
    {
      new: number;
      lost: number;
    }
  >;
};

export type WRPoint = {
  date: string; // ISO yyyy-mm-dd
  wr: number; // portfolio avg on this date
  breakdown: Record<
    string,
    {
      wr: number;
      delta?: number;
    }
  >;
};

export type AnchorSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  breakdown: Record<string, number>;
};

export type BacklinkAuthorityData = {
  projects: Project[];
  wrAvg?: number;
  wrDelta?: number;
  rdSeries: RDPoint[];
  wrSeries?: WRPoint[];
  anchorSlices: AnchorSlice[];
  riskyTotal?: number;
  riskyDelta?: number;
};

/* ============================================================================
 * DEMO DATA
 * ==========================================================================*/
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function makeDemoData(): BacklinkAuthorityData {
  const projs: Project[] = [
    {
      id: "p1",
      name: "Wranker",
      domain: "wranker.com",
      favicon: "https://www.google.com/s2/favicons?domain=wranker.com&sz=32",
      wrScore: 64,
      wrDelta: 1.8,
    },
    {
      id: "p2",
      name: "Vefogix",
      domain: "vefogix.com",
      favicon: "https://www.google.com/s2/favicons?domain=vefogix.com&sz=32",
      wrScore: 72,
      wrDelta: 2.2,
    },
    {
      id: "p3",
      name: "W3era",
      domain: "w3era.com",
      favicon: "https://www.google.com/s2/favicons?domain=w3era.com&sz=32",
      wrScore: 58,
      wrDelta: -0.6,
    },
    {
      id: "p4",
      name: "RankPilot",
      domain: "rankpilot.ai",
      favicon: "https://www.google.com/s2/favicons?domain=rankpilot.ai&sz=32",
      wrScore: 69,
      wrDelta: 1.0,
    },
    {
      id: "p5",
      name: "CortexLab",
      domain: "cortexlab.dev",
      favicon: "https://www.google.com/s2/favicons?domain=cortexlab.dev&sz=32",
      wrScore: 61,
      wrDelta: 0.4,
    },
    {
      id: "p6",
      name: "OrbiDocs",
      domain: "orbidocs.io",
      favicon: "https://www.google.com/s2/favicons?domain=orbidocs.io&sz=32",
      wrScore: 74,
      wrDelta: 1.6,
    },
    {
      id: "p7",
      name: "Formsly",
      domain: "formsly.app",
      favicon: "https://www.google.com/s2/favicons?domain=formsly.app&sz=32",
      wrScore: 51,
      wrDelta: -1.2,
    },
    {
      id: "p8",
      name: "HexoPlus",
      domain: "hexoplus.io",
      favicon: "https://www.google.com/s2/favicons?domain=hexoplus.io&sz=32",
      wrScore: 66,
      wrDelta: 0.7,
    },
    {
      id: "p9",
      name: "Glossier",
      domain: "glossier.dev",
      favicon: "https://www.google.com/s2/favicons?domain=glossier.dev&sz=32",
      wrScore: 63,
      wrDelta: 0.2,
    },
    {
      id: "p10",
      name: "Streamlit",
      domain: "streamlit.app",
      favicon: "https://www.google.com/s2/favicons?domain=streamlit.app&sz=32",
      wrScore: 59,
      wrDelta: -0.8,
    },
    {
      id: "p11",
      name: "Raycast",
      domain: "raycast.com",
      favicon: "https://www.google.com/s2/favicons?domain=raycast.com&sz=32",
      wrScore: 68,
      wrDelta: 1.1,
    },
    {
      id: "p12",
      name: "ZedKit",
      domain: "zedkit.io",
      favicon: "https://www.google.com/s2/favicons?domain=zedkit.io&sz=32",
      wrScore: 62,
      wrDelta: -0.2,
    },
  ];

  const today = new Date();
  const days = 14;

  const series: RDPoint[] = Array.from({ length: days }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - idx));
    const baseNew = Math.round(30 + Math.sin(idx / 2) * 10 + ((idx % 3) * 2));
    const baseLost = Math.round(15 + Math.cos(idx / 3) * 6 + (((idx + 1) % 4) as number));
    const breakdown: RDPoint["breakdown"] = {};
    let remainingNew = baseNew;
    let remainingLost = baseLost;
    projs.forEach((p, i) => {
      const n = Math.max(
        0,
        Math.round((baseNew / projs.length) * (0.7 + (((i * 37) % 19) as number) / 50))
      );
      const l = Math.max(
        0,
        Math.round((baseLost / projs.length) * (0.5 + (((i * 17) % 13) as number) / 40))
      );
      breakdown[p.id] = { new: n, lost: l };
      remainingNew -= n;
      remainingLost -= l;
    });
    const lastId = projs[projs.length - 1].id;
    breakdown[lastId] = {
      new: (breakdown[lastId]?.new ?? 0) + Math.max(0, remainingNew),
      lost: (breakdown[lastId]?.lost ?? 0) + Math.max(0, remainingLost),
    };
    return {
      date: d.toISOString().slice(0, 10),
      new: baseNew,
      lost: baseLost,
      breakdown,
    };
  });

  const wrSeries: WRPoint[] = Array.from({ length: days }).map((_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - idx));

    const breakdown: WRPoint["breakdown"] = {};
    projs.forEach((p, i) => {
      const wave = Math.sin((idx + i) / 3.2) * 2.8 + Math.cos(i / 2.7) * 1.2;
      const noise = (((i * 97 + idx * 13) % 7) - 3) * 0.35;
      const wr = clamp(p.wrScore + wave + noise, 42, 92);
      breakdown[p.id] = { wr };
    });

    return {
      date: d.toISOString().slice(0, 10),
      wr: Object.values(breakdown).reduce((s, b) => s + b.wr, 0) / projs.length,
      breakdown,
    };
  });

  for (let i = 1; i < wrSeries.length; i++) {
    const prev = wrSeries[i - 1];
    const cur = wrSeries[i];
    Object.keys(cur.breakdown).forEach((pid) => {
      cur.breakdown[pid].delta =
        cur.breakdown[pid].wr - (prev.breakdown[pid]?.wr ?? cur.breakdown[pid].wr);
    });
  }

  const anchors: AnchorSlice[] = [
    { key: "money", label: "Money/Commercial", value: 420, color: "#EF4444", breakdown: {} },
    { key: "brand", label: "Brand", value: 560, color: "#0077FF", breakdown: {} },
    { key: "generic", label: "Generic", value: 310, color: "#7FB6FF", breakdown: {} },
    { key: "compound", label: "Compound", value: 180, color: "#4F46E5", breakdown: {} },
    { key: "url", label: "URL", value: 220, color: "#10B981", breakdown: {} },
    { key: "other", label: "Other", value: 90, color: "#9CA3AF", breakdown: {} },
  ];
  anchors.forEach((s) => {
    let remain = s.value;
    projs.forEach((p, i) => {
      const v = Math.max(1, Math.round((s.value / projs.length) * (0.8 + (((i * 29) % 10) as number) / 30)));
      s.breakdown[p.id] = v;
      remain -= v;
    });
    const lastId = projs[projs.length - 1].id;
    s.breakdown[lastId] = (s.breakdown[lastId] ?? 0) + Math.max(0, remain);
  });

  const wrAvg = projs.reduce((acc, p) => acc + (p.wrScore ?? 0), 0) / Math.max(1, projs.length);

  return {
    projects: projs,
    wrAvg,
    wrDelta: 1.5,
    rdSeries: series,
    wrSeries,
    anchorSlices: anchors,
    riskyTotal: anchors.find((a) => a.key === "money")!.value,
    riskyDelta: 4.0,
  };
}

/* ============================================================================
 * SHARED ATOMS
 * ==========================================================================*/
function MiniDelta({
  delta,
  invert = false,
  unit = "%",
  className,
}: {
  delta?: number;
  invert?: boolean;
  unit?: "%" | "";
  className?: string;
}) {
  if (typeof delta !== "number" || Number.isNaN(delta)) {
    return (
      <span className={cx("text-xs", className)} style={{ color: TOKENS.muted }}>
        —
      </span>
    );
  }
  const good = invert ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "—";
  return (
    <span
      className={cx("text-xs font-medium", className)}
      style={{ color: good ? TOKENS.good : TOKENS.danger }}
      aria-label={`delta ${delta.toFixed(1)}${unit}`}
    >
      {arrow} {Math.abs(delta).toFixed(1)}
      {unit}
    </span>
  );
}

function Favicon({
  url,
  alt,
  size = 16,
}: {
  url?: string;
  alt: string;
  size?: number;
}) {
  const [err, setErr] = React.useState(false);
  const letter = alt?.[0]?.toUpperCase() ?? "•";
  return err || !url ? (
    <div
      className="grid place-items-center rounded"
      style={{
        width: size,
        height: size,
        background: "#F3F4F6",
        color: "#6B7280",
        fontSize: size * 0.6,
        lineHeight: 1,
      }}
      aria-hidden
    >
      {letter}
    </div>
  ) : (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setErr(true)}
      className="rounded"
    />
  );
}

function TinyCircularGauge({
  value,
  size = 22,
  stroke = 3,
  track = "#E5E7EB",
  color = TOKENS.mainBlue,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  track?: string;
  color?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(value, 0, 100) / 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`circular gauge ${Math.round(value)} of 100`}
    >
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/* ============================================================================
 * LIGHTWEIGHT PORTAL POPOVER UTILS
 * - Popovers are rendered with position: fixed into document.body (no layout shift)
 * - Helpers to get viewport-anchored rects
 * ==========================================================================*/
function useBoundingRect<T extends HTMLElement>(): [React.RefObject<T | null>, DOMRect | null] {
  const ref = React.useRef<T>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      try {
        const r = el.getBoundingClientRect?.();
        if (r) setRect(r);
      } catch {}
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true } as any);
    };
  }, []);

  return [ref, rect];
}


function PopoverPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* ============================================================================
 * CARD 1 — WR SCORE (PORTFOLIO) with fixed-position smart popovers
 * ==========================================================================*/
export function WRScoreCard({ data }: { data?: BacklinkAuthorityData }) {
  const D = React.useMemo(() => data ?? makeDemoData(), [data]);
  const wrAvg =
    typeof D.wrAvg === "number"
      ? D.wrAvg
      : D.projects.reduce((s, p) => s + (p.wrScore ?? 0), 0) / Math.max(1, D.projects.length);

  const sorted = [...(D.projects ?? [])].sort((a, b) => (b.wrScore ?? 0) - (a.wrScore ?? 0));

  const wrSeries = React.useMemo<WRPoint[]>(() => {
    if (D.wrSeries?.length) return D.wrSeries;
    return makeDemoData().wrSeries!;
  }, [D]);

  const [gaugeOpen, setGaugeOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  // Anchor rects for positioning (viewport coordinates)
  const [gaugeRef, gaugeRect] = useBoundingRect<HTMLDivElement>();
  const [trendRef, trendRect] = useBoundingRect<HTMLDivElement>();

  const activeDay = typeof activeIdx === "number" ? wrSeries[activeIdx] : null;
  const prevDay = typeof activeIdx === "number" && activeIdx > 0 ? wrSeries[activeIdx - 1] : null;

  const breakdownForActiveDay =
    activeDay &&
    Object.entries(activeDay.breakdown).map(([pid, v]) => {
      const proj = D.projects.find((p) => p.id === pid);
      const delta =
        v.delta ?? (prevDay ? v.wr - (prevDay.breakdown[pid]?.wr ?? v.wr) : undefined);
      return { pid, name: proj?.name ?? pid, favicon: proj?.favicon, wr: v.wr, delta };
    });

  return (
    <div
      className="relative rounded-md border p-4 h-full"
      style={{ borderColor: TOKENS.border, background: TOKENS.card }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <BarChartHorizontal size={18} color={TOKENS.brandIcon} />
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          WR Score (Portfolio)
        </div>
      </div>

      {/* Main metric row */}
      <div className="mt-1">
        <div className="flex items-center gap-2">
          <div
            ref={gaugeRef}
            className="relative"
            onMouseEnter={() => setGaugeOpen(true)}
            onMouseLeave={() => setGaugeOpen(false)}
          >
            <TinyCircularGauge value={wrAvg} />
          </div>
          <div className="text-[28px] font-bold" style={{ color: TOKENS.mainBlue }}>
            {Math.round(wrAvg)}
          </div>
          <MiniDelta delta={D.wrDelta} />
        </div>
      </div>

      {/* Trend bar chart (anchor wrapper needed for rect) */}
      <div ref={trendRef} className="mt-3">
        <div className="h-[120px] w-full">
          <ResponsiveContainer>
            <BarChart
              data={wrSeries.map((d) => ({ date: d.date, WR: Math.round(d.wr) }))}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (typeof state?.activeTooltipIndex === "number") {
                  setActiveIdx(state.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setActiveIdx(null)}
            >
              <XAxis dataKey="date" hide />
              <RTooltip wrapperStyle={{ display: "none" }} />
              <Bar dataKey="WR" radius={[6, 6, 0, 0]} className="cursor-pointer">
                {wrSeries.map((_, i) => (
                  <Cell key={`wr-${i}`} fill={TOKENS.mainBlue} opacity={activeIdx === i ? 1 : 0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
        Hover the gauge for the current project breakdown (may overlap the chart),
        and hover the bars to see per‑day breakdown shown outside the chart area.
      </div>

      {/* ===================== FIXED-OVERLAY POPOVERS VIA PORTAL ===================== */}
      {/* Gauge popover — can overlap the trend chart, but never covers the gauge itself */}
      {gaugeOpen && gaugeRect && (
        <PopoverPortal>
          <div
            className="rounded-md border bg-white p-3 shadow-lg"
            role="dialog"
            style={{
              position: "fixed",
              // place below-left of the gauge; does not cover the gauge itself
              left: gaugeRect.left,
              top: gaugeRect.bottom + 8,
              zIndex: 60,
              borderColor: TOKENS.border,
              maxWidth: Math.min(420, Math.max(320, window.innerWidth - gaugeRect.left - 16)),
              fontFamily,
            }}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.mainBlue }} />
              <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                WR Score — Project breakdown
              </div>
            </div>
            <div className="text-xs" style={{ color: TOKENS.muted }}>
              Current values; deltas vs. previous period.
            </div>
            <div className="mt-2">
              {sorted.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Favicon url={p.favicon} alt={p.name} />
                    <div className="truncate text-sm" style={{ color: TOKENS.text }}>
                      {p.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                      {Math.round(p.wrScore)}
                    </div>
                    <MiniDelta delta={p.wrDelta} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverPortal>
      )}

      {/* Trend popover — must NOT overlap the trend chart area; anchor below the chart */}
      {activeDay && trendRect && breakdownForActiveDay && (
        <PopoverPortal>
          <div
            className="rounded-md border bg-white p-3 shadow-lg"
            role="dialog"
            style={{
              position: "fixed",
              left: trendRect.left + trendRect.width / 2,
              top: trendRect.bottom + 8, // sits outside chart, below
              transform: "translateX(-50%)",
              zIndex: 60,
              borderColor: TOKENS.border,
              width: Math.min(520, Math.max(320, trendRect.width)),
              maxWidth: Math.min(560, window.innerWidth - 16),
            }}
          >
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.mainBlue }} />
              <div className="font-semibold" style={{ color: TOKENS.text }}>
                WR Score — {new Date(activeDay.date).toLocaleDateString()}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {breakdownForActiveDay
                .sort((a, b) => b.wr - a.wr)
                .map((r) => (
                  <div key={r.pid} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Favicon url={r.favicon} alt={r.name} />
                      <div className="truncate text-sm" style={{ color: TOKENS.text }}>
                        {r.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                        {Math.round(r.wr)}
                      </div>
                      <MiniDelta delta={r.delta} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ============================================================================
 * CARD 2 — New/Lost Referring Domains with fixed-position popover
 * ==========================================================================*/
export function NewLostRDCard({ data }: { data?: BacklinkAuthorityData }) {
  const D = React.useMemo(() => data ?? makeDemoData(), [data]);
  const series = D.rdSeries ?? [];
  const totalNew = series.reduce((s, d) => s + (d?.new ?? 0), 0);
  const totalLost = series.reduce((s, d) => s + (d?.lost ?? 0), 0);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  // Anchor for popover placement
  const [chartRef, chartRect] = useBoundingRect<HTMLDivElement>();

  const dayRow = typeof activeIdx === "number" ? series[activeIdx] : undefined;
  const rows =
    dayRow &&
    Object.entries(dayRow.breakdown ?? {})
      .map(([pid, v]) => {
        const proj = D.projects.find((p) => p.id === pid);
        return {
          pid,
          name: proj?.name ?? pid,
          favicon: proj?.favicon,
          new: v.new,
          lost: v.lost,
          total: v.new + v.lost,
        };
      })
      .sort((a, b) => b.total - a.total);

  const top = rows ? rows.slice(0, 9) : [];
  const rest = rows ? rows.slice(9) : [];
  const others =
    rest && rest.length
      ? rest.reduce(
          (acc, r) => ({
            new: acc.new + r.new,
            lost: acc.lost + r.lost,
          }),
          { new: 0, lost: 0 }
        )
      : null;

  return (
    <div
      className="relative rounded-md border p-4 h-full"
      style={{ borderColor: TOKENS.border, background: TOKENS.card }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <Link2 size={18} color={TOKENS.brandIcon} />
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          New / Lost Referring Domains (Trends)
        </div>
      </div>

      {/* Main metric */}
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-[22px] font-bold" style={{ color: TOKENS.text }}>
          <span style={{ color: TOKENS.mainBlue }}>+{fmtInt(totalNew)}</span>
          {" / "}
          <span style={{ color: TOKENS.danger }}>−{fmtInt(totalLost)}</span>
          <span className="text-sm font-medium" style={{ color: TOKENS.muted }}>
            &nbsp;(period)
          </span>
        </div>
      </div>

      {/* Chart (anchor wrapper) */}
      <div ref={chartRef} className="mt-3 h-[120px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={series.map((d) => ({ date: d.date, New: d.new, Lost: d.lost }))}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (typeof state?.activeTooltipIndex === "number") {
                setActiveIdx(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <XAxis dataKey="date" hide />
            <RTooltip wrapperStyle={{ display: "none" }} />
            <Bar dataKey="New" radius={[6, 6, 0, 0]} className="cursor-pointer">
              {series.map((_, i) => (
                <Cell key={`n-${i}`} fill={TOKENS.mainBlue} opacity={activeIdx === i ? 1 : 0.9} />
              ))}
            </Bar>
            <Bar dataKey="Lost" radius={[6, 6, 0, 0]} className="cursor-pointer">
              {series.map((_, i) => (
                <Cell key={`l-${i}`} fill={TOKENS.danger} opacity={activeIdx === i ? 1 : 0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
        Hover a bar to see daily project breakdowns (popover is outside the chart).
      </div>

      {/* Fixed-position popover BELOW the chart — never covers the active chart */}
      {dayRow && chartRect && (
        <PopoverPortal>
          <div
            className="rounded-md border bg-white p-3 shadow-lg"
            role="dialog"
            style={{
              position: "fixed",
              left: chartRect.left + chartRect.width / 2,
              top: chartRect.bottom + 8,
              transform: "translateX(-50%)",
              zIndex: 60,
              borderColor: TOKENS.border,
              width: Math.min(520, Math.max(320, chartRect.width)),
              maxWidth: Math.min(560, window.innerWidth - 16),
              color: TOKENS.text,
              fontFamily,
            }}
          >
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.mainBlue }} />
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TOKENS.danger }} />
              <div className="font-semibold">
                New / Lost RD — {new Date(dayRow.date).toLocaleDateString()}
              </div>
            </div>
            <div>
              {top.map((r) => (
                <div key={r.pid} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Favicon url={r.favicon} alt={r.name} />
                    <div className="truncate text-sm">{r.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: TOKENS.mainBlue }}>
                      +{fmtInt(r.new)}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: TOKENS.danger }}>
                      −{fmtInt(r.lost)}
                    </span>
                  </div>
                </div>
              ))}
              {others && (
                <div className="mt-2 border-t pt-2" style={{ borderColor: TOKENS.border }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="grid place-items-center rounded text-[11px]"
                        style={{
                          width: 16,
                          height: 16,
                          background: "#F3F4F6",
                          color: TOKENS.muted,
                        }}
                        aria-hidden
                      >
                        …
                      </div>
                      <div className="text-sm">Others ({rows!.length - top.length})</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: TOKENS.mainBlue }}>
                        +{fmtInt(others.new)}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: TOKENS.danger }}>
                        −{fmtInt(others.lost)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ============================================================================
 * CARD 3 — Risky Anchors (donut) with auto-placed fixed popover (never over chart)
 * ==========================================================================*/
export function RiskyAnchorsCard({ data }: { data?: BacklinkAuthorityData }) {
  const D = React.useMemo(() => data ?? makeDemoData(), [data]);
  const slices = D.anchorSlices ?? [];
  const total = slices.reduce((s, a) => s + (a.value ?? 0), 0);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  // Track pointer to decide side; anchor to donut rect
  const [donutRef, donutRect] = useBoundingRect<HTMLDivElement>();
  const [mouse, setMouse] = React.useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const active = activeIdx != null ? slices[activeIdx] : undefined;

  const placement = React.useMemo<"left" | "right" | "top" | "bottom">(() => {
    const x = mouse.x;
    const y = mouse.y;
    if (x < 0.35) return "right";
    if (x > 0.65) return "left";
    return y < 0.5 ? "bottom" : "top";
  }, [mouse.x, mouse.y]);

  // Compute fixed style so popover never overlaps the donut chart
  function donutPopoverStyle(): React.CSSProperties | undefined {
    if (!donutRect) return undefined;
    const base: React.CSSProperties = {
      position: "fixed",
      zIndex: 60,
      minWidth: 300,
      borderColor: TOKENS.border,
      fontFamily,
    };
    if (placement === "left") {
      return { ...base, left: donutRect.left - 8, top: donutRect.top + donutRect.height / 2, transform: "translate(-100%, -50%)" };
    }
    if (placement === "right") {
      return { ...base, left: donutRect.right + 8, top: donutRect.top + donutRect.height / 2, transform: "translate(0, -50%)" };
    }
    if (placement === "top") {
      return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.top - 8, transform: "translate(-50%, -100%)" };
    }
    // bottom
    return { ...base, left: donutRect.left + donutRect.width / 2, top: donutRect.bottom + 8, transform: "translate(-50%, 0)" };
  }

  // Rows for the active slice (aggregate "Others")
  const rows =
    active &&
    Object.entries(active.breakdown ?? {})
      .map(([pid, v]) => {
        const proj = D.projects.find((p) => p.id === pid);
        return { pid, name: proj?.name ?? pid, favicon: proj?.favicon, value: v };
      })
      .sort((a, b) => b.value - a.value);
  const top = rows ? rows.slice(0, 9) : [];
  const rest = rows ? rows.slice(9) : [];
  const othersVal = rest.reduce((s, r) => s + r.value, 0);

  return (
    <div
      className="relative rounded-md border p-4 h-full"
      style={{ borderColor: TOKENS.border, background: TOKENS.card }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} color={TOKENS.brandIcon} />
        <div className="text-[13px] font-semibold" style={{ color: TOKENS.text }}>
          Risky Anchors
        </div>
      </div>

      {/* Main metric (now uses main blue) */}
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-[28px] font-bold" style={{ color: TOKENS.mainBlue }}>
          {fmtInt(D.riskyTotal ?? slices.find((s) => s.key === "money")?.value ?? 0)}
        </div>
        <MiniDelta delta={D.riskyDelta} />
        <div className="text-xs" style={{ color: TOKENS.muted }}>
          (Money/Commercial & similar)
        </div>
      </div>

      {/* Donut + legend */}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div
          ref={donutRef}
          className="relative h-[170px] w-full"
          onMouseMove={(e) => {
            const rect = donutRef.current?.getBoundingClientRect();
            if (!rect) return;
            setMouse({
              x: (e.clientX - rect.left) / rect.width,
              y: (e.clientY - rect.top) / rect.height,
            });
          }}
        >
          <ResponsiveContainer>
            <PieChart>
              <RTooltip wrapperStyle={{ display: "none" }} />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                startAngle={90}
                endAngle={-270}
                innerRadius={54}
                outerRadius={70}
                paddingAngle={2}
                onMouseEnter={(_, i) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                className="cursor-pointer"
              >
                {slices.map((s, i) => (
                  <Cell
                    key={s.key}
                    fill={s.color}
                    style={{
                      transition: "transform 120ms ease-out",
                      transform: activeIdx === i ? "scale(1.04)" : "scale(1.0)",
                      transformOrigin: "center",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center gap-2">
          {(slices ?? []).map((s, i) => (
            <div key={s.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
                <div className="text-sm" style={{ color: TOKENS.text }}>
                  {s.label}
                </div>
              </div>
              <div className="text-sm font-semibold" style={{ color: activeIdx === i ? TOKENS.text : TOKENS.muted }}>
                {fmtInt(s.value)}{" "}
                <span className="text-xs" style={{ color: TOKENS.muted }}>
                  ({pct((s.value / Math.max(1, total)) * 100)})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
        Hover a slice to view per‑project breakdown. The popover auto-places to the side/top/bottom
        of the chart and does not cover the chart itself.
      </div>

      {/* Donut popover — auto-placed outside the donut area */}
      {active && donutRect && (
        <PopoverPortal>
          <div
            className="rounded-md border bg-white p-3 text-xs shadow-lg"
            role="dialog"
            style={donutPopoverStyle()}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: active.color }} />
              <div className="font-semibold" style={{ color: TOKENS.text }}>
                {active.label} — Project breakdown
              </div>
            </div>
            <div>
              {top.map((r) => (
                <div key={r.pid} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Favicon url={r.favicon} alt={r.name} />
                    <div className="truncate">{r.name}</div>
                  </div>
                  <div className="font-semibold">{fmtInt(r.value)}</div>
                </div>
              ))}
              {othersVal > 0 && (
                <div className="mt-2 border-t pt-2" style={{ borderColor: TOKENS.border }}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="grid place-items-center rounded text-[11px]"
                        style={{
                          width: 16,
                          height: 16,
                          background: "#F3F4F6",
                          color: TOKENS.muted,
                        }}
                      >
                        …
                      </div>
                      <div>Others ({rows!.length - top.length})</div>
                    </div>
                    <div className="font-semibold">{fmtInt(othersVal)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PopoverPortal>
      )}
    </div>
  );
}

/* ============================================================================
 * SECTION — Backlink & Authority At‑a‑Glance
 * ==========================================================================*/
export default function BacklinkAuthoritySection({
  data,
  onOpenBacklinksInsights,
  onExport,
}: {
  data?: BacklinkAuthorityData;
  onOpenBacklinksInsights?: () => void;
  onExport?: (data: BacklinkAuthorityData) => void;
}) {
  const D = React.useMemo(() => data ?? makeDemoData(), [data]);
  const wrAvg =
    typeof D.wrAvg === "number"
      ? D.wrAvg
      : (D.projects ?? []).reduce((s, p) => s + (p.wrScore ?? 0), 0) /
        Math.max(1, (D.projects ?? []).length);

  const doExport = React.useCallback(() => {
    if (onExport) return onExport(D);
    const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlink_authority_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [D, onExport]);

  return (
    <section className="w-full rounded-md border px-2.5 py-1.5 bg-white mt-4" style={{ fontFamily }}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={18} color={TOKENS.brandIcon} />
          <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
            Backlink & Authority At‑a‑Glance
          </h3>
          <span
            className="ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
            title="Portfolio WR average"
          >
            <Info size={12} /> WR Avg:&nbsp;
            <span className="font-semibold" style={{ color: TOKENS.mainBlue }}>
              {Math.round(wrAvg)}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={doExport}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: "#fff" }}
            title="Export"
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenBacklinksInsights
                ? onOpenBacklinksInsights()
                : alert("Open Backlinks Insights")
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-white"
            style={{ background: TOKENS.brandIcon }}
          >
            Open Backlinks Insights
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Cards grid — equal heights (items-stretch + each card h-full) */}
      <div className="grid grid-cols-12 gap-4 items-stretch">
        <div className="col-span-12 lg:col-span-4">
          <WRScoreCard data={D} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <NewLostRDCard data={D} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <RiskyAnchorsCard data={D} />
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
        <ChevronRight size={14} />
        Preferred color for main values & charts is blue&nbsp;
        <span className="inline-flex h-3 w-3 rounded-full" style={{ background: TOKENS.mainBlue }} />
        &nbsp;and pastels; status charts use their status colors.
      </div>
    </section>
  );
}

/* ============================================================================
 * NOTES
 * ----------------------------------------------------------------------------
 * - All smart popovers are rendered into document.body with position: fixed, so
 *   they can extend beyond the card and never shift surrounding layouts.
 * - WR card: gauge popover may overlap the trend chart (as requested), but it
 *   never covers the gauge itself; the trend popover sits below the chart so it
 *   does not cover the chart being hovered.
 * - RD card and Donut card popovers are placed outside their charts (below /
 *   side / top/bottom), so the hovered chart is never obscured.
 * - Risky Anchors main metric now uses the same main blue (#0077FF).
 * - Cards use h-full + grid items-stretch so all three have the same height.
 * ==========================================================================*/

