"use client";

import React, { useEffect } from "react";

/** ---------------------------------------------
 *  Types
 *  -------------------------------------------*/
export type TopPageRow = {
  id: string | number;
  url: string;                   // absolute or relative
  title?: string;                // page title if available
  refDomains: number;            // unique root domains
  backlinks: number;             // total backlinks (not deduped)
  avgWR?: number;                // average WR of linking domains (0–100)
  toxicPercent?: number;         // % of toxic links to this page (0–100)
  anchorDiversityCount?: number; // optional: unique anchors count (tooltip)
  growthTrend?: "up" | "down" | "flat"; // optional Phase-2 visual
};

export type TopPagesPreviewProps = {
  pages: TopPageRow[];
  maxRows?: number; // default 5
  loading?: boolean;
  emptyState?: React.ReactNode;

  /** Interactions */
  onOpenPageAnalyzer?: (row: TopPageRow) => void;
  onOpenRefDomains?: (row: TopPageRow) => void;
  onOpenBacklinks?: (row: TopPageRow) => void;
  onViewAllPages?: () => void;
};

/** ---------------------------------------------
 *  Helpers
 *  -------------------------------------------*/
const STYLE_TAG_ID = "wr-top-pages-css";

const injectStylesOnce = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.innerHTML = `
  .wr-top-pages{--wr-blue:#1090D0;--wr-text:#282829;--wr-bg:#F5F7FA;--wr-border:#E5E7EB;--wr-gray:#6B7280;--wr-card:#FFFFFF;font-family:Inter,Poppins,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji'}
  .wr-card{background:var(--wr-card);border:1px solid var(--wr-border);border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.05);overflow:hidden}
  .wr-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px}
  .wr-title{font-weight:600;color:var(--wr-text);font-size:16px}
  .wr-table{width:100%;border-collapse:collapse}
  .wr-table thead th{position:sticky;top:0;background:#FAFAFA;text-align:left;font-size:12.5px;color:var(--wr-gray);font-weight:600;padding:10px 16px;border-top:1px solid var(--wr-border);border-bottom:1px solid var(--wr-border);z-index:1}
  .wr-table td{padding:12px 16px;border-top:1px solid var(--wr-border);vertical-align:middle}
  .wr-row{cursor:pointer;transition:background .15s ease}
  .wr-row:hover{background:#F9FCFF}
  .wr-page{display:flex;flex-direction:column;gap:2px;min-width:0}
  .wr-page-title{font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .wr-page-url{font-size:12.5px;color:var(--wr-gray);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .wr-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
  .wr-badge--green{background:#E6F6F1;color:#0D7A5C}
  .wr-badge--amber{background:#FFF7E6;color:#8A5B00}
  .wr-badge--red{background:#FDE8E8;color:#9B1C1C}
  .wr-kpi-btn{background:transparent;border:none;color:var(--wr-blue);font-weight:600;cursor:pointer;padding:0}
  .wr-kpi-btn:hover{text-decoration:underline}
  .wr-subtle{font-size:12px;color:var(--wr-gray)}
  .wr-cta-row{display:flex;justify-content:flex-end;padding:12px 16px}
  .wr-cta{background:var(--wr-blue);color:#fff;border:none;padding:10px 14px;border-radius:8px;font-weight:600;cursor:pointer}
  .wr-cta:hover{filter:brightness(.95);box-shadow:0 4px 10px rgba(16,144,208,.2)}
  .wr-skeleton{background:linear-gradient(90deg,#f2f4f7,#e6ebf2,#f2f4f7);background-size:200% 100%;animation:wr-shimmer 1.2s ease-in-out infinite;border-radius:6px;height:12px}
  @keyframes wr-shimmer{0%{background-position:0 0}100%{background-position:-200% 0}}
  /* Mobile stack */
  @media (max-width:680px){
    .wr-table thead{display:none}
    .wr-table,.wr-table tbody,.wr-table tr,.wr-table td{display:block;width:100%}
    .wr-table tr{border-top:1px solid var(--wr-border)}
    .wr-table td{padding:10px 16px 10px 120px;border-top:none;position:relative}
    .wr-table td::before{content:attr(data-label);position:absolute;left:16px;top:10px;width:96px;font-size:12px;font-weight:600;color:var(--wr-gray)}
    .wr-cta-row{justify-content:center}
  }
  `;
  document.head.appendChild(style);
};

const fmt = (n: number) => n.toLocaleString();
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const displayPath = (url: string) => {
  try {
    if (url.startsWith("/")) return url;
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    // not a full URL, return as-is
    return url;
  }
};

const trim60 = (s: string) => (s.length > 60 ? s.slice(0, 57) + "…" : s);

/** Compute Link Quality Tag based on avg WR + toxic% (optional) */
function getQualityTag(avgWR?: number, toxicPercent?: number): {
  label: "⭐ High Authority" | "🧱 Niche Link" | "🟥 Risky";
  className: string;
  title: string;
} {
  const tox = toxicPercent ?? 0;
  const wr = avgWR ?? 0;
  if (tox >= 15 || wr < 40) {
    return { label: "🟥 Risky", className: "wr-badge wr-badge--red", title: "Derived from avg. WR and toxic link share ≥ 15%" };
  }
  if (wr >= 70) {
    return { label: "⭐ High Authority", className: "wr-badge wr-badge--green", title: "Derived from high avg. WR of linking domains" };
  }
  return { label: "🧱 Niche Link", className: "wr-badge wr-badge--amber", title: "Moderate WR or niche‑focused sources" };
}

const ArrowIcon: React.FC<{ dir: "up" | "down" | "flat" }> = ({ dir }) => {
  const c = dir === "up" ? "#10B981" : dir === "down" ? "#EF4444" : "#6B7280";
  const d =
    dir === "up"
      ? "M12 4l6 6H6l6-6z"
      : dir === "down"
      ? "M12 20l-6-6h12l-6 6z"
      : "M6 12h12v2H6z";
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={c}>
      <path d={d} />
    </svg>
  );
};

/** ---------------------------------------------
 *  Component
 *  -------------------------------------------*/
export const TopPagesPreview: React.FC<TopPagesPreviewProps> = ({
  pages,
  maxRows = 5,
  loading = false,
  emptyState,
  onOpenPageAnalyzer,
  onOpenRefDomains,
  onOpenBacklinks,
  onViewAllPages,
}) => {
  useEffect(() => injectStylesOnce(), []);

  const rows = (pages || []).slice(0, maxRows);

  return (
    <section className="wr-top-pages wr-card" aria-label="Top Pages by Referring Domains and Backlinks">
      <div className="wr-head">
        <div className="wr-title">Top Pages (by Referring Domains & Backlinks)</div>
      </div>

      <table className="wr-table" role="grid">
        <thead>
          <tr>
            <th scope="col">Page</th>
            <th scope="col" title="Count of unique root domains linking to this page">Referring Domains</th>
            <th scope="col" title="All backlinks (includes dofollow, nofollow, images)">Backlinks</th>
            <th scope="col">Link Quality</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: maxRows }).map((_, i) => (
                <tr className="wr-row" key={`sk-${i}`}>
                  <td data-label="Page">
                    <div className="wr-page">
                      <span className="wr-skeleton" style={{ width: 220 }} />
                      <span className="wr-skeleton" style={{ width: 160, height: 10 }} />
                    </div>
                  </td>
                  <td data-label="Ref. Domains"><span className="wr-skeleton" style={{ width: 60 }} /></td>
                  <td data-label="Backlinks"><span className="wr-skeleton" style={{ width: 60 }} /></td>
                  <td data-label="Link Quality"><span className="wr-skeleton" style={{ width: 100 }} /></td>
                </tr>
              ))
            : rows.length > 0
            ? rows.map((row) => {
                const pageTitle = row.title?.trim() || trim60(displayPath(row.url));
                const pageUrl = trim60(displayPath(row.url));
                const tag = getQualityTag(row.avgWR, row.toxicPercent);
                const tox = typeof row.toxicPercent === "number" ? clamp(row.toxicPercent, 0, 100) : undefined;

                return (
                  <tr
                    key={row.id}
                    className="wr-row"
                    onClick={() => onOpenPageAnalyzer?.(row)}
                    aria-label={`Open Page Analyzer for ${pageTitle}`}
                  >
                    <td data-label="Page">
                      <div className="wr-page">
                        <div className="wr-page-title" title={row.title || displayPath(row.url)}>
                          {pageTitle}
                        </div>
                        <div className="wr-page-url" title={row.title ? displayPath(row.url) : ""}>
                          {row.title ? pageUrl : ""}
                        </div>
                        {typeof row.anchorDiversityCount === "number" && (
                          <div className="wr-subtle" title={`This page has ${row.anchorDiversityCount} unique anchors`}>
                            Anchor diversity: {fmt(row.anchorDiversityCount)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td data-label="Ref. Domains">
                      <button
                        type="button"
                        className="wr-kpi-btn"
                        title="Click to view referring domains for this page"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRefDomains?.(row);
                        }}
                      >
                        {fmt(row.refDomains)}
                      </button>
                    </td>

                    <td data-label="Backlinks">
                      <button
                        type="button"
                        className="wr-kpi-btn"
                        title="Includes dofollow, nofollow, and image links"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenBacklinks?.(row);
                        }}
                      >
                        {fmt(row.backlinks)}
                      </button>
                    </td>

                    <td data-label="Link Quality">
                      <span className={tag.className} title={tag.title}>
                        {tag.label}
                        {row.growthTrend && <ArrowIcon dir={row.growthTrend} />}
                        {typeof tox === "number" && tox >= 15 && (
                          <span
                            aria-label="Toxic link risk"
                            title={`~${tox}% of links to this page are toxic`}
                            style={{ display: "inline-flex", marginLeft: 6 }}
                          >
                            {/* red alert dot */}
                            <svg width="10" height="10" viewBox="0 0 8 8" fill="#EF4444" aria-hidden="true">
                              <circle cx="4" cy="4" r="4" />
                            </svg>
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })
            : (
              <tr>
                <td colSpan={4} style={{ padding: 20 }}>
                  {emptyState || <div className="wr-subtle">No linked pages found yet.</div>}
                </td>
              </tr>
            )}
        </tbody>
      </table>

      <div className="wr-cta-row">
        <button
          className="wr-cta"
          type="button"
          onClick={() => onViewAllPages?.()}
          aria-label="View All Pages (Backlink Audit → Pages tab)"
          title="Open full pages list"
        >
          View All Pages
        </button>
      </div>
    </section>
  );
};


