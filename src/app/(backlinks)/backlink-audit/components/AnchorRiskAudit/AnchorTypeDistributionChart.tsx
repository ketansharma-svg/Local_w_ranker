import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link as LinkIcon,
  Download,
  ChevronDown,
  BadgeCheck,
  Target,
  Crosshair,
  Type as TypeIcon,
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

/**
 * Wranker – Backlink Audit / Anchor Risk Audit
 * SECTION 3: Anchor Type Distribution (Classic Pie)
 *
 * ✅ Keep existing smart popover (tooltip) and hover behavior unchanged.
 * ✅ Use Inter/Inter Fallback, branded (#008CCD) icons, modern chips/CTA.
 * ✅ Export button in header (CSV/PNG).
 * ✅ Use left half of the panel (responsive width).
 * ✅ Legend has NO border lines.
 * ✅ Pointer cursor on clickable elements.
 */

/* ------------------------------ Tokens (aligned with recent designs) ------------------------------ */
const TK = {
  brand: "#008CCD",
  pastel: "#D9EEF8",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  shadowSm: "0 2px 6px rgba(0,0,0,.06)",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
} as const;

/* ------------------------------ Types ------------------------------ */
export type AnchorTypeKey =
  | "Branded"
  | "Exact Match"
  | "Partial Match"
  | "Generic"
  | "Spam/Toxic";

export type SliceDatum = {
  type: AnchorTypeKey;
  count: number;     // backlinks (or unique RDs) in this anchor category
  sample?: string;   // sample anchor text for tooltip
  changePct?: number;
};

/* ------------------------------ Palette ------------------------------ */
const ORDER: AnchorTypeKey[] = [
  "Branded",
  "Exact Match",
  "Partial Match",
  "Generic",
  "Spam/Toxic",
];

const COLORS: Record<AnchorTypeKey, string> = {
  Branded: TK.brand,
  "Exact Match": "#F87171",
  "Partial Match": "#FBBF24",
  Generic: "#A78BFA",
  "Spam/Toxic": TK.danger,
};

const TYPE_ICON= {
  Branded: <BadgeCheck className="h-3.5 w-3.5" color={TK.brand} />,
  "Exact Match": <Target className="h-3.5 w-3.5" color={TK.brand} />,
  "Partial Match": <Crosshair className="h-3.5 w-3.5" color={TK.brand} />,
  Generic: <TypeIcon className="h-3.5 w-3.5" color={TK.brand} />,
  "Spam/Toxic": <ShieldAlert className="h-3.5 w-3.5" color={TK.brand} />,
};

/* --------------------------- Demo / Defaults --------------------------- */
const DEMO: SliceDatum[] = [
  { type: "Branded", count: 1240, sample: "wranker, wranker seo", changePct: 0.03 },
  { type: "Exact Match", count: 540, sample: "seo company in jaipur", changePct: -0.01 },
  { type: "Partial Match", count: 720, sample: "best seo tools for agencies" },
  { type: "Generic", count: 280, sample: "click here, read more" },
  { type: "Spam/Toxic", count: 96, sample: "buy backlinks, online casino" },
];

/* ------------------------------ Utils ------------------------------ */
const fmt = (n: number) => n.toLocaleString();
const pctLabel = (p: number) => `${(p * 100).toFixed(1)}%`;
const signPct = (p?: number) =>
  typeof p === "number" ? `${p >= 0 ? "+" : ""}${(p * 100).toFixed(0)}%` : undefined;

// Classic pie geometry helpers
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describePieSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

/* ---------------------------- Small UI: Split Export Button ---------------------------- */
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

/* ---------------------------- Component ---------------------------- */
export default function AnchorTypeDistributionClassicPie({
  data = DEMO,
  title = "Anchor Type Distribution",
  onSliceClick,
  className,
}: {
  data?: SliceDatum[];
  title?: string;
  onSliceClick?: (params: { type: AnchorTypeKey }) => void;
  className?: string;
}) {
  const safeData: SliceDatum[] = Array.isArray(data) && data.length ? data : DEMO;

  const cardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 520, h: 280 });
  const [hovered, setHovered] = useState<AnchorTypeKey | null>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  }>({ show: false, x: 0, y: 0, content: null });

  // Legend visibility
  const [visible, setVisible] = useState<Record<AnchorTypeKey, boolean>>({
    Branded: true,
    "Exact Match": true,
    "Partial Match": true,
    Generic: true,
    "Spam/Toxic": true,
  });

  // Resizer
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        const h = Math.min(300, Math.max(240, Math.round(w * 0.52)));
        setSize({ w, h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Normalize to VISIBLE, non-zero items
  const slices = useMemo(() => {
    const prepared = ORDER.map((k) => {
      const d = safeData.find((x) => x.type === k);
      return {
        type: k,
        count: d?.count ?? 0,
        sample: d?.sample,
        changePct: d?.changePct,
      };
    });

    const filtered = prepared.filter((d) => d.count > 0 && visible[d.type]);
    const total = filtered.reduce((s, d) => s + d.count, 0) || 1;
    const items = filtered.map((d) => ({ ...d, pct: d.count / total }));

    const pctByType: Partial<Record<AnchorTypeKey, number>> = {};
    items.forEach((it) => (pctByType[it.type] = it.pct));

    const grand = prepared.reduce((s, d) => s + d.count, 0);

    return { items, pctByType, grand };
  }, [safeData, visible]);

  // Alerts based on FULL set
  const alerts = useMemo(() => {
    const map: Record<AnchorTypeKey, number> = {
      Branded: 0,
      "Exact Match": 0,
      "Partial Match": 0,
      Generic: 0,
      "Spam/Toxic": 0,
    };
    for (const d of safeData) map[d.type] = d.count;
    const sum = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    const exactPct = map["Exact Match"] / sum;
    const brandGenericPct = (map["Branded"] + map["Generic"]) / sum;
    return { exactPct, brandGenericPct, sum };
  }, [safeData]);

  // Pie geometry
  const { cx, cy, r } = useMemo(() => {
    const w = size.w;
    const h = size.h;
    const pad = 12;
    const radius = Math.min(w * 0.32, h * 0.42);
    return {
      cx: Math.round(w * 0.38),
      cy: Math.round(h * 0.52),
      r: Math.max(40, Math.round(radius) - pad),
    };
  }, [size]);

  // Tooltip builder (SMART POPOVER — unchanged)
  function buildTooltip(payload: {
    type: AnchorTypeKey;
    count: number;
    pct?: number;
    sample?: string;
    changePct?: number;
  }) {
    return (
      <div
        className="rounded-md border bg-white px-3 py-2 text-[12px] shadow-md"
        style={{ borderColor: TK.border, maxWidth: 260 }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded" style={{ background: COLORS[payload.type] }} />
          <span className="font-medium" style={{ color: TK.text }}>{payload.type}</span>
          {typeof payload.changePct === "number" && (
            <span
              className="ml-1 rounded-sm px-1 py-0.5 text-[11px]"
              style={{ background: "#F3F4F6", color: "#4B5563" }}
            >
              {signPct(payload.changePct)}
            </span>
          )}
        </div>
        <div className="text-[12px]" style={{ color: TK.text }}>
          {fmt(payload.count)}
          {typeof payload.pct === "number" && <> backlinks ({pctLabel(payload.pct)})</>}
        </div>
        {!!payload.sample && (
          <div className="mt-1 text-[12px]" style={{ color: TK.muted }}>
            e.g., <span className="italic">{payload.sample}</span>
          </div>
        )}
      </div>
    );
  }

  // Hover handlers (unchanged behavior)
  const onSliceEnter = (key: AnchorTypeKey, evt: React.MouseEvent, payload: any) => {
    setHovered(key);
    setTooltip({ show: true, x: evt.clientX, y: evt.clientY, content: buildTooltip(payload) });
  };
  const onSliceMove = (evt: React.MouseEvent) =>
    setTooltip((t) => ({ ...t, x: evt.clientX, y: evt.clientY }));
  const onSliceLeave = () => {
    setHovered(null);
    setTooltip((t) => ({ ...t, show: false }));
  };

  const toggleType = (t: AnchorTypeKey) => setVisible((v) => ({ ...v, [t]: !v[t] }));

  /* ---------------------------- Export handlers ---------------------------- */
  const exportCSV = () => {
    const rows = [
      ["anchor_type", "count", "pct_visible"],
      ...ORDER.map((t) => {
        const raw = safeData.find((x) => x.type === t);
        const pct = slices.pctByType[t];
        return [t, String(raw?.count ?? 0), typeof pct === "number" ? (pct * 100).toFixed(2) : ""];
      }),
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "anchor_type_distribution.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportPNG = async () => {
    // Export only the pie SVG
    const svg = svgRef.current;
    if (!svg) return alert("Chart not ready for export.");
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    const svg64 = btoa(unescape(encodeURIComponent(source)));
    const image64 = "data:image/svg+xml;base64," + svg64;
    const img = new Image();
    const bbox = svg.getBoundingClientRect();
    const width = Math.max(680, Math.round(bbox.width));
    const height = Math.max(320, Math.round(bbox.height));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const link = document.createElement("a");
      link.download = "anchor_type_distribution.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = image64;
  };

  /* ------------------------------- UI ------------------------------- */
  return (
    <section
      ref={cardRef}
      className={`w-full rounded-xl border bg-white p-4 sm:p-5 shadow-sm ${className ?? ""}`}
      style={{
        borderColor: TK.border,
        boxShadow: TK.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <LinkIcon className="h-5 w-5" color={TK.brand} />
          <h3 className="truncate text-[16px] font-semibold" style={{ color: TK.text }}>
            {title}
          </h3>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12px] sm:inline" style={{ color: TK.muted }}>
            Total analyzed:{" "}
            <span className="font-medium" style={{ color: TK.text }}>
              {fmt(alerts.sum)}
            </span>
          </span>
          {/* Export button (header, right) */}
          <SplitButton
            label="Export"
            onPrimary={exportCSV}
            items={[
              { label: "Export CSV", onClick: exportCSV },
              { label: "Export PNG", onClick: exportPNG },
            ]}
            title="Export distribution"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[minmax(280px,1fr)_minmax(220px,340px)]">
        {/* Chart (left) */}
        <div className="relative overflow-visible">
          {slices.items.length === 0 ? (
            <div
              className="flex h-[240px] items-center justify-center rounded-lg border text-sm"
              style={{ borderColor: TK.borderLight, color: TK.muted }}
            >
              No categories visible — toggle types from the legend.
            </div>
          ) : (
            <svg
              ref={svgRef}
              role="img"
              aria-label="Anchor type distribution pie chart"
              width="100%"
              height={size.h}
              viewBox={`0 0 ${size.w} ${size.h}`}
              className="block overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={onSliceLeave}
            >
              {/* Pie slices (hover effect unchanged; only hovered slice dimmed) */}
              {(() => {
                let startAngle = 0;
                return slices.items.map((d) => {
                  const sweep = d.pct * 360;
                  const endAngle = startAngle + sweep;
                  const path = describePieSlice(cx, cy, r, startAngle, endAngle);
                  const key = d.type as AnchorTypeKey;
                  const isHovered = hovered === key;
                  const raw = safeData.find((x) => x.type === key);

                  const payload = {
                    type: key,
                    count: raw?.count ?? 0,
                    pct: d.pct,
                    sample: raw?.sample,
                    changePct: raw?.changePct,
                  };

                  const node = (
                    <path
                      key={key}
                      d={path}
                      fill={COLORS[key]}
                      opacity={isHovered ? 0.45 : 1}
                      style={{ transition: "opacity 140ms ease, transform 140ms ease" }}
                      onMouseEnter={(e) => onSliceEnter(key, e, payload)}
                      onMouseMove={onSliceMove}
                      onClick={() => onSliceClick?.({ type: key })}
                      cursor={onSliceClick ? "pointer" : "default"}
                    />
                  );
                  startAngle = endAngle;
                  return node;
                });
              })()}
            </svg>
          )}

          {/* Tooltip (smart popover — unchanged) */}
          {tooltip.show && (
            <div className="pointer-events-none fixed z-[60]" style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
              {tooltip.content}
            </div>
          )}
        </div>

        {/* Legend (NO border lines) */}
        <div className="rounded-lg p-3" style={{ background: TK.subtle }}>
          <div className="mb-2 text-[13px]" style={{ color: TK.muted }}>
            Share of anchors by type (visible):
          </div>
          <ul className="flex flex-col gap-2">
            {ORDER.map((t) => {
              const raw = safeData.find((x) => x.type === t);
              if (!raw || raw.count <= 0) return null;

              const enabled = visible[t];
              const pct = slices.pctByType[t];
              const payload = {
                type: t,
                count: raw.count,
                pct,
                sample: raw.sample,
                changePct: raw.changePct,
              };

              return (
                <li
                  key={t}
                  className="flex items-center justify-between rounded-md px-2 py-1"
                  style={{ opacity: enabled ? 1 : 0.45 }}
                  onMouseEnter={(e) => {
                    setHovered(t);
                    setTooltip({
                      show: true,
                      x: (e as any).clientX,
                      y: (e as any).clientY,
                      content: buildTooltip(payload),
                    });
                  }}
                  onMouseMove={(e) =>
                    setTooltip((tt) => ({ ...tt, x: (e as any).clientX, y: (e as any).clientY }))
                  }
                  onMouseLeave={onSliceLeave}
                >
                  <button
                    type="button"
                    onClick={() => toggleType(t)}
                    className="group flex min-w-0 items-center gap-2"
                    style={{ cursor: "pointer" }}
                    title={enabled ? "Hide from chart" : "Show in chart"}
                  >
                    {/* Brand icon + color swatch */}
                    {TYPE_ICON[t]}
                    <span className="inline-block h-2 w-2 rounded" style={{ background: COLORS[t] }} />
                    <span
                      className="truncate text-[13px] font-medium"
                      style={{ color: TK.text, textDecoration: enabled ? "none" : "line-through" }}
                    >
                      {t}
                    </span>
                  </button>
                  <div className="ml-3 shrink-0 tabular-nums text-[13px]" style={{ color: TK.text }}>
                    {typeof pct === "number" ? (
                      <>
                        {pctLabel(pct)}{" "}
                        <span className="text-[12px]" style={{ color: TK.muted }}>
                          · {fmt(raw.count)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[12px]" style={{ color: TK.muted }}>
                        hidden · {fmt(raw.count)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {/* foot note without border line */}
          <div className="mt-3 text-[12px]" style={{ color: TK.muted }}>
            Hover to inspect. Click a slice to drill down in Anchors Audit.
          </div>
        </div>
      </div>

      {/* Alerts (no emoji; branded iconography) */}
      <div className="mt-3 space-y-2">
        {alerts.exactPct > 0.25 && (
          <div
            className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
            style={{ borderColor: "#FEE2E2", background: "#FFF7F7", color: "#991B1B" }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p>
              High use of <b>Exact Match</b> anchors ({(alerts.exactPct * 100).toFixed(1)}%). Diversify with branded /
              generic anchors.
            </p>
          </div>
        )}
        {alerts.brandGenericPct < 0.3 && (
          <div
            className="flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]"
            style={{ borderColor: "#FEF3C7", background: "#FFFBEB", color: "#7C2D12" }}
          >
            <Lightbulb className="mt-0.5 h-4 w-4" />
            <p>
              <b>Branded + Generic</b> anchors are below 30% ({(alerts.brandGenericPct * 100).toFixed(1)}%). Consider
              increasing safe anchor usage.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
