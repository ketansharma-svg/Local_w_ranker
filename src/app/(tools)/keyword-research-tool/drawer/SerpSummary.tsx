"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RotateCcw,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Copy,
  Eye,
  LineChart,
  BookmarkPlus,
  UsersRound,
  SlidersHorizontal,
  Info,
  Sparkles,
  SquareStack,
  Video,
  Image as ImageIcon,
  MapPin,
  ShoppingCart,
  Newspaper,
  PanelsTopLeft,
  CalendarClock,
  Columns,
  Download,
  SquareStack as TitleIcon,
  X,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "#008CCD", // branded
  action: "#008CCD",
  valueBlue: "#4286F5",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  orangeDark: "#D97706",
  violet: "#7C3AED",
  cyan: "#06B6D4",
  indigo: "#6366F1",
  rose: "#E11D48",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};
const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

/* ───────────────────────── Types ───────────────────────── */
type FeatureKey =
  | "fs"
  | "paa"
  | "video"
  | "images"
  | "local"
  | "shopping"
  | "news"
  | "sitelinks";
type ContentType =
  | "Guide"
  | "Category"
  | "PDP"
  | "Listicle"
  | "Video"
  | "News"
  | "Forum";

export interface SerpRow {
  rank: number; // 1..10
  url: string;
  domain: string;
  favicon?: string;
  title: string;
  contentType: ContentType;
  wr: number; // 0..100
  lr: number; // 0..100
  schema?: string[]; // ["FAQ","HowTo","Product","Article","LocalBusiness"]
  features?: FeatureKey[]; // row-level occupancy
  updated?: string; // ISO date or "Xd ago"
  isBrand?: boolean; // for occupancy bar color
}

export interface SerpSummaryProps {
  snapshotAgeDays?: number;
  rows: SerpRow[]; // usually Top‑10
  onRefresh?: () => void;
  onOpenPageAnalyzer?: (row: SerpRow) => void;
  onSaveToList?: (row: SerpRow) => void;
  onAddCompetitor?: (domain: string) => void;
  onHighlightInOverlay?: (row: SerpRow) => void;
}

/* ───────────────────────── Telemetry stub ───────────────────────── */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  const envelope = { event, ts: new Date().toISOString(), props };
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail: envelope }));
}

/* ───────────────────────── Small UI helpers ───────────────────────── */
const SectionCard: React.FC<
  React.PropsWithChildren<{ title: React.ReactNode; right?: React.ReactNode }>
> = ({ title, right, children }) => (
  <div
    className="rounded-[6px] bg-white border"
    style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm }}
  >
    <div
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: TK.borderLight }}
    >
      <div className="flex items-center gap-2">{title}</div>
      {right}
    </div>
    <div className="p-3 pt-2">{children}</div>
  </div>
);

const ChipButton: React.FC<
  React.PropsWithChildren<{ active?: boolean; className?: string }>
> = ({ active, className, children }) => (
  <span
    className={cn(
      "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm cursor-pointer select-none",
      active ? "bg-[#F0FAFF] border-[#BFE9FF] text-[#0F5CA6]" : "bg-white",
      className
    )}
    style={{ borderColor: TK.border }}
  >
    {children}
  </span>
);

const IconDot: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 8,
}) => (
  <span
    className="inline-block rounded-full"
    style={{ width: size, height: size, background: color }}
  />
);

/* SERP feature colors/icons (colored as in other sections) */
const FEATURE_META: Record<
  FeatureKey,
  { label: string; icon: React.ReactNode; color: string }
> = {
  fs: { label: "Featured Snippet", icon: <Sparkles className="h-4 w-4" />, color: TK.warn },
  paa: { label: "People Also Ask", icon: <SquareStack className="h-4 w-4" />, color: TK.ok },
  video: { label: "Video", icon: <Video className="h-4 w-4" />, color: TK.rose },
  images: { label: "Images", icon: <ImageIcon className="h-4 w-4" />, color: TK.cyan },
  local: { label: "Local", icon: <MapPin className="h-4 w-4" />, color: TK.indigo },
  shopping: { label: "Shopping", icon: <ShoppingCart className="h-4 w-4" />, color: TK.ok },
  news: { label: "News", icon: <Newspaper className="h-4 w-4" />, color: TK.brand },
  sitelinks: { label: "Sitelinks", icon: <PanelsTopLeft className="h-4 w-4" />, color: TK.violet },
};

/* Band color for WR value */
function bandColor(score: number) {
  if (score <= 29) return TK.ok;
  if (score <= 54) return TK.warn;
  if (score <= 74) return TK.orangeDark;
  return TK.critical;
}

/* Progressive WR/LR meter */
const WrLrMeter: React.FC<{ wr: number; lr: number }> = ({ wr, lr }) => (
  <div className="min-w-[160px]">
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="h-1.5 rounded-full" style={{ background: "#EEF2F7" }}>
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, wr))}%`,
              background: bandColor(wr),
            }}
          />
        </div>
        <div className="h-1 rounded-full mt-1" style={{ background: "#E8F4FF" }}>
          <div
            className="h-1 rounded-full"
            style={{
              width: `${Math.max(0, Math.min(100, lr))}%`,
              background: TK.valueBlue,
            }}
          />
        </div>
      </div>
      <div className="text-[12px] text-muted-foreground min-w-[82px] text-right">
        WR {wr} • LR {lr}
      </div>
    </div>
  </div>
);

/* Debounce */
function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ───────────────────────── Main component ───────────────────────── */
export const SerpSummarySection: React.FC<SerpSummaryProps> = ({
  snapshotAgeDays,
  rows,
  onRefresh,
  onOpenPageAnalyzer,
  onSaveToList,
  onAddCompetitor,
  onHighlightInOverlay,
}) => {
  /* Filters */
  const [q, setQ] = React.useState("");
  const dq = useDebounced(q);

  const [featuresSel, setFeaturesSel] = React.useState<FeatureKey[]>([]);
  const [typesSel, setTypesSel] = React.useState<ContentType[]>([]);
  const [rankRange, setRankRange] = React.useState<[number, number]>([1, 10]);
  const [wrRange, setWrRange] = React.useState<[number, number]>([0, 100]);
  const [lrRange, setLrRange] = React.useState<[number, number]>([0, 100]);
  const [freshness, setFreshness] = React.useState<
    "7d" | "30d" | "90d" | "12m" | "any"
  >("any");

  /* Column visibility */
  type ColKey =
    | "rank"
    | "result"
    | "type"
    | "wrlr"
    | "schema"
    | "features"
    | "updated"
    | "actions";
  const [visibleCols, setVisibleCols] = React.useState<Record<ColKey, boolean>>({
    rank: true,
    result: true,
    type: true,
    wrlr: true,
    schema: true,
    features: true,
    updated: true,
    actions: true,
  });

  /* Sorting */
  type SortKey = "rank" | "domain" | "wr" | "lr" | "updated";
  const [sortBy, setSortBy] = React.useState<SortKey>("rank");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const toggleSort = (key: SortKey) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    krTrack("kr.serp.sort_changed", { col: key, dir: sortDir });
  };

  /* Helpers */
  function daysAgo(d?: string) {
    if (!d) return Infinity;
    if (/^\d+d ago$/.test(d)) return parseInt(d.split("d")[0], 10);
    const dt = new Date(d);
    const diff = Date.now() - dt.getTime();
    return Math.floor(diff / 86400000);
  }

  const overlayFeatures = React.useMemo(() => {
    const s = new Set<FeatureKey>();
    rows.forEach((r) => (r.features || []).forEach((f) => s.add(f)));
    return s;
  }, [rows]);

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (dq) {
        const s = dq.toLowerCase();
        if (
          !r.domain.toLowerCase().includes(s) &&
          !r.title.toLowerCase().includes(s)
        )
          return false;
      }
      if (featuresSel.length) {
        const have = new Set(r.features || []);
        if (!featuresSel.every((f) => have.has(f))) return false;
      }
      if (typesSel.length && !typesSel.includes(r.contentType)) return false;
      if (r.rank < rankRange[0] || r.rank > rankRange[1]) return false;
      if (r.wr < wrRange[0] || r.wr > wrRange[1]) return false;
      if (r.lr < lrRange[0] || r.lr > lrRange[1]) return false;
      const da = daysAgo(r.updated);
      if (freshness !== "any") {
        const cap =
          freshness === "7d" ? 7 : freshness === "30d" ? 30 : freshness === "90d" ? 90 : 365;
        if (da > cap) return false;
      }
      return true;
    });
  }, [
    rows,
    dq,
    featuresSel,
    typesSel,
    rankRange,
    wrRange,
    lrRange,
    freshness,
  ]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "rank":
          return dir * (a.rank - b.rank);
        case "domain":
          return dir * a.domain.localeCompare(b.domain);
        case "wr":
          return dir * (a.wr - b.wr);
        case "lr":
          return dir * (a.lr - b.lr);
        case "updated":
          return dir * (daysAgo(a.updated) - daysAgo(b.updated));
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  function occColor(r: SerpRow) {
    return r.isBrand ? TK.indigo : "#A3A3A3";
  }

  /* Export (CSV) */
  function exportCSV() {
    const header = [
      "#",
      "domain",
      "url",
      "title",
      "type",
      "wr",
      "lr",
      "schema",
      "features",
      "updated",
    ].join(",");
    const lines = sorted
      .map((r) =>
        [
          r.rank,
          r.domain,
          r.url,
          r.title,
          r.contentType,
          r.wr,
          r.lr,
          (r.schema || []).join("|"),
          (r.features || []).join("|"),
          r.updated || "",
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
    a.download = "serp-summary.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const clearAll = () => {
    setQ("");
    setFeaturesSel([]);
    setTypesSel([]);
    setRankRange([1, 10]);
    setWrRange([0, 100]);
    setLrRange([0, 100]);
    setFreshness("any");
  };

  /* Header left/right */
  const headerLeft = (
    <div className="flex items-center gap-2">
      <TitleIcon className="h-5 w-5" style={{ color: TK.brand }} />
      <h3 className="text-[14px] font-semibold" style={{ color: TK.text }}>
        SERP Summary
      </h3>
    </div>
  );

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Snapshot pill */}
      <span
        className="text-xs px-2 py-0.5 rounded-full border"
        style={{ borderColor: TK.borderLight, color: TK.muted }}
      >
        Snapshot {snapshotAgeDays ?? "—"}d ago
      </span>
      {(snapshotAgeDays ?? 0) > 7 && (
        <span
          className="text-[11px] px-2 py-0.5 rounded-full border"
          style={{ borderColor: TK.borderLight, color: TK.warn }}
        >
          Consider refreshing
        </span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          Re‑fetch top results and features for this keyword.
        </TooltipContent>
      </Tooltip>

      {/* Column control */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 px-3 cursor-pointer">
            <Columns className="h-4 w-4 mr-2" style={{ color: TK.brand }} />
            Columns
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
          <div className="space-y-2">
            {(
              [
                ["rank", "#"],
                ["result", "Result"],
                ["type", "Type"],
                ["wrlr", "WR / LR"],
                ["schema", "Schema"],
                ["features", "Features"],
                ["updated", "Updated"],
                ["actions", "Actions"],
              ] as [ColKey, string][]
            ).map(([k, label]) => (
              <label
                key={k}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={visibleCols[k]}
                  onCheckedChange={(v) =>
                    setVisibleCols((s) => ({ ...s, [k]: Boolean(v) }))
                  }
                  disabled={k === "result"} // keep core column
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                setVisibleCols({
                  rank: true,
                  result: true,
                  type: true,
                  wrlr: true,
                  schema: true,
                  features: true,
                  updated: true,
                  actions: true,
                })
              }
            >
              Reset
            </Button>
            <Button size="sm" className="cursor-pointer">
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Export */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-8 px-3 cursor-pointer">
            <Download className="h-4 w-4 mr-2" style={{ color: TK.brand }} />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportCSV} className="cursor-pointer">
            CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  /* Sort header button */
  const SortCap: React.FC<{ onClick: () => void; active?: boolean; dir?: "asc" | "desc" ; children?:any}> = ({
    onClick,
    active,
    dir,
    children,
  }) => (
    <button
      className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
      onClick={onClick}
    >
      <span>{children}</span>
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <section style={FONTS}>
      <TooltipProvider delayDuration={120}>
        <SectionCard
          title={headerLeft}
          right={headerRight}
        >
          {/* ─ Filter Bar (drop‑down chips) ─ */}
          <div
            className="mb-3 rounded-[6px] border p-2"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-7 w-[280px]"
                  placeholder="Search domain or title…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              {/* Features (dropdown chip) */}
              <Popover>
                <PopoverTrigger asChild>
                  <ChipButton active={featuresSel.length > 0}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Features {featuresSel.length ? `(${featuresSel.length})` : "(All)"}
                  </ChipButton>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[360px]">
                  <div className="text-sm font-medium mb-2">SERP Features</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FEATURE_META) as FeatureKey[]).map((f) => {
                      const on = featuresSel.includes(f);
                      const meta = FEATURE_META[f];
                      return (
                        <button
                          key={f}
                          className={cn(
                            "h-9 rounded-full border px-3 text-sm flex items-center gap-2 cursor-pointer",
                            on && "bg-[#F0FAFF] border-[#BFE9FF]"
                          )}
                          style={{ borderColor: TK.border }}
                          onClick={() =>
                            setFeaturesSel((s) =>
                              on ? s.filter((x) => x !== f) : [...s, f]
                            )
                          }
                          title={meta.label}
                        >
                          <span style={{ color: meta.color }}>{meta.icon}</span>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setFeaturesSel([])}
                    >
                      Reset
                    </Button>
                    <Button size="sm" className="cursor-pointer">
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Type (dropdown chip) */}
              <Popover>
                <PopoverTrigger asChild>
                  <ChipButton active={typesSel.length > 0}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Type {typesSel.length ? `(${typesSel.length})` : "(All)"}
                  </ChipButton>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px]">
                  <div className="text-sm font-medium mb-2">Content Type</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      ["Guide", "Category", "PDP", "Listicle", "Video", "News", "Forum"] as ContentType[]
                    ).map((t) => {
                      const on = typesSel.includes(t);
                      return (
                        <button
                          key={t}
                          className={cn(
                            "h-8 rounded-full border px-3 text-sm text-left cursor-pointer",
                            on && "bg-[#F0FAFF] border-[#BFE9FF]"
                          )}
                          style={{ borderColor: TK.border }}
                          onClick={() =>
                            setTypesSel((s) =>
                              on ? s.filter((x) => x !== t) : [...s, t]
                            )
                          }
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setTypesSel([])}
                    >
                      Reset
                    </Button>
                    <Button size="sm" className="cursor-pointer">
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Rank / WR / LR (dropdown chips already) */}
              <Popover>
                <PopoverTrigger asChild>
                  <ChipButton active={rankRange[0] !== 1 || rankRange[1] !== 10}>
                    <SlidersHorizontal className="h-4 w-4" />
                    Rank {rankRange[0]}–{rankRange[1]}
                  </ChipButton>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[260px]">
                  <div className="text-sm font-medium mb-1">Rank range</div>
                  <Slider
                    value={[rankRange[0], rankRange[1]]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(v: number[]) =>
                      setRankRange([v[0], v[1]] as [number, number])
                    }
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <ChipButton active={wrRange[0] !== 0 || wrRange[1] !== 100}>
                    <SlidersHorizontal className="h-4 w-4" />
                    WR {wrRange[0]}–{wrRange[1]}
                  </ChipButton>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[260px]">
                  <div className="text-sm font-medium mb-1">WR range</div>
                  <Slider
                    value={[wrRange[0], wrRange[1]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v: number[]) =>
                      setWrRange([v[0], v[1]] as [number, number])
                    }
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <ChipButton active={lrRange[0] !== 0 || lrRange[1] !== 100}>
                    <SlidersHorizontal className="h-4 w-4" />
                    LR {lrRange[0]}–{lrRange[1]}
                  </ChipButton>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[260px]">
                  <div className="text-sm font-medium mb-1">LR range</div>
                  <Slider
                    value={[lrRange[0], lrRange[1]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v: number[]) =>
                      setLrRange([v[0], v[1]] as [number, number])
                    }
                  />
                </PopoverContent>
              </Popover>

              {/* Freshness */}
              <div className="flex items-center gap-1 text-sm">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <Select value={freshness} onValueChange={(v: any) => setFreshness(v)}>
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder="Freshness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Updated: Any</SelectItem>
                    <SelectItem value="7d">Updated: 7d</SelectItem>
                    <SelectItem value="30d">Updated: 30d</SelectItem>
                    <SelectItem value="90d">Updated: 90d</SelectItem>
                    <SelectItem value="12m">Updated: 12m</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 cursor-pointer"
                onClick={clearAll}
                title="Clear all filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* ─ Feature Overlay & Occupancy strip ─ */}
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Overlay: which surfaces present */}
            <div className="flex items-center gap-3">
              {(Object.keys(FEATURE_META) as FeatureKey[]).map((k) => {
                const on = overlayFeatures.has(k);
                const meta = FEATURE_META[k];
                return (
                  <Tooltip key={k}>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1 text-sm">
                        <span
                          className={cn(
                            on ? "" : "text-[#9E9E9E]"
                          )}
                          style={{ color: on ? meta.color : undefined }}
                        >
                          {meta.icon}
                        </span>
                        <span
                          className={cn(
                            "hidden sm:inline",
                            on ? "text-[color:var(--wr-text-strong,#111827)]" : "text-muted-foreground"
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {meta.label} {on ? "present" : "not detected"}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* Occupancy strip by rank */}
            <div className="flex items-center gap-1">
              {rows.slice(0, 10).map((r) => (
                <Tooltip key={r.rank}>
                  <TooltipTrigger asChild>
                    <div
                      className="h-2.5 w-6 rounded-sm"
                      style={{ background: occColor(r) }}
                      title={`#${r.rank} ${r.domain}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[240px]">
                    <div className="font-medium mb-0.5">
                      #{r.rank} — {r.domain}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {r.contentType}
                    </div>
                    <div className="mt-1 flex gap-1 items-center text-[11px]">
                      {(r.features || []).map((f) => (
                        <span key={f} className="inline-flex items-center gap-1">
                          <IconDot color={FEATURE_META[f].color} />{" "}
                          {FEATURE_META[f].label}
                        </span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* ─ Table ─ */}
          <div
            className="max-h-[420px] overflow-auto rounded-[6px] border"
            style={{ borderColor: TK.borderLight }}
          >
            <Table className="text-sm">
              {/* NOTE: headers kept EXACTLY as provided */}
              <TableHeader
                className="bg-white sticky top-0 z-10"
                style={{
                  boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)",
                }}
              >
                <TableRow>
                  {visibleCols.rank && (
                    <TableHead className="w-[80px] text-right">
                      <SortCap
                        onClick={() => toggleSort("rank")}
                        active={sortBy === "rank"}
                        dir={sortDir}
                      >
                        #
                      </SortCap>
                    </TableHead>
                  )}
                  {visibleCols.result && (
                    <TableHead className="min-w-[360px]">
                      <SortCap
                        onClick={() => toggleSort("domain")}
                        active={sortBy === "domain"}
                        dir={sortDir}
                      >
                        Result
                      </SortCap>
                    </TableHead>
                  )}
                  {visibleCols.type && (
                    <TableHead className="w-[140px] text-center">
                      <span>Type</span>
                    </TableHead>
                  )}
                  {visibleCols.wrlr && (
                    <TableHead className="w-[200px] text-center">
                      <SortCap
                        onClick={() => toggleSort("wr")}
                        active={sortBy === "wr"}
                        dir={sortDir}
                      >
                        WR / LR
                      </SortCap>
                    </TableHead>
                  )}
                  {visibleCols.schema && (
                    <TableHead className="w-[160px] text-center">Schema</TableHead>
                  )}
                  {visibleCols.features && (
                    <TableHead className="w-[180px] text-center">Features</TableHead>
                  )}
                  {visibleCols.updated && (
                    <TableHead className="w-[140px]">
                      <SortCap
                        onClick={() => toggleSort("updated")}
                        active={sortBy === "updated"}
                        dir={sortDir}
                      >
                        Updated
                      </SortCap>
                    </TableHead>
                  )}
                  {visibleCols.actions && (
                    <TableHead className="w-[200px]">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.rank} className="hover:bg-[#F8FAFC]">
                    {/* Rank */}
                    {visibleCols.rank && (
                      <TableCell className="text-right pr-4">{r.rank}</TableCell>
                    )}

                    {/* Result */}
                    {visibleCols.result && (
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className="h-4 w-4 rounded overflow-hidden mt-0.5">
                            {r.favicon ? (
                              <img
                                src={r.favicon}
                                alt=""
                                className="h-4 w-4 object-cover"
                              />
                            ) : (
                              <div className="h-4 w-4 rounded bg-gray-200" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[color:var(--wr-valueBlue,#4286F5)] hover:underline cursor-pointer"
                              title={r.url}
                              onClick={() =>
                                krTrack("kr.serp.row_action", {
                                  action: "open",
                                  rank: r.rank,
                                  domain: r.domain,
                                })
                              }
                            >
                              {r.domain}
                            </a>
                            <div
                              className="truncate text-[13px]"
                              style={{ color: TK.muted }}
                              title={r.title}
                            >
                              {r.title}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Type */}
                    {visibleCols.type && (
                      <TableCell className="text-center">
                        <span
                          className="inline-flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full border"
                          style={{
                            borderColor: TK.borderLight,
                            background: "#FFF",
                            color: TK.text,
                          }}
                        >
                          {r.contentType}
                        </span>
                      </TableCell>
                    )}

                    {/* WR/LR */}
                    {visibleCols.wrlr && (
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-block cursor-pointer">
                              <WrLrMeter wr={r.wr} lr={r.lr} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            <div>
                              <strong>WR</strong>: Page strength estimate (0–100)
                            </div>
                            <div>
                              <strong>LR</strong>: Link rating / authority (0–100)
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    )}

                    {/* Schema */}
                    {visibleCols.schema && (
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2 text-[#9E9E9E]">
                          {r.schema && r.schema.length > 0 ? (
                            r.schema.map((s) => (
                              <Tooltip key={s}>
                                <TooltipTrigger asChild>
                                  <span
                                    className="text-[#6B7280] text-xs border px-1.5 py-0.5 rounded cursor-default"
                                    style={{ borderColor: TK.borderLight }}
                                  >
                                    {s}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  {s} schema detected
                                </TooltipContent>
                              </Tooltip>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Features (colored icons) */}
                    {visibleCols.features && (
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2">
                          {(r.features || []).map((f) => {
                            const meta = FEATURE_META[f];
                            return (
                              <Tooltip key={f}>
                                <TooltipTrigger asChild>
                                  <span
                                    className="inline-flex items-center justify-center h-7 min-w-[28px] rounded border px-2 cursor-pointer"
                                    style={{
                                      color: meta.color,
                                      borderColor: TK.borderLight,
                                    }}
                                    title={meta.label}
                                  >
                                    <span style={{ color: meta.color }}>
                                      {meta.icon}
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  Appears in {meta.label}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                          {(r.features || []).length === 0 && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Updated */}
                    {visibleCols.updated && (
                      <TableCell>
                        <span className="text-[13px]" style={{ color: TK.text }}>
                          {r.updated || "—"}
                        </span>
                      </TableCell>
                    )}

                    {/* Actions (branded icons) */}
                    {visibleCols.actions && (
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Open URL in new tab"
                                onClick={() => {
                                  window.open(r.url, "_blank", "noopener");
                                  krTrack("kr.serp.row_action", {
                                    action: "open",
                                    rank: r.rank,
                                    domain: r.domain,
                                  });
                                }}
                              >
                                <ExternalLink
                                  className="h-4 w-4"
                                  style={{ color: TK.brand }}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Open URL in new tab
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Copy URL"
                                onClick={() => {
                                  copy(r.url);
                                  krTrack("kr.serp.row_action", {
                                    action: "copy",
                                    rank: r.rank,
                                    domain: r.domain,
                                  });
                                }}
                              >
                                <Copy
                                  className="h-4 w-4"
                                  style={{ color: TK.brand }}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Copy URL
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Highlight in SERP overlay"
                                onClick={() => {
                                  onHighlightInOverlay?.(r);
                                  krTrack("kr.serp.row_action", {
                                    action: "highlight",
                                    rank: r.rank,
                                    domain: r.domain,
                                  });
                                }}
                              >
                                <Eye
                                  className="h-4 w-4"
                                  style={{ color: TK.brand }}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Highlight in SERP overlay
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Open Page Analyzer"
                                onClick={() => {
                                  onOpenPageAnalyzer?.(r);
                                  krTrack("kr.serp.row_action", {
                                    action: "analyzer",
                                    rank: r.rank,
                                    domain: r.domain,
                                  });
                                }}
                              >
                                <LineChart
                                  className="h-4 w-4"
                                  style={{ color: TK.brand }}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Open Page Analyzer
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Save to list"
                                onClick={() => {
                                  onSaveToList?.(r);
                                  krTrack("kr.serp.row_action", {
                                    action: "save",
                                    rank: r.rank,
                                    domain: r.domain,
                                  });
                                }}
                              >
                                <BookmarkPlus
                                  className="h-4 w-4"
                                  style={{ color: TK.brand }}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Save to list…
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="cursor-pointer"
                                aria-label="Add as competitor"
                                onClick={() => {
                                  onAddCompetitor?.(r.domain);
                                  krTrack("kr.serp.row_action", {
                                    action: "add_comp",
                                    rank: r.rank,
                                    domain: r.domain,
                                  });
                                }}
                              >
                                <UsersRound
                                  className="h-4 w-4"
                                  style={{ color: TK.brand }}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Add as competitor
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No results match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </TooltipProvider>
    </section>
  );
};

/* ───────────────────────── Demo wrapper (remove in prod) ───────────────────────── */
export default function DemoSerpSummary() {
  const rows: SerpRow[] = [
    {
      rank: 1,
      url: "https://example.com/guide/seo-audit",
      domain: "example.com",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=example.com",
      title: "SEO Audit: A Complete Guide (2025)",
      contentType: "Guide",
      wr: 78,
      lr: 64,
      schema: ["Article", "FAQ"],
      features: ["fs", "paa", "images"],
      updated: "2025-08-22",
      isBrand: true,
    },
    {
      rank: 2,
      url: "https://brand.io/blog/technical-seo-checklist",
      domain: "brand.io",
      favicon: "https://www.google.com/s2/favicons?sz=64&domain_url=brand.io",
      title: "Technical SEO Checklist: 30+ Steps",
      contentType: "Listicle",
      wr: 72,
      lr: 58,
      schema: ["Article"],
      features: ["paa"],
      updated: "2025-08-15",
      isBrand: true,
    },
    {
      rank: 3,
      url: "https://site.net/tools/seo-audit",
      domain: "site.net",
      favicon: "https://www.google.com/s2/favicons?sz=64&domain_url=site.net",
      title: "Best SEO Audit Tools Reviewed",
      contentType: "Listicle",
      wr: 68,
      lr: 54,
      schema: ["Article", "FAQ"],
      features: ["images"],
      updated: "2025-07-30",
    },
    {
      rank: 4,
      url: "https://docs.dev/learn/seo-audit",
      domain: "docs.dev",
      favicon: "https://www.google.com/s2/favicons?sz=64&domain_url=docs.dev",
      title: "Learn: SEO Site Audit for Developers",
      contentType: "Guide",
      wr: 62,
      lr: 45,
      schema: ["Article"],
      features: [],
      updated: "2025-08-09",
    },
    {
      rank: 5,
      url: "https://portal.app/seo-audit",
      domain: "portal.app",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=portal.app",
      title: "SEO Audit for Apps: A Practical Walkthrough",
      contentType: "Guide",
      wr: 59,
      lr: 44,
      schema: ["Article", "HowTo"],
      features: ["video"],
      updated: "2025-06-12",
    },
    {
      rank: 6,
      url: "https://newsroom.example/news/seo-audit",
      domain: "newsroom.example",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=newsroom.example",
      title: "Industry Report: SEO Audits Are Evolving",
      contentType: "News",
      wr: 56,
      lr: 51,
      schema: ["Article"],
      features: ["news"],
      updated: "2025-08-28",
      isBrand: false,
    },
    {
      rank: 7,
      url: "https://yt.example/watch?v=xyz",
      domain: "youtube.com",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=youtube.com",
      title: "SEO Audit Tutorial (Video)",
      contentType: "Video",
      wr: 61,
      lr: 40,
      schema: [],
      features: ["video"],
      updated: "2025-07-01",
    },
    {
      rank: 8,
      url: "https://kb.brand.io/seo-audit",
      domain: "kb.brand.io",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=kb.brand.io",
      title: "Knowledge Base: SEO Audit FAQ",
      contentType: "Forum",
      wr: 48,
      lr: 32,
      schema: ["FAQ"],
      features: ["paa"],
      updated: "2025-08-05",
      isBrand: true,
    },
    {
      rank: 9,
      url: "https://shop.example/product/seo-audit-service",
      domain: "shop.example",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=shop.example",
      title: "SEO Audit Service – Pricing & Packages",
      contentType: "PDP",
      wr: 52,
      lr: 41,
      schema: ["Product"],
      features: ["shopping"],
      updated: "2025-06-22",
    },
    {
      rank: 10,
      url: "https://images.example/seo-audit-gallery",
      domain: "images.example",
      favicon:
        "https://www.google.com/s2/favicons?sz=64&domain_url=images.example",
      title: "SEO Audit Examples (Gallery)",
      contentType: "Category",
      wr: 47,
      lr: 36,
      schema: ["Article"],
      features: ["images"],
      updated: "2025-05-30",
    },
  ];

  return (
    <div className="p-4" style={FONTS}>
      <SerpSummarySection
        snapshotAgeDays={2}
        rows={rows}
        onRefresh={() => alert("Refresh snapshot")}
        onOpenPageAnalyzer={(row) =>
          alert(`Open Page Analyzer: #${row.rank} ${row.domain}`)
        }
        onSaveToList={(row) =>
          alert(`Save to list: #${row.rank} ${row.domain}`)
        }
        onAddCompetitor={(domain) => alert(`Add competitor: ${domain}`)}
        onHighlightInOverlay={(row) =>
          alert(`Highlight in SERP overlay: #${row.rank} ${row.domain}`)
        }
      />
    </div>
  );
}

