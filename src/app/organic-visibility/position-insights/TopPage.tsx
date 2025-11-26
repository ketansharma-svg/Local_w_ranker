"use client";

import React, { useMemo, useState } from "react";
import {
  Info,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  TrendingUp,
} from "lucide-react";

/* =========================
 *  Wranker tokens (CSS vars)
 *  ========================= */
const TOKENS = {
  surface: "var(--wr-surface, #FFFFFF)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // updated brand color
  success: "var(--wr-success, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  danger: "var(--wr-danger, #EF4444)",
  radius: "var(--wr-radius, 10px)",
  shadowSm: "var(--wr-shadow-sm, 0 1px 2px rgba(17,24,39,.06))",
};

/* =========================
 *  Modular UI (chips/toggles)
 *  ========================= */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TOKENS.border }}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={String(it.value)}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(it.value)}
            className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
              active ? "bg-[#D9EEF8] font-medium text-[#0C69B2]" : "hover:bg-gray-100"
            }`}
            title={typeof it.label === "string" ? it.label : undefined}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TOKENS.border, color: active ? TOKENS.text : TOKENS.muted }}
      title={title || label}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{
          borderColor: active ? TOKENS.brand : TOKENS.border,
          background: active ? "rgba(0,140,205,0.15)" : "var(--wr-bg-subtle,#F5F7FA)",
        }}
        aria-hidden
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{
            background: TOKENS.brand,
            transform: active ? "translateX(20px)" : "translateX(2px)",
          }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

/* =========================
 *  Types
 *  ========================= */
export type PageMoverRow = {
  url: string;
  newCount: number;
  lostCount: number;
  improvedCount: number;
  declinedCount: number;
  deltas?: {
    new?: number;
    lost?: number;
    improved?: number;
    declined?: number;
  };
};

export function computeNet(r: PageMoverRow) {
  return r.newCount + r.improvedCount - (r.lostCount + r.declinedCount);
}

/* =========================
 *  Small utilities
 *  ========================= */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const shortPath = (u: string) => {
  try {
    const url = u.startsWith("http") ? new URL(u) : null;
    const path = url ? url.pathname : u;
    if (path.length <= 36) return path;
    const start = path.slice(0, 18);
    const end = path.slice(-12);
    return `${start}…${end}`;
  } catch {
    return u;
  }
};

function Badge({ sign, value }: { sign: "pos" | "neg" | "zero"; value: number }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
  const cls =
    sign === "pos"
      ? `${base} bg-green-50 text-green-700 ring-green-200`
      : sign === "neg"
      ? `${base} bg-red-50 text-red-700 ring-red-200`
      : `${base} bg-gray-50 text-gray-600 ring-gray-200`;
  const Icon = sign === "pos" ? ArrowUpRight : sign === "neg" ? ArrowDownRight : null;
  return (
    <span className={cls} style={{ whiteSpace: "nowrap" }}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {value > 0 ? `+${nf(value)}` : nf(value)}
    </span>
  );
}

function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-label="Info"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center rounded border border-transparent hover:bg-gray-100 cursor-pointer"
        style={{ width: 22, height: 22 }}
      >
        <Info className="h-4 w-4" color={TOKENS.muted} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-30 w-56 text-xs rounded-md bg-white p-2 shadow"
          style={{ border: `1px solid ${TOKENS.border}`, top: "130%", right: 0 }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

/* =========================
 *  Component
 *  ========================= */
export function TopPageMoversPreview({
  rows,
  dateScope = "vs previous period",
  onOpenPage,
  onViewAll,
}: {
  rows: PageMoverRow[];
  dateScope?: string;
  onOpenPage?: (url: string) => void;
  onViewAll?: () => void;
}) {
  // font family at section root
  const fontStyle = {
    fontFamily:
      'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
  } as const;

  // Prepare + compute net, slice top 5
  const prepared = useMemo(() => {
    const withNet = rows.map((r) => ({ ...r, net: computeNet(r) }));
    withNet.sort((a: any, b: any) => (b.net ?? 0) - (a.net ?? 0));
    return withNet.slice(0, 5);
  }, [rows]);

  type SortKey = keyof (PageMoverRow & { net: number });
  const [sortKey, setSortKey] = useState<SortKey>("net");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    const list = [...prepared];
    list.sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (av === bv) return 0;
      return sortDesc ? (av < bv ? 1 : -1) : av > bv ? 1 : -1;
    });
    return list;
  }, [prepared, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDesc(true);
    } else {
      setSortDesc((d) => !d);
    }
  };

  // Export (CSV) for the currently displayed rows
  const exportCSV = () => {
    const head = ["Page URL", "New", "Lost", "Improved", "Declined", "Net"];
    const lines = sorted.map((r: any) =>
      [
        `"${r.url.replace(/"/g, '""')}"`,
        r.newCount,
        r.lostCount,
        r.improvedCount,
        r.declinedCount,
        r.net,
      ].join(",")
    );
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-page-movers-preview.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section
      className="w-full rounded-xl border bg-white shadow-sm mt-4"
      style={{ ...fontStyle, borderColor: TOKENS.border }}
      aria-label="Top Page Movers (Preview)"
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: TOKENS.borderLight }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: TOKENS.brand }} />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }}>
            Top Page Movers
          </h3>
          <span className="text-xs" style={{ color: TOKENS.muted }}>
            ({dateScope})
          </span>
          <HelpTip text="Net Change = (New + Improved) − (Lost + Declined). Sorted by your chosen key." />
        </div>

        {/* Controls: sort chips + dir toggle + export */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<"net" | "newCount" | "lostCount" | "improvedCount" | "declinedCount">
            ariaLabel="Sort by"
            value={sortKey as any}
            onChange={(v) => setSortKey(v as SortKey)}
            items={[
              { value: "net", label: "Net" },
              { value: "newCount", label: "New" },
              { value: "lostCount", label: "Lost" },
              { value: "improvedCount", label: "Improved" },
              { value: "declinedCount", label: "Declined" },
            ]}
          />
          <ToggleSwitch
            label="Desc"
            active={sortDesc}
            onClick={() => setSortDesc((s) => !s)}
            title="Toggle sort direction"
          />
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            title="Export CSV"
          >
            <Download className="h-4 w-4" style={{ color: TOKENS.brand }} />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="border-b" style={{ borderColor: TOKENS.borderLight }}>
              <Th label="Page URL" align="left" width={380} />
              <Th
                label="New"
                onClick={() => toggleSort("newCount")}
                sort={sortKey === "newCount" ? (sortDesc ? "desc" : "asc") : undefined}
              />
              <Th
                label="Lost"
                onClick={() => toggleSort("lostCount")}
                sort={sortKey === "lostCount" ? (sortDesc ? "desc" : "asc") : undefined}
              />
              <Th
                label="Improved"
                onClick={() => toggleSort("improvedCount")}
                sort={sortKey === "improvedCount" ? (sortDesc ? "desc" : "asc") : undefined}
              />
              <Th
                label="Declined"
                onClick={() => toggleSort("declinedCount")}
                sort={sortKey === "declinedCount" ? (sortDesc ? "desc" : "asc") : undefined}
              />
              <Th
                label="Net Change"
                onClick={() => toggleSort("net")}
                sort={sortKey === "net" ? (sortDesc ? "desc" : "asc") : undefined}
              />
              <Th label="Action" align="left" width={200} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r: any, i: number) => {
              const net = r.net ?? 0;
              const sign: "pos" | "neg" | "zero" = net > 0 ? "pos" : net < 0 ? "neg" : "zero";
              return (
                <tr
                  key={`${r.url}-${i}`}
                  className="transition-colors hover:bg-[#F7FAFC] border-t"
                  style={{ borderColor: TOKENS.borderLight }}
                >
                  {/* URL */}
                  <td className="px-4 py-3 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <a
                        title={r.url}
                        className="font-medium underline decoration-from-font underline-offset-2 text-[13px] cursor-pointer"
                        style={{ color: TOKENS.brand }}
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenPage?.(r.url);
                        }}
                        href="#"
                        role="button"
                      >
                        {shortPath(r.url)}
                      </a>
                      <span className="hidden text-xs sm:inline" style={{ color: TOKENS.muted }}>
                        {r.url.startsWith("http") ? `(${new URL(r.url).hostname})` : ""}
                      </span>
                    </div>
                  </td>

                  {/* Counters */}
                  <td className="px-4 py-3 text-center">
                    <CountWithTip
                      value={r.newCount}
                      color="text-green-700"
                      chip="bg-green-50 ring-green-200"
                      tip={r.deltas?.new}
                      scope={dateScope}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CountWithTip
                      value={r.lostCount}
                      color="text-red-700"
                      chip="bg-red-50 ring-red-200"
                      tip={r.deltas?.lost}
                      scope={dateScope}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CountWithTip
                      value={r.improvedCount}
                      color="text-blue-700"
                      chip="bg-blue-50 ring-blue-200"
                      tip={r.deltas?.improved}
                      scope={dateScope}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CountWithTip
                      value={r.declinedCount}
                      color="text-amber-700"
                      chip="bg-amber-50 ring-amber-200"
                      tip={r.deltas?.declined}
                      scope={dateScope}
                    />
                  </td>

                  {/* Net */}
                  <td className="px-4 py-3 text-center">
                    <Badge sign={sign} value={net} />
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <button
                      className="inline-flex items-center gap-1 text-xs rounded border px-2 py-1 hover:bg-[#F5F7FA] cursor-pointer"
                      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                      onClick={() => onOpenPage?.(r.url)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
                      View Page in Insights
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm" style={{ color: TOKENS.muted }} colSpan={7}>
                  Nothing to show in this period. Try a different date range or device.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer CTA */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: TOKENS.borderLight }}
      >
        <div className="text-xs" style={{ color: TOKENS.muted }}>
          Net = (New + Improved) − (Lost + Declined)
        </div>
        <button
          className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium cursor-pointer"
          style={{ background: TOKENS.brand, color: "#fff" }}
          onClick={() => onViewAll?.()}
        >
          View All Page Movers
        </button>
      </div>
    </section>
  );
}

/* =========================
 *  Sub‑components
 *  ========================= */
function Th({
  label,
  align = "center",
  width,
  onClick,
  sort,
}: {
  label: string;
  align?: "left" | "center" | "right";
  width?: number;
  onClick?: () => void;
  sort?: "asc" | "desc";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 text-[12px] font-semibold uppercase tracking-wide ${
        align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"
      }`}
      style={{ minWidth: width, color: TOKENS.muted }}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:underline underline-offset-2 cursor-pointer"
        onClick={onClick}
        aria-label={`Sort by ${label}`}
        title={onClick ? `Sort by ${label}` : undefined}
      >
        <span>{label}</span>
        {sort ? (
          sort === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : null}
      </button>
    </th>
  );
}

function CountWithTip({
  value,
  tip,
  scope,
  color,
  chip,
}: {
  value: number;
  tip?: number;
  scope: string;
  color: string;
  chip: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`inline-flex items-center justify-center gap-2 rounded-full px-2 py-0.5 ring-1 ${chip}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ cursor: tip === undefined ? "default" : "help" }}
    >
      <span className={`text-xs font-semibold ${color}`}>{nf(value)}</span>
      {typeof tip === "number" ? (
        <span className="relative">
          <Info className="h-3.5 w-3.5 text-gray-400" />
          {open && (
            <div
              className="absolute z-30 w-56 text-xs rounded-md bg-white p-2 shadow"
              style={{ border: `1px solid ${TOKENS.border}`, top: "130%", right: 0 }}
              role="tooltip"
            >
              {`${tip >= 0 ? "+" : ""}${nf(tip)} ${scope}`}
            </div>
          )}
        </span>
      ) : null}
    </div>
  );
}

/* =========================
 *  Demo Harness (safe to remove)
 *  ========================= */
const DEMO_ROWS: PageMoverRow[] = [
  {
    url: "https://www.example.com/blog/ultimate-seo-checklist-for-2025",
    newCount: 18,
    lostCount: 2,
    improvedCount: 22,
    declinedCount: 4,
    deltas: { new: 6, lost: -3, improved: 9, declined: -2 },
  },
  {
    url: "https://www.example.com/seo-tools/keyword-research",
    newCount: 9,
    lostCount: 5,
    improvedCount: 14,
    declinedCount: 6,
    deltas: { new: -2, lost: 1, improved: 4, declined: 0 },
  },
  {
    url: "/pricing",
    newCount: 7,
    lostCount: 10,
    improvedCount: 12,
    declinedCount: 3,
    deltas: { new: 2, lost: -1, improved: 3, declined: -1 },
  },
  {
    url: "/blog/seo-trends",
    newCount: 4,
    lostCount: 3,
    improvedCount: 16,
    declinedCount: 12,
    deltas: { new: 0, lost: 0, improved: 2, declined: -1 },
  },
  {
    url: "https://docs.example.com/guide/getting-started",
    newCount: 6,
    lostCount: 1,
    improvedCount: 5,
    declinedCount: 1,
    deltas: { new: 1, lost: 0, improved: 2, declined: 0 },
  },
  {
    url: "/contact",
    newCount: 0,
    lostCount: 3,
    improvedCount: 4,
    declinedCount: 8,
    deltas: { new: 0, lost: 2, improved: 1, declined: 3 },
  },
];

export default function TopPage() {
  return (
    <>
      <TopPageMoversPreview
        rows={DEMO_ROWS}
        dateScope="vs prior 30d"
        onOpenPage={(url) => alert(`Open Page Insights for: ${url}`)}
        onViewAll={() => alert("View All Page Movers")}
      />
    </>
  );
}
