"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Link2,
  Download,
  ClipboardPlus,
  ShieldOff,
  ListPlus,
  Plus,
  Clock,
  ChevronDown,
  ExternalLink as ExternalLinkIcon,
  MoreHorizontal,
  Pin,
  RefreshCw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Timer,
  Eye,
  ShoppingCart,
  Info,
  Users,
} from "lucide-react";

/**
 * Panel header & Smart Suggestions — Fixed
 * - Resolves runtime error when `picks` is undefined by safely defaulting to []
 * - No design or behavior changes otherwise
 */

/* ------------------------------ Tokens ------------------------------ */
const TK = {
  brand: "#008CCD",
  brandHover: "#067CB3",
  pastel: "#D9EEF8",

  surface: "#FFFFFF",
  subtle: "#F5F7FA",

  text: "#111827",
  muted: "#6B7280",

  border: "#E5E7EB",
  borderLight: "#EFF0F6",

  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",

  radius: 10,
  shadowSm: "0 2px 6px rgba(17,24,39,.06)",
} as const;

const BORDER = 1.5;

/* ------------------------------ Utils ------------------------------ */
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const formatTraffic = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;
const formatMoneyUSD = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const scoreColor = (s: number) => (s >= 80 ? "green" : s >= 60 ? "yellow" : "red");

/** Try to construct a favicon URL from a domain or URL */
const getFaviconUrl = (domainOrUrl?: string) => {
  if (!domainOrUrl) return "";
  try {
    const u = domainOrUrl.includes("://") ? new URL(domainOrUrl) : new URL("https://" + domainOrUrl);
    const host = u.hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  } catch {
    return "";
  }
};

function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isOpen) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler, { passive: true } as any);
    return () => document.removeEventListener("mousedown", handler as any);
  }, [isOpen, onClose]);
  return ref;
}
function useStickyShadow(offset = 2) {
  const [shadow, setShadow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShadow(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return shadow;
}

/* ------------------------------ Controls ------------------------------ */
function IconOnlyButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 place-items-center cursor-pointer"
      style={{
        borderRadius: TK.radius,
        border: `${BORDER}px solid ${TK.border}`,
        background: TK.subtle,
        color: TK.text,
      }}
    >
      {children}
    </button>
  );
}

function OutlineBrandButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-[14px] font-medium"
      style={{
        color: TK.brand,
        background: TK.surface,
        borderRadius: TK.radius,
        border: `${BORDER}px solid ${TK.brand}`,
      }}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

function OutlineDangerButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-[14px] font-medium"
      style={{
        color: TK.danger,
        background: TK.surface,
        borderRadius: TK.radius,
        border: `${BORDER}px solid ${TK.danger}`,
      }}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

function PrimaryBrandButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center gap-2 px-3 text-[14px] font-medium text-white"
      style={{
        background: TK.brand,
        borderRadius: TK.radius,
      }}
      onMouseEnter={(e) => ((e.currentTarget.style.background = TK.brandHover))}
      onMouseLeave={(e) => ((e.currentTarget.style.background = TK.brand))}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{title}</span>
    </button>
  );
}

/* ------------------------------ Header: Project chip & access ------------------------------ */
function ProjectChip({
  current = "w3era.com",
  projects = ["w3era.com", "wranker.com", "vefogix.com"],
}: {
  current?: string;
  projects?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Select Project"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex cursor-pointer items-center gap-2 px-3 py-1.5"
        style={{
          border: `${BORDER}px solid ${TK.border}`,
          borderRadius: TK.radius,
          background: TK.subtle,
        }}
      >
        {/* Favicon */}
        <span className="grid size-4 place-items-center overflow-hidden rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getFaviconUrl(current) || ""} alt="" className="h-4 w-4" />
        </span>
        <span className="text-[14px] font-medium" style={{ color: TK.text }}>
          {current}
        </span>
        <ExternalLinkIcon size={16} className="text-[#9CA3AF]" />
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[260px] bg-white shadow"
          style={{ borderRadius: TK.radius, border: `${BORDER}px solid ${TK.border}` }}
        >
          {projects.map((p) => (
            <button
              key={p}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F7FAFC]"
              title={p}
            >
              <span className="grid size-4 place-items-center overflow-hidden rounded">
                <img src={getFaviconUrl(p) || ""} alt="" className="h-4 w-4" />
              </span>
              <span>{p}</span>
            </button>
          ))}
          <div className="my-1" style={{ borderTop: `${BORDER}px solid ${TK.borderLight}` }} />
          <div className="p-2">
            <PrimaryBrandButton title="Create Project" icon={Plus} onClick={() => undefined} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectAccess() {
  const [open, setOpen] = useState(false);
  const [myProjects, setMyProjects] = useState(true);
  const [sharedWithMe, setSharedWithMe] = useState(true);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Project Access"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 cursor-pointer items-center gap-2 px-2.5 text-[13px]"
        style={{
          border: `${BORDER}px solid ${TK.border}`,
          borderRadius: TK.radius,
          background: TK.subtle,
          color: TK.text,
        }}
      >
        <Users size={16} color={TK.brand} />
        <span>Project Access</span>
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[240px] bg-white shadow"
          style={{ borderRadius: TK.radius, border: `${BORDER}px solid ${TK.border}` }}
        >
          <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[#F7FAFC]">
            <input type="checkbox" checked={myProjects} onChange={(e) => setMyProjects(e.target.checked)} />
            <span>My projects</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[#F7FAFC]">
            <input type="checkbox" checked={sharedWithMe} onChange={(e) => setSharedWithMe(e.target.checked)} />
            <span>Shared with me</span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Header ------------------------------ */
export function BacklinkOpportunitiesHeader({
  projectName = "w3era.com",
  subtitle = "High‑value, ready‑to‑acquire placements from Vefogix + competitor match.",
  lastCrawl = new Date(),
  onExport,
  onCreateTask,
  onDisavow,
  onAddToTracker,
  onFindNewLink,
}: {
  projectName?: string;
  subtitle?: string;
  lastCrawl?: Date;
  onExport?: () => void;
  onCreateTask?: () => void;
  onDisavow?: () => void;
  onAddToTracker?: () => void;
  onFindNewLink?: () => void;
}) {
  const hasShadow = useStickyShadow(2);
  const lastCrawlLabel = lastCrawl.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header
      className="sticky top-0 z-40 border-b bg-white"
      style={{
        borderColor: TK.borderLight,
        boxShadow: hasShadow ? "0 1px 8px rgba(17,24,39,0.08)" : "none",
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Backlink Insights – Opportunities header"
    >
      <div className="mx-auto w-full px-6 py-3 md:py-4">
        {/* Row 1: Title + Subtitle · Last Crawl */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid size-9 place-items-center rounded-lg"
              style={{ background: TK.pastel, border: `${BORDER}px solid ${TK.borderLight}` }}
            >
              <Link2 size={18} color={TK.brand} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="truncate text-[18px] font-semibold md:text-[20px]" style={{ color: TK.text }}>
                  Backlink Insights – Opportunities
                </h1>
                <span
                  className="hidden md:inline-block rounded px-2 py-0.5 text-[12px] font-medium"
                  style={{ background: TK.pastel, color: TK.brand }}
                >
                  {projectName}
                </span>
              </div>
              <p className="mt-0.5 hidden sm:block text-[13px]" style={{ color: TK.muted }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm" style={{ color: TK.muted }}>
            <Clock className="size-4" />
            <span>Last Crawl: {lastCrawlLabel}</span>
          </div>
        </div>

        {/* Row 2: Chips · Actions */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ProjectAccess />
            <ProjectChip current={projectName} />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              {/* Branded icons & full names appear on hover via title */}
              <OutlineBrandButton title="Export Report" icon={Download} onClick={onExport} />
              <OutlineBrandButton title="Create Task" icon={ClipboardPlus} onClick={onCreateTask} />
              <OutlineDangerButton title="Disavow Links" icon={ShieldOff} onClick={onDisavow} />
              <OutlineBrandButton title="Add to Tracker" icon={ListPlus} onClick={onAddToTracker} />
              <PrimaryBrandButton title="Find New Link" icon={Plus} onClick={onFindNewLink} />
            </div>

            {/* Mobile overflow */}
            <div className="flex items-center gap-2 sm:hidden">
              <PrimaryBrandButton title="Find New Link" icon={Plus} onClick={onFindNewLink} />
              <MoreMenu
                onExport={onExport}
                onCreateTask={onCreateTask}
                onDisavow={onDisavow}
                onAddToTracker={onAddToTracker}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MoreMenu({
  onExport,
  onCreateTask,
  onDisavow,
  onAddToTracker,
}: {
  onExport?: () => void;
  onCreateTask?: () => void;
  onDisavow?: () => void;
  onAddToTracker?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  const Item = ({
    label,
    icon: Icon,
    onClick,
  }: {
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick?: () => void;
  }) => (
    <button
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F7FAFC]"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      title={label}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <IconOnlyButton title="More" onClick={() => setOpen((s) => !s)}>
        <MoreHorizontal className="size-4" />
      </IconOnlyButton>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[220px] bg-white shadow"
          style={{ borderRadius: TK.radius, border: `${BORDER}px solid ${TK.border}` }}
        >
          <Item label="Export Report" icon={Download} onClick={onExport} />
          <Item label="Create Task" icon={ClipboardPlus} onClick={onCreateTask} />
          <Item label="Disavow Links" icon={ShieldOff} onClick={onDisavow} />
          <Item label="Add to Tracker" icon={ListPlus} onClick={onAddToTracker} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Smart Recommendations ------------------------------ */
export type MatchType = "Competitor Match" | "Niche Match" | "Trending" | "Best Value";
export type OpportunityType = "GP" | "LI" | "PR";

export interface SmartPick {
  id: string;
  domain: string;
  wrScore: number; // 0–100
  type: OpportunityType;
  reason: string;
  traffic: number;
  price: number;
  deliveryDays: number;
  matchType: MatchType;
  oppScore: number; // 0–100
  competitorMatchStrength?: number;
  priceToWrValue?: number;
  deliverySpeedScore?: number;
  faviconUrl?: string;
  vefogixUrl?: string;
}

const wrBadgeTone = (wr: number) =>
  wr >= 80
    ? "bg-green-50 text-green-700 border-green-200"
    : wr >= 60
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-rose-50 text-rose-700 border-rose-200";

const typeBadgeLabel = (t: OpportunityType) => (t === "GP" ? "Guest Post" : t === "LI" ? "Link Insertion" : "PR");
const typeBadgeTone =
  (t: OpportunityType) =>
  ({
    GP: "bg-indigo-50 text-indigo-700 border-indigo-200",
    LI: "bg-cyan-50 text-cyan-700 border-cyan-200",
    PR: "bg-violet-50 text-violet-700 border-violet-200",
  }[t]);

const matchTone = (m: MatchType) =>
  ({
    "Competitor Match": "bg-emerald-50 text-emerald-700 border-emerald-200",
    Trending: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    "Best Value": "bg-blue-50 text-blue-700 border-blue-200",
    "Niche Match": "bg-sky-50 text-sky-700 border-sky-200",
  }[m]);

function ScoreTooltip({ pick, onClose }: { pick: SmartPick; onClose: () => void }) {
  return (
    <div
      role="tooltip"
      className="absolute z-50 mt-2 w-[280px] bg-white p-3 text-sm shadow"
      style={{ borderRadius: TK.radius, border: `${BORDER}px solid ${TK.border}` }}
    >
      <div className="flex items-center gap-2 font-medium">
        <Info size={16} className="text-gray-500" />
        <span>Opportunity Score – {pick.oppScore}/100</span>
      </div>
      <p className="mt-2 text-gray-600">
        Composite based on WR Score, risk signals, traffic quality, price‑to‑WR value, and competitor relevance.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded border p-2">
          <div className="text-gray-500">WR Score</div>
          <div className="font-semibold">{pick.wrScore}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-gray-500">Match Strength</div>
          <div className="font-semibold">{pick.competitorMatchStrength ?? "—"}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-gray-500">Price‑to‑WR</div>
          <div className="font-semibold">{pick.priceToWrValue ?? "—"}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-gray-500">Delivery Speed</div>
          <div className="font-semibold">{pick.deliverySpeedScore ?? `${pick.deliveryDays}d`}</div>
        </div>
      </div>
      <div className="mt-2 text-right">
        <button className="text-[12px] underline text-gray-500 hover:text-gray-700" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function SmartCard({
  pick,
  onView,
  onBuy,
  onPinToggle,
  pinned = false,
}: {
  pick: SmartPick;
  onView?: (p: SmartPick) => void;
  onBuy?: (p: SmartPick) => void;
  onPinToggle?: (p: SmartPick) => void;
  pinned?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const tier = scoreColor(pick.oppScore);
  const favicon = pick.faviconUrl || getFaviconUrl(pick.domain);

  return (
    <div
      className={clsx(
        "relative flex min-w-[300px] flex-col rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md sm:min-w-0"
      )}
      style={{ borderColor: TK.border }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setShowTip(false);
      }}
    >
      <div className="absolute right-2 top-2 flex items-center gap-2">
        <span
          title="AI‑generated suggestion"
          className="inline-flex items-center gap-1 rounded-full border bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
          style={{ borderColor: TK.borderLight }}
        >
          <Sparkles size={12} /> AI
        </span>
        <button
          title={pinned ? "Unpin this pick" : "Pin this pick"}
          onClick={() => onPinToggle?.(pick)}
          className={clsx(
            "grid size-7 place-items-center rounded border cursor-pointer",
            pinned ? "bg-amber-100 text-amber-700" : "bg-gray-50 text-gray-500"
          )}
          style={{ borderColor: TK.borderLight }}
        >
          <Pin size={14} />
        </button>
      </div>

      {/* Card header with favicon + brand icon */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="grid size-6 place-items-center overflow-hidden rounded">
          {favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="h-6 w-6 object-cover" />
          ) : (
            <Link2 size={16} color={TK.brand} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link2 size={14} color={TK.brand} />
            <a
              href={pick.vefogixUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium hover:underline"
              style={{ color: TK.text }}
              title={pick.domain}
            >
              {pick.domain}
            </a>
            <span
              className={clsx("inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold", wrBadgeTone(pick.wrScore))}
              title="WR Score (0–100)"
            >
              WR&nbsp;{pick.wrScore}
            </span>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="px-4 py-3">
        {/* Opportunity Score */}
        <div className="relative flex items-center gap-2">
          <div
            className={clsx(
              "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[13px] font-medium",
              tier === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
              tier === "yellow" && "border-amber-200 bg-amber-50 text-amber-700",
              tier === "red" && "border-rose-200 bg-rose-50 text-rose-700"
            )}
          >
            Opportunity Score: {pick.oppScore}
            <button
              className="ml-1 text-gray-500 hover:text-gray-700"
              aria-label="Score tooltip"
              onClick={() => setShowTip((s) => !s)}
              title="Score breakdown"
            >
              <Info size={14} />
            </button>
          </div>
          {showTip && <ScoreTooltip pick={pick} onClose={() => setShowTip(false)} />}
        </div>

        {/* tags */}
        <div className="mt-2 flex items-center gap-2">
          <span className={clsx("inline-flex items-center rounded border px-2 py-0.5 text-[12px] font-medium", typeBadgeTone(pick.type))}>
            {typeBadgeLabel(pick.type)}
          </span>
          <span className={clsx("inline-flex items-center rounded border px-2 py-0.5 text-[12px] font-medium", matchTone(pick.matchType))}>
            {pick.matchType}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-[13px]" style={{ color: TK.muted }}>
          Reason: {pick.reason}
        </p>

        {/* metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
          <div className="flex items-center gap-1" style={{ color: TK.text }}>
            <TrendingUp size={16} className="text-gray-500" />
            <span title="Monthly organic traffic">{formatTraffic(pick.traffic)}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: TK.text }}>
            <DollarSign size={16} className="text-gray-500" />
            <span>{formatMoneyUSD(pick.price)}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: TK.text }}>
            <Timer size={16} className="text-gray-500" />
            <span>
              {pick.deliveryDays} day{pick.deliveryDays === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* footer CTAs */}
      <div className="flex items-center gap-2 px-4 pb-4 pt-2">
        <button
          className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-sky-700"
          onClick={() => onView?.(pick)}
          title="View Details"
        >
          <Eye size={16} /> <span className="hidden xs:inline">View Details</span>
        </button>

        <a
          href={pick.vefogixUrl || "#"}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (!pick.vefogixUrl) e.preventDefault();
            onBuy?.(pick);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] font-medium hover:bg-[#F7FAFC]"
          style={{ borderColor: TK.border, color: TK.text }}
          title="Buy Now (Vefogix)"
        >
          <ShoppingCart size={16} />
          <span className="hidden sm:inline">Buy Now</span>
        </a>
      </div>

      {/* hover ring */}
      <div className={clsx("pointer-events-none absolute inset-0 rounded-lg transition", hover ? "ring-1 ring-sky-200" : "ring-0")} />
    </div>
  );
}

export function SmartRecommendations({
  picks = [], // ✅ default to [] to avoid .map on undefined
  maxVisible = 6,
  onViewPick,
  onBuyPick,
  onRefresh,
  onViewAll,
}: {
  picks?: SmartPick[]; // made optional & safely defaulted
  maxVisible?: number;
  onViewPick?: (p: SmartPick) => void;
  onBuyPick?: (p: SmartPick) => void;
  onRefresh?: () => void;
  onViewAll?: () => void;
}) {
  const safePicks = Array.isArray(picks) ? picks : []; // extra guard
  const [pinned, setPinned] = useState<string[]>([]);
  const togglePin = (p: SmartPick) =>
    setPinned((prev) => (prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]));

  const sorted = useMemo(() => {
    const score = (p: SmartPick) => {
      const s = (p.oppScore ?? 0) * 0.4;
      const m = (p.competitorMatchStrength ?? 0) * 0.25;
      const v = (p.priceToWrValue ?? 0) * 0.2;
      const d = (p.deliverySpeedScore ?? 0) * 0.15;
      return s + m + v + d;
    };
    const pinBoost = 10_000;
    return safePicks
      .map((p) => ({ p, r: score(p) + (pinned.includes(p.id) ? pinBoost : 0) }))
      .sort((a, b) => b.r - a.r)
      .map((x) => x.p);
  }, [safePicks, pinned]);

  const visible = sorted.slice(0, maxVisible);
  const hasOverflow = sorted.length > maxVisible;

  return (
    <section
      aria-label="Smart Recommendations"
      className="mx-auto w-full px-6 py-5"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="grid size-9 place-items-center rounded-lg"
            style={{ background: TK.pastel, border: `${BORDER}px solid ${TK.borderLight}` }}
          >
            <Sparkles size={18} color={TK.brand} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold md:text-[20px]" style={{ color: TK.text }}>
              Smart Recommendations
            </h2>
            <p className="text-[13px]" style={{ color: TK.muted }}>
              Top Vefogix opportunities ranked by Opportunity Score, value, speed, and competitor fit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OutlineBrandButton title="Refresh Recommendations" icon={RefreshCw} onClick={onRefresh} />
        </div>
      </div>

      {/* desktop grid */}
      <div className="mt-4 hidden grid-cols-1 gap-4 sm:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => (
          <SmartCard
            key={p.id}
            pick={p}
            pinned={pinned.includes(p.id)}
            onPinToggle={togglePin}
            onView={onViewPick}
            onBuy={onBuyPick}
          />
        ))}
      </div>

      {/* mobile carousel */}
      <div className="mt-4 overflow-x-auto sm:hidden">
        <div className="flex gap-3 pr-2">
          {visible.map((p) => (
            <SmartCard
              key={p.id}
              pick={p}
              pinned={pinned.includes(p.id)}
              onPinToggle={togglePin}
              onView={onViewPick}
              onBuy={onBuyPick}
            />
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="mt-4 flex items-center justify-center">
        {hasOverflow && (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.border, color: TK.text }}
            onClick={onViewAll}
            title="View All Smart Picks"
          >
            <ExternalLinkIcon size={16} /> View All Smart Picks
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Composition: Header + Smart Picks ------------------------------ */
export default function OpportunitiesHeaderAndSmartPicks({
  projectName,
  lastCrawl,
  picks = [], // ✅ default to [] to ensure child receives an array
  onExport,
  onCreateTask,
  onDisavow,
  onAddToTracker,
  onFindNewLink,
  onRefreshPicks,
  onViewAllPicks,
  onViewPick,
  onBuyPick,
}: {
  projectName?: string;
  lastCrawl?: Date;
  picks?: SmartPick[]; // made optional & defaulted
  onExport?: () => void;
  onCreateTask?: () => void;
  onDisavow?: () => void;
  onAddToTracker?: () => void;
  onFindNewLink?: () => void;
  onRefreshPicks?: () => void;
  onViewAllPicks?: () => void;
  onViewPick?: (p: SmartPick) => void;
  onBuyPick?: (p: SmartPick) => void;
}) {
  return (
    <div className="bg-white">
      <BacklinkOpportunitiesHeader
        projectName={projectName}
        lastCrawl={lastCrawl}
        onExport={onExport}
        onCreateTask={onCreateTask}
        onDisavow={onDisavow}
        onAddToTracker={onAddToTracker}
        onFindNewLink={onFindNewLink}
      />
      <SmartRecommendations
        picks={picks || []} // extra guard
        onRefresh={onRefreshPicks}
        onViewAll={onViewAllPicks}
        onViewPick={onViewPick}
        onBuyPick={onBuyPick}
      />
    </div>
  );
}
