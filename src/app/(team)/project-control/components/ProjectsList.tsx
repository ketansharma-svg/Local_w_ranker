"use client";
import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import {
  Folder,
  Plus,
  Upload,
  MoreHorizontal,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  Search,
  ChevronDown,
  Check,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Settings,
  Archive,
  Trash2,
  FileText,
  CalendarClock,
  Edit3,
  Columns3,
  UserCheck, // transfer ownership
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ──────────────────────────────────────────────────────────────────────────
   Global tokens (aligned with Wranker tokens)
   – Inter / Inter Fallback
   – Brand + pastels + borders + shadows
   – Pointer cursor on interactive elements
   – Modern chips & buttons
   ───────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-brand-hover:#007BB8;
  --wr-pastel:#D9EEF8;

  --wr-text-strong:#111827;
  --wr-text:#374151;
  --wr-muted:#6B7280;

  --wr-bg-app:#F5F7FA;
  --wr-bg-panel:#FFFFFF;

  --wr-border:#E5E7EB;
  --wr-border-subtle:#EFF0F6;

  --wr-success:#34A853;
  --wr-success-bg:#CBF8D7;
  --wr-warning:#F9BB04;
  --wr-warning-bg:#FCEBB8;
  --wr-critical:#E94134;
  --wr-critical-bg:#FBC4BF;

  --wr-shadow-xs:0 1px 2px rgba(0,0,0,.05);
  --wr-shadow-sm:0 1px 3px rgba(0,0,0,.10);
  --wr-shadow-md:0 4px 6px rgba(0,0,0,.10);

  --wr-radius:6px;
  --wr-overlay: rgba(17,24,39,0.96);
}
* { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", sans-serif; }
.wr-focus { outline:2px solid transparent; outline-offset:2px; box-shadow: 0 0 0 3px rgba(66,134,245,.35); }
button, [role="button"], .wr-click { cursor: pointer; }
`}</style>
);

/* =========================
   Types
========================= */
type SourceStatus = "ok" | "warning" | "error";
type ModuleKey = "seo" | "rank" | "tech" | "content" | "competitors";
type Status = "active" | "inactive" | "archived";
type CWV = "pass" | "warn" | "fail";

type Access = "Owner" | "Admin" | "Editor" | "Viewer";
type Person = { name: string; avatarUrl?: string; access?: Access };

type Project = {
  id: string;
  name: string;
  domain: string;
  tags: string[];
  client?: string;
  sources: { gsc: SourceStatus; ga4: SourceStatus; crawl: SourceStatus };
  modulesEnabled: Record<ModuleKey, boolean>;
  health: number; // 0-100
  lastSync: string; // ISO date
  owner: Person;
  otherUsers: Person[];
  status: Status;
  // Additional columns
  addedOn: string;
  lastReportExported?: string;
  nextReportScheduled?: string;
  scheduleFrequency: "daily" | "weekly" | "monthly" | "none";
  auditPages: number;
  metrics?: {
    keywords?: number;
    avgRank?: number;
    backlinks?: number;
    cwv?: CWV;
  };
};

/* =========================
   Mock data
========================= */
const MOCK: Project[] = [
  {
    id: "p1",
    name: "Wranker",
    domain: "wranker.com",
    tags: ["SaaS", "B2B", "US"],
    client: "Wranker",
    sources: { gsc: "ok", ga4: "ok", crawl: "warning" },
    modulesEnabled: { seo: true, rank: true, tech: true, content: true, competitors: true },
    health: 82,
    lastSync: new Date().toISOString(),
    owner: { name: "Alice Nguyen", avatarUrl: "https://i.pravatar.cc/48?img=1", access: "Owner" },
    otherUsers: [
      { name: "Olivia", avatarUrl: "https://i.pravatar.cc/48?img=2", access: "Editor" },
      { name: "James", avatarUrl: "https://i.pravatar.cc/48?img=3", access: "Viewer" },
      { name: "Kai", avatarUrl: "https://i.pravatar.cc/48?img=4", access: "Admin" },
    ],
    status: "active",
    addedOn: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    lastReportExported: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
    nextReportScheduled: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    scheduleFrequency: "weekly",
    auditPages: 1200,
    metrics: { keywords: 740, avgRank: 12.3, backlinks: 2350, cwv: "pass" },
  },
  {
    id: "p2",
    name: "Vefogix",
    domain: "vefogix.com",
    tags: ["SaaS", "EU"],
    client: "Vefogix GmbH",
    sources: { gsc: "ok", ga4: "warning", crawl: "ok" },
    modulesEnabled: { seo: true, rank: true, tech: true, content: false, competitors: true },
    health: 71,
    lastSync: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    owner: { name: "Priya Shah", avatarUrl: "https://i.pravatar.cc/48?img=5", access: "Owner" },
    otherUsers: [{ name: "Marta", avatarUrl: "https://i.pravatar.cc/48?img=11", access: "Viewer" }],
    status: "active",
    addedOn: new Date(Date.now() - 70 * 24 * 3600 * 1000).toISOString(),
    lastReportExported: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    nextReportScheduled: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    scheduleFrequency: "weekly",
    auditPages: 680,
    metrics: { keywords: 420, avgRank: 19.5, backlinks: 890, cwv: "warn" },
  },
  {
    id: "p3",
    name: "W3era",
    domain: "w3era.com",
    tags: ["Agency", "India"],
    client: "W3era",
    sources: { gsc: "warning", ga4: "error", crawl: "ok" },
    modulesEnabled: { seo: true, rank: false, tech: true, content: true, competitors: false },
    health: 58,
    lastSync: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    owner: { name: "Sandeep K.", avatarUrl: "https://i.pravatar.cc/48?img=6", access: "Owner" },
    otherUsers: [],
    status: "inactive",
    addedOn: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(),
    lastReportExported: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
    nextReportScheduled: undefined,
    scheduleFrequency: "none",
    auditPages: 240,
    metrics: { keywords: 90, avgRank: 41.8, backlinks: 120, cwv: "fail" },
  },
  {
    id: "p4",
    name: "Acme SaaS",
    domain: "acme.io",
    tags: ["Startup", "US"],
    client: "Acme",
    sources: { gsc: "ok", ga4: "ok", crawl: "ok" },
    modulesEnabled: { seo: true, rank: true, tech: true, content: true, competitors: true },
    health: 90,
    lastSync: new Date().toISOString(),
    owner: { name: "Julia Park", avatarUrl: "https://i.pravatar.cc/48?img=7", access: "Owner" },
    otherUsers: [{ name: "Leo", avatarUrl: "https://i.pravatar.cc/48?img=8", access: "Editor" }],
    status: "active",
    addedOn: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    lastReportExported: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    nextReportScheduled: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    scheduleFrequency: "daily",
    auditPages: 450,
    metrics: { keywords: 340, avgRank: 9.6, backlinks: 1320, cwv: "pass" },
  },
  {
    id: "p5",
    name: "Nimbus Health",
    domain: "nimbus.health",
    tags: ["Healthcare", "US"],
    client: "Nimbus Inc.",
    sources: { gsc: "error", ga4: "warning", crawl: "warning" },
    modulesEnabled: { seo: true, rank: true, tech: true, content: true, competitors: false },
    health: 44,
    lastSync: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    owner: { name: "David Lee", avatarUrl: "https://i.pravatar.cc/48?img=9", access: "Owner" },
    otherUsers: [{ name: "Samir", avatarUrl: "https://i.pravatar.cc/48?img=10", access: "Viewer" }],
    status: "active",
    addedOn: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString(),
    lastReportExported: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    nextReportScheduled: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    scheduleFrequency: "monthly",
    auditPages: 1600,
    metrics: { keywords: 1100, avgRank: 27.4, backlinks: 4200, cwv: "warn" },
  },
];

/* =========================
   Helpers
========================= */
const CURRENT_USER = "Alice Nguyen"; // demo: current user (owner of p1)

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

const statusToChip = (s: SourceStatus) => {
  switch (s) {
    case "ok":
      return { label: "OK", text: "var(--wr-success)", bg: "var(--wr-success-bg)" };
    case "warning":
      return { label: "Warn", text: "var(--wr-warning)", bg: "var(--wr-warning-bg)" };
    default:
      return { label: "Error", text: "var(--wr-critical)", bg: "var(--wr-critical-bg)" };
  }
};

const healthToken = (v: number) =>
  v >= 80
    ? { label: "Healthy", text: "var(--wr-success)", bg: "var(--wr-success-bg)" }
    : v >= 50
    ? { label: "Needs attention", text: "var(--wr-warning)", bg: "var(--wr-warning-bg)" }
    : { label: "Critical", text: "var(--wr-critical)", bg: "var(--wr-critical-bg)" };

const cwvToken = (s: CWV) =>
  s === "pass"
    ? { text: "var(--wr-success)", bg: "var(--wr-success-bg)", label: "CWV Pass" }
    : s === "warn"
    ? { text: "var(--wr-warning)", bg: "var(--wr-warning-bg)", label: "CWV Warning" }
    : { text: "var(--wr-critical)", bg: "var(--wr-critical-bg)", label: "CWV Fail" };

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

const getFavicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;

/* =========================
   UI Primitives
========================= */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  iconLeft?: React.ReactNode;
};
const Btn: React.FC<BtnProps> = ({ variant = "secondary", size = "md", iconLeft, className, children, ...rest }) => {
  const sz = size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm";
  const base =
    "inline-flex items-center gap-2 rounded-[var(--wr-radius)] font-medium wr-click focus-visible:wr-focus select-none";
  const v =
    variant === "primary"
      ? "text-white bg-[var(--wr-brand)] hover:bg-[var(--wr-brand-hover)]"
      : variant === "ghost"
      ? "text-[var(--wr-text)] hover:bg-[var(--wr-bg-app)]"
      : "text-[var(--wr-text)] border border-[var(--wr-border)] hover:bg-[var(--wr-bg-app)]";
  return (
    <button className={cn(base, sz, v, className)} {...rest}>
      {iconLeft}
      {children}
    </button>
  );
};

// Chip button w/ dropdown caret (caretRef anchors the dropdown under the chevron)
type ChipBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  iconLeft?: React.ReactNode;
  caretRef?: React.Ref<HTMLSpanElement>;
};
const ChipBtn = forwardRef<HTMLButtonElement, ChipBtnProps>(function ChipBtn(
  { active, iconLeft, caretRef, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm border wr-click",
        active
          ? "bg-[var(--wr-pastel)] border-[var(--wr-brand)] text-[var(--wr-text-strong)]"
          : "bg-white border-[var(--wr-border)] text-[var(--wr-text)]",
        "hover:bg-[var(--wr-bg-app)]",
        className
      )}
      {...rest}
    >
      {iconLeft}
      {children}
      <span ref={caretRef as any} className="inline-flex">
        <ChevronDown className="h-4 w-4 opacity-70" />
      </span>
    </button>
  );
});

const StatusPill: React.FC<{ text: string; fg: string; bg: string }> = ({ text, fg, bg }) => (
  <span
    className="inline-flex items-center h-6 px-2 rounded-[var(--wr-radius)] text-xs"
    style={{ color: fg, background: bg }}
  >
    {text}
  </span>
);

const Avatar: React.FC<{ person: Person; size?: number; title?: string }> = ({ person, size = 24, title }) => {
  const initials =
    (person.name || "?")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  if (person.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={person.avatarUrl}
        alt={person.name}
        title={title || person.name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      title={title || person.name}
      className="rounded-full bg-[var(--wr-bg-app)] flex items-center justify-center text-[var(--wr-brand)]"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.45)) }}
    >
      {initials}
    </div>
  );
};

/* =========================
   Dropdown / Popover card (anchored) — FIXED positioning so it renders just below the trigger
========================= */
const DropdownCard: React.FC<{
  anchorRef: { current: HTMLElement | null };
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({ anchorRef, open, onClose, width = 300, children, onMouseEnter, onMouseLeave }) => {
  const ref = useOutsideClose(open, onClose);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const padding = 6;
      const left = Math.min(
        Math.max(8, r.left),
        Math.max(8, window.innerWidth - width - 8)
      );
      const top = r.bottom + padding;
      setPos({ top, left });
    };

    update();
    const onScroll = () => update();
    const onResize = () => update();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, anchorRef, width]);

  if (!open) return null;
  return (
    <div
      ref={ref as any}
      className="fixed z-50 rounded-[var(--wr-radius)] border bg-white shadow-[var(--wr-shadow-md)] p-2"
      style={{ top: pos.top, left: pos.left, width, borderColor: "var(--wr-border)" }}
      role="dialog"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

const CheckboxRow: React.FC<{ checked: boolean; label: string; onChange: () => void; disabled?: boolean }> = ({
  checked,
  label,
  onChange,
  disabled,
}) => (
  <label
    className={cn(
      "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--wr-bg-app)] wr-click",
      disabled && "opacity-60 cursor-not-allowed"
    )}
  >
    <input type="checkbox" className="h-4 w-4" checked={checked} onChange={onChange} disabled={disabled} />
    <span className="text-sm text-[var(--wr-text)]">{label}</span>
  </label>
);

/* =========================
   Column setup
========================= */
type ColumnKey =
  | "project"
  | "client"
  | "sources"
  | "modules"
  | "health"
  | "lastSync"
  | "owner"
  | "otherUsers"
  | "status"
  | "addedOn"
  | "lastReportExported"
  | "nextReport"
  | "scheduleFreq"
  | "auditPages"
  | "keywords"
  | "avgRank"
  | "backlinks"
  | "cwv"
  | "actions";

/* =========================
   Main Panel
========================= */
type ViewMode = "table" | "card";
type Density = "comfortable" | "compact";

type ProjectsListProps = {
  isAgency?: boolean;
  data?: Project[];
  onCreateProject?: () => void;
  onImport?: (file: File) => void;
  onBulkAction?: (action: string, ids: string[]) => void;
};

function ProjectsListPanel({
  isAgency = true,
  data = MOCK,
  onCreateProject,
  onImport,
  onBulkAction,
}: ProjectsListProps) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [density, setDensity] = useState<Density>("comfortable");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const clients = useMemo(() => Array.from(new Set((data ?? []).map((p) => p.client).filter(Boolean))) as string[], [data]);
  const tagsPool = useMemo(() => Array.from(new Set((data ?? []).flatMap((p) => p.tags))).sort(), [data]);

  const [fClient, setFClient] = useState<string | null>(null);
  const [fTags, setFTags] = useState<Set<string>>(new Set());
  const [fStatus, setFStatus] = useState<Status | null>(null);
  const [fSource, setFSource] = useState<SourceStatus | null>(null);
  const [fModules, setFModules] = useState<Set<ModuleKey>>(new Set());

  // Dropdown anchors (caret icons)
  const [openDD, setOpenDD] = useState<null | "client" | "tags" | "status" | "source" | "modules" | "columns">(null);
  const carets = {
    client: useRef<HTMLSpanElement>(null),
    tags: useRef<HTMLSpanElement>(null),
    status: useRef<HTMLSpanElement>(null),
    source: useRef<HTMLSpanElement>(null),
    modules: useRef<HTMLSpanElement>(null),
    columns: useRef<HTMLSpanElement>(null),
  };

  // Column visibility
  const defaultCols: Record<ColumnKey, boolean> = useMemo(
    () => ({
      project: true,
      client: !!isAgency,
      sources: true,
      modules: true,
      health: true,
      lastSync: true,
      owner: true,
      otherUsers: true,
      status: true,
      addedOn: true,
      lastReportExported: true,
      nextReport: true,
      scheduleFreq: true,
      auditPages: true,
      keywords: false,
      avgRank: false,
      backlinks: false,
      cwv: false,
      actions: true, // locked visible
    }),
    [isAgency]
  );
  const [colVis, setColVis] = useState<Record<ColumnKey, boolean>>(defaultCols);

  // Import
  const fileRef = useRef<HTMLInputElement>(null);
  const handleImport = () => fileRef.current?.click();
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) onImport(file);
    e.currentTarget.value = "";
  };

  // Filtered + sorted view
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (qq && !`${p.name} ${p.domain} ${p.owner.name}`.toLowerCase().includes(qq)) return false;
      if (isAgency && fClient && p.client !== fClient) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (fSource) {
        const any = p.sources.gsc === fSource || p.sources.ga4 === fSource || p.sources.crawl === fSource;
        if (!any) return false;
      }
      if (fTags.size && !Array.from(fTags).every((t) => p.tags.includes(t))) return false;
      if (fModules.size) for (const m of Array.from(fModules)) if (!p.modulesEnabled[m]) return false;
      return true;
    });
  }, [data, q, isAgency, fClient, fStatus, fSource, fTags, fModules]);

  const [sort, setSort] = useState<{
    key:
      | "name"
      | "client"
      | "health"
      | "lastSync"
      | "status"
      | "addedOn"
      | "lastReportExported"
      | "nextReport"
      | "auditPages"
      | "keywords"
      | "avgRank"
      | "backlinks";
    dir: "asc" | "desc";
  }>({ key: "lastSync", dir: "desc" });

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "client":
          return (a.client || "").localeCompare(b.client || "") * dir;
        case "health":
          return (a.health - b.health) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "addedOn":
          return (new Date(a.addedOn).getTime() - new Date(b.addedOn).getTime()) * dir;
        case "lastReportExported":
          return ((a.lastReportExported ? new Date(a.lastReportExported).getTime() : 0) -
            (b.lastReportExported ? new Date(b.lastReportExported).getTime() : 0)) * dir;
        case "nextReport":
          return ((a.nextReportScheduled ? new Date(a.nextReportScheduled).getTime() : 0) -
            (b.nextReportScheduled ? new Date(b.nextReportScheduled).getTime() : 0)) * dir;
        case "auditPages":
          return (a.auditPages - b.auditPages) * dir;
        case "keywords":
          return ((a.metrics?.keywords ?? 0) - (b.metrics?.keywords ?? 0)) * dir;
        case "avgRank":
          return ((a.metrics?.avgRank ?? 0) - (b.metrics?.avgRank ?? 0)) * dir;
        case "backlinks":
          return ((a.metrics?.backlinks ?? 0) - (b.metrics?.backlinks ?? 0)) * dir;
        case "lastSync":
        default:
          return (new Date(a.lastSync).getTime() - new Date(b.lastSync).getTime()) * dir;
      }
    });
    return arr;
  }, [filtered, sort]);

  // Pagination
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);
  const pageItems = useMemo(
    () => sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [sorted, page]
  );

  // Selection
  const allOnPage = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const toggleAll = () => {
    const ids = pageItems.map((p) => p.id);
    const next = new Set(selected);
    if (allOnPage) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  };
  const toggleRow = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Reset filters
  const reset = () => {
    setQ("");
    setFClient(null);
    setFTags(new Set());
    setFStatus(null);
    setFSource(null);
    setFModules(new Set());
    setOpenDD(null);
    setPage(1);
  };

  const densityRow = density === "compact" ? "py-2" : "py-3";

  // Column helpers
  const visibleKeys = (Object.keys(colVis) as ColumnKey[]).filter((k) => colVis[k]);
  const colCount = 1 /* checkbox */ + visibleKeys.length;

  // Bulk bar placement & selected IDs
  const firstSelectedIndex = pageItems.findIndex((p) => selected.has(p.id));
  const idsSelected = Array.from(selected);

  // Inline frequency editor
  const [freqEditFor, setFreqEditFor] = useState<string | null>(null);

  // Other users popover (smart) — hover behavior
  const [usersOpenFor, setUsersOpenFor] = useState<string | null>(null);
  const [usersAnchor, setUsersAnchor] = useState<HTMLElement | null>(null);
  const usersHoverTimer = useRef<number | null>(null);

  // Card menu
  const [cardMenuFor, setCardMenuFor] = useState<string | null>(null);
  const [cardMenuAnchor, setCardMenuAnchor] = useState<HTMLElement | null>(null);
//save
const router = useRouter();
 const handleOpenHeader = () => {
    router.push("/project-control/header");
  };


  return (
    <section className="w-full">
      <GlobalTokens />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--wr-bg-panel)] border-b" style={{ borderColor: "var(--wr-border)" }}>
        <div className="mx-auto w-full px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Folder className="h-5 w-5" style={{ color: "var(--wr-brand)" }} />
            <h1 className="text-[20px] leading-6 font-semibold text-[var(--wr-text-strong)]">Projects</h1>
            <div className="hidden md:flex items-center gap-2 text-xs text-[var(--wr-muted)]">
              <span>{sorted.length} results</span>
              {(isAgency && (fClient || fTags.size || fModules.size || fStatus || fSource)) || q ? (
                <span>• filters active</span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--wr-muted)] pointer-events-none" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search projects, domain, owner"
                className="h-10 w-64 pl-9 pr-3 rounded-[var(--wr-radius)] border text-sm wr-click"
                style={{ borderColor: "var(--wr-border)" }}
              />
            </div>

            <input ref={fileRef} type="file" className="hidden" accept=".csv,.json" onChange={onFile} />

            <Btn variant="secondary" iconLeft={<Upload className="h-4 w-4" />} onClick={handleImport}>
              Import
            </Btn>
            <Btn
              variant="secondary"
              onClick={() => onBulkAction?.("bulk", idsSelected)}
              title={selected.size === 0 ? "Select rows to enable bulk actions" : "Bulk actions on selection"}
              className={cn(selected.size === 0 && "opacity-60 cursor-not-allowed")}
            >
              Bulk actions
            </Btn>
            <Btn variant="primary" iconLeft={<Plus className="h-4 w-4" />} onClick={onCreateProject}>
              Create Project
            </Btn>
          </div>
        </div>

        {/* Sticky Filters Bar */}
        <div className="mx-auto w-full px-6 py-3">
          <div className="relative flex flex-wrap items-center gap-2">
            {isAgency && (
              <>
                <span className="text-xs text-[var(--wr-muted)]">Filters:</span>
                <ChipBtn
                  onClick={() => setOpenDD(openDD === "client" ? null : "client")}
                  active={!!fClient}
                  iconLeft={<SlidersHorizontal className="h-4 w-4" />}
                  caretRef={carets.client}
                >
                  Client {fClient ? `• ${fClient}` : ""}
                </ChipBtn>
                <DropdownCard anchorRef={carets.client} open={openDD === "client"} onClose={() => setOpenDD(null)} width={260}>
                  <div className="max-h-56 overflow-auto">
                    <button
                      className="w-full text-left text-sm p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click"
                      onClick={() => setFClient(null)}
                    >
                      All clients
                    </button>
                    <div className="my-1 h-px bg-[var(--wr-border-subtle)]" />
                    {(clients ?? []).map((c) => (
                      <button
                        key={c}
                        className={cn(
                          "w-full text-left text-sm p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click",
                          fClient === c && "bg-[var(--wr-pastel)]"
                        )}
                        onClick={() => setFClient(c)}
                      >
                        {fClient === c ? <Check className="inline h-4 w-4 mr-1" /> : null}
                        {c}
                      </button>
                    ))}
                  </div>
                </DropdownCard>
              </>
            )}

            {/* Tags */}
            <ChipBtn
              onClick={() => setOpenDD(openDD === "tags" ? null : "tags")}
              active={fTags.size > 0}
              iconLeft={<SlidersHorizontal className="h-4 w-4" />}
              caretRef={carets.tags}
            >
              Tags {fTags.size ? `• ${fTags.size}` : ""}
            </ChipBtn>
            <DropdownCard anchorRef={carets.tags} open={openDD === "tags"} onClose={() => setOpenDD(null)} width={300}>
              <div className="max-h-56 overflow-auto">
                {(tagsPool ?? []).map((t) => (
                  <CheckboxRow
                    key={t}
                    checked={fTags.has(t)}
                    label={t}
                    onChange={() => {
                      const next = new Set(fTags);
                      next.has(t) ? next.delete(t) : next.add(t);
                      setFTags(next);
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                <Btn variant="ghost" size="sm" onClick={() => setFTags(new Set())}>
                  Clear
                </Btn>
                <Btn variant="secondary" size="sm" onClick={() => setOpenDD(null)}>
                  Apply
                </Btn>
              </div>
            </DropdownCard>

            {/* Status */}
            <ChipBtn
              onClick={() => setOpenDD(openDD === "status" ? null : "status")}
              active={!!fStatus}
              iconLeft={<SlidersHorizontal className="h-4 w-4" />}
              caretRef={carets.status}
            >
              Status {fStatus ? `• ${fStatus}` : ""}
            </ChipBtn>
            <DropdownCard anchorRef={carets.status} open={openDD === "status"} onClose={() => setOpenDD(null)} width={220}>
              {(["active", "inactive", "archived"] as Status[]).map((s) => (
                <button
                  key={s}
                  className={cn(
                    "w-full text-left text-sm p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click",
                    fStatus === s && "bg-[var(--wr-pastel)]"
                  )}
                  onClick={() => setFStatus(fStatus === s ? null : s)}
                >
                  {fStatus === s ? <Check className="inline h-4 w-4 mr-1" /> : null}
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
              <div className="mt-2">
                <Btn variant="ghost" size="sm" onClick={() => setFStatus(null)}>
                  Clear
                </Btn>
              </div>
            </DropdownCard>

            {/* Source Health */}
            <ChipBtn
              onClick={() => setOpenDD(openDD === "source" ? null : "source")}
              active={!!fSource}
              iconLeft={<SlidersHorizontal className="h-4 w-4" />}
              caretRef={carets.source}
            >
              Source Health {fSource ? `• ${fSource}` : ""}
            </ChipBtn>
            <DropdownCard anchorRef={carets.source} open={openDD === "source"} onClose={() => setOpenDD(null)} width={220}>
              {[
                { key: "ok", icon: <CheckCircle2 className="h-4 w-4 text-[var(--wr-success)]" /> },
                { key: "warning", icon: <AlertTriangle className="h-4 w-4 text-[var(--wr-warning)]" /> },
                { key: "error", icon: <XCircle className="h-4 w-4 text-[var(--wr-critical)]" /> },
              ].map((o) => (
                <button
                  key={o.key}
                  className={cn(
                    "w-full text-left text-sm p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click flex items-center gap-2",
                    fSource === (o.key as SourceStatus) && "bg-[var(--wr-pastel)]"
                  )}
                  onClick={() => setFSource(fSource === (o.key as SourceStatus) ? null : (o.key as SourceStatus))}
                >
                  {o.icon}
                  {o.key}
                </button>
              ))}
              <div className="mt-2">
                <Btn variant="ghost" size="sm" onClick={() => setFSource(null)}>
                  Clear
                </Btn>
              </div>
            </DropdownCard>

            {/* Modules */}
            <ChipBtn
              onClick={() => setOpenDD(openDD === "modules" ? null : "modules")}
              active={fModules.size > 0}
              iconLeft={<SlidersHorizontal className="h-4 w-4" />}
              caretRef={carets.modules}
            >
              Modules {fModules.size ? `• ${fModules.size}` : ""}
            </ChipBtn>
            <DropdownCard anchorRef={carets.modules} open={openDD === "modules"} onClose={() => setOpenDD(null)} width={260}>
              {(["seo", "rank", "tech", "content", "competitors"] as ModuleKey[]).map((m) => (
                <CheckboxRow
                  key={m}
                  checked={fModules.has(m)}
                  label={m === "seo" ? "SEO" : m[0].toUpperCase() + m.slice(1)}
                  onChange={() => {
                    const next = new Set(fModules);
                    next.has(m) ? next.delete(m) : next.add(m);
                    setFModules(next);
                  }}
                />
              ))}
              <div className="mt-2 flex justify-between">
                <Btn variant="ghost" size="sm" onClick={() => setFModules(new Set())}>
                  Clear
                </Btn>
                <Btn variant="secondary" size="sm" onClick={() => setOpenDD(null)}>
                  Apply
                </Btn>
              </div>
            </DropdownCard>

            {/* Column Control */}
            <ChipBtn
              onClick={() => setOpenDD(openDD === "columns" ? null : "columns")}
              active
              iconLeft={<Columns3 className="h-4 w-4" />}
              caretRef={carets.columns}
            >
              Columns
            </ChipBtn>
            <DropdownCard anchorRef={carets.columns} open={openDD === "columns"} onClose={() => setOpenDD(null)} width={320}>
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(colVis) as ColumnKey[]).map((k) => (
                  <CheckboxRow
                    key={k}
                    checked={colVis[k]}
                    label={labelForCol(k)}
                    disabled={k === "actions" || k === "project"}
                    onChange={() =>
                      setColVis((v) => ({
                        ...v,
                        [k]: k === "actions" || k === "project" ? true : !v[k],
                      }))
                    }
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Btn variant="ghost" size="sm" onClick={() => setColVis(defaultCols)}>
                  Reset
                </Btn>
                <Btn variant="secondary" size="sm" onClick={() => setOpenDD(null)}>
                  Done
                </Btn>
              </div>
            </DropdownCard>

            {/* View + density + reset */}
            <div className="ml-auto flex items-center gap-2">
              <button
                className={cn(
                  "inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm border wr-click",
                  view === "table" ? "bg-[var(--wr-pastel)] border-[var(--wr-brand)]" : "bg-white border-[var(--wr-border)]"
                )}
                onClick={() => setView("table")}
                title="Table view"
              >
                <TableIcon className="h-4 w-4" />
                Table
              </button>
              <button
                className={cn(
                  "inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm border wr-click",
                  view === "card" ? "bg-[var(--wr-pastel)] border-[var(--wr-brand)]" : "bg-white border-[var(--wr-border)]"
                )}
                onClick={() => setView("card")}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
                Card
              </button>
              <select
                className="h-8 px-2 rounded-[var(--wr-radius)] border text-sm wr-click"
                value={density}
                onChange={(e) => setDensity(e.target.value as Density)}
                style={{ borderColor: "var(--wr-border)" }}
                title="Row density"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
              <Btn variant="ghost" size="sm" onClick={reset}>
                Reset
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full px-6 py-4">
        {view === "table" ? (
          <div
            className="overflow-x-auto rounded-[var(--wr-radius)] border bg-[var(--wr-bg-panel)] shadow-[var(--wr-shadow-sm)]"
            style={{ borderColor: "var(--wr-border)" }}
          >
            <table className="min-w-full text-sm">
              <thead className="text-[12px] font-semibold text-[var(--wr-muted)]">
                <tr className="border-b" style={{ borderColor: "var(--wr-border-subtle)" }}>
                  <th className="p-3 w-10">
                    <input type="checkbox" className="h-4 w-4 wr-click" checked={allOnPage} onChange={toggleAll} aria-label="Select all on page" />
                  </th>

                  {colVis.project && (
                    <Th
                      label="Project"
                      onClick={() =>
                        setSort((s) => ({ key: "name", dir: s.key === "name" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "name"}
                      dir={sort.dir}
                      className="w-[360px]"
                    />
                  )}

                  {isAgency && colVis.client && (
                    <Th
                      label="Client"
                      onClick={() =>
                        setSort((s) => ({ key: "client", dir: s.key === "client" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "client"}
                      dir={sort.dir}
                      className="w-[180px]"
                    />
                  )}

                  {colVis.sources && <th className="p-3 text-left w-[220px]">Sources</th>}
                  {colVis.modules && <th className="p-3 text-left w-[240px]">Modules</th>}

                  {colVis.health && (
                    <Th
                      label="Health"
                      onClick={() =>
                        setSort((s) => ({ key: "health", dir: s.key === "health" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "health"}
                      dir={sort.dir}
                      className="w-[180px]"
                    />
                  )}

                  {colVis.lastSync && (
                    <Th
                      label="Last Sync"
                      onClick={() =>
                        setSort((s) => ({ key: "lastSync", dir: s.key === "lastSync" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "lastSync"}
                      dir={sort.dir}
                      className="w-[160px]"
                    />
                  )}

                  {colVis.owner && <th className="p-3 text-left w-[200px]">Owner</th>}
                  {colVis.otherUsers && <th className="p-3 text-left w-[160px]">Other Users</th>}
                  {colVis.status && (
                    <Th
                      label="Status"
                      onClick={() =>
                        setSort((s) => ({ key: "status", dir: s.key === "status" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "status"}
                      dir={sort.dir}
                      className="w-[130px]"
                    />
                  )}
                  {colVis.addedOn && (
                    <Th
                      label="Added On"
                      onClick={() =>
                        setSort((s) => ({ key: "addedOn", dir: s.key === "addedOn" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "addedOn"}
                      dir={sort.dir}
                      className="w-[160px]"
                    />
                  )}
                  {colVis.lastReportExported && (
                    <Th
                      label="Last Report Exported"
                      onClick={() =>
                        setSort((s) => ({
                          key: "lastReportExported",
                          dir: s.key === "lastReportExported" && s.dir === "desc" ? "asc" : "desc",
                        }))
                      }
                      active={sort.key === "lastReportExported"}
                      dir={sort.dir}
                      className="w-[180px]"
                    />
                  )}
                  {colVis.nextReport && (
                    <Th
                      label="Next Report Scheduled"
                      onClick={() =>
                        setSort((s) => ({ key: "nextReport", dir: s.key === "nextReport" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "nextReport"}
                      dir={sort.dir}
                      className="w-[190px]"
                    />
                  )}
                  {colVis.scheduleFreq && <th className="p-3 text-left w-[180px]">Report Schedule</th>}
                  {colVis.auditPages && (
                    <Th
                      label="Audit Pages"
                      onClick={() =>
                        setSort((s) => ({ key: "auditPages", dir: s.key === "auditPages" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "auditPages"}
                      dir={sort.dir}
                      className="w-[140px]"
                    />
                  )}
                  {colVis.keywords && (
                    <Th
                      label="Tracked Keywords"
                      onClick={() =>
                        setSort((s) => ({ key: "keywords", dir: s.key === "keywords" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "keywords"}
                      dir={sort.dir}
                      className="w-[160px]"
                    />
                  )}
                  {colVis.avgRank && (
                    <Th
                      label="Avg Rank"
                      onClick={() =>
                        setSort((s) => ({ key: "avgRank", dir: s.key === "avgRank" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "avgRank"}
                      dir={sort.dir}
                      className="w-[120px]"
                    />
                  )}
                  {colVis.backlinks && (
                    <Th
                      label="Backlinks"
                      onClick={() =>
                        setSort((s) => ({ key: "backlinks", dir: s.key === "backlinks" && s.dir === "desc" ? "asc" : "desc" }))
                      }
                      active={sort.key === "backlinks"}
                      dir={sort.dir}
                      className="w-[140px]"
                    />
                  )}
                  {colVis.cwv && <th className="p-3 text-left w-[140px]">CWV</th>}

                  {colVis.actions && <th className="p-3 text-left w-[260px]">Actions</th>}
                </tr>
              </thead>

              <tbody className="divide-y" style={{ borderColor: "var(--wr-border-subtle)" }}>
                {pageItems.map((p, idx) => {
                  const t = healthToken(p.health);
                  const isFirstSelectedRow = firstSelectedIndex === idx && selected.size > 0;
                  const isOwner = p.owner.name === CURRENT_USER;

                  return (
                    <React.Fragment key={p.id}>
                      {/* Inline Bulk bar (sticky; wraps on small screens; no horizontal scroll needed) */}
                      {isFirstSelectedRow && (
                        <tr className="bg-[var(--wr-pastel)]">
                          <td className="p-0 sticky top-0 z-10" colSpan={colCount}>
                            <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-[13px] text-[var(--wr-text)]">
                                <strong>{selected.size}</strong> selected
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Btn size="sm" variant="secondary" iconLeft={<Settings className="h-4 w-4" />} onClick={() => onBulkAction?.("enableModules", idsSelected)}>
                                  Enable Modules
                                </Btn>
                                <Btn size="sm" variant="secondary" iconLeft={<Settings className="h-4 w-4" />} onClick={() => onBulkAction?.("disableModules", idsSelected)}>
                                  Disable Modules
                                </Btn>
                                <Btn size="sm" variant="secondary" iconLeft={<Folder className="h-4 w-4" />} onClick={() => onBulkAction?.("moveClient", idsSelected)}>
                                  Move Client
                                </Btn>
                                <Btn size="sm" variant="secondary" iconLeft={<FileText className="h-4 w-4" />} onClick={() => onBulkAction?.("assignTemplate", idsSelected)}>
                                  Assign Template
                                </Btn>
                                <Btn size="sm" variant="secondary" iconLeft={<CalendarClock className="h-4 w-4" />} onClick={() => onBulkAction?.("scheduleReports", idsSelected)}>
                                  Schedule Reports
                                </Btn>
                                <Btn size="sm" variant="secondary" iconLeft={<Archive className="h-4 w-4" />} onClick={() => onBulkAction?.("archive", idsSelected)}>
                                  Archive
                                </Btn>
                                <Btn size="sm" variant="secondary" iconLeft={<Trash2 className="h-4 w-4" />} onClick={() => onBulkAction?.("delete", idsSelected)}>
                                  Delete
                                </Btn>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr
                        className={cn("group hover:bg-[var(--wr-bg-app)]", selected.has(p.id) && "border-l-2")}
                        style={{ borderLeftColor: selected.has(p.id) ? "var(--wr-brand)" : "transparent" }}
                      >
                        {/* Select */}
                        <td className="p-3 align-middle">
                          <input
                            type="checkbox"
                            className="h-4 w-4 wr-click"
                            checked={selected.has(p.id)}
                            onChange={() => toggleRow(p.id)}
                            aria-label={`Select ${p.name}`}
                          />
                        </td>

                        {/* Project */}
                        {colVis.project && (
                          <td className={cn("p-3 align-middle", densityRow)}>
                            <div className="flex items-start gap-3">
                              {/* favicon */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getFavicon(p.domain)} alt="" className="h-5 w-5 mt-0.5 rounded" style={{ boxShadow: "var(--wr-shadow-xs)" }} />
                              <div>
                                <button className="font-semibold text-[var(--wr-text-strong)] hover:underline wr-click" title="Open project" onClick={handleOpenHeader}>
                                  {p.name}
                                </button>
                                <div className="text-xs text-[var(--wr-muted)]">{p.domain}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {p.tags.map((t) => (
                                    <span key={t} className="inline-flex items-center px-2 h-6 text-xs rounded-[var(--wr-radius)] border" style={{ borderColor: "var(--wr-border-subtle)", color: "var(--wr-text)" }}>
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Client */}
                        {isAgency && colVis.client && <td className="p-3 align-middle">{p.client || "—"}</td>}

                        {/* Sources */}
                        {colVis.sources && (
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-2">
                              {(["gsc", "ga4", "crawl"] as const).map((k) => {
                                const c = statusToChip(p.sources[k]);
                                return <StatusPill key={k} text={`${k.toUpperCase()} ${c.label}`} fg={c.text} bg={c.bg} />;
                              })}
                            </div>
                          </td>
                        )}

                        {/* Modules */}
                        {colVis.modules && (
                          <td className="p-3 align-middle">
                            <div className="flex flex-wrap items-center gap-2">
                              {(["seo", "rank", "tech", "content", "competitors"] as ModuleKey[]).map((m) =>
                                p.modulesEnabled[m] ? (
                                  <span key={m} className="inline-flex items-center h-7 px-2 text-xs rounded-[var(--wr-radius)] bg-[var(--wr-bg-app)] text-[var(--wr-text)]">
                                    {m === "seo" ? "SEO" : m[0].toUpperCase() + m.slice(1)}
                                  </span>
                                ) : null
                              )}
                            </div>
                          </td>
                        )}

                        {/* Health */}
                        {colVis.health && (
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-2">
                              <StatusPill text={t.label} fg={t.text} bg={t.bg} />
                              <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: "var(--wr-border-subtle)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${p.health}%`,
                                    background: p.health >= 80 ? "var(--wr-success)" : p.health >= 50 ? "var(--wr-warning)" : "var(--wr-critical)",
                                  }}
                                  aria-label={`Health ${p.health}%`}
                                />
                              </div>
                              <span className="text-xs text-[var(--wr-muted)]">{p.health}%</span>
                            </div>
                          </td>
                        )}

                        {/* Last Sync */}
                        {colVis.lastSync && <td className="p-3 align-middle">{fmtDate(p.lastSync)}</td>}

                        {/* Owner */}
                        {colVis.owner && (
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-2">
                              <Avatar person={p.owner} size={24} title={`${p.owner.name} • Owner`} />
                              <span className="text-sm text-[var(--wr-text)]">{p.owner.name}</span>
                            </div>
                          </td>
                        )}

                        {/* Other users + smart popover (HOVER) */}
                        {colVis.otherUsers && (
                          <td className="p-3 align-middle">
                            <div
                              className="flex -space-x-2 wr-click"
                              onMouseEnter={(e) => {
                                if (usersHoverTimer.current) window.clearTimeout(usersHoverTimer.current);
                                setUsersAnchor(e.currentTarget as HTMLElement);
                                setUsersOpenFor(p.id);
                              }}
                              onMouseLeave={() => {
                                if (usersHoverTimer.current) window.clearTimeout(usersHoverTimer.current);
                                usersHoverTimer.current = window.setTimeout(() => setUsersOpenFor((open) => (open === p.id ? null : open)), 120);
                              }}
                              title="View collaborators"
                            >
                              {p.otherUsers.slice(0, 4).map((u, i) => (
                                <div key={u.name + i} className="inline-block" style={{ boxShadow: "0 0 0 2px var(--wr-bg-panel)", borderRadius: "9999px" }}>
                                  <Avatar person={u} size={22} title={`${u.name} • ${u.access || "Viewer"}`} />
                                </div>
                              ))}
                              {p.otherUsers.length > 4 && (
                                <div
                                  className="inline-flex items-center justify-center h-[22px] w-[22px] rounded-full bg-[var(--wr-bg-app)] text-[11px] text-[var(--wr-text)]"
                                  style={{ boxShadow: "0 0 0 2px var(--wr-bg-panel)" }}
                                >
                                  +{p.otherUsers.length - 4}
                                </div>
                              )}
                            </div>

                            {/* Smart popover content (keeps open while hovered) */}
                            <DropdownCard
                              anchorRef={{ current: usersAnchor }}
                              open={usersOpenFor === p.id}
                              onClose={() => setUsersOpenFor(null)}
                              width={280}
                              onMouseEnter={() => {
                                if (usersHoverTimer.current) window.clearTimeout(usersHoverTimer.current);
                              }}
                              onMouseLeave={() => {
                                if (usersHoverTimer.current) window.clearTimeout(usersHoverTimer.current);
                                usersHoverTimer.current = window.setTimeout(() => setUsersOpenFor(null), 120);
                              }}
                            >
                              <div className="p-1">
                                <div className="px-2 py-1 text-xs text-[var(--wr-muted)]">Project access</div>
                                <div className="my-1 h-px bg-[var(--wr-border-subtle)]" />
                                {/* Owner first */}
                                <div className="flex items-center gap-2 px-2 py-1.5 rounded">
                                  <Avatar person={p.owner} size={24} />
                                  <div className="flex-1">
                                    <div className="text-sm text-[var(--wr-text-strong)]">{p.owner.name}</div>
                                    <div className="text-xs text-[var(--wr-muted)]">Owner</div>
                                  </div>
                                  <span className="text-xs px-2 h-6 inline-flex items-center rounded-[var(--wr-radius)]" style={{ color: "var(--wr-success)", background: "var(--wr-success-bg)" }}>
                                    Owner
                                  </span>
                                </div>
                                {p.otherUsers.map((u, i) => (
                                  <div key={u.name + i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--wr-bg-app)]">
                                    <Avatar person={u} size={22} />
                                    <div className="flex-1">
                                      <div className="text-sm text-[var(--wr-text)]">{u.name}</div>
                                      <div className="text-xs text-[var(--wr-muted)]">{u.access || "Viewer"}</div>
                                    </div>
                                    <span className="text-xs px-2 h-6 inline-flex items-center rounded-[var(--wr-radius)] border" style={{ borderColor: "var(--wr-border)", color: "var(--wr-text)" }}>
                                      {u.access || "Viewer"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </DropdownCard>
                          </td>
                        )}

                        {/* Status */}
                        {colVis.status && (
                          <td className="p-3 align-middle">
                            <span
                              className={cn(
                                "inline-flex items-center h-7 px-2 text-xs rounded-[var(--wr-radius)]",
                                p.status === "active"
                                  ? "bg-[var(--wr-success-bg)] text-[var(--wr-success)]"
                                  : p.status === "inactive"
                                  ? "bg-[var(--wr-warning-bg)] text-[var(--wr-warning)]"
                                  : "bg-[var(--wr-critical-bg)] text-[var(--wr-critical)]"
                              )}
                            >
                              {p.status[0].toUpperCase() + p.status.slice(1)}
                            </span>
                          </td>
                        )}

                        {/* Added On */}
                        {colVis.addedOn && <td className="p-3 align-middle">{fmtDate(p.addedOn)}</td>}

                        {/* Last Report Exported */}
                        {colVis.lastReportExported && <td className="p-3 align-middle">{fmtDate(p.lastReportExported)}</td>}

                        {/* Next Report */}
                        {colVis.nextReport && <td className="p-3 align-middle">{fmtDate(p.nextReportScheduled)}</td>}

                        {/* Schedule Frequency (inline edit) */}
                        {colVis.scheduleFreq && (
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[var(--wr-text)] capitalize">{p.scheduleFrequency}</span>
                              <div className="relative">
                                <button
                                  className="p-1 rounded hover:bg-[var(--wr-bg-app)] wr-click"
                                  onClick={() => setFreqEditFor(freqEditFor === p.id ? null : p.id)}
                                  aria-label="Edit schedule"
                                  title="Edit schedule"
                                >
                                  <Edit3 className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />
                                </button>
                                {freqEditFor === p.id && (
                                  <div className="absolute z-40 mt-2 w-40 rounded-[var(--wr-radius)] border bg-white shadow-[var(--wr-shadow-md)]" style={{ borderColor: "var(--wr-border)" }}>
                                    {(["daily", "weekly", "monthly", "none"] as const).map((f) => (
                                      <button
                                        key={f}
                                        className="w-full text-left text-sm p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click capitalize"
                                        onClick={() => {
                                          setFreqEditFor(null);
                                          alert(`Set frequency for ${p.name} → ${f}`);
                                        }}
                                      >
                                        {f}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Audit Pages */}
                        {colVis.auditPages && <td className="p-3 align-middle">{p.auditPages.toLocaleString()}</td>}

                        {/* Optional metrics */}
                        {colVis.keywords && <td className="p-3 align-middle">{p.metrics?.keywords ?? "—"}</td>}
                        {colVis.avgRank && <td className="p-3 align-middle">{p.metrics?.avgRank ?? "—"}</td>}
                        {colVis.backlinks && <td className="p-3 align-middle">{p.metrics?.backlinks?.toLocaleString?.() ?? "—"}</td>}
                        {colVis.cwv && (
                          <td className="p-3 align-middle">
                            {p.metrics?.cwv ? (
                              (() => {
                                const c = cwvToken(p.metrics!.cwv!);
                                return <StatusPill text={c.label} fg={c.text} bg={c.bg} />;
                              })()
                            ) : (
                              "—"
                            )}
                          </td>
                        )}

                        {/* Actions — icons with MINI POPOVER tooltips (no layout shift) */}
                        {colVis.actions && (
                          <td className="p-3 align-middle">
                            <div className="flex items-center gap-3">
                            <ActionIcon label="Open" >
                             <Eye className="h-4 w-4" onClick={handleOpenHeader} style={{ color: "var(--wr-brand)" }} />
                            </ActionIcon>

                              <ActionIcon label="Manage">
                                <Settings className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />
                              </ActionIcon>
                              <ActionIcon label="Export Report">
                                <FileText className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />
                              </ActionIcon>
                              <ActionIcon label="Transfer Ownership" disabled={!isOwner}>
                                <UserCheck
                                  className={cn("h-4 w-4", !isOwner && "opacity-40")}
                                  style={{ color: "var(--wr-brand)" }}
                                />
                              </ActionIcon>
                              <ActionIcon label="Archive">
                                <Archive className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />
                              </ActionIcon>
                              <ActionIcon label="Delete">
                                <Trash2 className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />
                              </ActionIcon>
                              <button className="p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click" aria-label="More">
                                <MoreHorizontal className="h-4 w-4 text-[var(--wr-text)]" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Card View (with favicon & brand icons + actions menu under kebab)
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageItems.map((p) => {
              const t = healthToken(p.health);
              const isOwner = p.owner.name === CURRENT_USER;
              return (
                <div
                  key={p.id}
                  className="rounded-[var(--wr-radius)] border shadow-[var(--wr-shadow-sm)] bg-white hover:shadow-[var(--wr-shadow-md)] transition-shadow"
                  style={{ borderColor: "var(--wr-border)" }}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* favicon */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getFavicon(p.domain)} alt="" className="h-5 w-5 mt-0.5 rounded" />
                    <div className="flex-1">
                      <button className="text-base font-semibold text-[var(--wr-text-strong)] hover:underline wr-click">{p.name}</button>
                      <div className="text-xs text-[var(--wr-muted)]">{p.domain}</div>
                    </div>
                    <button
                      className="p-2 rounded hover:bg-[var(--wr-bg-app)] wr-click"
                      aria-label="Card actions"
                      onClick={(e) => {
                        setCardMenuFor(cardMenuFor === p.id ? null : p.id);
                        setCardMenuAnchor(e.currentTarget as HTMLElement);
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4 text-[var(--wr-text)]" />
                    </button>

                    {/* Card actions dropdown: show ALL row actions (icons + labels) */}
                    <DropdownCard
                      anchorRef={{ current: cardMenuAnchor }}
                      open={cardMenuFor === p.id}
                      onClose={() => setCardMenuFor(null)}
                      width={220}
                    >
                      <CardActionItem icon={<Eye className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />} label="Open" />
                      <CardActionItem icon={<Settings className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />} label="Manage" />
                      <CardActionItem icon={<FileText className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />} label="Export Report" />
                      <CardActionItem
                        icon={<UserCheck className={cn("h-4 w-4", !isOwner && "opacity-40")} style={{ color: "var(--wr-brand)" }} />}
                        label="Transfer Ownership"
                        disabled={!isOwner}
                      />
                      <CardActionItem icon={<Archive className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />} label="Archive" />
                      <CardActionItem icon={<Trash2 className="h-4 w-4" style={{ color: "var(--wr-brand)" }} />} label="Delete" />
                    </DropdownCard>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      {(["gsc", "ga4", "crawl"] as const).map((k) => {
                        const c = statusToChip(p.sources[k]);
                        return <StatusPill key={k} text={`${k.toUpperCase()} ${c.label}`} fg={c.text} bg={c.bg} />;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(["seo", "rank", "tech", "content", "competitors"] as ModuleKey[]).map((m) =>
                        p.modulesEnabled[m] ? (
                          <span key={m} className="inline-flex items-center h-7 px-2 text-xs rounded-[var(--wr-radius)] bg-[var(--wr-bg-app)] text-[var(--wr-text)]">
                            {m === "seo" ? "SEO" : m[0].toUpperCase() + m.slice(1)}
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusPill text={t.label} fg={t.text} bg={t.bg} />
                        <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--wr-border-subtle)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.health}%`,
                              background: p.health >= 80 ? "var(--wr-success)" : p.health >= 50 ? "var(--wr-warning)" : "var(--wr-critical)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-[var(--wr-text)]">{fmtDate(p.lastSync)}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar person={p.owner} size={24} title={`${p.owner.name} • Owner`} />
                      <span className="text-sm text-[var(--wr-text)]">{p.owner.name}</span>
                      {isAgency && p.client && <span className="ml-auto text-xs text-[var(--wr-muted)]">{p.client}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer / pagination */}
        {sorted.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-[var(--wr-text)]">
            <div className="text-[var(--wr-muted)]">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Btn>
              <div className="px-2">
                {page} / {totalPages}
              </div>
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Btn>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================
   Shared bits
========================= */
const Th: React.FC<{ label: string; className?: string; onClick?: () => void; active?: boolean; dir?: "asc" | "desc" }> = ({
  label,
  className,
  onClick,
  active,
  dir,
}) => (
  <th className={cn("p-3 text-left select-none", className)}>
    <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--wr-muted)] hover:text-[var(--wr-text)] wr-click" onClick={onClick}>
      {label}
      {active ? <span style={{ color: "var(--wr-brand)" }}>{dir === "asc" ? "▲" : "▼"}</span> : null}
    </button>
  </th>
);

function labelForCol(k: ColumnKey): string {
  switch (k) {
    case "project":
      return "Project";
    case "client":
      return "Client";
    case "sources":
      return "Sources";
    case "modules":
      return "Modules";
    case "health":
      return "Health";
    case "lastSync":
      return "Last Sync";
    case "owner":
      return "Owner";
    case "otherUsers":
      return "Other Users";
    case "status":
      return "Status";
    case "addedOn":
      return "Added On";
    case "lastReportExported":
      return "Last Report Exported";
    case "nextReport":
      return "Next Report Scheduled";
    case "scheduleFreq":
      return "Report Schedule";
    case "auditPages":
      return "Audit Pages";
    case "keywords":
      return "Tracked Keywords";
    case "avgRank":
      return "Avg Rank";
    case "backlinks":
      return "Backlinks";
    case "cwv":
      return "CWV";
    case "actions":
      return "Actions";
  }
}

// Inline action icon with MINI POPOVER tooltip above the icon (no layout shift)
const ActionIcon: React.FC<{ label: string; children: React.ReactNode; disabled?: boolean }> = ({
  label,
  children,
  disabled,
}) => (
  <span
    className={cn(
      "relative inline-flex items-center group/action",
      disabled ? "opacity-50 cursor-not-allowed" : "wr-click"
    )}
  >
    <button className={cn("p-2 rounded hover:bg-[var(--wr-bg-app)]", disabled && "pointer-events-none")}>
      {children}
    </button>
    {/* Mini popover tooltip */}
    <span
      className={cn(
        "pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full",
        "whitespace-nowrap text-xs text-white px-2 py-1 rounded shadow-[var(--wr-shadow-sm)]",
        "bg-[var(--wr-overlay)] opacity-0 group-hover/action:opacity-100 transition-opacity"
      )}
    >
      {label}
      {/* small arrow */}
      <span
        className="absolute left-1/2 -translate-x-1/2 top-full h-2 w-2 rotate-45 bg-[var(--wr-overlay)]"
        aria-hidden
      />
    </span>
  </span>
);

// Card actions menu item
const CardActionItem: React.FC<{ icon: React.ReactNode; label: string; disabled?: boolean }> = ({ icon, label, disabled }) => (
  <button
    disabled={disabled}
    className={cn(
      "w-full text-left text-sm p-2 rounded flex items-center gap-2 hover:bg-[var(--wr-bg-app)]",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

/* =========================
   Default Export (Demo)
========================= */
export default function Projects() {
  return (
    <div className="w-full bg-[var(--wr-bg-panel)]">
      <ProjectsListPanel
        isAgency={true}
        data={MOCK}
        onCreateProject={() => alert("Create Project")}
        onImport={(f) => alert(`Import file: ${f.name}`)}
        onBulkAction={(action, ids) => alert(`Bulk action "${action}" on: ${ids.join(", ") || "none selected"}`)}
      />
    </div>
  );
}
