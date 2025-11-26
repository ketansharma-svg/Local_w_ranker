"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  RefreshCw,
  Share2,
  BarChart3,
  Settings,
  ExternalLink as ExternalLinkIcon,
  ChevronDown,
  FileText,
  Text,
  Link2Off,
  GitBranch,
  ClipboardPlus,
  Plus,
  Clock,
} from "lucide-react";
import { Breadcrumb } from "@/src/app/keyword-insights/components/keywordInsightsHeader";
import { ProjectSelector } from "../common/project-selector";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/**
 * Wranker – Link Analyzer
 * Header & Tab Navigation (standalone, ready-to-use)
 * - No external UI deps; only React + lucide-react
 * - No KPIs in header
 * - Tabs are on background; active has underline + pastel brand bg
 */

const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  pastelBrand: "#D9EEF8",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  textDarkerMuted: "#374151",
};

const RADIUS = 8;
const BORDER = 2;

// ---- generic outside-click hook
function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
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

// ---- small primitives
function IconOnlyButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 36,
        width: 36,
        display: "grid",
        placeItems: "center",
        borderRadius: RADIUS,
        border: `${BORDER}px solid ${TOKENS.borderLight}`,
        background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        color: TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  title,
  children,
  onClick,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center gap-2 h-9 px-3 text-white"
      style={{ background: hover ? TOKENS.brandHover : TOKENS.brand, borderRadius: RADIUS }}
    >
      {children}
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
}

// ---- Project selector chip
function ProjectChip() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Select Project"
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="inline-flex items-center gap-2 px-3 py-1.5"
        style={{
          border: `${BORDER}px solid ${TOKENS.borderLight}`,
          borderRadius: RADIUS,
          background: hover ? TOKENS.chipHover : TOKENS.chipBg,
        }}
      >
        <span className="inline-flex h-4 w-4 rounded-full bg-[radial-gradient(circle_at_30%_30%,#BDD6FF,transparent_60%),linear-gradient(180deg,#008CCD,#4286F5)]" />
        <span className="text-[14px] font-medium" style={{ color: "#1E3A8A" }}>
          w3era.com
        </span>
        <ExternalLinkIcon size={16} className="text-[#9CA3AF]" />
        <ChevronDown size={16} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-2 min-w-[260px] bg-white shadow"
          style={{ borderRadius: RADIUS, border: `${BORDER}px solid ${TOKENS.borderLight}` }}
        >
          {[
            "w3era.com (current)",
            "wranker.com",
            "vefogix.com",
            "—",
            "Open Project Settings",
            "Open in new tab",
          ].map((l, i) =>
            l === "—" ? (
              <div key={i} className="my-1" style={{ borderTop: `${BORDER}px solid ${TOKENS.borderLight}` }} />
            ) : (
              <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                {l}
              </button>
            )
          )}
          <div className="p-2" style={{ borderTop: `${BORDER}px solid ${TOKENS.borderLight}` }}>
            <PrimaryButton title="Create Project">
              <Plus className="size-4" />
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Public component (kept as named export for reuse)
function HeaderTabs({
  active,
  onTabChange,
  onCreateProject,
}: {
  active?: string;
  onTabChange?: (k: string) => void;
  onCreateProject?: () => void;
}) {
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const handleCreateTask = useCallback(() => {
    openTaskDrawer({
      title: "Link Analyzer follow-up",
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }, [openTaskDrawer, selectedProject?.id]);

  const lastCrawl = new Date();
  const lastCrawlLabel = lastCrawl.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const TABS = [
    { key: "overviewGpt", label: "Overview", icon: BarChart3 },
    { key: "pages", label: "Pages", icon: FileText },
    { key: "anchors", label: "Anchors", icon: Text },
    { key: "broken-links", label: "Broken Links", icon: Link2Off,},
    { key: "redirects", label: "Redirects", icon: GitBranch },
    { key: "external-links", label: "External Links", icon: ExternalLinkIcon },
    { key: "link-map", label: "Link Map", icon: Share2 },
  ];
  const activeKey = active ?? "overviewGpt";

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <Breadcrumb />
        <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.textDarkerMuted }}>
          <Clock className="size-4" />
          <span>Last Crawl: {lastCrawlLabel}</span>
        </div>
      </div>

      {/* Row 2: chips + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ProjectSelector />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <PrimaryButton title="Create Project" onClick={onCreateProject}>
            <Plus className="size-4" />
          </PrimaryButton>
          <IconOnlyButton title="Export">
            <Upload className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Re-crawl">
            <RefreshCw className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Create Task" onClick={handleCreateTask}>
            <ClipboardPlus className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Share">
            <Share2 className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Add to Reports">
            <BarChart3 className="size-4" />
          </IconOnlyButton>
          <IconOnlyButton title="Settings">
            <Settings className="size-4" />
          </IconOnlyButton>
        </div>
      </div>

      {/* Separator */}
      <div className="mt-3" style={{ borderBottom: `${BORDER}px solid ${TOKENS.borderLight}` }} />

      {/* Tabs */}
      <div className="mt-4" style={{ borderBottom: `${BORDER}px solid ${TOKENS.borderLight}` }}>
        <div className="flex items-center gap-2 pb-1">
          {TABS.map(({ key, label, icon: Icon, count }:any) => {
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                className="relative flex items-center gap-2 py-2 px-3 rounded-md"
                onClick={() => onTabChange?.(key)}
                style={{
                  color: isActive ? TOKENS.brand : TOKENS.text,
                  backgroundColor: isActive ? TOKENS.pastelBrand : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = TOKENS.chipHover;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                }}
              >
                <Icon size={16} className={isActive ? "" : "text-[#6B7280]"} />
                <span className={isActive ? "font-semibold" : "font-medium"}>{label}</span>
                {typeof count === "number" && (
                  <span
                    className="ml-1 inline-flex min-w-[24px] items-center justify-center rounded-full px-1.5 text-[12px]"
                    style={{ backgroundColor: TOKENS.borderLight, color: TOKENS.text }}
                  >
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[6px] h-[2px]" style={{ backgroundColor: TOKENS.brand }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- Demo wrapper (exported for app usage)
export function DemoHeaderTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (key: string) => void;
}) {
  return (
    <div className="w-full text-[14px]" style={{ color: TOKENS.text }}>
      <HeaderTabs active={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

export default DemoHeaderTabs;
export { HeaderTabs };



