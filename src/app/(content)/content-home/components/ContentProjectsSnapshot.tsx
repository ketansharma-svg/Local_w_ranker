"use client";

/*
  Content Projects Snapshot — Section 6 (table only, unified container)
  • One shared bordered container wraps: Section header → Filters bar → Table.
  • Right header controls: [Velocity window chips] [Columns] [Export].
  • Actions column remains the LAST column.
  • Velocity column shows 3 inline stacked bars (Stages / Types / Assignees).
  • Inter + Inter Fallback everywhere. Branded icons (#008CCD). Pointer on clickable.
  • Token mapping per Wranker Design Tokens v1.  (refs in message preface)
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Columns3,
  FilePlus2,
  PencilLine,
  Workflow,
  CheckCircle2,
  Lock,
  Pin,
  Clock,
  Building2,
  Users,
  FileText,
  Layout,
  FileCode2,
  FileBadge2,
  Newspaper,
} from "lucide-react";

/* ───────────────────────────────── Tokens (from CSS vars) ───────────────────────────────── */
const TK = {
  brand: "var(--brand, #008CCD)",
  focus: "var(--focus, #4286F5)",
  text: "var(--text, #374151)",
  textStrong: "var(--text-strong, #111827)",
  textMuted: "var(--text-muted, #6B7280)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  bgApp: "var(--bg-app, #F5F7FA)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  metricBlue: "#0077FF",
} as const;

/* ───────────────────────────────── Types ───────────────────────────────── */
type StageKey = "published" | "review" | "draft" | "approved";
type VelocityWindow = "7d" | "28d";
type VelocityPacket = { segments: Partial<Record<StageKey, number>>; total: number };

export type ProjectsSnapshotRow = {
  id: string;
  project: { name: string; domain: string; favicon?: string; pinned?: boolean };
  owner: { id: string; name: string; avatar?: string };
  velocity:
    | { window: VelocityWindow; segments: Partial<Record<StageKey, number>>; total: number }
    | { byWindow: Partial<Record<VelocityWindow, VelocityPacket>> };
  avgScore: { value: number; tier: "green" | "yellow" | "red"; n?: number };
  readability: { medianFk: number; tier: "success" | "warning" | "critical" };
  aeo: { pct: number; tier: "green" | "yellow" | "red" };
  dupRisk: { high: number; medium: number; low: number };
  due7d: { dueSoon: number; overdue: number; total: number };
  updatedAt: string;
  noPermission?: boolean;
};

export type ProjectsSnapshotProps = {
  rows?: ProjectsSnapshotRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  onCreateBrief?: (projectId: string) => void;
  onStartDraft?: (projectId: string) => void;
  onOpenPipeline?: (projectId: string) => void;
  onOpenApprovals?: (projectId: string) => void;
  onOpenDetails?: (projectId: string) => void;

  persistKey?: string;
  demoFallback?: boolean;
};

/* ───────────────────────────────── Utils ───────────────────────────────── */
const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
const nf = new Intl.NumberFormat();
const pf100 = (n: number) => `${Math.round(n)}%`;
const nowMs = () => Date.now();

const ago = (iso: string) => {
  const d = new Date(iso);
  const diff = nowMs() - d.getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const segColor = (k: string) =>
  k === "published" ? TK.success : k === "approved" ? TK.brand : k === "review" ? TK.warning : k === "draft" ? TK.textMuted : TK.brand;

const badgeTone = (tier: "green" | "yellow" | "red") =>
  tier === "green" ? { bg: TK.successBg, fg: TK.success } : tier === "yellow" ? { bg: TK.warningBg, fg: TK.warning } : { bg: TK.criticalBg, fg: TK.critical };
const pillTone = (tier: "success" | "warning" | "critical") =>
  tier === "success" ? { bg: TK.successBg, fg: TK.success } : tier === "warning" ? { bg: TK.warningBg, fg: TK.warning } : { bg: TK.criticalBg, fg: TK.critical };

function getVelocityWindowData(row: ProjectsSnapshotRow, win: VelocityWindow): VelocityPacket {
  const any = row.velocity as any;
  if (any?.byWindow?.[win]) return any.byWindow[win] as VelocityPacket;
  if (any?.window && any.window === win) return { segments: any.segments ?? {}, total: any.total ?? 0 };
  if (any?.window && any.segments) return { segments: any.segments, total: any.total ?? 0 };
  return { segments: {}, total: 0 };
}

/* ───────────────────────────────── Micro UI ───────────────────────────────── */
function Avatar({ name, src, size = 28 }: { name: string; src?: string; size?: number }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      aria-label={name}
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#E3F2FD",
        color: TK.brand as string,
        border: `1px solid ${TK.border}`,
      }}
      className="inline-flex items-center justify-center text-[12px] font-semibold overflow-hidden"
    >
      {src ? <img src={src} alt="" width={size} height={size} /> : initials}
    </div>
  );
}

function ScoreBadge({ value, tier, n }: { value: number; tier: "green" | "yellow" | "red"; n?: number }) {
  const t = badgeTone(tier);
  return (
    <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs" style={{ background: t.bg, color: t.fg }} title={n ? `Avg of ${n} docs` : undefined}>
      <span className="font-semibold tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

function ReadabilityPill({ fk, tier }: { fk: number; tier: "success" | "warning" | "critical" }) {
  const t = pillTone(tier);
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm tabular-nums" style={{ color: TK.text }}>
        {fk.toFixed(1)}
      </span>
      <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]" style={{ background: t.bg, color: t.fg }}>
        {tier === "success" ? "At/Below target" : tier === "warning" ? "+1–2 above" : "≥+3 above"}
      </div>
    </div>
  );
}

function AeoBar({ pct, tier }: { pct: number; tier: "green" | "yellow" | "red" }) {
  const t = badgeTone(tier);
  return (
    <div className="inline-flex items-center gap-2" title={`AEO Ready: ${pct}%`}>
      <div className="h-1.5 w-24 rounded" style={{ background: TK.borderSubtle }}>
        <div className="h-1.5 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: t.fg }} />
      </div>
      <span className="text-sm tabular-nums" style={{ color: TK.text }}>
        {pf100(pct)}
      </span>
    </div>
  );
}

function CountBadge({ n, tone }: { n: number; tone: "neutral" | "warning" | "critical" }) {
  const map = tone === "critical" ? { bg: TK.criticalBg, fg: TK.critical } : tone === "warning" ? { bg: TK.warningBg, fg: TK.warning } : { bg: TK.borderSubtle, fg: TK.textMuted };
  return (
    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: map.bg, color: map.fg }}>
      <span className="font-semibold tabular-nums">{n}</span>
    </div>
  );
}

/** Tiny stacked bar for velocity mixes */
function StackedBar({
  segments,
  total,
  title,
}: {
  segments: { key: string; label: string; value: number; color?: string }[];
  total: number;
  title: string;
}) {
  const sum = Math.max(1, segments.reduce((s, x) => s + (x.value || 0), 0));
  return (
    <div className="flex items-center gap-2" title={`${title} · Total ${nf.format(total)}`} style={{ cursor: "pointer" }}>
      <div className="h-1.5 w-[92px] overflow-hidden rounded" style={{ background: TK.borderSubtle }}>
        <div className="flex h-1.5 w-full">
          {segments.map((s, i) => {
            const w = `${((s.value || 0) / sum) * 100}%`;
            const col =
              s.color ??
              (s.key === "published" || s.key === "ok"
                ? TK.success
                : s.key === "approved" || s.key === "owner"
                ? TK.brand
                : s.key === "review" || s.key === "warn"
                ? TK.warning
                : s.key === "draft" || s.key === "other"
                ? TK.textMuted
                : TK.brand);
            return <div key={s.key + i} className="h-full" style={{ width: w, background: col }} />;
          })}
        </div>
      </div>
      <span className="text-[11px] tabular-nums" style={{ color: TK.textMuted }}>
        {nf.format(total)}
      </span>
    </div>
  );
}

/* ───────────────────────────── Filter Chips (with dropdown) ───────────────────────────── */
function useDismissable(open: boolean, setOpen: (o: boolean) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);
  return ref;
}

function FilterChip<T extends string>({
  icon,
  label,
  value,
  options,
  onChange,
  width = 220,
}: {
  icon: React.ReactNode;
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismissable(open, setOpen);
  const active = value !== (options[0]?.value ?? ("" as T));
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cls("inline-flex items-center gap-2 h-8 px-3 rounded-full border text-sm", "hover:bg-[#F6FAFF]")}
        style={{ borderColor: TK.border, color: active ? TK.textStrong : TK.text, cursor: "pointer" }}
        aria-expanded={open}
      >
        <span className="inline-flex items-center">{icon}</span>
        {label}: <span className="font-medium">{options.find((o) => o.value === value)?.label ?? "All"}</span>
        <ChevronDown size={14} className={cls("transition", open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 rounded-md border bg-white p-2 shadow" style={{ width, borderColor: TK.border, boxShadow: TK.shadow1 }}>
          <div className="max-h-[260px] overflow-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="block w-full text-left rounded px-2 py-1.5 text-sm hover:bg-[#F5F8FF]"
                style={{ cursor: "pointer" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Table (columns + rows) ───────────────────────────── */
type ColKey =
  | "project"
  | "owner"
  | "velocity"
  | "avgScore"
  | "readability"
  | "aeo"
  | "dupRisk"
  | "due7d"
  | "updatedAt"
  | "actions"; // actions last

const DEFAULT_VISIBLE: Record<ColKey, boolean> = {
  project: true,
  owner: true,
  velocity: true,
  avgScore: true,
  readability: true,
  aeo: true,
  dupRisk: true,
  due7d: true,
  updatedAt: true,
  actions: true,
};

function Th({
  children,
  width,
  sticky,
  left,
  sorted,
  dir,
  onSort,
}: {
  children: React.ReactNode;
  width?: number;
  sticky?: boolean;
  left?: number;
  sorted?: boolean;
  dir?: "asc" | "desc";
  onSort?: () => void;
}) {
  return (
    <th
      className="px-3 text-left text-[12px] font-medium"
      style={{
        minWidth: width,
        width,
        position: sticky ? "sticky" : undefined,
        left,
        zIndex: sticky ? 20 : undefined,
        background: "#FFFFFF",
        boxShadow: sticky ? "inset -1px 0 0 rgba(0,0,0,0.06)" : undefined,
        color: TK.text,
      }}
    >
      <button className="inline-flex items-center gap-1 hover:underline" onClick={onSort} style={{ cursor: "pointer", color: TK.text }}>
        {children}
        {sorted ? <ChevronDown size={14} className={cls("transition", dir === "asc" ? "rotate-180" : "")} /> : <ChevronDown size={14} className="opacity-30" />}
      </button>
    </th>
  );
}

function Td({ children, width, sticky, left }: { children: React.ReactNode; width?: number; sticky?: boolean; left?: number }) {
  return (
    <td
      className="relative px-3"
      style={{
        minWidth: width,
        width,
        position: sticky ? "sticky" : undefined,
        left,
        zIndex: sticky ? 10 : undefined,
        background: "#FFFFFF",
        boxShadow: sticky ? "inset -1px 0 0 rgba(0,0,0,0.06)" : undefined,
        color: TK.text,
      }}
    >
      {children}
    </td>
  );
}

function Masked() {
  return (
    <span className="inline-flex items-center gap-1 text-sm" style={{ color: TK.textMuted }}>
      ••• <Lock size={14} />
    </span>
  );
}

function RowActions({
  projectId,
  noPerm,
  onCreateBrief,
  onStartDraft,
  onOpenPipeline,
  onOpenApprovals,
}: {
  projectId: string;
  noPerm?: boolean;
  onCreateBrief?: (id: string) => void;
  onStartDraft?: (id: string) => void;
  onOpenPipeline?: (id: string) => void;
  onOpenApprovals?: (id: string) => void;
}) {
  if (noPerm) return null;
  const Btn = ({ title, onClick, children }: { title: string; onClick?: () => void; children: React.ReactNode }) => (
    <button
      data-stop
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded border bg-white"
      style={{ borderColor: TK.border, color: TK.brand, cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={title}
    >
      {children}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-1.5">
      {onCreateBrief && (
        <Btn title="Create Brief" onClick={() => onCreateBrief(projectId)}>
          <FilePlus2 size={16} />
        </Btn>
      )}
      {onStartDraft && (
        <Btn title="Start Draft" onClick={() => onStartDraft(projectId)}>
          <PencilLine size={16} />
        </Btn>
      )}
      {onOpenPipeline && (
        <Btn title="Open Pipeline" onClick={() => onOpenPipeline(projectId)}>
          <Workflow size={16} />
        </Btn>
      )}
      {onOpenApprovals && (
        <Btn title="Open Approvals" onClick={() => onOpenApprovals(projectId)}>
          <CheckCircle2 size={16} />
        </Btn>
      )}
    </div>
  );
}

/* ───────────────────────────── Core Table Component ───────────────────────────── */
export function ProjectsSnapshotTable({
  rows = [],
  loading,
  error,
  onRetry,
  onCreateBrief,
  onStartDraft,
  onOpenPipeline,
  onOpenApprovals,
  onOpenDetails,
  persistKey = "wr:cd:proj-snap:v3",
  demoFallback = false,
}: ProjectsSnapshotProps) {
  const [visible, setVisible] = useState<Record<ColKey, boolean>>({ ...DEFAULT_VISIBLE });
  const [sortBy, setSortBy] = useState<ColKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [velWin, setVelWin] = useState<VelocityWindow>("7d");

  // Filters
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [aeoFilter, setAeoFilter] = useState<"all" | "green" | "yellow" | "red">("all");
  const [dupFilter, setDupFilter] = useState<"all" | "high" | "medium+" | "low">("all");
  const [updatedFilter, setUpdatedFilter] = useState<"all" | "24h" | "7d" | "14d" | "30d">("all");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(persistKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.visible) setVisible((v) => ({ ...v, ...parsed.visible }));
      if (parsed.sortBy) setSortBy(parsed.sortBy);
      if (parsed.sortDir) setSortDir(parsed.sortDir);
      if (parsed.velWin) setVelWin(parsed.velWin);
    } catch {}
  }, [persistKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(persistKey, JSON.stringify({ visible, sortBy, sortDir, velWin }));
  }, [persistKey, visible, sortBy, sortDir, velWin]);

  const onSort = (k: ColKey) => {
    if (sortBy !== k) {
      setSortBy(k);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  // Demo rows (optional)
  const demoRows: ProjectsSnapshotRow[] = useMemo(
    () => [
      {
        id: "p1",
        project: { name: "Wranker", domain: "wranker.com", favicon: "https://www.google.com/s2/favicons?domain=wranker.com&sz=32", pinned: true },
        owner: { id: "u1", name: "Alex Rivera" },
        velocity: {
          byWindow: {
            "7d": { segments: { published: 12, review: 7, draft: 9, approved: 3 }, total: 31 },
            "28d": { segments: { published: 43, review: 22, draft: 28, approved: 9 }, total: 102 },
          },
        },
        avgScore: { value: 74.3, tier: "yellow", n: 72 },
        readability: { medianFk: 9.7, tier: "success" },
        aeo: { pct: 58, tier: "yellow" },
        dupRisk: { high: 7, medium: 19, low: 62 },
        due7d: { dueSoon: 6, overdue: 2, total: 8 },
        updatedAt: new Date().toISOString(),
      },
      {
        id: "p2",
        project: { name: "W3era", domain: "w3era.com", favicon: "https://www.google.com/s2/favicons?domain=w3era.com&sz=32" },
        owner: { id: "u2", name: "Priya Sharma" },
        velocity: { window: "7d", segments: { published: 8, review: 4, draft: 3, approved: 2 }, total: 17 },
        avgScore: { value: 81.2, tier: "green", n: 65 },
        readability: { medianFk: 10.6, tier: "warning" },
        aeo: { pct: 66, tier: "green" },
        dupRisk: { high: 0, medium: 3, low: 44 },
        due7d: { dueSoon: 1, overdue: 0, total: 1 },
        updatedAt: new Date(Date.now() - 3.6e6 * 6).toISOString(),
      },
      {
        id: "p3",
        project: { name: "Vefogix", domain: "vefogix.com", favicon: "https://www.google.com/s2/favicons?domain=vefogix.com&sz=32" },
        owner: { id: "u3", name: "Jordan Lee" },
        velocity: { window: "7d", segments: { published: 0, review: 1, draft: 4, approved: 0 }, total: 5 },
        avgScore: { value: 49.8, tier: "red", n: 18 },
        readability: { medianFk: 12.1, tier: "critical" },
        aeo: { pct: 24, tier: "red" },
        dupRisk: { high: 3, medium: 5, low: 17 },
        due7d: { dueSoon: 4, overdue: 1, total: 5 },
        updatedAt: new Date(Date.now() - 8.64e7 * 2).toISOString(),
      },
    ],
    []
  );

  const baseRows = (Array.isArray(rows) && rows.length > 0 ? rows : demoFallback ? demoRows : []) as ProjectsSnapshotRow[];

  // Filtered → Sorted
  const owners = useMemo(() => Array.from(new Set(baseRows.map((r) => r.owner.name))).sort(), [baseRows]);

  const filtered = useMemo(() => {
    const cutoff = (f: typeof updatedFilter) => {
      if (f === "all") return 0;
      if (f === "24h") return 24 * 3600 * 1000;
      if (f === "7d") return 7 * 86400000;
      if (f === "14d") return 14 * 86400000;
      if (f === "30d") return 30 * 86400000;
      return 0;
    };
    const maxAge = cutoff(updatedFilter);
    const now = nowMs();

    return baseRows.filter((r) => {
      if (ownerFilter !== "all" && r.owner.name !== ownerFilter) return false;
      if (aeoFilter !== "all" && r.aeo.tier !== aeoFilter) return false;
      if (dupFilter !== "all") {
        if (dupFilter === "high" && r.dupRisk.high <= 0) return false;
        if (dupFilter === "medium+" && r.dupRisk.high + r.dupRisk.medium <= 0) return false;
        if (dupFilter === "low" && r.dupRisk.high + r.dupRisk.medium > 0) return false;
      }
      if (maxAge > 0) {
        const age = now - new Date(r.updatedAt).getTime();
        if (age > maxAge) return false;
      }
      return true;
    });
  }, [baseRows, ownerFilter, aeoFilter, dupFilter, updatedFilter]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    const getter = (r: ProjectsSnapshotRow): any => {
      switch (sortBy) {
        case "project":
          return r.project.name.toLowerCase();
        case "owner":
          return r.owner.name.toLowerCase();
        case "velocity": {
          const v = getVelocityWindowData(r, velWin);
          return v.total || 0;
        }
        case "avgScore":
          return r.avgScore.value || 0;
        case "readability":
          return r.readability.medianFk || 0;
        case "aeo":
          return r.aeo.pct || 0;
        case "dupRisk":
          return r.dupRisk.high || 0;
        case "due7d":
          return r.due7d.overdue * 100 + r.due7d.total;
        case "updatedAt":
        default:
          return new Date(r.updatedAt).getTime();
      }
    };
    arr.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir, velWin]);

  const [showCols, setShowCols] = useState(false);

  // Export (current sorted view)
  const exportCSV = () => {
    const hdrs = ["Project", "Domain", "Owner", "Velocity(" + velWin + ")", "AvgScore", "Readability", "AEO%", "DupHigh", "DueTotal", "UpdatedAt"];
    const rowsOut = sorted.map((r) => {
      const v = getVelocityWindowData(r, velWin);
      return [
        JSON.stringify(r.project.name),
        r.project.domain,
        JSON.stringify(r.owner.name),
        String(v.total || 0),
        r.avgScore.value.toFixed(1),
        r.readability.medianFk.toFixed(1),
        String(r.aeo.pct),
        String(r.dupRisk.high),
        String(r.due7d.total),
        new Date(r.updatedAt).toISOString(),
      ].join(",");
    });
    const csv = [hdrs.join(","), ...rowsOut].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content-projects-snapshot.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const visibleCount = Object.values(visible).filter(Boolean).length || 1;

  /* ───────────────────────────── Render (UNIFIED container) ───────────────────────────── */
  return (
    <section className="w-full" style={{ fontFamily: "Inter, Inter Fallback, ui-sans-serif" }}>
      {/* Unified container: header + filters + table share ONE border */}
      <div className="overflow-hidden rounded-md border" style={{ borderColor: TK.border, background: TK.bgPanel, boxShadow: TK.shadow1 }}>
        {/* Header row (title left, controls right) */}
        <div className="flex items-center justify-between gap-2 border-b px-3 py-3" style={{ borderColor: TK.border }}>
          <div className="inline-flex items-center gap-2">
            <Columns3 size={18} style={{ color: TK.brand }} />
            <h2 className="text-[20px] leading-6 font-semibold" style={{ color: TK.textStrong }}>
              Content Projects Snapshot
            </h2>
          </div>
          <div className="inline-flex items-center gap-2">
            {/* Velocity window chips (moved here, left of Export) */}
            <div className="inline-flex items-center gap-2">
              <span className="text-sm" style={{ color: TK.textMuted }}>
                Velocity
              </span>
              <div className="inline-flex items-center overflow-hidden rounded-full border" style={{ borderColor: TK.border }}>
                {(["7d", "28d"] as VelocityWindow[]).map((w) => (
                  <button
                    key={w}
                    className={cls("px-2.5 py-1 text-xs", velWin === w ? "bg-[color:var(--bg-app,#F5F7FA)] font-semibold" : "")}
                    onClick={() => setVelWin(w)}
                    style={{ cursor: "pointer" }}
                    aria-pressed={velWin === w}
                  >
                    {w.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Column control (moved here, left of Export) */}
            <div className="relative">
              <button
                className="inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-[#F6FAFF]"
                onClick={() => setShowCols((s) => !s)}
                style={{ borderColor: TK.border, cursor: "pointer" }}
                aria-expanded={showCols}
              >
                <Columns3 size={16} />
                Columns
                <ChevronDown size={16} className={cls("transition", showCols ? "rotate-180" : "")} />
              </button>
              {showCols && (
                <div role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-white p-2 shadow" style={{ borderColor: TK.border, boxShadow: TK.shadow1 }}>
                  <div className="mb-1 text-xs" style={{ color: TK.textMuted }}>
                    Show / Hide columns
                  </div>
                  <div className="max-h-[280px] space-y-1 overflow-auto pr-1">
                    {(
                      [
                        "project",
                        "owner",
                        "velocity",
                        "avgScore",
                        "readability",
                        "aeo",
                        "dupRisk",
                        "due7d",
                        "updatedAt",
                        "actions",
                      ] as ColKey[]
                    ).map((k) => (
                      <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={visible[k] !== false} onChange={(e) => setVisible((v) => ({ ...v, [k]: e.target.checked }))} />
                        <span className="capitalize">{k === "avgScore" ? "Avg Score" : k === "dupRisk" ? "Dup Risk" : k === "due7d" ? "Due (7d)" : k}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export (rightmost) */}
            <button
              onClick={exportCSV}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-[#F6FAFF]"
              style={{ borderColor: TK.border, color: TK.textStrong, cursor: "pointer" }}
              aria-label="Export CSV"
              title="Export CSV"
            >
              Export
            </button>
          </div>
        </div>

        {/* Filters bar (shares the SAME container & border) */}
        <div className="border-b px-3 py-2" style={{ borderColor: TK.border }}>
          <FiltersRow
            owners={owners}
            ownerFilter={ownerFilter}
            setOwnerFilter={setOwnerFilter}
            aeoFilter={aeoFilter}
            setAeoFilter={setAeoFilter}
            dupFilter={dupFilter}
            setDupFilter={setDupFilter}
            updatedFilter={updatedFilter}
            setUpdatedFilter={setUpdatedFilter}
          />
        </div>

        {/* Table */}
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="h-10">
                {visible.project && (
                  <Th sticky left={0} width={320} sorted={sortBy === "project"} dir={sortDir} onSort={() => onSort("project")}>
                    Project
                  </Th>
                )}
                {visible.owner && (
                  <Th sticky left={visible.project ? 320 : 0} width={180} sorted={sortBy === "owner"} dir={sortDir} onSort={() => onSort("owner")}>
                    Owner
                  </Th>
                )}
                {visible.velocity && (
                  <Th width={260} sorted={sortBy === "velocity"} dir={sortDir} onSort={() => onSort("velocity")}>
                    Velocity ({velWin.toUpperCase()})
                  </Th>
                )}
                {visible.avgScore && (
                  <Th width={128} sorted={sortBy === "avgScore"} dir={sortDir} onSort={() => onSort("avgScore")}>
                    Avg Score
                  </Th>
                )}
                {visible.readability && (
                  <Th width={160} sorted={sortBy === "readability"} dir={sortDir} onSort={() => onSort("readability")}>
                    Readability
                  </Th>
                )}
                {visible.aeo && (
                  <Th width={160} sorted={sortBy === "aeo"} dir={sortDir} onSort={() => onSort("aeo")}>
                    AEO Ready %
                  </Th>
                )}
                {visible.dupRisk && (
                  <Th width={120} sorted={sortBy === "dupRisk"} dir={sortDir} onSort={() => onSort("dupRisk")}>
                    Dup Risk
                  </Th>
                )}
                {visible.due7d && (
                  <Th width={110} sorted={sortBy === "due7d"} dir={sortDir} onSort={() => onSort("due7d")}>
                    Due (7d)
                  </Th>
                )}
                {visible.updatedAt && (
                  <Th width={150} sorted={sortBy === "updatedAt"} dir={sortDir} onSort={() => onSort("updatedAt")}>
                    Last Updated
                  </Th>
                )}
                {visible.actions && <Th width={210}>Actions</Th>}
              </tr>
            </thead>

            <tbody>
              {/* Skeleton rows */}
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="h-[54px] border-t" style={{ borderColor: TK.border }}>
                    <td colSpan={visibleCount}>
                      <div className="h-8 animate-pulse rounded" style={{ background: TK.borderSubtle }} />
                    </td>
                  </tr>
                ))}

              {/* Data rows */}
              {!loading &&
                sorted.map((r) => {
                  const v = getVelocityWindowData(r, velWin);
                  const noPerm = !!r.noPermission;

                  const total = v.total || 0;
                  const types = [
                    { key: "blog", label: "Blog", value: Math.round(total * 0.45) },
                    { key: "landing", label: "Landing", value: Math.round(total * 0.21) },
                    { key: "docs", label: "Docs", value: Math.round(total * 0.15) },
                    { key: "resource", label: "Resource", value: Math.round(total * 0.11) },
                    { key: "newsletter", label: "Newsletter", value: Math.round(total * 0.08) },
                  ];
                  const assignees = [
                    { key: "owner", label: r.owner.name, value: Math.round(total * 0.6) },
                    { key: "other", label: "Team", value: total - Math.round(total * 0.6) },
                  ];

                  const dupTone: "neutral" | "warning" | "critical" = r.dupRisk.high > 0 ? "critical" : r.dupRisk.medium > 0 ? "warning" : "neutral";
                  const dueTone: "neutral" | "warning" | "critical" =
                    r.due7d.overdue > 0 || r.due7d.total > 5 ? "critical" : r.due7d.total > 0 ? "warning" : "neutral";

                  return (
                    <tr
                      key={r.id}
                      className="group h-[58px] border-t hover:bg-[#F8FAFC] focus-within:bg-[#F8FAFC]"
                      style={{ borderColor: TK.border }}
                      tabIndex={0}
                      onClick={(e) => {
                        const t = e.target as HTMLElement;
                        if (t.closest("[data-stop]")) return;
                        onOpenDetails?.(r.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onOpenDetails?.(r.id);
                      }}
                    >
                      {/* Project */}
                      {visible.project && (
                        <Td sticky left={0} width={320}>
                          <div className="flex items-center gap-2">
                            {r.project.favicon ? <img src={r.project.favicon} alt="" className="h-4 w-4 rounded-[3px]" /> : <Building2 size={14} className="text-[#9CA3AF]" />}
                            <button
                              data-stop
                              className="underline decoration-transparent transition hover:decoration-inherit"
                              style={{ color: TK.metricBlue, cursor: "pointer" }}
                              title={r.project.domain}
                              onClick={() => onOpenDetails?.(r.id)}
                            >
                              {r.project.name}
                            </button>
                            {r.project.pinned && <Pin size={14} style={{ color: TK.brand }} aria-label="Pinned" />}
                          </div>
                        </Td>
                      )}

                      {/* Owner */}
                      {visible.owner && (
                        <Td sticky left={visible.project ? 320 : 0} width={180}>
                          {noPerm ? (
                            <Masked />
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <Avatar name={r.owner.name} src={r.owner.avatar} />
                              <span>{r.owner.name}</span>
                            </div>
                          )}
                        </Td>
                      )}

                      {/* Velocity: three inline bars */}
                      {visible.velocity && (
                        <Td width={260}>
                          {noPerm ? (
                            <Masked />
                          ) : (
                            <div className="grid grid-cols-3 items-center gap-3">
                              <div className="min-w-[80px]">
                                <div className="mb-1 text-[11px]" style={{ color: TK.textMuted }}>
                                  Stages
                                </div>
                                <StackedBar
                                  title="Stages"
                                  total={v.total || 0}
                                  segments={[
                                    { key: "published", label: "Published", value: v.segments.published || 0 },
                                    { key: "review", label: "In Review", value: v.segments.review || 0 },
                                    { key: "draft", label: "Draft", value: v.segments.draft || 0 },
                                    { key: "approved", label: "Approved", value: v.segments.approved || 0 },
                                  ]}
                                />
                              </div>
                              <div className="min-w-[80px]">
                                <div className="mb-1 text-[11px]" style={{ color: TK.textMuted }}>
                                  Types
                                </div>
                                <StackedBar title="Types" total={total} segments={types} />
                              </div>
                              <div className="min-w-[80px]">
                                <div className="mb-1 text-[11px]" style={{ color: TK.textMuted }}>
                                  Assignees
                                </div>
                                <StackedBar title="Assignees" total={total} segments={assignees} />
                              </div>
                            </div>
                          )}
                        </Td>
                      )}

                      {/* Avg Score */}
                      {visible.avgScore && <Td width={128}>{noPerm ? <Masked /> : <ScoreBadge value={r.avgScore.value} tier={r.avgScore.tier} n={r.avgScore.n} />}</Td>}

                      {/* Readability */}
                      {visible.readability && <Td width={160}>{noPerm ? <Masked /> : <ReadabilityPill fk={r.readability.medianFk} tier={r.readability.tier} />}</Td>}

                      {/* AEO */}
                      {visible.aeo && <Td width={160}>{noPerm ? <Masked /> : <AeoBar pct={r.aeo.pct} tier={r.aeo.tier} />}</Td>}

                      {/* Dup Risk */}
                      {visible.dupRisk && <Td width={120}>{noPerm ? <Masked /> : <CountBadge n={r.dupRisk.high} tone={dupTone} />}</Td>}

                      {/* Due (7d) */}
                      {visible.due7d && (
                        <Td width={110}>
                          {noPerm ? (
                            <Masked />
                          ) : (
                            <div className="inline-flex items-center gap-1" title={`Due soon: ${r.due7d.dueSoon} • Overdue: ${r.due7d.overdue}`}>
                              {r.due7d.overdue > 0 && <Clock size={14} style={{ color: TK.critical }} />}
                              <CountBadge n={r.due7d.total} tone={dueTone} />
                            </div>
                          )}
                        </Td>
                      )}

                      {/* Updated */}
                      {visible.updatedAt && <Td width={150}>{noPerm ? <Masked /> : <span title={new Date(r.updatedAt).toLocaleString()}>{ago(r.updatedAt)}</span>}</Td>}

                      {/* Actions — LAST column */}
                      {visible.actions && (
                        <Td width={210}>
                          <RowActions
                            projectId={r.id}
                            noPerm={noPerm}
                            onCreateBrief={onCreateBrief}
                            onStartDraft={onStartDraft}
                            onOpenPipeline={onOpenPipeline}
                            onOpenApprovals={onOpenApprovals}
                          />
                        </Td>
                      )}
                    </tr>
                  );
                })}

              {/* Empty state inside table body (keeps shell visible) */}
              {!loading && sorted.length === 0 && (
                <tr className="h-[120px] border-t" style={{ borderColor: TK.border }}>
                  <td colSpan={visibleCount} className="px-3">
                    <div className="flex w-full flex-col items-center justify-center gap-3 rounded-md border p-6 text-center" style={{ borderColor: TK.border, background: TK.bgPanel }}>
                      <div className="text-[15px] font-medium" style={{ color: TK.text }}>
                        Connect data or import content
                      </div>
                      <div className="text-sm" style={{ color: TK.textMuted }}>
                        No projects match the current filters.
                      </div>
                      <div className="mt-1 inline-flex items-center gap-2">
                        <button className="rounded-md px-3 py-2 text-sm text-white" style={{ background: TK.brand, cursor: "pointer" }}>
                          Connect Sources
                        </button>
                        <button className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: TK.border, cursor: "pointer" }}>
                          Import Content
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Filters Row (chips) ───────────────────────────── */
function FiltersRow(props: {
  owners: string[];
  ownerFilter: string;
  setOwnerFilter: (v: string) => void;
  aeoFilter: "all" | "green" | "yellow" | "red";
  setAeoFilter: (v: "all" | "green" | "yellow" | "red") => void;
  dupFilter: "all" | "high" | "medium+" | "low";
  setDupFilter: (v: "all" | "high" | "medium+" | "low") => void;
  updatedFilter: "all" | "24h" | "7d" | "14d" | "30d";
  setUpdatedFilter: (v: "all" | "24h" | "7d" | "14d" | "30d") => void;
}) {
  const {
    owners,
    ownerFilter,
    setOwnerFilter,
    aeoFilter,
    setAeoFilter,
    dupFilter,
    setDupFilter,
    updatedFilter,
    setUpdatedFilter,
  } = props;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChip
        icon={<Users size={14} style={{ color: TK.brand }} />}
        label="Owner"
        value={ownerFilter}
        onChange={setOwnerFilter}
        options={[{ label: "All", value: "all" as const }, ...owners.map((n) => ({ label: n, value: n as any }))]}
      />
      <FilterChip
        icon={<Columns3 size={14} style={{ color: TK.brand }} />}
        label="AEO Tier"
        value={aeoFilter}
        onChange={setAeoFilter}
        options={[
          { label: "All", value: "all" },
          { label: "Green", value: "green" },
          { label: "Yellow", value: "yellow" },
          { label: "Red", value: "red" },
        ]}
      />
      <FilterChip
        icon={<CheckCircle2 size={14} style={{ color: TK.brand }} />}
        label="Dup Risk"
        value={dupFilter}
        onChange={setDupFilter}
        options={[
          { label: "All", value: "all" },
          { label: "High only", value: "high" },
          { label: "Medium or higher", value: "medium+" },
          { label: "Low only", value: "low" },
        ]}
      />
      <FilterChip
        icon={<Clock size={14} style={{ color: TK.brand }} />}
        label="Updated"
        value={updatedFilter}
        onChange={setUpdatedFilter}
        options={[
          { label: "All time", value: "all" },
          { label: "Last 24h", value: "24h" },
          { label: "Last 7d", value: "7d" },
          { label: "Last 14d", value: "14d" },
          { label: "Last 30d", value: "30d" },
        ]}
      />
    </div>
  );
}

/* ───────────────────────────── Demo wrapper (default export) ───────────────────────────── */
export default function ContentProjectsSnapshotSection() {
  return (
    <div className="w-full mt-4">
      <ProjectsSnapshotTable
        demoFallback
        onCreateBrief={(id) => alert(`Create Brief → ${id}`)}
        onStartDraft={(id) => alert(`Start Draft → ${id}`)}
        onOpenPipeline={(id) => alert(`Open Pipeline → ${id}`)}
        onOpenApprovals={(id) => alert(`Open Approvals → ${id}`)}
        onOpenDetails={(id) => alert(`Open project drawer → ${id}`)}
      />
    </div>
  );
}
