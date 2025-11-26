import React, { useEffect, useMemo, useRef, useState } from "react";
import { AreaChart, Download } from "lucide-react";  

/**
 * Section D.1 — Keywords Performance Trend (Top 5)
 * - Inter / Inter Fallback fonts only
 * - Branded section icon (#008CCD)
 * - Modern chips & buttons with pointer cursor
 * - Uses ONLY the right half width of the panel (responsive: w-full on small, w-1/2 on md+ and right-aligned)
 * - Smooth AREA chart (no external libs)
 * - Smart popover (same bg as panel) with colored dot annotations
 * - Cursor intersection follows the cursor across the entire plot, including both edges
 * - Single Export button in the header (CSV export by default)
 */

/* ===================== LOCAL TOKENS ===================== */
const LocalTokens = () => (
  <style>{`
    :root{
      --wr-brand:#008CCD;
      --wr-bg:#FFFFFF;
      --wr-text:#111827;
      --wr-muted:#6B7280;
      --wr-border:#EFF0F6;
      --wr-chip:#F5F7FA;
      --wr-chip-hover:#E5E7EB;
      --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);
    }
    *{ box-sizing:border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
    .wr-card{ background:var(--wr-bg); border:1px solid var(--wr-border); border-radius:10px; box-shadow:var(--wr-shadow-sm); }
    .wr-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-bottom:1px solid var(--wr-border); }
    .wr-title{ display:flex; align-items:center; gap:10px; font-weight:700; font-size:16px; line-height:1.3; color:var(--wr-text); }
    .wr-tools{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

    /* modern chips / segmented */
    .wr-chip{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border:1px solid var(--wr-border); border-radius:999px; background:var(--wr-chip); color:var(--wr-text); font-weight:700; font-size:12px; line-height:1; cursor:pointer; }
    .wr-chip[aria-pressed="true"]{ background:#DCEEFF; border-color:#C7E5FF; }
    .wr-chip:hover{ background:var(--wr-chip-hover); }

    /* button */
    .wr-btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; height:36px; border:1px solid var(--wr-border); border-radius:10px; background:#fff; color:var(--wr-text); font-weight:700; font-size:13px; line-height:1; cursor:pointer; }
    .wr-btn:hover{ background:var(--wr-chip-hover); }

    /* legend chip */
    .wr-leg{ display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid var(--wr-border); border-radius:999px; background:var(--wr-chip); font-weight:700; font-size:12px; line-height:1; cursor:pointer; }
    .wr-leg[aria-pressed="false"]{ opacity:.45; }

    .dot{ width:10px; height:10px; border-radius:2px; display:inline-block; }

    /* chart shell */
    .wr-chart{ position:relative; width:100%; height:280px; }
    .wr-grid line{ stroke:var(--wr-border); }
    .wr-axis{ font-weight:600; font-size:10px; fill:var(--wr-muted); }
    .wr-tip{ position:absolute; background:var(--wr-bg); color:var(--wr-text); border:1px solid var(--wr-border); padding:8px 10px; font-weight:600; font-size:12px; line-height:1.2; border-radius:8px; box-shadow:var(--wr-shadow-sm); pointer-events:none; white-space:nowrap; }
    .wr-tip .row{ display:flex; align-items:center; gap:8px; }
  `}</style>
);

/* ===================== HELPERS / MOCK ===================== */
type Point = { date: string; value: number | null };
type Series = { keywordId: string; keyword: string; color?: string; points: Point[] };

const palette = ["#0077FF", "#34A853", "#FF7A45", "#9A4DFF", "#FFB020"];

const lastNDays = (n: number) => {
  const out: string[] = [];
  const t = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return out;
};

const niceTicks = (max: number, count = 5) => {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const step0 = max / Math.max(1, count);
  const pow10 = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / pow10;
  const step = err >= 7.5 ? 10 * pow10 : err >= 3.5 ? 5 * pow10 : err >= 1.5 ? 2 * pow10 : pow10;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  if (out[out.length - 1] !== max) out.push(max);
  return out;
};

const fmtCompact = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat(undefined, { notation: "compact" }).format(n);

const mockTop5 = (tw: "7d" | "14d" | "30d" | "90d"): Series[] => {
  const n = tw === "7d" ? 7 : tw === "14d" ? 14 : tw === "30d" ? 30 : 90;
  const days = lastNDays(n);
  return Array.from({ length: 5 }, (_, i) => ({
    keywordId: `kw_${i + 1}`,
    keyword: `Keyword ${i + 1}`,
    color: palette[i],
    points: days.map((d) => ({
      date: d,
      value: Math.floor(20 + Math.random() * 350) + (i * 7),
    })),
  }));
};

/* ========== smoothing (Catmull-Rom → cubic Bezier) ========== */
function smoothPath(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n <= 1) return "";
  const path: string[] = [];
  path.push(`M ${xs[0]} ${ys[0]}`);
  for (let i = 0; i < n - 1; i++) {
    const x0 = i === 0 ? xs[0] : xs[i - 1];
    const y0 = i === 0 ? ys[0] : ys[i - 1];
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[i + 1];
    const y2 = ys[i + 1];
    const x3 = i + 2 < n ? xs[i + 2] : xs[n - 1];
    const y3 = i + 2 < n ? ys[i + 2] : ys[n - 1];

    // Catmull-Rom to Bezier (tension=0.5)
    const t = 0.5;
    const c1x = x1 + (x2 - x0) * (t / 6);
    const c1y = y1 + (y2 - y0) * (t / 6);
    const c2x = x2 - (x3 - x1) * (t / 6);
    const c2y = y2 - (y3 - y1) * (t / 6);

    path.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`);
  }
  return path.join(" ");
}

/* ===================== MAIN COMPONENT ===================== */
type TW = "7d" | "14d" | "30d" | "90d";
type Props = {
  twDefault?: TW;
  series?: Series[]; // optional; if not provided, mock is used
  title?: string;
};

export default function KeywordsPerformanceTrendRightHalf({
  series: seriesProp,
  title = "Keywords Performance Trend (Top 5)",
}: Props) {

const [series, setSeries] = useState<Series[]>(seriesProp ?? []);
  const [solo, setSolo] = useState<string | null>(null);

useEffect(() => {
  setSeries(seriesProp ?? []);
}, [seriesProp]);


  // base measurements
  const PAD = { top: 12, right: 12, bottom: 28, left: 44 };
  const W = 860;
  const H = 280;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allDates = series[0]?.points?.map((p) => p.date) ?? [];
  const n = allDates.length;

  const activeSeries = useMemo(
    () => (solo ? series.filter((s) => s.keywordId === solo) : series).slice(0, 5),
    [series, solo]
  );

  const maxY = Math.max(
    1,
    ...activeSeries.flatMap((s) => s.points.map((p) => (p.value ?? 0)))
  );
  const ticksY = niceTicks(maxY, 5);

  const xAt = (i: number) =>
    PAD.left + (n <= 1 ? 0 : (i * innerW) / Math.max(1, n - 1));
  const yAt = (v: number | null | undefined) =>
    PAD.top + innerH - ((Math.max(0, v ?? 0) / maxY) * innerH);

  // hover following cursor across whole domain, including edges
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<{ x: number; i: number } | null>(null);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || n === 0) return;
    const r = svgRef.current.getBoundingClientRect();
    const relX = Math.max(PAD.left, Math.min(W - PAD.right, e.clientX - r.left));
    const t = (relX - PAD.left) / innerW;
    const idx = Math.round(t * Math.max(0, n - 1));
    setHover({ x: relX, i: Math.max(0, Math.min(n - 1, idx)) });
  };

  const handleLeave = () => setHover(null);

  // export (single button → CSV)
  const exportCSV = () => {
    const rows = [["date", ...activeSeries.map((s) => s.keyword)]];
    for (let i = 0; i < n; i++) {
      rows.push([allDates[i], ...activeSeries.map((s) => String(s.points[i]?.value ?? ""))]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords_trend.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="w-full md:ml-auto">
      <LocalTokens />
      <div className="wr-card">
        {/* HEADER */}
        <div className="wr-head">
          <div className="wr-title">
            <AreaChart color="#008CCD" />
            {title}
          </div>
          <div className="wr-tools">

            {/* single export button */}
            <button className="wr-btn" onClick={exportCSV} title="Export CSV">
              <Download color="#008CCD" />
              Export
            </button>
          </div>
        </div>

        {/* LEGEND (modern chips) */}
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {series.slice(0, 5).map((s, i) => (
            <button
              key={s.keywordId}
              className="wr-leg"
              aria-pressed={solo ? solo === s.keywordId : true}
              onClick={() => setSolo((prev) => (prev === s.keywordId ? null : s.keywordId))}
              title={solo === s.keywordId ? "Show all" : `Isolate ${s.keyword}`}
            >
              <span className="dot" style={{ background: s.color || palette[i] }} />
              {s.keyword}
            </button>
          ))}
        </div>

{series.length === 0 && (
  <div className="p-6 text-center text-sm text-gray-500">
    No performance data found for this date range.
  </div>
)}


        {/* CHART */}
        <div className="wr-chart px-2 pb-4 pt-2">
            {series.length > 0 && (
          <svg
            ref={svgRef}
            width="100%"
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Keywords Performance Trend (smooth area)"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ cursor: "crosshair" }}
          >
            {/* bg */}
            <rect x={0} y={0} width={W} height={H} fill="var(--wr-bg)" />

            {/* grid + y-axis labels */}
            <g className="wr-grid">
              {ticksY.map((t, i) => (
                <line key={i} x1={PAD.left} x2={W - PAD.right} y1={yAt(t)} y2={yAt(t)} />
              ))}
            </g>
            {ticksY.map((t, i) => (
              <text key={i} x={PAD.left - 8} y={yAt(t) + 3} textAnchor="end" className="wr-axis">
                {fmtCompact(t)}
              </text>
            ))}

            {/* x-axis ticks (≈6 labels comfortably) */}
            {allDates.map((d, i, arr) => {
              const step = Math.max(1, Math.floor(arr.length / 6));
              const show = i % step === 0 || i === arr.length - 1;
              if (!show) return null;
              return (
                <text key={i} x={xAt(i)} y={H - 8} textAnchor="middle" className="wr-axis">
                  {new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
                </text>
              );
            })}

            {/* SERIES (smooth area + line) */}
            {activeSeries.map((s, si) => {
              const color = s.color || palette[si];
              const xs = s.points.map((_, i) => xAt(i));
              const ys = s.points.map((p) => yAt(p.value));
              const smooth = smoothPath(xs, ys);

              const areaPath =
                `${smooth} ` +
                `L ${xAt(n - 1)} ${PAD.top + innerH} ` +
                `L ${xAt(0)} ${PAD.top + innerH} Z`;

              return (
                <g key={s.keywordId} opacity={solo && solo !== s.keywordId ? 0.25 : 1}>
                  {/* area fill (low opacity) */}
                  <path d={areaPath} fill={color} opacity={0.25} />
                  {/* smoothed line */}
                  <path d={smooth} stroke={color} strokeWidth={2} fill="none" />
                  {/* hover marker on nearest point */}
                  {hover && s.points[hover.i] && s.points[hover.i].value != null && (
                    <circle
                      cx={xAt(hover.i)}
                      cy={yAt(s.points[hover.i].value)}
                      r={3}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )}
                </g>
              );
            })}

            {/* vertical guide that follows the cursor across entire plot (including edges) */}
            {hover && (
              <line
                x1={hover.x}
                x2={hover.x}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="#E5E7EB"
              />
            )}
          </svg>)}

          {/* SMART POPOVER (same bg as panel) */}
          {hover && (
            <div
              className="wr-tip"
              style={{
                left: Math.min(Math.max(8, hover.x - 72), W - 160),
                top: 10,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {new Date(allDates[hover.i] + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "2-digit",
                })}
              </div>
              {series.slice(0, 5).map((s, si) => {
                const color = s.color || palette[si];
                const v = s.points[hover.i]?.value ?? null;
                const hidden = !!solo && solo !== s.keywordId;
                return (
                  <div key={s.keywordId} className="row" style={{ opacity: hidden ? 0.35 : 1 }}>
                    <span className="dot" style={{ background: color }} />
                    <span>
                      {s.keyword} — <b>{fmtCompact(v)}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>



      </div>
    </section>
  );
}


