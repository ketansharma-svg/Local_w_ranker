"use client";

import React from "react";

/** ──────────────────────────────────────────────────────────
 *  Types
 *  ────────────────────────────────────────────────────────── */
type Device = "desktop" | "mobile";
type FeatureKey =
  | "organic"
  | "featured_snippet"
  | "paa"
  | "sitelinks"
  | "top_stories"
  | "video"
  | "image_pack"
  | "shopping"
  | "ads_top"
  | "ads_bottom";

type SnapshotMeta = {
  keyword: string;
  device: Device;
  country: string; // "US"
  capturedAt: string; // ISO
  source?: "crawler" | "upload" | "api";
  featuresPresent?: FeatureKey[];
  totalOrganic?: number;
  adsTopCount?: number;
  adsBottomCount?: number;
  fsWinner?: string | null; // hostname
  sitelinksOwners?: string[]; // hostnames
};

type Sitelink = { title: string; url: string };
type MediaThumb = { src?: string; title: string; source?: string };

type SerpItem = {
  position: number | null; // 0 for FS, 1..N organic; null => presence-only
  element: FeatureKey;
  hostname?: string; // for organic/FS/ads/video items
  isYou?: boolean; // marks your domain
  title?: string;
  url?: string;
  snippet?: string;
  sitelinks?: Sitelink[]; // for sitelinks or organic owner with sitelinks
  paaCount?: number; // when element === "paa"
  topStories?: MediaThumb[]; // when element === "top_stories"
  videos?: MediaThumb[]; // when element === "video"
  imagePack?: MediaThumb[]; // when element === "image_pack"
  adPlacement?: "top" | "bottom"; // ads
  droppedFrom?: number | null; // P3 → —
};

type SerpSnapshot = {
  meta: SnapshotMeta;
  items: SerpItem[]; // in display order
};

/** ──────────────────────────────────────────────────────────
 *  Design tokens (CSS variables fallbacks)
 *  ────────────────────────────────────────────────────────── */
const TK = {
  brand: "var(--wr-brand, #008CCD)", // brand
  value: "var(--wr-value, #0077FF)", // YOU highlight / KPI blue
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  chipBg: "var(--wr-chip-bg, #F5F7FA)",
  good: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  rowHover: "#F8FAFC",
};

/** ──────────────────────────────────────────────────────────
 *  Icons (emoji) for simplicity (no external deps)
 *  ────────────────────────────────────────────────────────── */
const ICON: Record<FeatureKey, string> = {
  featured_snippet: "⭐",
  paa: "❓",
  sitelinks: "🔗",
  top_stories: "📰",
  video: "🎥",
  image_pack: "🖼️",
  shopping: "🛒",
  ads_top: "🅰",
  ads_bottom: "🅰",
  organic: "•",
};

/** ──────────────────────────────────────────────────────────
 *  Utilities
 *  ────────────────────────────────────────────────────────── */
function defaultLiveSerpUrl(meta: SnapshotMeta) {
  const q = encodeURIComponent(meta.keyword);
  const gl = (meta.country || "US").toLowerCase();
  const hl = gl === "us" ? "en" : gl;
  return `https://www.google.com/search?q=${q}&gl=${gl}&hl=${hl}`;
}
function fmtDate(dIso?: string) {
  if (!dIso) return "—";
  try {
    const d = new Date(dIso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dIso;
  }
}
function isPresenceOnly(element: FeatureKey) {
  return (
    element === "paa" ||
    element === "sitelinks" ||
    element === "top_stories" ||
    element === "video" ||
    element === "image_pack" ||
    element === "shopping" ||
    element === "ads_top" ||
    element === "ads_bottom"
  );
}

/** ──────────────────────────────────────────────────────────
 *  Drawer Component
 *  ────────────────────────────────────────────────────────── */
type DrawerProps = {
  open: boolean;
  onClose: () => void;
  snapshot?: SerpSnapshot | null;
  onCreateTask?: (payload: {
    keyword?: string;
    device?: Device;
    country?: string;
    capturedAt?: string;
    missedFeature?: FeatureKey | null;
    position?: number | null;
    targetUrl?: string;
  }) => void;
  onOpenPageAnalyzer?: (url: string) => void;
};

function SerpSnapshotViewerDrawer({
  open,
  onClose,
  snapshot,
  onCreateTask,
  onOpenPageAnalyzer,
}: DrawerProps) {
  const meta = snapshot?.meta;
  const items = snapshot?.items ?? [];

  // Overview derived
  const fsWinner =
    meta?.fsWinner ??
    items.find((i) => i.element === "featured_snippet" && i.hostname)?.hostname ??
    null;

  const sitelinkOwners =
    meta?.sitelinksOwners ??
    Array.from(
      new Set(
        items
          .filter((i) => i.element === "sitelinks" && i.hostname)
          .map((i) => i.hostname as string)
      )
    );

  const paaPresent =
    Boolean(meta?.featuresPresent?.includes("paa")) ||
    items.some((i) => i.element === "paa");

  const adsTop = meta?.adsTopCount ?? items.filter((i) => i.element === "ads_top").length ?? 0;
  const adsBottom =
    meta?.adsBottomCount ?? items.filter((i) => i.element === "ads_bottom").length ?? 0;

  const totalOrganic = meta?.totalOrganic ?? items.filter((i) => i.element === "organic").length;

  const yourPositions: number[] = items
    .filter(
      (i) => i.isYou && (i.element === "organic" || i.element === "featured_snippet")
    )
    .map((i) => (typeof i.position === "number" ? i.position : null))
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  const liveUrl = meta ? defaultLiveSerpUrl(meta) : undefined;

  // local sitelinks expand
  const [openSites, setOpenSites] = React.useState<Record<number, boolean>>({});
  const toggleSites = (idx: number) => setOpenSites((p) => ({ ...p, [idx]: !p[idx] }));

  // print / export stub (prints page—works out of the box)
  const handleExport = () => window.print();

  const handleCreateTask = (ctx?: {
    missedFeature?: FeatureKey | null;
    position?: number | null;
    targetUrl?: string;
  }) => {
    if (!onCreateTask) return;
    onCreateTask({
      keyword: meta?.keyword,
      device: meta?.device,
      country: meta?.country,
      capturedAt: meta?.capturedAt,
      missedFeature: ctx?.missedFeature ?? null,
      position: ctx?.position ?? null,
      targetUrl: ctx?.targetUrl,
    });
  };

  // Early return: invisible container keeps layout simpler
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-[61] h-screen w-full sm:w-[720px] bg-white shadow-xl transition-transform duration-300
        ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="SERP Snapshot Viewer Drawer"
      >
        {/* Header (sticky) */}
        <div
          className="sticky top-0 bg-white border-b px-4 py-3"
          style={{ borderColor: TK.borderLight }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold truncate" title={meta?.keyword || ""}>
                  SERP Snapshot — “{meta?.keyword ?? "—"}”
                </h2>
                <span
                  className="inline-flex items-center text-xs px-2 py-0.5 rounded border"
                  style={{ background: TK.chipBg, borderColor: TK.borderLight }}
                  title="Visual SERP layout for this keyword"
                >
                  ℹ️ Info
                </span>
              </div>

              {/* Meta chips */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className="text-xs px-2 py-1 rounded border"
                  style={{ background: TK.chipBg, borderColor: TK.borderLight }}
                  title="Device"
                >
                  {meta?.device === "mobile" ? "📱 Mobile" : meta?.device === "desktop" ? "💻 Desktop" : "—"}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded border"
                  style={{ background: TK.chipBg, borderColor: TK.borderLight }}
                  title="Country"
                >
                  🌍 {meta?.country ?? "—"}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded border"
                  style={{ background: TK.chipBg, borderColor: TK.borderLight }}
                  title="Captured date"
                >
                  🗓 {fmtDate(meta?.capturedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="h-[calc(100vh-48px-64px)] overflow-y-auto"> {/* header ~48px, footer ~64px */}
          {/* Overview Summary */}
          <div className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                <div className="text-xs" style={{ color: TK.muted }}>
                  FS Winner
                </div>
                <div className="text-sm font-medium mt-0.5">
                  {fsWinner ?? (snapshot ? "Not Present" : "…")}
                </div>
              </div>
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Sitelinks
                </div>
                <div className="text-sm font-medium mt-0.5">
                  {sitelinkOwners?.length
                    ? sitelinkOwners.join(", ")
                    : snapshot
                    ? "Not Present"
                    : "…"}
                </div>
              </div>
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                <div className="text-xs" style={{ color: TK.muted }}>
                  PAA
                </div>
                <div className="text-sm font-medium mt-0.5">
                  {snapshot ? (paaPresent ? "Yes" : "No") : "…"}
                </div>
              </div>
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Total Organic
                </div>
                <div className="text-sm font-medium mt-0.5">
                  {snapshot ? totalOrganic : "…"}
                </div>
              </div>
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Ads
                </div>
                <div className="text-sm font-medium mt-0.5">
                  {snapshot ? (
                    <>
                      Top: {adsTop} · Bottom: {adsBottom}
                    </>
                  ) : (
                    "…"
                  )}
                </div>
              </div>
              <div className="rounded border p-3" style={{ borderColor: TK.borderLight }}>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Your Presence
                </div>
                <div className="text-sm font-medium mt-0.5">
                  {snapshot ? (yourPositions.length ? yourPositions.map((p) => `P${p}`).join(", ") : "—") : "…"}
                </div>
              </div>
            </div>

            {/* Features present list */}
            {meta?.featuresPresent && meta.featuresPresent.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs" style={{ color: TK.muted }}>
                  Features:
                </span>
                {meta.featuresPresent.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-2 py-1 rounded border bg-white"
                    style={{ borderColor: TK.borderLight }}
                    title={f.replace("_", " ")}
                  >
                    {ICON[f]} {f.replace("_", " ")}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* SERP Visual Layout (cards) */}
          <div className="px-4 pb-4 space-y-3">
            {!snapshot && (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded border p-3 flex gap-3"
                    style={{ borderColor: TK.borderLight }}
                  >
                    <div className="w-10 h-6 bg-gray-100 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded" />
                      <div className="h-3 w-2/3 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {snapshot &&
              items.map((item, idx) => {
                const isAd = item.element === "ads_top" || item.element === "ads_bottom";
                const isFS = item.element === "featured_snippet";
                const cardBg = isFS ? "#FFFBEA" : isAd ? "#F7F7F7" : "#FFFFFF";
                const clickableYou = item.isYou && !!item.url;
                const clickableCompetitor = !!item.hostname && !item.isYou && !!liveUrl;

                return (
                  <div
                    key={`${item.element}-${item.position ?? idx}`}
                    className="rounded border p-3 flex"
                    style={{ borderColor: TK.borderLight, background: cardBg }}
                  >
                    {/* Left position rail */}
                    <div className="w-10 shrink-0 flex items-start justify-center pt-2">
                      <span className="text-xs text-gray-500 tabular-nums">
                        {item.position ?? "—"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* Title + element */}
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-tight">{ICON[item.element]}</span>
                            <div className="min-w-0">
                              <div className="font-medium leading-tight truncate">
                                {item.element === "organic"
                                  ? "Organic Result"
                                  : item.element === "featured_snippet"
                                  ? "Featured Snippet"
                                  : item.element === "paa"
                                  ? `PAA${item.paaCount ? ` (${item.paaCount} items)` : ""}`
                                  : item.element === "sitelinks"
                                  ? "Sitelinks"
                                  : item.element === "top_stories"
                                  ? "Top Stories"
                                  : item.element === "video"
                                  ? "Videos"
                                  : item.element === "image_pack"
                                  ? "Image Pack"
                                  : item.element === "shopping"
                                  ? "Shopping Results"
                                  : item.element === "ads_top"
                                  ? "Ad (Top)"
                                  : item.element === "ads_bottom"
                                  ? "Ad (Bottom)"
                                  : item.element}
                              </div>
                              {item.title && (
                                <div className="mt-0.5 text-sm truncate" title={item.title}>
                                  {item.title}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Domain & badges */}
                          <div className="mt-1 flex items-center gap-2">
                            {(item.hostname || item.isYou) && (
                              <span
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border"
                                style={{
                                  borderColor: item.isYou ? TK.value : TK.border,
                                  color: item.isYou ? TK.value : TK.text,
                                  background: item.isYou ? "transparent" : "#fff",
                                }}
                              >
                                {item.isYou ? "✅ Your Domain" : `🔸 ${item.hostname}`}
                              </span>
                            )}
                            {isFS && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: TK.warn, color: TK.warn }}
                                title="Featured Snippet"
                              >
                                ⭐ FS
                              </span>
                            )}
                            {item.element === "paa" && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: TK.border, color: TK.muted }}
                                title="People Also Ask"
                              >
                                ❓ PAA
                              </span>
                            )}
                            {isAd && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded border"
                                style={{ borderColor: TK.border, color: TK.muted }}
                                title="Ad"
                              >
                                Ad
                              </span>
                            )}
                          </div>

                          {/* URL + Target + Dropped */}
                          {item.url && (
                            <div className="mt-1">
                              <span className="text-xs truncate inline-block max-w-full" title={item.url}>
                                {item.url}
                              </span>
                              {item.isYou && (
                                <span
                                  className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ border: `1px solid ${TK.value}`, color: TK.value }}
                                  title="Mapped target page"
                                >
                                  🎯 Target
                                </span>
                              )}
                              {typeof item.droppedFrom === "number" && (
                                <span className="ml-2 text-[10px]" style={{ color: TK.critical }} title="Previously ranked">
                                  🔻 P{item.droppedFrom}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Snippet */}
                          {!!item.snippet && !isPresenceOnly(item.element) && (
                            <div className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {item.snippet}
                            </div>
                          )}

                          {/* Feature blocks */}
                          {item.element === "sitelinks" && item.sitelinks && (
                            <div className="mt-2">
                              <button
                                onClick={() => toggleSites(idx)}
                                className="text-xs inline-flex items-center gap-1 rounded px-2 py-1 border bg-white"
                                style={{ borderColor: TK.border, color: TK.text }}
                              >
                                {openSites[idx] ? "▲" : "▼"} Sitelinks ({item.sitelinks.length})
                              </button>
                              {openSites[idx] && (
                                <ul className="mt-2 grid grid-cols-1 gap-1 pl-1">
                                  {item.sitelinks.map((s, i) => (
                                    <li key={i} className="text-xs truncate" title={s.url}>
                                      • {s.title}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {item.element === "top_stories" && item.topStories && (
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {item.topStories.slice(0, 3).map((m, i) => (
                                <div
                                  key={i}
                                  className="rounded border p-2"
                                  style={{ borderColor: TK.border }}
                                  title={m.title}
                                >
                                  <div
                                    className="h-14 w-full rounded"
                                    style={{ background: TK.borderLight }}
                                  />
                                  <div className="mt-1 text-xs font-medium line-clamp-2">
                                    {m.title}
                                  </div>
                                  {m.source && (
                                    <div className="text-[10px] text-gray-500">{m.source}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {item.element === "video" && item.videos && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {item.videos.slice(0, 4).map((m, i) => (
                                <div
                                  key={i}
                                  className="rounded border p-2"
                                  style={{ borderColor: TK.border }}
                                  title={m.title}
                                >
                                  <div
                                    className="h-14 w-full rounded"
                                    style={{ background: TK.borderLight }}
                                  />
                                  <div className="mt-1 text-xs font-medium line-clamp-2">
                                    {m.title}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action button on each item (YOU => Page, Competitor => Live SERP) */}
                        {(clickableYou || clickableCompetitor) && (
                          <div className="shrink-0">
                            <button
                              className="inline-flex items-center h-8 px-3 text-sm rounded border bg-white hover:bg-gray-50"
                              style={{ borderColor: TK.border }}
                              onClick={() => {
                                if (clickableYou && item.url) {
                                  onOpenPageAnalyzer?.(item.url);
                                } else if (clickableCompetitor && liveUrl) {
                                  window.open(liveUrl, "_blank", "noopener,noreferrer");
                                }
                              }}
                              title={clickableYou ? "Open Page Analyzer" : "Open Live SERP"}
                            >
                              {clickableYou ? "📄 Page" : "🔗 Live SERP"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

            {snapshot && items.length === 0 && (
              <div
                className="rounded border p-6 text-center text-sm text-gray-500"
                style={{ borderColor: TK.borderLight }}
              >
                No snapshot available for this keyword/device/country.
                <div className="mt-2">
                  <button
                    className="inline-flex items-center h-9 px-3 text-sm rounded border bg-white hover:bg-gray-50"
                    style={{ borderColor: TK.border }}
                    onClick={() => liveUrl && window.open(liveUrl, "_blank", "noopener,noreferrer")}
                    disabled={!liveUrl}
                  >
                    🔗 Go to Live SERP
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer (sticky) */}
        <div
          className="sticky bottom-0 bg-white border-t px-4 py-3"
          style={{ borderColor: TK.borderLight }}
        >
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="text-xs text-gray-500">Export and actions for this snapshot</div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center h-9 px-3 text-sm rounded border bg-white hover:bg-gray-50"
                style={{ borderColor: TK.border }}
                onClick={handleExport}
                disabled={!snapshot}
                title="Print / Save as PDF"
              >
                🖨️ Download PDF
              </button>
              <button
                className="inline-flex items-center h-9 px-3 text-sm rounded border bg-white hover:bg-gray-50"
                style={{ borderColor: TK.border }}
                onClick={() => liveUrl && window.open(liveUrl, "_blank", "noopener,noreferrer")}
                disabled={!liveUrl}
                title="Open Google SERP in new tab"
              >
                🔗 Go to Live SERP
              </button>
              <button
                className="inline-flex items-center h-9 px-3 text-sm rounded border text-white"
                style={{ borderColor: TK.brand, background: TK.brand }}
                onClick={() => handleCreateTask()}
                disabled={!meta}
                title="Open Task Creation with autofill"
              >
                📂 Create Task
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/** ──────────────────────────────────────────────────────────
 *  Demo host page — ready to run
 *  ────────────────────────────────────────────────────────── */
const MOCK_SNAPSHOT: SerpSnapshot = {
  meta: {
    keyword: "seo audit checklist",
    device: "desktop",
    country: "US",
    capturedAt: "2025-07-10T10:00:00.000Z",
    featuresPresent: ["featured_snippet", "paa", "sitelinks"],
    totalOrganic: 9,
    adsTopCount: 2,
    fsWinner: "comp1.com",
    sitelinksOwners: ["you"],
  },
  items: [
    {
      position: 0,
      element: "featured_snippet",
      hostname: "comp1.com",
      title: "The Ultimate SEO Audit Checklist",
      url: "https://comp1.com/blog/seo-guide",
      snippet: "Follow this step-by-step SEO audit checklist...",
    },
    {
      position: 1,
      element: "organic",
      isYou: true,
      hostname: "yoursite.com",
      title: "SEO Audit Checklist (Free Template)",
      url: "https://yoursite.com/seo-audit-checklist",
      snippet: "Use our SEO audit checklist to identify quick wins...",
    },
    {
      position: 2,
      element: "organic",
      hostname: "comp1.com",
      title: "2024 Guide to SEO Audits",
      url: "https://comp1.com/seo-audit",
      snippet: "A practical guide to SEO audits in 2024...",
    },
    {
      position: 3,
      element: "organic",
      hostname: "comp2.com",
      title: "Complete SEO Audit List",
      url: "https://comp2.com/blog/seo-checklist",
      snippet: "Everything you need for a complete SEO audit...",
    },
    { position: null, element: "paa", paaCount: 4 },
    {
      position: 5,
      element: "sitelinks",
      isYou: true,
      hostname: "yoursite.com",
      sitelinks: [
        { title: "Technical Audit", url: "/tech" },
        { title: "Content Audit", url: "/content" },
        { title: "Backlinks", url: "/links" },
        { title: "Templates", url: "/templates" },
        { title: "FAQ", url: "/faq" },
      ],
    },
    {
      position: null,
      element: "ads_top",
      hostname: "ads.site.com",
      title: "SEO Tools — Try Free",
    },
  ],
};

export default function DemoSerpSnapshotDrawerPage() {
  const [open, setOpen] = React.useState(true); // open by default so you can see it immediately
  const [snapshot, setSnapshot] = React.useState<SerpSnapshot | null>(MOCK_SNAPSHOT);

  return (
    // <main className="min-h-screen bg-gray-50">
    //   {/* Content behind drawer (demo) */}
    //   <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
    //     <h1 className="text-2xl font-semibold">SERP Snapshot Viewer Drawer — Demo</h1>
    //     <p className="text-gray-600">
    //       Click the button to open the drawer. This page uses Tailwind only (no external UI libs).
    //     </p>
    //     <div className="flex gap-2">
    //       <button
    //         className="inline-flex items-center h-10 px-4 text-sm rounded border bg-white hover:bg-gray-50"
    //         style={{ borderColor: TK.border }}
    //         onClick={() => setOpen(true)}
    //       >
    //         Open Drawer
    //       </button>
    //       <button
    //         className="inline-flex items-center h-10 px-4 text-sm rounded border bg-white hover:bg-gray-50"
    //         style={{ borderColor: TK.border }}
    //         onClick={() => setSnapshot(snapshot ? null : MOCK_SNAPSHOT)}
    //         title="Toggle loading state"
    //       >
    //         Toggle Loading
    //       </button>
    //     </div>
    //     <div className="rounded border p-4 bg-white" style={{ borderColor: TK.borderLight }}>
    //       <div className="text-sm text-gray-600">
    //         Behind the drawer content. You can keep working here—drawer overlays the page.
    //       </div>
    //     </div>
    //   </div>

    //   {/* Drawer */}
    //   <SerpSnapshotViewerDrawer
    //     open={open}
    //     onClose={() => setOpen(false)}
    //     snapshot={snapshot}
    //     onCreateTask={(payload) => {
    //       console.log("Create Task payload:", payload);
    //       alert("Task drawer would open here (see console for payload).");
    //     }}
    //     onOpenPageAnalyzer={(url) => {
    //       alert(`Open Page Analyzer for: ${url}`);
    //     }}
    //   />
    // </main>
    <>
          <SerpSnapshotViewerDrawer
        open={open}
        onClose={() => setOpen(false)}
        snapshot={snapshot}
        onCreateTask={(payload) => {
          console.log("Create Task payload:", payload);
          alert("Task drawer would open here (see console for payload).");
        }}
        onOpenPageAnalyzer={(url) => {
          alert(`Open Page Analyzer for: ${url}`);
        }}
      />
    </>
  );
}
