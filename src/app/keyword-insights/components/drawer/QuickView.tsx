"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  X as IconClose,
  ExternalLink,
  Copy,
  Download,
  RefreshCw,
  Info,
  Monitor,
  Smartphone,
  AlertTriangle,
} from "lucide-react";

/* =================== TOKENS & GLOBAL CSS (Inter, brand, modular UI) =================== */
const CSS = `
:root{
  --wr-brand:#008CCD;
  --wr-kpi-bar:#0077FF;

  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-border:#EFF0F6;
  --wr-bg:#FFFFFF;
  --wr-chip:#F5F7FA;

  --wr-green:#10B981;
  --wr-red:#EF4444;
  --wr-warn:#F59E0B;

  --wr-radius:10px;
  --wr-shadow:0 10px 24px rgba(17,24,39,.12);
}

*{box-sizing:border-box}
body{margin:0; font-family:Inter, Inter Fallback, system-ui, Segoe UI, Roboto, Helvetica, Arial; color:var(--wr-text)}
button{cursor:pointer}

/* Overlay & Drawer */
.wr-overlay{position:fixed; inset:0; background:rgba(17,24,39,.42); display:flex; justify-content:flex-end; z-index:1000}
.wr-drawer{
  width:1220px; /* ⬆ increased width for roomy layout */
  max-width:100vw; height:100vh; background:#fff; display:flex; flex-direction:column; box-shadow:var(--wr-shadow);
  animation:slideIn .22s ease-out both;
}
@keyframes slideIn{from{transform:translateX(16px); opacity:.96} to{transform:none; opacity:1}}
@media (max-width: 1220px){ .wr-drawer{width:100vw} }

/* Header */
.wr-header{height:72px; display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--wr-border); gap:12px}
.wr-url{display:flex; align-items:center; gap:12px; min-width:0}
.wr-favicon{width:28px;height:28px;border-radius:6px;display:inline-block;object-fit:cover}
.wr-path{font-weight:600; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.wr-badges{display:flex;flex-wrap:wrap;gap:6px}
.badge{height:24px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;background:var(--wr-chip);border:1px solid var(--wr-border);border-radius:999px;color:var(--wr-text);font-size:12px;white-space:nowrap}
.badge.good{background:#E7F7EF;border-color:#D1F5E5;color:#065F46}
.badge.warn{background:#FFF5DF;border-color:#FFE5A9;color:#8A6400}
.badge.bad{background:#FDE9E7;border-color:#F9C7C1;color:#7A231C}
.badge.brand{background:#E6F5FC;border-color:#CFEAF7;color:#0C69B2}

.wr-actions{display:flex;flex-wrap:wrap; gap:8px; align-items:center}
.iconbtn{
  height:32px; width:auto; padding:0 10px; display:inline-flex; align-items:center; gap:6px;
  border:1px solid var(--wr-border); border-radius:8px; background:#fff; color:var(--wr-text);
}
.icononly{height:32px; width:32px; padding:0; justify-content:center}
.iconbtn:hover{background:#F8FAFC}

/* Body & sections */
.wr-body{flex:1; overflow:auto; background:#fff; padding:16px; display:flex; flex-direction:column; gap:12px}
.section{background:#fff; border:1px solid var(--wr-border); border-radius:var(--wr-radius); box-shadow:0 1px 2px rgba(17,24,39,.06)}
.section-hd{height:44px; display:flex; align-items:center; justify-content:space-between; padding:0 12px; border-bottom:1px solid var(--wr-border); gap:10px}
.section-ttl{font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px; color:var(--wr-text)}
.section-ttl svg{color:var(--wr-brand)}
.section-ct{padding:12px}

/* KPI Cards grid */
.kpi-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:12px}
.kpi-card{border:1px solid var(--wr-border); border-radius:10px; padding:12px; display:flex; gap:12px; align-items:stretch; background:#fff}
.kpi-left{min-width:180px; display:flex; flex-direction:column; gap:6px}
.kpi-label{font-size:12px;color:var(--wr-muted); display:flex; align-items:center; gap:6px}
.kpi-value{font-size:20px;font-weight:700}
.kpi-delta{font-size:12px; display:inline-flex; align-items:center; gap:6px}
.kpi-good{color:var(--wr-green)} .kpi-bad{color:var(--wr-red)} .kpi-neutral{color:var(--wr-muted)}
.kpi-chart{flex:1; min-width:140px}

/* Ranking context */
.rank-item{padding:12px;border:1px solid var(--wr-border); border-radius:10px; background:#fff}
.rank-row{display:flex;align-items:flex-start;gap:12px}
.rank-no{min-width:28px;font-weight:700;color:var(--wr-brand)}
.rank-main{flex:1;min-width:0}
.rank-title{color:var(--wr-brand); font-weight:600; text-decoration:none}
.rank-title:hover{text-decoration:underline}
.rank-url{font-size:12px;color:var(--wr-muted)}
.rank-cta{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap}
.linkbtn{font-size:12px;padding:4px 8px;border:1px solid var(--wr-border);border-radius:8px;background:#fff;color:var(--wr-brand)}
.linkbtn:hover{background:#EEF7FF}

/* Cannibalization & health */
.canni-pill{display:inline-flex;align-items:center;gap:6px;background:#FDECEC;color:#7F1D1D;border:1px solid #FCA5A5;border-radius:999px;padding:0 10px;height:24px;font-size:12px}
.canni-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}

/* Footer CTAs */
.footer-ctas{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.cta{height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--wr-border);display:inline-flex;align-items:center;gap:8px}
.cta.primary{background:var(--wr-brand);color:#fff;border-color:var(--wr-brand)}
.cta.secondary{background:#fff;color:var(--wr-brand)}
.cta:hover{opacity:.96}

/* Blur gate (freemium) */
.blurred{position:relative;filter:blur(3px); pointer-events:none}
.blur-overlay{position:absolute; inset:0; display:flex; align-items:center; justify-content:center}
.blur-note{position:absolute; top:8px; right:8px; font-size:12px}

/* Small helpers */
.small{font-size:12px;color:var(--wr-muted)}
.token-chip{display:inline-flex; align-items:center; gap:8px; padding:0 10px; height:28px; border-radius:999px; border:1px solid var(--wr-border); background:var(--wr-chip); color:var(--wr-text)}
.token-chip svg{color:var(--wr-brand)}

/* Modern Toggle */
.toggle{
  --w:42px; --h:24px; --p:3px;
  position:relative; display:inline-flex; align-items:center; gap:8px; font-size:12px; color:var(--wr-muted);
}
.toggle input{appearance:none; width:var(--w); height:var(--h); border-radius:999px; border:1px solid var(--wr-border); background:#E5E7EB; position:relative; cursor:pointer; outline:none; transition:all .18s ease}
.toggle input::after{
  content:""; position:absolute; top:var(--p); left:var(--p); width:calc(var(--h) - var(--p)*2); height:calc(var(--h) - var(--p)*2);
  border-radius:999px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.12); transition:all .18s ease;
}
.toggle input:checked{background:#D9EEF8; border-color:#BFE2F3}
.toggle input:checked::after{left:calc(var(--w) - var(--h) + var(--p)); background:var(--wr-brand)}
`;

/* =================== UTILITIES =================== */
const fmtInt = (n: number) => new Intl.NumberFormat().format(n);
const fmt1 = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n);
const compact = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

function faviconUrlFromDomain(domain: string) {
  const host = (domain || "").replace(/^https?:\/\//, "");
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const cols = Object.keys(rows[0] || {});
  const header = cols.join(",");
  const data = rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
  const csv = header + "\n" + data;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* =================== MICRO BAR TREND (with smart popover: exact date + dot + name) =================== */
function MicroBars({
  data,
  color = "var(--wr-kpi-bar)",
  metricName,
  format = (v: number) => fmt1(v),
  dates,
}: {
  data: number[];
  color?: string;
  metricName: string;
  format?: (v: number) => string;
  /** optional ISO date labels (YYYY-MM-DD). If omitted, will generate last N days ending today. */
  dates?: string[];
}) {
  const series = useMemo(() => {
    const n = (data?.length || 0) > 0 ? data.length : 1;
    if (dates && dates.length === data.length) {
      return data.map((v, i) => ({ i, v, t: dates[i] }));
    }
    // Generate exact dates: last N days ending today
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (n - 1));
    return (data?.length ? data : [0]).map((v, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
      return { i, v, t: iso };
    });
  }, [data, dates]);

  return (
    <ResponsiveContainer width="100%" height={64}>
      <BarChart data={series} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="i" hide />
        <YAxis hide />
        <Bar dataKey="v" fill={color} radius={[4, 4, 0, 0]} />
        <RTooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          content={({ active, payload }: any) => {
            if (!active || !payload?.length) return null;
            const row = payload[0]?.payload as { t: string; v: number };
            return (
              <div
                className="rounded-md p-2 text-xs shadow"
                style={{ background: "#fff", border: "1px solid #E5E7EB", color: "var(--wr-text)" }}
              >
                <div className="mb-1 font-medium" style={{ color: "var(--wr-muted)" }}>
                  {row?.t || ""}
                </div>
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2" style={{ color: "var(--wr-muted)" }}>
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <span className="text-[12px]">{metricName}</span>
                  </div>
                  <div className="text-[13px] font-semibold">{format(Number(row?.v ?? 0))}</div>
                </div>
              </div>
            );
          }}
          wrapperStyle={{ outline: "none" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* =================== KPI DELTA BADGE =================== */
function DeltaBadge({ delta, goodWhenDown = false }: { delta: number; goodWhenDown?: boolean }) {
  if (!isFinite(delta) || delta === 0) return (
    <span className="kpi-delta kpi-neutral">
      <Info size={14} /> Δ 0
    </span>
  );
  const good = goodWhenDown ? delta < 0 : delta > 0;
  const cls = good ? "kpi-good" : "kpi-bad";
  return (
    <span className={`kpi-delta ${cls}`}>
      {good ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M12 19l6-6M12 19l-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      Δ {fmt1(Math.abs(delta))}
    </span>
  );
}

/* =================== KPI CARD =================== */
function KpiCard({
  label,
  value,
  delta,
  goodWhenDown,
  unit,
  series,
  icon,
  dates,
  valueFormatter,
}: {
  label: string;
  value: string;
  delta: number;
  goodWhenDown?: boolean; // for Avg Rank: lower is better
  unit?: string;
  series: number[];
  icon?: React.ReactNode;
  /** optional exact dates for the trend tooltip */
  dates?: string[];
  /** optional value formatter for tooltip values */
  valueFormatter?: (v: number) => string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-left">
        <div className="kpi-label">
          {icon ? <span className="text-[var(--wr-brand)]">{icon}</span> : null}
          {label}
        </div>
        <div className="kpi-value">
          {value} {unit ? <span className="small"> {unit}</span> : null}
        </div>
        <DeltaBadge delta={delta} goodWhenDown={goodWhenDown} />
      </div>
      <div className="kpi-chart">
        <MicroBars
          data={series}
          metricName={label}
          format={valueFormatter ?? ((v) => fmt1(v))}
          dates={dates}
        />
      </div>
    </div>
  );
}

/* =================== SECTION WRAPPER =================== */
function Section({
  title,
  titleIcon,
  onExport,
  right,
  children,
}: {
  title: string;
  titleIcon?: React.ReactNode;
  onExport?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="section">
      <div className="section-hd">
        <div className="section-ttl">
          {titleIcon} {title}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {right}
          {onExport && (
            <button className="iconbtn cursor-pointer" onClick={onExport} aria-label={`Export ${title}`}>
              <Download size={16} /> Export
            </button>
          )}
        </div>
      </div>
      <div className="section-ct">{children}</div>
    </div>
  );
}

/* =================== DEMO DATA =================== */
type SerpItem = { rank: number; title: string; domain: string; path: string; url: string };
const serpTop3: SerpItem[] = [
  { rank: 1, title: "Best SEO Tools for 2025 (Ranked)", domain: "ahrefs.com", path: "/blog/best-seo-tools", url: "https://ahrefs.com/blog/best-seo-tools" },
  { rank: 2, title: "All-in-one SEO platform", domain: "semrush.com", path: "/features", url: "https://semrush.com/features" },
  { rank: 3, title: "SEO tools by Moz", domain: "moz.com", path: "/tools", url: "https://moz.com/tools" },
];

const sampleTrend = [12, 14, 15, 18, 19, 21, 26];             // Top‑10 count
const avgRankTrend = [14.1, 14.0, 13.7, 13.3, 12.8, 12.7, 12.6]; // lower is better
const visTrend = [32, 36, 35, 38, 39, 41, 44];                 // visibility %

/* =================== MAIN DRAWER =================== */
export function PageQuickViewDrawer({
  open,
  onClose,
  isPremium = true,
  setPremium,
  urlPath = "/blog/keyword-research-guide",
  domain = "wranker.com",
  device = "Desktop",
  locationISO = "IN",
  httpStatus = 200,
  indexable = true,
  canonical = true,
}: {
  open: boolean;
  onClose: () => void;
  isPremium?: boolean;
  setPremium?: (v: boolean) => void;
  urlPath?: string;
  domain?: string;
  device?: "Desktop" | "Mobile";
  locationISO?: string;
  httpStatus?: number;
  indexable?: boolean;
  canonical?: boolean;
}) {
  // KPI values/deltas from series
  const top10Count = sampleTrend[sampleTrend.length - 1];
  const top10Prev = sampleTrend[sampleTrend.length - 2] ?? top10Count;
  const top10Delta = top10Count - top10Prev;

  const avgRank = avgRankTrend[avgRankTrend.length - 1];
  const avgRankPrev = avgRankTrend[avgRankTrend.length - 2] ?? avgRank;
  const avgDelta = avgRank - avgRankPrev; // lower is better

  const vis = visTrend[visTrend.length - 1];
  const visPrev = visTrend[visTrend.length - 2] ?? vis;
  const visDelta = vis - visPrev;

  const copyFull = () => {
    try { navigator.clipboard?.writeText(`https://${domain}${urlPath}`); } catch {}
  };

  const exportHeader = () => {
    downloadCSV("quick-view-header.csv", [
      { domain, path: urlPath, device, location: locationISO, httpStatus, indexable, canonical },
    ]);
  };

  const exportKpis = () => {
    downloadCSV("page-kpis.csv", [
      { metric: "Top10", value: top10Count, delta: top10Delta, series: sampleTrend.join("|") },
      { metric: "AvgRank", value: avgRank, delta: avgDelta, series: avgRankTrend.join("|") },
      { metric: "Visibility", value: vis, delta: visDelta, series: visTrend.join("|") },
    ]);
  };

  const exportSerp = () => {
    downloadCSV("ranking-context.csv", serpTop3.map(s => ({ rank: s.rank, title: s.title, url: s.url })));
  };

  const exportCanni = () => {
    downloadCSV("cannibalization.csv", [
      { altUrl: "/blog/keyword-research", rank: 18 },
      { altUrl: "/guides/keyword-research", rank: 23 },
    ]);
  };

  const deviceIcon = device === "Desktop" ? <Monitor size={14}/> : <Smartphone size={14}/>;
  const favSrc = faviconUrlFromDomain(domain);

  if (!open) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div  onClick={onClose} aria-label="Close quick view overlay">
        <aside  onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Page quick view">
          {/* ============ HEADER ============ */}
          <div className="wr-header">
            <div className="wr-url" title={`https://${domain}${urlPath}`}>
              {/* Favicon for the domain */}
              <img className="wr-favicon" src={favSrc} alt={`${domain} favicon`} />
              <div style={{ minWidth: 0 }}>
                <div className="wr-path">{urlPath}</div>
                <div className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{domain}</span>
                </div>
              </div>
              <div className="wr-badges" style={{ marginLeft: 10 }}>
                <span className={`badge ${httpStatus >= 200 && httpStatus < 400 ? "good" : "bad"}`}>HTTP {httpStatus}</span>
                <span className={`badge ${indexable ? "good" : "bad"}`}>{indexable ? "Indexable" : "Noindex"}</span>
                <span className={`badge ${canonical ? "good" : "warn"}`}>
                  {canonical ? "Canonical set" : <><AlertTriangle size={14} /> Non‑canonical</>}
                </span>
                <span className="badge brand">
                  {deviceIcon} {device} • {locationISO}
                </span>
              </div>
            </div>

            <div className="wr-actions">
              {/* Demo-only modern toggle (modular) */}
              {setPremium && (
                <label className="toggle" title="Demo-only: toggle premium">
                  <input type="checkbox" checked={isPremium} onChange={(e) => setPremium(e.target.checked)} />
                  Premium
                </label>
              )}
              <button className="iconbtn cursor-pointer" onClick={exportHeader}><Download size={16} /> Export</button>
              <button className="iconbtn cursor-pointer" onClick={() => window.open(`https://${domain}${urlPath}`, "_blank")}>
                <ExternalLink size={16}/> Open
              </button>
              <button className="iconbtn icononly cursor-pointer" onClick={copyFull} aria-label="Copy full URL"><Copy size={16}/></button>
            </div>
          </div>

          {/* ============ BODY ============ */}
          <div className="wr-body">
            {/* KPI Snapshot */}
            <Section
              title="Keyword Performance Snapshot"
              titleIcon={<Info size={16} />}
              onExport={exportKpis}
              right={
                <span className="token-chip" title="Trends reflect the last 7 days">
                  <Info size={14} /> Last 7 days
                </span>
              }
            >
              <div className="kpi-grid">
                <KpiCard
                  label="Top 10 Keywords"
                  value={fmtInt(top10Count)}
                  delta={top10Delta}
                  series={sampleTrend}
                  icon={<Info size={14} />}
                  /** Tooltip value format is numeric */
                  valueFormatter={(v) => fmt1(v)}
                />
                <KpiCard
                  label="Avg Rank"
                  value={fmt1(avgRank)}
                  delta={avgDelta}
                  goodWhenDown
                  series={avgRankTrend}
                  icon={<Info size={14} />}
                  valueFormatter={(v) => fmt1(v)}
                />
                <div className={isPremium ? "" : "blurred"} style={{ position:"relative" }}>
                  {!isPremium && <span className="blur-note badge">Premium</span>}
                  <KpiCard
                    label="Visibility (Top 20)"
                    value={fmt1(vis)}
                    delta={visDelta}
                    series={visTrend}
                    unit="%"
                    icon={<Info size={14} />}
                    /** Tooltip shows % */
                    valueFormatter={(v) => `${fmt1(v)}%`}
                  />
                  {!isPremium && <div className="blur-overlay"><span className="badge brand">Unlock full trends</span></div>}
                </div>
              </div>
            </Section>

            {/* Ranking context */}
            <Section
              title="Current Ranking Context"
              titleIcon={<RefreshCw size={16} />}
              onExport={exportSerp}
              right={
                <button className="iconbtn cursor-pointer" onClick={() => alert("Open SERP Preview modal")}>
                  <RefreshCw size={16}/> View Full SERP
                </button>
              }
            >
              <div className="small" style={{ marginBottom: 8, display:"flex", gap:8, flexWrap:"wrap" }}>
                <span className="badge brand">#7 keyword research</span>
                <span className="badge"> {deviceIcon} {device} • {locationISO}</span>
                <span className="badge good">Δ +2 vs 7d</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {serpTop3.map((s) => (
                  <div key={s.rank} className="rank-item">
                    <div className="rank-row">
                      <div className="rank-no">#{s.rank}</div>
                      <div className="rank-main">
                        <a className="rank-title" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
                        <div className="rank-url" style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {/* Show favicon for SERP item domain */}
                          <img src={faviconUrlFromDomain(s.domain)} alt="" width={14} height={14} style={{ borderRadius:4 }} />
                          {s.domain} • {s.path}
                        </div>
                        <div className="rank-cta">
                          <a className="linkbtn cursor-pointer" href={s.url} target="_blank" rel="noreferrer">View Page</a>
                          <button className="linkbtn cursor-pointer" onClick={() => alert(`Task: ${s.title}`)}>Assign Task</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Cannibalization & Health */}
            <Section title="Cannibalization & Health Flags" titleIcon={<AlertTriangle size={16} />} onExport={exportCanni}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="canni-pill"><AlertTriangle size={14} /> Cannibalized</span>
                <span className="small">Multiple URLs compete for the same keyword.</span>
              </div>

              <div className={isPremium ? "canni-list" : "canni-list blurred"} style={{ position:"relative" }}>
                {!isPremium && <span className="blur-note badge">Premium</span>}
                <div className="rank-item" style={{ padding: 8 }}>
                  <div className="small">/blog/keyword-research • <span className="badge brand">#18</span></div>
                </div>
                <div className="rank-item" style={{ padding: 8 }}>
                  <div className="small">/guides/keyword-research • <span className="badge brand">#23</span></div>
                </div>
                {!isPremium && <div className="blur-overlay"><span className="badge brand">Unlock competing URLs</span></div>}
              </div>

              <div className={isPremium ? "rank-item" : "rank-item blurred"} style={{ marginTop: 10, position:"relative" }}>
                {!isPremium && <span className="blur-note badge">Premium</span>}
                <div className="small">
                  <strong>Health snapshot</strong> — Indexed • CWV: Pass • Internal Links In: 36
                </div>
                {!isPremium && <div className="blur-overlay"><span className="badge brand">Unlock health signals</span></div>}
              </div>

              {/* CTAs */}
              <div className="footer-ctas">
                <button
                  className="cta primary cursor-pointer"
                  onClick={() => window.open(`/page-analyzer?url=${encodeURIComponent(urlPath)}&tab=keywords`, "_blank")}
                >
                  <Info size={16} /> Check Full Page Insights
                </button>
                <button
                  className="cta secondary cursor-pointer"
                  onClick={() => window.open(`/site-audit/page-audit?url=${encodeURIComponent(urlPath)}`, "_blank")}
                >
                  <Info size={16} /> Audit Page Health
                </button>
              </div>
            </Section>
          </div>
        </aside>
      </div>
    </>
  );
}

/* =================== DEMO WRAPPER (safe to remove) =================== */
export default function DemoQuickView() {
  const [open, setOpen] = useState(true);
  const [premium, setPremium] = useState(true);

  return (
<>

  <PageQuickViewDrawer
        open={open}
        onClose={() => setOpen(false)}
        isPremium={premium}
        setPremium={setPremium}  // demo-only toggle
        urlPath="/blog/keyword-research"
        domain="wranker.com"
        device="Desktop"
        locationISO="IN"
        httpStatus={200}
        indexable={true}
        canonical={true}
      />
</>
  );
}
