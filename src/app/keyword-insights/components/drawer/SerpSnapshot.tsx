"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ExternalLink,
  ClipboardList,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DemoSerpPreviewModal, { SerpPreviewModal } from "./SerpPreview";

/* ─────────────────────────── TOKENS ─────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  chipBg: "#F5F7FA",
  bg: "#FFFFFF",
  hover: "#FAFAFA",
  coreBlue: "#4286F5",
  coreBlueFill: "#BDD6FF",
  youTint: "#D9EEF8",
  compTint: "#FCEBB8",
  brown: "#7C3E0C",
  radius: 8,
};

/* ─────────────────────────── UTILS ─────────────────────────── */
type Device = "desktop" | "mobile";

function formatTimeAgo(iso?: string) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url, "https://dummy.base"); // supports relative
    return (u.host || "").replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0].split("?")[0].replace(/^www\./, "");
  }
}

function monoFromDomain(d: string) {
  const c = (d || "?").trim().charAt(0).toUpperCase();
  return c || "•";
}

/* ─────────────────────────── TYPES ─────────────────────────── */
export interface SerpItem {
  rank: number; // 0 ⇒ Featured Snippet badge, else 1..N
  title: string;
  url: string;
  snippet?: string;
  featured?: boolean;
  lastChecked?: string;
}

export interface DrilldownSerpSnapshotProps {
  keyword: string;
  device: Device;
  locationISO: string; // e.g. "US"
  lastFetchedISO?: string;
  projectDomain: string; // e.g. "wranker.com"
  competitorDomains?: string[];
  results: SerpItem[];
  isPremium?: boolean; // premium: Top 5 + expand to 10; free: Top 3 only
  onOpenFullSerp?: () => void;
  onAssignTask?: (payload: { keyword: string; url: string; rank: number }) => void;
}

/* ─────────────────────────── SMALL UI PRIMITIVES ─────────────────────────── */
const Chip = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <span
    title={title}
    className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px]"
    style={{ borderColor: TK.border, background: TK.chipBg, color: "#374151" }}
  >
    {children}
  </span>
);

const Badge = ({
  children,
  tone = "default",
  title,
}: {
  children: React.ReactNode;
  tone?: "you" | "competitor" | "featured" | "default";
  title?: string;
}) => {
  const cls =
    tone === "you"
      ? { bg: TK.youTint, extra: `border-l-4`, borderColor: TK.coreBlue }
      : tone === "competitor"
      ? { bg: TK.compTint, extra: "", borderColor: "transparent" }
      : tone === "featured"
      ? { bg: TK.brown, extra: "text-white", borderColor: "transparent" }
      : { bg: TK.chipBg, extra: "", borderColor: "transparent" };
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${cls.extra}`}
      style={{
        background: cls.bg,
        borderColor: cls.borderColor,
        borderWidth: cls.extra ? 0 : 0,
      }}
    >
      {children}
    </span>
  );
};

const IconButton = ({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="inline-flex h-8 w-8 items-center justify-center rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 hover:bg-gray-50"
    style={{ borderColor: TK.border }}
  >
    {children}
  </button>
);

const GhostButton = ({
  title,
  onClick,
  children,
}: {
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 hover:bg-gray-50"
    style={{ borderColor: TK.border, background: "#fff" }}
  >
    {children}
  </button>
);

const PrimaryButton = ({
  title,
  onClick,
  children,
}: {
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1"
    style={{ background: TK.brand }}
  >
    {children}
  </button>
);

/* ─────────────────────────── SECTION ─────────────────────────── */
export function DrilldownSerpSnapshot({
  keyword,
  device,
  locationISO,
  lastFetchedISO,
  projectDomain,
  competitorDomains = [],
  results,
  isPremium = true,
  onOpenFullSerp,
  onAssignTask,
}: DrilldownSerpSnapshotProps) {
  const [expanded, setExpanded] = useState(false);

  const limits = useMemo(
    () => (isPremium ? { initial: 5, max: 10 } : { initial: 3, max: 3 }),
    [isPremium]
  );

  const visible = useMemo(() => {
    const withDomain = results.map((r) => ({ ...r, domain: domainFromUrl(r.url) }));
    return withDomain.slice(0, expanded ? limits.max : limits.initial);
  }, [results, expanded, limits]);

  const [drawerRow, setDrawerRow] = useState(false);
    const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-[72vw] overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }

  return (
    <section
      aria-label="Current SERP Snapshot"
      className="rounded-lg border shadow-sm"
      style={{
        borderColor: TK.border,
        background: TK.bg,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
                                           {drawerRow && (
                                    <div
                                      style={{
                                        display:"hidden",
                                        position: "absolute",
                                        zIndex: 1001,
                                        padding: "20px",
                                      }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                                <DemoSerpPreviewModal onClose={closeDrawer}  />
                                              </div> 
                                            )}
      {/* Header (layout preserved) */}
      <div
        className="flex items-center justify-between border-b px-3 py-3"
        style={{ borderColor: TK.border }}
      >
        <div>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" style={{ color: TK.brand }} />
            <div className="text-[16px] font-semibold" style={{ color: TK.text }}>
              Current SERP Snapshot
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]" style={{ color: TK.muted }}>
            <Chip title={`Device: ${device}`}>{device === "desktop" ? "Desktop" : "Mobile"}</Chip>
            <Chip title={`Location: ${locationISO}`}>{locationISO}</Chip>
            <Chip title="Last fetched time">Last fetched: {formatTimeAgo(lastFetchedISO)}</Chip>
          </div>
        </div>

        <PrimaryButton title="Open full SERP preview" onClick={openDrawer}>
          <Search className="h-4 w-4" />
          View Full SERP
        </PrimaryButton>
      </div>

      {/* Results list (layout preserved) */}
      <div className="flex flex-col">
        {visible.map((r) => {
          const d = (r as any).domain as string;
          const isYou =
            d.replace(/^www\./, "").toLowerCase() ===
            projectDomain.replace(/^www\./, "").toLowerCase();
          const isComp = competitorDomains
            .map((c) => c.replace(/^www\./, "").toLowerCase())
            .includes(d.toLowerCase());

        return (
          <div
            key={r.rank === 0 ? "fs" : r.rank}
            className="grid grid-cols-[44px_1fr_auto] items-center gap-3 border-t px-3 py-2 hover:bg-gray-50"
            style={{
              borderColor: TK.border,
              ...(isYou
                ? { background: TK.youTint, boxShadow: `inset 4px 0 0 0 ${TK.coreBlue}` }
                : null),
            }}
          >
            {/* Rank */}
            <div
              className="text-[16px] font-bold"
              style={{ color: TK.coreBlue }}
              aria-label={`Rank ${r.rank === 0 ? "0 (Featured)" : r.rank}`}
            >
              {r.rank === 0 ? "FS" : `#${r.rank}`}
            </div>

            {/* Main */}
            <div className="min-w-0">
              <div className="mb-0.5 flex items-center gap-2 text-[13px]" style={{ color: TK.muted }}>
                <span
                  aria-hidden
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold"
                  style={{ borderColor: TK.borderStrong, background: "#E5E7EB", color: "#111827" }}
                  title={d}
                >
                  {monoFromDomain(d)}
                </span>
                <span className="truncate" title={`${d} — rank ${r.rank === 0 ? "FS" : `#${r.rank}`}`}>
                  {d || "—"}
                </span>
                <div className="ml-2 flex flex-wrap items-center gap-1.5">
                  {r.featured || r.rank === 0 ? (
                    <Badge tone="featured" title="Featured Snippet">
                      Featured
                    </Badge>
                  ) : null}
                  {isYou ? <Badge tone="you">You</Badge> : null}
                  {!isYou && isComp ? <Badge tone="competitor">Competitor</Badge> : null}
                </div>
              </div>

              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-[14px] font-semibold hover:underline cursor-pointer"
                style={{ color: TK.text }}
                title={r.title}
              >
                {r.title}
              </a>

              {r.snippet ? (
                <div
                  className="mt-0.5 line-clamp-2 text-[13px]"
                  style={{ color: TK.muted }}
                >
                  {r.snippet}
                </div>
              ) : null}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-2">
              <IconButton title="Open page" onClick={() => window.open(r.url, "_blank")}>
                <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} />
              </IconButton>
              <IconButton
                title="Assign task"
                onClick={() => onAssignTask?.({ keyword, url: r.url, rank: r.rank || 0 })}
              >
                <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
              </IconButton>
            </div>
          </div>
        )})}

        {/* Free overlay (layout preserved) */}
        {!isPremium && results.length > limits.initial ? (
          <div className="relative border-t" style={{ borderColor: TK.border }}>
            <div className="absolute inset-2 rounded-md border border-dashed backdrop-blur-[2px] flex items-center justify-center"
              style={{ borderColor: TK.border, background: "rgba(255,255,255,.6)" }}>
              <div
                className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                style={{ borderColor: TK.border, background: "#fff", color: TK.muted }}
                title="Upgrade to view more results"
              >
                <Lock className="h-4 w-4" />
                Top 3 shown — upgrade to see full Top 10
              </div>
            </div>
            <div className="invisible py-2" />
          </div>
        ) : null}

        {/* Expand/Collapse (Premium) — layout preserved */}
        {isPremium && results.length > limits.initial ? (
          <div
            className="flex items-center justify-center border-t px-3 py-2"
            style={{ borderColor: TK.border }}
          >
            <GhostButton
              title={expanded ? "Show fewer results" : "Show Top 10"}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Show fewer
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Top 10
                </>
              )}
            </GhostButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─────────────────────────── DEMO (optional) ─────────────────────────── */
const sampleResults: SerpItem[] = [
  {
    rank: 1,
    title: "Best SEO Tools for 2025 (Ranked)",
    url: "https://ahrefs.com/blog/best-seo-tools",
    snippet:
      "A carefully curated list of the most useful SEO tools for keyword research, auditing, and reporting.",
  },
  {
    rank: 2,
    title: "All‑in‑one SEO Platform",
    url: "https://semrush.com/features",
    snippet:
      "Do SEO, content, social, and competitive research from one place with SEMrush tools.",
  },
  {
    rank: 3,
    title: "SEO tools by Moz",
    url: "https://moz.com/tools",
    snippet:
      "Research keywords, track rankings, and crawl your site for issues with Moz Pro.",
  },
  {
    rank: 4,
    title: "Free Keyword Planner Alternative",
    url: "https://wranker.com/tools/keyword-planner",
    snippet: "Discover long‑tail opportunities and build topical clusters with Wranker.",
  },
  {
    rank: 5,
    title: "Open‑source SEO toolbox",
    url: "https://example.org/seo-tools",
    snippet: "Simple and transparent tools for SEOs.",
  },
  // Extra results for expansion (Top 10)
  { rank: 6, title: "Keyword Research Guide", url: "https://wranker.com/blog/keyword-research-guide" },
  { rank: 7, title: "Technical SEO checklist", url: "https://ahrefs.com/blog/seo-checklist" },
  { rank: 8, title: "Local SEO tools", url: "https://semrush.com/local-seo" },
  { rank: 9, title: "Rank tracker comparison", url: "https://wranker.com/blog/rank-tracker-tools" },
  { rank: 10, title: "On‑page SEO basics", url: "https://moz.com/learn/seo/on-page-seo" },
];

export default function DemoSerpSnapshot() {
  const [premium, setPremium] = useState(true);
  return (
    <div className="space-y-3 p-4" style={{ fontFamily: 'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui' }}>
      <label className="flex items-center gap-2 text-sm" style={{ color: TK.muted }}>
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer"
          checked={premium}
          onChange={(e) => setPremium(e.target.checked)}
        />
        Demo as <b className="ml-1">{premium ? "Premium" : "Free"}</b> user
      </label>

      <DrilldownSerpSnapshot
        keyword="keyword research"
        device="desktop"
        locationISO="US"
        lastFetchedISO={new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()}
        projectDomain="wranker.com"
        competitorDomains={["ahrefs.com", "semrush.com", "moz.com"]}
        results={sampleResults}
        isPremium={premium}
        onOpenFullSerp={() => alert("Open Full SERP modal")}
        onAssignTask={(p) =>
          alert(`Assign Task\nkeyword: ${p.keyword}\nurl: ${p.url}\nrank: ${p.rank}`)
        }
      />
    </div>
  );
}
