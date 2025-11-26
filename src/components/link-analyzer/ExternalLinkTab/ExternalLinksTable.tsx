"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link2,
  Search,
  Filter,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Copy,
  ClipboardList,
  Ban,
  ArrowUpRight,
  Image as ImageIcon,
  Type as TypeIcon,
  BadgeCheck,
  List,
  Globe,
} from "lucide-react";
import TopLinkedDomainsDrawerDemo from "./TopLinkedDomainsDrawerDemo";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/* ───────────────────────── Tokens & small utils ───────────────────────── */

const TK = {
  brand: "#008CCD",
  actionBlue: "#0077FF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  surface: "#FFFFFF",
  appBg: "#F5F7FA",
  success: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
  radius: 8,
} as const;

const WR_FONT: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

function cn(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

const downloadText = (name: string, text: string, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([text], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

/* ───────────────────────── Types ───────────────────────── */
export type Row = {
  id: string;
  anchor: string; // anchor text or "[Image]"
  anchorType: "exact" | "branded" | "generic" | "image";
  targetDomain: string;
  targetUrl: string;
  linkType: "dofollow" | "nofollow" | "sponsored" | "ugc";
  sourceCount: number;
  lastFound: string; // ISO
  flags: { disavowRecommended: boolean; overlinked: boolean };
};

type Props = {
  rows?: Row[];
  loading?: boolean;
  error?: string | null;
};

/* ───────────────────────── Anchor/Link-type visuals (branded) ───────────────────────── */

function AnchorTypeBadge({ t }: { t: Row["anchorType"] }) {
  const icon =
    t === "image" ? (
      <ImageIcon size={14} />
    ) : t === "branded" ? (
      <BadgeCheck size={14} />
    ) : t === "generic" ? (
      <List size={14} />
    ) : (
      <TypeIcon size={14} />
    );
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ borderColor: TK.border, color: TK.text }}
    >
      <span style={{ color: TK.brand }}>{icon}</span>
      {t}
    </span>
  );
}

function LinkTypePill({ t }: { t: Row["linkType"] }) {
  const tone =
    t === "dofollow"
      ? { bg: "#ECFDF5", fg: "#10B981", bd: "#D1FAE5" }
      : t === "nofollow"
      ? { bg: "#F5F7FA", fg: "#6B7280", bd: "#EFF0F6" }
      : t === "sponsored"
      ? { bg: "#FFF7ED", fg: "#F59E0B", bd: "#FFEDD5" }
      : { bg: "#EEF2FF", fg: "#6366F1", bd: "#E0E7FF" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: tone.bg, color: tone.fg, borderColor: tone.bd }}
    >
      <Link2 size={14} />
      {t}
    </span>
  );
}

/* ───────────────────────── Main Section ───────────────────────── */

export default function ExternalLinksTable({ rows = [], loading, error }: Props) {
  // Base data (controlled by props; default empty)
  const [baseRows, setBaseRows] = useState<Row[]>(rows);
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();
  const projectId = selectedProject?.id ?? null;
  const handleCreateTask = useCallback(
    (row: Row) => {
      const title = row.anchor?.trim() ? row.anchor : row.targetDomain;
      openTaskDrawer({
        title,
        description: `Review external link at ${row.targetUrl} from domain ${row.targetDomain}.`,
        projectId,
        type: "createNew",
      });
    },
    [openTaskDrawer, projectId],
  );

  useEffect(() => {
    setBaseRows(rows || []);
  }, [rows]);

  // Filters
  const [fAnchorTypes, setFAnchorTypes] = useState<Set<Row["anchorType"]>>(new Set());
  const [fLinkTypes, setFLinkTypes] = useState<Set<Row["linkType"]>>(new Set());
  const [qDomain, setQDomain] = useState("");
  const [qAnchor, setQAnchor] = useState("");
  const [minPages, setMinPages] = useState(0);
  const [trustedOnly, setTrustedOnly] = useState(false);

  // Listen to Smart Suggestions → “wr:external-links:applyFilters”
  useEffect(() => {
    function onApply(e: Event) {
      const detail = (e as CustomEvent).detail || {};
      if (detail.domain) setQDomain(String(detail.domain));
      if (detail.anchor) setQAnchor(String(detail.anchor));
      // If suggestion wants only high-risk etc., you can wire additional flags here
    }
    window.addEventListener("wr:external-links:applyFilters", onApply as any);
    return () => window.removeEventListener("wr:external-links:applyFilters", onApply as any);
  }, []);

  // Sorting
  const [sort, setSort] = useState<{ key: "anchor" | "targetDomain" | "sourceCount" | "lastFound"; dir: "asc" | "desc" }>(
    { key: "lastFound", dir: "desc" }
  );

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const toggleSet = <T,>(setFn: (s: Set<T>) => void, cur: Set<T>, v: T) => {
    const next = new Set(cur);
    next.has(v) ? next.delete(v) : next.add(v);
    setFn(next);
    setPage(1);
  };

  // Derived active chips
  const activeChips: Array<{ label: string; onRemove: () => void }> = [];
  fAnchorTypes.forEach((v) =>
    activeChips.push({
      label: `Anchor: ${v}`,
      onRemove: () => {
        const nx = new Set(fAnchorTypes);
        nx.delete(v);
        setFAnchorTypes(nx);
        setPage(1);
      },
    })
  );
  fLinkTypes.forEach((v) =>
    activeChips.push({
      label: `Type: ${v}`,
      onRemove: () => {
        const nx = new Set(fLinkTypes);
        nx.delete(v);
        setFLinkTypes(nx);
        setPage(1);
      },
    })
  );
  if (qDomain)
    activeChips.push({
      label: `Domain: ${qDomain}`,
      onRemove: () => {
        setQDomain("");
        setPage(1);
      },
    });
  if (qAnchor)
    activeChips.push({
      label: `Anchor contains: ${qAnchor}`,
      onRemove: () => {
        setQAnchor("");
        setPage(1);
      },
    });
  if (minPages > 0)
    activeChips.push({
      label: `Used on ≥ ${minPages} pages`,
      onRemove: () => {
        setMinPages(0);
        setPage(1);
      },
    });
  if (trustedOnly)
    activeChips.push({
      label: "Trusted domains only",
      onRemove: () => setTrustedOnly(false),
    });

  // Filter → sort → paginate
  const filtered = useMemo(() => {
    return baseRows.filter((r) => {
      if (fAnchorTypes.size && !fAnchorTypes.has(r.anchorType)) return false;
      if (fLinkTypes.size && !fLinkTypes.has(r.linkType)) return false;
      if (qDomain && !r.targetDomain.toLowerCase().includes(qDomain.toLowerCase())) return false;
      if (qAnchor && !r.anchor.toLowerCase().includes(qAnchor.toLowerCase())) return false;
      if (minPages && r.sourceCount < minPages) return false;
      if (trustedOnly) {
        const trusted = ["partner.io", "docs.example.com"];
        if (!trusted.includes(r.targetDomain)) return false;
      }
      return true;
    });
  }, [baseRows, fAnchorTypes, fLinkTypes, qDomain, qAnchor, minPages, trustedOnly]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sort.key === "anchor" || sort.key === "targetDomain") {
        return a[sort.key].localeCompare(b[sort.key]) * dir;
      }
      if (sort.key === "sourceCount") return (a.sourceCount - b.sourceCount) * dir;
      return (new Date(a.lastFound).getTime() - new Date(b.lastFound).getTime()) * dir;
    });
    return copy;
  }, [filtered, sort]);

  useEffect(() => setPage(1), [pageSize]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  // selection
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);
  const someOnPage = pageRows.some((r) => selected[r.id]) && !allOnPage;
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someOnPage;
  }, [someOnPage]);

  const toggleSelectPage = (on: boolean) => {
    const next = { ...selected };
    pageRows.forEach((r) => (next[r.id] = on));
    setSelected(next);
  };

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  // Export CSV (selected → filtered)
  const exportCSV = () => {
    const dataset = selectedIds.length ? sorted.filter((r) => selected[r.id]) : sorted;
    const cols = [
      "id",
      "anchor",
      "anchorType",
      "targetDomain",
      "targetUrl",
      "linkType",
      "sourceCount",
      "lastFound",
    ] as const;
    const header = cols.join(",");
    const lines = dataset.map((r) => cols.map((k) => JSON.stringify((r as any)[k] ?? "")).join(",")).join("\n");
    downloadText("external-links.csv", `${header}\n${lines}`);
  };

  const SortHeader = ({ label, col }: { label: string; col: typeof sort.key }) => (
    <button
      className="group inline-flex items-center gap-1 text-left"
      aria-label={`Sort by ${label}`}
      onClick={() =>
        setSort((prev) => ({
          key: col,
          dir: prev.key === col && prev.dir === "asc" ? "desc" : "asc",
        }))
      }
    >
      <span className="text-xs font-semibold text-[#6B7280] group-hover:text-[#111827]">
        {label}
      </span>
      <ChevronUp
        className={cn(
          "h-3.5 w-3.5 transition",
          sort.key === col && sort.dir === "asc" ? "rotate-0" : "rotate-180 opacity-60"
        )}
      />
    </button>
  );

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => setDrawerRow(true);
  const closeDrawer = () => setDrawerRow(false);


const ACTION_POLICY = {
  openSource: { type: "client" as const, label: "View in source page" },
  createTask: { type: "client" as const, label: "Create Task" },
  disavowReview: { type: "userAction" as const, label: "Disavow Review" }, // user must handle in GSC → make a task
  copyUrl: { type: "client" as const, label: "Copy target URL" },

  // Example for any future action we don't support via API:
  // removeExternalLink: { type: "notInApi" as const, label: "Remove external link" },
};

function disabledProps(disabled: boolean) {
  return {
    disabled,
    className: `p-1.5 rounded border hover:bg-gray-50 ${
      disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : ""
    }`,
    style: { borderColor: TK.border, color: TK.brand },
  };
}


  return (
    <section className="p-4" style={{ background: TK.appBg, ...WR_FONT }}>
      {drawerRow && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/20" onClick={closeDrawer} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={closeDrawer}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <TopLinkedDomainsDrawerDemo />
          </aside>
        </div>
      )}

      <div className="w-full mx-auto">
        {/* Section header */}
        <div
          className="bg-white border rounded-t-md px-3 py-3 flex items-center justify-between"
          style={{ borderColor: TK.border }}
        >
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5" style={{ color: TK.brand }} aria-hidden />
            <h3 className="m-0 text-[16px] font-medium" style={{ color: TK.text }}>
              External Links — Distribution Table
            </h3>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.border }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>

        {/* Loading / Error states just below header */}
        {loading && (
          <div className="bg-white border-x border-b px-3 py-3 text-sm" style={{ borderColor: TK.border, color: TK.muted }}>
            Loading external links…
          </div>
        )}
        {error && !loading && (
          <div className="bg-white border-x border-b px-3 py-3 text-sm" style={{ borderColor: TK.border, color: "#B91C1C" }}>
            {error}
          </div>
        )}

        {/* Filters bar */}
        <div className="bg-white border-b" style={{ borderColor: TK.border }}>
          <div className="px-3 py-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#6B7280] inline-flex items-center gap-1">
              <Filter className="w-4 h-4" /> Filters
            </span>

            {(["exact", "branded", "generic", "image"] as Row["anchorType"][]).map((t) => (
              <button
                key={t}
                aria-label={`Filter anchor ${t}`}
                aria-pressed={fAnchorTypes.has(t)}
                onClick={() => toggleSet(setFAnchorTypes, fAnchorTypes, t)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-sm select-none transition",
                  fAnchorTypes.has(t)
                    ? "bg-[#D9EEF8] text-[#0b5f7e] border-[#BFE3F2] ring-2 ring-[#D9EEF8]"
                    : "bg-white text-[#111827] border-[#EFF0F6] hover:bg-[#F5F7FA]"
                )}
              >
                <AnchorTypeBadge t={t} />
              </button>
            ))}

            <div className="mx-1 h-6 w-px bg-[#EFF0F6]" />

            {(["dofollow", "nofollow", "sponsored", "ugc"] as Row["linkType"][]).map((t) => (
              <button
                key={t}
                aria-label={`Filter link type ${t}`}
                aria-pressed={fLinkTypes.has(t)}
                onClick={() => toggleSet(setFLinkTypes, fLinkTypes, t)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-sm select-none transition",
                  fLinkTypes.has(t)
                    ? "bg-[#D9EEF8] text-[#0b5f7e] border-[#BFE3F2] ring-2 ring-[#D9EEF8]"
                    : "bg-white text-[#111827] border-[#EFF0F6] hover:bg-[#F5F7FA]"
                )}
              >
                <span className="inline-flex items-center gap-1">
                  <span style={{ color: TK.brand }}>
                    <Link2 size={14} />
                  </span>
                  {t}
                </span>
              </button>
            ))}

            <div className="relative ml-1">
              <input
                value={qDomain}
                onChange={(e) => {
                  setQDomain(e.target.value);
                  setPage(1);
                }}
                placeholder="Search domain…"
                className="h-8 pl-8 pr-3 rounded border text-sm"
                style={{ borderColor: TK.border }}
              />
              <Globe className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>

            <div className="relative">
              <input
                value={qAnchor}
                onChange={(e) => {
                  setQAnchor(e.target.value);
                  setPage(1);
                }}
                placeholder="Search anchor text…"
                className="h-8 pl-8 pr-3 rounded border text-sm"
                style={{ borderColor: TK.border }}
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6B7280]">Used on pages ≥</span>
              <input
                type="number"
                min={0}
                value={minPages}
                onChange={(e) => {
                  setMinPages(Number(e.target.value) || 0);
                  setPage(1);
                }}
                className="h-8 w-20 rounded border text-sm px-2"
                style={{ borderColor: TK.border }}
              />
            </div>

            <button
              type="button"
              onClick={() => setTrustedOnly((v) => !v)}
              className={cn(
                "h-8 px-3 rounded border text-sm",
                trustedOnly ? "bg-[#D9EEF8] text-[#0b5f7e]" : "bg-white hover:bg-[#F7FAFC]"
              )}
              style={{ borderColor: TK.border }}
            >
              Trusted only
            </button>

            <button
              type="button"
              className="ml-auto h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.border }}
            >
              <Calendar className="w-4 h-4" /> Last Found
            </button>
          </div>

          <div className="px-3 pb-3 flex flex-wrap items-center gap-2">
            {activeChips.length === 0 ? (
              <span className="text-xs text-[#9CA3AF]">No active filters</span>
            ) : (
              activeChips.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F5F7FA] px-3 py-1 text-[12px]"
                >
                  {c.label}
                  <button
                    className="text-[#6B7280] hover:text-[#111827]"
                    aria-label={`Remove ${c.label}`}
                    onClick={c.onRemove}
                  >
                    ✕
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Bulk bar */}
        {selectedIds.length > 0 && (
          <div
            className="bg-white border-b px-3 py-2 flex flex-wrap items-center justify-between gap-2"
            style={{ borderColor: TK.border }}
          >
            <div className="text-sm">
              <strong>{selectedIds.length}</strong> selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-2.5 h-8 rounded border text-sm hover:bg-gray-50"
                style={{ borderColor: TK.border }}
                onClick={() => {
                  const patch: Record<string, boolean> = {};
                  sorted.forEach((r) => (patch[r.id] = true));
                  setSelected((s) => ({ ...s, ...patch }));
                }}
              >
                Select all matching
              </button>
              <button
                type="button"
                className="px-2.5 h-8 rounded border text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                style={{ borderColor: TK.border }}
                onClick={() => alert(`Create task for ${selectedIds.length} link(s).`)}
              >
                <ClipboardList className="w-4 h-4" /> Create Task
              </button>
<button
  type="button"
  className="px-2.5 h-8 rounded border text-sm hover:bg-gray-50 inline-flex items-center gap-2"
  style={{ borderColor: TK.border }}
  onClick={() =>
    openTaskDrawer({
      title: ACTION_POLICY.disavowReview.label,
      description: `Evaluate and prepare disavow list for ${selectedIds.length} selected external link(s).`,
      projectId,
      type: "createNew",
    })
  }
>
  <Ban className="w-4 h-4" /> {ACTION_POLICY.disavowReview.label}
</button>

              <button
                type="button"
                className="px-2.5 h-8 rounded border text-sm hover:bg-gray-50 inline-flex items-center gap-2"
                style={{ borderColor: TK.border }}
                onClick={exportCSV}
              >
                <Download className="w-4 h-4" /> Export selected
              </button>
              <button
                type="button"
                className="px-2.5 h-8 rounded border text-sm hover:bg-gray-50"
                style={{ borderColor: TK.border }}
                onClick={() => setSelected({})}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border-b border-x" style={{ borderColor: TK.border }}>
          <div className="max-h-[60vh] overflow-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: TK.border }}>
                <tr className="text-left text-[12px] text-[#6B7280]">
                  <th className="w-12 px-3 py-2 sticky left-0 bg-white z-20">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={allOnPage}
                      onChange={(e) => toggleSelectPage(e.target.checked)}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-3 py-2 sticky left-12 bg-white z-10 min-w-[260px]">
                    <SortHeader label="Anchor Text" col="anchor" />
                  </th>
                  <th className="px-3 py-2 min-w-[200px]">
                    <SortHeader label="Target Domain" col="targetDomain" />
                  </th>
                  <th className="px-3 py-2 min-w-[300px]">Target URL</th>
                  <th className="px-3 py-2 min-w-[160px]">Link Type</th>
                  <th className="px-3 py-2 min-w-[160px]">
                    <SortHeader label="Source Pages" col="sourceCount" />
                  </th>
                  <th className="px-3 py-2 min-w-[160px]">
                    <SortHeader label="Last Found" col="lastFound" />
                  </th>
                  <th className="px-3 py-2 text-right min-w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className={cn("border-b hover:bg-[#F9FAFB]")} style={{ borderColor: TK.border }}>
                    <td className="px-3 py-2 sticky left-0 bg-white z-20">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.id}`}
                        checked={!!selected[r.id]}
                        onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                      />
                    </td>

                    <td className="px-3 py-2 sticky left-12 bg-white z-10">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-[#111827]">{r.anchor}</span>
                        <AnchorTypeBadge t={r.anchorType} />
                        <button
                          title="Copy anchor text"
                          onClick={() => navigator.clipboard.writeText(r.anchor)}
                          className="p-1.5 rounded border hover:bg-gray-50"
                          style={{ borderColor: TK.border, color: TK.brand }}
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <button
                        className="text-[color:var(--wr-action,#0077FF)] hover:underline cursor-pointer"
                        onClick={openDrawer}
                        aria-label={`Filter domain ${r.targetDomain}`}
                      >
                        {r.targetDomain}
                      </button>
                      {r.flags.overlinked && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] text-[#E94134]">
                          overlinked
                        </span>
                      )}
                    </td>

<td className="px-3 py-2 max-w-72">
  <a
    className="text-[color:var(--wr-action,#0077FF)] inline-flex items-center gap-1 hover:underline break-all whitespace-normal"
    href={r.targetUrl}
    target="_blank"
    rel="noreferrer"
  >
    <span className="break-all">{r.targetUrl}</span>
    <ArrowUpRight size={14} />
  </a>
</td>


                    <td className="px-3 py-2">
                      <LinkTypePill t={r.linkType} />
                    </td>

                    <td className="px-3 py-2">{r.sourceCount} pages</td>

                    <td className="px-3 py-2">{formatDate(r.lastFound)}</td>

<td className="px-3 py-2 text-right">
  <div className="inline-flex items-center gap-1.5">


    {/* Create Task (already a client action → keep) */}
    <button
      title={ACTION_POLICY.createTask.label}
      onClick={() => handleCreateTask(r)}
      {...disabledProps(false)}
    >
      <ClipboardList size={16} />
    </button>

    {/* Disavow Review (userAction → create a task with the button title) */}
    <button
      title={ACTION_POLICY.disavowReview.label}
      onClick={() =>
        openTaskDrawer({
          title: ACTION_POLICY.disavowReview.label,
          description: `Evaluate and prepare disavow list for ${r.targetDomain} → ${r.targetUrl}. Anchor: ${r.anchor}`,
          projectId,
          type: "createNew",
        })
      }
      {...disabledProps(false)}
    >
      <Ban size={16} />
    </button>

    {/* Copy URL (client action → enabled) */}
    <button
      title={ACTION_POLICY.copyUrl.label}
      onClick={() => navigator.clipboard.writeText(r.targetUrl)}
      {...disabledProps(false)}
    >
      <Copy size={16} />
    </button>

    {/*
      Example for a future not-in-API action:
      <button
        title={ACTION_POLICY.removeExternalLink.label}
        {...disabledProps(true)}
        onClick={() => {}}
      >
        <Trash2 size={16} />
      </button>
    */}
  </div>
</td>

                  </tr>
                ))}
                {!loading && !error && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[#6B7280]">
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div
          className="bg-white border border-t-0 rounded-b-md px-3 py-3 flex items-center justify-between text-sm"
          style={{ borderColor: TK.border }}
        >
          <div className="flex items-center gap-3">
            <div>
              Showing{" "}
              <span className="font-medium">
                {sorted.length ? (page - 1) * pageSize + 1 : 0}
              </span>
              –
              <span className="font-medium">
                {Math.min(page * pageSize, sorted.length)}
              </span>{" "}
              of <span className="font-medium">{sorted.length}</span>
            </div>
            <div className="flex items-center gap-1">
              {[10, 25, 50, 100].map((sz) => (
                <button
                  key={sz}
                  className={cn(
                    "px-2 h-7 rounded-full border text-xs",
                    pageSize === sz
                      ? "ring-2 ring-[#4286F5] border-[#4286F5] font-medium"
                      : "border-gray-200"
                  )}
                  onClick={() => {
                    setPageSize(sz);
                    setPage(1);
                  }}
                >
                  {sz}/pg
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 h-8 rounded border disabled:opacity-40"
              style={{ borderColor: TK.border }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              Page {page} / {pageCount}
            </div>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-2 h-8 rounded border disabled:opacity-40"
              style={{ borderColor: TK.border }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
