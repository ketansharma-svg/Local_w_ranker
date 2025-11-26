"use client";

import React, { useEffect, useRef, useState, forwardRef } from "react";
import {
  ChevronLeft,
  ExternalLink,
  MoreHorizontal,
  Settings,
  Share2,
  Download,
  RefreshCw,
  LayoutGrid,
  Wrench,
  TableOfContents,
  ClipboardMinus,
} from "lucide-react";
import OverviewTab from "./overview/ProjectProfileOverview";
import ContentAndPagesTab from "./content/ContentTab";
import VisibilityTab from "./visibility/VisibilityTab";
import TechnicalTab from "./technical/TechnicalTab";
import ReportingAndAutomationsTab from "./report-automation/ReportTab";
import { useRouter } from "next/navigation";
/* ──────────────────────────────────────────────────────────────────────────
   Global tokens (aligned with Wranker tokens)
   – Inter, Brand #008CCD, Pastel #D9EEF8, Status, Radius 6px, Shadows
   – Taller header, taller tabs bar
   – Focus ring + pointer cursor on interactive elements
   ───────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --brand:#008CCD; --brand-600:#007BB8; --pastel:#D9EEF8;
  --text-strong:#111827; --text:#374151; --text-muted:#6B7280;
  --bg-app:#F5F7FA; --bg-panel:#FFFFFF;
  --border:#E5E7EB; --border-subtle:#EFF0F6;
  --success:#34A853; --success-bg:#CBF8D7;
  --warning:#F9BB04; --warning-bg:#FCEBB8;
  --critical:#E94134; --critical-bg:#FBC4BF;

  --overlay: rgba(17,24,39,0.96);
  --radius:6px;

  --shadow-xs:0 1px 2px rgba(0,0,0,.05);
  --shadow-sm:0 1px 3px rgba(0,0,0,.10);
  --shadow-md:0 4px 6px rgba(0,0,0,.10);

  /* Increased heights per refinement */
  --header-h:80px;     /* Header bar height */
  --tabsbar-h:64px;    /* Tabs bar height */
}
* { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", sans-serif; }
.wr-focus { outline:2px solid transparent; outline-offset:2px; box-shadow: 0 0 0 3px rgba(66,134,245,.35); }
button, [role="button"], .wr-click { cursor: pointer; }
`}</style>
);

/* =========================
   Types & helpers
========================= */
type Status = "active" | "inactive" | "archived";

/** UPDATED: 5‑tab IA (Option A) */
type TabKey = "overview" | "technical" | "content" | "visibility" | "report";

type Tab = { key: TabKey; label: string; count?: number; enabled?: boolean };

type ProjectMeta = {
  id: string;
  name: string;
  domain: string;
  tags?: string[];
  status: Status;
  health: number; // 0..100
  lastSync?: string; // ISO
  owner?: { name: string; avatarUrl?: string };
  /** UPDATED: modulesEnabled aligned to 5 tabs */
  modulesEnabled?: Partial<Record<TabKey, boolean>>;
};

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const getFavicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;

const healthToken = (v: number) =>
  v >= 80
    ? { label: "Healthy", fg: "var(--success)", bg: "var(--success-bg)" }
    : v >= 50
    ? { label: "Needs attention", fg: "var(--warning)", bg: "var(--warning-bg)" }
    : { label: "Critical", fg: "var(--critical)", bg: "var(--critical-bg)" };

function useOutsideClose(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!isOpen) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen, onClose]);
  return ref;
}

/* =========================
   UI primitives
========================= */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  iconLeft?: React.ReactNode;
};
const Btn: React.FC<BtnProps> = ({ variant = "secondary", size = "md", iconLeft, className, children, ...rest }) => {
  const sz = size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm";
  const base =
    "inline-flex items-center gap-2 rounded-[var(--radius)] font-medium wr-click focus-visible:wr-focus select-none";
  const v =
    variant === "primary"
      ? "text-white bg-[var(--brand)] hover:bg-[var(--brand-600)]"
      : variant === "ghost"
      ? "text-[var(--text)] hover:bg-[var(--bg-app)]"
      : "text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-app)]";
  return (
    <button className={cn(base, sz, v, className)} {...rest}>
      {iconLeft}
      {children}
    </button>
  );
};

const Avatar: React.FC<{ person?: { name: string; avatarUrl?: string }; size?: number }> = ({ person, size = 22 }) => {
  if (!person) return null;
  const initials =
    (person.name || "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return person.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={person.avatarUrl} alt={person.name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-[var(--bg-app)] flex items-center justify-center text-[var(--brand)]"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.45)) }}
    >
      {initials}
    </div>
  );
};

const StatusPill: React.FC<{ label: string; fg: string; bg: string }> = ({ label, fg, bg }) => (
  <span className="inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs" style={{ color: fg, background: bg }}>
    {label}
  </span>
);

const DropdownCard: React.FC<{
  anchorRef: { current: HTMLElement | null };
  open: boolean;
  onClose: () => void;
  width?: number;
  align?: "start" | "end";
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, width = 240, align = "end", children }) => {
  const ref = useOutsideClose(open, onClose);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  useEffect(() => {
    if (!open) return;
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = align === "end" ? r.right - width + window.scrollX : r.left + window.scrollX;
    const top = r.bottom + window.scrollY + 6;
    setPos({ top, left: Math.max(8, left) });
  }, [open, anchorRef, width, align]);
  if (!open) return null;
  return (
    <div
      ref={ref as any}
      className="absolute z-50 rounded-[var(--radius)] border bg-white shadow-[var(--shadow-md)] p-2"
      style={{ top: pos.top, left: pos.left, width, borderColor: "var(--border)" }}
      role="dialog"
    >
      {children}
    </div>
  );
};

/* =========================
   Tabs (UPDATED to 5‑tab IA)
========================= */
const iconForTab = (key: TabKey) => {
  switch (key) {
    case "overview":
      return <LayoutGrid className="h-4 w-4" />;
    case "technical":
      return <Wrench className="h-4 w-4" />;
    case "content":
      return <TableOfContents className="h-4 w-4" />;
    case "visibility":
      return <SearchIconMini />;
    case "report":
      return <ClipboardMinus className="h-4 w-4" />;
  }
};

const TabsBar: React.FC<{
  tabs: Tab[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}> = ({ tabs, active, onChange }) => {
  return (
    <div
      className="sticky z-10 bg-[var(--bg-panel)] border-b"
      style={{ top: "var(--header-h)", borderColor: "var(--border)", height: "var(--tabsbar-h)" }}
      role="tablist"
      aria-label="Project sections"
    >
      <div className="mx-auto w-full px-6 h-full">
        <div className="flex items-center gap-2 h-full overflow-x-auto">
          {tabs.map((t) => {
            const isActive = t.key === active;
            const disabled = t.enabled === false;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                disabled={disabled}
                onClick={() => !disabled && onChange(t.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 md:px-4 h-10 rounded-[var(--radius)] text-sm wr-click",
                  disabled
                    ? "text-[var(--text-muted)] opacity-60 cursor-not-allowed"
                    : isActive
                    ? "bg-[var(--pastel)] text-[var(--text-strong)] font-semibold"
                    : "text-[var(--text)] hover:bg-[var(--bg-app)]"
                )}
              >
                <span className="text-[var(--brand)]">{iconForTab(t.key)}</span>
                <span>{t.label}</span>
                {typeof t.count === "number" && (
                  <span className="ml-1 inline-flex items-center h-5 px-2 rounded-full text-xs bg-[var(--pastel)] text-[var(--text-strong)]">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
          {/* Time filter intentionally not present (removed previously) */}
        </div>
      </div>
    </div>
  );
};

/* =========================
   Header (taller + favicon next to name + functional/conditional kebab)
========================= */
type MenuItem = { label: string; icon?: React.ReactNode; onClick: () => void };
type HeaderProps = {
  project: ProjectMeta;
  onBack?: () => void;
  onRunAudit?: () => void; // primary CTA
  onExport?: () => void;
  onShare?: () => void;
  moreMenuItems?: MenuItem[]; // kebab renders only if items exist
};

const ProjectHeader: React.FC<HeaderProps> = ({ project, onBack, onRunAudit, onExport, onShare, moreMenuItems }) => {
  const token = healthToken(project.health);
  const showKebab = (moreMenuItems?.length ?? 0) > 0;
  const [openMore, setOpenMore] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

const router = useRouter();
 const handleBack = () => {
    router.push("/project-control");
  };
  return (
    <div className="sticky top-0 z-20 bg-[var(--bg-panel)] border-b" style={{ borderColor: "var(--border)", height: "var(--header-h)" }}>
      <div className="mx-auto w-full px-6 h-[var(--header-h)] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="h-10 w-10 rounded-[var(--radius)] border text-[var(--text)] hover:bg-[var(--bg-app)] wr-click flex items-center justify-center"
            style={{ borderColor: "var(--border)" }}
            aria-label="Back to Projects"
            title="Back to Projects"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Title row: favicon placed immediately left of project name (no folder icon) */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <img src={getFavicon(project.domain)} alt="" className="h-5 w-5 rounded" style={{ boxShadow: "var(--shadow-xs)" }} />
              <h1 className="truncate text-[20px] leading-6 font-semibold text-[var(--text-strong)]">{project.name}</h1>
              <a
                className="hidden sm:inline-flex items-center gap-1 text-sm text-[var(--text)] hover:underline wr-click"
                href={`https://${project.domain}`}
                target="_blank"
                rel="noreferrer"
                title={project.domain}
              >
                {project.domain}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {(project.tags ?? []).slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center h-6 px-2 rounded-[var(--radius)] border"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text)" }}
                >
                  #{t}
                </span>
              ))}

              <span
                className={cn(
                  "inline-flex items-center h-6 px-2 rounded-[var(--radius)]",
                  project.status === "active"
                    ? "bg-[var(--success-bg)] text-[var(--success)]"
                    : project.status === "inactive"
                    ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                    : "bg-[var(--critical-bg)] text-[var(--critical)]"
                )}
              >
                {project.status[0].toUpperCase() + project.status.slice(1)}
              </span>

              <StatusPill label={token.label} fg={token.fg} bg={token.bg} />
              <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${project.health}%`,
                    background: project.health >= 80 ? "var(--success)" : project.health >= 50 ? "var(--warning)" : "var(--critical)",
                  }}
                  aria-label={`Health ${project.health}%`}
                />
              </div>

              {project.owner && (
                <span className="inline-flex items-center gap-2 ml-2">
                  <Avatar person={project.owner} size={18} />
                  <span className="text-[var(--text-muted)]">Owner</span>
                </span>
              )}
              <span className="text-[var(--text-muted)]">• Last Sync: {fmtDate(project.lastSync)}</span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Btn variant="secondary" size="md" iconLeft={<Download className="h-4 w-4" />} onClick={onExport}>
            Export
          </Btn>
          <Btn variant="secondary" size="md" iconLeft={<Share2 className="h-4 w-4" />} onClick={onShare}>
            Share
          </Btn>
          <Btn variant="primary" size="md" iconLeft={<RefreshCw className="h-4 w-4" />} onClick={onRunAudit}>
            Run Audit
          </Btn>

          {/* Kebab ONLY if there are extra actions; dropdown opens on click */}
          {showKebab && (
            <div className="relative">
              <button
                ref={moreBtnRef}
                onClick={() => setOpenMore((v) => !v)}
                aria-expanded={openMore}
                className="h-10 w-10 rounded-[var(--radius)] border text-[var(--text)] hover:bg-[var(--bg-app)] wr-click flex items-center justify-center"
                style={{ borderColor: "var(--border)" }}
                aria-label="More actions"
                title="More actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              <DropdownCard anchorRef={moreBtnRef} open={openMore} onClose={() => setOpenMore(false)} width={220} align="end">
                {(moreMenuItems ?? []).map((m) => (
                  <button
                    key={m.label}
                    className="w-full text-left text-sm p-2 rounded hover:bg-[var(--bg-app)] wr-click flex items-center gap-2"
                    onClick={() => {
                      setOpenMore(false);
                      m.onClick();
                    }}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </DropdownCard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================
   Tiny inline icon
========================= */
const SearchIconMini = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
    <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/* =========================
   Main composed component
========================= */
type ProjectProfileHeaderProps = {
  project: ProjectMeta;
  tabs: Tab[];
  activeTab: TabKey;
  onTabChange: (key: TabKey) => void;

  onBack?: () => void;
  onRunAudit?: () => void;
  onExport?: () => void;
  onShare?: () => void;

  /* If empty/omitted → kebab hidden (per refinement) */
  moreMenuItems?: MenuItem[];
};

export const ProjectProfileHeader: React.FC<ProjectProfileHeaderProps> = ({
  project,
  tabs,
  activeTab,
  onTabChange,
  onBack,
  onRunAudit,
  onExport,
  onShare,
  moreMenuItems,
}) => {
  return (
    <section className="w-full">
      <GlobalTokens />
      <ProjectHeader
        project={project}
        onBack={onBack}
        onRunAudit={onRunAudit}
        onExport={onExport}
        onShare={onShare}
        moreMenuItems={moreMenuItems}
      />
      <TabsBar tabs={tabs} active={activeTab} onChange={onTabChange} />
    </section>
  );
};

/* =========================
   Default export – Demo wiring (tabs UPDATED to 5)
========================= */
export default function ProjectProfileHeaderTabsDemo() {
  const [active, setActive] = useState<TabKey>("overview");

  const project: ProjectMeta = {
    id: "p1",
    name: "Wranker",
    domain: "wranker.com",
    tags: ["SaaS", "B2B", "US"],
    status: "active",
    health: 82,
    lastSync: new Date().toISOString(),
    owner: { name: "Alice Nguyen", avatarUrl: "https://i.pravatar.cc/48?img=1" },
    /** UPDATED: modulesEnabled to match new TabKey union */
    modulesEnabled: {
      overview: true,
      technical: true,
      content: true,
      visibility: true,
      report: true,
    },
  };

  /** UPDATED: 5 tabs only */
const tabs = [
  { key: "overview", label: "Overview" },
  { key: "content", label: "Content", count: 12 },
  { key: "visibility", label: "Visibility", count: 3100 },
  { key: "technical", label: "technical", count: 19 },
  { key: "report", label: "report" },
] satisfies Tab[];

const finalTabs: Tab[] = tabs.map((t) => ({
  ...t,
  enabled: project.modulesEnabled?.[t.key] !== false,
}));


  // Provide menu items to make the kebab functional.
  // Remove or set to [] to hide it entirely.
  const moreMenu: MenuItem[] = [
    { label: "Copy link", icon: <ExternalLink className="h-4 w-4" />, onClick: () => alert("Copy link") },
    { label: "Project settings", icon: <Settings className="h-4 w-4" />, onClick: () => alert("Open settings") },
  ];

  return (
    <div className="w-full bg-[var(--bg-panel)]">
      <ProjectProfileHeader
        project={project}
        tabs={tabs}
        activeTab={active}
        onTabChange={setActive}
        onBack={() => alert("Back to Projects")}
        onRunAudit={() => alert("Run Audit")}
        onExport={() => alert("Export")}
        onShare={() => alert("Share")}
        moreMenuItems={moreMenu}
      />
      {/* Demo page body stub */}
      <>
        {active === "overview" && (
                    <>
                    <OverviewTab />
                    </>
                  )}
                {active === "content" && (
                    <>
                    <ContentAndPagesTab />
                    </>
                )}
        {active === "visibility" && (
                    <>
                    <VisibilityTab />
                    </>
                  )}
        {active === "technical" && (
                    <>
                    <TechnicalTab />
                    </>
                  )}
        {active === "report" && (
                    <>
                    <ReportingAndAutomationsTab />
                    </>
                  )}
                  </>
    </div>
  );
}
