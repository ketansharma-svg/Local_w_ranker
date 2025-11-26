import React, { useMemo, useRef, useState } from "react";
import {
  Info,
  AlertTriangle,
  ShieldCheck,
  Unlink,
  ShieldAlert,
  RotateCcw,
  PencilLine,
  BarChart2,
} from "lucide-react";

/**
 * Wranker – Backlink Health Summary (Section 3)
 * Location: Backlink Insights → Overview Tab → Section 3
 *
 * ✅ Inter font (with fallbacks)
 * ✅ Branded icons (#008CCD) in title/legend/tooltip
 * ✅ 100% stacked horizontal bar, rounded ends (6px)
 * ✅ Hover micro‑animation (lift, glow) + smart popover with colored dots
 * ✅ Clickable segments → fires onNavigate with suggested routes
 * ✅ View toggle: % vs Count (modular switch)
 * ✅ Mobile responsive & defensive for zero/missing data
 *
 * Drop-in usage:
 * <BacklinkHealthSummary
 *    data={{ total: 2500, clean: 1450, lost: 500, toxic: 300, recovered: 250 }}
 *    showTotal
 *    onNavigate={(route) => router.push(route)}
 * />
 */

type SegmentKey = "clean" | "lost" | "toxic" | "recovered" | "manual";

type HealthData = {
  total?: number; // if omitted, will be computed as sum of segments
  clean?: number;
  lost?: number;
  toxic?: number;
  recovered?: number;
  manual?: number; // optional (Manual/Unknown)
};

type BacklinkHealthSummaryProps = {
  data?: HealthData;
  className?: string;
  showTotal?: boolean;
  /** Provide a handler to deep-link to audit tabs when users click the segments */
  onNavigate?: (href: string) => void;
};

type ViewMode = "percent" | "count";

const FONT_STACK =
  '"Inter","Inter var",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial';

const TOKENS = {
  // Brand + main hues
  brand: "#008CCD", // branded icons
  mainBlue: "#0077ff", // main metric value color
  panelBg: "#EFF6FF", // pastel blue background for the chart track
  borderLight: "#E6EDF7",

  // Typography
  text: "#0F172A",
  textMuted: "#475569",

  // status colors
  clean: "#45C18B",
  lost: "#EF4444",
  toxic: "#D92D20",
  recovered: "#FACC15",
  manual: "#CBD5E1",
};

const SEGMENT_META: Record<
  SegmentKey,
  { label: string; color: string; desc: string; route: string }
> = {
  clean: {
    label: "Clean",
    color: TOKENS.clean,
    desc:
      "Live backlinks with no toxicity flags, active status, proper anchor usage.",
    route: "/backlinks/audit/new-lost?status=live",
  },
  lost: {
    label: "Lost",
    color: TOKENS.lost,
    desc:
      "Backlinks that previously existed but are now missing, broken, or removed.",
    route: "/backlinks/audit/new-lost?status=lost",
  },
  toxic: {
    label: "Toxic",
    color: TOKENS.toxic,
    desc:
      "Flagged for low trust, spam signals, risky TLDs/IPs, or anchor abuse.",
    route: "/backlinks/audit/toxicity",
  },
  recovered: {
    label: "Recovered",
    color: TOKENS.recovered,
    desc: "Previously lost or toxic links that are now healthy/live again.",
    route: "/backlinks/audit/new-lost?status=recovered",
  },
  manual: {
    label: "Manual",
    color: TOKENS.manual,
    desc:
      "Links added manually (Health Monitor) or from Vefogix (optional segment).",
    route: "/backlinks/health-monitor?view=manual",
  },
};

const STATUS_ICON: Record<
  SegmentKey,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  clean: ShieldCheck,
  lost: Unlink,
  toxic: ShieldAlert,
  recovered: RotateCcw,
  manual: PencilLine,
};

const fmtNumber = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

function useNormalizedData(input?: HealthData) {
  const sample: Required<HealthData> = {
    clean: 1450,
    lost: 500,
    toxic: 300,
    recovered: 250,
    manual: 0,
    total: 2500,
  } as Required<HealthData>;

  const d = {
    clean: input?.clean ?? sample.clean,
    lost: input?.lost ?? sample.lost,
    toxic: input?.toxic ?? sample.toxic,
    recovered: input?.recovered ?? sample.recovered,
    manual: input?.manual ?? 0,
  };
  const providedTotal = input?.total;
  const computed = d.clean + d.lost + d.toxic + d.recovered + d.manual;
  const total = Math.max(0, providedTotal ?? computed);

  // Avoid negative/NaN; if total is 0, keep counts 0
  const safe =
    total > 0 ? d : { clean: 0, lost: 0, toxic: 0, recovered: 0, manual: 0 };
  const safeTotal = total > 0 ? total : 0;

  // Order: Clean → Lost → Toxic → Recovered → Manual
  const orderedKeys: SegmentKey[] = [
    "clean",
    "lost",
    "toxic",
    "recovered",
    "manual",
  ];

  const rows = orderedKeys
    .map((k) => ({
      key: k,
      label: SEGMENT_META[k].label,
      color: SEGMENT_META[k].color,
      count: (safe as any)[k] as number,
      route: SEGMENT_META[k].route,
      desc: SEGMENT_META[k].desc,
    }))
    .filter((r) => !(r.key === "manual" && r.count === 0));

  // % for width; for display we’ll round to whole %
  const parts = rows.map((r) => ({
    ...r,
    pctRaw: safeTotal ? (r.count / safeTotal) * 100 : 0,
  }));

  // for the bar, hide truly zero segments to maintain rounded ends
  const barParts = parts.filter((p) => p.pctRaw > 0);

  return { total: safeTotal, parts, barParts };
}

/** Toggle (modular switch) – brand blue when ON */
function Toggle({
  checked,
  onChange,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      {label ? (
        <span className="text-[13px]" style={{ color: TOKENS.textMuted }}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label ?? "toggle"}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          backgroundColor: checked ? TOKENS.mainBlue : "#CBD5E1",
          boxShadow: checked
            ? "0 0 0 2px rgba(0, 119, 255, 0.15)"
            : "0 0 0 0 rgba(0,0,0,0)",
        }}
      >
        <span
          className="inline-block h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

/** Legend chip (modular) */
function LegendChip({
  label,
  value,
  dotColor,
  Icon,
}: {
  label: string;
  value: string;
  dotColor: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <span
      className="inline-flex select-none items-center gap-2 rounded-full border px-2.5 py-1 text-[13px] font-medium"
      style={{
        borderColor: TOKENS.borderLight,
        background: "#FFFFFF",
        fontFamily: FONT_STACK,
      }}
    >
      <span
        className="h-[8px] w-[8px] rounded-full"
        style={{ background: dotColor }}
        aria-hidden
      />
      <Icon className="h-3.5 w-3.5" color={TOKENS.brand} strokeWidth={2} />
      <span
        className="tabular-nums font-semibold"
        style={{ color: TOKENS.mainBlue }}
      >
        {value}
      </span>
      <span style={{ color: TOKENS.text }}>{label}</span>
    </span>
  );
}

/** Small popover used for the section-level info icon */
function InfoPopover({
  open,
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  open: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-block">
      {/* The popover panel */}
      {open && (
        <div
          role="tooltip"
          onMouseEnter={onPointerEnter}
          onMouseLeave={onPointerLeave}
          className="absolute z-50 max-w-[320px] rounded-md border bg-white px-3 py-2 text-[13px] shadow-md"
          style={{
            borderColor: TOKENS.borderLight,
            color: TOKENS.text,
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="leading-snug" style={{ color: TOKENS.textMuted }}>
            {children}
          </div>
          {/* arrow */}
          <span
            aria-hidden
            className="absolute h-2 w-2 rotate-45 border bg-white"
            style={{
              borderColor: TOKENS.borderLight,
              left: "50%",
              top: -4,
              transform: "translateX(-50%) rotate(45deg)",
              borderLeftColor: TOKENS.borderLight,
              borderTopColor: TOKENS.borderLight,
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function BacklinkHealthSummary({
  data,
  className,
  showTotal = true,
  onNavigate,
}: BacklinkHealthSummaryProps) {
  const { total, parts, barParts } = useNormalizedData(data);

  // Anchor is now relative to the bar container (cx) to keep the popover stable and above
  const [hover, setHover] = useState<{
    key: SegmentKey;
    cx: number;
    containerW: number;
  } | null>(null);

  const hideTimerRef = useRef<number | null>(null);
  const [tooltipHot, setTooltipHot] = useState(false);
  const barGroupRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("percent");

  const chips = useMemo(
    () =>
      parts.map((p) => ({
        key: p.key,
        label: p.label,
        color: p.color,
        icon: STATUS_ICON[p.key],
        value:
          viewMode === "percent"
            ? `${Math.round(p.pctRaw)}%`
            : fmtNumber(p.count),
      })),
    [parts, viewMode]
  );

  function handleClick(route: string) {
    if (onNavigate) onNavigate(route);
  }

  const clearHideTimer = () => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (!tooltipHot) setHover(null);
    }, 120);
  };

  return (
    <section
      className={`w-full mt-4 ${className ?? ""}`}
      aria-labelledby="backlink-health-title"
      style={{ fontFamily: FONT_STACK }}
    >
      {/* Title + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-end gap-2">
          <h3
            id="backlink-health-title"
            className="flex items-center gap-2 text-[18px] font-semibold leading-tight"
            style={{ color: TOKENS.text }}
          >
            <BarChart2
              className="h-[18px] w-[18px]"
              color={TOKENS.brand}
              strokeWidth={2}
              aria-hidden
            />
            Backlink Health Overview
          </h3>

          {/* Info icon near title with popover */}
          <SectionInfo />

          {showTotal && (
            <div
              className="text-sm"
              style={{ color: TOKENS.textMuted }}
              aria-label="Total Links"
            >
              &nbsp;· Total Links:{" "}
              <span
                className="tabular-nums font-semibold"
                style={{ color: TOKENS.mainBlue }}
              >
                {fmtNumber(total)}
              </span>
            </div>
          )}
        </div>

        {/* Toggle: % vs Count */}
        <div className="flex items-center gap-3">
          <Toggle
            checked={viewMode === "percent"}
            onChange={(on) => setViewMode(on ? "percent" : "count")}
            label="Show %"
            ariaLabel="Toggle value display between percentage and count"
          />
        </div>
      </div>

      {/* Legend chips */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <LegendChip
            key={c.key}
            label={c.label}
            value={c.value}
            dotColor={c.color}
            Icon={c.icon}
          />
        ))}
      </div>

      {/* Stacked bar */}
      <div className="mt-5">
        <div
          ref={barGroupRef}
          className="relative w-full"
          role="group"
          aria-label="Backlink health stacked bar"
        >
          <div
            className="w-full"
            style={{
              height: 30, // 28–32px spec
              borderRadius: 6, // curved ends (6px)
              background: TOKENS.panelBg,
              border: `1px solid ${TOKENS.borderLight}`,
            }}
          >
            <div className="flex h-full w-full overflow-hidden rounded-[6px]">
              {barParts.map((p, idx) => {
                const widthPct = `${p.pctRaw}%`;
                const isFirst = idx === 0;
                const isLast = idx === barParts.length - 1;
                const isHover = hover?.key === (p.key as SegmentKey);

                return (
                  <button
                    key={p.key}
                    type="button"
                    title={`${p.label}: ${fmtNumber(p.count)} (${Math.round(
                      p.pctRaw
                    )}%)`}
                    className="relative h-full focus:outline-none"
                    style={{
                      width: widthPct,
                      background: p.color,
                      borderTopLeftRadius: isFirst ? 6 : 0,
                      borderBottomLeftRadius: isFirst ? 6 : 0,
                      borderTopRightRadius: isLast ? 6 : 0,
                      borderBottomRightRadius: isLast ? 6 : 0,
                      transition:
                        "transform 160ms ease, filter 160ms ease, box-shadow 160ms ease",
                      cursor: "pointer",
                      filter: isHover ? "saturate(1.08) brightness(1.05)" : "",
                      boxShadow: isHover
                        ? "inset 0 0 0 1px rgba(255,255,255,.35), 0 0 0 2px rgba(0,140,205,.25), 0 4px 10px rgba(16,24,40,.12)"
                        : "inset 0 0 0 0 rgba(0,0,0,0)",
                    }}
                    onClick={() => handleClick(p.route)}
                    onMouseEnter={(e) => {
                      clearHideTimer();
                      const container = barGroupRef.current;
                      if (!container) return;
                      const cRect = container.getBoundingClientRect();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const cx = rect.left - cRect.left + rect.width / 2;
                      setHover({
                        key: p.key as SegmentKey,
                        cx,
                        containerW: cRect.width,
                      });
                    }}
                    onMouseMove={(e) => {
                      clearHideTimer();
                      const container = barGroupRef.current;
                      if (!container) return;
                      const cRect = container.getBoundingClientRect();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const cx = rect.left - cRect.left + rect.width / 2;
                      setHover((prev) =>
                        prev && prev.key === p.key
                          ? { key: prev.key, cx, containerW: cRect.width }
                          : {
                              key: p.key as SegmentKey,
                              cx,
                              containerW: cRect.width,
                            }
                      );
                    }}
                    onMouseLeave={scheduleHide}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick(p.route);
                      }
                    }}
                    aria-label={`${p.label} segment`}
                  />
                );
              })}
            </div>
          </div>

          {/* Smart popover (hover) - shown ABOVE the bar; sticky while hovered */}
          {hover && (
            <HealthTooltip
              anchor={hover}
              part={parts.find((p) => p.key === hover.key)!}
              total={total}
              onPointerEnter={() => {
                setTooltipHot(true);
                clearHideTimer();
              }}
              onPointerLeave={() => {
                setTooltipHot(false);
                setHover(null);
              }}
            />
          )}
        </div>

        {/* Notes: keep the warning; move the "info" into the title's info popover */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-red-600">
              If a link is both toxic and lost, it is counted under <b>Toxic</b>{" "}
              (no double counting).
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

/** Floating tooltip (smart popover) anchored ABOVE the stacked bar */
function HealthTooltip({
  anchor,
  part,
  total,
  onPointerEnter,
  onPointerLeave,
}: {
  anchor: { cx: number; containerW: number };
  part: {
    key: SegmentKey;
    label: string;
    color: string;
    desc: string;
    count: number;
    pctRaw: number;
  };
  total: number;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  const pctDisplay = Math.round(part.pctRaw);
  const title = `${part.label}: ${fmtNumber(part.count)} (${pctDisplay}%)`;
  const Icon = STATUS_ICON[part.key];

  // Keep the popover above the bar, centered on the hovered segment.
  // Clamp horizontally so it doesn't overflow the container.
  const POPOVER_MAX_W = 320;
  const half = POPOVER_MAX_W / 2;
  const pad = 12;
  const clampedLeft = Math.max(
    half + pad,
    Math.min(anchor.cx, anchor.containerW - half - pad)
  );

  const style: React.CSSProperties = {
    position: "absolute",
    left: clampedLeft,
    bottom: "calc(100% + 10px)", // always ABOVE the bar
    transform: "translateX(-50%)",
    zIndex: 60,
  };

  return (
    <div style={style} onMouseEnter={onPointerEnter} onMouseLeave={onPointerLeave}>
      <div
        className="max-w-[320px] rounded-md border bg-white px-3 py-2 text-[13px] shadow-md transition-all"
        style={{ borderColor: TOKENS.borderLight, color: TOKENS.text }}
        role="tooltip"
      >
        <div className="mb-1 flex items-center gap-2 font-medium">
          {/* colored dot annotation (status) */}
          <span
            className="inline-block h-[10px] w-[10px] rounded-[3px]"
            style={{ background: part.color }}
            aria-hidden
          />
          {/* branded status icon */}
          <Icon className="h-4 w-4" color={TOKENS.brand} strokeWidth={2} />
          <span className="tabular-nums">
            <span className="font-semibold" style={{ color: TOKENS.mainBlue }}>
              {title}
            </span>
          </span>
        </div>
        <div className="leading-snug" style={{ color: TOKENS.textMuted }}>
          {part.desc}
        </div>
        <div className="mt-1" style={{ color: TOKENS.textMuted }}>
          Based on{" "}
          <span
            className="tabular-nums font-medium"
            style={{ color: TOKENS.mainBlue }}
          >
            {fmtNumber(total)}
          </span>{" "}
          total backlinks.
        </div>
      </div>
      {/* arrow */}
      <span
        aria-hidden
        className="absolute h-2 w-2 rotate-45 border bg-white"
        style={{
          borderColor: TOKENS.borderLight,
          left: "50%",
          bottom: -4,
          transform: "translateX(-50%) rotate(45deg)",
          borderLeftColor: TOKENS.borderLight,
          borderTopColor: TOKENS.borderLight,
          borderRightColor: "transparent",
          borderBottomColor: "transparent",
        }}
      />
    </div>
  );
}

/** Section-level info icon + popover content (moved from below the chart) */
function SectionInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Section info"
        className="ml-1 inline-flex items-center justify-center rounded p-1 focus:outline-none focus:ring-2"
        style={{ color: TOKENS.brand }}
      >
        <Info className="h-4 w-4" />
      </button>
      <InfoPopover
        open={open}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        Hover a segment to view details. Click to open the relevant audit view.
      </InfoPopover>
    </div>
  );
}

/* ---------- Optional Demo Wrapper (remove in production) ---------- */
export function Demo_BacklinkHealthSummary() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <BacklinkHealthSummary
        data={{
          total: 2500,
          clean: 1450,
          lost: 500,
          toxic: 300,
          recovered: 250,
        }}
        showTotal
        onNavigate={(href) => alert(`Navigate to: ${href}`)}
      />
    </div>
  );
}
