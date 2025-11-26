"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Anchor as AnchorIcon,
  Info,
  Download,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

/**
 * Wranker – Anchors Tab (Section: Anchor Types Distribution)
 * - Inter / Inter Fallback font
 * - Branded section header with icon
 * - Modular Buttons / Filter Chips / Legend chips
 * - Stacked bars with motion-safe "pop" hover + popover
 * - Competitor bar uses the same interaction + popover
 * - Duplicate vertical legend text removed
 */

/* ----------------------------- TOKENS / THEME ----------------------------- */

const TOKENS = {
  // core (aligned with your other sections)
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",

  // popover background (brand pastel surface used elsewhere)
  popoverBg: "#FAFCFE",
} as const;

/* ------------------------------ DEMO DATA --------------------------------- */

type AnchorTypeKey =
  | "exact_match"
  | "phrase_match"
  | "partial_match"
  | "branded"
  | "generic"
  | "image_only";

type AnchorDatum = {
  type: AnchorTypeKey | string;
  label?: string;
  pct: number; // 0..100
  count?: number;
  examples?: string[];
};

const demoAll = {
  totalAnchors: 45678,
  distribution: [
    { type: "exact_match", label: "Exact Match", count: 12345, pct: 27.0, examples: ["seo tools", "seo guide"] },
    { type: "phrase_match", label: "Phrase Match", count: 8200, pct: 17.95, examples: ["best seo tools"] },
    { type: "partial_match", label: "Partial Match", count: 6800, pct: 14.88, examples: ["optimize site health"] },
    { type: "branded", label: "Branded", count: 5600, pct: 12.27, examples: ["Wranker SEO tool"] },
    { type: "generic", label: "Generic", count: 5800, pct: 12.69, examples: ["click here"] },
    { type: "image_only", label: "Image Only", count: 6233, pct: 13.01, examples: ["<img>"] },
  ] as AnchorDatum[],
};

const demoCompetitor = {
  totalAnchors: 40123,
  distribution: [
    { type: "exact_match", pct: 33.0, count: 13240 },
    { type: "phrase_match", pct: 16.0, count: 6419 },
    { type: "partial_match", pct: 12.0, count: 4815 },
    { type: "branded", pct: 8.0, count: 3210 },
    { type: "generic", pct: 20.0, count: 8024 },
    { type: "image_only", pct: 11.0, count: 4414 },
  ] as AnchorDatum[],
};

/* ------------------------------ MAPPINGS ---------------------------------- */

const TYPE_LABEL: Record<string, string> = {
  exact_match: "Exact Match",
  phrase_match: "Phrase Match",
  partial_match: "Partial Match",
  branded: "Branded",
  generic: "Generic",
  image_only: "Image Only",
};

const TYPE_COLORS: Record<string, string> = {
  exact_match: "#0B63D6", // deep blue
  phrase_match: "#4AA3FF", // sky blue
  partial_match: "#0EA5A6", // teal
  branded: "#6366F1", // indigo
  generic: "#9CA3AF", // muted gray
  image_only: "#FCA5A5", // light red
};

const CATEGORY_COLORS: Record<string, string> = {
  "Commercial Intent": "#0B63D6",
  "Navigational": "#6366F1",
  "Informational": "#0EA5A6",
  "Generic": "#9CA3AF",
};

const ADVANCED_MAP: Record<string, string> = {
  exact_match: "Commercial Intent",
  phrase_match: "Commercial Intent",
  partial_match: "Informational",
  branded: "Navigational",
  generic: "Generic",
  image_only: "Generic",
};

const getLabel = (t: string, fallback?: string) => TYPE_LABEL[t] || fallback || t;
const getColor = (t: string, fallback?: string) =>
  TYPE_COLORS[t] || CATEGORY_COLORS[t] || fallback || TOKENS.muted;

/* ---------------------------- REUSABLE PARTS ------------------------------ */

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }) {
  const { className, icon, children, ...rest } = props;
  return (
    <button
      {...rest}
      className={classNames(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white shadow-sm",
        className
      )}
      style={{ background: TOKENS.valueBlue }}
    >
      {icon}
      {children}
    </button>
  );
}

function ChipSelect<T extends string>({
  value,
  onChange,
  items,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-full border p-0.5 text-xs"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onChange(it.value)}
          aria-pressed={value === it.value}
          className={classNames(
            "rounded-full px-2.5 py-1 transition",
            value === it.value ? "bg-[#F5F7FA] font-semibold" : "text-[color:var(--wr-muted,#6B7280)]"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function LegendChip({
  type,
  pct,
  count,
  color,
  hidden,
  onToggle,
}: {
  type: string;
  pct: number;
  count?: number;
  color: string;
  hidden: boolean;
  onToggle: (type: string, isolate: boolean) => void;
}) {
  const label = getLabel(type);
  return (
    <button
      onClick={(e) => onToggle(type, e.shiftKey)}
      className={classNames(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition",
        hidden && "opacity-40"
      )}
      style={{ borderColor: TOKENS.border }}
      title="Click to toggle • Shift+click to isolate"
      aria-pressed={!hidden}
    >
      <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      <span>{label}</span>
      <span className="text-[13px]" style={{ color: TOKENS.muted }}>
        {pct.toFixed(1)}% · {count ?? Math.round((pct / 100) * demoAll.totalAnchors)}
      </span>
    </button>
  );
}

/* ------------------------------- POPOVER ---------------------------------- */

function Popover({
  x,
  y,
  visible,
  children,
}: {
  x: number;
  y: number;
  visible: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <div
      className="fixed z-[60] max-w-xs rounded-md border p-3 text-xs shadow"
      style={{
        top: y + 12,
        left: x + 12,
        background: TOKENS.popoverBg,
        borderColor: TOKENS.border,
      }}
      role="dialog"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

/* ---------------------------- STACKED BAR (UX) ---------------------------- */

function StackedBar({
  data,
  totalFallback,
  hiddenTypes,
  showPercent,
  onSegmentClick,
  onViewTable,
  ariaLabel,
  label,
}: {
  data: AnchorDatum[];
  totalFallback?: number;
  hiddenTypes: Set<string>;
  showPercent: boolean;
  onSegmentClick: (type: string) => void;
  onViewTable: (type: string) => void;
  ariaLabel?: string;
  label?: string;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: React.ReactNode; visible: boolean }>({
    x: 0,
    y: 0,
    node: null,
    visible: false,
  });
  const [focusIndex, setFocusIndex] = useState(0);
  const prefersReduce =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const visible = data.filter((d) => !hiddenTypes.has(d.type));
  const totalPct = visible.reduce((a, b) => a + b.pct, 0);
  const segments = visible.map((d) => ({
    ...d,
    widthPct: totalPct > 0 ? (d.pct / totalPct) * 100 : 0,
  }));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!segments.length) return;
    if (e.key === "ArrowRight") setFocusIndex((i) => (i + 1) % segments.length);
    else if (e.key === "ArrowLeft") setFocusIndex((i) => (i - 1 + segments.length) % segments.length);
    else if (e.key === "Enter" || e.key === " ") onSegmentClick(segments[focusIndex].type);
  };

  const SRText = (
    <ul className="sr-only" aria-label="Anchor distribution screen reader summary">
      {data.map((d) => (
        <li key={d.type}>
          {getLabel(d.type, d.label)}: {d.pct}% ({d.count ?? Math.round((d.pct / 100) * (totalFallback ?? 0))} links).{" "}
          <button onClick={() => onViewTable(d.type)}>View table</button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="w-full">
      {SRText}
      {label && <div className="mb-1 text-xs" style={{ color: TOKENS.muted }}>{label}</div>}

      <div
        className="relative h-8 w-full overflow-visible rounded border"
        style={{ borderColor: TOKENS.border }}
        role="group"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute inset-0 flex">
          {segments.map((seg, i) => (
            <button
              key={seg.type + (label || "")}
              className="group relative h-full focus:outline-none"
              style={{
                width: `${seg.widthPct}%`,
                background: getColor(seg.type),
                transition: prefersReduce ? "none" : "width 450ms ease",
                // let the "pop" hover escape the bar box
                transformOrigin: "center bottom",
              }}
              aria-label={`${getLabel(seg.type, seg.label)} ${seg.pct}%`}
              onClick={() => onSegmentClick(seg.type)}
              onMouseEnter={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setTooltip({
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                  visible: true,
                  node: (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <AnchorIcon size={14} className="text-[color:var(--wr-value-blue,#0077FF)]" />
                        <div className="font-semibold">{getLabel(seg.type, seg.label)}</div>
                      </div>

                      <div className="text-[12px]" style={{ color: TOKENS.muted }}>
                        <span className="font-medium" style={{ color: TOKENS.text }}>
                          {seg.pct.toFixed(2)}%
                        </span>{" "}
                        of total ·{" "}
                        <span className="font-medium" style={{ color: TOKENS.text }}>
                          {seg.count ?? Math.round((seg.pct / 100) * (totalFallback ?? 0))}
                        </span>{" "}
                        links
                      </div>

                      {seg.examples && seg.examples.length > 0 && (
                        <div className="mt-2">
                          <div className="mb-1 text-[11px] font-medium" style={{ color: TOKENS.muted }}>
                            Top examples
                          </div>
                          <ul className="space-y-1">
                            {seg.examples.slice(0, 3).map((ex, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: getColor(seg.type) }} />
                                <button
                                  className="underline"
                                  onClick={() => onViewTable(seg.type)}
                                  title="Open in table"
                                >
                                  {ex}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ),
                });
              }}
              onMouseMove={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setTooltip((t) => ({ ...t, x: rect.left + rect.width / 2, y: rect.top }));
              }}
              onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
              onFocus={() => setFocusIndex(i)}
              // motion-safe "pop" hover to match other sections
              onMouseOver={(e) => {
                if (prefersReduce) return;
                const el = e.currentTarget;
                el.style.zIndex = "10";
                el.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
                el.style.transform = "translateY(-2px) scaleY(1.08)";
                el.style.transition =
                  "transform 160ms cubic-bezier(.2,.8,.2,1), box-shadow 160ms cubic-bezier(.2,.8,.2,1)";
              }}
              onMouseOut={(e) => {
                if (prefersReduce) return;
                const el = e.currentTarget;
                el.style.zIndex = "auto";
                el.style.boxShadow = "none";
                el.style.transform = "none";
              }}
            >
              {seg.widthPct > 8 && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] font-medium text-white drop-shadow-sm">
                  {showPercent
                    ? `${seg.pct.toFixed(1)}%`
                    : `${seg.count ?? Math.round((seg.pct / 100) * (totalFallback ?? 0))}`}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Popover x={tooltip.x} y={tooltip.y} visible={tooltip.visible}>
        {tooltip.node}
      </Popover>
    </div>
  );
}

/* --------------------------- CSV EXPORT HELPERS --------------------------- */

const toCSV = (projectId: string, scope: string, grouping: string, data: AnchorDatum[], total: number) => {
  const meta = `# projectId,${projectId}\n# scope,${scope}\n# grouping,${grouping}\n# generatedAt,${new Date().toISOString()}\n# columns: type,percent,count,top_examples`;
  const header = "type,percent,count,top_examples";
  const rows = data.map((d) => {
    const examples = (d.examples || []).slice(0, 3).join("; ");
    const label = d.label || getLabel(d.type);
    const count = d.count ?? Math.round((d.pct / 100) * total);
    return `${label},${d.pct},${count},"${examples}"`;
  });
  return [meta, header, ...rows].join("\n");
};

const downloadFile = (filename: string, content: string, mime = "text/csv;charset=utf-8;") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ------------------------------- MAIN VIEW -------------------------------- */

export default function AnchorTypesDistribution(props?: {
  distributionOverride?: { total: number; rows: { type: string; label: string; pct: number; count: number }[] };
}) {
  // controls
  const [grouping, setGrouping] = useState<"basic" | "advanced">("basic");
  const [competitor, setCompetitor] = useState<string | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [showPercent, setShowPercent] = useState(true);

  // data
  const baseData = props?.distributionOverride
    ? props.distributionOverride.rows.map(r => ({
        type: r.type === "image" || r.type === "empty" ? "image_only" : r.type,
        label: r.label,
        pct: r.pct,
        count: r.count,
      }))
    : demoAll.distribution;
    
  const advancedData = useMemo(() => {
    const grouped: Record<string, { type: string; label: string; pct: number; count: number }> = {};
    baseData.forEach((d) => {
      const cat = ADVANCED_MAP[d.type] || "Other";
      if (!grouped[cat]) grouped[cat] = { type: cat, label: cat, pct: 0, count: 0 };
      grouped[cat].pct += d.pct;
      grouped[cat].count += d.count || Math.round((d.pct / 100) * demoAll.totalAnchors);
    });
    const order = ["Commercial Intent", "Navigational", "Informational", "Generic"];
    return order.filter((k) => grouped[k]).map((k) => grouped[k]);
  }, [baseData]);

  const competitorData = useMemo<AnchorDatum[] | null>(() => {
    if (!competitor) return null;
    return demoCompetitor.distribution.map((c) => ({
      type: c.type,
      label: getLabel(c.type),
      pct: c.pct,
      count: c.count,
    }));
  }, [competitor]);

  // legend toggles
  const toggleLegend = (type: string, isolate: boolean) => {
    setHiddenTypes((prev) => {
      if (isolate) {
        const only = new Set(baseData.map((d) => d.type).filter((t) => t !== type));
        return only;
      }
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // handlers
  const handleSegmentClick = (type: string) => {
    // wire to details drawer if needed
    // eslint-disable-next-line no-console
    console.log("[segment click]", type);
  };
  const handleViewTable = (type: string) => {
    // open anchors table w/ filter
    // eslint-disable-next-line no-console
    console.log("[view table]", type);
  };

  // smoke checks
  useEffect(() => {
    const sumBasic = baseData.reduce((a, b) => a + b.pct, 0);
    console.assert(Math.abs(sumBasic - 100) < 1, `Basic distribution not ~100% (got ${sumBasic})`);
    const sumAdv = advancedData.reduce((a, b) => a + b.pct, 0);
    console.assert(Math.abs(sumAdv - 100) < 1.5, `Advanced distribution not ~100% (got ${sumAdv})`);
    const compSum = demoCompetitor.distribution.reduce((a, b) => a + b.pct, 0);
    console.assert(Math.abs(compSum - 100) < 1, `Competitor distribution not ~100% (got ${compSum})`);
  }, [advancedData, baseData]);

  // which set to show in the mini semantic bar
  const semanticBar = [
    { label: "Commercial Intent", pct: advancedData.find((d) => d.type === "Commercial Intent")?.pct || 0, color: CATEGORY_COLORS["Commercial Intent"] },
    { label: "Navigational", pct: advancedData.find((d) => d.type === "Navigational")?.pct || 0, color: CATEGORY_COLORS["Navigational"] },
    { label: "Informational", pct: advancedData.find((d) => d.type === "Informational")?.pct || 0, color: CATEGORY_COLORS["Informational"] },
    { label: "Generic", pct: advancedData.find((d) => d.type === "Generic")?.pct || 0, color: CATEGORY_COLORS["Generic"] },
  ];

  return (
    <div
      className="w-full"
      style={{
        fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui",
        color: TOKENS.text,
      }}
    >
      <section className="rounded-md border bg-white" style={{ borderColor: TOKENS.border }}>
        {/* ------------ Section Header ------------ */}
        <div
          className="flex items-center justify-between border-b p-3"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md"
                 style={{ background: TOKENS.pastelBlue, border: `1px solid ${TOKENS.border}` }}>
              <AnchorIcon size={16} className="text-[color:var(--wr-value-blue,#0077FF)]" />
            </div>
            <h3 className="text-[18px] font-semibold">Anchor Types Distribution</h3>
            <button aria-label="Glossary" className="rounded p-1 hover:bg-gray-50">
              <Info size={18} className="text-[#9CA3AF]" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <PrimaryButton
              onClick={() => {
                const csv = toCSV("proj_123", "all", grouping, demoAll.distribution, demoAll.totalAnchors);
                downloadFile(`anchor-distribution_${new Date().toISOString().slice(0, 10)}.csv`, csv);
              }}
              icon={<Download size={16} />}
              aria-label="Export Anchor Distribution"
            >
              Export
            </PrimaryButton>
          </div>
        </div>

        {/* ------------ Controls / Chips ------------ */}
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TOKENS.muted }}>
              Grouping
            </span>
            <ChipSelect
              ariaLabel="Grouping"
              value={grouping}
              onChange={(v) => setGrouping(v)}
              items={[
                { value: "basic", label: "Basic" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="ml-2 text-sm" style={{ color: TOKENS.muted }}>
              Compare
            </span>
            {/* Styled select as a chip */}
            <div
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1"
              style={{ borderColor: TOKENS.border }}
              role="combobox"
              aria-expanded="false"
              aria-label="Compare with Competitor"
            >
              <select
                value={competitor || ""}
                onChange={(e) => setCompetitor(e.target.value || null)}
                className="appearance-none bg-transparent text-sm outline-none"
              >
                <option value="">Compare with Competitor</option>
                <option value="competitor.com">competitor.com</option>
              </select>
              <ChevronDown size={16} className="text-[#9CA3AF]" />
            </div>
            {competitor && (
              <a
                href="#"
                className="inline-flex items-center gap-1 text-xs underline"
                onClick={(e) => e.preventDefault()}
                title="Open competitor profile"
              >
                <ExternalLink size={14} /> {competitor}
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="ml-2 text-sm" style={{ color: TOKENS.muted }}>
              Labels
            </span>
            <ChipSelect
              ariaLabel="Label format"
              value={showPercent ? "percent" : "count"}
              onChange={(v) => setShowPercent(v === "percent")}
              items={[
                { value: "percent", label: "Percent" },
                { value: "count", label: "Count" },
              ]}
            />
          </div>
        </div>

        {/* ------------ Body ------------ */}
        <div className="p-4 pt-0">
          {/* Main stacked bar */}
          <StackedBar
            data={baseData}
            totalFallback={demoAll.totalAnchors}
            hiddenTypes={hiddenTypes}
            showPercent={showPercent}
            onSegmentClick={handleSegmentClick}
            onViewTable={handleViewTable}
            ariaLabel="Anchor types distribution stacked bar"
            label="Your site"
          />

          {/* Competitor stacked bar (same UX) */}
          {competitorData && (
            <div className="mt-4">
              <StackedBar
                data={competitorData}
                totalFallback={demoCompetitor.totalAnchors}
                hiddenTypes={hiddenTypes}
                showPercent={true}
                onSegmentClick={handleSegmentClick}
                onViewTable={handleViewTable}
                ariaLabel="Competitor anchor distribution"
                label={`Competitor: ${competitor}`}
              />
            </div>
          )}

          {/* Advanced semantic mini bar */}
          {grouping === "advanced" && (
            <div className="mt-4 rounded-md border p-3 text-sm" style={{ borderColor: TOKENS.border, background: "#FFFFFF" }}>
              <div className="mb-1 text-xs" style={{ color: TOKENS.muted }}>
                Semantic Grouping
              </div>
              <div className="relative h-6 w-full overflow-hidden rounded border" style={{ borderColor: TOKENS.border }}>
                <div className="absolute inset-0 flex">
                  {(() => {
                    const total = Math.max(1, semanticBar.reduce((a, b) => a + b.pct, 0));
                    return semanticBar.map((s) => {
                      const w = (s.pct / total) * 100;
                      return (
                        <div key={s.label} className="relative h-full" style={{ width: `${w}%`, background: s.color }}>
                          {w > 12 && (
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-white">
                              {s.label} · {s.pct.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Legend chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {baseData.map((d) => (
              <LegendChip
                key={d.type}
                type={d.type}
                pct={d.pct}
                count={d.count}
                color={getColor(d.type)}
                hidden={hiddenTypes.has(d.type)}
                onToggle={toggleLegend}
              />
            ))}
          </div>

          {/* NOTE: Removed the duplicate vertical list that repeated legend data. */}
        </div>
      </section>
    </div>
  );
}
