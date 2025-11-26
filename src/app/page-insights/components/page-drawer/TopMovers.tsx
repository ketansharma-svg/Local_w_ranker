"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  BarChart3,
  ExternalLink,
  ClipboardList,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  Download,
  Info,
  ShoppingCart,
  CreditCard,
  Compass,
  BookOpen,
} from "lucide-react";

/* ───────────────────────── Latest tokens (aligned with recent sections) ───────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-action:#0077FF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-bg:#FFFFFF;
  --wr-card:#FFFFFF;
  --wr-success:#10B981;
  --wr-warning:#F59E0B;
  --wr-danger:#EF4444;
  --wr-info:#3B82F6;
  --wr-chip:#F5F7FA;
  --wr-radius:10px;
  --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);
  --wr-shadow-md:0 6px 18px rgba(17,24,39,.08);
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system,"Segoe UI",Roboto,Arial,"Helvetica Neue",sans-serif}
.wr-card{background:var(--wr-card);border:1px solid var(--wr-border);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm)}
.wr-header{border-bottom:1px solid var(--wr-borderLight)}
.wr-chip{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-border);background:#fff;font-size:12px}
.wr-chip[data-active="true"]{background:var(--wr-chip);box-shadow:inset 0 0 0 1px var(--wr-brand)}
.wr-filter-btn{display:inline-flex;align-items:center;gap:8px;height:30px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-border);background:#fff;font-size:12px}
.wr-pop{position:absolute;z-index:40;background:#fff;border:1px solid var(--wr-border);border-radius:10px;box-shadow:var(--wr-shadow-sm);padding:10px;min-width:220px}
.tabular-nums{font-variant-numeric:tabular-nums}
`}</style>
);

/* ───────────────────────── Types ───────────────────────── */
export type Intent = "Info" | "Commercial" | "Transactional" | "Nav";
export type MoverRow = {
  keyword: string;
  pos: number; // 1..100 or 999 if N/A
  delta7d: number;
  lastChangeISO?: string;
  clicks?: number | null;
  impressions?: number | null;
  volume?: number | null;
  intent: Intent;
};

/* ───────────────────────── Helpers ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);

function bandColor(pos: number) {
  if (pos > 0 && pos <= 10) return "var(--wr-success)";
  if (pos > 10 && pos <= 20) return "var(--wr-info)";
  return "#9CA3AF";
}

function Delta({ v, title }: { v: number; title?: string }) {
  const isZero = v === 0;
  const up = v > 0;
  const color = isZero ? "var(--wr-muted)" : up ? "var(--wr-success)" : "var(--wr-danger)";
  const Icon = isZero ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums" title={title} style={{ color }}>
      <Icon size={14} />
      {Math.abs(v)}
    </span>
  );
}

function intentMeta(intent: Intent) {
  switch (intent) {
    case "Info":
      return { icon: <BookOpen size={14} color="var(--wr-brand)" />, label: "Info" };
    case "Commercial":
      return { icon: <ShoppingCart size={14} color="var(--wr-brand)" />, label: "Commercial" };
    case "Transactional":
      return { icon: <CreditCard size={14} color="var(--wr-brand)" />, label: "Transactional" };
    case "Nav":
      return { icon: <Compass size={14} color="var(--wr-brand)" />, label: "Nav" };
  }
}

const useOutside = (open: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
};

/* ───────────────────────── Component ───────────────────────── */
export function TopMoversTable({
  rows,
  onOpenDrilldown,
  onAddTask,
  gscConnected = true,
  volumeConnected = true,
  className = "",
}: {
  rows: MoverRow[];
  onOpenDrilldown: (kw: string) => void;
  onAddTask?: (kw: string) => void;
  gscConnected?: boolean;
  volumeConnected?: boolean;
  className?: string;
}) {
  /* local view controls (modern chips + filter popover) */
  const [view, setView] = useState<"all" | "gainers" | "losers">("all");
  const [limit, setLimit] = useState<number>(5);
  const [onlyVolume, setOnlyVolume] = useState(false);
  const [onlyGSC, setOnlyGSC] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const popRef = useOutside(filtersOpen, () => setFiltersOpen(false));

  const filteredBase = useMemo(() => {
    let r = rows.slice();
    if (view === "gainers") r = r.filter((x) => x.delta7d > 0);
    if (view === "losers") r = r.filter((x) => x.delta7d < 0);
    if (onlyVolume) r = r.filter((x) => volumeConnected && x.volume != null);
    if (onlyGSC) r = r.filter((x) => gscConnected && x.clicks != null && x.impressions != null);
    return r;
  }, [rows, view, onlyVolume, onlyGSC, gscConnected, volumeConnected]);

  const data = useMemo(() => filteredBase.slice(0, Math.max(1, limit)), [filteredBase, limit]);

  const exportCSV = () => {
    const headers = ["Keyword", "Current Position", "Delta 7d", "Clicks", "Impressions", "Volume", "Intent"];
    const lines = data.map((r) =>
      [
        r.keyword,
        r.pos > 0 && r.pos < 999 ? `#${r.pos}` : "—",
        r.delta7d,
        r.clicks ?? "",
        r.impressions ?? "",
        r.volume ?? "",
        r.intent,
      ]
        .map((v) => JSON.stringify(v))
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-movers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <GlobalTokens />
      <section className={`wr-font wr-card mt-4 ${className}`} aria-label="Top Movers">
        {/* Header */}
        <div className="wr-header flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--wr-text)" }}>
            <BarChart3 size={16} color="var(--wr-brand)" />
            <span>Top Movers</span>
            {/* modern chips */}
            <div className="ml-2 flex items-center gap-2">
              <button
                type="button"
                className="wr-chip"
                data-active={view === "all"}
                onClick={() => setView("all")}
                title="All"
              >
                <span>All</span>
              </button>
              <button
                type="button"
                className="wr-chip"
                data-active={view === "gainers"}
                onClick={() => setView("gainers")}
                title="Gainers"
              >
                <ArrowUpRight size={14} color="var(--wr-success)" />
                <span>Gainers</span>
              </button>
              <button
                type="button"
                className="wr-chip"
                data-active={view === "losers"}
                onClick={() => setView("losers")}
                title="Losers"
              >
                <ArrowDownRight size={14} color="var(--wr-danger)" />
                <span>Losers</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              className="wr-filter-btn"
              onClick={() => setFiltersOpen((s) => !s)}
              title="Filters"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>
            <button
              type="button"
              className="wr-filter-btn"
              onClick={exportCSV}
              title="Export CSV"
            >
              <Download size={14} />
              <span>Export</span>
            </button>

            {/* Popover */}
            {filtersOpen && (
              <div ref={popRef} className="wr-pop right-0 top-10">
                <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--wr-muted)" }}>
                  Top Movers – Filters
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]">Limit</span>
                    <div className="flex items-center gap-1">
                      {[5, 10, 25].map((n) => (
                        <button
                          key={n}
                          className="wr-chip"
                          data-active={limit === n}
                          onClick={() => setLimit(n)}
                          title={`${n} rows`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center justify-between text-[13px]">
                    <span>Only rows with Volume</span>
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={onlyVolume}
                      onChange={(e) => setOnlyVolume(e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between text-[13px]">
                    <span>Only rows with GSC data</span>
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={onlyGSC}
                      onChange={(e) => setOnlyGSC(e.target.checked)}
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" className="wr-filter-btn" onClick={() => setFiltersOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs" style={{ color: "var(--wr-muted)" }}>
                <th className="px-3 py-2 font-medium">Keyword</th>
                <th className="px-3 py-2 font-medium">Current Pos.</th>
                <th className="px-3 py-2 font-medium">Δ vs 7d</th>
                <th className="px-3 py-2 font-medium">Clicks</th>
                <th className="px-3 py-2 font-medium">Impressions</th>
                <th className="px-3 py-2 font-medium">Volume</th>
                <th className="px-3 py-2 font-medium">Intent</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const serpUrl = `https://www.google.com/search?q=${encodeURIComponent(r.keyword)}`;
                const posText = r.pos > 0 && r.pos < 999 ? `#${r.pos}` : "—";
                const last = r.lastChangeISO
                  ? `Last change: ${new Date(`${r.lastChangeISO}T00:00:00`).toLocaleDateString()}`
                  : undefined;
                const intent = intentMeta(r.intent);

                return (
                  <tr key={r.keyword + i} className="hover:bg-[#F8FAFC]">
                    {/* Keyword (clickable) */}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-[13px] text-[color:var(--wr-action)] hover:underline cursor-pointer"
                        onClick={() => onOpenDrilldown(r.keyword)}
                        title="Open Keyword Drilldown"
                      >
                        {r.keyword}
                      </button>
                    </td>

                    {/* Position with band */}
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-1.5 rounded"
                          style={{ background: bandColor(r.pos) }}
                          aria-hidden
                        />
                        <span className="tabular-nums">{posText}</span>
                      </span>
                    </td>

                    {/* Delta */}
                    <td className="px-3 py-2">
                      <Delta v={r.delta7d} title={last} />
                    </td>

                    {/* Clicks */}
                    <td className="px-3 py-2 tabular-nums">
                      {gscConnected ? (r.clicks != null ? nf(r.clicks) : "—") : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Impressions */}
                    <td className="px-3 py-2 tabular-nums">
                      {gscConnected ? (r.impressions != null ? nf(r.impressions) : "—") : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-2 tabular-nums">
                      {volumeConnected ? (
                        r.volume != null ? nf(r.volume) : "—"
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <Lock size={14} />
                          Connect
                        </span>
                      )}
                    </td>

                    {/* Intent (chip with branded icon) */}
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
                        style={{ background: "var(--wr-chip)", color: "var(--wr-text)" }}
                        title={intent.label}
                      >
                        {intent.icon}
                        <span>{intent.label}</span>
                      </span>
                    </td>

                    {/* Actions (branded icons) */}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1.5"
                          style={{ borderColor: "var(--wr-borderLight)" }}
                          onClick={() => window.open(serpUrl, "_blank")}
                          title="Open SERP"
                        >
                          <ExternalLink className="h-3.5 w-3.5" color="var(--wr-brand)" />
                          SERP
                        </button>
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 cursor-pointer inline-flex items-center gap-1.5"
                          style={{ borderColor: "var(--wr-borderLight)" }}
                          onClick={() => onAddTask?.(r.keyword)}
                          title="Add Task"
                        >
                          <ClipboardList className="h-3.5 w-3.5" color="var(--wr-brand)" />
                          Task
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-sm"
                    style={{ color: "var(--wr-muted)" }}
                  >
                    No movers found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer CTA (kept) */}
        <div className="flex justify-end border-t px-3 py-2" style={{ borderColor: "var(--wr-borderLight)" }}>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: "var(--wr-brand)", color: "var(--wr-brand)" }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-keywords-tab"));
            }}
            title="Open Keywords Tab"
          >
            Open Keywords Tab
          </button>
        </div>
      </section>
    </>
  );
}

/* ───────────────────────── Optional demo (remove in prod) ───────────────────────── */
export function DemoTopMoversRightHalf() {
  const sample: MoverRow[] = [
    { keyword: "schema markup", pos: 16, delta7d: -9, lastChangeISO: "2025-08-09", clicks: 208, impressions: 2641, volume: 4400, intent: "Commercial" },
    { keyword: "core web vitals", pos: 31, delta7d: 9, clicks: 190, impressions: 4055, volume: 7230, intent: "Transactional" },
    { keyword: "keyword research", pos: 29, delta7d: 9, clicks: 73, impressions: 2706, volume: 5825, intent: "Transactional" },
    { keyword: "site audit", pos: 66, delta7d: -9, clicks: 82, impressions: 2258, volume: null, intent: "Info" },
    { keyword: "content optimization", pos: 27, delta7d: 9, clicks: 194, impressions: 3480, volume: 2669, intent: "Commercial" },
    { keyword: "rank tracker", pos: 56, delta7d: -9, clicks: 211, impressions: 2019, volume: 10910, intent: "Nav" },
  ];

  return (
      <TopMoversTable
        rows={sample}
        gscConnected={true}
        volumeConnected={true}
        onOpenDrilldown={(kw) => alert(`Open Keyword Drilldown → ${kw}`)}
        onAddTask={(kw) => alert(`Add task for "${kw}"`)}
      />

  );
}

export default DemoTopMoversRightHalf;
