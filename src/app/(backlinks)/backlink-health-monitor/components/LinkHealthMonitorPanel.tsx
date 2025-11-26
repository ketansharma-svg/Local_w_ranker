"use client";

import React, { useEffect, useRef, useState } from "react";
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
  Users,
} from "lucide-react";
import { ProjectSelector } from "@/src/components/common/project-selector";
/**
 * Section: Header — Link Health Monitor/ Tracker
 * - Matches recent design system & tokens
 * - Inter / Inter Fallback fonts
 * - Branded (#008CCD) icons for title & Project Access
 * - Project/domain shows favicon (project picker & list)
 * - Pointer cursor on all interactive elements
 */

/* --------------------- Tokens (aligned with recent sections) --------------------- */
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

  danger: "#EF4444",
  radius: 10,
} as const;

const BORDER = 1.5;

/* --------------------- Utils --------------------- */
function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isOpen) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler as any, { passive: true } as any);
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

/** Build a favicon URL for a domain or full URL */
const getFaviconUrl = (domainOrUrl?: string) => {
  if (!domainOrUrl) return "";
  try {
    const u = domainOrUrl.includes("://") ? new URL(domainOrUrl) : new URL("https://" + domainOrUrl);
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(u.hostname)}`;
  } catch {
    return "";
  }
};

/* --------------------- Buttons --------------------- */
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
      className="inline-flex h-10 items-center gap-2 px-3 text-[14px] font-medium cursor-pointer"
      style={{
        color: TK.brand,
        background: TK.surface,
        borderRadius: TK.radius,
        border: `${BORDER}px solid ${TK.brand}`,
      }}
      onMouseEnter={(e) => ((e.currentTarget.style.background = "#F1F9FE"))}
      onMouseLeave={(e) => ((e.currentTarget.style.background = TK.surface))}
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
      className="inline-flex h-10 items-center gap-2 px-3 text-[14px] font-medium cursor-pointer"
      style={{
        color: TK.danger,
        background: TK.surface,
        borderRadius: TK.radius,
        border: `${BORDER}px solid ${TK.danger}`,
      }}
      onMouseEnter={(e) => ((e.currentTarget.style.background = "#FEF2F2"))}
      onMouseLeave={(e) => ((e.currentTarget.style.background = TK.surface))}
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
      className="inline-flex h-10 items-center gap-2 px-3 text-[14px] font-medium text-white cursor-pointer"
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

/* --------------------- Header chips/menus --------------------- */
function ProjectChip({ current = "w3era.com", projects = ["w3era.com", "wranker.com", "vefogix.com"] }: { current?: string; projects?: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Select Project"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 px-3 py-1.5 cursor-pointer"
        style={{
          border: `${BORDER}px solid ${TK.border}`,
          borderRadius: TK.radius,
          background: TK.subtle,
        }}
      >
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F7FAFC] cursor-pointer"
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
        className="inline-flex h-9 items-center gap-2 px-2.5 text-[13px] cursor-pointer"
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
          <label className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F7FAFC] cursor-pointer">
            <input type="checkbox" checked={myProjects} onChange={(e) => setMyProjects(e.target.checked)} />
            <span>My projects</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#F7FAFC] cursor-pointer">
            <input type="checkbox" checked={sharedWithMe} onChange={(e) => setSharedWithMe(e.target.checked)} />
            <span>Shared with me</span>
          </label>
        </div>
      )}
    </div>
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
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#F7FAFC] cursor-pointer"
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

/* --------------------- Header (updated title & brand icons) --------------------- */
export function HealthHeaderAndSmartInsights({
  projectName = "w3era.com",
  subtitle = "Monitor live link status, losses, rel/attr changes & response actions.",
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
      className="sticky top-0 border-b bg-white"
      style={{
        borderColor: TK.borderLight,
        boxShadow: hasShadow ? "0 1px 8px rgba(17,24,39,0.08)" : "none",
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Link Health Monitor/ Tracker header"
    >
      <div className="mx-auto w-full px-6 py-3 md:py-4">
        {/* Row 1: Title + Subtitle · Last Crawl */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="grid size-9 place-items-center rounded-lg"
              style={{ background: TK.pastel, border: `${BORDER}px solid ${TK.borderLight}` }}
              title="Link Health Monitor/ Tracker"
            >
              <Link2 size={18} color={TK.brand} />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="truncate text-[18px] font-semibold md:text-[20px]" style={{ color: TK.text }}>
                  Link Health Monitor/ Tracker
                </h1>
                <span
                  className="hidden md:inline-block rounded px-2 py-0.5 text-[12px] font-medium"
                  style={{ background: TK.pastel, color: TK.brand }}
                  title={projectName}
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
            {/* <ProjectAccess />
            <ProjectChip current={projectName} /> */}
            <ProjectSelector />
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop / tablet actions */}
            <ProjectChip current={projectName} />
            <div className="hidden items-center gap-2 sm:flex">
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

