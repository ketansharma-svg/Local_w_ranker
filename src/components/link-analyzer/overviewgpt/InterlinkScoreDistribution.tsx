"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Filter,
  ListTodo,
  RefreshCw,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/**
 * Wranker – SECTION 6: Interlink Score Distribution (Overview → Link Analyzer)
 * - Branded header glyph, Inter/Inter Fallback fonts
 * - Stacked bar with smart popover (on-hover/focus) using branded icons
 * - Modular CTAs on cards beneath
 * - A11y: arrow-key navigation, Enter/Space, ESC to close popover
 */

// ---- Design Tokens (scoped fallbacks for canvas). Prefer global CSS vars when present.
const tokenStyles: React.CSSProperties = {
  ["--wr-brand" as any]: "#008CCD",
  ["--wr-core-blue" as any]: "#0077FF",
  ["--wr-success" as any]: "#10B981",
  ["--wr-warning" as any]: "#F59E0B",
  ["--wr-critical" as any]: "#EF4444",
  ["--wr-text-strong" as any]: "#111827",
  ["--wr-text" as any]: "#374151",
  ["--wr-text-muted" as any]: "#6B7280",
  ["--wr-bg-app" as any]: "#F5F7FA",
  ["--wr-bg-panel" as any]: "#FFFFFF",
  ["--wr-border-subtle" as any]: "#EFF0F6",
  ["--wr-border" as any]: "#E5E7EB",
  ["--wr-focus" as any]: "#4286F5",
  ["--wr-overlay" as any]: "rgba(17,24,39,0.6)",
  ["--wr-radius" as any]: "6px",
  ["--wr-shadow-1" as any]: "0 1px 3px rgba(0,0,0,0.1)",
};

// ---- Sample payload (replace via GET /api/projects/:id/pils/distribution)
const samplePayload = {
  totalPages: 332,
  buckets: [
    { range: "0-59", label: "Poor", color: "#FF4C4C", pages: 82, avgAqs: 60.8 },
    { range: "60-79", label: "Average", color: "#FFA500", pages: 94, avgAqs: 68.3 },
    { range: "80-89", label: "Good", color: "#008CCD", pages: 57, avgAqs: 75.1 },
    { range: "90-100", label: "Excellent", color: "#0077FF", pages: 31, avgAqs: 85.6 },
  ],
  lastUpdated: "2025-08-22T12:23:00Z",
};

// ---- Utilities
function toPercent(n: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((n / total) * 1000) / 10; // 1 decimal
}

function makeCsv(rows: Array<Record<string, any>>) {
  const headers = Object.keys(rows[0] || { range: "", label: "", pages: 0, percent: 0, avgAqs: 0 });
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wranker-pils-distribution.csv`;
  a.click();
  URL.revokeObjectURL(url);
}



/* -------------------------------------------------------------------------------------------------
 * Branded Mini Icons (inline SVGs so we can apply brand gradient strokes/fills)
 * -------------------------------------------------------------------------------------------------*/
function useBrandGradId() {
  const id = useId();
  return `wr-brand-grad-${id}`;
}
const BrandGradDefs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#008CCD" />
      <stop offset="100%" stopColor="#0077FF" />
    </linearGradient>
  </defs>
);

export const BrandInterlinkGlyph: React.FC<{ size?: number }> = ({ size = 18 }) => {
  const gid = useBrandGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <BrandGradDefs id={gid} />
      <path
        d="M7.5 12a3.5 3.5 0 0 1 1.02-2.48l2.6-2.6a3.5 3.5 0 0 1 4.95 0c1.37 1.37 1.37 3.58 0 4.95l-.35.35M16.5 12a3.5 3.5 0 0 1-1.02 2.48l-2.6 2.6a3.5 3.5 0 0 1-4.95 0c-1.37-1.37-1.37-3.58 0-4.95l.35-.35"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const BrandPagesIcon: React.FC<{ size?: number }> = ({ size = 14 }) => {
  const gid = useBrandGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden focusable="false">
      <BrandGradDefs id={gid} />
      <rect x="3" y="3" width="14" height="14" rx="2.5" fill="none" stroke={`url(#${gid})`} strokeWidth="1.6" />
      <path d="M6 7.5h8M6 10h8M6 12.5h5" stroke={`url(#${gid})`} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

export const BrandGaugeIcon: React.FC<{ size?: number }> = ({ size = 14 }) => {
  const gid = useBrandGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden focusable="false">
      <BrandGradDefs id={gid} />
      <path d="M4 12a6 6 0 1 1 12 0" fill="none" stroke={`url(#${gid})`} strokeWidth="1.6" />
      <circle cx="10" cy="12" r="1.5" fill={`url(#${gid})`} />
      <path d="M10 12l3-4" stroke={`url(#${gid})`} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Modular Buttons (compact CTAs used on cards & popover)
 * -------------------------------------------------------------------------------------------------*/
type ModBtnVariant = "brand" | "outline";
function ModButton({
  icon,
  children,
  onClick,
  variant = "brand",
  ariaLabel,
}: React.PropsWithChildren<{
  icon?: React.ReactNode;
  variant?: ModBtnVariant;
  onClick?: () => void;
  ariaLabel?: string;
}>) {
  const base =
    "inline-flex items-center gap-1.5 h-8 px-2 rounded-[6px] text-sm transition focus:outline-none focus-visible:ring-2";
  const styles =
    variant === "brand"
      ? "text-white"
      : "border text-[var(--wr-text,#374151)]";
  const bgStyle =
    variant === "brand"
      ? { background: "linear-gradient(90deg, var(--wr-brand,#008CCD), var(--wr-core-blue,#0077FF))" }
      : { borderColor: "var(--wr-border,#E5E7EB)", background: "#FFFFFF" };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${base} ${styles}`}
      style={bgStyle}
    >
      {icon}
      <span className="font-medium">{children}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Smart Popover for stacked bar segments (hover/focus)
 * -------------------------------------------------------------------------------------------------*/
type Bucket = {
  range: string;
  label: string;
  color: string;
  pages: number;
  avgAqs: number;
  percent?: number;
  samplePages?: string[]; // <— NEW
};
function useCloseOnEsc(cb: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") cb();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cb]);
}

function SmartPopover({
  open,
  anchorRect,
  onClose,
  bucket,
  onViewPages,
  onFilterRange,
  onCreateTask,
  onPopoverEnter,
}: {
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  bucket: Bucket | null;
  onViewPages: () => void;
  onFilterRange: () => void;
  onCreateTask: () => void;
  onPopoverEnter?: () => void;
}) {
  useCloseOnEsc(onClose);
  useEffect(() => {
    if (!open) return;
    const h = () => onClose(); // close when scrolling to avoid stale position
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [open, onClose]);

  // Basic smart placement: flip below if not enough room above
  const topPreferred = anchorRect ? anchorRect.top : 0;
  const side: "top" | "bottom" = topPreferred < 160 ? "bottom" : "top";
  const left = anchorRect ? anchorRect.left + anchorRect.width / 2 : 0;
  const top = anchorRect
    ? side === "top"
      ? Math.max(8, anchorRect.top - 12)
      : anchorRect.bottom + 12
    : 0;

  return (
    <AnimatePresence>
      {open && anchorRect && bucket && (
        <motion.div
          role="dialog"
          aria-label={`${bucket.label} quick info`}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed z-[10]"
          style={{ top, left, transform: "translateX(-50%)", pointerEvents: "auto" }}
          onMouseEnter={() => onPopoverEnter?.()}
          onPointerEnter={() => onPopoverEnter?.()}
          onMouseLeave={onClose}
          onPointerLeave={onClose}
        >
          {/* Arrow */}
          <div
            className="mx-auto h-3 w-3 rotate-45"
            style={{
              marginBottom: side === "top" ? "-6px" : undefined,
              marginTop: side === "bottom" ? "-6px" : undefined,
              background: "#FFFFFF",
              borderLeft: "1px solid var(--wr-border,#E5E7EB)",
              borderTop: "1px solid var(--wr-border,#E5E7EB)",
            }}
          />
          <div
            className="min-w-[260px] max-w-[360px] rounded-md border bg-white shadow-md"
            style={{ borderColor: "var(--wr-border,#E5E7EB)" }}
          >
            <div className="flex items-start justify-between gap-3 p-3">
              <div>
                <div className="text-sm font-semibold text-[var(--wr-text-strong,#111827)]">
                  {bucket.label} <span className="text-[12px] text-[var(--wr-text-muted,#6B7280)]">({bucket.range})</span>
                </div>
                <div className="mt-1 flex flex-col gap-1 text-[13px]">
                  <div className="flex items-center gap-2">
                    <BrandPagesIcon />
                    <span className="text-[var(--wr-text-muted,#6B7280)]">Pages</span>
                    <span className="font-medium tabular-nums text-[var(--wr-text-strong,#111827)] ml-auto">
                      {bucket.pages}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BrandGaugeIcon />
                    <span className="text-[var(--wr-text-muted,#6B7280)]">Avg. AQS</span>
                    <span className="font-medium tabular-nums text-[var(--wr-text-strong,#111827)] ml-auto">
                      {Math.round((bucket.avgAqs || 0) * 10) / 10}%
                    </span>
                  </div>
                </div>
<div className="mt-2 text-[11px] text-[var(--wr-text-muted,#6B7280)]">
  Top pages: {(bucket.samplePages && bucket.samplePages.length
    ? bucket.samplePages.slice(0, 3)
    : ["(no examples)"]
  ).join(", ")}
</div>

              </div>
              <button
                className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
                onClick={onClose}
                aria-label="Close popover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 border-t p-2" style={{ borderColor: "var(--wr-border,#E5E7EB)" }}>
              <ModButton
                variant="brand"
                icon={<BrandPagesIcon />}
                onClick={onViewPages}
                ariaLabel="View pages"
              >
                View pages
              </ModButton>
              <ModButton
                variant="outline"
                icon={<Filter className="w-4 h-4 text-[var(--wr-text,#374151)]" />}
                onClick={onFilterRange}
                ariaLabel="Filter to range"
              >
                Filter
              </ModButton>
              <ModButton
                variant="outline"
                icon={<ListTodo className="w-4 h-4 text-[var(--wr-text,#374151)]" />}
                onClick={onCreateTask}
                ariaLabel="Create task"
              >
                Create Task
              </ModButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Component
 * -------------------------------------------------------------------------------------------------*/
export default function InterlinkScoreDistribution({payload}) {
  const [data, setData] = useState<{
    totalPages: number;
    buckets: Array<Bucket>;
    lastUpdated: string;
  }>(() => ({
    totalPages: payload?.totalPages ?? samplePayload.totalPages,
    buckets: payload?.buckets ?? samplePayload.buckets,
    lastUpdated: payload?.lastUpdated ?? samplePayload.lastUpdated,
  })); 
  
    useEffect(() => {
    if (!payload) return;
    setData({
      totalPages: payload.totalPages,
      buckets: payload.buckets,
      lastUpdated: payload.lastUpdated ?? new Date().toISOString(),
    });
  }, [payload]);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [modalBucket, setModalBucket] = useState<Bucket | null>(null);
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const total = data.totalPages || data.buckets.reduce((a, b) => a + b.pages, 0);
const withPct: Bucket[] = useMemo(
  () => data.buckets.map(b => ({ ...b, percent: toPercent(b.pages, total) })), // samplePages stays on the object
  [data, total]
);

  const openTaskForBucket = useCallback(
    (bucket: Bucket) => {
      const percent = typeof bucket.percent === "number" ? bucket.percent : toPercent(bucket.pages, total);
      const sample = bucket.samplePages ?? [];
      const sampleLines =
        sample.length > 0 ? ["Pages include:", ...sample.map((page) => `- ${page}`)].join("\n") : null;

      const descriptionParts = [
        `PILS range: ${bucket.range} (${bucket.label})`,
        `Pages affected: ${bucket.pages} (${percent}%)`,
        Number.isFinite(bucket.avgAqs) ? `Average AQS: ${Math.round((bucket.avgAqs ?? 0) * 10) / 10}%` : null,
        sampleLines,
      ].filter(Boolean) as string[];

      openTaskDrawer({
        title: `Fix internal links - ${bucket.label}`,
        description: descriptionParts.join("\n"),
        projectId: selectedProject?.id ?? null,
        type: "createNew",
      });
    },
    [openTaskDrawer, selectedProject?.id, total],
  );
  const poor = withPct.find(b => b.label === "Poor");
  const showAlert: boolean = !!(poor && (poor.percent ?? 0) > 10);

  // Popover state
  const [openPopover, setOpenPopover] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [activeBucket, setActiveBucket] = useState<Bucket | null>(null);
  const hideTimer = useRef<number | null>(null);

  const cancelHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const closePopover = useCallback(() => {
    cancelHideTimer();
    setOpenPopover(false);
  }, [cancelHideTimer]);

  useEffect(() => () => cancelHideTimer(), [cancelHideTimer]);

  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyNav = (i: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      segmentRefs.current[Math.min(i + 1, withPct.length - 1)]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      segmentRefs.current[Math.max(i - 1, 0)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const b = withPct[i];
      setActiveBucket(b);
      setSelectedRange(b.range);
      setOpenPopover(true);
    } else if (e.key === "Escape") {
      closePopover();
    }
  };

  const emitFilterEvent = (range: string) => {
    const [minStr, maxStr] = range.split("-");
    const min = Number(minStr);
    const max = Number(maxStr);
    window.dispatchEvent(new CustomEvent("wr:pils-filter", { detail: { min, max } }));
  };

  const handleSegmentClick = (bucket: Bucket) => {
    setSelectedRange(bucket.range);
    setModalBucket(bucket);
    emitFilterEvent(bucket.range);
    console.log("pils_segment_clicked", { range: bucket.range, pages: bucket.pages });
  };


  const downloadCSV = (scope: "selected" | "all") => {
    const rows = (scope === "selected" && selectedRange)
      ? withPct.filter(b => b.range === selectedRange)
      : withPct;
    makeCsv(rows.map(b => ({
      range: b.range,
      label: b.label,
      pages: b.pages,
      percent: b.percent,
      avgAqs: b.avgAqs,
    })));
  };

  const onSegmentHover = (e: React.MouseEvent<HTMLButtonElement>, bucket: Bucket) => {
    cancelHideTimer();
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    setAnchorRect(rect);
    setActiveBucket(bucket);
    setOpenPopover(true);
  };

  const onSegmentLeave = () => {
    // small delay to allow popover hover takeover
    cancelHideTimer();
    hideTimer.current = window.setTimeout(closePopover, 220) as unknown as number;
  };

  const cardCols = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";

  return (
    <div
      className="w-full font-sans"
      style={{
        ...tokenStyles,
        fontFamily:
          'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      <Card
        className="bg-[var(--wr-bg-panel)] border"
        style={{ borderColor: "var(--wr-border-subtle)", borderRadius: "var(--wr-radius)", boxShadow: "var(--wr-shadow-1)" }}
      >
        {/* Header */}
        <CardHeader className="pb-3 border-b" style={{ borderColor: "var(--wr-border)", paddingBottom: 12, paddingTop: 12 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BrandInterlinkGlyph />
                <CardTitle className="text-[var(--wr-text-strong)] font-semibold text-[20px] leading-6">
                  Interlink Score Distribution
                </CardTitle>
              </div>
              <p className="text-[var(--wr-text-muted)] text-sm mt-1">
                See how your pages perform based on internal linking scores (PILS). Identify weak zones in need of improvement.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Export dropdown (simple) */}
              <div className="relative">
                <details className="group">
                  <summary className="list-none">
                    <Button
                      variant="outline"
                      className="h-9 gap-2 border"
                      style={{ borderColor: "var(--wr-border)", borderRadius: "var(--wr-radius)" }}
                    >
                      <Download className="w-4 h-4" /> Export <ChevronDown className="w-4 h-4" />
                    </Button>
                  </summary>
                  <div
                    className="absolute right-0 z-40 mt-2 min-w-[220px] rounded-md border bg-white py-1 shadow"
                    style={{ borderColor: "var(--wr-border)" }}
                  >
                    <button
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={() => downloadCSV(selectedRange ? "selected" : "all")}
                    >
                      CSV (bucketed)
                    </button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => alert("PDF export coming soon")}>
                      PDF (snapshot)
                    </button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => alert("PNG export coming soon")}>
                      PNG (chart only)
                    </button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => alert("SVG export coming soon")}>
                      SVG (chart only)
                    </button>
                  </div>
                </details>
              </div>

              <Button
                variant="outline"
                onClick={window.location.reload}
                className="h-9 gap-2 border"
                style={{ borderColor: "var(--wr-border)", borderRadius: "var(--wr-radius)" }}
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
          </div>

          {selectedRange && (
            <div className="mt-2">
              <Badge variant="outline" className="text-[var(--wr-core-blue)] border" style={{ borderColor: "var(--wr-core-blue)" }}>
                PILS Range: {selectedRange}
              </Badge>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          {/* Threshold alert */}
          {showAlert && (
            <div
              className="mb-3 flex items-start gap-2 p-3 rounded-md border text-sm"
              style={{ borderColor: "var(--wr-border)", background: "#FFF8E6" }}
            >
              <AlertTriangle className="w-4 h-4 text-[var(--wr-warning)] mt-0.5" />
              <div>
                <span className="font-medium">{poor ? poor.percent : 0}%</span> of pages have{" "}
                <span className="font-medium">PILS &lt; 60%</span> — consider prioritising cross‑linking to these pages.
              </div>
            </div>
          )}

          {/* Main visual: Horizontal segmented bar with smart popover */}
          <div className="hidden md:block">
            <div className="w-full">
              <div className="relative">
                <div className="flex w-full h-12 overflow-hidden rounded-md" style={{ border: `1px solid var(--wr-border-subtle)` }}>
                  {withPct.map((b, i) => {
                    const isFirst = i === 0;
                    const isLast = i === withPct.length - 1;
                    const width = `${b.percent}%`;
                    const gradient = `linear-gradient(90deg, ${b.color} 0%, ${b.color}CC 60%, ${b.color} 100%)`;
                    return (
                      <motion.button
                        key={b.range}
                        // ref={el => (segmentRefs.current[i] = el)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${b.label}: ${b.pages} pages, ${b.percent}% of site pages, average AQS ${Math.round((b.avgAqs || 0) * 10) / 10}%`}
                        onKeyDown={e => onKeyNav(i, e)}
                        onClick={() => handleSegmentClick(b)}
                        onMouseEnter={(e) => onSegmentHover(e, b)}
                        onMouseLeave={onSegmentLeave}
                        className="relative focus:outline-none focus-visible:ring-2"
                        style={{
                          width,
                          borderRight: isLast ? undefined : `2px solid var(--wr-bg-panel)`,
                          background: gradient,
                          borderTopLeftRadius: isFirst ? "var(--wr-radius)" : 0,
                          borderBottomLeftRadius: isFirst ? "var(--wr-radius)" : 0,
                          borderTopRightRadius: isLast ? "var(--wr-radius)" : 0,
                          borderBottomRightRadius: isLast ? "var(--wr-radius)" : 0,
                          outlineColor: "var(--wr-focus)",
                        }}
                        whileHover={{ scaleY: 1.03 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {/* Left label */}
                        {b.percent! > 12 && (
                          <span className="absolute left-2 top-1 text-[11px] font-medium text-white/95">
                            {b.label}
                          </span>
                        )}
                        {/* Right label */}
                        {b.percent! > 18 && (
                          <span className="absolute right-2 bottom-1 text-[11px] text-white/90 tabular-nums">
                            {b.pages} • {b.percent}%
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Smart Popover */}
                <SmartPopover
                  open={openPopover}
                  anchorRect={anchorRect}
                  bucket={activeBucket}
                  onClose={closePopover}
                  onPopoverEnter={cancelHideTimer}
                  onViewPages={() => {
                    if (activeBucket) handleSegmentClick(activeBucket);
                    closePopover();
                  }}
                  onFilterRange={() => {
                    if (activeBucket) {
                      setSelectedRange(activeBucket.range);
                      emitFilterEvent(activeBucket.range);
                    }
                    closePopover();
                  }}
                  onCreateTask={() => {
                    if (activeBucket) openTaskForBucket(activeBucket);
                    closePopover();
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mobile stacked layout */}
          <div className="md:hidden">
            <div className="divide-y" style={{ borderColor: "var(--wr-border-subtle)" }}>
              {withPct.map((b) => (
                <button
                  key={b.range}
                  onClick={() => handleSegmentClick(b)}
                  className="w-full flex items-center justify-between py-3 px-2 text-left focus:outline-none focus-visible:ring-2 rounded-sm"
                  style={{ outlineColor: "var(--wr-focus)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: b.color }} />
                    <div className="text-sm">
                      <div className="font-medium">{b.label} <span className="text-[11px] text-[var(--wr-text-muted)]">({b.range})</span></div>
                      <div className="text-[12px] text-[var(--wr-text-muted)]">Avg AQS {Math.round((b.avgAqs || 0) * 10) / 10}%</div>
                    </div>
                  </div>
                  <div className="text-sm tabular-nums">{b.pages} • {b.percent}%</div>
                </button>
              ))}
            </div>
          </div>

          {/* Range Cards with modular CTAs */}
          <div className={`mt-4 ${"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"}`}>
            {withPct.map(b => (
              <div key={b.range} className="p-3 border bg-white" style={{ borderColor: "var(--wr-border-subtle)", borderRadius: "var(--wr-radius)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium">
                      <span className="w-2.5 h-2.5 inline-block rounded-sm" style={{ background: b.color }} /> {b.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--wr-text-muted)]">{b.range}</span>
                </div>
                <div className="mt-2 text-[15px] font-semibold tabular-nums">
                  {b.pages} pages <span className="text-[13px] font-normal text-[var(--wr-text-muted)]">({b.percent}%)</span>
                </div>
                <div className="mt-1 text-[12px]">
                  Avg AQS: <span className="tabular-nums font-medium">{Math.round((b.avgAqs || 0) * 10) / 10}%</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ModButton
                    variant="brand"
                    icon={<BrandPagesIcon />}
                    onClick={() => handleSegmentClick(b)}
                    ariaLabel="View pages in range"
                  >
                    View pages
                  </ModButton>

                  <ModButton
                    variant="outline"
                    icon={<ListTodo className="w-4 h-4 text-[var(--wr-text,#374151)]" />}
                    onClick={() => openTaskForBucket(b)}
                    ariaLabel="Create task"
                  >
                    Create Task
                  </ModButton>

                  <ModButton
                    variant="outline"
                    icon={<Filter className="w-4 h-4 text-[var(--wr-text,#374151)]" />}
                    onClick={() => {
                      setSelectedRange(b.range);
                      emitFilterEvent(b.range);
                    }}
                    ariaLabel="Filter to range"
                  >
                    Filter
                  </ModButton>
                </div>
              </div>
            ))}
          </div>

          {/* Meta footer */}
          <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--wr-text-muted)]">
            <div>Last updated: {new Date(data.lastUpdated).toLocaleString()}</div>
            <div>Total pages: <span className="tabular-nums">{total}</span></div>
          </div>
        </CardContent>
      </Card>

      <PriorityListModal
        open={!!modalBucket}
        bucket={modalBucket}
        onClose={() => setModalBucket(null)}
        onCreateTask={(bucket) => {
          openTaskForBucket(bucket);
          setModalBucket(null);
        }}
      />
    </div>
  );
}

function PriorityListModal({
  open,
  bucket,
  onClose,
  onCreateTask,
}: {
  open: boolean;
  bucket: Bucket | null;
  onClose: () => void;
  onCreateTask: (bucket: Bucket) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !bucket) return null;

  const pages = bucket.samplePages ?? [];

  return (
    <div className="fixed inset-0 z-50 font-sans" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-[var(--wr-overlay,rgba(17,24,39,0.6))]" onClick={onClose} />
      <div
        className="absolute right-4 top-4 w-[400px] max-w-[92vw] bg-white border shadow-xl"
        style={{ borderColor: "var(--wr-border-subtle,#EFF0F6)", borderRadius: "var(--wr-radius,8px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--wr-border,#E5E7EB)" }}>
          <div className="text-sm font-semibold text-[var(--wr-text-strong,#111827)]">
            {bucket.label} pages ({bucket.range})
          </div>
          <button
            type="button"
            className="p-1 rounded hover:bg-[var(--wr-bg-app,#F5F7FA)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 max-h-[320px] overflow-y-auto">
          <div className="text-xs uppercase tracking-wide text-[var(--wr-text-muted,#6B7280)]">
            Pages in range ({pages.length || bucket.pages})
          </div>
          <ul className="space-y-1 text-sm">
            {pages.length
              ? pages.map((page) => (
                  <li key={page}>
                    <a href={page} className="text-[var(--wr-action,#0077FF)] underline" target="_blank" rel="noreferrer">
                      {page}
                    </a>
                  </li>
                ))
              : (
                <li className="text-[var(--wr-text-muted,#6B7280)]">No page list available for this bucket.</li>
              )}
          </ul>
        </div>

        <div className="px-4 py-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: "var(--wr-border,#E5E7EB)" }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: "var(--wr-brand,#008CCD)", color: "#fff" }}
            onClick={() => onCreateTask(bucket)}
          >
            Create Task (bulk)
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Lightweight internal tests (console-only)
 * -------------------------------------------------------------------------------------------------*/
function expect(cond: boolean, name: string) {
  console[cond ? "log" : "error"](`TEST ${cond ? "PASS" : "FAIL"}: ${name}`);
}
(function runInternalTests() {
  expect(toPercent(50, 200) === 25, "toPercent: 50/200 -> 25%");
  expect(toPercent(0, 0) === 0, "toPercent: handles zero total");

  const totals = samplePayload.buckets.reduce((a, b) => a + b.pages, 0);
  const percents = samplePayload.buckets.map(b => toPercent(b.pages, totals));
  const sum = Math.round(percents.reduce((a, b) => a + b, 0));
  expect(Math.abs(sum - 100) <= 1, "Bucket percents approximately sum to 100");

  const poorBucket = samplePayload.buckets.find(b => b.label === "Poor");
  const poorPct = poorBucket ? toPercent(poorBucket.pages, samplePayload.totalPages) : 0;
  expect((poorPct > 10) === true, "Alert triggers when Poor > 10%");

  const csvRows = samplePayload.buckets.map(b => ({ range: b.range, label: b.label, pages: b.pages, percent: toPercent(b.pages, totals), avgAqs: b.avgAqs }));
  try {
    const headers = Object.keys(csvRows[0]);
    expect(headers.includes("range") && headers.includes("pages"), "CSV rows contain required headers");
  } catch {
    expect(false, "CSV generation logic is safe");
  }
})();
