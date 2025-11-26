"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Anchor as AnchorIcon,
  Download,
  ChevronDown,
  BadgeCheck,
  Target,
  Crosshair,
  Type as TypeIcon,
  ShieldAlert,
} from "lucide-react";

/**
 * Wranker — Anchor Risk Level Breakdown (Section 4 · Anchor Risk Audit)
 * Stacked horizontal bars by Risk Level (Low/Medium/High/Toxic),
 * segmented by Anchor Type (Branded, Exact, Partial, Generic, Spam/Toxic).
 *
 * ✅ Latest tokens, Inter/Inter Fallback
 * ✅ Branded (#008CCD) icons for section title and anchor types
 * ✅ Pointer cursor on interactive elements
 * ✅ Single smart popover (dot-annotated tooltip). Removed native/basic tooltips.
 * ✅ Clean stacked bars — value text has no background fill
 * ✅ Export button in header (CSV/PNG)
 */

/* -------------------------------- Tokens -------------------------------- */
const TK = {
  brand: "#008CCD",
  pastel: "#D9EEF8",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",

  text: "#111827",
  muted: "#6B7280",

  border: "#E5E7EB",
  borderLight: "#EFF0F6",

  shadowSm: "0 2px 6px rgba(17,24,39,.06)",

  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
} as const;

/* -------------------------------- Types -------------------------------- */
type RiskKey = "Low" | "Medium" | "High" | "Toxic";
type AnchorTypeKey = "Branded" | "Exact Match" | "Partial Match" | "Generic" | "Spam/Toxic";

type Row = {
  risk: RiskKey;
  type: AnchorTypeKey;
  count: number;
  /** Optional previous audit count for Δ% on tooltip */
  prevCount?: number;
};

export type AnchorRiskLevelBreakdownProps = {
  data?: Row[];
  title?: string;
  /** Deep link callback to Section 6 table (risk + type filters) */
  onSegmentClick?: (params: { risk: RiskKey; type: AnchorTypeKey }) => void;
  className?: string;
};

/* --------------------------- Constants & Colors --------------------------- */
const RISK_ORDER: RiskKey[] = ["Low", "Medium", "High", "Toxic"];
const TYPE_ORDER: AnchorTypeKey[] = [
  "Branded",
  "Exact Match",
  "Partial Match",
  "Generic",
  "Spam/Toxic",
];

const TYPE_COLORS: Record<AnchorTypeKey, string> = {
  Branded: TK.brand,
  "Exact Match": "#F87171",
  "Partial Match": "#FBBF24",
  Generic: "#A78BFA",
  "Spam/Toxic": TK.danger,
};

const TYPE_ICON: Record<AnchorTypeKey, React.ReactElement> = {
  Branded: <BadgeCheck className="h-3.5 w-3.5" color={TK.brand} />,
  "Exact Match": <Target className="h-3.5 w-3.5" color={TK.brand} />,
  "Partial Match": <Crosshair className="h-3.5 w-3.5" color={TK.brand} />,
  Generic: <TypeIcon className="h-3.5 w-3.5" color={TK.brand} />,
  "Spam/Toxic": <ShieldAlert className="h-3.5 w-3.5" color={TK.brand} />,
};

/* -------------------------------- Demo -------------------------------- */
const DEMO: Row[] = [
  { risk: "Low", type: "Branded", count: 820, prevCount: 780 },
  { risk: "Low", type: "Generic", count: 290, prevCount: 260 },
  { risk: "Low", type: "Partial Match", count: 110, prevCount: 100 },

  { risk: "Medium", type: "Partial Match", count: 280, prevCount: 260 },
  { risk: "Medium", type: "Branded", count: 160, prevCount: 150 },
  { risk: "Medium", type: "Exact Match", count: 130, prevCount: 120 },
  { risk: "Medium", type: "Generic", count: 60, prevCount: 70 },

  { risk: "High", type: "Exact Match", count: 354, prevCount: 340 },
  { risk: "High", type: "Partial Match", count: 140, prevCount: 150 },
  { risk: "High", type: "Generic", count: 30, prevCount: 40 },
  { risk: "High", type: "Branded", count: 20, prevCount: 22 },

  { risk: "Toxic", type: "Spam/Toxic", count: 210, prevCount: 190 },
  { risk: "Toxic", type: "Exact Match", count: 60, prevCount: 64 },
  { risk: "Toxic", type: "Generic", count: 12, prevCount: 10 },
];

/* -------------------------------- Utils -------------------------------- */
const fmt = (n: number) => n.toLocaleString();
const pctLabel = (p: number, fd = 1) => `${(p * 100).toFixed(fd)}%`;
const deltaPct = (curr?: number, prev?: number) => {
  if (typeof curr !== "number" || typeof prev !== "number" || prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
};

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

/* --------------------------- Export Split Button --------------------------- */
function SplitButton({
  label,
  onPrimary,
  items,
  title,
}: {
  label: string;
  onPrimary: () => void;
  items: { label: string; onClick: () => void }[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={onPrimary}
        title={title}
        className="inline-flex items-center gap-2 rounded-l-full border-y border-l px-3 py-1.5 text-sm hover:bg-gray-50"
        style={{ borderColor: TK.border, cursor: "pointer" }}
      >
        <Download size={16} color={TK.brand} />
        {label}
      </button>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="rounded-r-full border px-2 py-1.5 hover:bg-gray-50"
        style={{ borderColor: TK.border, cursor: "pointer" }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[110%] z-50 min-w-[180px] rounded-md border bg-white p-1 shadow"
          style={{ borderColor: TK.border }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={it.onClick}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-[#F7FAFC]"
              style={{ cursor: "pointer" }}
              role="menuitem"
            >
              <span className="inline-flex items-center gap-2">
                <Download size={14} color={TK.brand} /> {it.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Component ------------------------------- */
export default function AnchorRiskLevelBreakdown({
  data = DEMO,
  title = "Anchor Risk Level Breakdown",
  onSegmentClick,
  className,
}: AnchorRiskLevelBreakdownProps) {
  // Legend ON/OFF
  const [active, setActive] = useState<Record<AnchorTypeKey, boolean>>(() => {
    const init: Record<AnchorTypeKey, boolean> = {
      Branded: true,
      "Exact Match": true,
      "Partial Match": true,
      Generic: true,
      "Spam/Toxic": true,
    };
    data.forEach((d) => (init[d.type] = true));
    return init;
  });

  // Hover state + single smart popover (dot annotation)
  const [hovered, setHovered] = useState<{ risk: RiskKey; type: AnchorTypeKey } | null>(null);
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; node: React.ReactNode }>({
    show: false,
    x: 0,
    y: 0,
    node: null,
  });

  // Matrix + totals (visible aware)
  const matrix = useMemo(() => {
    const base: Record<RiskKey, Record<AnchorTypeKey, { count: number; prev?: any }>> = {
      Low: {} as any,
      Medium: {} as any,
      High: {} as any,
      Toxic: {} as any,
    };

    for (const r of RISK_ORDER) {
      base[r] = {} as any;
      for (const t of TYPE_ORDER) base[r][t] = { count: 0, prev: 0 };
    }

    for (const row of data) {
      base[row.risk][row.type].count += Math.max(0, row.count || 0);
      if (typeof row.prevCount === "number") base[row.risk][row.type].prev += Math.max(0, row.prevCount || 0);
    }

    // Visible total across all risks/types (for % scale)
    let visibleTotal = 0;
    for (const r of RISK_ORDER) {
      for (const t of TYPE_ORDER) if (active[t]) visibleTotal += base[r][t].count;
    }

    // Totals by type (legend)
    const totalByType: Record<AnchorTypeKey, number> = {
      Branded: 0,
      "Exact Match": 0,
      "Partial Match": 0,
      Generic: 0,
      "Spam/Toxic": 0,
    };
    for (const t of TYPE_ORDER) {
      let sum = 0;
      for (const r of RISK_ORDER) sum += base[r][t].count;
      totalByType[t] = sum;
    }

    return { base, visibleTotal, totalByType };
  }, [data, active]);

  // Legend rows (% of visible)
  const legend = useMemo(() => {
    const vis = Math.max(1, matrix.visibleTotal);
    return TYPE_ORDER.map((t) => ({ type: t, count: matrix.totalByType[t], pct: matrix.totalByType[t] / vis }));
  }, [matrix]);

  // Build smart tooltip node (single popover)
  function buildTooltip(risk: RiskKey, type: AnchorTypeKey, count: number, pct: number, prev?: number) {
    const d = deltaPct(count, prev);
    return (
      <div
        className="rounded-md border bg-white px-3 py-2 text-[12px] shadow-md"
        style={{ borderColor: TK.border, maxWidth: 280 }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded" style={{ background: TYPE_COLORS[type] }} />
          <span className="font-medium" style={{ color: TK.text }}>
            {risk} · {type}
          </span>
        </div>
        <div className="text-[12px]" style={{ color: TK.text }}>
          {fmt(count)} backlinks ({pctLabel(pct)})
        </div>
        {typeof d === "number" && (
          <div className="mt-1 text-[12px]" style={{ color: d >= 0 ? "#059669" : "#DC2626" }}>
            Change vs last audit: {d >= 0 ? "+" : ""}
            {d.toFixed(1)}%
          </div>
        )}
      </div>
    );
  }

  // Mouse handlers (only one smart popover; no native title attributes)
  const onEnter = (
    e: React.MouseEvent,
    risk: RiskKey,
    type: AnchorTypeKey,
    count: number,
    pct: number,
    prev?: number
  ) => {
    setHovered({ risk, type });
    setTooltip({
      show: true,
      x: e.clientX,
      y: e.clientY,
      node: buildTooltip(risk, type, count, pct, prev),
    });
  };
  const onMove = (e: React.MouseEvent) => setTooltip((t) => ({ ...t, x: e.clientX, y: e.clientY }));
  const onLeave = () => {
    setHovered(null);
    setTooltip((t) => ({ ...t, show: false }));
  };

  // Prevent all-off state
  const allOff = TYPE_ORDER.every((t) => !active[t]);

  /* ---------------------------- Export handlers ---------------------------- */
  // CSV of current view (visible-aware %)
  const exportCSV = () => {
    const rows: string[][] = [["risk", "type", "count", "percent_visible", "prev_count"]];
    for (const risk of RISK_ORDER) {
      for (const type of TYPE_ORDER) {
        if (!active[type]) continue;
        const cell = matrix.base[risk][type];
        const pct = matrix.visibleTotal > 0 ? cell.count / matrix.visibleTotal : 0;
        rows.push([risk, type, String(cell.count), (pct * 100).toFixed(2), String(cell.prev ?? "")]);
      }
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "anchor_risk_breakdown.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // PNG render via Canvas (clean, minimal)
  const exportPNG = () => {
    const pad = 24;
    const rowH = 36;
    const gap = 18;
    const w = 1000;
    const h = pad * 2 + RISK_ORDER.length * rowH + (RISK_ORDER.length - 1) * gap + 40;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = TK.text;
    ctx.font = "600 16px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica Neue, sans-serif";
    ctx.fillText("Anchor Risk Level Breakdown", pad, pad + 2);

    // Grid (0/25/50/75/100)
    const chartX = pad;
    const chartW = w - pad * 2;
    const xAxisY = pad + 24;
    ctx.strokeStyle = TK.borderLight;
    for (const p of [0, 25, 50, 75, 100]) {
      const x = chartX + (chartW * p) / 100;
      ctx.beginPath();
      ctx.moveTo(x, xAxisY + 10);
      ctx.lineTo(x, h - pad - 30);
      ctx.stroke();

      ctx.fillStyle = TK.muted;
      ctx.font = "11px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica Neue, sans-serif";
      ctx.fillText(`${p}%`, x - 10, h - pad - 12);
    }

    // Bars
    let y = xAxisY + 24;
    for (const risk of RISK_ORDER) {
      // label + row %
      // gather visible segments
      const segs = TYPE_ORDER.filter((t) => active[t]).map((t) => {
        const cell = matrix.base[risk][t];
        const pct = matrix.visibleTotal > 0 ? cell.count / matrix.visibleTotal : 0;
        return { type: t as AnchorTypeKey, count: cell.count, prev: cell.prev, pct, color: TYPE_COLORS[t] };
      });

      // row % total
      const rowPct = segs.reduce((s, sgm) => s + sgm.pct, 0);

      ctx.fillStyle = TK.text;
      ctx.font = "500 13px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica Neue, sans-serif";
      ctx.fillText(risk, chartX, y + 13);
      ctx.fillStyle = TK.muted;
      ctx.font = "11px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica Neue, sans-serif";
      ctx.fillText(pctLabel(rowPct), chartX + chartW - 40, y + 13);

      // bar segments
      let x = chartX;
      const barY = y + 18;
      const barH = 16;
      for (const s of segs) {
        const segW = Math.max(0, chartW * s.pct);
        ctx.fillStyle = s.color;
        ctx.fillRect(x, barY, segW, barH);

        // draw text only if enough width
        const label = `${pctLabel(s.pct)} · ${fmt(s.count)}`;
        ctx.font = "600 11px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, Helvetica Neue, sans-serif";
        const tw = ctx.measureText(label).width;
        if (segW >= tw + 12) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(label, x + (segW - tw) / 2, barY + barH - 3);
        }
        x += segW;
      }

      y += rowH + gap - rowH; // effectively row gap
      y += rowH - 36; // align next block
      y += 18;
    }

    const link = document.createElement("a");
    link.download = "anchor_risk_breakdown.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  /* --------------------------------- UI --------------------------------- */
  return (
    <section
      className={cn("w-full overflow-visible rounded-xl border bg-white p-4 sm:p-5 shadow-sm", className)}
      style={{
        borderColor: TK.border,
        boxShadow: TK.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-labelledby="anchor-risk-breakdown-title"
    >
      {/* Header */}
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AnchorIcon className="h-5 w-5" color={TK.brand} />
          <h3 id="anchor-risk-breakdown-title" className="truncate text-[16px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h3>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12px] sm:inline" style={{ color: TK.muted }}>
            Total analyzed:{" "}
            <span className="font-medium" style={{ color: TK.text }}>
              {fmt(matrix.visibleTotal)}
            </span>
          </span>

          {/* Export */}
          <SplitButton
            label="Export"
            onPrimary={exportCSV}
            items={[
              { label: "Export CSV", onClick: exportCSV },
              { label: "Export PNG", onClick: exportPNG },
            ]}
            title="Export breakdown"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(320px,1fr)_minmax(240px,320px)]">
        {/* Bars */}
        <div className="relative">
          {/* Vertical grid lines (0/25/50/75/100) */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full">
            {[0, 25, 50, 75, 100].map((p) => (
              <div
                key={`vline-${p}`}
                className="absolute top-0 h-full border-l"
                style={{ left: `${p}%`, borderColor: TK.borderLight }}
                aria-hidden
              />
            ))}
          </div>

          {/* Risk rows */}
          <div className="space-y-4">
            {RISK_ORDER.map((risk) => {
              const segments = TYPE_ORDER.filter((t) => active[t])
                .map((t) => {
                  const cell = matrix.base[risk][t];
                  const pct = matrix.visibleTotal > 0 ? cell.count / matrix.visibleTotal : 0;
                  return {
                    type: t as AnchorTypeKey,
                    color: TYPE_COLORS[t],
                    count: cell.count,
                    prev: cell.prev,
                    pct,
                  };
                })
                .filter((s) => s.count > 0 || matrix.visibleTotal === 0);

              const rowPct = segments.reduce((s, x) => s + x.pct, 0);
              const allHidden = allOff;

              return (
                <div key={risk} className="relative">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-[13px] font-medium" style={{ color: TK.text }}>
                      {risk}
                    </div>
                    <div className="text-[12px]" style={{ color: TK.muted }}>
                      {pctLabel(rowPct)}
                    </div>
                  </div>

                  <div
                    className="relative flex h-7 w-full overflow-visible rounded-md border"
                    style={{ borderColor: TK.border, background: TK.surface }}
                    onMouseLeave={onLeave}
                    role="img"
                    aria-label={`Risk row ${risk}`}
                  >
                    {allHidden ? (
                      <div className="flex h-full w-full items-center justify-center text-[12px]" style={{ color: TK.muted }}>
                        Toggle at least one category in the legend to view distribution.
                      </div>
                    ) : (
                      segments.map((seg, i) => {
                        const isHovered = hovered?.risk === risk && hovered?.type === seg.type;
                        const widthPct = Math.max(0, seg.pct * 100);
                        const showInline = seg.pct >= 0.1; // show text if >= 10%

                        return (
                          <div
                            key={`${risk}-${seg.type}-${i}`}
                            className="relative h-full"
                            style={{
                              width: `${widthPct}%`,
                              background: seg.color,
                              transition: "transform 140ms ease, opacity 140ms ease, box-shadow 140ms ease",
                              transform: isHovered ? "translateY(-1px) scaleY(1.06)" : "none",
                              boxShadow: isHovered ? "0 2px 6px rgba(0,0,0,.12)" : "none",
                              opacity: isHovered ? 0.85 : 1,
                              borderTopLeftRadius: i === 0 ? 6 : 0,
                              borderBottomLeftRadius: i === 0 ? 6 : 0,
                              borderTopRightRadius: i === segments.length - 1 ? 6 : 0,
                              borderBottomRightRadius: i === segments.length - 1 ? 6 : 0,
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => onEnter(e, risk, seg.type, seg.count, seg.pct, seg.prev)}
                            onMouseMove={onMove}
                            onClick={() => onSegmentClick?.({ risk, type: seg.type })}
                            role="button"
                            aria-label={`${risk} · ${seg.type}`}
                          >
                            {/* Clean value text (no background color) */}
                            {showInline && (
                              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <span className="text-[11px] font-semibold text-white">
                                  {pctLabel(seg.pct)} · {fmt(seg.count)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="mt-2 flex justify-between text-[11px]" style={{ color: TK.muted }}>
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>

          {/* Smart Popover (single) */}
          {tooltip.show && (
            <div className="pointer-events-none fixed z-50" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
              {tooltip.node}
            </div>
          )}
        </div>

        {/* Legend (toggle types) */}
        <div className="rounded-lg p-3" style={{ background: TK.subtle }}>
          <div className="mb-2 text-[13px]" style={{ color: TK.muted }}>
            Share by anchor type (visible):
          </div>

          <ul className="flex flex-col gap-2">
            {legend.map(({ type, pct, count }) => {
              const isOn = !!active[type];
              return (
                <li
                  key={type}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-white"
                  onClick={() => {
                    const next = { ...active, [type]: !isOn };
                    if (Object.values(next).some(Boolean)) setActive(next);
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {/* Brand icon + color dot */}
                    {TYPE_ICON[type]}
                    <span
                      className="inline-block h-2 w-2 rounded"
                      style={{ background: TYPE_COLORS[type], opacity: isOn ? 1 : 0.35 }}
                    />
                    <span
                      className="truncate text-[13px] font-medium"
                      style={{ color: TK.text, opacity: isOn ? 1 : 0.6 }}
                    >
                      {type}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 tabular-nums text-[13px]" style={{ color: TK.text, opacity: isOn ? 1 : 0.6 }}>
                    {pctLabel(isOn ? pct : 0)}{" "}
                    <span className="text-[12px]" style={{ color: TK.muted }}>
                      · {fmt(count)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-end text-[12px]" style={{ color: TK.muted }}>
            <button
              className="rounded border px-2 py-1"
              style={{ borderColor: TK.border, color: TK.text, background: "#fff", cursor: "pointer" }}
              onClick={() =>
                setActive({ Branded: true, "Exact Match": true, "Partial Match": true, Generic: true, "Spam/Toxic": true })
              }
              aria-label="Reset legend filters"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
