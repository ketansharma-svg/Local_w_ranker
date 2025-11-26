"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Filter,
  Search,
  X,
  TriangleAlert,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ListFilter,
  FileDown,
  CheckCircle2,
  Eye,
  ClipboardList,
  FileSpreadsheet,
  Globe,
} from "lucide-react";

/** ───────────────── Tokens ───────────────── */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  pastel: "#D9EEF8",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  critical: "#EF4444",
  warning: "#F59E0B",
  good: "#10B981",
  rowHover: "#F8FAFC",
  radius: "12px",
};

const WR_FONT: React.CSSProperties = {
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/** ───────────────── Utils ───────────────── */
const formatPct = (n: number) => `${Math.round(n)}%`;
const formatNum = (n: number) => n.toLocaleString();
const lastSeenFmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function csvEscape(str: any) {
  const s = String(str ?? "");
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return '"' + s.replaceAll('"', '""') + '"';
  }
  return s;
}

function toCSV(rows: any[]) {
  const header = [
    "domain",
    "linkCount",
    "doFollowCount",
    "noFollowCount",
    "doFollowPct",
    "topAnchors",
    "lastSeen",
    "highRisk",
  ];
  const lines = [header.join(",")];
  rows.forEach((r) => {
    const cols = [
      csvEscape(r.domain),
      r.linkCount,
      r.doFollowCount,
      r.noFollowCount,
      Math.round(r.doFollowPct),
      csvEscape(r.topAnchors.map((a: any) => `${a.text}(${a.count})`).join(" | ")),
      r.lastSeen,
      r.flags?.highRisk ? "true" : "false",
    ];
    lines.push(cols.join(","));
  });
  return lines.join("\n");
}

/** ───────────────── Mock data ───────────────── */
function makeMockRow(i: number, opts: any = {}) {
  const linkCount = Math.floor(Math.random() * 800) + 30;
  const doPct = Math.min(100, Math.max(0, Math.round(40 + Math.random() * 70)));
  const doFollowCount = Math.round((doPct / 100) * linkCount);
  const noFollowCount = linkCount - doFollowCount;
  const anchors = [
    { text: "click here", count: Math.floor(Math.random() * 120) + 5 },
    { text: "learn more", count: Math.floor(Math.random() * 80) + 3 },
    { text: "visit site", count: Math.floor(Math.random() * 40) + 1 },
  ].sort((a, b) => b.count - a.count);
  const highRisk = doPct > 80 || Math.random() < 0.15;
  return {
    domain: opts.domain ?? `example-${i}.com`,
    linkCount,
    doFollowCount,
    noFollowCount,
    doFollowPct: doPct,
    topAnchors: anchors.slice(0, 3),
    lastSeen: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
    flags: { highRisk, genericAnchor: Math.random() < 0.3 },
  };
}
const MOCK_DATA = Array.from({ length: 28 }).map((_, i) => makeMockRow(i + 1));

/** ───────────────── Primitives ───────────────── */
function Chip({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border ${className}`}
      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg, color: TOKENS.text }}
    >
      {children}
    </span>
  );
}

/** Cell-scoped tooltip (fixes row-level hover issue) */
function CellTooltip({
  label,
  children,
  align = "center",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  const posStyle =
    align === "left"
      ? { left: 0, transform: "translateY(6px)" }
      : align === "right"
      ? { right: 0, transform: "translateY(6px)" }
      : { left: "50%", transform: "translate(-50%, 6px)" };
  return (
    <span className="relative inline-block">
      <span className="peer inline-flex">{children}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full z-50 max-w-[260px] rounded-md border bg-white px-2 py-1 text-xs opacity-0 shadow transition-opacity peer-hover:opacity-100"
        style={{ ...posStyle, borderColor: TOKENS.border, color: TOKENS.text }}
      >
        {label}
      </span>
    </span>
  );
}

/** Horizontal percent bar for DoFollow% */
function PercentBar({ pct, ariaLabel }: { pct: number; ariaLabel: string }) {
  const tone = pct > 80 ? TOKENS.critical : pct > 60 ? TOKENS.warning : TOKENS.good;
  return (
    <div className="w-full" aria-label={ariaLabel}>
      <div className="h-2 w-full rounded-full" style={{ background: TOKENS.border }} />
      <div className="-mt-2 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tone }} />
      <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
        {formatPct(pct)}
      </div>
    </div>
  );
}

/** Drawer Shell */
function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} style={WR_FONT}>
      {/* overlay */}
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      {/* panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-[1200px] transform bg-white shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderLeft: `1px solid ${TOKENS.border}` }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header (brand icon + title + export) */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5"
          style={{ height: 64, borderColor: TOKENS.border }}
        >
          <div className="min-w-0 py-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" style={{ color: TOKENS.brand }} />
              <h2 className="truncate text-lg font-semibold" style={{ color: TOKENS.text }}>
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-sm" style={{ color: TOKENS.muted }}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-[#F5F7FA] cursor-pointer"
              style={{ borderColor: TOKENS.border, color: TOKENS.text }}
              onClick={(e) =>
                document.getElementById("wr-export-visible")?.dispatchEvent(new Event("click", { bubbles: true }))
              }
              aria-label="Export (CSV)"
              title="Export visible (CSV)"
            >
              <Download size={16} /> Export
            </button>
            <button
              aria-label="Close drawer"
              onClick={onClose}
              className="rounded-md p-2 hover:bg-gray-50 cursor-pointer"
              style={{ color: TOKENS.text }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="h-[calc(100%-64px)] overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

/** ───────────────── Main Component ───────────────── */
export default function TopLinkedDomainsDrawerDemo({ initialHighRiskOnly = false }: { initialHighRiskOnly?: boolean } = {}) {
  const [open, setOpen] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [showDoFollowOnly, setShowDoFollowOnly] = useState(false);
  const [minLinks, setMinLinks] = useState(0);
  const [sortBy, setSortBy] = useState<"linkCount" | "dofPct" | "alpha">("linkCount");
  const [highRiskOnly, setHighRiskOnly] = useState(initialHighRiskOnly);

  // Selection / expansion
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Data
  const rows = useMemo(() => MOCK_DATA, []);

  const filtered = useMemo(() => {
    let r = rows.slice();
    if (highRiskOnly) r = r.filter((x) => x.flags?.highRisk || x.doFollowPct > 80);
    if (showDoFollowOnly) r = r.filter((x) => x.doFollowCount > 0);
    if (minLinks > 0) r = r.filter((x) => x.linkCount >= minLinks);
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((x) => x.domain.toLowerCase().includes(q));
    }
    r.sort((a, b) => {
      if (sortBy === "alpha") return a.domain.localeCompare(b.domain);
      if (sortBy === "dofPct") return b.doFollowPct - a.doFollowPct;
      return b.linkCount - a.linkCount;
    });
    return r;
  }, [rows, highRiskOnly, showDoFollowOnly, minLinks, query, sortBy]);

  // Debounced search
  const [searchDraft, setSearchDraft] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchDraft), 300);
    return () => clearTimeout(id);
  }, [searchDraft]);

  // Selection helpers
  const toggleSelectAllVisible = () => {
    const next = new Set(selected);
    const ids = filtered.map((r) => r.domain);
    const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  };

  // Export trigger
  const exportRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!exportRef.current) return;
    const handler = () => {
      const scope =
        Array.from(selected).length > 0 ? filtered.filter((r) => selected.has(r.domain)) : filtered;
      const csv = toCSV(scope);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = `top-linked-domains-${new Date().toISOString().slice(0, 10)}.csv`;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    };
    const el = exportRef.current;
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [filtered, selected]);

  const title = "Top Linked Domains";
  const subtitle = "Review domains receiving the most outbound links from your site.";

  return (
    <div className="p-4 md:p-6" style={WR_FONT}>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border px-3 py-2 text-sm hover:bg-[#F5F7FA] cursor-pointer"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
      >
        Open Top Linked Domains Drawer
      </button>

      {/* hidden export trigger */}
      <button id="wr-export-visible" ref={exportRef} className="hidden" />

      <DrawerShell open={open} onClose={() => setOpen(false)} title={title} subtitle={subtitle}>
        {/* Filters bar (same pattern as recent sections) */}
        <div
          className="mb-4 rounded-md border bg-white p-3"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div
              className="flex items-center gap-2 rounded-md border px-3 py-2"
              style={{ borderColor: TOKENS.border }}
            >
              <Search size={16} className="shrink-0" color={TOKENS.muted} />
              <input
                aria-label="Search domains"
                placeholder="Search domains (e.g., example.com)"
                className="w-[240px] border-0 outline-none placeholder:text-gray-400"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
            </div>

            {/* DoFollow only */}
            <button
              onClick={() => setShowDoFollowOnly((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer ${
                showDoFollowOnly ? "ring-1 ring-[#D9EEF8]" : ""
              }`}
              style={{ borderColor: TOKENS.border }}
              aria-pressed={showDoFollowOnly}
            >
              <CheckCircle2 size={16} color={showDoFollowOnly ? TOKENS.valueBlue : TOKENS.muted} />
              DoFollow only
            </button>

            {/* High-Risk only */}
            <button
              onClick={() => setHighRiskOnly((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer ${
                highRiskOnly ? "ring-1 ring-[#FED7D7]" : ""
              }`}
              style={{ borderColor: TOKENS.border }}
              aria-pressed={highRiskOnly}
            >
              <TriangleAlert size={16} color={highRiskOnly ? TOKENS.critical : TOKENS.muted} />
              High‑Risk only
            </button>

            {/* Min links slider */}
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              style={{ borderColor: TOKENS.border }}
            >
              <ListFilter size={16} color={TOKENS.muted} />
              <span>Min links:</span>
              <input
                type="range"
                aria-label="Minimum links threshold"
                min={0}
                max={800}
                step={10}
                value={minLinks}
                onChange={(e) => setMinLinks(parseInt(e.target.value))}
              />
              <span className="w-10 text-right tabular-nums">{minLinks}</span>
            </div>

            {/* Sort */}
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              style={{ borderColor: TOKENS.border }}
            >
              <Filter size={16} color={TOKENS.muted} />
              <label className="text-sm">Sort by</label>
              <select
                className="rounded-md border px-2 py-1 text-sm cursor-pointer"
                style={{ borderColor: TOKENS.border }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="linkCount">Link Count (desc)</option>
                <option value="dofPct">DoFollow % (desc)</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>

            {/* Clear */}
            <button
              onClick={() => {
                setShowDoFollowOnly(false);
                setHighRiskOnly(false);
                setMinLinks(0);
                setSortBy("linkCount");
                setSearchDraft("");
              }}
              className="ml-auto rounded-full border px-3 py-1.5 text-sm hover:bg-[#F5F7FA] cursor-pointer"
              style={{ borderColor: TOKENS.border }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk bar — only when any row is selected (just above table header) */}
        {selected.size > 0 && (
          <div
            className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
            style={{ borderColor: TOKENS.border }}
          >
            <div className="text-sm" style={{ color: TOKENS.text }}>
              <span className="font-semibold tabular-nums">{selected.size}</span> selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-[#F5F7FA] cursor-pointer"
                style={{ borderColor: TOKENS.border }}
                onClick={toggleSelectAllVisible}
                title="Toggle select all visible"
              >
                <FileSpreadsheet size={16} /> Select / Deselect visible
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-[#F5F7FA] cursor-pointer"
                style={{ borderColor: TOKENS.border }}
                onClick={() => alert(`Create Task for ${selected.size} domain(s)`)}
                title="Create task"
              >
                <ClipboardList size={16} /> Create Task
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-[#F5F7FA] cursor-pointer"
                style={{ borderColor: TOKENS.border }}
                onClick={() => {
                  const scope = filtered.filter((r) => selected.has(r.domain));
                  const csv = toCSV(scope);
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `selected-domains-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                title="Export selected"
              >
                <FileDown size={16} /> Export Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: TOKENS.border }}>
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-[13px]" style={{ color: TOKENS.muted }}>
                <th className="w-10 border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  <input
                    type="checkbox"
                    aria-label="Select all visible"
                    checked={filtered.length > 0 && filtered.every((r) => selected.has(r.domain))}
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                <th className="w-8 border-b px-2 py-2" style={{ borderColor: TOKENS.border }} />
                <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  Domain
                </th>
                <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  # of Links
                </th>
                <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  DoFollow %
                </th>
                <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  Top Anchors
                </th>
                <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  Last Used
                </th>
                <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => {
                const isSel = selected.has(row.domain);
                const isExp = !!expanded[row.domain];
                const aria = `${row.domain} — ${row.linkCount} links, ${Math.round(row.doFollowPct)}% DoFollow${
                  row.flags?.highRisk ? " (High Risk)" : ""
                }`;

                return (
                  <React.Fragment key={row.domain}>
                    <tr
                      tabIndex={0}
                      className="cursor-default align-top hover:bg-[#F5F7FA]"
                      style={{ outline: 0 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setExpanded((m) => ({ ...m, [row.domain]: !m[row.domain] }));
                      }}
                    >
                      <td className="border-b px-3 py-2 align-middle" style={{ borderColor: TOKENS.border }}>
                        <input
                          aria-label={`Select ${row.domain}`}
                          type="checkbox"
                          checked={isSel}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(row.domain);
                            else next.delete(row.domain);
                            setSelected(next);
                          }}
                        />
                      </td>

                      {/* expander */}
                      <td className="border-b px-2 py-2 align-middle" style={{ borderColor: TOKENS.border }}>
                        <button
                          className="rounded p-1 hover:bg-gray-100 cursor-pointer"
                          aria-label={isExp ? `Collapse ${row.domain}` : `Expand ${row.domain}`}
                          onClick={() => setExpanded((m) => ({ ...m, [row.domain]: !m[row.domain] }))}
                          aria-expanded={isExp}
                          aria-controls={`exp-${row.domain}`}
                        >
                          {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>

                      {/* domain */}
                      <td className="border-b px-3 py-3" style={{ borderColor: TOKENS.border }}>
                        <div className="flex items-center gap-2">
                          <button
                            title="Filter External Links table by this domain"
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50 cursor-pointer"
                            onClick={() => alert(`Filter External Links Table by ${row.domain}`)}
                            style={{ color: TOKENS.valueBlue }}
                          >
                            <ExternalLink size={14} /> {row.domain}
                          </button>
                          {(row.flags?.highRisk || row.doFollowPct > 80) && (
                            <span
                              className="ml-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]"
                              style={{ borderColor: TOKENS.border, color: TOKENS.critical, background: TOKENS.pastel }}
                              title="High risk: unusually high DoFollow ratio or flagged domain"
                            >
                              <TriangleAlert size={12} /> High Risk
                            </span>
                          )}
                        </div>
                      </td>

                      {/* link count */}
                      <td className="border-b px-3 py-3 tabular-nums" style={{ borderColor: TOKENS.border }}>
                        {formatNum(row.linkCount)}
                      </td>

                      {/* DoFollow % — Tooltip only for this cell */}
                      <td className="border-b px-3 py-3" style={{ borderColor: TOKENS.border }}>
                        <CellTooltip
                          align="left"
                          label={
                            <span className="inline-flex items-center gap-2">
                              <span className="tabular-nums">{row.doFollowCount}</span> DoFollow •{" "}
                              <span className="tabular-nums">{row.noFollowCount}</span> NoFollow
                            </span>
                          }
                        >
                          <PercentBar pct={row.doFollowPct} ariaLabel={aria} />
                        </CellTooltip>
                      </td>

                      {/* Top Anchors — per-chip tooltips only */}
                      <td className="border-b px-3 py-3" style={{ borderColor: TOKENS.border }}>
                        <div className="flex flex-wrap gap-2">
                          {row.topAnchors.slice(0, 3).map((a, i) => (
                            <CellTooltip key={i} align="left" label={`"${a.text}" • ${a.count} links`}>
                              <Chip title={`${a.text} (${a.count})`}>
                                {a.text}
                                <span className="ml-1 text-[11px] tabular-nums" style={{ color: TOKENS.muted }}>
                                  ×{a.count}
                                </span>
                              </Chip>
                            </CellTooltip>
                          ))}
                        </div>
                      </td>

                      {/* last used */}
                      <td className="border-b px-3 py-3" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                        {lastSeenFmt(row.lastSeen)}
                      </td>

                      {/* actions (brand icons, pointer on hover) */}
                      <td className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-[#F5F7FA] cursor-pointer"
                            style={{ borderColor: TOKENS.border, color: TOKENS.valueBlue }}
                            onClick={() => alert(`View links for ${row.domain}`)}
                            title="View links"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-[#F5F7FA] cursor-pointer"
                            style={{ borderColor: TOKENS.border }}
                            onClick={() => alert(`Create Task for ${row.domain}`)}
                            title="Create task"
                          >
                            <ClipboardList size={14} /> Task
                          </button>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-[#F5F7FA] cursor-pointer"
                            style={{ borderColor: TOKENS.border }}
                            onClick={() => alert(`Export links for ${row.domain}`)}
                            title="Export domain links"
                          >
                            <FileDown size={14} /> Export
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row (details) */}
                    {isExp && (
                      <tr id={`exp-${row.domain}`}>
                        <td colSpan={8} className="bg-white px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-lg border p-3" style={{ borderColor: TOKENS.border }}>
                              <h4 className="mb-2 text-sm font-semibold" style={{ color: TOKENS.text }}>
                                Domain Summary
                              </h4>
                              <ul className="space-y-1 text-sm" style={{ color: TOKENS.muted }}>
                                <li>
                                  Total links: <span className="font-medium text-black">{formatNum(row.linkCount)}</span>
                                </li>
                                <li>
                                  DoFollow: <span className="tabular-nums">{row.doFollowCount}</span>
                                </li>
                                <li>
                                  NoFollow: <span className="tabular-nums">{row.noFollowCount}</span>
                                </li>
                                <li>
                                  Unique anchors: <span className="tabular-nums">{row.topAnchors.length}</span>
                                </li>
                              </ul>
                            </div>

                            <div className="rounded-lg border p-3" style={{ borderColor: TOKENS.border }}>
                              <h4 className="mb-2 text-sm font-semibold" style={{ color: TOKENS.text }}>
                                Top Anchors
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {row.topAnchors.map((a, i) => (
                                  <Chip key={i}>
                                    {a.text}
                                    <span className="ml-1 text-[11px] tabular-nums" style={{ color: TOKENS.muted }}>
                                      ×{a.count}
                                    </span>
                                  </Chip>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-lg border p-3" style={{ borderColor: TOKENS.border }}>
                              <h4 className="mb-2 text-sm font-semibold" style={{ color: TOKENS.text }}>
                                Quick Actions
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#F5F7FA] cursor-pointer"
                                  style={{ borderColor: TOKENS.border }}
                                  onClick={() => alert(`Prefill Replace Link Drawer for ${row.domain}`)}
                                >
                                  Replace Link
                                </button>
                                <button
                                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-[#F5F7FA] cursor-pointer"
                                  style={{ borderColor: TOKENS.border }}
                                  onClick={() => alert(`Create Task for ${row.domain}`)}
                                >
                                  Create Task
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Sample instances */}
                          <div className="mt-4 overflow-hidden rounded-lg border" style={{ borderColor: TOKENS.border }}>
                            <div
                              className="flex items-center justify-between border-b px-3 py-2"
                              style={{ borderColor: TOKENS.border }}
                            >
                              <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
                                Sample Instances
                              </div>
                              <button
                                className="rounded px-2 py-1 text-sm hover:bg-[#F5F7FA] cursor-pointer"
                                onClick={() => alert("Open all target pages")}
                              >
                                Check All Target Pages
                              </button>
                            </div>
                            <table className="w-full border-separate border-spacing-0 text-sm">
                              <thead>
                                <tr className="text-left" style={{ color: TOKENS.muted }}>
                                  <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                                    Source Page
                                  </th>
                                  <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                                    Anchor
                                  </th>
                                  <th className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                                    URL
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <tr key={i} className="hover:bg-[#F5F7FA]">
                                    <td className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                                      /<span className="text-gray-500">page-{i + 1}</span>
                                    </td>
                                    <td className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                                      <Chip>{row.topAnchors[i % row.topAnchors.length].text}</Chip>
                                    </td>
                                    <td className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                                      <a
                                        href="#"
                                        className="text-sm hover:underline cursor-pointer"
                                        style={{ color: TOKENS.valueBlue }}
                                      >
                                        https://{row.domain}/target-{i + 1}
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center" style={{ color: TOKENS.muted }}>
                    No domains match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="mt-4 text-sm" style={{ color: TOKENS.muted }}>
          Showing <span className="tabular-nums">{filtered.length}</span> domain(s)
        </div>
      </DrawerShell>
    </div>
  );
}
