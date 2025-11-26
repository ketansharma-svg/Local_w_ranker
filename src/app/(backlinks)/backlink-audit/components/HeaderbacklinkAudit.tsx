import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link2,
  Download,
  ClipboardPlus,
  ShieldCheck,
  SlidersHorizontal,
  RefreshCcw,
  PlugZap,
  Settings as SettingsIcon,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Globe2,
  Activity,
  Link as LinkIcon,
  ShieldAlert,
  FileText,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

/**
 * Wranker – Backlink Audit: Header (Sticky) + Tab Navigation (Sticky) + Tab Filters Row
 * - Drop-in React + Tailwind + TypeScript (TSX)
 * - Aligned with latest tokens, brand color #008CCD, Inter/Inter Fallback fonts
 * - Branded icons for Header title & Access chip; favicon in Project selector chip
 * - Selected nav tab uses brand pastel (filled) & brand-colored icons
 * - Pointer cursor only for clickable elements
 */

/* ---------- latest design tokens ---------- */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007FB8",
  brandSoft: "#E6F6FB", // pastel fill
  brandRing: "rgba(0,140,205,0.35)",
  panel: "#F9FAFB",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
};

const RADIUS = 10;
const BORDER = 1;

/* ---------- helpers & hooks ---------- */
function useStickyShadow(offset = 6) {
  const [shadow, setShadow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShadow(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return shadow;
}

function fmtDateTime(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

function getDomainFromProjectName(name: string) {
  try {
    // Accept "w3era.com", "https://w3era.com" or "sub.w3era.com/path"
    const hasProtocol = /^https?:\/\//i.test(name);
    const url = new URL(hasProtocol ? name : `https://${name}`);
    return url.hostname;
  } catch {
    return name.replace(/^https?:\/\//i, "").split("/")[0];
  }
}

/* ---------- primitives ---------- */
function IconChip({
  title,
  children,
  onClick,
  tone = "neutral",
  active = false,
}: React.PropsWithChildren<{
  title: string;
  onClick?: () => void;
  tone?: "neutral" | "brand" | "danger";
  active?: boolean;
}>) {
  const [hover, setHover] = useState(false);
  const palette =
    tone === "brand"
      ? { border: TOKENS.brand, text: TOKENS.brand, bgHover: TOKENS.brandSoft }
      : tone === "danger"
      ? { border: TOKENS.danger, text: TOKENS.danger, bgHover: "#FEF2F2" }
      : { border: TOKENS.border, text: TOKENS.text, bgHover: "#F3F4F6" };

  const bg = active ? TOKENS.brandSoft : hover ? palette.bgHover : TOKENS.surface;
  const color = active ? TOKENS.brand : palette.text;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cx(
        "inline-flex items-center gap-2 h-9 px-3 text-[13px] font-medium select-none",
        onClick ? "cursor-pointer" : ""
      )}
      style={{
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${active ? TOKENS.brand : palette.border}`,
        background: bg,
        color,
        boxShadow: hover
          ? `0 0 0 3px ${TOKENS.brandRing}`
          : "none",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  title,
  onClick,
  icon: Icon,
  disabled,
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cx(
        "inline-flex items-center gap-2 h-10 px-3 text-[14px] font-medium text-white",
        disabled ? "opacity-60" : "cursor-pointer"
      )}
      style={{
        borderRadius: RADIUS,
        background: hover && !disabled ? TOKENS.brandHover : TOKENS.brand,
        boxShadow: hover && !disabled ? `0 0 0 4px ${TOKENS.brandRing}` : "none",
      }}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

/* ---------- small header controls ---------- */
function Breadcrumb({
  onGoDashboard,
  onGoBacklinks,
}: {
  onGoDashboard?: () => void;
  onGoBacklinks?: () => void;
}) {
  return (
    <nav className="flex items-center text-[13px]" aria-label="Breadcrumb">
      <button onClick={onGoDashboard} className="text-gray-600 hover:text-gray-800 cursor-pointer">
        SEO Dashboard
      </button>
      <ChevronRight className="mx-2 size-4 text-gray-400" />
      <button onClick={onGoBacklinks} className="text-gray-600 hover:text-gray-800 cursor-pointer">
        Backlinks Insights
      </button>
      <ChevronRight className="mx-2 size-4 text-gray-400" />
      <span className="font-medium text-gray-800">Audit</span>
    </nav>
  );
}

function SiteFavicon({ domain, size = 16 }: { domain: string; size?: number }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-sm"
      onError={(e) => {
        // fallback to a simple circle
        const el = e.currentTarget;
        el.style.display = "none";
        const fallback = document.createElement("span");
        fallback.style.width = `${size}px`;
        fallback.style.height = `${size}px`;
        fallback.style.borderRadius = "4px";
        fallback.style.background = TOKENS.brandSoft;
        fallback.style.display = "inline-block";
        el.parentElement?.insertBefore(fallback, el);
      }}
    />
  );
}

function ProjectAccess() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"My Projects" | "Shared Projects" | "All Projects">("My Projects");
  const OptionIcon = ({ label }: { label: string }) =>
    label === "My Projects" ? (
      <User size={16} color={TOKENS.brand} />
    ) : label === "Shared Projects" ? (
      <Users size={16} color={TOKENS.brand} />
    ) : (
      <Globe2 size={16} color={TOKENS.brand} />
    );
  return (
    <div className="relative">
      <IconChip title="Access Type" onClick={() => setOpen((s) => !s)} tone="neutral">
        <OptionIcon label={mode} />
        <span>{mode}</span>
        <ChevronDown size={16} className="text-gray-500" />
      </IconChip>
      {open && (
        <div
          className="absolute z-40 mt-2 bg-white shadow min-w-[240px]"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          {(["My Projects", "Shared Projects", "All Projects"] as const).map((m) => (
            <button
              key={m}
              className={cx(
                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2",
                "cursor-pointer"
              )}
              onClick={() => {
                setMode(m);
                setOpen(false);
              }}
            >
              <OptionIcon label={m} />
              <span>{m}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectSelector({ projectName }: { projectName: string }) {
  const [open, setOpen] = useState(false);
  const domain = getDomainFromProjectName(projectName);
  return (
    <div className="relative">
      <IconChip title="Select Project" onClick={() => setOpen((s) => !s)} tone="neutral">
        <SiteFavicon domain={domain} />
        <span className="font-medium">{projectName}</span>
        <ChevronDown size={16} className="text-gray-500" />
      </IconChip>
      {open && (
        <div
          className="absolute z-40 mt-2 bg-white shadow min-w-[280px]"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.border}` }}
        >
          {[
            { label: "w3era.com (current)", value: "w3era.com" },
            { label: "wranker.com", value: "wranker.com" },
            { label: "vefogix.com", value: "vefogix.com" },
          ].map((opt, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
            >
              <SiteFavicon domain={opt.value} />
              <span>{opt.label}</span>
            </button>
          ))}
          <div className="my-1" style={{ borderTop: `${BORDER}px solid ${TOKENS.border}` }} />
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
            Open Project Settings
          </button>
        </div>
      )}
    </div>
  );
}

function IntegrationsStatus({
  gscConnected,
  ga4Connected,
  onOpenIntegrations,
}: {
  gscConnected?: boolean;
  ga4Connected?: boolean;
  onOpenIntegrations?: () => void;
}) {
  return (
    <IconChip title="Integrations" onClick={onOpenIntegrations}>
      <PlugZap size={16} color={TOKENS.brand} />
      <span className="hidden sm:flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          {gscConnected ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="text-red-500" />
          )}
          <span>GSC</span>
        </span>
        <span className="inline-flex items-center gap-1">
          {ga4Connected ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="text-red-500" />
          )}
          <span>GA4</span>
        </span>
      </span>
    </IconChip>
  );
}

/* ---------- tabs & filters ---------- */
type AuditTabId = "overview" | "domains" | "new-lost" | "anchors" | "disavow" | "pages";

const AUDIT_TABS: { id: AuditTabId; label: string; Icon: any }[] = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "domains", label: "Ref. Domains & Backlinks", Icon: Globe2 },
  { id: "new-lost", label: "New & Lost", Icon: Activity },
  { id: "anchors", label: "Anchor Risk Audit", Icon: LinkIcon },
  { id: "disavow", label: "Disavow Manager", Icon: ShieldAlert },
  { id: "pages", label: "Target Pages", Icon: FileText },
];

function TabNav({
  activeTab,
  onChange,
}: {
  activeTab: AuditTabId;
  onChange: (id: AuditTabId) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <div className="sticky top-[64px] z-40 bg-white" style={{ borderBottom: `1px solid ${TOKENS.border}` }}>
      <div className="mx-auto w-full md:px-6">
        <div className="relative flex items-center h-12">
          <button
            title="Scroll left"
            className="hidden sm:grid place-items-center absolute left-0 h-8 w-8 rounded hover:bg-gray-100 cursor-pointer"
            onClick={() => scrollBy(-200)}
          >
            <ChevronLeft className="size-5 text-gray-600" />
          </button>

          <div
            ref={scrollerRef}
            className="flex-1 overflow-x-auto scrollbar-none mx-0 sm:mx-8"
            role="tablist"
            aria-label="Backlink Audit tabs"
          >
            <div className="flex items-stretch gap-2 min-w-max py-1">
              {AUDIT_TABS.map(({ id, label, Icon }) => {
                const active = id === activeTab;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => onChange(id)}
                    className={cx(
                      "px-3 h-9 inline-flex items-center gap-2 text-sm rounded-full border cursor-pointer",
                      active
                        ? "font-semibold"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    )}
                    style={{
                      borderColor: active ? TOKENS.brand : TOKENS.border,
                      background: active ? TOKENS.brandSoft : TOKENS.surface,
                      color: active ? TOKENS.brand : undefined,
                    }}
                  >
                    <Icon size={16} color={active ? TOKENS.brand : undefined} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            title="Scroll right"
            className="hidden sm:grid place-items-center absolute right-0 h-8 w-8 rounded hover:bg-gray-100 cursor-pointer"
            onClick={() => scrollBy(200)}
          >
            <ChevronRight className="size-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TabFiltersRow({
  activeTab,
  onOpenFilters,
}: {
  activeTab: AuditTabId;
  onOpenFilters?: () => void;
}) {
  const common = (
    <>
      <IconChip title="WR Score">
        <span>WR Score</span>
        <ChevronDown size={16} className="text-gray-500" />
      </IconChip>
      <IconChip title="Link Type">
        <span>Link Type</span>
        <ChevronDown size={16} className="text-gray-500" />
      </IconChip>
      <IconChip title="Category">
        <span>Category</span>
        <ChevronDown size={16} className="text-gray-500" />
      </IconChip>
    </>
  );

  const perTab = {
    overview: (
      <>
        <IconChip title="Date Range">
          <span>Last 30 days</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
      </>
    ),
    domains: common,
    "new-lost": (
      <>
        <IconChip title="Status">
          <span>New · Lost</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
        <IconChip title="Date Range">
          <span>30D</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
      </>
    ),
    anchors: (
      <>
        <IconChip title="Anchor Type">
          <span>Branded / Exact / Generic</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
        <IconChip title="Risk Level">
          <span>High / Med / Low</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
      </>
    ),
    disavow: (
      <>
        <IconChip title="Status">
          <span>Queue · Active</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
      </>
    ),
    pages: (
      <>
        <IconChip title="Toxicity">
          <span>0–100</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
        <IconChip title="Traffic (GA4)">
          <span>Sessions</span>
          <ChevronDown size={16} className="text-gray-500" />
        </IconChip>
      </>
    ),
  } as const;

  return (
    <div
      className="sticky top-[112px] z-30"
      style={{ background: TOKENS.panel, borderBottom: `1px solid ${TOKENS.border}` }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-3 flex flex-wrap items-center gap-2">
        <IconChip title="Filters" onClick={onOpenFilters} tone="brand" active>
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
        </IconChip>
        <div className="flex flex-wrap items-center gap-2">{perTab[activeTab]}</div>
      </div>
    </div>
  );
}

/* ---------- public component ---------- */
export function BacklinkAuditHeader({
  projectName = "w3era.com",
  subtitle = "Audit all referring domains and backlinks to your site. Detect risk signals, track link changes, and disavow harmful sources.",
  lastAudit = new Date(),
  isCrawling = false,
  gscConnected = true,
  ga4Connected = false,
  activeTab = "overview",
  onTabChange,
  onExport,
  onCreateTask,
  onOpenDisavowSettings,
  onOpenIntegrations,
  onOpenSettings,
  onRerunAudit,
  onGoDashboard,
  onGoBacklinks,
  onOpenFilters,
}: {
  projectName?: string;
  subtitle?: string;
  lastAudit?: Date;
  isCrawling?: boolean;
  gscConnected?: boolean;
  ga4Connected?: boolean;
  activeTab?: AuditTabId;
  onTabChange?: (id: AuditTabId) => void;
  onExport?: () => void;
  onCreateTask?: () => void;
  onOpenDisavowSettings?: () => void;
  onOpenIntegrations?: () => void;
  onOpenSettings?: () => void;
  onRerunAudit?: () => void;
  onGoDashboard?: () => void;
  onGoBacklinks?: () => void;
  onOpenFilters?: () => void;
}) {
  const hasShadow = useStickyShadow(6);
  const lastAuditLabel = useMemo(() => fmtDateTime(lastAudit), [lastAudit]);

  return (
    <>
      {/* Sticky Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: TOKENS.panel,
          borderBottom: `1px solid ${TOKENS.border}`,
          boxShadow: hasShadow ? "0 1px 8px rgba(17,24,39,0.08)" : "none",
          fontFamily:
            "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji",
        }}
        aria-label="Backlink Audit header"
      >
        <div className="mx-auto w-full px-4 md:px-6 py-3 md:py-4">
          {/* Row 1: Breadcrumb + Title + Subtitle */}
          <div className="flex flex-col gap-2">
            <Breadcrumb onGoDashboard={onGoDashboard} onGoBacklinks={onGoBacklinks} />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className="grid size-9 place-items-center rounded-lg"
                  style={{
                    background: TOKENS.brandSoft,
                    border: `${BORDER}px solid ${TOKENS.border}`,
                  }}
                >
                  <Link2 size={18} color={TOKENS.brand} />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-[18px] md:text-[20px] font-semibold" style={{ color: TOKENS.text }}>
                    Backlink Audit
                  </h1>
                  <p className="mt-0.5 text-[13px]" style={{ color: TOKENS.textMuted }}>
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textMuted }}>
                <Clock className="size-4" />
                <span>Last Audit: {lastAuditLabel}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Project context + Right controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {/* Left: Project context controls */}
            <div className="flex items-center gap-2">
              <ProjectAccess />
              <ProjectSelector projectName={projectName} />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <IconChip
                title={isCrawling ? "Audit in progress" : "Rerun Audit"}
                onClick={!isCrawling ? onRerunAudit : undefined}
                tone="brand"
                active
              >
                <RefreshCcw className={cx("size-4", isCrawling && "animate-spin")} />
                <span className="hidden sm:inline">{isCrawling ? "Running…" : "Rerun Audit"}</span>
              </IconChip>

              <IntegrationsStatus
                gscConnected={gscConnected}
                ga4Connected={ga4Connected}
                onOpenIntegrations={onOpenIntegrations}
              />

              <IconChip title="Panel Settings" onClick={onOpenSettings}>
                <SettingsIcon size={16} color={TOKENS.brand} />
                <span className="hidden sm:inline">Settings</span>
              </IconChip>

              <IconChip title="Export (CSV/PDF)" onClick={onExport} tone="brand">
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </IconChip>

              <IconChip title="Create Task" onClick={onCreateTask} tone="brand">
                <ClipboardPlus size={16} />
                <span className="hidden sm:inline">Create Task</span>
              </IconChip>

              <PrimaryButton title="Disavow Settings" icon={ShieldCheck} onClick={onOpenDisavowSettings} />
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Tabs + Filters */}
      <TabNav activeTab={activeTab} onChange={(id) => onTabChange?.(id)} />
      <TabFiltersRow activeTab={activeTab} onOpenFilters={onOpenFilters} />
    </>
  );
}

/* ---------- demo wrapper (optional) ---------- */
export default function DemoBacklinkAuditHeader() {
  const [activeTab, setActiveTab] = useState<AuditTabId>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  };

  return (
    <div
      className="min-h-screen bg-white w-full"
      style={{
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji",
      }}
    >
      {/* App bar (context only) */}
      <div className="w-full px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: TOKENS.border }}>
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-lg grid place-items-center"
            style={{ background: TOKENS.brandSoft, border: `${BORDER}px solid ${TOKENS.border}` }}
          >
            <Link2 size={16} color={TOKENS.brand} />
          </div>
          <span className="font-semibold">Wranker – Backlink Insights</span>
        </div>
        <div className="text-sm" style={{ color: TOKENS.textMuted }}>
          Demo • Audit Header + Tabs
        </div>
      </div>

      <BacklinkAuditHeader
        projectName="w3era.com"
        lastAudit={new Date()}
        gscConnected={true}
        ga4Connected={false}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id)}
        onExport={() => flash("Export current tab")}
        onCreateTask={() => flash("Open Task Drawer")}
        onOpenDisavowSettings={() => flash("Open Disavow Settings")}
        onOpenIntegrations={() => flash("Open Integrations")}
        onOpenSettings={() => flash("Open Panel Settings")}
        onRerunAudit={() => flash("Rerun audit requested")}
        onGoDashboard={() => flash("Go: SEO Dashboard")}
        onGoBacklinks={() => flash("Go: Backlinks Overview")}
        onOpenFilters={() => flash("Open filters for current tab")}
      />

      {/* Mock body to demonstrate stickiness */}
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 text-sm" style={{ color: TOKENS.textMuted }}>
        <p>Scroll to see both header & tab bars remain sticky. Replace this area with tab bodies.</p>
        <div className="h-[1400px]" />
      </main>

      {toast && (
        <div
          className="fixed bottom-4 right-4 shadow-lg rounded-md px-3 py-2 text-sm"
          style={{ background: TOKENS.text, color: "white" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
