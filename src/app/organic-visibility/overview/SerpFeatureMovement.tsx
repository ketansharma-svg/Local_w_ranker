"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Download,
  ChevronDown,
  Star,
  HelpCircle,
  SquareStack,
  Video,
  Image as ImageIcon,
  MapPin,
  Newspaper,
} from "lucide-react";

/**
 * Wranker • OVI — Section 6: Top Position Changes — SERP Features
 * Pure SVG grouped bars (no chart lib) + Tailwind.
 *
 * REFINEMENTS (per brief):
 * - Inter, Inter Fallback font stack applied
 * - No emojis anywhere
 * - Branded (#008CCD) icon in section title
 * - SERP feature icons use relevant per-feature colors (as in other designs)
 * - Pointer cursor on all clickable UI
 * - Modular chips + toggle switches consistent with recent designs
 */

type FeatureKey = "FS" | "PAA" | "KP" | "VC" | "IP" | "LP" | "TS" | string;
type ChangeType = "New" | "Lost" | "Now Linked" | "No Longer Linked";

export interface FeatureMovement {
  feature: FeatureKey;
  label: string; // e.g., "Featured Snippet"
  newLinked: number; // gained (linked to domain)
  lostLinked: number; // lost (previously linked)
}

export interface SerpKeywordRow {
  keyword: string;
  feature: FeatureKey;
  changeType: ChangeType; // New | Lost | Now Linked | No Longer Linked
  position?: number | null;
  linkedToDomain: boolean;
  url?: string;
}

interface Props {
  movement?: FeatureMovement[];
  rows?: SerpKeywordRow[];
  onViewAll?: (feature?: FeatureKey) => void;
  title?: string; // defaults to “Top Position Changes — SERP Features”
  dateNote?: string; // e.g., “vs previous period”
}

/* ------------------------------ TOKENS ------------------------------ */
const TOKENS = {
  surface: "var(--wr-surface, #FFFFFF)",
  bgSubtle: "var(--wr-bg-subtle, #F5F7FA)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  brand: "var(--wr-brand, #008CCD)", // updated brand
  success: "var(--wr-success, #2ECC71)",
  danger: "var(--wr-danger, #FF6B6B)",
  radius: "var(--wr-radius-lg, 16px)",
  shadowSm: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
};

/* ---------------------- Per-feature color mapping ---------------------- */
const FEATURE_COLOR: Record<string, string> = {
  FS: "#34D399", // Featured Snippet — emerald
  PAA: "#3B82F6", // People Also Ask — blue
  KP: "#14B8A6", // Knowledge Panel — teal
  VC: "#8B5CF6", // Video Carousel — purple
  IP: "#F59E0B", // Image Pack — amber
  LP: "#FACC15", // Local Pack — yellow
  TS: "#EF4444", // Top Stories — red
};

/* --------------------------- Demo dataset --------------------------- */
const DEMO_MOVEMENT: FeatureMovement[] = [
  { feature: "FS", label: "Featured Snippet", newLinked: 18, lostLinked: 7 },
  { feature: "PAA", label: "People Also Ask", newLinked: 26, lostLinked: 10 },
  { feature: "KP", label: "Knowledge Panel", newLinked: 3, lostLinked: 1 },
  { feature: "VC", label: "Video Carousel", newLinked: 12, lostLinked: 5 },
  { feature: "IP", label: "Image Pack", newLinked: 9, lostLinked: 4 },
  { feature: "LP", label: "Local Pack", newLinked: 7, lostLinked: 6 },
  { feature: "TS", label: "Top Stories", newLinked: 4, lostLinked: 3 },
];

const DEMO_ROWS: SerpKeywordRow[] = [
  { keyword: "seo checklist", feature: "PAA", changeType: "Now Linked", position: 7, linkedToDomain: true, url: "/blog/seo-checklist" },
  { keyword: "wranker pricing", feature: "KP", changeType: "New", position: 2, linkedToDomain: true, url: "/pricing" },
  { keyword: "best seo tool", feature: "FS", changeType: "No Longer Linked", position: 5, linkedToDomain: false, url: "/comparison" },
  { keyword: "page speed tips", feature: "IP", changeType: "Now Linked", position: 9, linkedToDomain: true, url: "/blog/page-speed" },
  { keyword: "how to create faq", feature: "PAA", changeType: "New", position: 11, linkedToDomain: true, url: "/blog/faqs" },
  { keyword: "schema markup guide", feature: "FS", changeType: "Lost", position: null, linkedToDomain: false, url: "/blog/schema-guide" },
  { keyword: "best seo audit service", feature: "VC", changeType: "New", position: 10, linkedToDomain: true, url: "/services/audit" },
  { keyword: "breaking seo news", feature: "TS", changeType: "Lost", position: null, linkedToDomain: false, url: "/news" },
  { keyword: "local seo expert", feature: "LP", changeType: "Now Linked", position: 3, linkedToDomain: true, url: "/local-seo" },
  { keyword: "brand panel wranker", feature: "KP", changeType: "No Longer Linked", position: 1, linkedToDomain: false, url: "/brand" },
];

/* --------------------------- UI primitives --------------------------- */

function Chip({
  active,
  label,
  count,
  icon,
  dotColor,
  onClick,
  title,
}: {
  active?: boolean;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  dotColor?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition cursor-pointer ${
        active ? "bg-[#D2EFFF] text-[#0C69B2] border-transparent" : "bg-white text-[var(--wr-text,#111827)]"
      }`}
      style={{ borderColor: TOKENS.border }}
    >
      {icon ? icon : dotColor ? <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} /> : null}
      <span className={active ? "font-medium" : "font-normal"}>{label}</span>
      {typeof count === "number" ? (
        <span className="rounded bg-[var(--wr-bg-subtle,#F5F7FA)] px-1.5 py-[2px] text-[12px]">{count}</span>
      ) : null}
    </button>
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
      title={title || label}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TOKENS.border, color: active ? TOKENS.text : TOKENS.muted }}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{ borderColor: active ? TOKENS.brand : TOKENS.border, background: active ? "rgba(0,140,205,0.15)" : TOKENS.bgSubtle }}
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{ background: active ? TOKENS.brand : "#CBD5E1", transform: active ? "translateX(20px)" : "translateX(2px)" }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

/* ----------------------- Feature Icon (colored) ----------------------- */

function FeatureIcon({ feature, size = 14 }: { feature: FeatureKey; size?: number }) {
  const color = FEATURE_COLOR[feature] ?? TOKENS.brand;
  switch (feature) {
    case "FS":
      return <Star className="shrink-0" size={size} color={color} />;
    case "PAA":
      return <HelpCircle className="shrink-0" size={size} color={color} />;
    case "KP":
      return <SquareStack className="shrink-0" size={size} color={color} />;
    case "VC":
      return <Video className="shrink-0" size={size} color={color} />;
    case "IP":
      return <ImageIcon className="shrink-0" size={size} color={color} />;
    case "LP":
      return <MapPin className="shrink-0" size={size} color={color} />;
    case "TS":
      return <Newspaper className="shrink-0" size={size} color={color} />;
    default:
      return <SquareStack className="shrink-0" size={size} color={color} />;
  }
}

/* ------------------------------- Helpers ------------------------------ */

function getCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)?.trim();
  return v || fallback;
}
function formatInt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

/* ================================ MAIN ================================ */

export default function OVI_SerpFeatureMovement({
  movement = DEMO_MOVEMENT,
  rows = DEMO_ROWS,
  onViewAll,
  title = "Top Position Changes — SERP Features",
  dateNote = "vs previous period",
}: Props) {
  // State
  const [activeFeature, setActiveFeature] = useState<FeatureKey | "ALL">("ALL");
  const [showNew, setShowNew] = useState(true);
  const [showLost, setShowLost] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  // Tooltip
  const [tt, setTt] = useState<{ show: boolean; x: number; y: number; html: string }>({ show: false, x: 0, y: 0, html: "" });

  // Derived
  const categories = movement.map((m) => m.feature);
  const maxValue = useMemo(() => {
    const vals = movement.flatMap((m) => [m.newLinked, m.lostLinked]);
    return Math.max(1, ...vals);
  }, [movement]);

  const filteredRows = useMemo(() => {
    const pool = activeFeature === "ALL" ? rows : rows.filter((r) => r.feature === activeFeature);
    const score = (r: SerpKeywordRow) =>
      (r.changeType === "Now Linked" ? 3 : r.changeType === "New" ? 2 : r.changeType === "No Longer Linked" ? 1 : 0) * 1000 +
      (r.position ? 101 - Math.min(r.position, 100) : 0);
    return [...pool].sort((a, b) => score(b) - score(a)).slice(0, 5);
  }, [rows, activeFeature]);

  // Layout
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState<number>(760);
  const height = 240;

  useEffect(() => {
    if (!chartRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(560, e.contentRect.width);
        setWidth(w);
      }
    });
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, []);

  // Bars geometry
  const margin = { top: 16, right: 16, bottom: 54, left: 40 };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
  const groupCount = categories.length;
  const groupWidth = Math.max(60, Math.min(140, Math.floor(innerW / Math.max(groupCount, 1))));
  const gap = Math.min(24, Math.max(12, Math.floor(groupWidth * 0.25)));
  const barWidth = Math.floor((groupWidth - gap) / 2);
  const xForGroup = (i: number) => margin.left + i * groupWidth + groupWidth / 2;

  const yScale = (v: number) => innerH - (v / maxValue) * innerH + margin.top;

  const colorNew = getCssVar("--wr-success", "#2ECC71");
  const colorLost = getCssVar("--wr-danger", "#FF6B6B");

  // Tooltip handlers
  function showTooltip(e: React.MouseEvent, m: FeatureMovement, kind: "new" | "lost") {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const rootRect = (chartRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }) as DOMRect;
    const x = rect.left - rootRect.left + rect.width / 2;
    const y = rect.top - rootRect.top - 8;

    const html = `
      <div style="font-weight:600;margin-bottom:4px">${m.label}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${kind === "new" ? colorNew : colorLost}"></span>
        <span>${kind === "new" ? "New (linked)" : "Lost (linked)"}:</span>
        <b style="margin-left:4px">${kind === "new" ? m.newLinked : m.lostLinked}</b>
      </div>
    `;
    setTt({ show: true, x, y, html });
  }
  function hideTooltip() {
    setTt((s) => ({ ...s, show: false }));
  }

  const featureLabel = (k: FeatureKey) => movement.find((m) => m.feature === k)?.label ?? String(k);

  const activeCaptionNode =
    activeFeature === "ALL" ? (
      "All Features"
    ) : (
      <span className="inline-flex items-center gap-1.5">
        <FeatureIcon feature={activeFeature} />
        <span>{featureLabel(activeFeature)}</span>
      </span>
    );

  // Export PNG
  function exportPNG() {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.viewBox.baseVal.width || svg.clientWidth;
      canvas.height = svg.viewBox.baseVal.height || svg.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const png = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = png;
      a.download = "serp-feature-movement.png";
      a.click();
    };
    img.src = url;
    setExportOpen(false);
  }

  // Export CSV
  function exportCSV() {
    const head = ["feature_key", "feature_label", "new_linked", "lost_linked"];
    const data = movement.map((m) => [m.feature, m.label, String(m.newLinked), String(m.lostLinked)]);
    const csv = [head, ...data].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "serp-feature-movement.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <section
      className="w-full rounded-xl border bg-white p-4 sm:p-5 mt-4"
      style={{
        borderColor: TOKENS.border,
        background: TOKENS.surface,
        boxShadow: TOKENS.shadowSm,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-5 w-5" color={TOKENS.brand} aria-hidden="true" />
          <h3 className="truncate text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </h3>
          <span className="hidden text-xs text-[var(--wr-muted,#6B7280)] sm:inline">{dateNote}</span>
        </div>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setExportOpen((s) => !s)}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text, background: "#fff" }}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            title="Export"
          >
            <Download className="h-4 w-4" color={TOKENS.brand} />
            Export
            <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
          </button>
          {exportOpen && (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white shadow-md"
              style={{ borderColor: TOKENS.border }}
            >
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={exportPNG}
                title="Export PNG"
              >
                PNG (Chart)
              </button>
              <button
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={exportCSV}
                title="Export CSV"
              >
                CSV (Data)
              </button>
              <button
                disabled
                title="Upgrade to export PDF"
                className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-gray-400"
              >
                PDF (Pro)
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Divider */}
      <div className="my-3 border-t" style={{ borderColor: TOKENS.borderLight }} />

      {/* Controls: toggles + feature chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToggleSwitch label="New (linked)" active={showNew} onClick={() => setShowNew((v) => !v)} />
        <ToggleSwitch label="Lost (linked)" active={showLost} onClick={() => setShowLost((v) => !v)} />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Chip
            active={activeFeature === "ALL"}
            onClick={() => setActiveFeature("ALL")}
            label="All Features"
            title="Show all features"
          />
          {movement.map((m) => (
            <Chip
              key={m.feature}
              active={activeFeature === m.feature}
              onClick={() => setActiveFeature(m.feature)}
              label={m.feature}
              icon={<FeatureIcon feature={m.feature} />}
              title={m.label}
            />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="relative w-full overflow-x-auto rounded-lg border p-3" style={{ borderColor: TOKENS.border }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="SERP feature movement chart"
        >
          {/* axes */}
          <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke={TOKENS.borderLight} />
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} stroke={TOKENS.borderLight} />

          {/* y ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const yy = margin.top + (1 - t) * innerH;
            const label = Math.round(t * maxValue);
            return (
              <g key={i}>
                <line x1={margin.left} x2={width - margin.right} y1={yy} y2={yy} stroke={i === 0 ? TOKENS.borderLight : "#F7F7FB"} />
                <text x={margin.left - 8} y={yy + 4} textAnchor="end" fontSize="11" fill="#6B7280">
                  {label}
                </text>
              </g>
            );
          })}

          {/* bars & labels */}
          {movement.map((m, i) => {
            const cx = xForGroup(i);
            const baseY = margin.top + innerH;

            const newH = (m.newLinked / maxValue) * innerH;
            const lostH = (m.lostLinked / maxValue) * innerH;

            const newX = cx - gap / 2 - barWidth;
            const lostX = cx + gap / 2;
            const newY = baseY - newH;
            const lostY = baseY - lostH;
            const fw = Math.max(1, barWidth);
            const radius = 6;

            return (
              <g key={m.feature}>
                {/* X labels */}
                <text x={cx} y={height - margin.bottom + 14} textAnchor="middle" fontSize="12" fill="#374151">
                  {m.feature}
                </text>
                {/* color dot (per-feature) under label (no emoji) */}
                <circle cx={cx} cy={height - margin.bottom + 28} r={4} fill={FEATURE_COLOR[m.feature] ?? TOKENS.brand} />

                {/* New bar */}
                {showNew && (
                  <RoundedBar
                    x={newX}
                    y={newY}
                    w={fw}
                    h={newH}
                    fill={colorNew}
                    onMouseEnter={(e) => showTooltip(e, m, "new")}
                    onMouseLeave={hideTooltip}
                    onClick={() => setActiveFeature(m.feature)}
                    radius={radius}
                    title={`New (linked): ${m.newLinked}`}
                  />
                )}

                {/* Lost bar */}
                {showLost && (
                  <RoundedBar
                    x={lostX}
                    y={lostY}
                    w={fw}
                    h={lostH}
                    fill={colorLost}
                    onMouseEnter={(e) => showTooltip(e, m, "lost")}
                    onMouseLeave={hideTooltip}
                    onClick={() => setActiveFeature(m.feature)}
                    radius={radius}
                    title={`Lost (linked): ${m.lostLinked}`}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tt.show && (
          <div
            className="pointer-events-none absolute z-20 rounded-md px-2 py-1 text-xs text-white shadow"
            style={{
              left: Math.max(8, Math.min(tt.x, (chartRef.current?.clientWidth ?? 0) - 160)),
              top: Math.max(8, tt.y - 34),
              background: "rgba(17,24,39,.95)",
              maxWidth: 240,
            }}
            dangerouslySetInnerHTML={{ __html: tt.html }}
          />
        )}
      </div>

      {/* Table */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[14px] font-semibold" style={{ color: TOKENS.text }}>
            Top Keywords — <span className="text-[var(--wr-muted,#6B7280)]">{activeCaptionNode}</span>
          </h4>
          <button
            className="text-[13px] font-medium text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer"
            onClick={() => onViewAll?.(activeFeature === "ALL" ? undefined : activeFeature)}
            title="Open full SERP feature report"
          >
            View All SERP Feature Keywords
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: TOKENS.border }}>
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--wr-bg-subtle,#F5F7FA)]">
              <tr className="text-[12px] text-[var(--wr-muted,#6B7280)]">
                <th className="px-3 py-2 font-medium">Keyword</th>
                <th className="px-3 py-2 font-medium">SERP Feature</th>
                <th className="px-3 py-2 font-medium">Change Type</th>
                <th className="px-3 py-2 font-medium">Position</th>
                <th className="px-3 py-2 font-medium">Linked?</th>
                <th className="px-3 py-2 font-medium">Page</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={r.keyword + i} className="border-t hover:bg-gray-50" style={{ borderColor: TOKENS.borderLight }}>
                  <td className="px-3 py-2 font-medium text-[var(--wr-text,#111827)]">{r.keyword}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-xs"
                      style={{ borderColor: TOKENS.border, color: FEATURE_COLOR[r.feature] ?? TOKENS.brand }}
                      title={featureLabel(r.feature)}
                    >
                      <FeatureIcon feature={r.feature} />
                      <span className="font-medium">{r.feature}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <ChangeBadge type={r.changeType} />
                  </td>
                  <td className="px-3 py-2">{formatInt(r.position ?? null)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-[2px] text-xs ${
                        r.linkedToDomain ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {r.linkedToDomain ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.url ? (
                      <a className="max-w-[280px] truncate text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer" href={r.url} title={r.url}>
                        {r.url}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-[var(--wr-muted,#6B7280)]">
                    Nothing to show for the selected feature.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** Rounded bar shape with only top corners rounded */
function RoundedBar({
  x,
  y,
  w,
  h,
  fill,
  radius = 6,
  onMouseEnter,
  onMouseLeave,
  onClick,
  title,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  radius?: number;
  onMouseEnter?: (e: React.MouseEvent<SVGPathElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<SVGPathElement>) => void;
  onClick?: () => void;
  title?: string;
}) {
  const r = Math.min(radius, h);
  const d = `
    M ${x} ${y + h}
    L ${x} ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    L ${x + w - r} ${y}
    Q ${x + w} ${y} ${x + w} ${y + r}
    L ${x + w} ${y + h}
    Z
  `;
  return (
    <path
      d={d}
      fill={fill}
      opacity={0.9}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", transition: "opacity 120ms ease" }}
    >
      {title ? <title>{title}</title> : null}
    </path>
  );
}

function ChangeBadge({ type }: { type: ChangeType }) {
  const map: Record<ChangeType, { cls: string; label: string }> = {
    New: { cls: "bg-emerald-50 text-emerald-700", label: "New" },
    Lost: { cls: "bg-rose-50 text-rose-700", label: "Lost" },
    "Now Linked": { cls: "bg-emerald-50 text-emerald-700", label: "Now Linked" },
    "No Longer Linked": { cls: "bg-amber-50 text-amber-800", label: "No Longer Linked" },
  };
  const m = map[type] ?? map["New"];
  return <span className={`rounded-full px-2 py-[2px] text-xs ${m.cls}`}>{m.label}</span>;
}
