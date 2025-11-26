"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Info,
  Eye,
  ChartNoAxesColumn,
  Layers3,
  BookmarkPlus,
  ClipboardList,
  Target,
  Sparkles,
  SquareStack,
  Video,
  Image,
  MapPin,
  ShoppingCart,
  Newspaper,
  PanelsTopLeft,
  SlidersHorizontal,
  Download,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ListChecks,
} from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { BASE_URL_WR } from "@/src/util/api";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { Select as AntSelect } from "antd";
import { toast } from "sonner";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";



const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "var(--wr-brand,#008CCD)", // branded
  action: "var(--wr-action,#0077FF)",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  valueBlue: "#4286F5",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};
const BASE_ANALYZE_API = `${BASE_URL_WR}keyword-research-analyse/`;

const fontStack =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/* ───────────────────────── Types ───────────────────────── */
export type KrMode = "no-domain" | "domain";
type IntentFull = "informational" | "commercial" | "navigational" | "transactional";
type SerpFeature = "FS" | "PAA" | "Video" | "Images" | "Local" | "Shopping" | "News" | "Sitelinks";
type SourceType = "gkp" | "serp" | "trends" | "gsc" | "ga4";

type Row = {
  id: string;
  keyword: string;
  locale?: { country: string; language: string };
  volume?: number;
  wkd: number;
  intent: IntentFull;
  cp?: number;
  wos: number;
  tm: -2 | -1 | 0 | 1 | 2;
  seasonality?: string;
  serp: SerpFeature[];
  sources: SourceType[];
  trend?: number[];
  cpc?: number;
  comp?: number;
  results?: number;
  updatedAt: string;

  // domain-aware extras
  rank?: number | null;
  ycp?: number | null;
  gap?: "New" | "Shared" | "Missed" | null;
  nearwin?: number | null;
  page?: string | null;
  gsc?: { clicks: number; impr: number; ctr: number } | null;

  selected?: boolean;
};

type List = { id: string; name: string; count: number };

/* ───────────────────────── Telemetry stub ───────────────────────── */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  window.dispatchEvent(
    new CustomEvent("kr-analytics", {
      detail: { event, ts: new Date().toISOString(), props },
    })
  );
}

/* ───────────────────────── Small atoms ───────────────────────── */
const INTENT_MAP: Record<IntentFull, { label: string; dot: string; abbr: string }> = {
  informational: { label: "Informational", dot: "#6366F1", abbr: "I" },
  commercial: { label: "Commercial", dot: "#10B981", abbr: "C" },
  navigational: { label: "Navigational", dot: "#F59E0B", abbr: "N" },
  transactional: { label: "Transactional", dot: "#EF4444", abbr: "T" },
};

const SERP_COLORS: Record<SerpFeature, string> = {
  FS: "var(--wr-serp-fs,#7C3AED)",
  PAA: "var(--wr-serp-paa,#22C55E)",
  Video: "var(--wr-serp-video,#EF4444)",
  Images: "var(--wr-serp-images,#F59E0B)",
  Local: "var(--wr-serp-local,#0EA5E9)",
  Shopping: "var(--wr-serp-shopping,#8B5CF6)",
  News: "var(--wr-serp-news,#10B981)",
  Sitelinks: "var(--wr-serp-sitelinks,#6B7280)",
};

const KeywordLink: React.FC<{ children: React.ReactNode; onClick: () => void }> = ({ children, onClick }) => (
  <button
    className="font-medium cursor-pointer"
    style={{ color: TK.valueBlue, textDecoration: "none" }}
    onClick={onClick}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.textDecoration = "underline";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLElement).style.textDecoration = "none";
    }}
  >
    {children}
  </button>
);

function kdBand(kd: number) {
  if (kd >= 75) return { label: "Very", color: TK.critical };
  if (kd >= 55) return { label: "Difficult", color: "#D97706" };
  if (kd >= 30) return { label: "Moderate", color: TK.warn };
  return { label: "Easy", color: TK.ok };
}
const KDDot: React.FC<{ kd: number }> = ({ kd }) => {
  const b = kdBand(kd);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs cursor-default">
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: b.color }} />
            <span>{kd}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          Difficulty {kd} • {b.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const IntentBadge: React.FC<{ intent: IntentFull }> = ({ intent }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-xs cursor-default">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: INTENT_MAP[intent].dot }} />
          <span className="inline-block w-4 h-4 text-[11px] font-semibold text-[color:var(--wr-text-strong,#111827)] leading-[16px] text-center">
            {INTENT_MAP[intent].abbr}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{INTENT_MAP[intent].label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const TrendMini: React.FC<{ data?: number[]; tm?: -2 | -1 | 0 | 1 | 2 }> = ({ data, tm }) => {
  if (!data || data.length === 0) return <span className="text-xs text-muted-foreground">–</span>;
  const W = 70,
    H = 24,
    pad = 1;
  const xs = data.map((_, i) => i / (data.length - 1));
  const min = Math.min(...data),
    max = Math.max(...data);
  const ys = data.map((v) => (max === min ? 0.5 : 1 - (v - min) / (max - min)));
  const pts = xs.map((x, i) => `${pad + x * (W - pad * 2)},${pad + ys[i] * (H - pad * 2)}`).join(" ");
  const area = `M ${pad},${H - pad} L ${pts} L ${W - pad},${H - pad} Z`;
  const arrow = tm == null ? "" : tm > 0 ? "↑" : tm < 0 ? "↓" : "→";
  return (
    <div className="inline-flex items-center gap-1">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="cursor-default">
        <path d={area} fill="rgba(66,134,245,.18)" />
        <polyline points={pts} fill="none" stroke={TK.valueBlue} strokeWidth={1.6} />
      </svg>
      <span className="text-xs text-muted-foreground">
        {arrow}
        {tm ? Math.abs(tm) : ""}
      </span>
    </div>
  );
};

const WOSBar: React.FC<{ value: number }> = ({ value }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2.5 w-24 rounded bg-gray-200 relative overflow-hidden">
            <span
              className="absolute left-0 top-0 h-full"
              style={{ width: `${value}%`, background: value >= 70 ? TK.ok : value >= 40 ? TK.warn : "#60A5FA" }}
            />
          </span>
          <span className="text-sm">{value}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">Composite of Volume × CP% × (1−WKD) with momentum & fit.</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/* ───────────────────────── Helpers ───────────────────────── */
const fmtNum = (n?: number) => (n == null ? "—" : n.toLocaleString());
const idFor = (s: string) => "k_" + s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 60);

/* ───────────────────────── Column model ───────────────────────── */
type ColKey =
  | "select"
  | "keyword"
  | "locale"
  | "volume"
  | "wkd"
  | "intent"
  | "cp"
  | "wos"
  | "tm"
  | "seasonality"
  | "serp"
  | "source"
  | "rank"
  | "ycp"
  | "gap"
  | "nearwin"
  | "page"
  | "gsc"
  | "trend"
  | "cpc"
  | "comp"
  | "results"
  | "updated"
  | "actions";

type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sticky?: boolean;
  tooltip?: string;
};
const COLS: ColDef[] = [
  { key: "select", label: "", width: 46, align: "center", sticky: true },
  { key: "keyword", label: "Keyword", width: 360, sortable: true, sticky: true },
  { key: "locale", label: "Locale", width: 120, tooltip: "Country & language used." },
  { key: "volume", label: "Volume", width: 110, align: "right", sortable: true, tooltip: "Average monthly searches (normalized)." },
  { key: "wkd", label: "WKD", width: 120, align: "center", sortable: true, tooltip: "Competition based on current SERP strength, features & brands." },
  { key: "intent", label: "Intent", width: 140, align: "center", sortable: true, tooltip: "Primary search intent; mix available in Analyzer." },
  { key: "cp", label: "CP%", width: 110, align: "right", sortable: true, tooltip: "Expected organic click share after SERP feature damping." },
  { key: "wos", label: "WOS", width: 140, align: "right", sortable: true, tooltip: "Composite of Volume × CP% × (1−WKD) with momentum & fit." },
  { key: "tm", label: "TM", width: 120, align: "center", sortable: true, tooltip: "Recent momentum from Trends & history." },
  { key: "seasonality", label: "Seasonality", width: 170 },
  { key: "serp", label: "SERP", width: 200, align: "center", tooltip: "SERP surfaces present for this query." },
  { key: "source", label: "Source", width: 140, align: "center", tooltip: "Sources combined to compute values." },

  // Domain-aware extras
  { key: "rank", label: "Rank", width: 100, align: "right", sortable: true, tooltip: "Current rank for your domain." },
  { key: "ycp", label: "Your CP%", width: 120, align: "right", sortable: true, tooltip: "Estimated organic clicks at your current rank." },
  { key: "gap", label: "Gap", width: 120, align: "center", sortable: true, tooltip: "How you compare to selected competitors." },
  { key: "nearwin", label: "Near‑Win", width: 120, align: "center", sortable: true, tooltip: "Keywords close to breaking into Top‑3." },
  { key: "page", label: "Page", width: 240 },
  { key: "gsc", label: "GSC", width: 180, align: "right", tooltip: "Search Console performance for this keyword." },

  // extra marketplace columns
  { key: "cpc", label: "CPC", width: 110, align: "right", sortable: true },
  { key: "comp", label: "Competitive density", width: 150, align: "right", sortable: true },
  { key: "results", label: "Results", width: 130, align: "right", sortable: true },
  { key: "updated", label: "Updated", width: 140, sortable: true },
  { key: "actions", label: "Actions", width: 240 },
];

/* ───────────────────────── Filter chips (dropdown) ───────────────────────── */
const FilterChip: React.FC<{ label: string; count?: number; children: React.ReactNode }> = ({ label, count, children }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        className="h-8 px-3 rounded-[6px] border text-sm inline-flex items-center gap-1 cursor-pointer bg-white"
        style={{ borderColor: TK.border }}
      >
        {label}
        {typeof count === "number" && count > 0 ? <span className="text-xs text-muted-foreground">({count})</span> : null}
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-[240px] z-[260]">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

/* ───────────────────────── Ranges popover (chip trigger) ───────────────────────── */
type RangeState = {
  volMin?: number;
  volMax?: number;
  cpMin?: number;
  cpMax?: number;
  wosMin?: number;
  wosMax?: number;
  tmVals: Array<-2 | -1 | 0 | 1 | 2>;
};
const RangesPopover: React.FC<{ value: RangeState; onApply: (v: RangeState) => void; onReset: () => void }> = ({
  value,
  onApply,
  onReset,
}) => {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<RangeState>(value);
  React.useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);
  const Num: React.FC<{ label: string; v?: number; on: (n?: number) => void }> = ({ label, v, on }) => (
    <label className="text-xs w-[140px]">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <Input type="number" value={v ?? ""} onChange={(e) => on(e.target.value === "" ? undefined : Number(e.target.value))} />
    </label>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="h-8 px-3 rounded-[6px] border text-sm inline-flex items-center gap-1 cursor-pointer bg-white"
          style={{ borderColor: TK.border }}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Ranges
          <ChevronsUpDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[620px] z-[240]" sideOffset={8} align="start">
        <div className="text-sm font-medium mb-2">Range filters</div>
        <div className="grid grid-cols-2 gap-3">
          <Num label="Volume min" v={local.volMin} on={(n) => setLocal((s) => ({ ...s, volMin: n }))} />
          <Num label="Volume max" v={local.volMax} on={(n) => setLocal((s) => ({ ...s, volMax: n }))} />
          <Num label="CP% min" v={local.cpMin} on={(n) => setLocal((s) => ({ ...s, cpMin: n }))} />
          <Num label="CP% max" v={local.cpMax} on={(n) => setLocal((s) => ({ ...s, cpMax: n }))} />
          <Num label="WOS min" v={local.wosMin} on={(n) => setLocal((s) => ({ ...s, wosMin: n }))} />
          <Num label="WOS max" v={local.wosMax} on={(n) => setLocal((s) => ({ ...s, wosMax: n }))} />
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">TM (momentum)</div>
            <div className="flex flex-wrap gap-2">
              {([-2, -1, 0, 1, 2] as const).map((v) => {
                const active = local.tmVals.includes(v);
                return (
                  <button
                    key={v}
                    className="h-8 px-3 rounded-[6px] border text-sm cursor-pointer"
                    style={{ borderColor: TK.border, background: active ? TK.pastel : "#FFF" }}
                    onClick={() => setLocal((s) => ({ ...s, tmVals: active ? s.tmVals.filter((x) => x !== v) : [...s.tmVals, v] }))}
                  >
                    {v > 0 ? `+${v}` : `${v}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => (onReset(), setOpen(false))} className="cursor-pointer">
            Reset
          </Button>
          <Button size="sm" onClick={() => (onApply(local), setOpen(false))} className="cursor-pointer">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ───────────────────────── Saved Views (in‑memory) & mocks ───────────────────────── */
type View = {
  name: string;
  columns: Partial<Record<ColKey, boolean>>;
  sort: { col: ColKey; dir: "asc" | "desc"; prioritizeNearWins?: boolean };
  filters: {
    q: string;
    kdBands: Array<"easy" | "moderate" | "difficult" | "very">;
    intents: IntentFull[];
    features: SerpFeature[];
    nearWinsOnly: boolean;
    ranges: RangeState;
  };
};
const builtInViews = (mode: KrMode): View[] => [
  {
    name: "Default",
    columns: {
      locale: false,
      seasonality: false,
      source: false,
      rank: false,
      ycp: false,
      gap: false,
      nearwin: false,
      page: false,
      gsc: false,
      cpc: true,
      comp: true,
      results: true,
      updated: true,
      trend: true,
    },
    sort: { col: "wos" as ColKey, dir: "desc" },
    filters: {
      q: "",
      kdBands: [],
      intents: [],
      features: [],
      nearWinsOnly: false,
      ranges: { tmVals: [] },
    },
  },
  {
    name: "Easy Wins",
    columns: { cpc: true, comp: true, results: true, updated: true, trend: true },
    sort: { col: "wos" as ColKey, dir: "desc" },
    filters: {
      q: "",
      kdBands: ["easy"],
      intents: [],
      features: [],
      nearWinsOnly: false,
      ranges: { volMin: 200, cpMin: 20, tmVals: [] },
    },
  },
  {
    name: "Rising Topics",
    columns: {},
    sort: { col: "tm" as ColKey, dir: "desc" },
    filters: {
      q: "",
      kdBands: [],
      intents: [],
      features: [],
      nearWinsOnly: false,
      ranges: { tmVals: [1, 2] },
    },
  },
  {
    name: "Commercial",
    columns: {},
    sort: { col: "wos" as ColKey, dir: "desc" },
    filters: {
      q: "",
      kdBands: [],
      intents: ["commercial", "transactional"],
      features: [],
      nearWinsOnly: false,
      ranges: { tmVals: [] },
    },
  },
  {
    name: "Informational",
    columns: {},
    sort: { col: "wos" as ColKey, dir: "desc" },
    filters: {
      q: "",
      kdBands: [],
      intents: ["informational"],
      features: [],
      nearWinsOnly: false,
      ranges: { tmVals: [] },
    },
  },
];



const projectDisplayName = (project?: {
  name?: string | null;
  domain?: string | null;
  url?: string | null;
  id?: string | number;
  project_id?: string | number;
} | null) => {
  if (!project) return "Project";
  const name = project.name && project.name.trim();
  if (name) return name;
  if (project.domain) return project.domain;
  if (project.url) return project.url;
  const rawId = project.id ?? project.project_id;
  return rawId != null ? `Project #${rawId}` : "Project";
};
type AnalyzeApiItem = {
  id: number;
  project_id?: number | null;
  keyword: string;
  volume?: number | null;
  wkd_score?: number | null;
  intent?: string[] | null;
  locale?: string | null;
  created_at?: string;
  updated_at?: string;
};


/* ───────────────────────── Analyse Keywords (redesigned) ───────────────────────── */
export default function AnalyzeTabPro() {
  const [mode, setMode] = React.useState<KrMode>("domain");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [loading, setLoading] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);


  const { projects = [], sharedProjects = [], loading: projectsLoading } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  const projectOptions = React.useMemo(
    () => {
      const all = [...projects, ...sharedProjects];
      return all
        .map((project: any) => {
          const id = project?.id ?? project?.project_id;
          if (id == null) return null;
          return {
            label: projectDisplayName(project),
            value: String(id),
          };
        })
        .filter(Boolean) as { label: string; value: string }[];
    },
    [projects, sharedProjects]
  );

  React.useEffect(() => {
    if (projectOptions.length === 0) {
      setSelectedProjectId(null);
      return;
    }

    setSelectedProjectId((current) => {
      if (current && projectOptions.some((option) => option.value === current)) {
        return current;
      }
      return projectOptions[0].value;
    });
  }, [projectOptions]);

  const fetchAnalyzeRows = React.useCallback(
    async ({ requestMode, projectId }: { requestMode: KrMode; projectId?: string | null }) => {
      try {
        setLoading(true);
        setRows([]);
        const token = Cookies.get("login_access_token_wrank");
        const shouldUseProject = requestMode === "domain" && projectId;
        const url = shouldUseProject
          ? `${BASE_ANALYZE_API}?project_id=${encodeURIComponent(projectId)}`
          : BASE_ANALYZE_API;

        const res = await axios.get(url, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        });

        const items: AnalyzeApiItem[] = Array.isArray(res.data?.data) ? res.data.data : [];

const mapped: Row[] = items.map((item, idx) => {
  // map intent[] => IntentFull (fallback to informational)
  const rawIntent = Array.isArray(item.intent) ? item.intent : [];
  const normalisedIntent = rawIntent
    .map((v) => v?.toString().toLowerCase())
    .find((v) =>
      ["informational", "commercial", "navigational", "transactional"].includes(
        v as IntentFull
      )
    ) as IntentFull | undefined;
  const intent: IntentFull = normalisedIntent ?? "informational";

  // locale: "en-US" => { country: "US", language: "EN" }
  let locale: Row["locale"] | undefined;
  if (typeof item.locale === "string") {
    const parts = item.locale.split(/[-_]/);
    if (parts.length === 2) {
      locale = {
        language: parts[0].toUpperCase(),
        country: parts[1].toUpperCase(),
      };
    }
  }

  const volume =
    typeof item.volume === "number" && !Number.isNaN(item.volume)
      ? item.volume
      : undefined;
  const wkd =
    typeof item.wkd_score === "number" && !Number.isNaN(item.wkd_score)
      ? item.wkd_score
      : 0;

  // WOS (Wranker Opportunity Score) – deterministic from volume + WKD only
  let wos = 0;
  if (typeof volume === "number" && volume > 0) {
    const volScore =
      Math.log10(volume + 10) / Math.log10(100000 + 10); // 0–1
    wos = Math.round(
      Math.max(1, Math.min(100, volScore * 100 * (1 - wkd / 100)))
    );
  }

  return {
    id: String(item.id ?? idx),
    keyword: item.keyword,
    locale,
    volume,
    wkd,
    intent,
    cp: undefined, // CP% not provided by API → show "—"
    wos,
    tm: 0, // no trend/momentum in analyse API yet
    seasonality: undefined,
    serp: [], // SERP features not provided by API → show "—"
    sources: [], // Source not provided by API → show "—"
    trend: undefined,
    cpc: undefined,
    comp: undefined,
    results: undefined,
    updatedAt:
      item.updated_at || item.created_at || new Date().toISOString(),
    // domain-aware extras – not present in current API
    rank: null,
    ycp: null,
    gap: null,
    nearwin: null,
    page: null,
    gsc: null,
    selected: false,
  };
});


        setRows(mapped);
        setPage(1);
        krTrack("kr.analyze.table_loaded", {
          mode: requestMode,
          rows: mapped.length,
          default_view: "Default",
          project_id: shouldUseProject ? projectId : null,
        });
      } catch (err:any) {
        console.error("Failed to load analyse keywords", err);
        toast.error(err?.response?.data?.message);
        
      } finally {
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (mode === "domain" && !selectedProjectId) return;
    fetchAnalyzeRows({ requestMode: mode, projectId: selectedProjectId });
  }, [fetchAnalyzeRows, mode, selectedProjectId]);

const defaultCols = React.useMemo(() => {
  const base: Record<ColKey, boolean> = COLS.reduce(
    (a, c) => ({ ...a, [c.key]: false }),
    {} as any
  );
  base.select = true;
  base.keyword = true;
  base.volume = true;
  base.wkd = true;
  base.intent = true;
  base.cp = true;
  base.wos = true;
  base.tm = true;
  base.serp = true;
  base.actions = true;
  // Domain-aware extras (rank, ycp, gap, nearwin, etc.) stay OFF by default;
  // user can enable them from the Columns popover when backend supports them.
  return base;
}, []);


  const [visibleCols, setVisibleCols] = React.useState<Record<ColKey, boolean>>(defaultCols);
  React.useEffect(() => setVisibleCols(defaultCols), [defaultCols]);

  /* Saved views */
  const builtIns = React.useMemo(() => builtInViews(mode), [mode]);
  const [customViews, setCustomViews] = React.useState<View[]>([]);
  const [currentView, setCurrentView] = React.useState<string>("Default");

  function applyView(v: View) {
    const merged = { ...defaultCols, ...v.columns };
    setVisibleCols(merged as Record<ColKey, boolean>);
    setSortBy(v.sort.col);
    setSortDir(v.sort.dir);
    setPrioritizeNearWins(Boolean(v.sort.prioritizeNearWins));
    setSearch(v.filters.q);
    setKDBands(v.filters.kdBands);
    setIntentFilters(v.filters.intents);
    setFeatureFilters(v.filters.features);
    setNearWinsOnly(v.filters.nearWinsOnly);
    setRanges({ ...v.filters.ranges, tmVals: v.filters.ranges.tmVals ?? [] });
    setPage(1);
    setCurrentView(v.name);
    krTrack("kr.analyze.view_applied", { view_name: v.name });
  }

  /* Controls state */
  const [search, setSearch] = React.useState("");
  const [kdBands, setKDBands] = React.useState<Array<"easy" | "moderate" | "difficult" | "very">>([]);
  const [intentFilters, setIntentFilters] = React.useState<IntentFull[]>([]);
  const [featureFilters, setFeatureFilters] = React.useState<SerpFeature[]>([]);
const [ranges, setRanges] = React.useState<RangeState>({ tmVals: [] });
const [nearWinsOnly, setNearWinsOnly] = React.useState(false);
const [prioritizeNearWins, setPrioritizeNearWins] = React.useState(false);

const [sortBy, setSortBy] = React.useState<ColKey>("wos");
const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

React.useEffect(() => {
  setNearWinsOnly(false);
  setPrioritizeNearWins(false);
  setSortBy("wos");
  setSortDir("desc");
}, [mode]);


  function toggleSort(key: ColKey) {
    const def = COLS.find((c) => c.key === key);
    if (!def?.sortable) return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    krTrack("kr.analyze.sort_changed", { col: key, dir: sortDir === "asc" ? "desc" : "asc" });
  }

  /* Resizable keyword width */
  const [kwWidth, setKwWidth] = React.useState<number>(360);
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = kwWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(220, Math.min(560, start + (ev.clientX - startX)));
      setKwWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  /* Filtering + sorting + pagination */
  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.keyword.toLowerCase().includes(search.toLowerCase())) return false;

      if (kdBands.length) {
        const b = kdBand(r.wkd);
        const map = { Easy: "easy", Moderate: "moderate", Difficult: "difficult", Very: "very" } as any;
        if (!kdBands.includes(map[b.label])) return false;
      }
      if (intentFilters.length && !intentFilters.includes(r.intent)) return false;
      if (featureFilters.length && !featureFilters.every((f) => r.serp.includes(f))) return false;
      if (nearWinsOnly && mode === "domain") {
        if (!(r.nearwin && r.nearwin > 0)) return false;
      }

      if (ranges.volMin != null && (r.volume ?? 0) < ranges.volMin) return false;
      if (ranges.volMax != null && (r.volume ?? 0) > ranges.volMax) return false;
      if (ranges.cpMin != null && (r.cp ?? 0) < ranges.cpMin) return false;
      if (ranges.cpMax != null && (r.cp ?? 0) > ranges.cpMax) return false;
      if (ranges.wosMin != null && r.wos < ranges.wosMin) return false;
      if (ranges.wosMax != null && r.wos > ranges.wosMax) return false;
      if (ranges.tmVals.length && !ranges.tmVals.includes(r.tm)) return false;

      return true;
    });
  }, [rows, search, kdBands, intentFilters, featureFilters, nearWinsOnly, ranges, mode]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const val = (r: Row) => {
      switch (sortBy) {
        case "keyword":
          return r.keyword.toLowerCase();
        case "volume":
          return r.volume ?? -1;
        case "wkd":
          return r.wkd;
        case "intent":
          return r.intent;
        case "cp":
          return r.cp ?? -1;
        case "wos":
          return r.wos;
        case "tm":
          return r.tm;
        case "rank":
          return r.rank ?? 9999;
        case "ycp":
          return r.ycp ?? -1;
        case "gap":
          return r.gap ?? "zzz";
        case "nearwin":
          return r.nearwin ?? 999;
        case "cpc":
          return r.cpc ?? -1;
        case "comp":
          return r.comp ?? -1;
        case "results":
          return r.results ?? -1;
        case "updated":
          return new Date(r.updatedAt).getTime();
        default:
          return 0;
      }
    };
    arr.sort((a, b) => {
      if (prioritizeNearWins && mode === "domain") {
        const aNW = a.nearwin != null ? 0 : 1;
        const bNW = b.nearwin != null ? 0 : 1;
        if (aNW !== bNW) return aNW - bNW;
      }
      const av = val(a),
        bv = val(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir, mode, prioritizeNearWins]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const start = (page - 1) * pageSize;
  const windowRows = React.useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  /* Selection & bulk bar */
  const selectedCount = rows.filter((r) => r.selected).length;
  const pageIds = React.useMemo(() => windowRows.map((r) => r.id), [windowRows]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => rows.find((r) => r.id === id)?.selected);
  const toggleSelectAll = () => {
    const checked = !allSelected;
    setRows((prev) => prev.map((r) => (pageIds.includes(r.id) ? { ...r, selected: checked } : r)));
  };

  /* Sticky positions */
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? ({
          position: "sticky",
          left: c.key === "select" ? 0 : 46,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        } as React.CSSProperties)
      : undefined;

  /* Actions */
  function openSERP(keyword: string) {
    alert(`Open SERP snapshot for: ${keyword}`);
  }
  function openAnalyzer(keyword: string) {
    alert(`Open Analyzer Drawer for: ${keyword}`);
  }
  function addToCluster(keyword: string) {
    alert(`Add to cluster: ${keyword}`);
  }
  function createTask(rowsForTask: Row[]) {
    if (!rowsForTask.length) {
      toast.error("Select at least one keyword to create a task.");
      return;
    }

    const title =
      rowsForTask.length === 1
        ? `Keyword opportunity - ${rowsForTask[0].keyword}`
        : `Keyword research sprint (${rowsForTask.length} keywords)`;

    const detailLines = rowsForTask.slice(0, 5).map((r) => {
      const vol = r.volume ? `Volume ${fmtNum(r.volume)}` : "Volume n/a";
      return `- ${r.keyword} (${vol}, WKD ${r.wkd})`;
    });
    const extra =
      rowsForTask.length > 5 ? `\n- ...and ${rowsForTask.length - 5} more keyword(s)` : "";
    const description = `Review these keyword opportunities:\n${detailLines.join("\n")}${extra}`;

    openTaskDrawer({
      title,
      description,
      projectId: selectedProjectId,
      type: "createNew",
    });
  }
  function addToTracking(keywords: string[]) {
    alert(`Add ${keywords.length} keywords to Rank Tracker`);
  }

  const [lists, setLists] = React.useState<List[]>([]);
  const listsApi = {
    lists,
    createList: (name: string) => {
      const id = "list_" + (lists.length + 1);
      setLists((prev) => [...prev, { id, name, count: 0 }]);
      return id;
    },
    addToList: (id: string, kws: string[]) => {
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, count: l.count + kws.length } : l)));
      alert(`Added ${kws.length} to list "${lists.find((l) => l.id === id)?.name}"`);
    },
  };

  function exportCsv(list: Row[]) {
    const colsOut: ColKey[] = COLS.filter((c) => visibleCols[c.key]).map((c) => c.key).filter((k) => k !== "select" && k !== "actions");
    const lines = [
      colsOut.join(","),
      ...list.map((r) =>
        colsOut
          .map((k) => {
            switch (k) {
              case "keyword":
                return JSON.stringify(r.keyword);
              case "locale":
                return r.locale ? `${r.locale.country}-${r.locale.language}` : "";
              case "volume":
                return r.volume ?? "";
              case "wkd":
                return r.wkd;
              case "intent":
                return r.intent;
              case "cp":
                return r.cp ?? "";
              case "wos":
                return r.wos;
              case "tm":
                return r.tm;
              case "seasonality":
                return r.seasonality ?? "";
              case "serp":
                return r.serp.join("|");
              case "source":
                return r.sources.join("|");
              case "rank":
                return r.rank ?? "";
              case "ycp":
                return r.ycp ?? "";
              case "gap":
                return r.gap ?? "";
              case "nearwin":
                return r.nearwin ?? "";
              case "page":
                return r.page ?? "";
              case "gsc":
                return r.gsc ? `${r.gsc.clicks}|${r.gsc.impr}|${r.gsc.ctr}` : "";
              case "cpc":
                return r.cpc ?? "";
              case "comp":
                return r.comp ?? "";
              case "results":
                return r.results ?? "";
              case "updated":
                return r.updatedAt;
              default:
                return "";
            }
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "analyze.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* UI */
  const VISIBLE = COLS.filter((c) => visibleCols[c.key] !== false);

  const [drawerRow, setDrawerRow] = React.useState(false);
  const [Track, setTrack] = React.useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
     const openTrack = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
          if (e) e.stopPropagation();
    setTrack(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeTrack = () => {
    setTrack(false);
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
          <aside className="absolute right-0 top-0 h-full w-[76vw] overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">{title}</div>
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

  return (
    <div className="space-y-3 mt-2" style={{ fontFamily: fontStack }}>
      {/* Demo mode switch (unchanged) */}
      <div className="flex flex-wrap items-center gap-2 px-4">
                          {/* {drawerRow && (
                      <Drawer title="Keyword Research Analyzer" onClose={closeDrawer}>
                        <KeywordDrawer  />
                      </Drawer>
                    )} */}
                                              {Track && (
                            <div
            style={{
              display:"hidden",
              position: "absolute",
              zIndex: 1001,
              padding: "20px",
            }}
            onClick={closeTrack}
          >
                        {/* <AddToTrackerModal
  open={true}
  onOpenChange={() => {}}
  onClose={closeTrack}
  plan="free"
  limit={1}
  currentTracked={[]}
  newCompetitor={{} as any}
  onReplace={() => {}}
/> */}

                      </div>
                    )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mt-2">Mode:</span>
          <Button size="sm" variant={mode === "domain" ? "default" : "outline"} onClick={() => setMode("domain")} className="cursor-pointer mt-2">
            Domain-Aware
          </Button>
          <Button size="sm" variant={mode === "no-domain" ? "default" : "outline"} onClick={() => setMode("no-domain")} className="cursor-pointer mt-2">
            No-Domain
          </Button>
        </div>
{mode === "domain" && (
  <div className="flex flex-wrap items-center gap-2 ml-auto">
    <span className="text-sm text-brand-blue1 font-medium">Project:</span>
    {projectOptions.length > 0 ? (
      <AntSelect
        showSearch
        size="middle"
        className="min-w-[240px] border border-brand-blue1 rounded-sm"
        placeholder={projectsLoading ? "Loading projects..." : "Select a project"}
        loading={projectsLoading}
        optionFilterProp="label"
        value={selectedProjectId ?? undefined}
        onChange={(value) => setSelectedProjectId(value)}
        options={projectOptions}
        filterOption={(input, option) =>
          (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
        }
      />
    ) : (
      <span className="text-xs text-muted-foreground">
        {projectsLoading ? "Loading projects..." : "No projects found"}
      </span>
    )}
  </div>
)}


      </div>

      <div className="rounded-md border bg-white" style={{ borderColor: TK.border }}>
        {/* ── Section header (Analyse Keywords) ── */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center gap-2">
            <ListChecks size={18} color={TK.brand} />
            <h2 className="text-[15px] font-semibold" style={{ color: TK.text }}>
              Analyse Keywords
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Column control (left) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 px-3 cursor-pointer">
                  <Eye className="h-4 w-4 mr-1" /> Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] z-[250]" sideOffset={8} align="end">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                  {COLS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={c.key === "select" || c.key === "keyword"}
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))}
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCols(defaultCols)} className="cursor-pointer">
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => setCurrentView("Custom (unsaved)")} className="cursor-pointer">
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export (right of columns) */}
            <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={() => exportCsv(sorted)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </div>

        {/* ── Filters bar with dropdown chips ── */}
        <div className="p-3 px-4 border-b" style={{ borderColor: TK.borderLight }}>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Input
                className="w-[280px] pl-7"
                placeholder="Search keyword…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  krTrack("kr.analyze.search_used", { q_length: e.target.value.length });
                }}
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
            </div>

            {/* Intent filter chip */}
            <FilterChip label="Intent" count={intentFilters.length}>
              {(["informational", "commercial", "navigational", "transactional"] as IntentFull[]).map((iv) => (
                <DropdownMenuCheckboxItem
                  key={iv}
                  checked={intentFilters.includes(iv)}
                  onCheckedChange={(v) => setIntentFilters((s) => (v ? [...s, iv] : s.filter((x) => x !== iv)))}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: INTENT_MAP[iv].dot }} />
                    {INTENT_MAP[iv].label}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </FilterChip>

            {/* KD filter chip */}
            <FilterChip label="KD" count={kdBands.length}>
              {(["easy", "moderate", "difficult", "very"] as const).map((b) => {
                const color = b === "very" ? TK.critical : b === "difficult" ? "#D97706" : b === "moderate" ? TK.warn : TK.ok;
                const label = b === "easy" ? "KD Easy" : b === "moderate" ? "KD Moderate" : b === "difficult" ? "KD Difficult" : "KD Very";
                return (
                  <DropdownMenuCheckboxItem
                    key={b}
                    checked={kdBands.includes(b)}
                    onCheckedChange={(v) => setKDBands((s) => (v ? [...s, b] : s.filter((x) => x !== b)))}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
                      {label}
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </FilterChip>

            {/* SERP Features filter chip */}
            {/* <FilterChip label="SERP Features" count={featureFilters.length}>
              {SERP_ALL.map((f) => (
                <DropdownMenuCheckboxItem
                  key={f}
                  checked={featureFilters.includes(f)}
                  onCheckedChange={(v) => setFeatureFilters((s) => (v ? [...s, f] : s.filter((x) => x !== f)))}
                >
                  <span className="inline-flex items-center gap-2">
                    {f === "FS" && <Sparkles className="h-4 w-4" style={{ color: SERP_COLORS.FS }} />}
                    {f === "PAA" && <SquareStack className="h-4 w-4" style={{ color: SERP_COLORS.PAA }} />}
                    {f === "Video" && <Video className="h-4 w-4" style={{ color: SERP_COLORS.Video }} />}
                    {f === "Images" && <Image className="h-4 w-4" style={{ color: SERP_COLORS.Images }} />}
                    {f === "Local" && <MapPin className="h-4 w-4" style={{ color: SERP_COLORS.Local }} />}
                    {f === "Shopping" && <ShoppingCart className="h-4 w-4" style={{ color: SERP_COLORS.Shopping }} />}
                    {f === "News" && <Newspaper className="h-4 w-4" style={{ color: SERP_COLORS.News }} />}
                    {f === "Sitelinks" && <PanelsTopLeft className="h-4 w-4" style={{ color: SERP_COLORS.Sitelinks }} />}
                    {f}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </FilterChip> */}

            {/* Ranges chip (popover) */}
            <RangesPopover value={ranges} onApply={(v) => setRanges(v)} onReset={() => setRanges({ tmVals: [] })} />

            {/* Near‑Wins (dropdown chip) – domain mode only */}
            {mode === "domain" && (
              <FilterChip label="Near‑Wins">
                <DropdownMenuCheckboxItem checked={nearWinsOnly} onCheckedChange={(v) => setNearWinsOnly(Boolean(v))}>
                  Only Near‑Wins
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={prioritizeNearWins}
                  onCheckedChange={(v) => setPrioritizeNearWins(Boolean(v))}
                >
                  Prioritize Near‑Wins
                </DropdownMenuCheckboxItem>
              </FilterChip>
            )}

            {/* Right side controls (views & page size) */}
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 cursor-pointer">
                    Views <ChevronsUpDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[260px] z-[250]">
                  <DropdownMenuLabel>Built‑in</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {builtIns.map((v) => (
                    <DropdownMenuItem key={v.name} onClick={() => applyView(v)} className="cursor-pointer">
                      {v.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Custom</DropdownMenuLabel>
                  {customViews.length === 0 && <DropdownMenuItem disabled>No custom views</DropdownMenuItem>}
                  {customViews.map((v) => (
                    <DropdownMenuItem key={v.name} onClick={() => applyView(v)} className="cursor-pointer">
                      {v.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      const name = prompt("Save current as view name:", `My view ${customViews.length + 1}`);
                      if (!name) return;
                      const view: View = {
                        name,
                        columns: visibleCols,
                        sort: { col: sortBy, dir: sortDir, prioritizeNearWins },
                        filters: { q: search, kdBands, intents: intentFilters, features: featureFilters, nearWinsOnly, ranges },
                      };
                      setCustomViews((prev) => [...prev.filter((v) => v.name !== name), view]);
                    }}
                    className="cursor-pointer"
                  >
                    Save view…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const idx = customViews.findIndex((v) => v.name === currentView);
                      if (idx === -1) {
                        alert("Select a custom view to update.");
                        return;
                      }
                      const upd: View = {
                        name: currentView,
                        columns: visibleCols,
                        sort: { col: sortBy, dir: sortDir, prioritizeNearWins },
                        filters: { q: search, kdBands, intents: intentFilters, features: featureFilters, nearWinsOnly, ranges },
                      };
                      setCustomViews((prev) => prev.map((v, i) => (i === idx ? upd : v)));
                    }}
                    className="cursor-pointer"
                  >
                    Update current view
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCustomViews((prev) => prev.filter((v) => v.name !== currentView))} className="cursor-pointer">
                    Delete current view
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Select
                value={String(pageSize)}
                onValueChange={(v: any) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer">
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

            {/* Bulk action bar */}
            {selectedCount > 0 && (
              <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
                <span className="text-sm">
                  <strong>{selectedCount}</strong> selected
                </span>
                <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createTask(rows.filter((r) => r.selected))}
                  className="cursor-pointer"
                >
                  <ClipboardList className="h-4 w-4 mr-1" /> Create Task
                </Button>
                {mode === "domain" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToTracking(rows.filter((r) => r.selected).map((r) => r.keyword))}
                    className="cursor-pointer" disabled
                  >
                    <Target className="h-4 w-4 mr-1" /> Add to Tracking
                  </Button>
                )}
                                        <Button disabled variant="outline" size="sm" className="cursor-pointer">
                          <BookmarkPlus className="h-4 w-4 mr-1" /> Add to Cluster
                        </Button>
                                        <Button disabled variant="outline" size="sm" className="cursor-pointer">
                          <BookmarkPlus className="h-4 w-4 mr-1" /> Add to List
                        </Button>
                <DropdownMenu >
                  <DropdownMenuTrigger asChild disabled>
                    <Button size="sm" variant="outline" className="cursor-pointer">
                      <BookmarkPlus className="h-4 w-4 mr-1" /> Save to List
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[220px] z-[280]">
                    <DropdownMenuLabel>Lists</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {lists.length === 0 && (
                      <DropdownMenuItem
                        onClick={() => {
                          const id = listsApi.createList(`List ${new Date().toLocaleDateString()}`);
                          listsApi.addToList(id, rows.filter((r) => r.selected).map((r) => r.keyword));
                        }}
                        className="cursor-pointer"
                      >
                        Create new list…
                      </DropdownMenuItem>
                    )}
                    {lists.map((l) => (
                      <DropdownMenuItem key={l.id} onClick={() => listsApi.addToList(l.id, rows.filter((r) => r.selected).map((r) => r.keyword))} className="cursor-pointer">
                        {l.name} <span className="ml-auto text-xs text-muted-foreground">{l.count}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="outline" onClick={() => exportCsv(rows.filter((r) => r.selected))} className="cursor-pointer">
                  <Download className="h-4 w-4 mr-1" /> Export Selected
                </Button>
                <div className="ml-auto">
                  <Button size="sm" variant="ghost" onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: false })))} className="cursor-pointer">
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
          <Table className="text-sm">
            <TableHeader className="bg-white sticky top-0 z-30" style={{ boxShadow: "inset 0 -1px 0 var(--wr-borderLight,#EFF0F6)" }}>
              <TableRow>
                {VISIBLE.map((c) => (
                  <TableHead
                    key={c.key}
                    style={{
                      minWidth: c.key === "keyword" ? kwWidth : c.width,
                      width: c.key === "keyword" ? kwWidth : c.width,
                      ...stickyStyle(c),
                    }}
                    className={c.align === "center" ? "text-center" : c.align === "right" ? "text-right" : undefined}
                    aria-sort={sortBy === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    {c.key === "select" ? (
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                    ) : c.key === "keyword" ? (
                      <div className="relative select-none">
                        <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("keyword")}>
                          <span>{c.label}</span>
                          {sortBy === "keyword" ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        <span onMouseDown={startResize} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" title="Drag to resize" />
                      </div>
                    ) : c.sortable ? (
                      <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort(c.key)}>
                        <span>{c.label}</span>
                        {sortBy === c.key ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    ) : c.tooltip ? (
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{c.tooltip}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    ) : (
                      c.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

<TableBody>
  {loading ? (
    // Skeleton rows while API is fetching data
    Array.from({ length: 8 }).map((_, rowIdx) => (
      <TableRow key={`skeleton-${rowIdx}`}>
        {VISIBLE.map((c) => (
          <TableCell
            key={c.key}
            style={{
              minWidth: c.key === "keyword" ? kwWidth : c.width,
              width: c.key === "keyword" ? kwWidth : c.width,
              ...(c.sticky ? stickyStyle(c) : {}),
            }}
          >
            <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
          </TableCell>
        ))}
      </TableRow>
    ))
  ) : windowRows.length === 0 ? (
    // Empty state when there is no data
    <TableRow>
      <TableCell
        colSpan={VISIBLE.length}
        className="py-8 text-center text-sm text-muted-foreground"
      >
        No keywords found for the current filters.
      </TableCell>
    </TableRow>
  ) : (
    // Normal data rows
    windowRows.map((r) => (
      <TableRow
        key={r.id}
        className="hover:bg-[#F8FAFC]"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) openAnalyzer(r.keyword);
          if (e.key === "Enter" && e.shiftKey) openSERP(r.keyword);
        }}
      >
        {visibleCols.select !== false && (
          <TableCell style={stickyStyle(COLS[0]) as any} className="text-center">
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
        )}

        {visibleCols.keyword !== false && (
          <TableCell
            style={{
              ...stickyStyle(COLS[1]),
              minWidth: kwWidth,
              width: kwWidth,
            }}
          >
            <KeywordLink onClick={openDrawer}>{r.keyword}</KeywordLink>
          </TableCell>
        )}

        {visibleCols.locale !== false && (
          <TableCell>
            {r.locale ? `${r.locale.country}-${r.locale.language}` : "—"}
          </TableCell>
        )}
        {visibleCols.volume !== false && (
          <TableCell className="text-right">{fmtNum(r.volume)}</TableCell>
        )}
        {visibleCols.wkd !== false && (
          <TableCell className="text-center">
            <KDDot kd={r.wkd} />
          </TableCell>
        )}
        {visibleCols.intent !== false && (
          <TableCell className="text-center">
            <IntentBadge intent={r.intent} />
          </TableCell>
        )}
        {visibleCols.cp !== false && (
          <TableCell className="text-right">
            {r.cp == null ? "—" : `${r.cp}%`}
          </TableCell>
        )}
        {visibleCols.wos !== false && (
          <TableCell className="text-right">
            {r.wos && r.wos > 0 ? <WOSBar value={r.wos} /> : "—"}
          </TableCell>
        )}
        {visibleCols.tm !== false && (
          <TableCell className="text-center">
            <TrendMini data={r.trend} tm={r.tm} />
          </TableCell>
        )}
        {visibleCols.seasonality !== false && (
          <TableCell>{r.seasonality ?? "—"}</TableCell>
        )}

        {visibleCols.serp !== false && (
          <TableCell className="text-center">
            {r.serp && r.serp.length > 0 ? (
              <div className="inline-flex items-center gap-2">
                {r.serp.includes("FS") && (
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.FS }}
                  />
                )}
                {r.serp.includes("PAA") && (
                  <SquareStack
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.PAA }}
                  />
                )}
                {r.serp.includes("Video") && (
                  <Video
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.Video }}
                  />
                )}
                {r.serp.includes("Images") && (
                  <Image
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.Images }}
                  />
                )}
                {r.serp.includes("Local") && (
                  <MapPin
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.Local }}
                  />
                )}
                {r.serp.includes("Shopping") && (
                  <ShoppingCart
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.Shopping }}
                  />
                )}
                {r.serp.includes("News") && (
                  <Newspaper
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.News }}
                  />
                )}
                {r.serp.includes("Sitelinks") && (
                  <PanelsTopLeft
                    className="h-4 w-4"
                    style={{ color: SERP_COLORS.Sitelinks }}
                  />
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </TableCell>
        )}

        {visibleCols.source !== false && (
          <TableCell className="text-center">
            {!r.sources || r.sources.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <div className="inline-flex flex-wrap gap-1">
                {r.sources.map((s) => (
                  <span
                    key={s}
                    className="text-[11px] px-1.5 py-0.5 rounded border"
                    style={{ borderColor: TK.borderLight }}
                  >
                    {s.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </TableCell>
        )}

        {visibleCols.rank !== false && (
          <TableCell className="text-right">{r.rank ?? "—"}</TableCell>
        )}
        {visibleCols.ycp !== false && (
          <TableCell className="text-right">
            {r.ycp == null ? "—" : `${r.ycp}%`}
          </TableCell>
        )}
        {visibleCols.gap !== false && (
          <TableCell className="text-center">
            {r.gap ? (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded border"
                style={{ borderColor: TK.borderLight }}
              >
                {r.gap}
              </span>
            ) : (
              "—"
            )}
          </TableCell>
        )}
        {visibleCols.nearwin !== false && (
          <TableCell className="text-center">
            {r.nearwin ? (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded border"
                style={{ borderColor: TK.borderLight }}
              >
                NW • Δ{r.nearwin}
              </span>
            ) : (
              "—"
            )}
          </TableCell>
        )}
        {visibleCols.page !== false && (
          <TableCell>
            {r.page ? (
              <a
                href={r.page}
                className="underline"
                style={{ color: TK.valueBlue }}
              >
                {r.page}
              </a>
            ) : (
              "—"
            )}
          </TableCell>
        )}
        {visibleCols.gsc !== false && (
          <TableCell className="text-right">
            {r.gsc ? (
              <span className="text-xs">
                {fmtNum(r.gsc.clicks)} · {fmtNum(r.gsc.impr)} · {r.gsc.ctr}%
              </span>
            ) : (
              "—"
            )}
          </TableCell>
        )}

        {visibleCols.cpc !== false && (
          <TableCell className="text-right">
            {r.cpc == null ? "—" : `$${r.cpc.toFixed(2)}`}
          </TableCell>
        )}
        {visibleCols.comp !== false && (
          <TableCell className="text-right">
            {r.comp == null ? "—" : r.comp.toFixed(2)}
          </TableCell>
        )}
        {visibleCols.results !== false && (
          <TableCell className="text-right">
            {fmtNum(r.results)}
          </TableCell>
        )}
        {visibleCols.updated !== false && (
          <TableCell>{new Date(r.updatedAt).toLocaleDateString()}</TableCell>
        )}

{visibleCols.actions !== false && (
  <TableCell>
    <div className="inline-flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Keyword analysis coming soon.")}
            className="cursor-pointer"
disabled
          >
            <Layers3 className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
            Add to cluster
          </Button>

                    <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("Keyword analysis coming soon.")}
            className="cursor-pointer"
            disabled
          >
            <Layers3 className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
            Add to list 
          </Button>

                    <Button
            size="sm"
            variant="outline"
            onClick={() => createTask([r])}
            className="cursor-pointer"
          >
            <Layers3 className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
            Create Task
          </Button>

      {/* Save to List */}
      <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toast.info("Lists are not wired yet.")}
            className="cursor-pointer"
          >
            <BookmarkPlus className="h-4 w-4" style={{ color: TK.brand }} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save to list (coming soon)</TooltipContent>
      </Tooltip>
            </TooltipProvider>
    </div>
  </TableCell>
)}

      </TableRow>
    ))
  )}
</TableBody>

          </Table>
        </div>

        {/* Bottom pagination (unchanged) */}
        <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm text-muted-foreground">
            Showing {sorted.length === 0 ? 0 : start + 1}–{Math.min(sorted.length, start + windowRows.length)} of {sorted.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page <= 1} onClick={() => setPage(1)}>
              First
            </Button>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <div className="text-sm w-16 text-center">
              {page} / {totalPages}
            </div>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
            <Button variant="outline" className="h-8 px-3 cursor-pointer" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              Last
            </Button>
            <Select
              value={String(pageSize)}
              onValueChange={(v: any) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer">
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
      </div>
    </div>
  );
}
