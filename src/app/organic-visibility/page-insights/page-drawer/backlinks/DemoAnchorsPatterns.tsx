"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Info,
  Download,
  Lock,
  AlertTriangle,
  Link2,
  Tag,
  Hash,
  Percent,
  Globe2,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ───────────────────────── Tokens (aligned to recent panels) ───────────────────────── */
const TK = {
  brand: "#008CCD", // branded icon color
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  grid: "#E5E7EB",
  chipBg: "#F5F7FA",
  good: "#10B981",
  warn: "#F59E0B",
  bad: "#EF4444",
  gray: "#9CA3AF",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

type AnchorCategory = "brand" | "exact" | "partial" | "misc";

export type AnchorDatum = {
  anchor: string;
  total: number;
  category?: AnchorCategory;
  domains?: number;
  followShare?: number; // 0..1
  firstSeen?: string;
  lastSeen?: string;
};

export type AnchorsPatternsProps = {
  data: AnchorDatum[];
  brandTokens?: string[];
  topN?: number;
  overOptimizationThreshold?: number;
  onFilterByAnchor?: (anchor: string) => void;
  onExportCsv?: (rows: ExportRow[]) => void;
  onExportPng?: (pngDataUrl: string) => void;
  isPro?: boolean;
  className?: string;
};

type ExportRow = {
  anchor: string;
  category: AnchorCategory;
  total: number;
  share_pct: number;
  domains?: number;
  follow_share_pct?: number;
};

const CAT_COLORS: Record<AnchorCategory, string> = {
  brand: TK.brand,
  exact: TK.bad,
  partial: TK.warn,
  misc: TK.gray,
};

/* ───────────────────────── Utils ───────────────────────── */
const fmtInt = (n: number | undefined) =>
  n == null
    ? "—"
    : Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function defaultCategorize(anchor: string, brandTokens: string[]): AnchorCategory {
  const a = (anchor || "").toLowerCase().trim();
  if (!a) return "misc";
  const isBrand = brandTokens.some((t) => a.includes(t.toLowerCase()));
  const looksExact =
    /^[a-z0-9\s\-]+$/.test(a) &&
    a.split(/\s+/).length <= 4 &&
    !isBrand &&
    a.length > 2;
  if (isBrand) return "brand";
  if (looksExact) return "exact";
  if (a.length >= 3) return "partial";
  return "misc";
}

/* Smart popover / tooltip content — UPDATED:
   1) Colored dot annotation beside the anchor title
   2) Branded icons for list items
*/
function TipCard({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as any;
  const dotColor = CAT_COLORS[p.category as AnchorCategory] ?? TK.gray;

  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 shadow text-xs"
      style={{ borderColor: TK.border }}
    >
      {/* Anchor with colored dot annotation */}
      <div
        className="font-semibold text-gray-900 truncate max-w-[260px] flex items-center gap-2"
        title={p.anchor}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: dotColor }}
          aria-hidden
        />
        <span className="truncate">{p.anchor}</span>
      </div>

      {/* Branded icon list */}
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-gray-600">
            <Tag className="h-3.5 w-3.5" style={{ color: TK.brand }} />
            Category
          </span>
          <span className="font-medium" style={{ color: dotColor }}>
            {p.category}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-gray-600">
            <Hash className="h-3.5 w-3.5" style={{ color: TK.brand }} />
            Count
          </span>
          <span className="font-medium text-gray-900">{fmtInt(p.total)}</span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-gray-600">
            <Percent className="h-3.5 w-3.5" style={{ color: TK.brand }} />
            Share
          </span>
          <span className="font-medium text-gray-900">{pct(p.share)}</span>
        </li>
        {typeof p.domains === "number" && (
          <li className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <Globe2 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
              Domains
            </span>
            <span className="font-medium text-gray-900">{fmtInt(p.domains)}</span>
          </li>
        )}
        {typeof p.followShare === "number" && (
          <li className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-gray-600">
              <Link2 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
              DoFollow
            </span>
            <span className="font-medium text-gray-900">{pct(p.followShare)}</span>
          </li>
        )}
      </ul>

      {(p.firstSeen || p.lastSeen) && (
        <div
          className="mt-2 border-t pt-1.5 text-[11px] text-gray-600 space-y-0.5"
          style={{ borderColor: TK.border }}
        >
          {p.firstSeen && (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                First
              </span>
              <span className="text-gray-800">
                {new Date(p.firstSeen).toLocaleDateString()}
              </span>
            </div>
          )}
          {p.lastSeen && (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                Last
              </span>
              <span className="text-gray-800">
                {new Date(p.lastSeen).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-1 text-[11px] text-gray-500">
        Click a bar to filter the tables by this anchor.
      </div>
    </div>
  );
}

/* ───────────────────────── Chip (modern) ───────────────────────── */
const Chip: React.FC<
  React.PropsWithChildren<{ active?: boolean; onClick?: () => void }>
> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`h-8 px-3 rounded-full border text-sm cursor-pointer ${
      active
        ? "bg-[#F0FAFF] border-[#BFE9FF] text-[#0F5CA6]"
        : "bg-white text-gray-700 hover:bg-gray-50"
    }`}
    style={{ borderColor: TK.border }}
  >
    {children}
  </button>
);

/* ───────────────────────── Main Component ───────────────────────── */
export function AnchorsPatternsMini({
  data,
  brandTokens = [],
  topN = 10,
  overOptimizationThreshold = 0.6,
  onFilterByAnchor,
  onExportCsv,
  onExportPng,
  isPro = true,
  className = "",
}: AnchorsPatternsProps) {
  const [viewTable, setViewTable] = useState(false); // modular switch
  const [asPercent, setAsPercent] = useState(false); // modular switch
  const [catFilter, setCatFilter] = useState<AnchorCategory | "all">("all");
  const chartWrapRef = useRef<HTMLDivElement>(null);

  // Normalize & classify
  const enriched = useMemo(() => {
    const totalAll = data.reduce((s, d) => s + (d.total || 0), 0) || 1;
    const items = data
      .map((d) => ({
        ...d,
        category: d.category ?? defaultCategorize(d.anchor, brandTokens),
      }))
      .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

    const top = items.slice(0, Math.max(1, topN));
    const topAnchorShare = (top[0]?.total || 0) / totalAll;

    return {
      totalAll,
      topAnchorShare,
      rows: top.map((d) => ({
        anchor: d.anchor,
        total: d.total,
        share: (d.total || 0) / totalAll,
        category: d.category as AnchorCategory,
        domains: d.domains,
        followShare: d.followShare,
        firstSeen: d.firstSeen,
        lastSeen: d.lastSeen,
      })),
    };
  }, [data, topN, brandTokens]);

  const rowsFiltered = useMemo(
    () =>
      enriched.rows.filter((r) =>
        catFilter === "all" ? true : r.category === catFilter
      ),
    [enriched.rows, catFilter]
  );

  const series = useMemo(
    () =>
      rowsFiltered.map((r) => ({
        ...r,
        value: asPercent ? r.share * 100 : r.total,
      })),
    [rowsFiltered, asPercent]
  );

  /* Exports (single Export button with dropdown) */
  function doExportCsv() {
    const rows: ExportRow[] = enriched.rows.map((r) => ({
      anchor: r.anchor,
      category: r.category,
      total: r.total ?? 0,
      share_pct: +(r.share * 100).toFixed(2),
      domains: r.domains,
      follow_share_pct:
        typeof r.followShare === "number"
          ? +(r.followShare * 100).toFixed(2)
          : undefined,
    }));
    if (onExportCsv) return onExportCsv(rows);

    const header = [
      "anchor",
      "category",
      "total",
      "share_pct",
      "domains",
      "follow_share_pct",
    ].join(",");
    const lines = rows
      .map((o) =>
        [
          o.anchor,
          o.category,
          o.total,
          o.share_pct,
          o.domains ?? "",
          o.follow_share_pct ?? "",
        ]
          .map((v) => JSON.stringify(String(v)))
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + "\n" + lines], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-anchors.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function doExportPng() {
    const wrap = chartWrapRef.current;
    if (!wrap) return;
    const svg = wrap.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const bbox = svg.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(720, Math.ceil(bbox.width));
      canvas.height = Math.max(400, Math.ceil(bbox.height));
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const png = canvas.toDataURL("image/png");
      if (onExportPng) onExportPng(png);
      else {
        const a = document.createElement("a");
        a.href = png;
        a.download = "top-anchors.png";
        a.click();
      }
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  }

  const overOpt =
    enriched.topAnchorShare >= (overOptimizationThreshold ?? 0.6);

  return (
    <section
      className={[
        "rounded-xl border bg-white shadow-sm p-4 md:p-5 mt-4",
        className || "",
      ].join(" ")}
      style={{ borderColor: TK.border, color: TK.text, ...FONTS }}
      aria-label="Anchors & Patterns"
    >
      {/* Header */}
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <h3 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            <Link2 className="h-5 w-5" style={{ color: TK.brand }} />
            Anchors &amp; Patterns — Top Anchors
          </h3>
          <p className="text-xs text-gray-500">
            Horizontal bars show your most‑used anchors. Color = category
            (Brand / Exact / Partial / Misc). Click a bar to filter related
            tables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category chips (modern) */}
          <Chip active={catFilter === "all"} onClick={() => setCatFilter("all")}>
            All
          </Chip>
          <Chip
            active={catFilter === "brand"}
            onClick={() => setCatFilter("brand")}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CAT_COLORS.brand }}
              />
              Brand
            </span>
          </Chip>
          <Chip
            active={catFilter === "exact"}
            onClick={() => setCatFilter("exact")}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CAT_COLORS.exact }}
              />
              Exact
            </span>
          </Chip>
          <Chip
            active={catFilter === "partial"}
            onClick={() => setCatFilter("partial")}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CAT_COLORS.partial }}
              />
              Partial
            </span>
          </Chip>
          <Chip
            active={catFilter === "misc"}
            onClick={() => setCatFilter("misc")}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: CAT_COLORS.misc }}
              />
              Misc
            </span>
          </Chip>

          {/* Modular switches (requested) */}
          <label className="inline-flex items-center gap-2 text-sm select-none ml-1 cursor-pointer">
            <span className="text-gray-700">Show %</span>
            <Switch
              checked={asPercent}
              onCheckedChange={(v) => setAsPercent(Boolean(v))}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm select-none cursor-pointer">
            <span className="text-gray-700">Table view</span>
            <Switch
              checked={viewTable}
              onCheckedChange={(v) => setViewTable(Boolean(v))}
            />
          </label>

          {/* Single Export button (dropdown) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 cursor-pointer">
                <Download className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doExportCsv} className="cursor-pointer">
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doExportPng} className="cursor-pointer">
                PNG
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="text-gray-400">
                <Lock className="h-3.5 w-3.5 mr-2" /> PDF (Pro)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Over‑optimization banner */}
      {overOpt && (
        <div
          className="mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: "#FEE2E2", background: "#FEF2F2", color: "#B91C1C" }}
          role="status"
          aria-live="polite"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>
            Over‑optimization risk: top anchor accounts for{" "}
            <strong>{pct(enriched.topAnchorShare)}</strong> of all backlinks
            (threshold {pct(overOptimizationThreshold ?? 0.6)}).
          </span>
        </div>
      )}

      {/* Chart / Table */}
      {!viewTable ? (
        <div className="h-[360px] w-full" ref={chartWrapRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              layout="vertical"
              barCategoryGap={6}
              margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
              role="img"
              aria-label="Horizontal bars of top anchors; color indicates category"
            >
              <CartesianGrid stroke={TK.grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={{ stroke: TK.grid }}
                fontSize={12}
                tickFormatter={(v) => (asPercent ? `${v}%` : String(v))}
                domain={[0, "dataMax"]}
              />
              <YAxis
                type="category"
                dataKey="anchor"
                tickLine={false}
                axisLine={{ stroke: TK.grid }}
                width={160}
                fontSize={12}
                tickFormatter={(v: string) =>
                  v.length > 26 ? v.slice(0, 24) + "…" : v
                }
              />
              <RTooltip
                content={<TipCard />}
                cursor={{ fill: "rgba(17,24,39,0.06)" }}
              />
              {/* Left edge flat, right rounded */}
              <Bar
                dataKey="value"
                radius={[0, 6, 6, 0]}
                onClick={(d: any) => {
                  const a = d?.payload?.anchor as string | undefined;
                  if (a && onFilterByAnchor) onFilterByAnchor(a);
                }}
              >
                {series.map((row) => (
                  <Cell
                    key={row.anchor}
                    fill={CAT_COLORS[row.category]}
                    className="cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* A11y fallback for keyboard users */}
          <ul className="sr-only" aria-hidden={false}>
            {series.map((r) => (
              <li key={r.anchor}>
                <button
                  onClick={() => onFilterByAnchor?.(r.anchor)}
                  aria-label={`Filter tables by anchor "${r.anchor}"`}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          className="max-h-[360px] overflow-auto rounded-md border"
          style={{ borderColor: TK.border }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
              <tr>
                <th className="px-3 py-2 text-left">Anchor</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Share</th>
                <th className="px-3 py-2 text-right">Domains</th>
                <th className="px-3 py-2 text-right">DoFollow</th>
                <th className="px-3 py-2 text-right">First/Last</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsFiltered.map((r) => (
                <tr key={r.anchor} className="hover:bg-[#F8FAFC]">
                  <td className="px-3 py-2">
                    <span className="font-medium" title={r.anchor}>
                      {r.anchor}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: CAT_COLORS[r.category] }}
                      />
                      {r.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtInt(r.total)}</td>
                  <td className="px-3 py-2 text-right">{pct(r.share)}</td>
                  <td className="px-3 py-2 text-right">
                    {r.domains == null ? "—" : fmtInt(r.domains)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {typeof r.followShare === "number" ? pct(r.followShare) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">
                    {r.firstSeen
                      ? new Date(r.firstSeen).toLocaleDateString()
                      : "—"}{" "}
                    /{" "}
                    {r.lastSeen
                      ? new Date(r.lastSeen).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="rounded border px-2 py-1 text-xs cursor-pointer"
                      style={{ borderColor: TK.border, color: TK.brand }}
                      onClick={() => onFilterByAnchor?.(r.anchor)}
                      title="Filter tables by this anchor"
                    >
                      Filter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer legend & help */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: CAT_COLORS.brand }}
            />{" "}
            Brand
          </span>
        <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: CAT_COLORS.exact }}
            />{" "}
            Exact
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: CAT_COLORS.partial }}
            />{" "}
            Partial
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: CAT_COLORS.misc }}
            />{" "}
            Misc
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          <Info className="h-3.5 w-3.5" />
          Hover a bar for details. Bars and Filter actions are clickable.
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Optional Demo (can be removed) ───────────────────────── */
const DEMO_DATA: AnchorDatum[] = [
  { anchor: "wranker", total: 120, domains: 55, followShare: 0.78, firstSeen: "2024-10-01", lastSeen: "2025-08-15" },
  { anchor: "w ranker", total: 84, domains: 40, followShare: 0.66, firstSeen: "2024-12-10", lastSeen: "2025-08-10" },
  { anchor: "seo dashboard", total: 70, domains: 31, followShare: 0.59, firstSeen: "2025-01-05", lastSeen: "2025-08-12" },
  { anchor: "internal link analyzer", total: 64, domains: 29, followShare: 0.62, firstSeen: "2025-02-20", lastSeen: "2025-08-09" },
  { anchor: "keyword analyzer", total: 53, domains: 22, followShare: 0.54, firstSeen: "2025-03-01", lastSeen: "2025-08-11" },
  { anchor: "link map", total: 41, domains: 18, followShare: 0.47, firstSeen: "2025-03-10", lastSeen: "2025-08-13" },
  { anchor: "best seo tool", total: 35, domains: 16, followShare: 0.51, firstSeen: "2025-04-06", lastSeen: "2025-08-14" },
  { anchor: "wranker app", total: 28, domains: 12, followShare: 0.58, firstSeen: "2025-05-02", lastSeen: "2025-08-15" },
  { anchor: "ai backlink insights", total: 22, domains: 10, followShare: 0.41, firstSeen: "2025-05-20", lastSeen: "2025-08-12" },
  { anchor: "learn more", total: 18, domains: 9, followShare: 0.33, firstSeen: "2025-06-01", lastSeen: "2025-08-10" },
];

export default function DemoAnchorsPatterns() {
  return (
    <>
          <AnchorsPatternsMini
        data={DEMO_DATA}
        brandTokens={["wranker", "w ranker", "wRanker"]}
        topN={10}
        overOptimizationThreshold={0.6}
        onFilterByAnchor={(a) => console.log("[demo] filter by anchor:", a)}
      />
    </>
  );
}
