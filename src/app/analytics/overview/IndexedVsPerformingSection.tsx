import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  LabelList,
} from "recharts";
import {
  Info,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Filter,
  Search,
  Eye,
  ClipboardList,
  Wrench,
  ExternalLink,
  BarChart3,
  Package,
  FileText,
  Shapes,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────
   TOKENS
   ────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  valueBlue: "#4286F5", // Indexed
  ok: "#10B981", // Performing
  warn: "#F59E0B",
  danger: "#EF4444",
  pastel: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 8,
  shadowSm: "0 1px 2px rgba(17,24,39,.06)",
  shadowMd: "0 2px 8px rgba(17,24,39,.10)",
};

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */
type Plan = "free" | "pro";

export type CategoryDatum = {
  category: string; // Blog / Product / Service / Others
  indexed: number; // from GSC (count of URLs indexed)
  performing: number; // from GA4 (count of URLs with sessions > 0)
};

export type UnderPerfRow = {
  id: string;
  url: string;
  category: string;
  indexed: boolean; // yes/no from GSC
  sessions: number; // last 30d GA4
  engagementRate?: number; // GA4 (%)
  lastUpdated?: string; // CMS / content system timestamp
  issues?: string[]; // Site Audit flags (optional)
};

/* ──────────────────────────────────────────────────────────
   Utils
   ────────────────────────────────────────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const pct = (v: number, fd = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(
    Math.max(0, Math.min(100, v))
  )}%`;
const mmss = (sec?: number) => {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/* Simple export helpers */
function exportCsv(rows: UnderPerfRow[]) {
  const header = [
    "url",
    "category",
    "indexed",
    "sessions",
    "engagementRate",
    "lastUpdated",
    "issues",
  ].join(",");
  const body = rows
    .map((r) =>
      [
        JSON.stringify(r.url),
        r.category,
        r.indexed ? "Yes" : "No",
        r.sessions,
        r.engagementRate == null ? "" : `${r.engagementRate}%`,
        r.lastUpdated ?? "",
        (r.issues ?? []).join("|"),
      ].join(",")
    )
    .join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "indexed-vs-performing.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportPNGFromNode(
  node: HTMLElement | null,
  filename = "indexed-vs-performing.png"
) {
  if (!node) return;
  const wrapper = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${node.clientWidth}" height="${node.clientHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,Inter Fallback,'Inter var',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,'Helvetica Neue',sans-serif;">
          ${node.outerHTML}
        </div>
      </foreignObject>
    </svg>`;
  const svg = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = node.clientWidth;
    canvas.height = node.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
    const data = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = data;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ──────────────────────────────────────────────────────────
   Mock data (replace with real API wiring)
   ────────────────────────────────────────────────────────── */
function mockCategories(): CategoryDatum[] {
  return [
    { category: "Blog", indexed: 400, performing: 120 },
    { category: "Product", indexed: 320, performing: 200 },
    { category: "Service", indexed: 280, performing: 150 },
    { category: "Others", indexed: 180, performing: 100 },
  ];
}

function mockUnderperf(count = 36): UnderPerfRow[] {
  const cats = ["Blog", "Product", "Service", "Others"];
  const urls = (i: number, c: string) => `/${c.toLowerCase()}/content-${i + 1}`;
  const rows: UnderPerfRow[] = [];
  for (let i = 0; i < count; i++) {
    const c = cats[i % cats.length];
    const sessions = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * 12);
    rows.push({
      id: `${c}_${i}`,
      url: urls(i, c),
      category: c,
      indexed: true,
      sessions,
      engagementRate: sessions === 0 ? undefined : Math.round(20 + Math.random() * 60),
      lastUpdated: new Date(
        Date.now() - Math.floor(Math.random() * 230) * 86_400_000
      ).toISOString(),
      issues:
        Math.random() < 0.35
          ? ["Thin Content", Math.random() < 0.5 ? "Missing Canonical" : "Slow LCP"]
          : [],
    });
  }
  return rows;
}

/* ──────────────────────────────────────────────────────────
   Category icon (Blog/Product/Service/Others) — branded color
   ────────────────────────────────────────────────────────── */
function CategoryIcon({
  category,
  className = "h-4 w-4",
}: {
  category: string;
  className?: string;
}) {
  const common = { className, color: TK.brand, "aria-hidden": true } as const;
  if (/^blog$/i.test(category)) return <FileText {...common} />;
  if (/^product$/i.test(category)) return <Package {...common} />;
  if (/^service$/i.test(category)) return <Wrench {...common} />;
  return <Shapes {...common} />; // Others / fallback
}

/* ──────────────────────────────────────────────────────────
   Custom Tooltip (smart popover with colored dots)
   ────────────────────────────────────────────────────────── */
function BarsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md p-2 text-xs shadow"
      style={{
        background: "#FFF",
        border: `1px solid ${TK.border}`,
        borderRadius: 8,
        boxShadow: TK.shadowSm,
        fontFamily:
          "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
        color: TK.text,
      }}
    >
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {label}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((p: any, i: number) => {
          const swatch = p.color || p.fill || "#9CA3AF";
          return (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: swatch }}
                />
                <span>{p.name}</span>
              </div>
              <span className="font-semibold">{nf(Number(p.value))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   X-Axis tick with branded category icon (same as table)
   ────────────────────────────────────────────────────────── */
function CategoryTick(props: any) {
  const { x, y, payload } = props;
  const label = String(payload?.value ?? "");
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Icon above the label, centered */}

      <text dy={10} textAnchor="middle" fontSize={12} fill={TK.text}>
        {label}
      </text>
    </g>
  );
}

/* ──────────────────────────────────────────────────────────
   Section Component
   ────────────────────────────────────────────────────────── */
export default function IndexedVsPerformingSection({
  plan = "pro",
  categories,
  rows,
}: {
  plan?: Plan;
  categories?: CategoryDatum[];
  rows?: UnderPerfRow[];
}) {
  /* Data */
  const catData = React.useMemo(() => categories ||[] , [categories]);
  const tableRows = React.useMemo(() => rows ||[] , [rows]);

  const totals = React.useMemo(() => {
    const indexed = catData.reduce((s, d) => s + d.indexed, 0);
    const performing = catData.reduce((s, d) => s + d.performing, 0);
    const gap = Math.max(0, indexed - performing);
    const gapPct = indexed === 0 ? 0 : (gap / indexed) * 100;
    return { indexed, performing, gap, gapPct };
  }, [catData]);

  const chartData = React.useMemo(
    () =>
      catData.map((d) => {
        const gap = Math.max(0, d.indexed - d.performing);
        const gapPct = d.indexed === 0 ? 0 : (gap / d.indexed) * 100;
        return {
          name: d.category,
          Indexed: d.indexed,
          Performing: d.performing,
          GapPct: +gapPct.toFixed(1),
          _gap: gap,
        };
      }),
    [catData]
  );

  /* UI state */
  const [stacked, setStacked] = React.useState<boolean>(false);
  const [showZeroOnly, setShowZeroOnly] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | "all">("all");
  const [barFilter, setBarFilter] = React.useState<{
    category?: string;
    key?: "Indexed" | "Performing";
  }>({});
  const [sortBy, setSortBy] = React.useState<
    "url" | "category" | "indexed" | "sessions" | "eng"
  >("sessions");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  /* Filters & sorting */
  const filtered = React.useMemo(() => {
    return tableRows.filter((r) => {
      if (search && !r.url.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (showZeroOnly && r.sessions !== 0) return false;
      if (barFilter.category && r.category !== barFilter.category) return false;
      if (barFilter.key === "Indexed" && r.sessions > 0) return false; // indexed but no traffic
      if (barFilter.key === "Performing" && r.sessions === 0) return false; // performing (has traffic)
      return true;
    });
  }, [tableRows, search, categoryFilter, showZeroOnly, barFilter]);

  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    const val = (r: UnderPerfRow) => {
      switch (sortBy) {
        case "url":
          return r.url.toLowerCase();
        case "category":
          return r.category.toLowerCase();
        case "indexed":
          return r.indexed ? 1 : 0;
        case "sessions":
          return r.sessions;
        case "eng":
          return r.engagementRate ?? -1;
      }
    };
    copy.sort((a, b) => {
      const av = val(a) as any;
      const bv = val(b) as any;
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  /* Paging */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const pageRows = React.useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  /* Bulk selection */
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const currentIds = pageRows.map((r) => r.id);
  const pageAllSelected =
    currentIds.length > 0 && currentIds.every((id) => !!selected[id]);
  const toggleSelectAll = () => {
    const check = !pageAllSelected;
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of currentIds) next[id] = check;
      return next;
    });
  };
  const selectedCount = React.useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  /* Actions */
  const onBarClick = (payload: any, index: number, dataKey: "Indexed" | "Performing") => {
    const cat = chartData[index]?.name;
    if (!cat) return;
    setBarFilter((prev) => {
      const same = prev.category === cat && prev.key === dataKey;
      return same ? {} : { category: cat, key: dataKey };
    });
    setPage(1);
  };

  const clearFilters = () => {
    setBarFilter({});
    setCategoryFilter("all");
    setShowZeroOnly(false);
    setSearch("");
    setPage(1);
  };

  const tableRef = React.useRef<HTMLDivElement>(null);

  /* UI helpers */
  function Toggle({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className="h-8 px-3 rounded-md border text-sm"
        style={{
          borderColor: TK.border,
          background: active ? TK.pastel : "#FFF",
          color: active ? TK.brand : TK.text,
          cursor: "pointer",
        }}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  }

  function SortHead({
    children,
    k,
    w,
    align = "left",
  }: {
    children: React.ReactNode;
    k: typeof sortBy;
    w?: number;
    align?: "left" | "right" | "center";
  }) {
    const is = sortBy === k;
    return (
      <th
        style={{
          width: w,
          textAlign: align,
          position: "sticky",
          top: 0,
          background: "#FFF",
          borderBottom: `1px solid ${TK.borderLight}`,
          zIndex: 10,
        }}
        className="px-3 py-2 font-medium"
      >
        <button
          onClick={() => setSortBy((prev) => (prev !== k ? k : k))}
          onDoubleClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          className="inline-flex items-center gap-1 hover:underline"
        >
          <span>{children}</span>
          {is ? (
            sortDir === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )
          ) : (
            <span className="inline-flex opacity-50">
              <ChevronDown className="h-4 w-4" />
            </span>
          )}
        </button>
      </th>
    );
  }

  /* Colors for chart labels */
  const gapColor = (v: number) => (v >= 50 ? TK.danger : "#9CA3AF");

  /* Component */
  return (
    <section
      className="rounded-md bg-white mt-4"
      style={{
        border: `1px solid ${TK.border}`,
        boxShadow: TK.shadowSm,
        fontFamily:
          "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Header (Section title with branded icon) */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${TK.borderLight}` }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" color={TK.brand} aria-hidden />
          <h2 className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Indexed vs Performing Pages
          </h2>
          <Info
            className="h-4 w-4"
            // title="GSC indexed pages vs GA4 pages with traffic in the selected range."
            style={{ color: TK.muted }}
          />
        </div>

        <div className="flex items-center gap-2">
          <Toggle label="Grouped" active={!stacked} onClick={() => setStacked(false)} />
          <Toggle label="Stacked" active={stacked} onClick={() => setStacked(true)} />

          <div className="relative">
            <button
              onClick={() => exportCsv(sorted)}
              className="h-8 px-3 rounded-md border text-sm inline-flex items-center gap-2"
              style={{ borderColor: TK.border, background: "#FFF", cursor: "pointer" }}
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
          <button
            onClick={() => exportPNGFromNode(tableRef.current, "underperforming-table.png")}
            className="h-8 px-3 rounded-md border text-sm inline-flex items-center gap-2"
            style={{ borderColor: TK.border, background: "#FFF", cursor: "pointer" }}
          >
            <Download className="h-4 w-4" /> PNG
          </button>
        </div>
      </div>

      {/* Insight Box */}
      <div className="px-4 py-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: "1.1fr 1fr" }}>
          {/* Statement */}
          <div
            className="rounded-md p-3"
            style={{
              border: `1px solid ${TK.borderLight}`,
              background: totals.gapPct >= 50 ? "rgba(239, 68, 68, 0.08)" : "#F9FAFB",
            }}
          >
            <div className="text-sm" style={{ color: TK.text }}>
              <span className="font-semibold">
                {pct(totals.gapPct)} of indexed pages are not receiving traffic
              </span>
              . Out of <strong>{nf(totals.indexed)}</strong> indexed pages, only{" "}
              <strong>{nf(totals.performing)}</strong> have sessions in the selected range.
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded" style={{ background: TK.valueBlue }} />
                Indexed: {nf(totals.indexed)}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded" style={{ background: TK.ok }} />
                Performing: {nf(totals.performing)}
              </span>
              <button
                onClick={() => {
                  setShowZeroOnly(true);
                  setBarFilter({ key: "Indexed" });
                }}
                className="ml-auto text-sm underline"
                style={{ color: TK.brand, cursor: "pointer" }}
              >
                View full list
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div
            className="rounded-md border p-3 flex flex-wrap items-center gap-2"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="relative">
              <input
                className="h-9 w-[260px] rounded-md border pl-8 pr-3 text-sm"
                placeholder="Search URL…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ borderColor: TK.border }}
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Category chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {(["all", ...catData.map((d) => d.category)] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategoryFilter(c as any);
                    setPage(1);
                  }}
                  className="h-8 px-3 rounded-md border text-sm"
                  aria-pressed={categoryFilter === c}
                  style={{
                    borderColor: TK.border,
                    background: categoryFilter === c ? TK.pastel : "#FFF",
                    color: categoryFilter === c ? TK.brand : TK.text,
                    cursor: "pointer",
                  }}
                >
                  {c === "all" ? "All Categories" : c}
                </button>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 ml-auto">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showZeroOnly}
                  onChange={(e) => {
                    setShowZeroOnly(e.target.checked);
                    setPage(1);
                  }}
                />
                <span style={{ color: TK.text }}>Show 0‑traffic only</span>
              </label>
              {(barFilter.category || barFilter.key) && (
                <button
                  onClick={clearFilters}
                  className="h-8 px-3 rounded-md border text-sm inline-flex items-center gap-2"
                  style={{
                    borderColor: TK.border,
                    background: "#FFF",
                    color: TK.brand,
                    cursor: "pointer",
                  }}
                >
                  <Filter className="h-4 w-4" />
                  Clear chart filter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-2">
        <div
          className="rounded-md p-3"
          style={{ border: `1px solid ${TK.borderLight}`, background: "#FFF" }}
        >
          <div className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: TK.text }}>
            <BarChart3 className="h-4 w-4" color={TK.brand} aria-hidden />
            Category Breakdown
          </div>
          <div className="w-full h-[260px]">
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                barCategoryGap={stacked ? "12%" : "18%"}
              >
                <CartesianGrid vertical={false} stroke={TK.borderLight} />
                {/* X-axis with branded category icons (same as table) */}
                <XAxis dataKey="name" tickMargin={18} tick={<CategoryTick />} />
                <YAxis />
                {/* Custom smart popover with colored dots (no colored text) */}
                <RTooltip content={<BarsTooltip />} />
                <Legend />
                <Bar
                  dataKey="Indexed"
                  fill={TK.valueBlue}
                  stackId={stacked ? "S" : undefined}
                  onClick={(p, i) => onBarClick(p, i, "Indexed")}
                  cursor="pointer"
                />
                <Bar
                  dataKey="Performing"
                  fill={TK.ok}
                  stackId={stacked ? "S" : undefined}
                  onClick={(p, i) => onBarClick(p, i, "Performing")}
                  cursor="pointer"
                >
                  <LabelList
                    dataKey="GapPct"
                    position="top"
                    content={(props) => {
                      const { x, y, width, value } = props as any;
                      if (value == null) return null;
                      const color = gapColor(Number(value));
                      return (
                        <text
                          x={x + width / 2}
                          y={y - 6}
                          textAnchor="middle"
                          fontSize={12}
                          fill={color}
                          style={{ pointerEvents: "none" }}
                        >
                          {pct(Number(value))}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs" style={{ color: TK.muted }}>
            Tip: Click a bar to filter the table below. Percentage above each bar is the gap within that category (indexed without sessions). Red = gap ≥ 50%.
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      {selectedCount > 0 && (
        <div
          className="mx-4 mb-2 rounded-md border px-3 py-2 flex items-center gap-2"
          style={{ borderColor: TK.borderLight, background: "#F5F7FA" }}
        >
          <span className="text-sm">
            <strong>{selectedCount}</strong> selected
          </span>
          <span className="inline-block h-5 w-px bg-gray-200" />
          <button
            className="h-8 px-3 rounded-md border text-sm inline-flex items-center gap-2"
            style={{ borderColor: TK.border, background: "#FFF", cursor: "pointer" }}
            onClick={() => alert("Create Fix Task (bulk)")}
          >
            <ClipboardList className="h-4 w-4" />
            Create Task
          </button>
          <button
            className="h-8 px-3 rounded-md border text-sm inline-flex items-center gap-2"
            style={{ borderColor: TK.border, background: "#FFF", cursor: "pointer" }}
            onClick={() => alert("Open Page Analyzer (bulk)")}
          >
            <Eye className="h-4 w-4" />
            Analyze
          </button>
          <button
            className="ml-auto text-sm underline"
            onClick={() => setSelected({})}
            style={{ color: TK.brand, cursor: "pointer" }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="px-4 pb-4">
        <div className="rounded-md border overflow-hidden" style={{ borderColor: TK.border }}>
          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th
                    className="px-3 py-2 text-center"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#FFF",
                      borderBottom: `1px solid ${TK.borderLight}`,
                      width: 42,
                      zIndex: 10,
                    }}
                  >
                    <input type="checkbox" checked={pageAllSelected} onChange={toggleSelectAll} />
                  </th>
                  <SortHead k="url" w={440}>
                    URL
                  </SortHead>
                  <SortHead k="category" w={160} align="center">
                    Category
                  </SortHead>
                  <SortHead k="indexed" w={110} align="center">
                    Indexed
                  </SortHead>
                  <SortHead k="sessions" w={120} align="right">
                    Sessions (30d)
                  </SortHead>
                  <SortHead k="eng" w={140} align="right">
                    Engagement %
                  </SortHead>
                  <th
                    className="px-3 py-2"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#FFF",
                      borderBottom: `1px solid ${TK.borderLight}`,
                      width: 160,
                      zIndex: 10,
                    }}
                  >
                    Last Updated
                  </th>
                  <th
                    className="px-3 py-2"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#FFF",
                      borderBottom: `1px solid ${TK.borderLight}`,
                      width: 180,
                      zIndex: 10,
                    }}
                  >
                    Issues
                  </th>
                  <th
                    className="px-3 py-2 text-right"
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#FFF",
                      borderBottom: `1px solid ${TK.borderLight}`,
                      width: 160,
                      zIndex: 10,
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const checked = !!selected[r.id];
                  const zero = r.sessions === 0;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#FBFDFF]"
                      style={{
                        borderTop: `1px solid ${TK.borderLight}`,
                        background: zero ? "rgba(245,158,11,0.06)" : "transparent",
                      }}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={r.url}
                          title={r.url}
                          className="text-[color:var(--value-blue,#4286F5)] underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          {r.url.length > 64
                            ? r.url.slice(0, 28) + "…" + r.url.slice(-28)
                            : r.url}
                        </a>
                      </td>
                      {/* Category with branded icon (table) */}
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center justify-center gap-1">
                          <CategoryIcon category={r.category} />
                          <span>{r.category}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs"
                          style={{
                            borderColor: TK.borderLight,
                            background: r.indexed ? "#ECFDF5" : "#FEE2E2",
                            color: r.indexed ? "#059669" : "#B91C1C",
                          }}
                        >
                          {r.indexed ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-medium ${zero ? "text-red-600" : ""}`}>{nf(r.sessions)}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.engagementRate == null ? "—" : pct(r.engagementRate, 0)}
                      </td>
                      <td className="px-3 py-2">
                        {r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {(r.issues ?? []).length ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {r.issues!.map((i, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded border"
                                style={{
                                  borderColor: TK.borderLight,
                                  background: "#FFF7ED",
                                  color: "#9A3412",
                                }}
                              >
                                {i}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className="h-8 w-8 rounded hover:bg-gray-50"
                            title="Open Page"
                            onClick={() => alert(`Open Page Analyzer: ${r.url}`)}
                          >
                            <Eye className="h-4 w-4" color={TK.brand} />
                          </button>
                          <button
                            className="h-8 w-8 rounded hover:bg-gray-50"
                            title="Fix"
                            onClick={() => alert(`Create Fix Task: ${r.url}`)}
                          >
                            <Wrench className="h-4 w-4" color={TK.brand} />
                          </button>
                          <button
                            className="h-8 w-8 rounded hover:bg-gray-50"
                            title="Open URL"
                            onClick={() => window.open(r.url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" color={TK.brand} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-sm text-gray-500">
                      No rows match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / pagination */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderTop: `1px solid ${TK.borderLight}`, background: "#FFF" }}
          >
            <div className="text-sm text-gray-600">
              Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + pageRows.length)} of {sorted.length}
            </div>

            <div className="flex items-center gap-1">
              <button
                className="h-8 w-8 rounded border"
                style={{ borderColor: TK.border }}
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First"
              >
                <ChevronsLeft className="h-4 w-4 mx-auto" />
              </button>
              <button
                className="h-8 w-8 rounded border"
                style={{ borderColor: TK.border }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Prev"
              >
                <ChevronLeft className="h-4 w-4 mx-auto" />
              </button>
              <span className="px-2 text-sm">
                {page} / {totalPages}
              </span>
              <button
                className="h-8 w-8 rounded border"
                style={{ borderColor: TK.border }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Next"
              >
                <ChevronRight className="h-4 w-4 mx-auto" />
              </button>
              <button
                className="h-8 w-8 rounded border"
                style={{ borderColor: TK.border }}
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last"
              >
                <ChevronsRight className="h-4 w-4 mx-auto" />
              </button>

              <select
                className="ml-2 h-8 rounded-md border text-sm px-2"
                style={{ borderColor: TK.border }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
