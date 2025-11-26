"use client";

/* =============================================================================
   Section 5 — SERP Snapshot (Primary/Selected Keyword)
   -----------------------------------------------------------------------------
   • Inter / Inter Fallback fonts; no emoji
   • Latest tokens (aligned with recent designs)
   • Branded #008CCD icons for section title & actions
   • Modern chips + Filters + Export in the header
   • Pointer cursor on all interactive controls
   • Drop‑in React + Tailwind (no external UI deps)
   ============================================================================ */

import * as React from "react";
import {
  Search,
  Download,
  SlidersHorizontal,
  RefreshCw,
  Globe,
  ExternalLink,
  Maximize2,
  Info,
  Star,
  CircleHelp,
  PlaySquare,
  Image as ImageIcon,
  MapPin,
  Newspaper,
  Link as LinkIcon,
  ArrowUpRight,
  Check,
  X,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS (latest)
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  action: "#0077FF",
  pastelBlue: "#D9EEF8",

  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",

  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const fmt = (n: number) => new Intl.NumberFormat().format(n);

/* -----------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------*/
type SerpFeature = "FS" | "PAA" | "VIDEO" | "IMAGE" | "LOCAL" | "TOPSTORIES" | "SITELINKS";
type SerpRow = {
  rank: number;
  url: string;
  domain: string;
  title: string;
  h1Present: boolean;
  h2Count: number;
  h3Count: number;
  contentWords: number;
  lastUpdated: string | null;
  features: SerpFeature[];
  isMine?: boolean;
};
type MyPage = {
  url: string;
  title: string;
  h1Present: boolean;
  h2Count: number;
  h3Count: number;
  contentWords: number;
};

/* -----------------------------------------------------------------------------
 * Feature icons
 * ---------------------------------------------------------------------------*/
const FEATURE_ICON: Record<SerpFeature, React.ReactElement> = {
  FS: <Star className="h-3.5 w-3.5" color="#F59E0B" />,
  PAA: <CircleHelp className="h-3.5 w-3.5" color="#38BDF8" />,
  VIDEO: <PlaySquare className="h-3.5 w-3.5" color="#8B5CF6" />,
  IMAGE: <ImageIcon className="h-3.5 w-3.5" color="#EC4899" />,
  LOCAL: <MapPin className="h-3.5 w-3.5" color="#10B981" />,
  TOPSTORIES: <Newspaper className="h-3.5 w-3.5" color="#EF4444" />,
  SITELINKS: <LinkIcon className="h-3.5 w-3.5" color="#14B8A6" />,
};

/* -----------------------------------------------------------------------------
 * Utilities
 * ---------------------------------------------------------------------------*/
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const domainOf = (url: string) => {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const relTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Math.round((Date.now() - d) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff}d ago`;
};
const titleLen = (s: string) => [...s].length;
const RECOMMENDED_MIN = 55;
const RECOMMENDED_MAX = 62;
const titleBand = (len: number): "short" | "ok" | "long" =>
  len < RECOMMENDED_MIN ? "short" : len > RECOMMENDED_MAX ? "long" : "ok";

/* -----------------------------------------------------------------------------
 * Demo SERP generator (mock)
 * ---------------------------------------------------------------------------*/
function demoSerp(keyword: string): { rows: SerpRow[]; mine: MyPage } {
  const pool = [
    "The Ultimate SEO Checklist for 2025 (Free Template)",
    "SEO Writing Guide: How to Optimize Content in 12 Steps",
    "Technical SEO Audit: A Practical Step-by-Step Playbook",
    "Wranker Pricing & Plans — Compare Features",
    "On-Page SEO: Title, H1, H2 & Internal Linking Best Practices",
    "Semrush vs Ahrefs vs Wranker: Which SEO Tool Wins?",
    "Schema Markup (JSON-LD): Beginner to Advanced",
    "Image Alt Text for SEO: The Definitive Guide",
    "Local SEO: Complete Guide to Ranking in Google Maps",
    "YouTube SEO: Video Optimization Tips That Work",
  ];
  const rows: SerpRow[] = Array.from({ length: 10 }, (_, i) => {
    const t = pool[i % pool.length];
    const words = 1200 + Math.floor(Math.random() * 2200);
    const h2 = 6 + Math.floor(Math.random() * 10);
    const h3 = 4 + Math.floor(Math.random() * 12);
    const h1 = Math.random() > 0.08;
    const last = Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 120).toISOString() : null;
    const features = (["FS", "PAA", "VIDEO", "IMAGE", "LOCAL", "TOPSTORIES", "SITELINKS"] as SerpFeature[])
      .filter(() => Math.random() > 0.65)
      .slice(0, Math.random() > 0.7 ? 2 : 1);
    const url = `https://example${i + 1}.com/${keyword.replace(/\s+/g, "-")}`;
    return {
      rank: i + 1,
      url,
      domain: domainOf(url),
      title: t,
      h1Present: h1,
      h2Count: h2,
      h3Count: h3,
      contentWords: words,
      lastUpdated: last,
      features,
    };
  });
  const mineIdx = clamp(Math.floor(Math.random() * 10), 0, 9);
  rows[mineIdx].isMine = true;
  const mineRow = rows[mineIdx];
  return {
    rows,
    mine: {
      url: mineRow.url,
      title: mineRow.title,
      h1Present: mineRow.h1Present,
      h2Count: mineRow.h2Count,
      h3Count: mineRow.h3Count,
      contentWords: mineRow.contentWords,
    },
  };
}

/* -----------------------------------------------------------------------------
 * Small UI atoms (chips, segmented, modal, feature badge)
 * ---------------------------------------------------------------------------*/
function Chip({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "success" | "warning" | "danger" | "neutral" | "brand";
  children: React.ReactNode;
  title?: string;
}) {
  const map = {
    success: { bg: "#ECFDF3", fg: "#166534", bd: "#BBF7D0" },
    warning: { bg: "#FFFBEB", fg: "#92400E", bd: "#FDE68A" },
    danger: { bg: "#FEF2F2", fg: "#991B1B", bd: "#FECACA" },
    brand: { bg: TK.pastelBlue, fg: TK.brand, bd: "#B6E3FF" },
    neutral: { bg: "#F3F4F6", fg: "#374151", bd: "#E5E7EB" },
  }[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs"
      style={{ backgroundColor: map.bg, color: map.fg, borderColor: map.bd }}
    >
      {children}
    </span>
  );
}

function Segmented({
  value,
  items,
  onChange,
  aria,
}: {
  value: string;
  items: { label: string; value: string }[];
  onChange: (v: string) => void;
  aria?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={aria || "segmented"}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border, cursor: "pointer" }}
    >
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "h-8 rounded-full px-3 text-sm transition",
            value === it.value ? "bg-[#D9EEF8] font-medium" : "hover:bg-gray-100"
          )}
          style={{ cursor: "pointer" }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function FeatureBadges({ list }: { list: SerpFeature[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {list.length ? (
        list.slice(0, 4).map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700"
          >
            {FEATURE_ICON[f]}
            {f}
          </span>
        ))
      ) : (
        <span className="text-[12px] text-gray-400">—</span>
      )}
      {list.length > 4 && (
        <span className="rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700">
          +{list.length - 4}
        </span>
      )}
    </div>
  );
}

function SimpleModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      style={{ cursor: "pointer" }}
    >
      <div
        className="max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-[12px] border bg-white shadow-xl"
        style={{ borderColor: TK.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-3" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <Maximize2 size={16} color={TK.brand} />
            <div className="text-sm font-semibold" style={{ color: TK.text }}>
              {title}
            </div>
          </div>
          <button
            className="rounded px-2 py-1 text-sm hover:bg-gray-50"
            onClick={onClose}
            style={{ cursor: "pointer", color: TK.muted }}
          >
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-3">{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Mini‑diff vs your page
 * ---------------------------------------------------------------------------*/
function MiniDiff({ row, mine }: { row: SerpRow; mine: MyPage | null }) {
  if (!mine) return <span className="text-[12px] text-gray-400">—</span>;
  const myTitleLen = titleLen(mine.title);
  const cTitleLen = titleLen(row.title);
  const deltaTitle = cTitleLen - myTitleLen; // competitor - mine
  const deltaWords = row.contentWords - mine.contentWords;
  const myHeads = mine.h2Count + mine.h3Count;
  const cHeads = row.h2Count + row.h3Count;
  const headDelta = cHeads - myHeads;
  const myBand = titleBand(myTitleLen);
  const cBand = titleBand(cTitleLen);

  const ChipDiff = ({
    label,
    delta,
    posWhenLower = false,
  }: {
    label: string;
    delta: number;
    posWhenLower?: boolean; // for title length we don't strongly invert, just show diff
  }) => {
    const tone: "neutral" | "success" | "danger" =
      Math.abs(delta) < 1 ? "neutral" : (posWhenLower ? delta < 0 : delta < 0) ? "success" : "danger";
    return (
      <Chip tone={tone === "neutral" ? "neutral" : tone === "success" ? "success" : "danger"}>
        {label} {delta > 0 ? "+" : ""}{delta}
      </Chip>
    );
  };

  const bandChip =
    myBand === "ok" && cBand === "ok" ? (
      <Chip tone="neutral">Title ✓ 55–62</Chip>
    ) : cBand === "ok" && myBand !== "ok" ? (
      <Chip tone="warning">They hit 55–62</Chip>
    ) : myBand === "ok" && cBand !== "ok" ? (
      <Chip tone="success">You hit 55–62</Chip>
    ) : (
      <Chip tone="neutral">55–62: none</Chip>
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipDiff label="Title Δ" delta={deltaTitle} />
      <ChipDiff label="Content Δ" delta={deltaWords} />
      <ChipDiff label="Headings Δ" delta={headDelta} />
      {bandChip}
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * MAIN — SERP Snapshot
 * ---------------------------------------------------------------------------*/
export default function SerpSnapshot({
  keyword = "seo checklist",
  initialLocale = "en",
  providedRows,
  providedMine,
}: {
  keyword?: string;
  initialLocale?: "en" | "en-GB" | "de" | "fr" | "es";
  providedRows?: SerpRow[];
  providedMine?: MyPage | null;
}) {
  const seed = React.useMemo(() => demoSerp(keyword), [keyword]);
  const [locale, setLocale] = React.useState<"en" | "en-GB" | "de" | "fr" | "es">(initialLocale);
  const [rows, setRows] = React.useState<SerpRow[]>(() => providedRows ?? seed.rows);
  const [mine] = React.useState<MyPage | null>(() => providedMine ?? seed.mine);
  const [modalOpen, setModalOpen] = React.useState(false);

  const medianWords = React.useMemo(() => {
    const arr = rows.map((r) => r.contentWords).sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
  }, [rows]);

  const myRow = React.useMemo(() => rows.find((r) => r.isMine), [rows]);

  const openGoogle = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=${encodeURIComponent(locale)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const refreshDemo = () => {
    const s = demoSerp(keyword);
    setRows(s.rows);
  };

  const exportCSV = () => {
    const header = [
      "rank",
      "domain",
      "url",
      "title_len",
      "title_band",
      "h1",
      "h2_count",
      "h3_count",
      "content_words",
      "updated_rel",
      "features",
      "is_mine",
    ].join(",");
    const lines = rows
      .map((r) =>
        [
          r.rank,
          r.domain,
          r.url,
          titleLen(r.title),
          titleBand(titleLen(r.title)),
          r.h1Present ? "yes" : "no",
          r.h2Count,
          r.h3Count,
          r.contentWords,
          relTime(r.lastUpdated),
          r.features.join("|"),
          r.isMine ? "yes" : "no",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + "\n" + lines], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `serp_snapshot_${keyword.replace(/\s+/g, "_")}_${locale}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section
      className="rounded-[12px] border bg-white p-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="SERP Snapshot"
    >
      {/* Header */}
      <header
        className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2"
        style={{ borderColor: TK.border }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Search size={20} color={TK.brand} />
          <h2 className="truncate text-[18px] font-semibold" style={{ color: TK.text }}>
            SERP Snapshot
          </h2>
          <Chip tone="brand" title="Selected/primary keyword">
            {keyword}
          </Chip>
          <button
            type="button"
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            title="Top organic results for the selected keyword. Compare title length, content length, headings coverage and SERP features."
            aria-label="About SERP Snapshot"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={locale}
            onChange={(v) => setLocale(v as any)}
            aria="Locale"
            items={[
              { label: "en", value: "en" },
              { label: "en‑GB", value: "en-GB" },
              { label: "de", value: "de" },
              { label: "fr", value: "fr" },
              { label: "es", value: "es" },
            ]}
          />

          <button
            type="button"
            onClick={openGoogle}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.text }}
            aria-label="Open in Google"
            title="Open live Google results"
          >
            <Globe size={16} color={TK.brand} />
            Open in Google
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
            style={{ borderColor: TK.border, background: TK.brand, color: "#fff", cursor: "pointer" }}
            aria-label="Open full SERP"
            title="Open full SERP"
          >
            <Maximize2 size={16} />
            Full SERP
          </button>

          <button
            type="button"
            onClick={refreshDemo}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.text }}
            aria-label="Refresh demo"
            title="Refresh demo data"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.text }}
            aria-label="Filters"
            title="Filters"
          >
            <SlidersHorizontal size={16} color={TK.brand} />
            Filters
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.action }}
            aria-label="Export CSV"
            title="Export CSV"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* Mini summary bar */}
      <div
        className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border px-3 py-2 text-sm"
        style={{ borderColor: TK.borderLight, background: "#FAFAFA" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: TK.muted }}>
            Your page:
          </span>
          {myRow ? (
            <>
              <Chip tone="brand">Rank {myRow.rank}</Chip>
              <span style={{ color: TK.muted }}>•</span>
              <span>Title {titleLen(mine?.title ?? "")} chars</span>
              <span style={{ color: TK.muted }}>•</span>
              <span>Content {fmt(mine?.contentWords ?? 0)} words</span>
            </>
          ) : (
            <span className="text-[13px]" style={{ color: TK.muted }}>
              Not detected in top 10
            </span>
          )}
        </div>
        <div className="hidden sm:block text-[13px]" style={{ color: TK.muted }}>
          |
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px]" style={{ color: TK.muted }}>
            Peers (median top 10):
          </span>
          <span className="font-medium" style={{ color: TK.text }}>
            {fmt(medianWords)} words
          </span>
        </div>
      </div>

      {/* Snapshot table */}
      <div className="overflow-hidden rounded-[10px] border" style={{ borderColor: TK.borderLight }}>
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                <th className="w-[56px] px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  #
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  URL
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  <div className="inline-flex items-center gap-1">
                    Title (chars)
                    <Info size={14} className="text-[#9CA3AF]" aria-label="Recommended 55–62 characters. Chip indicates whether each result hits this band." />
                  </div>
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  H1
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  H2/H3
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  Content (words)
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  Updated
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  SERP Features
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  Mini‑diff vs you
                </th>
                <th className="w-[90px] px-3 py-2 text-right font-medium" style={{ color: TK.muted }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const len = titleLen(r.title);
                const band = titleBand(len);
                return (
                  <tr
                    key={r.rank}
                    className={cn("border-b", r.isMine ? "bg-[#F8FBFF]" : "hover:bg-[#F5F7FA]")}
                    style={{ borderColor: TK.borderLight }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: TK.text }}>
                      {r.rank}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline"
                          style={{ color: TK.action, cursor: "pointer" }}
                          title={r.url}
                        >
                          {r.domain} <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        {r.isMine && <Chip tone="brand">Your page</Chip>}
                      </div>
                      <div className="truncate text-[12px]" style={{ color: TK.muted }} title={r.title}>
                        {r.title}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-medium" style={{ color: TK.text }}>
                          {len}
                        </span>
                        {band === "ok" ? (
                          <Chip tone="neutral">✓ 55–62</Chip>
                        ) : band === "short" ? (
                          <Chip tone="warning">short</Chip>
                        ) : (
                          <Chip tone="warning">long</Chip>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {r.h1Present ? (
                        <span className="inline-flex items-center gap-1" style={{ color: "#047857" }}>
                          <Check className="h-4 w-4" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1" style={{ color: "#B91C1C" }}>
                          <X className="h-4 w-4" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ color: TK.text }}>
                      {r.h2Count}/{r.h3Count}
                    </td>
                    <td className="px-3 py-2" style={{ color: TK.text }}>
                      {fmt(r.contentWords)}
                    </td>
                    <td className="px-3 py-2" style={{ color: TK.text }}>
                      {relTime(r.lastUpdated)}
                    </td>
                    <td className="px-3 py-2">
                      <FeatureBadges list={r.features} />
                    </td>
                    <td className="px-3 py-2">
                      <MiniDiff row={r} mine={mine} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-sm hover:bg-[#F7FAFC]"
                        style={{ borderColor: TK.border, cursor: "pointer", color: TK.text }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer tips */}
      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px]" style={{ borderColor: TK.borderLight }}>
        <Info size={16} color={TK.gray} />
        <span style={{ color: TK.muted }}>
          Tips: keep titles in <b>55–62 chars</b>, ensure a single clear <b>H1</b>, and aim for content length around the{" "}
          <b>peer median</b> for parity.
        </span>
      </div>

      {/* Full SERP modal */}
      <SimpleModal open={modalOpen} onClose={() => setModalOpen(false)} title={`Full SERP — Top 10 for “${keyword}”`}>
        <div className="overflow-auto rounded-[10px] border" style={{ borderColor: TK.borderLight }}>
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b" style={{ borderColor: TK.borderLight }}>
                <th className="w-[60px] px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  #
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  URL
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  Title (chars)
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  H1
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  H2/H3
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  Words
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  Updated
                </th>
                <th className="px-3 py-2 font-medium" style={{ color: TK.muted }}>
                  SERP Features
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`full-${r.rank}`} className="border-b hover:bg-[#F5F7FA]" style={{ borderColor: TK.borderLight }}>
                  <td className="px-3 py-2 font-medium" style={{ color: TK.text }}>
                    {r.rank}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline"
                      style={{ color: TK.action, cursor: "pointer" }}
                      title={r.url}
                    >
                      {r.domain} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                    {r.isMine && <Chip tone="brand">Your page</Chip>}
                    <div className="truncate text-[12px]" style={{ color: TK.muted }} title={r.title}>
                      {r.title}
                    </div>
                  </td>
                  <td className="px-3 py-2" style={{ color: TK.text }}>
                    {titleLen(r.title)}{" "}
                    <span className="ml-1 text-[12px]" style={{ color: TK.muted }}>
                      {titleBand(titleLen(r.title)) === "ok" ? "✓ 55–62" : titleBand(titleLen(r.title))}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {r.h1Present ? (
                      <span className="inline-flex items-center gap-1" style={{ color: "#047857" }}>
                        <Check className="h-4 w-4" /> Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1" style={{ color: "#B91C1C" }}>
                        <X className="h-4 w-4" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ color: TK.text }}>
                    {r.h2Count}/{r.h3Count}
                  </td>
                  <td className="px-3 py-2" style={{ color: TK.text }}>
                    {fmt(r.contentWords)}
                  </td>
                  <td className="px-3 py-2" style={{ color: TK.text }}>
                    {relTime(r.lastUpdated)}
                  </td>
                  <td className="px-3 py-2">
                    <FeatureBadges list={r.features} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SimpleModal>
    </section>
  );
}
