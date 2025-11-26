"use client";

import React from "react";
import {
  Star,
  HelpCircle,
  Image as ImageIcon,
  Video,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  ClipboardPlus,
  ExternalLink,
  Download,
} from "lucide-react";

/** ============================================================================
 * Tab 1: Overview · Section 3 — Top Performing Keywords
 * Refinements:
 * - Inter / Inter Fallback font stack
 * - No emoji
 * - Branded (#008CCD) icons for section title & actions
 * - Pointer cursor on all clickable elements
 * - Action icons visible by default; add subtle hover animation
 * - Modern chip/button styling consistent with recent designs
 * ========================================================================== */

const TOKENS = {
  brand: "#008CCD",
  borderLight: "#EFF0F6",
  text: "#111827",
  muted: "#6B7280",
  up: "#10B981",
  down: "#EF4444",
  neutral: "#9CA3AF",
  chipBg: "#F5F7FA",
};

type TrendDir = "up" | "down" | "none";
type SerpType = "FS" | "PAA" | "Video" | "Image";

export type KeywordRow = {
  keyword: string;
  position: number;
  positionDelta?: number;
  positionDir?: TrendDir;
  serp?: { type: SerpType; linked: boolean }[];
  traffic: number;
  trafficShare: number; // 0..1
  volume: number;
  url: string;
};

export type TopKeywordsTableProps = {
  rows?: KeywordRow[];
  onKeywordClick?: (kw: KeywordRow) => void;
  onPageClick?: (kw: KeywordRow) => void;
  onRankHistory?: (kw: KeywordRow) => void;
  onAssignTask?: (kw: KeywordRow) => void;
  onViewAll?: () => void;
  onExport?: (rows: KeywordRow[]) => void;
  sectionTitle?: string;
  showExport?: boolean;
};

/* ----------------------- Utils ----------------------- */
const fmtNum = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtPct = (p: number) => `${(p * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const truncateMiddle = (input: string, max = 48) => {
  if (!input || input.length <= max) return input;
  const half = Math.floor((max - 1) / 2);
  return input.slice(0, half) + "…" + input.slice(input.length - half);
};
const cls = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

const serpLabel: Record<SerpType, string> = {
  FS: "Featured Snippet",
  PAA: "People Also Ask",
  Video: "Video",
  Image: "Image Pack",
};

const SerpBadge: React.FC<{ type: SerpType; linked: boolean }> = ({ type, linked }) => {
  const Icon = type === "FS" ? Star : type === "PAA" ? HelpCircle : type === "Video" ? Video : ImageIcon;
  const base =
    type === "FS"
      ? "bg-emerald-50 text-emerald-700"
      : type === "PAA"
      ? "bg-blue-50 text-blue-700"
      : type === "Video"
      ? "bg-violet-50 text-violet-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      title={`${serpLabel[type]} — ${linked ? "Linked to your domain" : "Not linked"}`}
      className={cls(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium border",
        base,
        "border-gray-200"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{type}</span>
      <span
        className={cls(
          "ml-0.5 inline-flex h-1.5 w-1.5 rounded-full",
          linked ? "bg-emerald-500" : "bg-gray-300"
        )}
        aria-label={linked ? "Linked" : "Not linked"}
      />
    </span>
  );
};

const TrendIcon: React.FC<{ dir?: TrendDir }> = ({ dir = "none" }) => {
  if (dir === "up") return <ArrowUpRight className="w-4 h-4" color={TOKENS.up} />;
  if (dir === "down") return <ArrowDownRight className="w-4 h-4" color={TOKENS.down} />;
  return <Minus className="w-4 h-4" color={TOKENS.neutral} />;
};

const exportToCsv = (rows: KeywordRow[], filename = "top_keywords.csv") => {
  const header = ["Keyword", "Position", "Position Δ", "SERP Features", "Traffic", "Traffic %", "Volume", "Page URL"];
  const csvLines = [header.join(",")];

  rows.forEach((r) => {
    const features = (r.serp ?? [])
      .map((s) => `${serpLabel[s.type]}${s.linked ? " (linked)" : ""}`)
      .join(" | ");
    const positionDelta =
      typeof r.positionDelta === "number" ? (r.positionDir === "down" ? `-${Math.abs(r.positionDelta)}` : r.positionDelta) : "";
    csvLines.push(
      [
        `"${r.keyword.replace(/"/g, '""')}"`,
        r.position,
        positionDelta,
        `"${features.replace(/"/g, '""')}"`,
        r.traffic,
        `${(r.trafficShare * 100).toFixed(1)}%`,
        r.volume,
        `"${r.url.replace(/"/g, '""')}"`,
      ].join(",")
    );
  });

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/* ----------------------- Demo rows ----------------------- */
const DEMO_ROWS: KeywordRow[] = [
  {
    keyword: "seo company in jaipur",
    position: 4,
    positionDelta: 3,
    positionDir: "up",
    serp: [
      { type: "FS", linked: false },
      { type: "PAA", linked: true },
      { type: "Image", linked: false },
    ],
    traffic: 1320,
    trafficShare: 0.214,
    volume: 5400,
    url: "https://w3era.com/services/seo-company-in-jaipur/",
  },
  {
    keyword: "technical seo checklist",
    position: 9,
    positionDelta: 1,
    positionDir: "up",
    serp: [
      { type: "PAA", linked: true },
      { type: "Video", linked: false },
    ],
    traffic: 880,
    trafficShare: 0.143,
    volume: 3600,
    url: "https://w3era.com/blog/technical-seo-checklist-2025/",
  },
  {
    keyword: "internal linking best practices",
    position: 12,
    positionDelta: 4,
    positionDir: "down",
    serp: [{ type: "Image", linked: false }],
    traffic: 620,
    trafficShare: 0.101,
    volume: 2400,
    url: "https://w3era.com/blog/internal-linking-best-practices/",
  },
  {
    keyword: "featured snippet optimization",
    position: 6,
    positionDelta: 0,
    positionDir: "none",
    serp: [
      { type: "FS", linked: true },
      { type: "PAA", linked: true },
    ],
    traffic: 560,
    trafficShare: 0.091,
    volume: 1900,
    url: "https://w3era.com/blog/featured-snippet-optimization/",
  },
  {
    keyword: "schema markup generator",
    position: 11,
    positionDelta: 2,
    positionDir: "up",
    serp: [{ type: "Video", linked: true }],
    traffic: 480,
    trafficShare: 0.078,
    volume: 2900,
    url: "https://w3era.com/tools/schema-markup-generator/",
  },
];

/* ----------------------- Component ----------------------- */
export const TopKeywordsTableOVI: React.FC<TopKeywordsTableProps> = ({
  rows = DEMO_ROWS,
  onKeywordClick = (r) => console.log("Keyword clicked:", r.keyword),
  onPageClick = (r) => window.open(r.url, "_blank"),
  onRankHistory = (r) => console.log("Rank history:", r.keyword),
  onAssignTask = (r) => console.log("Assign task for:", r.keyword),
  onViewAll = () => console.log("View All → Keyword Trends"),
  onExport,
  sectionTitle = "Top Performing Keywords",
  showExport = true,
}) => {
  const data = Array.isArray(rows) ? rows : [];

  const handleExport = () => {
    exportToCsv(data);
    onExport?.(data);
  };

  return (
    <section
      className="w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5" color={TOKENS.brand} />
          <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">{sectionTitle}</h3>
        </div>

        {showExport && (
          <div className="relative">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm transition hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2"
              style={{ borderColor: TOKENS.borderLight, color: TOKENS.text, cursor: "pointer", colorAdjust: TOKENS.brand as any }}
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="w-4 h-4" color={TOKENS.brand} />
              Export
            </button>
          </div>
        )}
      </div>

      {/* Table (desktop / tablet) */}
      <div
        className="hidden md:block rounded-xl border bg-white"
        style={{ borderColor: TOKENS.borderLight }}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[#FAFCFE]">
              <tr className="text-left text-[#111827]">
                <th className="px-4 py-3 font-medium">Keyword</th>
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">SERP Features</th>
                <th className="px-4 py-3 font-medium">Traffic</th>
                <th className="px-4 py-3 font-medium">Traffic %</th>
                <th className="px-4 py-3 font-medium">Volume</th>
                <th className="px-4 py-3 font-medium">Page URL</th>
                <th className="px-2 py-3 text-right font-medium w-[88px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[#6B7280]">
                    No keywords available for the selected filters.
                  </td>
                </tr>
              )}

              {data.map((row, idx) => {
                const delta = typeof row.positionDelta === "number" ? Math.abs(row.positionDelta) : 0;

                return (
                  <tr
                    key={`${row.keyword}-${idx}`}
                    className="group border-t hover:bg-[#F9FBFD] transition-colors"
                    style={{ borderColor: TOKENS.borderLight }}
                  >
                    {/* Keyword */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onKeywordClick(row)}
                        className="text-[14px] font-semibold text-[#111827] hover:underline cursor-pointer"
                        title="Open Keyword Analyzer"
                        aria-label={`Analyze keyword ${row.keyword}`}
                      >
                        {row.keyword}
                      </button>
                    </td>

                    {/* Position (+ trend) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center h-7 min-w-[36px] px-2 rounded bg-[#F5F7FA] font-semibold">
                          {row.position}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px]">
                          <TrendIcon dir={row.positionDir} />
                          {row.positionDir === "none" ? (
                            <span className="text-[#9CA3AF]">—</span>
                          ) : (
                            <span
                              className={cls(
                                "font-medium",
                                row.positionDir === "up" ? "text-[#16A34A]" : "text-[#DC2626]"
                              )}
                            >
                              {row.positionDir === "down" ? `-${delta}` : `+${delta}`}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* SERP Features */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(row.serp ?? []).slice(0, 3).map((s, i) => (
                          <SerpBadge key={`${row.keyword}-sf-${i}`} type={s.type} linked={s.linked} />
                        ))}
                        {row.serp && row.serp.length > 3 && (
                          <span
                            title={`${row.serp.length - 3} more features`}
                            className="px-1.5 py-0.5 text-[11px] rounded-full bg-[#F3F4F6] text-[#374151] border border-gray-200"
                          >
                            +{row.serp.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Traffic */}
                    <td className="px-4 py-3 whitespace-nowrap">{fmtNum(row.traffic)}</td>

                    {/* Traffic % (mini bar) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="relative h-2 w-24 rounded-full bg-[#EEF2F7] overflow-hidden"
                          title={`Share of total traffic: ${fmtPct(row.trafficShare)}`}
                        >
                          <div
                            className="absolute left-0 top-0 h-full rounded-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, row.trafficShare * 100))}%`,
                              backgroundColor: TOKENS.brand,
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-[#374151]">{fmtPct(row.trafficShare)}</span>
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="px-4 py-3 whitespace-nowrap">{fmtNum(row.volume)}</td>

                    {/* Page URL */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onPageClick(row)}
                        className="inline-flex items-center gap-1 text-[#008CCD] hover:underline cursor-pointer"
                        title={row.url}
                        aria-label={`Open page ${row.url}`}
                      >
                        {truncateMiddle(row.url)}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Actions — visible by default; animated on hover */}
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded transition hover:bg-[#F3F4F6] hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none focus-visible:ring-2"
                          style={{ cursor: "pointer", colorAdjust: TOKENS.brand as any }}
                          title="View Rank History"
                          aria-label="View Rank History"
                          onClick={() => onRankHistory(row)}
                        >
                          <BarChart3 className="w-4 h-4" color={TOKENS.brand} />
                        </button>
                        <button
                          className="p-1.5 rounded transition hover:bg-[#F3F4F6] hover:-translate-y-0.5 hover:scale-105 focus-visible:outline-none focus-visible:ring-2"
                          style={{ cursor: "pointer", colorAdjust: TOKENS.brand as any }}
                          title="Assign Task"
                          aria-label="Assign Task"
                          onClick={() => onAssignTask(row)}
                        >
                          <ClipboardPlus className="w-4 h-4" color={TOKENS.brand} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer: View All */}
        <div
          className="flex items-center justify-end px-4 py-3 border-t"
          style={{ borderColor: TOKENS.borderLight }}
        >
          <button
            type="button"
            onClick={onViewAll}
            className="h-9 px-3 rounded-md text-sm font-medium text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: TOKENS.brand, cursor: "pointer", colorAdjust: TOKENS.brand as any }}
            title="Open full Keyword Trends table sorted by Traffic DESC"
          >
            View All
          </button>
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && (
          <div
            className="border rounded-xl p-4 text-[#6B7280] bg-white"
            style={{ borderColor: TOKENS.borderLight }}
          >
            No keywords available for the selected filters.
          </div>
        )}

        {data.map((row, idx) => (
          <div
            key={`m-${row.keyword}-${idx}`}
            className="border rounded-xl bg-white"
            style={{ borderColor: TOKENS.borderLight }}
          >
            <button
              type="button"
              className="w-full flex items-start justify-between gap-3 p-4 cursor-pointer"
              onClick={() => onKeywordClick(row)}
              title="Open Keyword Analyzer"
              aria-label={`Analyze keyword ${row.keyword}`}
            >
              <div className="text-left">
                <div className="text-[14px] font-semibold text-[#111827]">{row.keyword}</div>
                <div className="mt-1 flex items-center gap-2 text-[12px] text-[#6B7280]">
                  <span className="inline-flex items-center gap-1">
                    Pos:
                    <span className="inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 rounded bg-[#F5F7FA] font-semibold text-[#111827]">
                      {row.position}
                    </span>
                    <span className="inline-flex items-center gap-1 ml-1">
                      <TrendIcon dir={row.positionDir} />
                      {row.positionDir === "none"
                        ? "—"
                        : `${row.positionDir === "down" ? "-" : "+"}${Math.abs(row.positionDelta ?? 0)}`}
                    </span>
                  </span>
                  <span>• Traffic: {fmtNum(row.traffic)} ({fmtPct(row.trafficShare)})</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(row.serp ?? []).slice(0, 3).map((s, i) => (
                    <SerpBadge key={`${row.keyword}-m-sf-${i}`} type={s.type} linked={s.linked} />
                  ))}
                </div>
              </div>
              <div className="shrink-0 pt-0.5">
                <ExternalLink className="w-4 h-4" color={TOKENS.brand} />
              </div>
            </button>

            <div className="px-4 pb-4 pt-0">
              <div className="flex items-center gap-2">
                <div
                  className="relative h-2 w-full rounded-full bg-[#EEF2F7] overflow-hidden"
                  title={`Share of total traffic: ${fmtPct(row.trafficShare)}`}
                >
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, row.trafficShare * 100))}%`,
                      backgroundColor: TOKENS.brand,
                    }}
                  />
                </div>
                <span className="text-[12px] text-[#374151]">{fmtPct(row.trafficShare)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[12px] text-[#6B7280]">
                <span>
                  Vol: <strong className="text-[#111827]">{fmtNum(row.volume)}</strong>
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-[#F8FAFC] cursor-pointer"
                  style={{ borderColor: TOKENS.borderLight }}
                  onClick={() => onPageClick(row)}
                  title={row.url}
                  aria-label={`Open page ${row.url}`}
                >
                  Open Page
                  <ExternalLink className="w-3.5 h-3.5" color={TOKENS.brand} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border transition hover:bg-[#F3F4F6] hover:-translate-y-0.5 hover:scale-105 cursor-pointer"
                  style={{ borderColor: TOKENS.borderLight }}
                  onClick={() => onRankHistory(row)}
                  title="View Rank History"
                  aria-label="View Rank History"
                >
                  <BarChart3 className="w-4 h-4" color={TOKENS.brand} />
                  <span className="text-[12px] text-[#111827]">History</span>
                </button>
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border transition hover:bg-[#F3F4F6] hover:-translate-y-0.5 hover:scale-105 cursor-pointer"
                  style={{ borderColor: TOKENS.borderLight }}
                  onClick={() => onAssignTask(row)}
                  title="Assign Task"
                  aria-label="Assign Task"
                >
                  <ClipboardPlus className="w-4 h-4" color={TOKENS.brand} />
                  <span className="text-[12px] text-[#111827]">Task</span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* View All CTA (mobile) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onViewAll}
            className="w-full h-10 rounded-md text-sm font-medium text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: TOKENS.brand, cursor: "pointer", colorAdjust: TOKENS.brand as any }}
            title="Open full Keyword Trends table sorted by Traffic DESC"
          >
            View Full Table
          </button>
        </div>
      </div>
    </section>
  );
};

/* ----------------------- Demo Wrapper ----------------------- */
export default function DemoTopKeywordsSection() {
  return (
    <div className="w-full rounded-xl border bg-white p-4 sm:p-5 mt-4">
      <TopKeywordsTableOVI />
    </div>
  );
}
