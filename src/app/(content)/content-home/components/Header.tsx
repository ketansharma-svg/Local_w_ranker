"use client";

/**
 * Content Dashboard · Home Header — Redesigned (drop‑in)
 *
 * ✅ Inter / Inter Fallback font stack
 * ✅ Branded #008CCD icons for title & actions
 * ✅ Favicons shown for project/domain
 * ✅ Modular Chips, Buttons, Toggle‑ready patterns
 * ✅ Pointer cursor on all interactive elements
 * ✅ Tailwind‑only (no UI libs)
 *
 * NOTE: Wire the callbacks to your app. Replace mock demo wrapper as needed.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Upload,
  Share2,
  Settings,
  BarChart3,
  ChevronDown,
  CalendarDays,
  SlidersHorizontal,
  Check,
  Search,
  Users,
  Globe2,
  Layers,
  Info,
} from "lucide-react";

/* ----------------------------- Brand / Fonts ----------------------------- */

const TK = {
  brand: "#008CCD", // required branded color
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  panel: "#FFFFFF",
  appBg: "#F7FAFC",
};

const fontStack: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* ----------------------------- Types ----------------------------- */

type DateRangePreset = "last_7" | "last_28" | "last_90" | "last_180" | "last_365" | "custom";
type CompareMode = "prev_period" | "prev_year";

export interface ProjectInfo {
  id: string;
  name: string;
  domain: string;
}

export interface UserInfo {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface TeamInfo {
  id: string;
  name: string;
}

export interface Filters {
  dateRange: DateRangePreset;
  customFrom?: string; // ISO if custom
  customTo?: string; // ISO if custom
  compare: CompareMode;
  owners: string[];
  teams: string[];
  contentTypes: string[];
  locales: string[];
  projectIds: string[];
  access: { my: boolean; shared: boolean };
  focusedProjectId?: string | null;
  savedView?: string;
}

export interface ContentHomeHeaderProps {
  // Data sources
  project?: ProjectInfo | null;
  projects?: ProjectInfo[];
  owners?: UserInfo[];
  teams?: TeamInfo[];
  locales?: string[];
  availableContentTypes?: string[];

  // Defaults & callbacks
  defaultFilters?: Partial<Filters>;
  onProjectChange?: (projectId: string | null) => void;
  onFiltersChange?: (filters: Filters) => void;

  // Actions
  onNewBrief?: () => void;
  onNewDraft?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAddToReports?: () => void;
  onOpenSettings?: () => void;

  // Analytics (optional)
  onAnalyticsEvent?: (name: string, payload?: Record<string, unknown>) => void;
}

/* ----------------------------- Utilities ----------------------------- */

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

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

function faviconFor(domainOrUrl: string) {
  try {
    const host = domainOrUrl.includes("://") ? new URL(domainOrUrl).hostname : domainOrUrl;
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`;
  } catch {
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domainOrUrl)}`;
  }
}

/* ----------------------------- Primitives ----------------------------- */

function PrimaryButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:brightness-95 focus-visible:outline"
      style={{
        background: TK.brand,
        color: "#FFFFFF",
        outlineColor: TK.brand,
      }}
    >
      {Icon ? <Icon size={16} className="shrink-0" /> : null}
      <span>{title}</span>
    </button>
  );
}

function IconChipButton({
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
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border transition-colors hover:bg-gray-50 focus-visible:outline"
      style={{ borderColor: TK.border, outlineColor: TK.brand }}
    >
      <span style={{ color: TK.brand }}>{children}</span>
    </button>
  );
}

function ChipTrigger({
  children,
  title,
  onClick,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-2.5 text-[13px] transition-colors hover:bg-gray-50 focus-visible:outline"
      style={{
        borderColor: TK.border,
        color: TK.text,
        outlineColor: TK.brand,
      }}
    >
      {children}
      <ChevronDown size={16} className="text-[#9CA3AF]" />
    </button>
  );
}

function DropdownCard({
  open,
  onClose,
  minWidth = 260,
  children,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; minWidth?: number }>) {
  const ref = useOutsideClose<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute z-50 mt-2 rounded-md bg-white shadow"
      style={{
        minWidth,
        border: `1px solid ${TK.border}`,
      }}
    >
      {children}
    </div>
  );
}

function TitleWithInfo({ title, info }: { title: string; info: string }) {
  return (
    <div className="flex items-center gap-2">
      <Layers size={18} style={{ color: TK.brand }} />
      <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
        {title}
      </h2>
      <span className="relative inline-flex items-center">
        <Info size={16} style={{ color: TK.brand }} />
        <span
          className="invisible absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-white px-2 py-1 text-xs leading-tight text-[#111827] shadow hover:visible group-hover:visible"
          style={{ borderColor: TK.border }}
        >
          {info}
        </span>
      </span>
    </div>
  );
}

/* ----------------------------- Scope Chips ----------------------------- */

function accessLabel(v: { my: boolean; shared: boolean }) {
  if (v.my && v.shared) return "All";
  if (v.my) return "My Projects";
  if (v.shared) return "Shared Projects";
  return "Select Access";
}

function ProjectAccessChip({
  value,
  onChange,
}: {
  value: { my: boolean; shared: boolean };
  onChange: (v: { my: boolean; shared: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ChipTrigger title="Project Access" onClick={() => setOpen((s) => !s)}>
        <Layers size={16} style={{ color: TK.brand }} />
        <span className="font-medium">{accessLabel(value)}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={280}>
        <div className="max-h-[260px] overflow-auto py-1">
          {[
            ["All", "all"],
            ["My Projects", "my"],
            ["Shared Projects", "shared"],
          ].map(([label, key]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
            >
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={
                  key === "all"
                    ? value.my && value.shared
                    : key === "my"
                    ? value.my
                    : value.shared
                }
                onChange={(e) => {
                  const checked = e.target.checked;
                  const next =
                    key === "all"
                      ? { my: checked, shared: checked }
                      : key === "my"
                      ? { ...value, my: checked }
                      : { ...value, shared: checked };
                  onChange(next);
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: `1px solid ${TK.border}` }}
        >
          <button
            className="cursor-pointer text-sm underline"
            onClick={() => onChange({ my: true, shared: true })}
          >
            Select all
          </button>
          <button className="cursor-pointer text-sm underline" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </DropdownCard>
    </div>
  );
}

function ProjectSelectorChip({
  project,
  projects = [],
  onChange,
}: {
  project?: ProjectInfo | null;
  projects?: ProjectInfo[];
  onChange?: (projectId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = project ? project.domain : "All projects";
  return (
    <div className="relative">
      <ChipTrigger title="Select Project" onClick={() => setOpen((s) => !s)}>
        {project ? (
          <img src={faviconFor(project.domain)} alt="" className="h-4 w-4 rounded" />
        ) : (
          <Layers size={16} style={{ color: TK.brand }} />
        )}
        <span className="font-medium">{label}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={320}>
        <div className="max-h-[300px] overflow-auto">
          {projects.map((p) => (
            <button
              key={p.id}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              onClick={() => {
                onChange?.(p.id);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <img src={faviconFor(p.domain)} alt="" className="h-4 w-4 rounded" />
                <span>{p.domain}</span>
              </div>
              {project?.id === p.id && <Check size={16} className="text-emerald-600" />}
            </button>
          ))}
        </div>
        <div className="px-3 py-2" style={{ borderTop: `1px solid ${TK.border}` }}>
          <button
            className="cursor-pointer text-sm underline"
            onClick={() => {
              onChange?.(null);
              setOpen(false);
            }}
          >
            Clear focus (All projects)
          </button>
        </div>
      </DropdownCard>
    </div>
  );
}

/* ----------------------------- Filter Chips ----------------------------- */

function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (v: DateRangePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    value === "last_7"
      ? "Last 7 days"
      : value === "last_28"
      ? "Last 28 days"
      : value === "last_90"
      ? "Last 90 days"
      : value === "last_180"
      ? "Last 180 days"
      : value === "last_365"
      ? "Last 365 days"
      : "Custom";
  return (
    <div className="relative">
      <ChipTrigger title="Date range" onClick={() => setOpen((s) => !s)}>
        <CalendarDays size={16} style={{ color: TK.brand }} />
        <span className="font-medium">{label}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={220}>
        {(
          [
            ["Last 7 days", "last_7"],
            ["Last 28 days", "last_28"],
            ["Last 90 days", "last_90"],
            ["Last 180 days", "last_180"],
            ["Last 365 days", "last_365"],
            ["Custom", "custom"],
          ] as [string, DateRangePreset][]
        ).map(([l, k]) => (
          <button
            key={k}
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
            onClick={() => {
              onChange(k);
              setOpen(false);
            }}
          >
            {l}
          </button>
        ))}
      </DropdownCard>
    </div>
  );
}

function ComparePicker({
  value,
  onChange,
}: {
  value: CompareMode;
  onChange: (v: CompareMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value === "prev_period" ? "Prev period" : "Prev year";
  return (
    <div className="relative">
      <ChipTrigger title="Compare" onClick={() => setOpen((s) => !s)}>
        <SlidersHorizontal size={16} style={{ color: TK.brand }} />
        <span className="font-medium">{label}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={180}>
        {[
          ["Prev period", "prev_period"],
          ["Prev year", "prev_year"],
        ].map(([l, k]) => (
          <button
            key={k}
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
            onClick={() => {
              onChange(k as CompareMode);
              setOpen(false);
            }}
          >
            {l}
          </button>
        ))}
      </DropdownCard>
    </div>
  );
}

function SearchableMultiList({
  title,
  icon: Icon,
  labelAll,
  values,
  options,
  onChange,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?:any; }>;
  labelAll: string;
  values: string[];
  options: Array<{ id: string; label: string; meta?: string }>;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const count = values.length;
  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );
  const label = count === 0 ? labelAll : `${count} selected`;

  return (
    <div className="relative">
      <ChipTrigger title={title} onClick={() => setOpen((s) => !s)}>
        <Icon size={16} style={{ color: TK.brand }} />
        <span className="font-medium">{label}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={300}>
        <div className="border-b p-2" style={{ borderColor: TK.border }}>
          <div
            className="flex items-center gap-2 rounded border px-2 py-1.5"
            style={{ borderColor: TK.border }}
          >
            <Search size={16} className="text-[#9CA3AF]" />
            <input
              className="w-full text-sm outline-none"
              placeholder={`Search ${title.toLowerCase()}`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="max-h-[280px] overflow-auto">
          {filtered.map((o) => {
            const checked = values.includes(o.id);
            return (
              <label
                key={o.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...values, o.id]
                      : values.filter((x) => x !== o.id);
                    onChange(next);
                  }}
                />
                <span className="flex-1">
                  {o.label}
                  {o.meta ? (
                    <span className="ml-1 text-xs text-gray-500">· {o.meta}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderTop: `1px solid ${TK.border}` }}
        >
          <button className="cursor-pointer text-sm underline" onClick={() => onChange([])}>
            Select all
          </button>
          <button className="cursor-pointer text-sm underline" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </DropdownCard>
    </div>
  );
}

function SavedViews({
  currentName,
  views,
  defaultName,
  onSave,
  onLoad,
  onDelete,
  onSetDefault,
}: {
  currentName?: string;
  views: string[];
  defaultName?: string;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onSetDefault: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="relative">
      <ChipTrigger title="Saved Views" onClick={() => setOpen((s) => !s)}>
        <Layers size={16} style={{ color: TK.brand }} />
        <span className="font-medium">
          {currentName ? `View: ${currentName}` : "Saved Views"}
        </span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={320}>
        <div className="border-b px-3 py-2" style={{ borderColor: TK.border }}>
          <div className="text-[12px]" style={{ color: TK.textMuted }}>
            Save current filters as
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: TK.border }}
              placeholder="e.g., US • Last 28d • Blog"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="h-9 cursor-pointer rounded-md px-3 text-sm font-medium text-white"
              style={{ background: TK.brand }}
              onClick={() => {
                if (name.trim()) {
                  onSave(name.trim());
                  setName("");
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
        <div className="max-h-[240px] overflow-auto">
          {views.length === 0 ? (
            <div className="px-3 py-3 text-sm" style={{ color: TK.textMuted }}>
              No saved views yet.
            </div>
          ) : (
            views.map((v) => (
              <div
                key={v}
                className="flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              >
                <button className="cursor-pointer text-left" onClick={() => onLoad(v)}>
                  {v}
                  {v === defaultName ? " • default" : ""}
                </button>
                <div className="flex items-center gap-2">
                  <button className="cursor-pointer underline" onClick={() => onSetDefault(v)}>
                    Set default
                  </button>
                  <button
                    className="cursor-pointer underline text-red-600"
                    onClick={() => onDelete(v)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownCard>
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */

export function ContentHomeHeader({
  project,
  projects = [],
  owners = [],
  teams = [],
  locales = [],
  availableContentTypes = ["blog", "landing", "docs", "resource", "newsletter"],
  defaultFilters,
  onProjectChange,
  onFiltersChange,
  onNewBrief,
  onNewDraft,
  onImport,
  onExport,
  onShare,
  onAddToReports,
  onOpenSettings,
}: ContentHomeHeaderProps) {
  const [filters, setFilters] = useState<Filters>({
    dateRange: defaultFilters?.dateRange ?? "last_28",
    compare: defaultFilters?.compare ?? "prev_period",
    owners: defaultFilters?.owners ?? [],
    teams: defaultFilters?.teams ?? [],
    contentTypes: defaultFilters?.contentTypes ?? [],
    locales: defaultFilters?.locales ?? [],
    projectIds: defaultFilters?.projectIds ?? [],
    access: defaultFilters?.access ?? { my: true, shared: true },
    focusedProjectId: defaultFilters?.focusedProjectId ?? project?.id ?? null,
    savedView: defaultFilters?.savedView,
    customFrom: defaultFilters?.customFrom,
    customTo: defaultFilters?.customTo,
  });

  const [savedViews, setSavedViews] = useState<string[]>([]);
  const [defaultViewName, setDefaultViewName] = useState<string | undefined>(undefined);

  useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // sync focused project external -> internal if prop changes
  useEffect(() => {
    if (project?.id !== filters.focusedProjectId) {
      setFilters((prev) => ({ ...prev, focusedProjectId: project?.id ?? null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="w-full" style={fontStack}>
      {/* Row A — Title & breadcrumb (with branded icon + no emoji) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-3">
          <TitleWithInfo title="Content Dashboard — Home" info="Workspace filters and quick actions." />
        </div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] leading-tight">
          <span style={{ color: TK.text }}>Content Dashboard</span>
          <span className="text-[#9CA3AF]">›</span>
          <span className="font-semibold" style={{ color: TK.text }}>
            Home
          </span>
        </nav>
      </div>

      {/* Row B — Scope & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectAccessChip
            value={filters.access}
            onChange={(v) => setFilter("access", v)}
          />
          <ProjectSelectorChip
            project={project}
            projects={projects}
            onChange={(id) => {
              onProjectChange?.(id);
              setFilter("focusedProjectId", id);
            }}
          />
        </div>

        {/* Actions (icons are brand colored; pointer cursor) */}
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton title="New Brief" icon={Plus} onClick={onNewBrief} />
          <PrimaryButton title="New Draft" icon={Plus} onClick={onNewDraft} />
          <IconChipButton title="Import" onClick={onImport}>
            <Upload className="size-4" />
          </IconChipButton>
          <IconChipButton title="Export" onClick={onExport}>
            <Upload className="size-4 rotate-180" />
          </IconChipButton>
          <IconChipButton title="Share" onClick={onShare}>
            <Share2 className="size-4" />
          </IconChipButton>
          <IconChipButton title="Add to Reports" onClick={onAddToReports}>
            <BarChart3 className="size-4" />
          </IconChipButton>
          <IconChipButton title="Settings" onClick={onOpenSettings}>
            <Settings className="size-4" />
          </IconChipButton>
        </div>
      </div>

      {/* Separator #1 */}
      <div className="mt-3" style={{ borderBottom: `2px solid ${TK.border}` }} />

      {/* Row C — Global Filter Bar (chips remain modular) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(v) => setFilter("dateRange", v)}
          />
          <ComparePicker
            value={filters.compare}
            onChange={(v) => setFilter("compare", v)}
          />

          {/* Owner/Team multi-select */}
          <SearchableMultiList
            title="Owner/Team"
            icon={Users}
            labelAll="All owners"
            values={[...filters.owners, ...filters.teams.map((t) => `team:${t}`)]}
            options={[
              ...owners.map((u) => ({ id: u.id, label: u.name })),
              ...teams.map((t) => ({ id: `team:${t.id}`, label: t.name, meta: "Team" })),
            ]}
            onChange={(ids) => {
              const ownersNext = ids.filter((x) => !x.startsWith("team:"));
              const teamsNext = ids
                .filter((x) => x.startsWith("team:"))
                .map((x) => x.replace("team:", ""));
              setFilters((prev) => ({ ...prev, owners: ownersNext, teams: teamsNext }));
            }}
          />

          {/* Content Type multi-select */}
          <SearchableMultiList
            title="Content Type"
            icon={Layers}
            labelAll="All content types"
            values={filters.contentTypes}
            options={availableContentTypes.map((t) => ({
              id: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
            }))}
            onChange={(next) => setFilter("contentTypes", next)}
          />

          {/* Locale multi-select */}
          <SearchableMultiList
            title="Locale"
            icon={Globe2}
            labelAll="All locales"
            values={filters.locales}
            options={locales.map((l) => ({ id: l, label: l }))}
            onChange={(next) => setFilter("locales", next)}
          />

          {/* Projects (multi) — aggregate subset (list shows labels; main selector shows favicon) */}
          <SearchableMultiList
            title="Projects"
            icon={Layers}
            labelAll="All projects"
            values={filters.projectIds}
            options={projects.map((p) => ({ id: p.id, label: p.domain }))}
            onChange={(next) => setFilter("projectIds", next)}
          />
        </div>

        {/* Saved Views */}
        <div className="flex items-center gap-2">
          <SavedViews
            currentName={filters.savedView}
            views={savedViews}
            defaultName={defaultViewName}
            onSave={(name) => {
              setSavedViews((xs) => (xs.includes(name) ? xs : [...xs, name]));
              setFilter("savedView", name);
            }}
            onLoad={(name) => {
              setFilter("savedView", name);
              // hydrate filters from storage here if needed
            }}
            onDelete={(name) => {
              setSavedViews((xs) => xs.filter((x) => x !== name));
              if (filters.savedView === name) setFilter("savedView", undefined as any);
            }}
            onSetDefault={(name) => {
              setDefaultViewName(name);
            }}
          />
        </div>
      </div>

      {/* Separator #2 */}
      <div className="mt-2" style={{ borderBottom: `2px solid ${TK.border}` }} />
    </div>
  );
}

/* ----------------------------- Optional Demo ----------------------------- */

export default function DemoContentHomeHeader() {
  const projects: ProjectInfo[] = [
    { id: "p1", name: "Wranker", domain: "wranker.com" },
    { id: "p2", name: "W3era", domain: "w3era.com" },
    { id: "p3", name: "Vefogix", domain: "vefogix.com" },
  ];
  const owners: UserInfo[] = [
    { id: "u1", name: "A. Khan" },
    { id: "u2", name: "S. Patel" },
    { id: "u3", name: "J. Miller" },
  ];
  const teams: TeamInfo[] = [
    { id: "t1", name: "Content" },
    { id: "t2", name: "SEO" },
  ];
  const locales = ["en-US", "en-GB", "hi-IN"];
  const [project, setProject] = useState<ProjectInfo | null>(projects[0]);

  return (
    <div className="w-full bg-white p-6 text-[14px]" style={fontStack}>
      <div className="mx-auto w-full">
  <ContentHomeHeader
          project={project}
          projects={projects}
          owners={owners}
          teams={teams}
          locales={locales}
          availableContentTypes={["blog", "landing", "docs", "resource", "newsletter"]}
          defaultFilters={{
            dateRange: "last_28",
            compare: "prev_period",
            access: { my: true, shared: true },
          }}
          onProjectChange={(id) => {
            const next = projects.find((p) => p.id === id) ?? null;
            setProject(next);
          }}
          onFiltersChange={(f) => {
            // eslint-disable-next-line no-console
            console.log("Filters changed", f);
          }}
          onNewBrief={() => alert("New Brief")}
          onNewDraft={() => alert("New Draft")}
          onImport={() => alert("Import")}
          onExport={() => alert("Export")}
          onShare={() => alert("Share")}
          onAddToReports={() => alert("Add to Reports")}
          onOpenSettings={() => alert("Settings")}
        />
      </div>
    </div>
  );
}