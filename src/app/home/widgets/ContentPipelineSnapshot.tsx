// ContentPipelineSnapshot.tsx
"use client";

import React from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  ExternalLink,
  Filter,
  FlagTriangleRight,
  LayoutGrid,
  Search,
  Globe,
} from "lucide-react";

/* =======================================================================================
 * TOKENS (align with dashboard look & feel used elsewhere)
 * =====================================================================================*/
const TOKENS = {
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  subtle: "#F5F7FA",
  brand: "#008CCD",
  brandHover: "#007DB3",

  // status
  good: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",

  // stage hues
  ideas: "#6B7280",
  draft: "#0077FF",
  review: "#F59E0B",
  published: "#10B981",
} as const;

const RADIUS = 8;
const BORDER = `1px solid ${TOKENS.border}`;

/* =======================================================================================
 * TYPES
 * =====================================================================================*/
export type StageKey = "ideas" | "draft" | "review" | "published";

export interface PipelineCounts {
  ideas: number;
  draft: number;
  review: number;
  published: number;
}

export interface QualityBadges {
  /** 0–100 */
  seoScore?: number;
  /** 0–100 */
  readability?: number;
  /** count of flagged items */
  plagiarismFlags?: number;
}

export interface PortfolioRow {
  projectId: string;
  projectName: string;
  /** optional domain for display */
  domain?: string;
  /** optional external site url */
  externalUrl?: string;
  counts: PipelineCounts;
  quality?: QualityBadges;
  /** optional metadata for sorting/filtering */
  updatedAt?: string; // ISO
}

export interface ContentPipelineSnapshotProps {
  items: PortfolioRow[];
  loading?: boolean;

  /** Open Content Dashboard filtered to project/stage */
  onOpenDashboard?: (args: { projectId: string; stage?: StageKey }) => void;

  /** Optional: open project overview or settings */
  onOpenProject?: (projectId: string) => void;

  /** Optional: export the visible list */
  onExportCsv?: (visibleRows: PortfolioRow[]) => void;

  /** Optional: extra action in header (e.g., “Open Portfolio in Content Dashboard”) */
  onOpenPortfolioDashboard?: () => void;

  /** Optional: initial sort key */
  defaultSort?: "project" | "total" | "published" | "inProgress" | "backlog" | "flags" | "seoScore" | "readability";
}

/* =======================================================================================
 * HELPERS
 * =====================================================================================*/
const fmt = new Intl.NumberFormat();
const fmtInt = (n: number) => fmt.format(Math.max(0, n || 0));
const totalCount = (c: PipelineCounts) => c.ideas + c.draft + c.review + c.published;
const inProgress = (c: PipelineCounts) => c.draft + c.review;
const backlog = (c: PipelineCounts) => c.ideas;

function bandColor(v?: number) {
  if (typeof v !== "number") return { fg: TOKENS.muted, bg: "#F3F4F6", label: "—" };
  if (v >= 80) return { fg: TOKENS.good, bg: "rgba(16,185,129,0.15)", label: String(v) };
  if (v >= 60) return { fg: TOKENS.warning, bg: "rgba(245,158,11,0.15)", label: String(v) };
  return { fg: TOKENS.critical, bg: "rgba(239,68,68,0.15)", label: String(v) };
}

const STAGE_META: Record<
  StageKey,
  { label: string; color: string; title: string; hint: string }
> = {
  ideas: { label: "Ideas", color: TOKENS.ideas, title: "Ideas", hint: "Open Dashboard: Ideas" },
  draft: { label: "Draft", color: TOKENS.draft, title: "Drafts", hint: "Open Dashboard: Draft" },
  review: { label: "Review", color: TOKENS.review, title: "In Review", hint: "Open Dashboard: Review" },
  published: { label: "Published", color: TOKENS.published, title: "Open Dashboard: Published", hint: "Open Dashboard: Published" },
};

type SortKey =
  | "project"
  | "total"
  | "published"
  | "inProgress"
  | "backlog"
  | "flags"
  | "seoScore"
  | "readability";

/* =======================================================================================
 * FAVICON UTILS
 * =====================================================================================*/
function domainFromRow(row: PortfolioRow): string | undefined {
  if (row.domain) return row.domain.replace(/^https?:\/\//, "");
  if (row.externalUrl) {
    try {
      return new URL(row.externalUrl).hostname;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function Favicon({
  domain,
  size = 18,
  className = "",
  rounded = true,
}: {
  domain?: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const [err, setErr] = React.useState(false);
  // DuckDuckGo & Google S2 both work; S2 supports sz parameter
  const src = domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}` : "";
  if (!domain || err) {
    return (
      <span
        aria-hidden
        className={`inline-block shrink-0 ${rounded ? "rounded" : "rounded-md"} ${className}`}
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 30% 30%, #BDD6FF 10%, transparent 60%), linear-gradient(180deg, #008CCD, #4286F5)",
        }}
      />
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={`${domain} favicon`}
      onError={() => setErr(true)}
      className={`${rounded ? "rounded" : "rounded-md"} inline-block shrink-0 border`}
      style={{ borderColor: TOKENS.border }}
    />
  );
}

/* =======================================================================================
 * SMALL PRIMITIVES (sizes tuned down)
 * =====================================================================================*/
function Chip({
  children,
  title,
  onClick,
  active = false,
  tone,
  disabled,
}: React.PropsWithChildren<{
  title?: string;
  onClick?: () => void;
  active?: boolean;
  tone?: "default" | "good" | "warning" | "critical";
  disabled?: boolean;
}>) {
  const bg =
    tone === "good"
      ? "rgba(16,185,129,0.15)"
      : tone === "warning"
      ? "rgba(245,158,11,0.15)"
      : tone === "critical"
      ? "rgba(239,68,68,0.15)"
      : "#FFFFFF";
  const border =
    tone === "good"
      ? "rgba(16,185,129,0.30)"
      : tone === "warning"
      ? "rgba(245,158,11,0.30)"
      : tone === "critical"
      ? "rgba(239,68,68,0.30)"
      : TOKENS.border;

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-full px-2.5 text-xs transition disabled:opacity-50"
      style={{
        background: active ? bg : "#FFFFFF",
        border: `1px solid ${active ? border : TOKENS.border}`,
        color:
          tone === "good"
            ? TOKENS.good
            : tone === "warning"
            ? TOKENS.warning
            : tone === "critical"
            ? TOKENS.critical
            : TOKENS.text,
      }}
    >
      {children}
    </button>
  );
}

function StagePill({
  stage,
  count,
  onOpen,
}: {
  stage: StageKey;
  count: number;
  onOpen?: () => void;
}) {
  const meta = STAGE_META[stage];
  return (
    <button
      type="button"
      aria-label={`${meta.title}: ${count}`}
      title={meta.hint}
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1.5 text-xs transition"
      style={{
        background: "#FFFFFF",
        border: BORDER,
      }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: meta.color }}
      />
      <span className="font-medium" style={{ color: TOKENS.text }}>
        {meta.label}
      </span>
      <span
        className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
        style={{
          background: "rgba(0,0,0,0.04)",
          color: meta.color,
        }}
      >
        {fmtInt(count)}
      </span>
      <ArrowRight
        size={14}
        className="translate-x-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
        style={{ color: meta.color }}
      />
    </button>
  );
}

function Badge({
  label,
  value,
  tone,
  title,
}: {
  label: string;
  value: string;
  tone: "default" | "good" | "warning" | "critical";
  title?: string;
}) {
  const colors =
    tone === "good"
      ? { fg: TOKENS.good, bg: "rgba(16,185,129,0.15)" }
      : tone === "warning"
      ? { fg: TOKENS.warning, bg: "rgba(245,158,11,0.15)" }
      : tone === "critical"
      ? { fg: TOKENS.critical, bg: "rgba(239,68,68,0.15)" }
      : { fg: TOKENS.text, bg: TOKENS.subtle };

  return (
    <div
      title={title}
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px]"
      style={{ background: colors.bg, color: colors.fg, border: `1px solid ${TOKENS.border}` }}
    >
      <span className="font-medium">{label}:</span>
      <span className="font-semibold" style={{ color: TOKENS.text }}>
        {value}
      </span>
    </div>
  );
}

/* =======================================================================================
 * PROJECT FILTER DROPDOWN (with favicons)
 * =====================================================================================*/
function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  React.useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function ProjectFilterDropdown({
  items,
  value,
  onChange,
}: {
  items: PortfolioRow[];
  value: string | "all";
  onChange: (v: string | "all") => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  // Unique by projectId
  const opts = React.useMemo(
    () => items.map((r) => ({ id: r.projectId, name: r.projectName, domain: domainFromRow(r) })),
    [items]
  );

  const selected = value === "all" ? undefined : opts.find((o) => o.id === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border bg-white px-2 text-xs"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => setOpen((v) => !v)}
        title="Filter by project"
      >
        {selected ? (
          <>
            <Favicon domain={selected.domain} size={14} />
            <span className="max-w-[140px] truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <Globe size={14} className="text-[#9CA3AF]" />
            <span>All projects</span>
          </>
        )}
        <ChevronDown size={14} className="text-[#9CA3AF]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-20 mt-1 w-56 rounded-md border bg-white p-1 shadow-lg"
          style={{ borderColor: TOKENS.border }}
        >
          <button
            className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
          >
            <Globe size={14} className="text-[#9CA3AF]" />
            <span>All projects</span>
          </button>
          <div className="my-1" style={{ borderBottom: BORDER }} />
          <div className="max-h-72 overflow-auto">
            {opts.map((o) => (
              <button
                key={o.id}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                title={o.name}
              >
                <Favicon domain={o.domain} size={14} />
                <span className="truncate">{o.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================================================================================
 * ROW CARD
 * =====================================================================================*/
function ProjectRowCard({
  row,
  onOpenDashboard,
  onOpenProject,
}: {
  row: PortfolioRow;
  onOpenDashboard?: (args: { projectId: string; stage?: StageKey }) => void;
  onOpenProject?: (projectId: string) => void;
}) {
  const q = row.quality ?? {};
  const seo = bandColor(q.seoScore);
  const read = bandColor(q.readability);
  const flags = q.plagiarismFlags ?? 0;
  const dom = domainFromRow(row);

  return (
    <div
      className="group overflow-hidden rounded-lg border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
      style={{ borderColor: TOKENS.border }}
      role="group"
      aria-label={`Project ${row.projectName}`}
    >
      {/* Top row: identity + quick link */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Favicon domain={dom} size={18} />
          <div className="truncate">
            <div className="flex items-center gap-2 truncate text-[15px] font-semibold" style={{ color: TOKENS.text }}>
              <span className="truncate">{row.projectName}</span>
            </div>
            {row.domain && (
              <div className="truncate text-xs" style={{ color: TOKENS.muted }}>
                {row.domain}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!!row.externalUrl && (
            <a
              className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
              href={row.externalUrl}
              target="_blank"
              rel="noreferrer"
              style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
              title="Open external site"
            >
              <ExternalLink size={14} />
              Visit
            </a>
          )}

          {onOpenProject && (
            <button
              className="inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              onClick={() => onOpenProject(row.projectId)}
              title="Open project"
            >
              <LayoutGrid size={14} />
              Project
            </button>
          )}
        </div>
      </div>

      {/* Middle: Kanban-like mini */}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {(["ideas", "draft", "review", "published"] as StageKey[]).map((stage) => (
          <StagePill
            key={stage}
            stage={stage}
            count={row.counts[stage]}
            onOpen={() => onOpenDashboard?.({ projectId: row.projectId, stage })}
          />
        ))}
      </div>

      {/* Bottom: Quality badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge
          label="SEO Score"
          value={seo.label}
          tone={seo.fg === TOKENS.good ? "good" : seo.fg === TOKENS.warning ? "warning" : q.seoScore == null ? "default" : "critical"}
          title="Project-level content SEO readiness"
        />
        <Badge
          label="Readability"
          value={read.label}
          tone={read.fg === TOKENS.good ? "good" : read.fg === TOKENS.warning ? "warning" : q.readability == null ? "default" : "critical"}
          title="Avg readability (0–100)"
        />
        <Badge
          label="Plagiarism"
          value={`${fmtInt(flags)} flag${flags === 1 ? "" : "s"}`}
          tone={flags > 0 ? (flags >= 5 ? "critical" : "warning") : "default"}
          title="Number of pieces with plagiarism flags"
        />
        <div className="ml-auto w-full text-xs md:w-auto" style={{ color: TOKENS.muted }}>
          Total: <b style={{ color: TOKENS.text }}>{fmtInt(totalCount(row.counts))}</b> • In progress:{" "}
          <b style={{ color: TOKENS.text }}>{fmtInt(inProgress(row.counts))}</b> • Backlog:{" "}
          <b style={{ color: TOKENS.text }}>{fmtInt(backlog(row.counts))}</b>
        </div>
      </div>
    </div>
  );
}

/* =======================================================================================
 * MAIN SECTION
 * =====================================================================================*/
export function ContentPipelineSnapshot({
  items,
  loading,
  onOpenDashboard,
  onOpenProject,
  onExportCsv,
  onOpenPortfolioDashboard,
  defaultSort = "project",
}: ContentPipelineSnapshotProps) {
  // Controls
  const [q, setQ] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<StageKey | "all">("all");
  const [onlyFlags, setOnlyFlags] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<SortKey>(defaultSort);
  const [projectFilter, setProjectFilter] = React.useState<string | "all">("all");

  // Derived
  const normalized = React.useMemo(() => items ?? [], [items]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return normalized.filter((r) => {
      const name = `${r.projectName} ${r.domain ?? ""}`.toLowerCase();
      const flags = r.quality?.plagiarismFlags ?? 0;
      const stageOk = stageFilter === "all" ? true : (r.counts[stageFilter] ?? 0) > 0;
      const flagsOk = onlyFlags ? flags > 0 : true;
      const textOk = !needle || name.includes(needle);
      const projOk = projectFilter === "all" ? true : r.projectId === projectFilter;
      return stageOk && flagsOk && textOk && projOk;
    });
  }, [normalized, q, stageFilter, onlyFlags, projectFilter]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const num = (n: number | undefined) => (Number.isFinite(n) ? (n as number) : -1);
    arr.sort((a, b) => {
      switch (sortKey) {
        case "project":
          return a.projectName.localeCompare(b.projectName);
        case "total":
          return totalCount(b.counts) - totalCount(a.counts);
        case "published":
          return b.counts.published - a.counts.published;
        case "inProgress":
          return inProgress(b.counts) - inProgress(a.counts);
        case "backlog":
          return backlog(b.counts) - backlog(a.counts);
        case "flags":
          return (b.quality?.plagiarismFlags ?? 0) - (a.quality?.plagiarismFlags ?? 0);
        case "seoScore":
          return num(b.quality?.seoScore) - num(a.quality?.seoScore);
        case "readability":
          return num(b.quality?.readability) - num(a.quality?.readability);
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortKey]);

  const totals = React.useMemo(() => {
    const init: PipelineCounts = { ideas: 0, draft: 0, review: 0, published: 0 };
    const agg = normalized.reduce((acc, r) => {
      acc.ideas += r.counts.ideas || 0;
      acc.draft += r.counts.draft || 0;
      acc.review += r.counts.review || 0;
      acc.published += r.counts.published || 0;
      return acc;
    }, init);
    const flags = normalized.reduce((s, r) => s + (r.quality?.plagiarismFlags ?? 0), 0);
    const seoVals = normalized.map((r) => r.quality?.seoScore).filter((v): v is number => typeof v === "number");
    const readVals = normalized.map((r) => r.quality?.readability).filter((v): v is number => typeof v === "number");
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
    return {
      counts: agg,
      flags,
      avgSeo: avg(seoVals),
      avgRead: avg(readVals),
    };
  }, [normalized]);

  // Header actions
  const doExport = () => {
    if (onExportCsv) {
      onExportCsv(sorted);
      return;
    }
    // Client-side CSV for convenience (optional)
    const cols = ["projectName", "domain", "ideas", "draft", "review", "published", "total", "seoScore", "readability", "plagiarismFlags"];
    const head = cols.join(",");
    const lines = sorted.map((r) =>
      [
        r.projectName,
        r.domain ?? "",
        r.counts.ideas,
        r.counts.draft,
        r.counts.review,
        r.counts.published,
        totalCount(r.counts),
        r.quality?.seoScore ?? "",
        r.quality?.readability ?? "",
        r.quality?.plagiarismFlags ?? 0,
      ]
        .map((v) => JSON.stringify(v))
        .join(",")
    );
    const blob = new Blob([head + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content-pipeline-portfolio.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // UI
  return (
    <section className="w-full">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>
            Content Pipeline Snapshot
          </h3>
          <span className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
            Portfolio
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenPortfolioDashboard && (
            <button
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-sm text-white transition"
              style={{ background: TOKENS.brand }}
              onClick={() => onOpenPortfolioDashboard()}
              title="Open full Content Dashboard"
            >
              <BarChart3 size={16} />
              Open Dashboard
            </button>
          )}
          <button
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-gray-50"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            onClick={doExport}
            title="Export CSV"
          >
            Export
            <ChevronDown size={16} className="text-[#9CA3AF]" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div
            className="flex h-8 items-center gap-2 rounded border px-2"
            style={{ borderColor: TOKENS.border, background: "#FFFFFF" }}
          >
            <Search size={16} className="text-[#9CA3AF]" />
            <input
              className="w-56 min-w-0 outline-none text-sm"
              placeholder="Search project or domain"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Project filter dropdown (with favicons) */}
          <ProjectFilterDropdown items={normalized} value={projectFilter} onChange={setProjectFilter} />

          {/* Stage filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#9CA3AF]" />
            <Chip active={stageFilter === "all"} onClick={() => setStageFilter("all")} title="Show all stages">
              All stages
            </Chip>
            {(Object.keys(STAGE_META) as StageKey[]).map((s) => (
              <Chip
                key={s}
                active={stageFilter === s}
                onClick={() => setStageFilter(s)}
                title={`Show projects with ${STAGE_META[s].label}`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: STAGE_META[s].color }}
                />
                {STAGE_META[s].label}
              </Chip>
            ))}
          </div>

          {/* Only flagged */}
          <Chip
            active={!!onlyFlags}
            onClick={() => setOnlyFlags((v) => !v)}
            tone={onlyFlags ? "warning" : "default"}
            title="Show projects with plagiarism flags"
          >
            <FlagTriangleRight size={14} />
            Only flagged
          </Chip>
        </div>

        {/* Sort */}
        <div
          className="flex h-8 items-center gap-2 rounded border px-2"
          style={{ borderColor: TOKENS.border, background: "#FFFFFF" }}
        >
          <span className="text-sm" style={{ color: TOKENS.muted }}>
            Sort:
          </span>
          <select
            className="cursor-pointer text-sm outline-none"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            title="Sort rows"
          >
            <option value="project">Project</option>
            <option value="total">Total items</option>
            <option value="published">Published</option>
            <option value="inProgress">In progress</option>
            <option value="backlog">Backlog</option>
            <option value="flags">Plagiarism flags</option>
            <option value="seoScore">SEO Score</option>
            <option value="readability">Readability</option>
          </select>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-3" style={{ borderBottom: BORDER }} />

      {/* Totals bar */}
      <div
        className="mt-3 grid grid-cols-1 gap-2 rounded-md border bg-white p-3 md:grid-cols-4"
        style={{ borderColor: TOKENS.border }}
        role="region"
        aria-label="Portfolio totals"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: TOKENS.muted }}>
            Portfolio totals
          </span>
          <span className="text-sm font-semibold" style={{ color: TOKENS.text }}>
            {fmtInt(totalCount(totals.counts))} items
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {(Object.keys(STAGE_META) as StageKey[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-xs">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: STAGE_META[s].color }} />
              <span style={{ color: TOKENS.muted }}>{STAGE_META[s].label}:</span>
              <b style={{ color: TOKENS.text }}>{fmtInt(totals.counts[s])}</b>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: TOKENS.muted }}>
            In progress:
          </span>
          <b style={{ color: TOKENS.text }}>{fmtInt(inProgress(totals.counts))}</b>
          <span className="text-xs" style={{ color: TOKENS.muted }}>
            • Backlog:
          </span>
          <b style={{ color: TOKENS.text }}>{fmtInt(backlog(totals.counts))}</b>
          <span className="text-xs" style={{ color: TOKENS.muted }}>
            • Flags:
          </span>
          <b style={{ color: totals.flags > 0 ? TOKENS.warning : TOKENS.text }}>{fmtInt(totals.flags)}</b>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const s = bandColor(totals.avgSeo);
            const r = bandColor(totals.avgRead);
            return (
              <>
                <Badge label="Avg SEO" value={s.label} tone={s.fg === TOKENS.good ? "good" : s.fg === TOKENS.warning ? "warning" : totals.avgSeo == null ? "default" : "critical"} />
                <Badge label="Avg Readability" value={r.label} tone={r.fg === TOKENS.good ? "good" : r.fg === TOKENS.warning ? "warning" : totals.avgRead == null ? "default" : "critical"} />
              </>
            );
          })()}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[170px] animate-pulse rounded-lg border bg-[#FAFAFA]" style={{ borderColor: TOKENS.border }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="mt-3 flex flex-col items-center justify-center rounded-lg border p-10 text-center"
          style={{ borderColor: TOKENS.border, background: TOKENS.subtle }}
        >
          <div className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            No projects match your filters
          </div>
          <div className="mt-1 text-sm" style={{ color: TOKENS.muted }}>
            Try clearing the search, removing the stage filter, turning off “Only flagged”, or resetting the project filter.
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((row) => (
            <ProjectRowCard key={row.projectId} row={row} onOpenDashboard={onOpenDashboard} onOpenProject={onOpenProject} />
          ))}
        </div>
      )}
    </section>
  );
}

/* =======================================================================================
 * OPTIONAL DEMO (remove in production)
 * =====================================================================================*/
export default function Demo_ContentPipelineSnapshot() {
  const demo: PortfolioRow[] = [
    {
      projectId: "p1",
      projectName: "Wranker",
      domain: "wranker.com",
      externalUrl: "https://wranker.com",
      counts: { ideas: 18, draft: 9, review: 4, published: 126 },
      quality: { seoScore: 82, readability: 74, plagiarismFlags: 1 },
    },
    {
      projectId: "p2",
      projectName: "Vefogix",
      domain: "vefogix.com",
      counts: { ideas: 7, draft: 12, review: 6, published: 64 },
      quality: { seoScore: 71, readability: 66, plagiarismFlags: 3 },
    },
    {
      projectId: "p3",
      projectName: "W3era",
      domain: "w3era.com",
      counts: { ideas: 24, draft: 3, review: 2, published: 32 },
      quality: { seoScore: 58, readability: 62, plagiarismFlags: 0 },
    },
    {
      projectId: "p4",
      projectName: "Acme SaaS",
      domain: "acme.io",
      counts: { ideas: 4, draft: 2, review: 8, published: 12 },
      quality: { seoScore: 76, readability: 81, plagiarismFlags: 5 },
    },
  ];

  return (
    <div className="w-full rounded-md border bg-white mt-4">
      <div className="mx-auto w-full px-4">
        <ContentPipelineSnapshot
          items={demo}
          onOpenDashboard={({ projectId, stage }) => {
            alert(`Open Content Dashboard\nProject: ${projectId}\nStage: ${stage ?? "all"}`);
          }}
          onOpenProject={(projectId) => alert(`Open Project: ${projectId}`)}
          onOpenPortfolioDashboard={() => alert("Open Content Dashboard (Portfolio)")}
        />
      </div>
    </div>
  );
}
