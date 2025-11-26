"use client";
import React, { useMemo, useState } from "react";

/**
 * Wranker • OVI — Section 9: Top Organic Pages Driving Traffic
 *
 * REFINEMENTS APPLIED:
 * - Inter, Inter Fallback font stack
 * - No emoji
 * - Branded (#008CCD) icons for the section title + action buttons
 * - Pointer cursor on all clickable elements
 * - Colors from Wranker tokens (brand/success/danger/etc.)
 * - All table columns left-aligned
 *
 * Tailwind-only (no external deps). CSV export supported; PDF gated.
 */

/* ------------------------------ Types ------------------------------ */
type PageRow = {
  url: string;
  traffic: number; // monthly est
  trafficDeltaAbs?: number; // +/- absolute visits delta
  trafficDeltaPct?: number; // +/- %
  keywords: number; // Top 100 count
  backlinks?: number; // referring domains
  tooltipTopDomains?: string[]; // optional (for backlink tooltip)
};

type Props = {
  rows?: PageRow[]; // pass top 5 (or more, we'll show first 5)
  onViewAll?: () => void; // CTA
  onOpenPage?: (url: string) => void; // Page Insights drawer
  onOpenBacklinks?: (url: string) => void; // Backlink panel with filter
  onFilterKeywords?: (url: string) => void; // Keyword Trends filter by page
  onExportCSV?: (csv: string) => void; // override export hook (optional)
};

/* ------------------------------ Tokens ------------------------------ */
const TOKENS = {
  brand: "var(--wr-brand, #008CCD)",
  surface: "var(--wr-surface, #FFFFFF)",
  bgSubtle: "var(--wr-bg-subtle, #F5F7FA)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  success: "var(--wr-success, #2ECC71)",
  danger: "var(--wr-danger, #FF6B6B)",
  neutral: "var(--wr-neutral, #9CA3AF)",
  radius: "var(--wr-radius-lg, 16px)",
  shadow: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
};

/* ------------------------------ Inline Icons (brand-compatible) ------------------------------ */
const IconChevronDown = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={p.className || "h-4 w-4"} style={p.style}>
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
      clipRule="evenodd"
    />
  </svg>
);
const IconArrowUp = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={p.className || "h-3.5 w-3.5"} style={p.style}>
    <path d="M10 3l4 6H6l4-6zM6 17h8v-2H6v2z" />
  </svg>
);
const IconArrowDown = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={p.className || "h-3.5 w-3.5"} style={p.style}>
    <path d="M6 7h8V5H6v2zm4 12l-4-6h8l-4 6z" />
  </svg>
);
const IconExport = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={p.className || "h-4 w-4"} style={p.style}>
    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l4 4m-4-4L8 8M4 20h16" />
  </svg>
);
const IconHistory = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={p.className || "h-4 w-4"} style={p.style}>
    <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2m6-3a9 9 0 11-6-8.485" />
  </svg>
);
const IconTask = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={p.className || "h-4 w-4"} style={p.style}>
    <path
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
    />
  </svg>
);
/** Branded section title icon (window with bars) */
const IconTopPages = (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" className={p.className || "h-5 w-5"} style={p.style}>
    <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.7" />
    <path strokeWidth="1.7" d="M7 16v-3M11 16v-5M15 16v-2.5M19 8H5" />
  </svg>
);

/* ------------------------------ Utils ------------------------------ */
function fmt(n: number) {
  return n.toLocaleString();
}
function fmtPct(n?: number) {
  if (n === undefined || isNaN(n)) return "—";
  const s = (n > 0 ? "+" : "") + n.toFixed(1) + "%";
  return s;
}
function middleTruncate(url: string, max = 34) {
  if (url.length <= max) return url;
  const half = Math.floor((max - 3) / 2);
  return url.slice(0, half) + "..." + url.slice(-half);
}
function toCSV(rows: PageRow[]) {
  const head = ["Page URL", "Traffic", "Traffic Δ abs", "Traffic Δ %", "Keywords Ranked", "Backlinks"];
  const body = rows.map((r) =>
    [
      `"${r.url.replace(/"/g, '""')}"`,
      r.traffic,
      r.trafficDeltaAbs ?? "",
      r.trafficDeltaPct ?? "",
      r.keywords,
      r.backlinks ?? "",
    ].join(",")
  );
  return [head.join(","), ...body].join("\n");
}

/* ------------------------------ Component ------------------------------ */
type SortKey = "url" | "traffic" | "delta" | "keywords" | "backlinks";

export default function OVI_TopPages({
  rows = DEMO_ROWS,
  onViewAll,
  onOpenPage,
  onOpenBacklinks,
  onFilterKeywords,
  onExportCSV,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("traffic");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [exportOpen, setExportOpen] = useState(false);

  const maxKw = useMemo(() => Math.max(1, ...rows.map((r) => r.keywords)), [rows]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const sig = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "url":
          return sig * a.url.localeCompare(b.url);
        case "traffic":
          return sig * (a.traffic - b.traffic);
        case "delta":
          return sig * ((a.trafficDeltaPct ?? 0) - (b.trafficDeltaPct ?? 0));
        case "keywords":
          return sig * (a.keywords - b.keywords);
        case "backlinks":
          return sig * ((a.backlinks ?? 0) - (b.backlinks ?? 0));
      }
    });
    return copy.slice(0, 5);
  }, [rows, sortKey, sortDir]);

  function setSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "url" ? "asc" : "desc");
    }
  }

  function exportCSV() {
    const csv = toCSV(sorted);
    if (onExportCSV) {
      onExportCSV(csv);
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "top-pages.csv";
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <section
      className="w-full rounded-xl border mt-4"
      style={{
        borderColor: TOKENS.border,
        background: TOKENS.surface,
        boxShadow: TOKENS.shadow,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <IconTopPages style={{ color: TOKENS.brand }} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Top Organic Pages Driving Traffic
          </h3>
        </div>
        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            onClick={() => setExportOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            title="Export"
          >
            <IconExport style={{ color: TOKENS.brand }} />
            <span>Export</span>
            <IconChevronDown />
          </button>
          {exportOpen && (
            <div
              className="absolute right-0 z-10 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white text-sm shadow"
              style={{ borderColor: TOKENS.border }}
              role="menu"
            >
              <button className="block w-full px-3 py-2 text-left hover:bg-gray-50 cursor-pointer" onClick={exportCSV}>
                CSV (Table)
              </button>
              <button
                className="block w-full cursor-not-allowed px-3 py-2 text-left text-gray-400"
                title="Upgrade to export PDF"
                onClick={() => setExportOpen(false)}
                disabled
              >
                PDF (locked)
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Divider */}
      <div className="mx-4 my-3 border-t" style={{ borderColor: TOKENS.borderLight }} />

      {/* Desktop table */}
      <div className="hidden px-2 pb-4 md:block">
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: TOKENS.border }}>
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[var(--wr-bg-subtle,#F5F7FA)]">
              <tr className="text-[12px] text-[var(--wr-muted,#6B7280)]">
                <Th label="Page URL" onClick={() => setSort("url")} active={sortKey === "url"} dir={sortDir} />
                <Th label="Organic Traffic" onClick={() => setSort("traffic")} active={sortKey === "traffic"} dir={sortDir} />
                <Th label="Traffic Change" onClick={() => setSort("delta")} active={sortKey === "delta"} dir={sortDir} />
                <Th label="Keywords Ranked" onClick={() => setSort("keywords")} active={sortKey === "keywords"} dir={sortDir} />
                <Th label="Backlinks" onClick={() => setSort("backlinks")} active={sortKey === "backlinks"} dir={sortDir} />
                {/* Left-aligned actions header to meet the spec */}
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                const positive = (r.trafficDeltaPct ?? 0) > 0;
                const neutral = r.trafficDeltaPct === 0 || r.trafficDeltaPct === undefined;
                const kwPct = Math.max(0, Math.min(1, r.keywords / maxKw));
                return (
                  <tr
                    key={r.url + idx}
                    className="border-t transition-colors hover:bg-gray-50"
                    style={{ borderColor: TOKENS.borderLight }}
                  >
                    {/* URL */}
                    <td className="px-3 py-2 align-middle">
                      <button
                        className="max-w-[360px] truncate text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer"
                        title={r.url}
                        onClick={() => onOpenPage?.(r.url)}
                      >
                        {middleTruncate(r.url, 48)}
                      </button>
                    </td>

                    {/* Traffic */}
                    <td className="px-3 py-2 align-middle font-medium text-[var(--wr-text,#111827)]">{fmt(r.traffic)}</td>

                    {/* Delta */}
                    <td className="px-3 py-2 align-middle">
                      {neutral ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-[2px] text-[12px] text-gray-600">
                          —
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[12px]"
                          style={{
                            color: positive ? TOKENS.success : TOKENS.danger,
                            backgroundColor: positive ? "rgba(46,204,113,.12)" : "rgba(255,107,107,.12)",
                          }}
                          title={`${
                            r.trafficDeltaAbs ? (r.trafficDeltaAbs > 0 ? "+" : "") + fmt(r.trafficDeltaAbs) : ""
                          } (${fmtPct(r.trafficDeltaPct)}) vs previous period`}
                        >
                          {positive ? <IconArrowUp /> : <IconArrowDown />}
                          {r.trafficDeltaAbs && r.trafficDeltaAbs !== 0 ? (r.trafficDeltaAbs > 0 ? "+" : "") + fmt(r.trafficDeltaAbs) : ""}
                          <span>{fmtPct(r.trafficDeltaPct)}</span>
                        </span>
                      )}
                    </td>

                    {/* Keywords Ranked (mini bar) */}
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 w-24 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full" style={{ width: `${kwPct * 100}%`, background: TOKENS.brand }} />
                        </div>
                        <button
                          className="text-[13px] text-[var(--wr-text,#111827)] hover:underline cursor-pointer"
                          title="Show keywords ranked for this page"
                          onClick={() => onFilterKeywords?.(r.url)}
                        >
                          {fmt(r.keywords)}
                        </button>
                      </div>
                    </td>

                    {/* Backlinks */}
                    <td className="px-3 py-2 align-middle">
                      <button
                        className="rounded px-1.5 py-0.5 text-[13px] text-[var(--wr-text,#111827)] hover:underline cursor-pointer"
                        title={
                          r.tooltipTopDomains?.length
                            ? `Top ref. domains:\n- ${r.tooltipTopDomains.slice(0, 3).join("\n- ")}`
                            : "Open referring domains"
                        }
                        onClick={() => onOpenBacklinks?.(r.url)}
                      >
                        {fmt(r.backlinks ?? 0)}
                      </button>
                    </td>

                    {/* Row actions — left-aligned per spec */}
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] text-gray-700 transition hover:bg-gray-50 cursor-pointer"
                          style={{ borderColor: TOKENS.border }}
                          title="Open rank history"
                          onClick={() => onFilterKeywords?.(r.url)}
                        >
                          <span style={{ color: TOKENS.brand }}>
                            <IconHistory />
                          </span>
                          <span>Rank History</span>
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] text-gray-700 transition hover:bg-gray-50 cursor-pointer"
                          style={{ borderColor: TOKENS.border }}
                          title="Create task"
                          onClick={() => console.log("Create Task:", r.url)}
                        >
                          <span style={{ color: TOKENS.brand }}>
                            <IconTask />
                          </span>
                          <span>Create Task</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!sorted.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[13px]" style={{ color: TOKENS.muted }}>
                    Nothing to show for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile accordion */}
      <div className="px-4 pb-4 md:hidden">
        <ul className="space-y-2">
          {sorted.map((r, idx) => {
            const positive = (r.trafficDeltaPct ?? 0) > 0;
            const kwPct = Math.max(0, Math.min(1, r.keywords / maxKw));
            return (
              <li key={r.url + idx} className="rounded-lg border bg-white" style={{ borderColor: TOKENS.border }}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
                    <button
                      className="truncate text-[14px] font-medium text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer"
                      title={r.url}
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenPage?.(r.url);
                      }}
                    >
                      {middleTruncate(r.url, 36)}
                    </button>
                    <span className="shrink-0 text-[13px] font-semibold" style={{ color: TOKENS.text }}>
                      {fmt(r.traffic)}
                    </span>
                  </summary>
                  <div className="space-y-2 px-3 pb-3 text-left text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Traffic Δ</span>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-[2px]"
                        style={{
                          color: (r.trafficDeltaPct ?? 0) === 0 ? TOKENS.neutral : positive ? TOKENS.success : TOKENS.danger,
                          backgroundColor:
                            (r.trafficDeltaPct ?? 0) === 0
                              ? "rgba(156,163,175,.12)"
                              : positive
                              ? "rgba(46,204,113,.12)"
                              : "rgba(255,107,107,.12)",
                        }}
                        title={`${
                          r.trafficDeltaAbs ? (r.trafficDeltaAbs > 0 ? "+" : "") + fmt(r.trafficDeltaAbs) : ""
                        } (${fmtPct(r.trafficDeltaPct)}) vs previous period`}
                      >
                        {positive ? <IconArrowUp /> : <IconArrowDown />}
                        {fmtPct(r.trafficDeltaPct)}
                      </span>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-gray-500">Keywords Ranked</span>
                        <button
                          className="text-[var(--wr-brand,#008CCD)] hover:underline cursor-pointer"
                          onClick={() => onFilterKeywords?.(r.url)}
                        >
                          {fmt(r.keywords)}
                        </button>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-gray-100">
                        <div className="h-2 rounded-full" style={{ width: `${kwPct * 100}%`, background: TOKENS.brand }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Backlinks</span>
                      <button
                        className="text-[var(--wr-text,#111827)] hover:underline cursor-pointer"
                        onClick={() => onOpenBacklinks?.(r.url)}
                        title={
                          r.tooltipTopDomains?.length
                            ? `Top ref. domains:\n- ${r.tooltipTopDomains.slice(0, 3).join("\n- ")}`
                            : "Open referring domains"
                        }
                      >
                        {fmt(r.backlinks ?? 0)}
                      </button>
                    </div>

                    <div className="flex items-center justify-start gap-2 pt-2">
                      <button
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] transition hover:bg-gray-50 cursor-pointer"
                        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                        onClick={() => onFilterKeywords?.(r.url)}
                        title="Open rank history"
                      >
                        <span style={{ color: TOKENS.brand }}>
                          <IconHistory />
                        </span>
                        <span>Rank History</span>
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[12px] transition hover:bg-gray-50 cursor-pointer"
                        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                        onClick={() => console.log("Create Task:", r.url)}
                        title="Create task"
                      >
                        <span style={{ color: TOKENS.brand }}>
                          <IconTask />
                        </span>
                        <span>Create Task</span>
                      </button>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
          {!sorted.length && (
            <li className="px-2 py-8 text-center text-[13px]" style={{ color: TOKENS.muted }}>
              Nothing to show for the selected period.
            </li>
          )}
        </ul>
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-end gap-3 border-t px-4 py-3" style={{ borderColor: TOKENS.borderLight }}>
        <button
          className="rounded-md border px-3 py-1.5 text-[13px] transition hover:bg-gray-50 cursor-pointer"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
          onClick={onViewAll}
          title="View all pages"
        >
          View All Pages
        </button>
      </div>
    </section>
  );
}

/* ------------------------------ Header cell with sort affordance ------------------------------ */
function Th({
  label,
  onClick,
  active,
  dir,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  return (
    <th className="select-none px-3 py-2 font-medium">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[12px] text-[var(--wr-muted,#6B7280)] hover:underline cursor-pointer"
        title="Sort"
      >
        <span>{label}</span>
        {active && (
          <span className="inline-block rounded bg-gray-100 px-1 text-[10px] text-gray-600">{dir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}

/* ------------------------------ Demo data (safe to remove in integration) ------------------------------ */
const DEMO_ROWS: PageRow[] = [
  {
    url: "/blog/seo-checklist",
    traffic: 5420,
    trafficDeltaAbs: 280,
    trafficDeltaPct: 5.4,
    keywords: 96,
    backlinks: 58,
    tooltipTopDomains: ["moz.com", "ahrefs.com", "news.ycombinator.com"],
  },
  { url: "/pricing", traffic: 1670, trafficDeltaAbs: 90, trafficDeltaPct: 3.8, keywords: 34, backlinks: 21, tooltipTopDomains: ["producthunt.com", "g2.com"] },
  { url: "/comparison", traffic: 1440, trafficDeltaAbs: -60, trafficDeltaPct: -4.0, keywords: 28, backlinks: 18 },
  { url: "/blog/internal-linking", traffic: 1320, trafficDeltaAbs: 120, trafficDeltaPct: 10.0, keywords: 52, backlinks: 31 },
  { url: "/login", traffic: 920, trafficDeltaAbs: -10, trafficDeltaPct: -1.1, keywords: 11, backlinks: 6 },
];
