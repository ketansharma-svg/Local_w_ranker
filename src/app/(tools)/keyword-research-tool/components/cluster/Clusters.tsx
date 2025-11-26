"use client";

import * as React from "react";
import {
  Grid2x2,
  List as ListIcon,
  Settings2,
  Filter,
  ChevronDown,
  ChevronUp,
  Save,
  Download,
  MoreHorizontal,
  Layers3,
  BookmarkPlus,
  ClipboardList,
  Target,
  Sparkles,
  SquareStack,
  Video,
  Image as ImageIcon,
  MapPin,
  ShoppingCart,
  Newspaper,
  PanelsTopLeft,
  Edit2,
  Trash2,
  GitMerge,
  GitBranch,
  RefreshCw,
} from "lucide-react";

/* ------------------- shadcn/ui ------------------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import DemoClusterCanvasDrawer from "./ClusterDrawer";
import { AddToTrackerModal } from "@/src/app/organic-visibility/competitors/AddToTrack";

/* ------------------- Tokens ------------------- */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  muted: "var(--wr-muted,#6B7280)",
  text: "var(--wr-text-strong,#111827)",
  brand: "var(--wr-brand,#008CCD)",
  action: "var(--wr-action,#0077FF)",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};
const cn = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");
const formatInt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "k"
    : String(n);

/* ------------------- Types ------------------- */
type Intent =
  | "informational"
  | "commercial"
  | "transactional"
  | "local"
  | "navigational";
type Feature =
  | "fs"
  | "paa"
  | "video"
  | "images"
  | "local"
  | "shopping"
  | "news"
  | "sitelinks";
type PageType =
  | "Guide"
  | "Listicle"
  | "Category"
  | "PDP"
  | "Comparison"
  | "Review"
  | "Video"
  | "News";
type Mode = "domain" | "no-domain";

type ClusterRow = {
  id: string;
  head: string;
  size: number;
  totalVolume: number;
  avgWkd: number; // 0..100
  intent: { primary: Intent; mix: Partial<Record<Intent, number>> };
  features: Feature[];
  nearWinPct?: number; // 0..1
  cps: number; // 0..100
  recPageType: PageType;
};

/* ------------------- Telemetry stub ------------------- */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  const envelope = { event, ts: new Date().toISOString(), props };
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("kr-analytics", { detail: envelope }));
}

/* ------------------- Mock data ------------------- */
const MOCK_CLUSTERS: ClusterRow[] = [
  {
    id: "clu_1",
    head: "technical seo checklist",
    size: 18,
    totalVolume: 11400,
    avgWkd: 57,
    intent: {
      primary: "informational",
      mix: { informational: 0.68, commercial: 0.22, local: 0.1 },
    },
    features: ["fs", "paa", "images"],
    nearWinPct: 0.22,
    cps: 78,
    recPageType: "Listicle",
  },
  {
    id: "clu_2",
    head: "best technical seo tools",
    size: 12,
    totalVolume: 6400,
    avgWkd: 61,
    intent: {
      primary: "commercial",
      mix: { commercial: 0.64, informational: 0.26, local: 0.1 },
    },
    features: ["paa", "video", "sitelinks"],
    nearWinPct: 0.12,
    cps: 72,
    recPageType: "Comparison",
  },
  {
    id: "clu_3",
    head: "site speed audit",
    size: 10,
    totalVolume: 4200,
    avgWkd: 46,
    intent: {
      primary: "local",
      mix: { local: 0.6, informational: 0.3, commercial: 0.1 },
    },
    features: ["local", "images"],
    nearWinPct: 0.31,
    cps: 69,
    recPageType: "Guide",
  },
  {
    id: "clu_4",
    head: "schema markup guide",
    size: 15,
    totalVolume: 7200,
    avgWkd: 52,
    intent: {
      primary: "informational",
      mix: { informational: 0.8, commercial: 0.2 },
    },
    features: ["fs", "news", "sitelinks"],
    nearWinPct: 0.08,
    cps: 75,
    recPageType: "Guide",
  },
  {
    id: "clu_5",
    head: "seo vs sem",
    size: 9,
    totalVolume: 9800,
    avgWkd: 63,
    intent: {
      primary: "informational",
      mix: { informational: 0.55, commercial: 0.45 },
    },
    features: ["fs", "paa", "video"],
    nearWinPct: 0.18,
    cps: 66,
    recPageType: "Comparison",
  },
];

/* ------------------- “Backend” adapter ------------------- */
const api = {
  async list(): Promise<ClusterRow[]> {
    return structuredClone(MOCK_CLUSTERS);
  },
  async rename(id: string, head: string) {
    return { ok: true, id, head };
  },
  async mergePreview(sourceId: string, targetId: string) {
    const src = MOCK_CLUSTERS.find((c) => c.id === sourceId)!;
    const tgt = MOCK_CLUSTERS.find((c) => c.id === targetId)!;
    return {
      source: src,
      target: tgt,
      result: {
        head: tgt.head,
        size: src.size + tgt.size,
        volume: src.totalVolume + tgt.totalVolume,
        cps: Math.round((src.cps + tgt.cps) / 2 + 6),
      },
    };
  },
  async mergeApply(sourceId: string, targetId: string) {
    return { ok: true, sourceId, targetId };
  },
  async splitPreview(id: string, method: "intent" | "modifier" | "serp") {
    const base = MOCK_CLUSTERS.find((c) => c.id === id)!;
    return {
      base,
      buckets: [
        {
          name:
            method === "intent"
              ? "Info"
              : method === "modifier"
              ? "vs/compare"
              : "FS+PAA",
          size: Math.ceil(base.size * 0.55),
          volume: Math.ceil(base.totalVolume * 0.58),
        },
        {
          name: "Other",
          size: base.size - Math.ceil(base.size * 0.55),
          volume: base.totalVolume - Math.ceil(base.totalVolume * 0.58),
        },
      ],
    };
  },
  async splitApply(id: string, method: "intent" | "modifier" | "serp") {
    return { ok: true, id, method };
  },
  async reclusterPreview(id: string) {
    const c = MOCK_CLUSTERS.find((cc) => cc.id === id)!;
    return {
      id,
      before: c.size,
      after: c.size + 3,
      change: "+3 members (semantic match)",
    };
  },
  async reclusterApply(id: string) {
    return { ok: true, id };
  },
  async delete(id: string) {
    return { ok: true, id };
  },
};

/* ------------------- UI atoms ------------------- */
const WKDband = (score: number) => {
  if (score <= 29) return { label: "Easy", color: TK.ok };
  if (score <= 54) return { label: "Moderate", color: TK.warn };
  if (score <= 74) return { label: "Difficult", color: "#D97706" };
  return { label: "Very", color: TK.critical };
};

const FEAT_COLORS: Record<Feature, string> = {
  fs: "#F59E0B", // amber
  paa: "#8B5CF6", // violet
  video: "#EF4444", // red
  images: "#22C55E", // green
  local: "#10B981", // teal
  shopping: "#0EA5E9", // sky
  news: "#3B82F6", // blue
  sitelinks: "#64748B", // slate
};
const hexToRgba = (hex: string, a: number) => {
  const n = hex.replace("#", "");
  const bigint = parseInt(n, 16);
  const r = (bigint >> 16) & 255,
    g = (bigint >> 8) & 255,
    b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
};
const FeatureGlyph: React.FC<{ f: Feature }> = ({ f }) => {
  const common = "h-4 w-4";
  const color = FEAT_COLORS[f];
  const style = { color };
  switch (f) {
    case "fs":
      return <Sparkles className={common} style={style} />;
    case "paa":
      return <SquareStack className={common} style={style} />;
    case "video":
      return <Video className={common} style={style} />;
    case "images":
      return <ImageIcon className={common} style={style} />;
    case "local":
      return <MapPin className={common} style={style} />;
    case "shopping":
      return <ShoppingCart className={common} style={style} />;
    case "news":
      return <Newspaper className={common} style={style} />;
    case "sitelinks":
      return <PanelsTopLeft className={common} style={style} />;
  }
};
const ColoredFeatureIcon: React.FC<{ f: Feature }> = ({ f }) => {
  const bg = hexToRgba(FEAT_COLORS[f], 0.14);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full p-1.5 cursor-default"
      style={{ background: bg }}
    >
      <FeatureGlyph f={f} />
    </span>
  );
};

const Chip: React.FC<{ children: React.ReactNode; active?: boolean }> = ({
  children,
  active,
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]",
      active && "font-semibold"
    )}
    style={{
      borderColor: TK.borderLight,
      background: active ? TK.pastel : "#FFF",
    }}
  >
    {children}
  </span>
);

const ToggleChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}> = ({ label, active, onClick, title }) => (
  <button
    type="button"
    className={cn(
      "h-8 px-3 rounded-full border text-sm cursor-pointer",
      active ? "font-semibold" : "hover:bg-[#F7FAFC]"
    )}
    style={{
      borderColor: TK.borderLight,
      background: active ? TK.pastel : "#FFF",
    }}
    onClick={onClick}
    aria-pressed={active}
    title={title}
  >
    {label}
  </button>
);

const DOT = ({ color }: { color: string }) => (
  <span
    className="inline-block rounded-full"
    style={{ width: 8, height: 8, background: color }}
  />
);

/* ----- Intent Mix (progressive bar + smart popover) ----- */
const INTENT_COLORS: Record<Intent, string> = {
  informational: "#6B7280",
  commercial: "#3B82F6",
  transactional: "#0EA5E9",
  local: "#8B5CF6",
  navigational: "#10B981",
};
const IntentMixBar: React.FC<{ mix: Partial<Record<Intent, number>> }> = ({
  mix,
}) => {
  const order: Intent[] = [
    "informational",
    "commercial",
    "transactional",
    "local",
    "navigational",
  ];
  const total = order.reduce((s, k) => s + (mix[k] || 0), 0) || 1;
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 group cursor-pointer"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          aria-label="Intent mix breakdown"
        >
          <div className="w-40 h-2 rounded overflow-hidden bg-[#E5E7EB] relative">
            <div className="flex h-full">
              {order.map((k) => {
                const w = ((mix[k] || 0) / total) * 100;
                if (w <= 0) return null;
                return (
                  <span
                    key={k}
                    style={{ width: `${w}%`, background: INTENT_COLORS[k] }}
                    className="h-full block"
                  />
                );
              })}
            </div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[220px] p-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{ background: "#FFF", borderColor: TK.borderLight }}
      >
        <div
          className="text-[12px] font-medium mb-1"
          style={{ color: TK.text }}
        >
          Intent breakdown
        </div>
        <ul className="space-y-1 text-[12px]">
          {order.map((k) => {
            const pct = Math.round(((mix[k] || 0) / total) * 100);
            return (
              <li key={k} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 capitalize">
                  <DOT color={INTENT_COLORS[k]} /> {k}
                </span>
                <span style={{ color: TK.text }}>{pct}%</span>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

const CPSBar: React.FC<{ score: number }> = ({ score }) => (
  <div className="inline-flex items-center gap-2">
    <div className="h-2 w-20 rounded bg-[#E5E7EB] relative overflow-hidden">
      <span
        className="absolute left-0 top-0 h-full"
        style={{ width: `${score}%`, background: TK.action }}
      />
    </div>
    <span className="text-sm font-semibold">{score}</span>
  </div>
);

/* ------------------- Column Manager ------------------- */
type ColumnKey =
  | "cluster"
  | "cps"
  | "volume"
  | "wkd_avg"
  | "intent"
  | "features"
  | "nearwin"
  | "page_type"
  | "actions";
const DEFAULT_COLUMNS_NO_DOMAIN: ColumnKey[] = [
  "cluster",
  "cps",
  "volume",
  "wkd_avg",
  "intent",
  "features",
  "page_type",
  "actions",
];
const DEFAULT_COLUMNS_DOMAIN: ColumnKey[] = [
  "cluster",
  "cps",
  "volume",
  "wkd_avg",
  "intent",
  "features",
  "nearwin",
  "page_type",
  "actions",
];

/* ------------------- Filters/Views state types ------------------- */
type ViewName =
  | "Default"
  | "Hub Opportunities"
  | "Easy Topic Hubs"
  | "Near‑Win Clusters"
  | "Commercial Topics"
  | "Informational Topics";

type Filters = {
  q: string;
  intent: Intent[];
  wkdBands: ("Easy" | "Moderate" | "Difficult" | "Very")[];
  cpsRange: "70+" | "50-69" | "<50" | null;
  features: Feature[];
  nearWinOnly: boolean;
  volumeMin?: number;
  wkdAvgMax?: number;
  sizeMin?: number;
};

/* ------------------- Column Manager ------------------- */
const ColumnManager: React.FC<{
  mode: Mode;
  value: ColumnKey[];
  onChange: (v: ColumnKey[]) => void;
}> = ({ mode, value, onChange }) => {
  const ALL: { key: ColumnKey; label: string }[] = [
    { key: "cluster", label: "Cluster" },
    { key: "cps", label: "CPS" },
    { key: "volume", label: "Volume" },
    { key: "wkd_avg", label: "Avg WKD" },
    { key: "intent", label: "Intent Mix" },
    { key: "features", label: "SERP" },
    { key: "nearwin", label: "Near‑Win %" },
    { key: "page_type", label: "Rec. Page" },
    { key: "actions", label: "Actions" },
  ];
  const reset = () =>
    onChange(
      mode === "domain" ? DEFAULT_COLUMNS_DOMAIN : DEFAULT_COLUMNS_NO_DOMAIN
    );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 px-3 cursor-pointer">
          <Settings2 className="h-4 w-4 mr-2" /> Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px]"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="text-sm font-medium mb-2">Visible columns</div>
        <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
          {ALL.map((c) => (
            <label
              key={c.key}
              className="flex items-center justify-between text-sm py-0.5"
            >
              <span>{c.label}</span>
              <Checkbox
                checked={value.includes(c.key)}
                onCheckedChange={(v) => {
                  const on = Boolean(v);
                  onChange(
                    on ? [...value, c.key] : value.filter((x) => x !== c.key)
                  );
                }}
              />
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between">
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() =>
              krTrack("kr.clusters.column_visibility_changed", { cols: value })
            }
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ------------------- Header sort with tooltip ------------------- */
const HeaderSort: React.FC<{
  label: string;
  tip?: string;
  active?: boolean;
  dir?: "asc" | "desc";
  onSort: (dir: "asc" | "desc") => void;
}> = ({ label, tip, active, dir, onSort }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        className="inline-flex items-center gap-1 cursor-pointer select-none"
        onClick={() =>
          onSort(!active ? "desc" : dir === "desc" ? "asc" : "desc")
        }
        aria-pressed={active}
        title={label}
      >
        <span>{label}</span>
        {active ? (
          dir === "desc" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )
        ) : (
          <ChevronDown className="h-4 w-4 opacity-40" />
        )}
      </button>
    </TooltipTrigger>
    {tip && (
      <TooltipContent className="max-w-[260px] text-xs">{tip}</TooltipContent>
    )}
  </Tooltip>
);

/* ------------------- Saved Views ------------------- */
const SavedViews: React.FC<{
  mode: Mode;
  onApply: (
    name: ViewName,
    preset: {
      filters: Partial<Filters>;
      columns?: ColumnKey[];
      sort?: { key: ColumnKey; dir: "asc" | "desc" };
      prioritizeNearWins?: boolean;
    }
  ) => void;
}> = ({ mode, onApply }) => {
  const views: { name: ViewName; preset: any }[] = [
    {
      name: "Default",
      preset: {
        filters: {
          intent: [],
          wkdBands: [],
          cpsRange: null,
          features: [],
          nearWinOnly: false,
          volumeMin: 0,
          wkdAvgMax: undefined,
          sizeMin: 0,
        },
        sort: { key: "cps", dir: "desc" },
        columns:
          mode === "domain"
            ? DEFAULT_COLUMNS_DOMAIN
            : DEFAULT_COLUMNS_NO_DOMAIN,
        prioritizeNearWins: mode === "domain",
      },
    },
    {
      name: "Hub Opportunities",
      preset: {
        filters: {
          cpsRange: "70+",
          features: ["fs", "paa"],
          wkdBands: ["Moderate", "Difficult"],
        },
        sort: { key: "cps", dir: "desc" },
      },
    },
    {
      name: "Easy Topic Hubs",
      preset: {
        filters: { wkdBands: ["Easy", "Moderate"], cpsRange: "50-69" },
        sort: { key: "cps", dir: "desc" },
      },
    },
    {
      name: "Near‑Win Clusters",
      preset: {
        filters: { nearWinOnly: true },
        sort: { key: "nearwin", dir: "desc" },
        prioritizeNearWins: true,
      },
    },
    {
      name: "Commercial Topics",
      preset: {
        filters: { intent: ["commercial", "transactional"] },
        sort: { key: "cps", dir: "desc" },
      },
    },
    {
      name: "Informational Topics",
      preset: {
        filters: { intent: ["informational"] },
        sort: { key: "cps", dir: "desc" },
      },
    },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 px-3 cursor-pointer">
          <Save className="h-4 w-4 mr-2" /> Saved Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Apply view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {views.map((v) => (
          <DropdownMenuItem
            key={v.name}
            onClick={() => onApply(v.name, v.preset)}
          >
            {v.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ------------------- View Toggle (moved to header) ------------------- */
const ViewToggle: React.FC<{
  view: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
}> = ({ view, onChange }) => (
  <div
    className="inline-flex items-center gap-0.5 rounded-[6px] p-0.5"
    style={{ border: `1px solid ${TK.border}`, background: "#FFF" }}
  >
    <button
      className={cn(
        "h-8 px-3 rounded-[6px] cursor-pointer",
        view === "grid"
          ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold"
          : "text-[var(--wr-muted,#6B7280)]"
      )}
      onClick={() => onChange("grid")}
      title="Grid view"
    >
      <Grid2x2 className="h-4 w-4 mr-1 inline" />
      Grid
    </button>
    <button
      className={cn(
        "h-8 px-3 rounded-[6px] cursor-pointer",
        view === "list"
          ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold"
          : "text-[var(--wr-muted,#6B7280)]"
      )}
      onClick={() => onChange("list")}
      title="List view"
    >
      <ListIcon className="h-4 w-4 mr-1 inline" />
      List
    </button>
  </div>
);

/* ------------------- Section Header (with branded icon + controls) ------------------- */
const SectionHeader: React.FC<{
  title: string;
  right: React.ReactNode;
}> = ({ title, right }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2">
      <Layers3 className="h-5 w-5" style={{ color: TK.brand }} aria-hidden />
      <h2 className="text-lg font-semibold" style={{ color: TK.text }}>
        {title}
      </h2>
    </div>
    <div className="flex items-center gap-2">{right}</div>
  </div>
);

/* ------------------- Main Tab Component ------------------- */
export function ClustersTab({
  mode = "domain",
  initialRows,
  onOpenCanvas,
  onAddTracking,
  onCreateTask,
  onExport,
  onSaveList,
}: {
  mode?: Mode;
  initialRows?: ClusterRow[];
  onOpenCanvas?: (id: string) => void;
  onAddTracking?: (ids: string[]) => void;
  onCreateTask?: (ids: string[]) => void;
  onExport?: (ids: string[], format: "csv" | "xlsx" | "pdf") => void;
  onSaveList?: (ids: string[]) => void;
}) {
  /* ---------------- Local state ---------------- */
  const [rows, setRows] = React.useState<ClusterRow[]>(
    initialRows ?? MOCK_CLUSTERS
  );
  const [view, setView] = React.useState<"grid" | "list">("list");
  const [filters, setFilters] = React.useState<Filters>({
    q: "",
    intent: [],
    wkdBands: [],
    cpsRange: null,
    features: [],
    nearWinOnly: false,
    volumeMin: 0,
    wkdAvgMax: undefined,
    sizeMin: 0,
  });
  const [columns, setColumns] = React.useState<ColumnKey[]>(
    mode === "domain" ? DEFAULT_COLUMNS_DOMAIN : DEFAULT_COLUMNS_NO_DOMAIN
  );
  const [prioritizeNearWins, setPrioritizeNearWins] = React.useState<boolean>(
    mode === "domain"
  );
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [page, setPage] = React.useState<number>(1);
  const [sort, setSort] = React.useState<{
    key: ColumnKey;
    dir: "asc" | "desc";
  }>({ key: "cps", dir: "desc" });

  // Action modal state
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [mergeSource, setMergeSource] = React.useState<ClusterRow | null>(null);
  const [mergeTargetId, setMergeTargetId] = React.useState<string | null>(null);
  const [mergePreview, setMergePreview] = React.useState<any | null>(null);

  const [splitOpen, setSplitOpen] = React.useState(false);
  const [splitSource, setSplitSource] = React.useState<ClusterRow | null>(null);
  const [splitMethod, setSplitMethod] = React.useState<
    "intent" | "modifier" | "serp"
  >("intent");
  const [splitPreview, setSplitPreview] = React.useState<any | null>(null);

  const [reclusterOpen, setReclusterOpen] = React.useState(false);
  const [reclusterSource, setReclusterSource] =
    React.useState<ClusterRow | null>(null);
  const [reclusterPreview, setReclusterPreview] = React.useState<any | null>(
    null
  );

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameSource, setRenameSource] = React.useState<ClusterRow | null>(
    null
  );
  const [renameHead, setRenameHead] = React.useState("");

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteSource, setDeleteSource] = React.useState<ClusterRow | null>(
    null
  );

  React.useEffect(() => {
    setColumns(
      mode === "domain" ? DEFAULT_COLUMNS_DOMAIN : DEFAULT_COLUMNS_NO_DOMAIN
    );
    setPrioritizeNearWins(mode === "domain");
  }, [mode]);

  /* --------------- Derived rows: filter + sort + paginate --------------- */
  const filtered = React.useMemo(() => {
    const q = filters.q.toLowerCase();
    function band(score: number) {
      if (score <= 29) return "Easy";
      if (score <= 54) return "Moderate";
      if (score <= 74) return "Difficult";
      return "Very";
    }
    return rows.filter((r) => {
      if (q && !r.head.toLowerCase().includes(q)) return false;
      if (filters.intent.length && !filters.intent.includes(r.intent.primary))
        return false;
      if (
        filters.wkdBands.length &&
        !filters.wkdBands.includes(band(r.avgWkd) as any)
      )
        return false;
      if (filters.cpsRange === "70+" && r.cps < 70) return false;
      if (filters.cpsRange === "50-69" && (r.cps < 50 || r.cps > 69))
        return false;
      if (filters.cpsRange === "<50" && r.cps >= 50) return false;
      if (
        filters.features.length &&
        !filters.features.every((f) => r.features.includes(f))
      )
        return false;
      if (filters.nearWinOnly && (r.nearWinPct || 0) <= 0) return false;
      if (
        (filters.volumeMin || 0) > 0 &&
        r.totalVolume < (filters.volumeMin || 0)
      )
        return false;
      if (filters.wkdAvgMax != null && r.avgWkd > (filters.wkdAvgMax || 100))
        return false;
      if ((filters.sizeMin || 0) > 0 && r.size < (filters.sizeMin || 0))
        return false;
      return true;
    });
  }, [rows, filters]);

  const sorted = React.useMemo(() => {
    const copy = [...filtered];
    if (prioritizeNearWins && mode === "domain") {
      copy.sort(
        (a, b) => (b.nearWinPct || 0) - (a.nearWinPct || 0) || b.cps - a.cps
      );
      return copy;
    }
    copy.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "cluster":
          return dir * a.head.localeCompare(b.head);
        case "cps":
          return dir * (a.cps - b.cps);
        case "volume":
          return dir * (a.totalVolume - b.totalVolume);
        case "wkd_avg":
          return dir * (a.avgWkd - b.avgWkd);
        case "intent":
          return dir * a.intent.primary.localeCompare(b.intent.primary);
        case "features":
          return dir * (a.features.length - b.features.length);
        case "nearwin":
          return dir * ((a.nearWinPct || 0) - (b.nearWinPct || 0));
        case "page_type":
          return dir * a.recPageType.localeCompare(b.recPageType);
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sort, prioritizeNearWins, mode]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = React.useMemo(
    () => sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [sorted, page, pageSize]
  );
  React.useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  const selectedIds = React.useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );
  const allOnPageSelected =
    paged.length > 0 && paged.every((r) => selected[r.id]);

  /* ---------------- UI helpers ---------------- */
  const toggleSelectAllOnPage = (v: boolean) => {
    const next = { ...selected };
    paged.forEach((r) => (next[r.id] = v));
    setSelected(next);
  };
  const toggleFilterChip = <T extends string>(
    arr: T[],
    val: T,
    setter: (v: T[]) => void
  ) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const [Track, setTrack] = React.useState(false);
  const openTrack = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (e) e.stopPropagation();
    setTrack(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeTrack = () => {
    setTrack(false);
  };

  /* ---------------- Controls Bar (Filters) ---------------- */
  const filterBar = (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Input
            className="w-[320px] pl-8"
            placeholder="Search cluster or head term…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            aria-hidden
          >
            <circle cx="7" cy="7" r="6" fill="none" stroke="#9E9E9E" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#9E9E9E" />
          </svg>
        </div>

        {/* Intent chips (multi) */}
        {(
          ["informational", "commercial", "transactional", "local"] as Intent[]
        ).map((i) => (
          <ToggleChip
            key={i}
            label={`Intent: ${i[0].toUpperCase() + i.slice(1)}`}
            active={filters.intent.includes(i)}
            onClick={() =>
              toggleFilterChip(filters.intent, i, (v) =>
                setFilters({ ...filters, intent: v })
              )
            }
          />
        ))}

        {/* WKD bands (multi) */}
        {(["Easy", "Moderate", "Difficult", "Very"] as const).map((b) => (
          <ToggleChip
            key={b}
            label={`WKD: ${b}`}
            active={filters.wkdBands.includes(b)}
            onClick={() =>
              toggleFilterChip(filters.wkdBands, b, (v) =>
                setFilters({ ...filters, wkdBands: v })
              )
            }
          />
        ))}

        {/* CPS Range — DROPDOWN (single-select per spec) */}
        <div className="inline-flex items-center gap-1">
          <span className="text-[12px] text-muted-foreground">CPS</span>
          <Select
            value={filters.cpsRange ?? "all"}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                cpsRange: v === "all" ? null : (v as Filters["cpsRange"]),
              })
            }
          >
            <SelectTrigger className="h-8 w-[120px] px-2 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="70+">70+</SelectItem>
              <SelectItem value="50-69">50–69</SelectItem>
              <SelectItem value="<50">&lt;50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SERP feature chips (multi) */}
        {(["fs", "paa", "local", "shopping"] as Feature[]).map((f) => (
          <ToggleChip
            key={f}
            label={`SERP: ${f.toUpperCase()}`}
            active={filters.features.includes(f)}
            onClick={() =>
              toggleFilterChip(filters.features, f, (v) =>
                setFilters({ ...filters, features: v })
              )
            }
            title="SERP feature"
          />
        ))}

        {mode === "domain" && (
          <ToggleChip
            label="Near‑Win clusters"
            active={filters.nearWinOnly}
            onClick={() =>
              setFilters({ ...filters, nearWinOnly: !filters.nearWinOnly })
            }
          />
        )}

        {/* Range popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-3 cursor-pointer">
              <Filter className="h-4 w-4 mr-2" />
              Ranges
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[320px]"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium">Total Volume ≥</label>
              <Input
                type="number"
                value={filters.volumeMin ?? 0}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    volumeMin: Number(e.target.value || 0),
                  })
                }
              />
              <label className="text-sm font-medium">Avg WKD ≤</label>
              <Input
                type="number"
                value={filters.wkdAvgMax ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    wkdAvgMax: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
              <label className="text-sm font-medium">Cluster size ≥</label>
              <Input
                type="number"
                value={filters.sizeMin ?? 0}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sizeMin: Number(e.target.value || 0),
                  })
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      volumeMin: 0,
                      wkdAvgMax: undefined,
                      sizeMin: 0,
                    })
                  }
                >
                  Reset
                </Button>
                <Button size="sm" className="cursor-pointer">
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <SavedViews
          mode={mode}
          onApply={(name, preset) => {
            setFilters({ ...filters, ...preset.filters });
            setColumns(
              preset.columns ??
                (mode === "domain"
                  ? DEFAULT_COLUMNS_DOMAIN
                  : DEFAULT_COLUMNS_NO_DOMAIN)
            );
            setSort(preset.sort ?? { key: "cps", dir: "desc" });
            setPrioritizeNearWins(
              !!preset.prioritizeNearWins && mode === "domain"
            );
            krTrack("kr.clusters.view_changed", { view: name });
          }}
        />

        {mode === "domain" && (
          <ToggleChip
            label="Prioritize Near‑Wins"
            active={prioritizeNearWins}
            onClick={() => setPrioritizeNearWins((v) => !v)}
          />
        )}

        <Button
          variant="ghost"
          className="ml-auto h-8 px-3 cursor-pointer"
          onClick={() =>
            setFilters({
              q: "",
              intent: [],
              wkdBands: [],
              cpsRange: null,
              features: [],
              nearWinOnly: false,
              volumeMin: 0,
              wkdAvgMax: undefined,
              sizeMin: 0,
            })
          }
        >
          Clear
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div
          className="mt-2 w-full p-2 rounded border bg-[#F5F7FA] flex items-center gap-2"
          style={{ borderColor: TK.borderLight }}
        >
          <span className="text-sm">
            <strong>{selectedIds.length}</strong> selected
          </span>
          <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateTask?.(selectedIds)}
          >
            <ClipboardList
              className="h-4 w-4 mr-1"
              style={{ color: TK.brand }}
            />{" "}
            Create Task
          </Button>
          {mode === "domain" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddTracking?.(selectedIds)}
            >
              <Target className="h-4 w-4 mr-1" style={{ color: TK.brand }} />{" "}
              Add to Tracking
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSaveList?.(selectedIds)}
          >
            <BookmarkPlus
              className="h-4 w-4 mr-1"
              style={{ color: TK.brand }}
            />{" "}
            Save to List
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="cursor-pointer">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onExport?.(selectedIds, "csv")}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.(selectedIds, "xlsx")}>
                XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.(selectedIds, "pdf")}>
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected({})}
              className="cursor-pointer"
            >
              Clear selection
            </Button>
          </div>
        </div>
      )}
    </>
  );

  /* ---------------- Header controls (moved items) ---------------- */
  const headerRight = (
    <>
      <ViewToggle view={view} onChange={setView} />
      {view === "list" && (
        <ColumnManager mode={mode} value={columns} onChange={setColumns} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-8 px-3 cursor-pointer">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              onExport?.(
                filtered.map((r) => r.id),
                "csv"
              )
            }
          >
            CSV (filtered)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              onExport?.(
                filtered.map((r) => r.id),
                "xlsx"
              )
            }
          >
            XLSX (filtered)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              onExport?.(
                filtered.map((r) => r.id),
                "pdf"
              )
            }
          >
            PDF (filtered)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
  const [drawerRow, setDrawerRow] = React.useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
  function Drawer({
    title,
    children,
    onClose,
  }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) {
    return (
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/20" onClick={onClose} />
        <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-semibold"></div>
            <button
              onClick={onClose}
              className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
            >
              ✕
            </button>
          </div>
          {children}
        </aside>
      </div>
    );
  }

  /* ---------------- List (Table) View ---------------- */
  const listView = (
    <div className="border rounded bg-white" style={{ borderColor: TK.border }}>
      {drawerRow && (
        <Drawer title="Drawer" onClose={closeDrawer}>
          <DemoClusterCanvasDrawer />
        </Drawer>
      )}
      {Track && (
        <div
          style={{
            display: "hidden",
            position: "absolute",
            zIndex: 1001,
            padding: "20px",
          }}
          onClick={closeTrack}
        >
          <AddToTrackerModal
            open={true}
            onOpenChange={() => {}}
            onClose={closeTrack}
            plan="free"
            limit={1}
            currentTracked={[]}
            newCompetitor={{} as any}
            onReplace={() => {}}
          />
        </div>
      )}
      <Table className="text-sm">
        <TableHeader
          className="sticky top-0 bg-white z-10"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <TableRow>
            <TableHead className="w-[46px] text-center">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={(v) => toggleSelectAllOnPage(Boolean(v))}
              />
            </TableHead>
            {columns.includes("cluster") && (
              <TableHead className="min-w-[320px]">
                <HeaderSort
                  label="Cluster"
                  tip="Head term of the topic; click to open Canvas."
                  active={sort.key === "cluster"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "cluster", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("cps") && (
              <TableHead className="w-[120px] text-right">
                <HeaderSort
                  label="CPS"
                  tip="Cluster Potential Score 0–100 (WOS + uniqueness + link leverage)."
                  active={sort.key === "cps"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "cps", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("volume") && (
              <TableHead className="w-[120px] text-right">
                <HeaderSort
                  label="Volume"
                  tip="Total monthly searches for this cluster."
                  active={sort.key === "volume"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "volume", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("wkd_avg") && (
              <TableHead className="w-[120px] text-center">
                <HeaderSort
                  label="Avg WKD"
                  tip="Average SERP competition across members."
                  active={sort.key === "wkd_avg"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "wkd_avg", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("intent") && (
              <TableHead className="w-[160px] text-center">
                <HeaderSort
                  label="Intent Mix"
                  tip="Primary and secondary intents across the cluster."
                  active={sort.key === "intent"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "intent", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("features") && (
              <TableHead className="w-[180px] text-center">
                <HeaderSort
                  label="SERP"
                  tip="Common SERP surfaces: FS, PAA, Video, Local, etc."
                  active={sort.key === "features"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "features", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("nearwin") && mode === "domain" && (
              <TableHead className="w-[120px] text-right">
                <HeaderSort
                  label="Near‑Win"
                  tip="% of terms ranking #4–#15."
                  active={sort.key === "nearwin"}
                  dir={sort.dir}
                  onSort={(d) => setSort({ key: "nearwin", dir: d })}
                />
              </TableHead>
            )}
            {columns.includes("page_type") && (
              <TableHead className="w-[140px] text-center">Rec. Page</TableHead>
            )}
            {columns.includes("actions") && (
              <TableHead className="w-[280px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {paged.map((r) => {
            const band = WKDband(r.avgWkd);
            const otherTargets = rows.filter((c) => c.id !== r.id);
            return (
              <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                <TableCell className="text-center">
                  <Checkbox
                    checked={!!selected[r.id]}
                    onCheckedChange={(v) =>
                      setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))
                    }
                  />
                </TableCell>

                {columns.includes("cluster") && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
                        onClick={() => onOpenCanvas?.(r.id)}
                        title="Open Cluster Canvas"
                      >
                        {r.head}
                      </button>
                      <Chip>{r.size} kws</Chip>
                    </div>
                  </TableCell>
                )}

                {columns.includes("cps") && (
                  <TableCell className="text-right">
                    <CPSBar score={r.cps} />
                  </TableCell>
                )}

                {columns.includes("volume") && (
                  <TableCell className="text-right">
                    {formatInt(r.totalVolume)}
                  </TableCell>
                )}

                {columns.includes("wkd_avg") && (
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: band.color }}
                      />
                      <span className="text-sm font-medium">{r.avgWkd}</span>
                    </div>
                  </TableCell>
                )}

                {columns.includes("intent") && (
                  <TableCell className="text-center">
                    <IntentMixBar mix={r.intent.mix} />
                  </TableCell>
                )}

                {columns.includes("features") && (
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5">
                      {r.features.map((f) => (
                        <Tooltip key={f}>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex rounded-full"
                              title={f.toUpperCase()}
                            >
                              <ColoredFeatureIcon f={f} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{f.toUpperCase()}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TableCell>
                )}

                {columns.includes("nearwin") && mode === "domain" && (
                  <TableCell className="text-right">
                    {r.nearWinPct != null
                      ? `${Math.round(r.nearWinPct * 100)}%`
                      : "—"}
                  </TableCell>
                )}

                {columns.includes("page_type") && (
                  <TableCell className="text-center">{r.recPageType}</TableCell>
                )}

                {columns.includes("actions") && (
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openDrawer}
                            className="cursor-pointer"
                          >
                            <Layers3
                              className="h-4 w-4 mr-1"
                              style={{ color: TK.brand }}
                            />{" "}
                            Open
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open Cluster Canvas</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCreateTask?.([r.id])}
                            className="cursor-pointer"
                          >
                            <ClipboardList
                              className="h-4 w-4 mr-1"
                              style={{ color: TK.brand }}
                            />{" "}
                            Task
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create Task</TooltipContent>
                      </Tooltip>
                      {mode === "domain" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={openTrack}
                              className="cursor-pointer"
                            >
                              <Target
                                className="h-4 w-4 mr-1"  
                                style={{ color: TK.brand }}
                              />{" "}
                              Track
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add to Tracking</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onSaveList?.([r.id])}
                            className="cursor-pointer"
                          >
                            <BookmarkPlus
                              className="h-4 w-4"
                              style={{ color: TK.brand }}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save to List</TooltipContent>
                      </Tooltip>

                      {/* Overflow actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameSource(r);
                              setRenameHead(r.head);
                              setRenameOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4 mr-2" /> Rename…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setMergeSource(r);
                              setMergeTargetId(
                                rows.find((c) => c.id !== r.id)?.id ?? null
                              );
                              setMergePreview(null);
                              setMergeOpen(true);
                            }}
                            disabled={
                              rows.filter((c) => c.id !== r.id).length === 0
                            }
                          >
                            <GitMerge className="h-4 w-4 mr-2" /> Merge into…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSplitSource(r);
                              setSplitMethod("intent");
                              setSplitPreview(null);
                              setSplitOpen(true);
                            }}
                          >
                            <GitBranch className="h-4 w-4 mr-2" /> Split…
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setReclusterSource(r);
                              setReclusterPreview(null);
                              setReclusterOpen(true);
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" /> Recluster
                            (preview)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteSource(r);
                              setDeleteOpen(true);
                            }}
                            className="text-[var(--wr-critical,#EF4444)]"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete…
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {paged.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length + 2}
                className="text-center py-8 text-muted-foreground"
              >
                No clusters match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-t"
        style={{ borderColor: TK.borderLight }}
      >
        <div className="text-sm text-muted-foreground">
          Rows: {sorted.length}
        </div>
        <div className="inline-flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="cursor-pointer"
          >
            Prev
          </Button>
          <span className="text-sm">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="cursor-pointer"
          >
            Next
          </Button>
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page size</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[88px] px-2 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------- Grid view ---------------- */
  const gridView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {paged.map((r) => {
        const band = WKDband(r.avgWkd);
        const otherTargets = rows.filter((c) => c.id !== r.id);
        return (
          <div
            key={r.id}
            className="rounded-md border bg-white"
            style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between border-b"
              style={{ borderColor: TK.borderLight }}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!selected[r.id]}
                  onCheckedChange={(v) =>
                    setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))
                  }
                />
                <button
                  className="text-[15px] font-semibold text-left text-[var(--wr-text-strong,#111827)] hover:underline underline-offset-2 cursor-pointer"
                  onClick={() => onOpenCanvas?.(r.id)}
                  title="Open Cluster Canvas"
                >
                  {r.head}
                </button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="cursor-pointer"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameSource(r);
                      setRenameHead(r.head);
                      setRenameOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" /> Rename…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setMergeSource(r);
                      setMergeTargetId(otherTargets[0]?.id ?? null);
                      setMergePreview(null);
                      setMergeOpen(true);
                    }}
                    disabled={otherTargets.length === 0}
                  >
                    <GitMerge className="h-4 w-4 mr-2" /> Merge into…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSplitSource(r);
                      setSplitMethod("intent");
                      setSplitPreview(null);
                      setSplitOpen(true);
                    }}
                  >
                    <GitBranch className="h-4 w-4 mr-2" /> Split…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setReclusterSource(r);
                      setReclusterPreview(null);
                      setReclusterOpen(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Recluster
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteSource(r);
                      setDeleteOpen(true);
                    }}
                    className="text-[var(--wr-critical,#EF4444)]"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="px-3 py-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  CPS
                </div>
                <CPSBar score={r.cps} />
              </div>
              <div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Total Volume
                </div>
                <div className="font-semibold">{formatInt(r.totalVolume)}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Avg WKD
                </div>
                <div className="inline-flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: band.color }}
                  />
                  <span className="text-sm font-medium">{r.avgWkd}</span>
                  <span className="text-xs" style={{ color: TK.muted }}>
                    ({band.label})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Intent mix
                </div>
                <IntentMixBar mix={r.intent.mix} />
              </div>
            </div>

            <div className="px-3 py-1.5 flex items-center gap-2 flex-wrap">
              {r.features.map((f) => (
                <Chip key={f}>
                  <ColoredFeatureIcon f={f} /> {f.toUpperCase()}
                </Chip>
              ))}
              {mode === "domain" && r.nearWinPct != null && r.nearWinPct > 0 ? (
                <Chip active>Near‑Win {(r.nearWinPct * 100).toFixed(0)}%</Chip>
              ) : null}
              <Chip>
                Rec. Page: <b className="ml-1">{r.recPageType}</b>
              </Chip>
              <Chip>{r.size} kws</Chip>
            </div>
          </div>
        );
      })}
      {paged.length === 0 && (
        <div className="col-span-full text-center text-sm text-muted-foreground py-10">
          No clusters match your filters.
        </div>
      )}
    </div>
  );

  /* ---------------- Render ------------------- */
  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="space-y-3"
        style={{
          fontFamily: "Inter, Inter Fallback, ui-sans-serif, system-ui",
        }}
      >
        {/* Section header with controls (view toggle + columns + export) */}
        <SectionHeader title="Clusters" right={headerRight} />

        {/* Filter bar under header */}
        {filterBar}

        {/* Body */}
        {view === "grid" ? gridView : listView}
      </div>

      {/* ---------------- Modals ---------------- */}
      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Rename cluster</DialogTitle>
            <DialogDescription>
              Only the head term changes; keywords stay in the cluster.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameHead}
            onChange={(e) => setRenameHead(e.target.value)}
            placeholder="New head term…"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!renameSource) return;
                await api.rename(renameSource.id, renameHead);
                setRows((rs) =>
                  rs.map((r) =>
                    r.id === renameSource.id ? { ...r, head: renameHead } : r
                  )
                );
                setRenameOpen(false);
              }}
              className="cursor-pointer"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Merge clusters</DialogTitle>
            <DialogDescription>
              Select a target cluster to merge into. Preview updates before
              applying.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <b>Source:</b> {mergeSource?.head}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Target</span>
              <Select
                value={mergeTargetId ?? undefined}
                onValueChange={(v) => setMergeTargetId(v)}
              >
                <SelectTrigger className="h-9 w-[280px] px-2 cursor-pointer">
                  <SelectValue placeholder="Choose target…" />
                </SelectTrigger>
                <SelectContent>
                  {rows
                    .filter((c) => c.id !== mergeSource?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.head}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!mergeSource || !mergeTargetId) return;
                  const prev = await api.mergePreview(
                    mergeSource.id,
                    mergeTargetId
                  );
                  setMergePreview(prev);
                }}
                className="cursor-pointer"
              >
                Preview
              </Button>
            </div>

            {mergePreview && (
              <div
                className="rounded border p-3 text-sm"
                style={{ borderColor: TK.borderLight }}
              >
                <div className="font-medium mb-1">Preview result</div>
                <div>
                  Target: <b>{mergePreview.target.head}</b>
                </div>
                <div>
                  New size: <b>{mergePreview.result.size}</b> • Total volume:{" "}
                  <b>{formatInt(mergePreview.result.volume)}</b> • CPS:{" "}
                  <b>{mergePreview.result.cps}</b>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMergeOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              disabled={!mergeSource || !mergeTargetId}
              onClick={async () => {
                if (!mergeSource || !mergeTargetId) return;
                await api.mergeApply(mergeSource.id, mergeTargetId);
                setRows((rs) => rs.filter((r) => r.id !== mergeSource.id)); // demo: remove source
                setMergeOpen(false);
              }}
              className="cursor-pointer"
            >
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split */}
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Split cluster</DialogTitle>
            <DialogDescription>
              Choose a method to preview buckets before applying.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-sm">Method</span>
            <Select
              value={splitMethod}
              onValueChange={(v: any) => setSplitMethod(v)}
            >
              <SelectTrigger className="h-9 w-[220px] px-2 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intent">By intent</SelectItem>
                <SelectItem value="modifier">By modifiers</SelectItem>
                <SelectItem value="serp">By SERP separation</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!splitSource) return;
                const prev = await api.splitPreview(
                  splitSource.id,
                  splitMethod
                );
                setSplitPreview(prev);
              }}
              className="cursor-pointer"
            >
              Preview
            </Button>
          </div>
          {splitPreview && (
            <div
              className="rounded border p-3 mt-2"
              style={{ borderColor: TK.borderLight }}
            >
              <div className="text-sm font-medium mb-2">
                Preview buckets for <b>{splitSource?.head}</b>
              </div>
              <ul className="text-sm list-disc ml-5">
                {splitPreview.buckets.map((b: any, i: number) => (
                  <li key={i}>
                    <b>{b.name}</b> — {b.size} kws, {formatInt(b.volume)} volume
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSplitOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!splitSource) return;
                await api.splitApply(splitSource.id, splitMethod);
                setSplitOpen(false);
              }}
              className="cursor-pointer"
            >
              Apply split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recluster */}
      <Dialog open={reclusterOpen} onOpenChange={setReclusterOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recluster (non‑destructive preview)</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              Cluster: <b>{reclusterSource?.head}</b>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!reclusterSource) return;
                const prev = await api.reclusterPreview(reclusterSource.id);
                setReclusterPreview(prev);
              }}
              className="cursor-pointer"
            >
              Preview
            </Button>
            {reclusterPreview && (
              <div
                className="rounded border p-3 mt-1"
                style={{ borderColor: TK.borderLight }}
              >
                Size: {reclusterPreview.before} →{" "}
                <b>{reclusterPreview.after}</b> • {reclusterPreview.change}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReclusterOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!reclusterSource) return;
                await api.reclusterApply(reclusterSource.id);
                setReclusterOpen(false);
              }}
              className="cursor-pointer"
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete cluster?</DialogTitle>
            <DialogDescription>
              This removes the cluster “{deleteSource?.head}”. Keywords won’t be
              lost in your project, but the cluster definition will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteSource) return;
                await api.delete(deleteSource.id);
                setRows((rs) => rs.filter((r) => r.id !== deleteSource.id));
                setSelected((s) => {
                  const c = { ...s };
                  if (deleteSource) delete c[deleteSource.id];
                  return c;
                });
                setDeleteOpen(false);
              }}
              className="cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

/* ------------------- Demo wrapper (Tab only) ------------------- */
export default function DemoClustersTabWithRefinements() {
  const [mode, setMode] = React.useState<Mode>("domain");
  return (
    <>
      <ClustersTab
        mode={mode}
        onOpenCanvas={(id) => alert(`Open Cluster Canvas: ${id}`)}
        onCreateTask={(ids) =>
          alert(`Create Task for ${ids.length} cluster(s)`)
        }
        onAddTracking={(ids) => alert(`Add ${ids.length} to tracking`)}
        onSaveList={(ids) => alert(`Saved ${ids.length} cluster(s) to list`)}
        onExport={(ids, fmt) =>
          alert(`Export ${ids.length} cluster(s) as ${fmt}`)
        }
      />
    </>
  );
}
