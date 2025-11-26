import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  Eye,
  ClipboardList,
  MoreHorizontal,
  Plus,
  Copy,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

/**
 * Wranker – Anchors Tab
 * Competitor Anchor Comparison Drawer (Non-sticky header + Non-sticky Filters)
 * Updates:
 *  - Inter + Inter Fallback fonts
 *  - KPI Cards placed inside the header (same bg as drawer) with subtle hover animation
 *  - Competitor dropdown shows favicon + name/domain
 *  - Branded icons in the table (use --wr-action)
 *  - Pointer cursor for all clickable elements
 */

// —— Tokens —— //
const Tokens = ({ children }: { children: React.ReactNode }) => (
  <div
    className="[--wr-action:#0077FF] [--wr-good:#10B981] [--wr-warning:#F59E0B] [--wr-critical:#EF4444] [--wr-text:#111827] [--wr-muted:#6B7280] [--wr-borderLight:#EFF0F6] [--wr-chip:#F5F7FA] text-[15px] leading-5 text-[color:var(--wr-text)]"
    style={{
      fontFamily:
        "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
    }}
  >
    {children}
  </div>
);

// —— Helpers —— //
const cls = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");
function aqsTone(gap?: number | null) {
  if (gap === null || gap === undefined) return "text-[color:var(--wr-muted)]";
  if (gap >= 10) return "text-[color:var(--wr-good)]";
  if (gap <= -10) return "text-[color:var(--wr-critical)]";
  return "text-[color:var(--wr-muted)]";
}
const pct = (n?: number | null) =>
  n === null || n === undefined ? null : Math.max(0, Math.min(100, Number(n)));
const humanOpp = (o?: string | null) =>
  o ? o.charAt(0).toUpperCase() + o.slice(1) : "";

function exportRows(rows: any[], format: "csv") {
  if (format !== "csv") {
    alert(`Demo supports CSV only (requested: ${format})`);
    return;
  }
  const headers = [
    "Anchor",
    "Type",
    "YourUsage",
    "CompetitorUsage",
    "UsageGap",
    "YourAQS",
    "CompetitorAQS",
    "AQSGap",
    "Opportunity",
  ];
  const lines = rows
    .map((r) =>
      [
        r.anchor,
        r.type || "",
        r.yourUsage ?? "",
        r.competitorUsage ?? "",
        Math.abs((r.yourUsage || 0) - (r.competitorUsage || 0)),
        r.yourAqs ?? "",
        r.competitorAqs ?? "",
        r.aqsGap ?? "",
        r.opportunity ?? "",
      ]
        .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v))
        .join(",")
    )
    .join("\n");
  const csv = [headers.join(","), ...lines.split("\n")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anchor-compare-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// —— UI Bits —— //
const Tooltip = ({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) => (
  <span className="relative inline-flex items-center group">
    {children}
    <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[120%] z-50 whitespace-nowrap rounded bg-black/80 text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100">
      {text}
    </span>
  </span>
);

// KPI card (animated on hover; same bg as drawer via var(--wr-drawer-bg))
const KPI = ({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
}) => (
  <motion.div
    whileHover={{ y: -2, scale: 1.01 }}
    transition={{ type: "tween", duration: 0.16 }}
    className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 cursor-pointer"
    style={{
      borderColor: "var(--wr-borderLight)",
      background: "var(--wr-drawer-bg)",
    }}
  >
    <div className="flex items-center gap-2 text-xs text-[color:var(--wr-muted)]">
      <span className="truncate">{label}</span>
      {!!tooltip && (
        <Tooltip text={tooltip}>
          <Info className="w-3.5 h-3.5" />
        </Tooltip>
      )}
    </div>
    <div className="mt-1 text-[15px] font-semibold">{value}</div>
  </motion.div>
);

const PopChip = ({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 h-8 rounded-full border bg-white text-sm hover:bg-[color:var(--wr-chip)] cursor-pointer"
        style={{ borderColor: "var(--wr-borderLight)" }}
      >
        {label} <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-0 top-[110%] z-50 min-w-[220px] rounded-lg border bg-white shadow p-2"
            style={{ borderColor: "var(--wr-borderLight)" }}
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CheckboxRow = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="cursor-pointer"
    />
    <span>{label}</span>
  </label>
);

const SliderRow = ({
  label,
  min = 0,
  max = 100,
  value,
  onChange,
  suffix = "+",
}: {
  label: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) => (
  <div className="px-2 py-1">
    <div className="flex items-center justify-between text-sm mb-2">
      <span>{label}</span>
      <span className="text-[color:var(--wr-muted)]">
        {value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[color:var(--wr-action)] cursor-pointer"
    />
  </div>
);

const AqsBar = ({ value }: { value?: number | null }) => {
  const v = pct(value);
  if (v === null) return <span className="text-[color:var(--wr-muted)]">—</span>;
  const colorClass =
    v >= 70
      ? "bg-[color:var(--wr-good)]"
      : v >= 40
      ? "bg-[color:var(--wr-warning)]"
      : "bg-[color:var(--wr-critical)]";
  return (
    <div className="min-w-[140px]">
      <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
        <div className={cls("h-2 rounded", colorClass)} style={{ width: `${v}%` }} />
      </div>
      <div className="text-xs mt-1">{v}%</div>
    </div>
  );
};

// —— Competitor Dropdown (with favicons) —— //
function domainFavicon(domain: string, size = 32) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=${size}`;
}
function CompetitorDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string; name?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 inline-flex items-center gap-2 rounded-lg border bg-white px-3 text-sm hover:bg-[color:var(--wr-chip)] cursor-pointer"
        style={{ borderColor: "var(--wr-borderLight)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select competitor"
      >
        {selected && (
          <>
            <img
              src={domainFavicon(selected.value, 32)}
              alt={`${selected.label} favicon`}
              className="w-4 h-4 rounded-sm"
            />
            <span className="font-medium">{selected.name || selected.label}</span>
            <span className="text-[color:var(--wr-muted)]">/ {selected.value}</span>
          </>
        )}
        {!selected && <span>Select competitor</span>}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 mt-2 w-[280px] rounded-lg border bg-white shadow"
            style={{ borderColor: "var(--wr-borderLight)" }}
            role="listbox"
          >
            <div className="max-h-[280px] overflow-auto py-1">
              {options.map((o) => (
                <button
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cls(
                    "w-full px-3 py-2 text-left hover:bg-[color:var(--wr-chip)] cursor-pointer",
                    o.value === value && "bg-[color:var(--wr-chip)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={domainFavicon(o.value, 32)}
                      alt={`${o.label} favicon`}
                      className="w-4 h-4 rounded-sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{o.name || o.label}</span>
                      <span className="text-xs text-[color:var(--wr-muted)]">
                        {o.value}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// —— Header (NON-STICKY) with KPI row integrated —— //
function Header({
  competitor,
  setCompetitor,
  onExport,
  titleRef,
  setOpen,
  summary,
}: {
  competitor: string;
  setCompetitor: (v: string) => void;
  onExport: (fmt: "csv") => void;
  titleRef: React.RefObject<HTMLHeadingElement>;
  setOpen: (v: boolean) => void;
  summary: { yourUnique: number; competitorUnique: number; overlapScore: number; gaps: number };
}) {
  const competitors = [
    { label: "competitor.com", value: "competitor.com", name: "Competitor" },
    { label: "seo-giant.io", value: "seo-giant.io", name: "SEO Giant" },
    { label: "rankmaster.ai", value: "rankmaster.ai", name: "Rankmaster" },
  ];
  return (
    <div
      className="border-b"
      style={{
        background: "var(--wr-drawer-bg)",
        borderColor: "var(--wr-borderLight)",
      }}
    >
      {/* Top bar */}
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex flex-col">
          <h3
            ref={titleRef}
            tabIndex={-1}
            className="text-[17px] font-semibold"
            id="comp-compare-title"
          >
            Anchor Comparison with Competitor
          </h3>
          <p
            className="text-xs text-[color:var(--wr-muted)]"
            id="comp-compare-subtitle"
          >
            yourdomain.com vs {competitor}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <CompetitorDropdown
              value={competitor}
              onChange={setCompetitor}
              options={competitors}
            />
            <button
              onClick={() => onExport("csv")}
              className="h-9 inline-flex items-center gap-2 rounded-lg border bg-white px-3 text-sm hover:bg-[color:var(--wr-chip)] cursor-pointer"
              style={{ borderColor: "var(--wr-borderLight)" }}
              aria-label="Export CSV"
            >
              <Download className="w-4 h-4 text-[color:var(--wr-action)]" />
              <span className="font-medium">Export</span>
            </button>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-[color:var(--wr-chip)] cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI row – lives inside header & matches panel background */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <KPI
            label="Your unique anchors"
            value={summary.yourUnique}
            tooltip="Total number of unique anchors on your site"
          />
          <KPI
            label="Competitor unique anchors"
            value={summary.competitorUnique}
            tooltip="Total number of unique anchors on selected competitor"
          />
          <KPI
            label="Overlap"
            value={`${Math.round(summary.overlapScore * 100)}%`}
            tooltip="Jaccard overlap weighted by usage"
          />
          <KPI
            label="Gaps detected"
            value={summary.gaps}
            tooltip="Anchors missing/overused/optimize vs competitor after filters"
          />
        </div>
      </div>
    </div>
  );
}

// —— Filters (NON-STICKY, chips & popovers) —— //
function FiltersRow({
  types,
  setTypes,
  opps,
  setOpps,
  usageDelta,
  setUsageDelta,
  aqsDelta,
  setAqsDelta,
}: {
  types: string[];
  setTypes: (v: string[]) => void;
  opps: string[];
  setOpps: (v: string[]) => void;
  usageDelta: number;
  setUsageDelta: (v: number) => void;
  aqsDelta: number;
  setAqsDelta: (v: number) => void;
}) {
  const allTypes = ["Exact", "Phrase", "Partial", "Branded", "Generic", "Empty", "Image"];
  const allOpps = ["Missing", "Overused", "Optimize"];

  const toggleList = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <div className="bg-white border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
      <div className="px-4 py-3 flex flex-wrap items-center gap-3">
        <PopChip label={`Anchor Type${types.length ? ` (${types.length})` : ""}`}>
          <div className="max-h-64 overflow-auto pr-1">
            {allTypes.map((t) => (
              <CheckboxRow
                key={t}
                label={t}
                checked={types.includes(t)}
                onChange={() => toggleList(types, setTypes, t)}
              />
            ))}
          </div>
        </PopChip>

        <PopChip label={`Opportunity${opps.length ? ` (${opps.length})` : ""}`}>
          <div className="max-h-64 overflow-auto pr-1">
            {allOpps.map((o) => (
              <CheckboxRow
                key={o}
                label={o}
                checked={opps.includes(o)}
                onChange={() => toggleList(opps, setOpps, o)}
              />
            ))}
          </div>
        </PopChip>

        <PopChip label={`Usage Δ: ${usageDelta}+`}>
          <SliderRow
            label="Min absolute usage delta"
            value={usageDelta}
            onChange={setUsageDelta}
            min={0}
            max={100}
          />
        </PopChip>

        <PopChip label={`AQS Δ: ${aqsDelta}+`}>
          <SliderRow
            label="Min absolute AQS gap"
            value={aqsDelta}
            onChange={setAqsDelta}
            min={0}
            max={100}
          />
        </PopChip>
      </div>
    </div>
  );
}

// —— Row overflow menu —— //
function RowMenu({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="p-1 rounded hover:bg-white cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4 text-[color:var(--wr-action)]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute right-0 mt-1 w-44 rounded-lg border bg-white shadow"
            style={{ borderColor: "var(--wr-borderLight)" }}
            role="menu"
          >
            {[
              { k: "exportRow", label: "Export row" },
              { k: "watch", label: "Add to Watchlist" },
            ].map((o) => (
              <button
                key={o.k}
                role="menuitem"
                className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--wr-chip)] cursor-pointer"
                onClick={() => {
                  setOpen(false);
                  alert(`${o.label}: ${row.anchor}`);
                }}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// —— Table (thead at TOP, non-sticky) —— //
function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (k: string) => void;
}) {
  const isActive = sortKey === col;
  const dirIcon = !isActive ? (
    <ArrowUpDown className="w-3.5 h-3.5" />
  ) : sortDir === "asc" ? (
    <ArrowUp className="w-3.5 h-3.5" />
  ) : (
    <ArrowDown className="w-3.5 h-3.5" />
  );
  return (
    <button
      className={cls(
        "inline-flex items-center gap-1 cursor-pointer",
        isActive
          ? "text-[color:var(--wr-action)]"
          : "text-[color:var(--wr-muted)] hover:text-[color:var(--wr-text)]"
      )}
      onClick={() => onSort(col)}
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}{" "}
      <span
        className={cls(
          "inline-flex",
          isActive ? "text-[color:var(--wr-action)]" : "text-[color:var(--wr-muted)]"
        )}
      >
        {dirIcon}
      </span>
    </button>
  );
}

function ComparisonTable({
  rows,
  expanded,
  setExpanded,
  sortKey,
  sortDir,
  setSort,
}: {
  rows: any[];
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sortKey: string;
  sortDir: "asc" | "desc";
  setSort: (k: string) => void;
}) {
  const gap = (r: any) => Math.abs((r.yourUsage || 0) - (r.competitorUsage || 0));

  return (
    <div className="px-4 pb-4">
      <div
        className="overflow-x-auto overflow-y-auto border rounded-lg"
        style={{ borderColor: "var(--wr-borderLight)" }}
      >
        <table className="w-full table-fixed min-w-[1120px]">
          <thead className="bg-white border-b" style={{ borderColor: "var(--wr-borderLight)" }}>
            <tr className="text-left text-[13px] text-[color:var(--wr-muted)]">
              <th className="w-[34px]"></th>
              <th className="py-3 px-3">
                <SortHeader
                  label="Anchor Text"
                  col="anchor"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">
                <SortHeader
                  label="Your Usage"
                  col="yourUsage"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">
                <SortHeader
                  label="Competitor Usage"
                  col="competitorUsage"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">
                <SortHeader
                  label="Usage Gap"
                  col="usageGap"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">
                <SortHeader
                  label="Your AQS"
                  col="yourAqs"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">
                <SortHeader
                  label="Competitor AQS"
                  col="competitorAqs"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">
                <SortHeader
                  label="AQS Gap"
                  col="aqsGap"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={setSort}
                />
              </th>
              <th className="py-3 px-3">Opportunity</th>
              <th className="py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <React.Fragment key={r.anchor}>
                <tr className="group text-sm hover:bg-[color:var(--wr-chip)]/70 border-b"
                    style={{ borderColor: "var(--wr-borderLight)" }}>
                  <td className="px-2 align-top">
                    <button
                      className="p-1 rounded hover:bg-white cursor-pointer"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [r.anchor]: !prev[r.anchor] }))
                      }
                      aria-label="Expand row"
                    >
                      {expanded[r.anchor] ? (
                        <ChevronUp className="w-4 h-4 text-[color:var(--wr-action)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[color:var(--wr-action)]" />
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 font-medium align-top">
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={r.anchor}>
                        {r.anchor}
                      </span>
                      <button
                        className="p-1 rounded hover:bg-white cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(r.anchor)}
                        aria-label="Copy anchor text"
                        title="Copy"
                      >
                        <Copy className="w-3.5 h-3.5 text-[color:var(--wr-action)]" />
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 align-top">{r.yourUsage ?? "—"}</td>
                  <td className="py-2.5 px-3 align-top">{r.competitorUsage ?? "—"}</td>
                  <td className="py-2.5 px-3 align-top">{gap(r)}</td>
                  <td className="py-2.5 px-3 align-top">
                    <AqsBar value={r.yourAqs} />
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <AqsBar value={r.competitorAqs} />
                  </td>
                  <td
                    className={cls(
                      "py-2.5 px-3 font-semibold align-top",
                      aqsTone(r.aqsGap)
                    )}
                  >
                    {r.aqsGap === null || r.aqsGap === undefined
                      ? "—"
                      : (r.aqsGap > 0 ? "+" : "") + r.aqsGap}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    {humanOpp(r.opportunity) || "—"}
                  </td>
                  <td className="py-2.5 px-3 align-top">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 rounded hover:bg-white cursor-pointer"
                        onClick={() =>
                          alert(`Jumping to Anchors table row: ${r.anchor}`)
                        }
                        aria-label="View in main table"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-[color:var(--wr-action)]" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-white cursor-pointer"
                        onClick={() =>
                          alert(`Open Task Drawer prefilled for: ${r.anchor}`)
                        }
                        aria-label="Add suggestion"
                        title="Add suggestion"
                      >
                        <ClipboardList className="w-4 h-4 text-[color:var(--wr-action)]" />
                      </button>
                      <RowMenu row={r} />
                    </div>
                  </td>
                </tr>
                {/* Expanded row */}
                <tr className={cls(expanded[r.anchor] ? "" : "hidden")}>
                  <td colSpan={10} className="bg-white">
                    <div
                      className="px-10 py-3 border-t text-sm grid grid-cols-1 md:grid-cols-2 gap-4"
                      style={{ borderColor: "var(--wr-borderLight)" }}
                    >
                      <div>
                        <div className="font-medium mb-1">Your samples</div>
                        <ul className="list-disc list-inside text-[color:var(--wr-text)]/90">
                          <li className="flex items-center gap-2">
                            <a className="underline cursor-pointer">/blog/tools</a>
                            <span className="text-[color:var(--wr-muted)]">×12</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <a className="underline cursor-pointer">/seo</a>
                            <span className="text-[color:var(--wr-muted)]">×8</span>
                          </li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Competitor samples</div>
                        <ul className="list-disc list-inside text-[color:var(--wr-text)]/90">
                          <li className="flex items-center gap-2">
                            <a className="underline cursor-pointer">
                              https://comp.com/tools
                            </a>
                            <span className="text-[color:var(--wr-muted)]">×15</span>
                          </li>
                        </ul>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[color:var(--wr-chip)]">
                          <Info className="w-3.5 h-3.5" /> Reason:{" "}
                          {r.opportunity ? humanOpp(r.opportunity) : "Comparable"}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// —— Main Component —— //
export default function CompetitorAnchorComparisonDrawerUpdated() {
  const [open, setOpen] = useState(true);
  const [competitor, setCompetitor] = useState("competitor.com");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Demo rows
  const [rows] = useState([
    {
      anchor: "seo tools",
      type: "Exact",
      yourUsage: 43,
      competitorUsage: 61,
      yourAqs: 52,
      competitorAqs: 68,
      aqsGap: -16,
      opportunity: "optimize",
    },
    {
      anchor: "wranker",
      type: "Branded",
      yourUsage: 0,
      competitorUsage: 9,
      yourAqs: null,
      competitorAqs: 70,
      aqsGap: null,
      opportunity: "missing",
    },
    {
      anchor: "internal linking guide",
      type: "Phrase",
      yourUsage: 18,
      competitorUsage: 5,
      yourAqs: 61,
      competitorAqs: 57,
      aqsGap: 4,
      opportunity: "overused",
    },
  ]);

  // Summary derived from rows
  const summary = useMemo(
    () => ({
      yourUnique: 1284,
      competitorUnique: 1102,
      overlapScore: 0.63,
      gaps: rows.filter((r) => r.opportunity && r.opportunity !== "").length,
    }),
    [rows]
  );

  // Filters state (local)
  const [types, setTypes] = useState<string[]>([]); // multi-select via dropdown chip
  const [opps, setOpps] = useState<string[]>([]); // multi-select via dropdown chip
  const [usageDelta, setUsageDelta] = useState(10); // slider chip
  const [aqsDelta, setAqsDelta] = useState(0); // slider chip

  // Sorting state (on headers only)
  const [sortKey, setSortKey] = useState("usageGap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const setSort = (key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("desc");
      return key;
    });
  };

  const filteredRows = useMemo(() => {
    let r = [...rows];
    if (types.length) r = r.filter((x) => types.includes(x.type));
    if (opps.length) r = r.filter((x) => opps.includes(humanOpp(x.opportunity)));
    r = r.filter(
      (x) => Math.abs((x.yourUsage || 0) - (x.competitorUsage || 0)) >= usageDelta
    );
    if (aqsDelta > 0)
      r = r.filter(
        (x) =>
          x.aqsGap !== null &&
          x.aqsGap !== undefined &&
          Math.abs(x.aqsGap) >= aqsDelta
      );

    const usageGap = (x: any) =>
      Math.abs((x.yourUsage || 0) - (x.competitorUsage || 0));
    const get = (x: any) => {
      switch (sortKey) {
        case "anchor":
          return x.anchor.toLowerCase();
        case "yourUsage":
          return x.yourUsage || 0;
        case "competitorUsage":
          return x.competitorUsage || 0;
        case "usageGap":
          return usageGap(x);
        case "yourAqs":
          return x.yourAqs ?? -1;
        case "competitorAqs":
          return x.competitorAqs ?? -1;
        case "aqsGap":
          return x.aqsGap ?? -999;
        default:
          return usageGap(x);
      }
    };
    r.sort((a, b) => {
      const av = get(a),
        bv = get(b);
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return r;
  }, [rows, types, opps, usageDelta, aqsDelta, sortKey, sortDir]);

  // Smoke tests
  useEffect(() => {
    try {
      console.assert(aqsTone(null as any).includes("var(--wr-muted)"), "aqsTone(null) should be muted");
      console.assert(aqsTone(12).includes("var(--wr-good)"), "aqsTone(>=10) should be good");
      console.assert(aqsTone(-12).includes("var(--wr-critical)"), "aqsTone(<=-10) should be critical");
      const table = document.querySelector("table");
      if (table) {
        const hasThead = !!table.querySelector("thead");
        const firstChild = table.firstElementChild?.tagName?.toLowerCase();
        console.assert(hasThead && firstChild === "thead", "Table header should be at the top");
      }
    } catch (e) {
      console.warn("[Anchors Drawer] Smoke tests failed", e);
    }
  }, []);

  return (
    <Tokens>
      <div className="relative min-h-[520px]">
        <AnimatePresence>
          {open && (
            <motion.aside
              role="dialog"
              aria-modal={false}
              aria-labelledby="comp-compare-title"
              aria-describedby="comp-compare-subtitle"
              className="fixed right-0 top-0 z-50 h-screen w-full sm:w-[1040px] border-l shadow-xl flex flex-col"
              style={{
                // unify drawer + KPI bg via CSS variable
                ["--wr-drawer-bg" as any]: "#FFFFFF",
                background: "var(--wr-drawer-bg)",
                borderColor: "var(--wr-borderLight)",
              }}
              initial={{ x: 1040 }}
              animate={{ x: 0 }}
              exit={{ x: 1040 }}
              transition={{ type: "tween", duration: 0.18 }}
            >
              <Header
                competitor={competitor}
                setCompetitor={setCompetitor}
                onExport={(fmt) => exportRows(filteredRows, fmt)}
                 titleRef={titleRef as React.RefObject<HTMLHeadingElement>} 
                setOpen={setOpen}
                summary={summary}
              />

              {/* Non-sticky filters */}
              <FiltersRow
                types={types}
                setTypes={setTypes}
                opps={opps}
                setOpps={setOpps}
                usageDelta={usageDelta}
                setUsageDelta={setUsageDelta}
                aqsDelta={aqsDelta}
                setAqsDelta={setAqsDelta}
              />

              <div className="flex-1 overflow-auto bg-white">
                <ComparisonTable
                  rows={filteredRows}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  setSort={setSort}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </Tokens>
  );
}
