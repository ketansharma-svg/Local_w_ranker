"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  Wrench,
  Info,
  Shield,
  FileText,
  Link as LinkIcon,
  Activity,
  Globe,
  Monitor,
} from "lucide-react";
import DemoQuickView from "./QuickView";

/* ────────────────────────────────────────────────────────────
   Tokens
   ──────────────────────────────────────────────────────────── */
const TK = {
  text: "#111827",
  muted: "#6B7280",
  brand: "#008CCD",
  brandHover: "#007BB8",
  coreBlue: "#4286F5",
  coreBlueFill: "#D9EEF8",
  border: "#E5E7EB",
  chipBg: "#F5F7FA",
  panel: "#FFFFFF",
  hover: "#FAFAFA",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#E94134",
  radius: 10,
} as const;

/* ────────────────────────────────────────────────────────────
   Types (public)
   ──────────────────────────────────────────────────────────── */
export interface LandingPageEntry {
  url: string;              // absolute or relative
  title?: string | null;
  rank: number | null;      // null => NR
  metaTitle?: string | null;
  wordCount?: number | null;
  internalLinksIn?: number | null;
  indexed?: boolean | null;
  seoScore?: number | null; // optional (Page Analyzer)
}

export interface LandingPageInsightsProps {
  projectDomain: string;
  device: "desktop" | "mobile";
  locationISO: string;
  primary: LandingPageEntry;
  alternates?: LandingPageEntry[];
  isPremium?: boolean;

  onOpenPage?: (url: string) => void;
  onOpenPageDrawer?: (url: string) => void;
  onAnalyzePage?: (url: string) => void;
  onFixCannibalization?: (urls: string[]) => void;
  onExport?: (rows: LandingPageEntry[]) => void;
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
const compact = (n?: number | null) =>
  typeof n === "number"
    ? new Intl.NumberFormat(undefined, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n)
    : "—";

const pathFromUrl = (input: string, projectDomain: string) => {
  try {
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input);
      if (u.hostname.replace(/^www\./, "") === projectDomain.replace(/^www\./, "")) {
        return u.pathname + (u.search || "");
      }
      return `${u.hostname}${u.pathname}`;
    }
    return input.startsWith("/") ? input : `/${input}`;
  } catch {
    return input;
  }
};

const domainFromUrl = (input: string, fallbackDomain: string) => {
  try {
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input);
      return u.hostname;
    }
  } catch {}
  return fallbackDomain;
};

const faviconUrl = (inputUrl: string, projectDomain: string) => {
  const host = domainFromUrl(inputUrl, projectDomain);
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
};

const exportLandingCSV = (rows: LandingPageEntry[], filename = "landing-pages.csv") => {
  const cols = ["url", "rank", "wordCount", "internalLinksIn", "indexed", "seoScore"];
  const header = cols.join(",");
  const lines = rows
    .map((r) =>
      cols
        .map((k) => {
          const v = (r as any)[k];
          return JSON.stringify(v ?? "");
        })
        .join(",")
    )
    .join("\n");
  const csv = header + "\n" + lines;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

const rankBadge = (rank: number | null, device: "desktop" | "mobile", loc: string) => {
  const ranked = typeof rank === "number" && rank > 0 && rank <= 100;
  const label = ranked ? `#${rank}` : "Not Ranked";
  const bg = ranked ? TK.coreBlue : TK.danger;
  const Icon = device === "desktop" ? Monitor : Globe;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-[12px] font-semibold"
      title={`Ranked ${ranked ? `#${rank}` : "NR"} on ${device === "desktop" ? "Desktop" : "Mobile"} – ${loc}`}
      style={{ background: bg, cursor: "default" }}
    >
      <Icon size={14} color="white" />
      {label}
    </span>
  );
};

/* ────────────────────────────────────────────────────────────
   Micro UI: Chip, Button, Switch
   ──────────────────────────────────────────────────────────── */
const Chip: React.FC<React.PropsWithChildren<{ title?: string }>> = ({ children, title }) => (
  <span
    title={title}
    className="inline-flex items-center gap-2 h-7 px-3 rounded-full text-[12px] border cursor-default"
    style={{ background: TK.chipBg, borderColor: TK.border, color: TK.muted }}
  >
    {children}
  </span>
);

const GhostButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ icon, children, className, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 h-9 px-3 rounded-md border text-[14px] cursor-pointer ${className ?? ""}`}
    style={{ borderColor: TK.border, color: TK.text }}
    onMouseEnter={(e) => ((e.currentTarget.style.background = TK.hover))}
    onMouseLeave={(e) => ((e.currentTarget.style.background = "#fff"))}
  >
    <span className="inline-flex items-center" style={{ color: TK.brand }}>{icon}</span>
    <span className="font-medium">{children}</span>
  </button>
);

const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode }
> = ({ icon, children, className, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 h-9 px-3 rounded-md text-white cursor-pointer ${className ?? ""}`}
    style={{ background: TK.brand }}
    onMouseEnter={(e) => ((e.currentTarget.style.background = TK.brandHover))}
    onMouseLeave={(e) => ((e.currentTarget.style.background = TK.brand))}
  >
    <span className="inline-flex items-center">{icon}</span>
    <span className="font-medium">{children}</span>
  </button>
);

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
    {label ? <span className="text-sm" style={{ color: TK.muted }}>{label}</span> : null}
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors"
      style={{ background: checked ? TK.brand : "#e5e7eb" }}
    >
      <span
        className="inline-block h-5 w-5 bg-white rounded-full shadow transform transition-transform"
        style={{ translate: checked ? "22px 0" : "2px 0" }}
      />
    </button>
  </label>
);

/* ────────────────────────────────────────────────────────────
   Subcomponents
   ──────────────────────────────────────────────────────────── */
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
const RowCard: React.FC<{
  title: string;
  subtitle?: string;
  url: string;
  projectDomain: string;
  rank: number | null;
  device: "desktop" | "mobile";
  locationISO: string;
  onOpenPage?: (url: string) => void;
  onOpenPageDrawer?: (url: string) => void;
}> = ({ title, subtitle, url, projectDomain, rank, device, locationISO, onOpenPage, onOpenPageDrawer }) => (
  <div
    className="flex items-center justify-between gap-3 p-3 rounded-md border"
    style={{ borderColor: TK.border, background: TK.panel }}
  >
    <div className="min-w-0 flex items-center gap-3">
      <img
        src={faviconUrl(url, projectDomain)}
        alt=""
        width={18}
        height={18}
        className="rounded"
      />
      <div className="min-w-0">
        <button
          // onClick={""}
          className="text-[14px] font-medium text-left truncate hover:underline underline-offset-2 cursor-pointer"
          style={{ color: TK.text }}
          title={title || undefined}
        >
          {pathFromUrl(url, projectDomain)}
        </button>
        <div className="flex items-center gap-2 mt-0.5 text-[12px]" style={{ color: TK.muted }}>
          <span className="truncate">{subtitle || "—"}</span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-3">
      {rankBadge(rank, device, locationISO)}
      <button
        title="Open drawer"
        onClick={() =>
          onOpenPageDrawer ? onOpenPageDrawer(url) : window.alert("Drawer not implemented")
        }
        className="rounded-md border px-2 py-1 flex items-center gap-1 text-sm hover:bg-gray-50"
      >
        <ExternalLink size={16} /> Open
      </button>
    </div>
  </div>
);

const HealthCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  helper?: string;
}> = ({ icon, title, value, helper }) => (
  <div
    className="rounded-md border p-3 h-full"
    style={{ borderColor: TK.border, background: TK.panel }}
  >
    <div className="flex items-center gap-2 mb-1">
      <span className="inline-flex items-center" style={{ color: TK.brand }}>{icon}</span>
      <div className="text-[13px] font-semibold" style={{ color: TK.text }}>{title}</div>
    </div>
    <div className="text-[18px] font-bold leading-tight" style={{ color: TK.text }}>{value}</div>
    {helper ? (
      <div className="text-[12px] mt-0.5" style={{ color: TK.muted }}>{helper}</div>
    ) : null}
  </div>
);

/* ────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────── */
export const LandingPageInsights: React.FC<LandingPageInsightsProps> = ({
  projectDomain,
  device,
  locationISO,
  primary,
  alternates = [],
  isPremium = true,
  onOpenPage,
  onOpenPageDrawer,
  onAnalyzePage,
  onFixCannibalization,
  onExport,
}) => {
  const [showAllAlts, setShowAllAlts] = React.useState(false);

  const cannibalized = alternates.length > 0;
  const maxShow = 5;
  const visible = showAllAlts ? alternates.slice(0, maxShow) : alternates.slice(0, 3);
  const remaining = Math.max(0, Math.min(maxShow, alternates.length) - visible.length);

  const allRows = React.useMemo<LandingPageEntry[]>(() => [primary, ...alternates], [primary, alternates]);

  const handleExport = () => {
    if (onExport) onExport(allRows);
    else exportLandingCSV(allRows, "landing-pages.csv");
  };

  const doFixCannibalization = () => {
    const urls = [primary.url, ...alternates.map((a) => a.url)];
    onFixCannibalization ? onFixCannibalization(urls) : console.info("Fix Cannibalization", urls);
  };

  const doAnalyze = () => {
    onAnalyzePage ? onAnalyzePage(primary.url) : console.info("Analyze Full Page", primary.url);
  };
  const [drawerRow, setDrawerRow] = React.useState<string | null>(null);
  const openDrawer = (url: string) => setDrawerRow(url);
  const closeDrawer = () => setDrawerRow(null);

  return (
    <section
      className="w-full rounded-[12px] border p-4"
      style={{
        borderColor: TK.border,
        background: "#fff",
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
        color: TK.text,
      }}
      aria-label="Landing Page Insights"
    >
      {/* Header */}
      <header
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center gap-2">
          <Wrench size={18} color={TK.brand} />
          <h2 className="text-[16px] font-semibold">Landing Page Insights</h2>
          {cannibalized ? (
            <span
              className="ml-1 inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full"
              style={{ background: TK.coreBlueFill, color: TK.text, border: `1px solid ${TK.border}` }}
              title="Multiple URLs are competing for this keyword"
            >
              <Info size={14} color={TK.brand} />
              Cannibalized
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Chip title="Targeting device">
            {device === "desktop" ? <Monitor size={14} /> : <Globe size={14} />}
            {device === "desktop" ? "Desktop" : "Mobile"}
          </Chip>
          <Chip title="Search location">
            <Globe size={14} />
            {locationISO}
          </Chip>
          <GhostButton
            title="Export"
            aria-label="Export Landing Page data"
            onClick={handleExport}
            icon={<Download size={16} />}
          >
            Export
          </GhostButton>
        </div>
      </header>

      {/* Primary page row */}
      <div className="mt-4">
        <RowCard
          title={primary.title ?? ""}
          subtitle={primary.title ?? primary.metaTitle ?? "—"}
          url={primary.url}
          projectDomain={projectDomain}
          rank={primary.rank}
          device={device}
          locationISO={locationISO}
          onOpenPageDrawer={openDrawer}
        />
                                            {drawerRow &&  (
                          <Drawer title="Drawer" onClose={closeDrawer}>
                          <DemoQuickView/> 
                          </Drawer>
                        )}
      </div>

      {/* Alternates (Cannibalization) */}
      {alternates.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="text-[14px] font-semibold">Alternate URLs</div>
              <span className="text-[12px]" style={{ color: TK.muted }}>
                {Math.min(maxShow, alternates.length)} shown{alternates.length > maxShow ? " (cap)" : ""}
              </span>
            </div>
            <Switch checked={showAllAlts} onChange={setShowAllAlts} label={`Show all${remaining > 0 ? ` (+${remaining})` : ""}`} />
          </div>

          <div className="space-y-2">
            {visible.map((alt, i) => (
              <RowCard
                key={`alt-${i}`}
                title={alt.title ?? ""}
                subtitle={alt.title ?? alt.metaTitle ?? "—"}
                url={alt.url}
                projectDomain={projectDomain}
                rank={alt.rank}
                device={device}
                locationISO={locationISO}
                onOpenPage={onOpenPage}
                onOpenPageDrawer={onOpenPageDrawer}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
            <PrimaryButton onClick={doFixCannibalization} icon={<Wrench size={16} />}>
              Fix Cannibalization
            </PrimaryButton>
            <GhostButton onClick={doAnalyze} icon={<Activity size={16} />}>
              Analyze Full Page
            </GhostButton>
          </div>
        </div>
      )}

      {/* Page Health Snapshot — separate metric cards with branded icons */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} color={TK.brand} />
          <div className="text-[14px] font-semibold">Page Health Snapshot</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HealthCard
            icon={<FileText size={16} />}
            title="Word Count"
            value={typeof primary.wordCount === "number" ? compact(primary.wordCount) : "—"}
            helper="Body text length"
          />
          <HealthCard
            icon={<LinkIcon size={16} />}
            title="Internal Links In"
            value={typeof primary.internalLinksIn === "number" ? compact(primary.internalLinksIn) : "—"}
            helper="Count of internal inlinks"
          />
          <HealthCard
            icon={<Shield size={16} />}
            title="Indexed"
            value={
              typeof primary.indexed === "boolean" ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: primary.indexed ? TK.good : TK.danger }}
                    aria-hidden
                  />
                  {primary.indexed ? "Yes" : "No"}
                </span>
              ) : (
                "—"
              )
            }
            helper="Search index status"
          />
          <HealthCard
            icon={<Activity size={16} />}
            title="SEO Score"
            value={
              typeof primary.seoScore === "number"
                ? `${Math.max(0, Math.min(100, primary.seoScore)).toFixed(0)}`
                : "—"
            }
            helper="Analyzer score (0–100)"
          />
        </div>
      </div>
    </section>
  );
};

/* ────────────────────────────────────────────────────────────
   Demo (remove in production)
   ──────────────────────────────────────────────────────────── */
export default function DemoLandingPageInsightsSection() {
  const primary: LandingPageEntry = {
    url: "https://wranker.com/seo-tools/audit",
    title: "SEO Audit Tool — All‑in‑one Website Auditor",
    rank: 5,
    wordCount: 1890,
    internalLinksIn: 63,
    indexed: true,
    seoScore: 78,
  };

  const alternates: LandingPageEntry[] = [
    { url: "https://wranker.com/blog/seo-audit-checklist", title: "SEO Audit Checklist (2025)", rank: 12, wordCount: 2450, internalLinksIn: 18, indexed: true },
    { url: "https://wranker.com/help/seo-audit-guide", title: "Help Center — SEO Audit Guide", rank: 21, wordCount: 980, internalLinksIn: 9, indexed: true },
    { url: "https://wranker.com/academy/seo-audit", title: "Academy: SEO Audit Training", rank: 37, wordCount: 3200, internalLinksIn: 12, indexed: true },
    { url: "https://wranker.com/seo/audit-tool", title: "SEO | Audit Tool Landing", rank: 49, wordCount: 1100, internalLinksIn: 7, indexed: true },
  ];

  return (
    <div className="p-4 space-y-3" style={{ fontFamily: 'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif' }}>
      <LandingPageInsights
        projectDomain="wranker.com"
        device="desktop"
        locationISO="US"
        primary={primary}
        alternates={alternates}
        isPremium={true}
        onOpenPage={(url) => window.open(url, "_blank")}
        onOpenPageDrawer={(url) => console.info("Open Page Drawer:", url)}
        onAnalyzePage={(url) => console.info("Analyze Full Page:", url)}
        onFixCannibalization={(urls) => console.info("Fix Cannibalization URLs:", urls)}
        onExport={(rows) => exportLandingCSV(rows)}
      />
    </div>
  );
}
