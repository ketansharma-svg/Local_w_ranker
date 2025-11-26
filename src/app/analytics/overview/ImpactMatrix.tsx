import * as React from "react";
import {
  Button,
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Info, Download, Filter, ChevronsUpDown, ChevronUp, ChevronDown, Lock, PlugZap,
  ExternalLink, SlidersHorizontal, LayoutGrid, Search, DollarSign, Link as LinkIcon,
  Users, Mail, CircleDot, MoreHorizontal, Asterisk
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // branded (#008CCD)
  valueBlue: "#4286F5",
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};

/* ───────────────────────── Types ───────────────────────── */
type Plan = "free" | "pro";
type SourceType = "Organic" | "Paid" | "Referral" | "Direct" | "Social" | "Email" | "Other";

export type ImpactRow = {
  id: string;
  sourceMedium: string; // e.g., "google / organic"
  type: SourceType;
  sessions: number;
  engagementRate: number; // 0..1
  bounceRate: number;     // 0..1
  conversions?: number;   // GA4 conversions (optional)
  ctr?: number;           // 0..1 (GSC; organic only)
  avgPosition?: number;   // GSC; organic only (lower is better)
  selected?: boolean;
};

/* ───────────────────────── Utilities ───────────────────────── */
const fmtNum = (n?: number) => (n == null ? "—" : n.toLocaleString());
const fmtPct = (v?: number, fd = 1) =>
  v == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: fd,
      }).format(v);
const fmtPos = (v?: number) => (v == null ? "—" : v.toFixed(1));
const idFor = (s: string) =>
  "src_" +
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 60);

function exportCsv(rows: ImpactRow[]) {
  const cols = [
    "sourceMedium",
    "type",
    "sessions",
    "engagementRate",
    "bounceRate",
    "conversions",
    "ctr",
    "avgPosition",
  ];
  const header = cols.join(",");
  const lines = rows.map((r) =>
    [
      JSON.stringify(r.sourceMedium),
      r.type,
      r.sessions ?? "",
      r.engagementRate ?? "",
      r.bounceRate ?? "",
      r.conversions ?? "",
      r.ctr ?? "",
      r.avgPosition ?? "",
    ].join(",")
  );
  const blob = new Blob([header + "\n" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "impact-matrix.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportPNGFromTable(
  container: HTMLElement | null,
  filename = "impact-matrix.png"
) {
  if (!container) return;
  const table = container.querySelector("table");
  if (!table) return;
  const wrapper = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${container.clientWidth}" height="${container.clientHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif;">
          ${container.outerHTML}
        </div>
      </foreignObject>
    </svg>`;
  const svg = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svg);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ───────────────────────── Mock data ───────────────────────── */
const MOCK: ImpactRow[] = [
  {
    sourceMedium: "google / organic",
    type: "Organic",
    sessions: 12480,
    engagementRate: 0.612,
    bounceRate: 0.388,
    conversions: 280,
    ctr: 0.042,
    avgPosition: 8.3,
  },
  {
    sourceMedium: "bing / organic",
    type: "Organic",
    sessions: 980,
    engagementRate: 0.545,
    bounceRate: 0.455,
    conversions: 24,
    ctr: 0.031,
    avgPosition: 17.5,
  },
  {
    sourceMedium: "direct / (none)",
    type: "Direct",
    sessions: 9540,
    engagementRate: 0.437,
    bounceRate: 0.563,
    conversions: 130,
  },
  {
    sourceMedium: "facebook / referral",
    type: "Social",
    sessions: 3120,
    engagementRate: 0.223,
    bounceRate: 0.777,
    conversions: 20,
  },
  {
    sourceMedium: "instagram / referral",
    type: "Social",
    sessions: 2140,
    engagementRate: 0.252,
    bounceRate: 0.748,
    conversions: 12,
  },
  {
    sourceMedium: "linkedin / referral",
    type: "Social",
    sessions: 820,
    engagementRate: 0.312,
    bounceRate: 0.688,
    conversions: 8,
  },
  {
    sourceMedium: "newsletter / email",
    type: "Email",
    sessions: 1430,
    engagementRate: 0.521,
    bounceRate: 0.479,
    conversions: 46,
  },
  {
    sourceMedium: "google / cpc",
    type: "Paid",
    sessions: 2140,
    engagementRate: 0.382,
    bounceRate: 0.618,
    conversions: 110,
  },
  {
    sourceMedium: "reddit / referral",
    type: "Referral",
    sessions: 760,
    engagementRate: 0.205,
    bounceRate: 0.795,
    conversions: 6,
  },
  {
    sourceMedium: "yahoo / organic",
    type: "Organic",
    sessions: 240,
    engagementRate: 0.505,
    bounceRate: 0.495,
    conversions: 3,
    ctr: 0.018,
    avgPosition: 22.7,
  },
  {
    sourceMedium: "pinterest / referral",
    type: "Referral",
    sessions: 510,
    engagementRate: 0.274,
    bounceRate: 0.726,
    conversions: 9,
  },
  {
    sourceMedium: "duckduckgo / organic",
    type: "Organic",
    sessions: 390,
    engagementRate: 0.512,
    bounceRate: 0.488,
    conversions: 5,
    ctr: 0.022,
    avgPosition: 19.1,
  },
].map((r) => ({ ...r, id: idFor(r.sourceMedium) }) as ImpactRow);

/* ───────────────────────── Branded Type Icon ───────────────────────── */
function TypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: SourceType | "All";
  className?: string;
}) {
  const props = { className, color: TK.brand, "aria-hidden": true } as const;
  switch (type) {
    case "Organic":
      return <Search {...props} />;
    case "Paid":
      return <DollarSign {...props} />;
    case "Referral":
      return <LinkIcon {...props} />;
    case "Direct":
      return <CircleDot {...props} />;
    case "Social":
      return <Users {...props} />;
    case "Email":
      return <Mail {...props} />;
    case "Other":
      return <MoreHorizontal {...props} />;
    default:
      return <Asterisk {...props} />;
  }
}

/* ───────────────────────── Modular Chip / Switch ───────────────────────── */
const ChipBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}> = ({ active, onClick, children, title }) => (
  <button
    title={title}
    className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
    style={{
      borderColor: TK.border,
      background: active ? "var(--wr-bg-pastel,#D9EEF8)" : "#FFF",
      boxShadow: active ? "inset 0 0 0 1px rgba(0,140,205,.28)" : "none",
    }}
    onClick={onClick}
    aria-pressed={active}
  >
    {children}
  </button>
);

/* ───────────────────────── Main component ───────────────────────── */
export default function ImpactMatrix({
  plan = "pro",
  gscConnected = true,
  initialRows,
  onConnectGSC,
  onOpenSearchPerformance,
}: {
  plan?: Plan;
  gscConnected?: boolean;
  initialRows?: ImpactRow[];
  onConnectGSC?: () => void;
  onOpenSearchPerformance?: (row: ImpactRow) => void;
}) {
  const [rows, setRows] = React.useState<any>( initialRows );
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<SourceType | "All">("All");
  const [perfFilters, setPerfFilters] = React.useState<
    Array<"highBounce" | "lowEngagement" | "topCtr">
  >([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<
    "source" | "sessions" | "eng" | "bounce" | "conv" | "ctr" | "pos"
  >("sessions");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [col, setCol] = React.useState({
    sessions: true,
    engagement: true,
    bounce: true,
    conversions: true,
    ctr: true,
    avgPos: true,
  });
  const tableRef = React.useRef<HTMLDivElement>(null);

  // Hide GSC columns when not connected
  const showCtr = col.ctr && gscConnected;
  const showPos = col.avgPos && gscConnected;

  const selectedCount = rows.filter((r) => r.selected).length;

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.sourceMedium.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (typeFilter !== "All" && r.type !== typeFilter) return false;

      // Performance filters
      if (
        perfFilters.includes("highBounce") &&
        !(r.bounceRate != null && r.bounceRate >= 0.6)
      )
        return false;
      if (
        perfFilters.includes("lowEngagement") &&
        !(r.engagementRate != null && r.engagementRate <= 0.4)
      )
        return false;
      if (perfFilters.includes("topCtr")) {
        if (!(r.type === "Organic" && (r.ctr ?? 0) >= 0.04)) return false;
      }
      return true;
    });
  }, [rows, search, typeFilter, perfFilters]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const val = (r: ImpactRow) => {
      switch (sortBy) {
        case "source":
          return r.sourceMedium.toLowerCase();
        case "sessions":
          return r.sessions ?? -1;
        case "eng":
          return r.engagementRate ?? -1;
        case "bounce":
          return r.bounceRate ?? -1;
        case "conv":
          return r.conversions ?? -1;
        case "ctr":
          return r.type === "Organic" ? r.ctr ?? -1 : -1;
        case "pos":
          return r.type === "Organic" ? r.avgPosition ?? 1e9 : 1e9; // lower is better
        default:
          return 0;
      }
    };
    arr.sort((a, b) => {
      const av = val(a),
        bv = val(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = React.useMemo(
    () => sorted.slice(start, start + pageSize),
    [sorted, start, pageSize]
  );

  const currentPageIds = windowRows.map((r) => r.id);
  const pageAllSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => rows.find((r) => r.id === id)?.selected);

  const toggleAll = () => {
    const checked = !pageAllSelected;
    setRows((prev) =>
      prev.map((r) =>
        currentPageIds.includes(r.id) ? { ...r, selected: checked } : r
      )
    );
  };

  function toggleSort(key: typeof sortBy) {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  const ExportMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 px-3 cursor-pointer">
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] z-[250]">
        <DropdownMenuLabel>Export Table</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={plan === "free"}
          className={plan === "free" ? "text-gray-400" : ""}
          onClick={() => plan === "pro" && exportCsv(sorted)}
        >
          CSV {plan === "free" && <span className="ml-2 text-xs">(Upgrade)</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={plan === "free"}
          className={plan === "free" ? "text-gray-400" : ""}
          onClick={() =>
            plan === "pro" &&
            exportPNGFromTable(tableRef.current!, "impact-matrix.png")
          }
        >
          PNG {plan === "free" && <span className="ml-2 text-xs">(Upgrade)</span>}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="text-gray-400">
          PDF (Pro Reports)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ColumnSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 px-3 cursor-pointer">
          <SlidersHorizontal className="h-4 w-4 mr-2" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px] z-[250]">
        <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(
          [
            ["sessions", "Sessions"],
            ["engagement", "Engagement Rate"],
            ["bounce", "Bounce Rate"],
            ["conversions", "Conversions"],
            ["ctr", "CTR (Organic • GSC)"],
            ["avgPos", "Avg. Position (GSC)"],
          ] as const
        ).map(([key, label]) => {
          const disabled = (key === "ctr" || key === "avgPos") && !gscConnected;
          return (
            <DropdownMenuItem
              key={key}
              onClick={(e) => {
                e.preventDefault();
                if (disabled) return;
                setCol((prev) => ({
                  ...prev,
                  [key]: !prev[key as keyof typeof prev],
                }));
              }}
            >
              <span className={disabled ? "text-gray-400" : ""}>
                <Checkbox
                  checked={
                    key === "ctr"
                      ? showCtr
                      : key === "avgPos"
                      ? showPos
                      : (col as any)[key]
                  }
                  onCheckedChange={() => {}}
                />{" "}
                <span className="ml-2">{label}</span>
                {disabled && (
                  <span className="ml-2 text-xs">(Connect GSC)</span>
                )}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const badgeForType = (t: SourceType) => {
    const bg =
      t === "Organic"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : t === "Paid"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : t === "Direct"
        ? "bg-slate-50 text-slate-700 border-slate-200"
        : t === "Referral"
        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
        : t === "Social"
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : t === "Email"
        ? "bg-purple-50 text-purple-700 border-purple-200"
        : "bg-gray-50 text-gray-700 border-gray-200";
    return `inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] ${bg}`;
  };

  const headerSortIcon = (key: typeof sortBy) =>
    sortBy === key ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4" />
      )
    ) : (
      <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
    );

  return (
    <section
      className="rounded-md border bg-white mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          "Inter, Inter Fallback, 'Inter var', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Section header — with branded icon (#008CCD) */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 p-3 px-4 border-b"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" color={TK.brand} aria-hidden />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Source Impact Matrix
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info
                  className="h-4 w-4 text-muted-foreground cursor-pointer"
                  aria-label="About Source Impact Matrix"
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-[260px]">
                Compare sources by Sessions, Engagement, Bounce, Conversions
                (GA4) and Organic CTR & Avg. Position (GSC). CTR/Position
                apply to Organic only.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu />
          <ColumnSelector />
        </div>
      </div>

      {/* Sub‑section title + toolbar (chips/switches) */}
      <div
        className="p-3 px-4 border-b"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Filter className="h-4 w-4" color={TK.brand} aria-hidden />
          <h3 className="text-[13px] font-semibold" style={{ color: TK.text }}>
            Filters
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Input
              className="w-[280px] pl-9"
              placeholder="Search source/medium…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* SourceType modular chips (with branded icons) */}
          {(
            [
              "All",
              "Organic",
              "Paid",
              "Direct",
              "Referral",
              "Social",
              "Email",
              "Other",
            ] as const
          ).map((t) => (
            <ChipBtn
              key={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t as any)}
              title={t}
            >
              <TypeIcon type={t} />
              <span>{t}</span>
            </ChipBtn>
          ))}

          {/* Performance chips */}
          <div className="inline-flex items-center gap-2 ml-1">
            <ChipBtn
              active={perfFilters.includes("highBounce")}
              onClick={() =>
                setPerfFilters((s) =>
                  s.includes("highBounce")
                    ? s.filter((x) => x !== "highBounce")
                    : [...s, "highBounce"]
                )
              }
              title="High Bounce ≥ 60%"
            >
              <Filter className="h-4 w-4" color={TK.brand} />
              <span>High Bounce ≥ 60%</span>
            </ChipBtn>
            <ChipBtn
              active={perfFilters.includes("lowEngagement")}
              onClick={() =>
                setPerfFilters((s) =>
                  s.includes("lowEngagement")
                    ? s.filter((x) => x !== "lowEngagement")
                    : [...s, "lowEngagement"]
                )
              }
              title="Low Engagement ≤ 40%"
            >
              <Filter className="h-4 w-4" color={TK.brand} />
              <span>Low Engagement ≤ 40%</span>
            </ChipBtn>
            <ChipBtn
              active={perfFilters.includes("topCtr")}
              onClick={() =>
                setPerfFilters((s) =>
                  s.includes("topCtr")
                    ? s.filter((x) => x !== "topCtr")
                    : [...s, "topCtr"]
                )
              }
              title="Top CTR ≥ 4% (Organic)"
            >
              <Filter className="h-4 w-4" color={TK.brand} />
              <span>Top CTR ≥ 4% (Org)</span>
            </ChipBtn>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v: any) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 px-3 w-[120px]">
                <SelectValue placeholder="Rows / page" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[240]">
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk bar */}
        {selectedCount > 0 && (
          <div
            className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2"
            style={{ borderColor: TK.borderLight }}
          >
            <span className="text-sm">
              <strong>{selectedCount}</strong> selected
            </span>
            <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => alert("Compare selected (demo)")}
            >
              Compare
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportCsv(rows.filter((r) => r.selected))}
            >
              <Download className="h-4 w-4 mr-1" /> Export Selected (CSV)
            </Button>
            <div className="ml-auto">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setRows((prev) => prev.map((r) => ({ ...r, selected: false })))
                }
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* GSC connect banner */}
      {!gscConnected && (
        <div
          className="px-4 py-2 text-sm flex items-center gap-2 border-b bg-[#FBFDFF]"
          style={{ borderColor: TK.borderLight }}
        >
          <Lock className="h-4 w-4 text-muted-foreground" />
          CTR (Organic) and Avg. Position require GSC.{" "}
          <button
            className="inline-flex items-center gap-1 px-2 py-1 rounded border ml-1 text-[13px] cursor-pointer"
            style={{ borderColor: TK.border, color: TK.brand }}
            onClick={() =>
              onConnectGSC ? onConnectGSC() : alert("Connect GSC (demo)")
            }
          >
            <PlugZap className="h-3.5 w-3.5" /> Connect GSC
          </button>
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="max-h-[640px] overflow-auto">
        <Table className="text-sm">
          <TableHeader
            className="bg-white sticky top-0 z-40"
            style={{
              boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)",
            }}
          >
            <TableRow>
              <TableHead style={{ width: 40 }} className="text-center">
                <Checkbox checked={pageAllSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="min-w-[320px]">
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort("source")}
                >
                  <span>Source / Medium</span>
                  {headerSortIcon("source")}
                </button>
              </TableHead>

              {col.sessions && (
                <TableHead style={{ width: 130 }} className="text-right">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("sessions")}
                  >
                    <span>Sessions</span>
                    {headerSortIcon("sessions")}
                  </button>
                </TableHead>
              )}

              {col.engagement && (
                <TableHead style={{ width: 140 }} className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("eng")}
                    >
                      Engagement %
                      {headerSortIcon("eng")}
                    </button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          GA4 engaged sessions ÷ sessions.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>
              )}

              {col.bounce && (
                <TableHead style={{ width: 130 }} className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("bounce")}
                    >
                      Bounce %
                      {headerSortIcon("bounce")}
                    </button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          GA4 unengaged sessions ÷ sessions.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>
              )}

              {col.conversions && (
                <TableHead style={{ width: 140 }} className="text-right">
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("conv")}
                  >
                    Conversions
                    {headerSortIcon("conv")}
                  </button>
                </TableHead>
              )}

              {showCtr && (
                <TableHead style={{ width: 140 }} className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("ctr")}
                    >
                      CTR (Organic)
                      {headerSortIcon("ctr")}
                    </button>
                    <span
                      className="text-[11px] rounded px-1 py-[1px] border"
                      style={{
                        borderColor: TK.border,
                        color: "#0B8E63",
                        background: "#ECFDF5",
                      }}
                    >
                      GSC
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          GSC: Clicks ÷ Impressions. Organic sources only.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>
              )}

              {showPos && (
                <TableHead style={{ width: 150 }} className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <button
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("pos")}
                    >
                      Avg. Position
                      {headerSortIcon("pos")}
                    </button>
                    <span
                      className="text-[11px] rounded px-1 py-[1px] border"
                      style={{
                        borderColor: TK.border,
                        color: "#0B8E63",
                        background: "#ECFDF5",
                      }}
                    >
                      GSC
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          GSC average rank for organic queries. Lower is
                          better.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                </TableHead>
              )}

              <TableHead style={{ width: 140 }}>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {windowRows.map((r) => {
              const isOrganic = r.type === "Organic";
              return (
                <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={!!r.selected}
                      onCheckedChange={(v) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id ? { ...x, selected: Boolean(v) } : x
                          )
                        )
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Source/Medium type badge with branded icon */}
                      <span className={badgeForType(r.type)}>
                        <TypeIcon type={r.type} />
                        <span>{r.type}</span>
                      </span>
                      <span className="font-medium" style={{ color: TK.text }}>
                        {r.sourceMedium}
                      </span>
                    </div>
                  </TableCell>

                  {col.sessions && (
                    <TableCell className="text-right">{fmtNum(r.sessions)}</TableCell>
                  )}
                  {col.engagement && (
                    <TableCell className="text-right">
                      <span
                        className={
                          r.engagementRate != null && r.engagementRate >= 0.6
                            ? "text-emerald-600"
                            : r.engagementRate != null && r.engagementRate <= 0.3
                            ? "text-red-600"
                            : ""
                        }
                      >
                        {fmtPct(r.engagementRate)}
                      </span>
                    </TableCell>
                  )}
                  {col.bounce && (
                    <TableCell className="text-right">
                      <span
                        className={
                          r.bounceRate != null && r.bounceRate >= 0.6
                            ? "text-red-600"
                            : r.bounceRate != null && r.bounceRate <= 0.3
                            ? "text-emerald-600"
                            : ""
                        }
                      >
                        {fmtPct(r.bounceRate)}
                      </span>
                    </TableCell>
                  )}
                  {col.conversions && (
                    <TableCell className="text-right">{fmtNum(r.conversions)}</TableCell>
                  )}
                  {showCtr && (
                    <TableCell className="text-right">
                      {isOrganic ? fmtPct(r.ctr, 1) : "—"}
                    </TableCell>
                  )}
                  {showPos && (
                    <TableCell className="text-right">
                      {isOrganic ? `#${fmtPos(r.avgPosition)}` : "—"}
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 cursor-pointer"
                              onClick={() =>
                                onOpenSearchPerformance
                                  ? onOpenSearchPerformance(r)
                                  : alert(
                                      `Open ${
                                        isOrganic ? "Search Performance" : "Traffic"
                                      } for: ${r.sourceMedium}`
                                    )
                              }
                            >
                              {isOrganic ? "Search Perf." : "Traffic View"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {isOrganic
                              ? "Open Search Performance (GSC) for this source."
                              : "Open Traffic & Engagement view for this source."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-[#4286F5] cursor-pointer"
                        onClick={() => alert(`Open details for: ${r.sourceMedium}`)}
                        aria-label="Open details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer pagination */}
      <div
        className="flex items-center justify-between p-3 border-t"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="text-sm text-muted-foreground">
          Showing {sorted.length === 0 ? 0 : start + 1}–
          {Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 px-3"
            disabled={page <= 1}
            onClick={() => setPage(1)}
          >
            First
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <div className="text-sm w-16 text-center">
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            className="h-8 px-3"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
          <Button
            variant="outline"
            className="h-8 px-3"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
          >
            Last
          </Button>
          <Select
            value={String(pageSize)}
            onValueChange={(v: any) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 px-3 w-[120px]">
              <SelectValue placeholder="Rows / page" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[240]">
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}

/* Optional demo wrapper for your canvas/story */
export function Demo_ImpactMatrix() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-3 text-[15px] font-semibold">
        Tab 1 · Section 5 — Source Impact Matrix
      </div>
      <ImpactMatrix
        plan="pro"
        gscConnected={true}
        onConnectGSC={() => alert("Connect GSC flow")}
        onOpenSearchPerformance={(row) =>
          alert(`Open Search Performance tab filter: ${row.sourceMedium}`)
        }
      />
    </div>
  );
}
