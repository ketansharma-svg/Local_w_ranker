import * as React from "react";
import {
  Eye,
  Layers3,
  BookmarkPlus,
  ClipboardList,
  Target,
  Link as LinkIcon,
  Copy,
  Plus,
  Info,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  ExternalLink,
  GitCompare,
} from "lucide-react";

/* ------- shadcn/ui (assumed available in your codebase) ------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

/* ============ Tokens (Inter + brand) ============ */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // branded icon + active backgrounds
  action: "var(--wr-action,#0077FF)", // value blue for meters, etc.
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  radius: "var(--wr-radius,6px)",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

/* ============ Small Utils ============ */
const cn = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
function formatInt(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
const currency = (n?: number) => (n == null ? "—" : `$${n.toFixed(2)}`);

type Intent = "informational" | "commercial" | "navigational" | "transactional" | "local";
const INTENT_DOT: Record<Intent, string> = {
  informational: TK.muted,
  commercial: TK.ok,
  navigational: TK.warn,
  transactional: "#4286F5",
  local: "#8B5CF6",
};
const INTENT_LETTER: Record<Intent, string> = {
  informational: "I",
  commercial: "C",
  navigational: "N",
  transactional: "T",
  local: "L",
};
function wkdBand(score?: number) {
  if (score == null) return { label: "—", color: "#9CA3AF" };
  if (score <= 29) return { label: "Easy", color: TK.ok };
  if (score <= 54) return { label: "Moderate", color: TK.warn };
  if (score <= 74) return { label: "Difficult", color: "#D97706" };
  return { label: "Very", color: TK.critical };
}
function tmColor(tm?: number) {
  if (tm == null) return "#9CA3AF";
  if (tm >= 1) return TK.ok;
  if (tm <= -1) return TK.critical;
  return TK.warn;
}
function krTrack(event: string, props: Record<string, unknown> = {}) {
  const envelope = { event, ts: new Date().toISOString(), props };
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail: envelope }));
}

/* ============ SSR-safe time label ============ */
function useIsClient() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => {
    setM(true);
  }, []);
  return m;
}
function pad2(n: number) {
  return (n < 10 ? `0${n}` : `${n}`);
}
function formatHHMMSS(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const LastSavedLabel: React.FC<{ savedAt?: string }> = ({ savedAt }) => {
  const isClient = useIsClient();
  if (!savedAt) {
    return <span className="text-xs text-muted-foreground">Not saved yet</span>;
  }
  if (!isClient) {
    return (
      <span suppressHydrationWarning className="text-xs text-muted-foreground">
        Last saved —
      </span>
    );
  }
  const d = new Date(savedAt);
  return <span className="text-xs text-muted-foreground">Last saved {formatHHMMSS(d)}</span>;
};

/* ---------- UI building blocks (with branded title icons) ---------- */
const SectionShell: React.FC<
  React.PropsWithChildren<{ title: React.ReactNode; right?: React.ReactNode; id?: string }>
> = ({ title, right, children, id }) => (
  <section
    id={id}
    className="bg-white rounded-md border mb-4"
    style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm, ...FONTS }}
  >
    <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: TK.borderLight }}>
      <div className="flex items-center gap-2">{title}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    <div className="p-3">{children}</div>
  </section>
);

const Pill: React.FC<{ children: React.ReactNode; color?: string; title?: string; className?: string }> = ({
  children,
  color,
  title,
  className,
}) => (
  <span
    title={title}
    className={cn("inline-flex items-center rounded-full text-[12px] px-2 py-0.5", className)}
    style={{ background: "#F9FAFB", border: `1px solid ${TK.borderLight}`, color: color || TK.text }}
  >
    {children}
  </span>
);

const SourceBadge: React.FC<{ s: "serp" | "gkp" | "trends" | "gsc" }> = ({ s }) => {
  const map: Record<string, string> = { serp: "SERP", gkp: "GKP", trends: "Trends", gsc: "GSC" };
  return (
    <span
      className="text-[11px] px-1.5 py-0.5 rounded border"
      style={{ borderColor: TK.borderLight, color: TK.muted }}
    >
      {map[s]}
    </span>
  );
};

const IntentChip: React.FC<{ intent: Intent }> = ({ intent }) => (
  <span className="inline-flex items-center gap-1 text-[12px]">
    <span className="inline-block w-2 h-2 rounded-full" style={{ background: INTENT_DOT[intent] }} />
    <span className="inline-block font-semibold">{INTENT_LETTER[intent]}</span>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="sr-only">i</span>
      </TooltipTrigger>
      <TooltipContent className="text-xs capitalize">{intent}</TooltipContent>
    </Tooltip>
  </span>
);

const WKDChip: React.FC<{ score?: number }> = ({ score }) => {
  const b = wkdBand(score);
  return (
    <span className="inline-flex items-center gap-1 text-[12px]">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: b.color }} />
      <span>{score ?? "—"}</span>
      <span className="text-[11px] text-muted-foreground">({b.label})</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="sr-only">i</span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">Competition based on current SERP strength, features &amp; brands.</TooltipContent>
      </Tooltip>
    </span>
  );
};

const TMChip: React.FC<{ tm?: number }> = ({ tm }) => (
  <span className="inline-flex items-center gap-1 text-[12px]" title="Recent momentum from Trends & history.">
    <span className="inline-block w-2 h-2 rounded-full" style={{ background: tmColor(tm) }} />
    <span>{tm == null ? "—" : tm >= 0 ? "+" + tm.toFixed(1) : tm.toFixed(1)}</span>
  </span>
);

const FilterChip: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    className={cn(
      "h-8 px-3 rounded-full border text-sm cursor-pointer",
      active ? "font-semibold bg-[#F0FAFF]" : "hover:bg-[#F7FAFC]"
    )}
    style={{ borderColor: TK.borderLight }}
    onClick={onClick}
    aria-pressed={active}
  >
    {label}
  </button>
);

const MultiSelectChips: React.FC<{
  label: string;
  options: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ label, options, value, onChange }) => (
  <div className="inline-flex items-center gap-1">
    <span className="text-sm text-muted-foreground">{label}:</span>
    {options.map((o) => (
      <FilterChip
        key={o.id}
        label={o.label}
        active={value.includes(o.id)}
        onClick={() => onChange(value.includes(o.id) ? value.filter((v) => v !== o.id) : [...value, o.id])}
      />
    ))}
  </div>
);

/* =========================================================
   =============== Related (Entities / Q / Var) =============
   ========================================================= */

type RelatedTab = "entities" | "questions" | "variations";
type Entity = { text: string; weight: number; type?: string; sources: string[]; snippet?: string };
type QuestionRow = { text: string; source: "paa" | "autosuggest" | "gkp" | "gsc"; seenCount?: number };
type VariationRow = {
  id: string;
  keyword: string;
  group: "question" | "comparison" | "longtail" | "exact" | "localized";
  intent: Intent;
  volume?: number;
  wkd?: number;
  tm?: number;
  cpc?: number;
  compDensity?: number;
  sources: ("serp" | "gkp" | "trends" | "gsc")[];
};

const MOCK_ENTITIES: Entity[] = [
  { text: "core web vitals", weight: 0.86, type: "metric", sources: ["serp", "trends"], snippet: "CWV metrics (LCP, INP, CLS)" },
  { text: "technical seo", weight: 0.92, type: "concept", sources: ["serp", "gkp", "gsc"] },
  { text: "schema markup", weight: 0.74, type: "technique", sources: ["serp"] },
  { text: "site speed", weight: 0.68, type: "metric", sources: ["serp"] },
  { text: "xml sitemap", weight: 0.55, type: "asset", sources: ["gkp"] },
  { text: "log file analysis", weight: 0.48, type: "technique", sources: ["serp", "gsc"] },
];
const MOCK_QUESTIONS: QuestionRow[] = [
  { text: "What is a technical SEO checklist?", source: "paa", seenCount: 38 },
  { text: "How to audit site speed?", source: "paa", seenCount: 24 },
  { text: "Technical SEO checklist for ecommerce", source: "autosuggest", seenCount: 9 },
  { text: "Best technical SEO audit tools", source: "gkp", seenCount: 7 },
  { text: "How to find crawl errors?", source: "paa", seenCount: 11 },
  { text: "Technical SEO vs on-page SEO", source: "autosuggest", seenCount: 5 },
];
const MOCK_VARIATIONS: VariationRow[] = [
  {
    id: "v1",
    keyword: "technical seo checklist",
    group: "longtail",
    intent: "informational",
    volume: 2900,
    wkd: 41,
    tm: 0.8,
    cpc: 2.4,
    compDensity: 0.33,
    sources: ["serp", "gkp", "trends"],
  },
  {
    id: "v2",
    keyword: "best technical seo tools",
    group: "comparison",
    intent: "commercial",
    volume: 880,
    wkd: 58,
    tm: 1.2,
    cpc: 6.1,
    compDensity: 0.72,
    sources: ["serp", "gkp"],
  },
  {
    id: "v3",
    keyword: "technical seo audit",
    group: "exact",
    intent: "informational",
    volume: 1600,
    wkd: 65,
    tm: -0.3,
    cpc: 3.1,
    compDensity: 0.54,
    sources: ["serp", "gkp", "gsc"],
  },
  {
    id: "v4",
    keyword: "technical seo for small business",
    group: "longtail",
    intent: "informational",
    volume: 260,
    wkd: 27,
    tm: 1.6,
    cpc: 1.2,
    compDensity: 0.22,
    sources: ["trends", "gkp"],
  },
  {
    id: "v5",
    keyword: "site speed audit",
    group: "localized",
    intent: "local",
    volume: 210,
    wkd: 49,
    tm: 0.1,
    cpc: 4.8,
    compDensity: 0.44,
    sources: ["serp"],
  },
];

function toggleMulti<T>(arr: T[], set: (v: T[]) => void, val: T) {
  set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
}

const RelatedSection: React.FC<{
  keyword: string;
  onOpenAnalyzer?: (kw: string) => void;
  onOpenSerp?: (kw: string) => void;
  onAddToAggregate?: (rows: VariationRow[]) => void;
  onSaveList?: (rows: VariationRow[] | string[], name: string) => void;
}> = ({ keyword, onOpenAnalyzer, onOpenSerp, onAddToAggregate, onSaveList }) => {
  const [tab, setTab] = React.useState<RelatedTab>("entities");
  const [search, setSearch] = React.useState("");
  const [intentFilter, setIntentFilter] = React.useState<Intent[]>([]);
  const [wkdBands, setWkdBands] = React.useState<("easy" | "moderate" | "difficult" | "very")[]>([]);
  const [tmBand, setTmBand] = React.useState<"lt-1" | "btw" | "gt1" | null>(null);
  const [sources, setSources] = React.useState<("serp" | "gkp" | "trends" | "gsc")[]>([
    "serp",
    "gkp",
    "trends",
    "gsc",
  ]);
  const [minVol, setMinVol] = React.useState<number>(0);
  const [maxWords, setMaxWords] = React.useState<number>(8);
  const [strictLang, setStrictLang] = React.useState<boolean>(false);
  const [blocklist, setBlocklist] = React.useState<string>("");

  /* Entities */
  const [selectedEntities, setSelectedEntities] = React.useState<Record<string, boolean>>({});
  const filteredEntities = React.useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_ENTITIES.filter(
      (e) => e.text.toLowerCase().includes(q) && e.sources.some((s) => sources.includes(s as any))
    );
  }, [search, sources]);
  function toggleEntity(text: string) {
    setSelectedEntities((prev) => ({ ...prev, [text]: !prev[text] }));
  }
  const entitiesSelectedCount = React.useMemo(
    () => Object.values(selectedEntities).filter(Boolean).length,
    [selectedEntities]
  );

  /* Questions */
  const [questionSort, setQuestionSort] = React.useState<"seen" | "az">("seen");
  const filteredQuestions = React.useMemo(() => {
    const q = search.toLowerCase();
    const rows = MOCK_QUESTIONS.filter((r) => r.text.toLowerCase().includes(q));
    rows.sort((a, b) => {
      if (questionSort === "seen") return (b.seenCount ?? 0) - (a.seenCount ?? 0);
      return a.text.localeCompare(b.text);
    });
    return rows;
  }, [search, questionSort]);

  /* Variations Table */
  const [selVar, setSelVar] = React.useState<Record<string, boolean>>({});
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [saveListOpen, setSaveListOpen] = React.useState(false);
  const [saveListName, setSaveListName] = React.useState(`Related – ${keyword}`);

function bandName(score?: number): "easy" | "moderate" | "difficult" | "very" | undefined {
  if (score == null) return undefined;
  if (score <= 29) return "easy";
  if (score <= 54) return "moderate";
  if (score <= 74) return "difficult";
  return "very";
}

  const variations = React.useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_VARIATIONS.filter((r) => {
      if (!r.keyword.toLowerCase().includes(q)) return false;
      if (r.volume != null && r.volume < minVol) return false;
      if (r.keyword.split(/\s+/).length > maxWords) return false;
      if (blocklist && blocklist.split(",").some((b) => b.trim() && r.keyword.toLowerCase().includes(b.trim().toLowerCase())))
        return false;
      if (intentFilter.length && !intentFilter.includes(r.intent)) return false;
      if (wkdBands.length && !wkdBands.includes(bandName(r.wkd)!)) return false;
      if (tmBand === "lt-1" && (r.tm ?? 0) >= -1) return false;
      if (tmBand === "gt1" && (r.tm ?? 0) <= 1) return false;
      if (tmBand === "btw" && ((r.tm ?? 0) < -1 || (r.tm ?? 0) > 1)) return false;
      if (sources.length && !r.sources.some((s) => sources.includes(s))) return false;
      if (strictLang) {
        /* mock: assume all are target language */
      }
      return true;
    });
  }, [search, minVol, maxWords, blocklist, intentFilter, wkdBands, tmBand, sources, strictLang]);

  const allVarIds = React.useMemo(() => variations.map((v) => v.id), [variations]);
  const selVarCount = React.useMemo(
    () => Object.entries(selVar).filter(([, v]) => v && allVarIds.includes(v as any)).length,
    [selVar, allVarIds]
  );
  function toggleAllVar(checked: boolean) {
    const next = { ...selVar };
    allVarIds.forEach((id) => {
      next[id] = checked;
    });
    setSelVar(next);
  }
  function exportVariationsCSV(scope: "selected" | "all") {
    const rows = scope === "selected" ? variations.filter((v) => selVar[v.id]) : variations;
    const headers = ["keyword", "group", "intent", "volume", "wkd", "tm", "cpc", "compDensity", "sources"];
    const data = rows.map((r) =>
      [r.keyword, r.group, r.intent, r.volume ?? "", r.wkd ?? "", r.tm ?? "", r.cpc ?? "", r.compDensity ?? "", r.sources.join("|")]
        .map((x) => JSON.stringify(x))
        .join(",")
    );
    const csv = [headers.join(","), ...data].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `related-variations-${keyword}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function saveList(scope: "selected" | "all") {
    const rows = scope === "selected" ? variations.filter((v) => selVar[v.id]) : variations;
    onSaveList?.(rows, saveListName);
  }

  return (
    <SectionShell
      id="drawer-related"
      title={
        <div className="flex items-center gap-2">
          <Layers3 className="h-5 w-5" style={{ color: TK.brand }} />
          <span className="text-[15px] font-semibold">Related</span>
        </div>
      }
      right={
        <div className="inline-flex items-center gap-2">
          <div className="inline-flex bg-white rounded-[6px] border" style={{ borderColor: TK.border }}>
            {(["entities", "questions", "variations"] as RelatedTab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  krTrack("kr.drawer.related_tab_opened", { tab: t });
                }}
                className={cn(
                  "px-3 h-8 text-[13px] font-semibold rounded-[6px] cursor-pointer",
                  t === tab ? "bg-[var(--wr-bg-pastel,#D9EEF8)] text-[var(--wr-text-strong,#111827)]" : "text-[var(--wr-muted,#6B7280)]"
                )}
                style={{ border: `1px solid ${TK.border}` }}
              >
                {t === "entities" ? "Entities" : t === "questions" ? "Questions" : "Variations"}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 px-3 cursor-pointer">
                <Filter className="h-4 w-4 mr-2" style={{ color: TK.brand }} />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px]" align="end">
              <div className="text-sm font-medium mb-2">Export {tab}</div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-2 cursor-pointer"
                onClick={() => {
                  if (tab === "variations") exportVariationsCSV("selected");
                  else exportVariationsCSV("all");
                  krTrack("kr.drawer.related_export", { tab, format: "csv" });
                }}
              >
                CSV (Selected/Scope)
              </Button>
              <div className="text-xs text-muted-foreground">Respects current tab/filters and visible columns.</div>
            </PopoverContent>
          </Popover>
        </div>
      }
    >
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Input
            className="w-[280px] pl-8"
            placeholder={tab === "entities" ? "Filter entities…" : tab === "questions" ? "Filter questions…" : "Filter variations…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="16" height="16">
            <circle cx="7" cy="7" r="6" fill="none" stroke="#9E9E9E" />
            <line x1="11" y1="11" x2="15" y2="15" stroke="#9E9E9E" />
          </svg>
        </div>

        {tab === "variations" && (
          <>
            <FilterChip
              active={intentFilter.includes("informational")}
              onClick={() => toggleMulti(intentFilter, setIntentFilter, "informational")}
              label="Intent: Info"
            />
            <FilterChip
              active={intentFilter.includes("commercial")}
              onClick={() => toggleMulti(intentFilter, setIntentFilter, "commercial")}
              label="Intent: Comm"
            />
            <FilterChip
              active={intentFilter.includes("transactional")}
              onClick={() => toggleMulti(intentFilter, setIntentFilter, "transactional")}
              label="Intent: Trans"
            />
            <FilterChip active={intentFilter.includes("local")} onClick={() => toggleMulti(intentFilter, setIntentFilter, "local")} label="Intent: Local" />
            <FilterChip
              active={intentFilter.includes("navigational")}
              onClick={() => toggleMulti(intentFilter, setIntentFilter, "navigational")}
              label="Intent: Nav"
            />

            <FilterChip active={wkdBands.includes("easy")} onClick={() => toggleMulti(wkdBands, setWkdBands, "easy")} label="WKD: Easy" />
            <FilterChip
              active={wkdBands.includes("moderate")}
              onClick={() => toggleMulti(wkdBands, setWkdBands, "moderate")}
              label="WKD: Moderate"
            />
            <FilterChip
              active={wkdBands.includes("difficult")}
              onClick={() => toggleMulti(wkdBands, setWkdBands, "difficult")}
              label="WKD: Difficult"
            />
            <FilterChip active={wkdBands.includes("very")} onClick={() => toggleMulti(wkdBands, setWkdBands, "very")} label="WKD: Very" />

            <FilterChip active={tmBand === "gt1"} onClick={() => setTmBand(tmBand === "gt1" ? null : "gt1")} label="TM ≥ +1" />
            <FilterChip active={tmBand === "btw"} onClick={() => setTmBand(tmBand === "btw" ? null : "btw")} label="TM −1..+1" />
            <FilterChip active={tmBand === "lt-1"} onClick={() => setTmBand(tmBand === "lt-1" ? null : "lt-1")} label="TM ≤ −1" />

            <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 px-3 cursor-pointer">
                  <Filter className="h-4 w-4 mr-2" style={{ color: TK.brand }} />
                  Ranges
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px]">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Volume (min)</div>
                  <Input type="number" value={minVol} onChange={(e) => setMinVol(Number(e.target.value || 0))} />
                  <div className="text-sm font-medium">Max words</div>
                  <Input type="number" value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value || 0))} />
                  <div className="text-sm font-medium">Blocklist (comma‑separated)</div>
                  <Input value={blocklist} onChange={(e) => setBlocklist(e.target.value)} placeholder="brand, free, cheap" />
                  <div className="flex items-center gap-2">
                    <Checkbox checked={strictLang} onCheckedChange={(v) => setStrictLang(Boolean(v))} />
                    <span className="text-sm">Language strict</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => { setMinVol(0); setMaxWords(8); setBlocklist(""); setStrictLang(false); }}>
                      Reset
                    </Button>
                    <Button size="sm" className="cursor-pointer" onClick={() => setRangeOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <MultiSelectChips
              label="Sources"
              options={[
                { id: "serp", label: "SERP" },
                { id: "gkp", label: "GKP" },
                { id: "trends", label: "Trends" },
                { id: "gsc", label: "GSC" },
              ]}
              value={sources}
              onChange={setSources as any}
            />
          </>
        )}

        {tab === "variations" && Object.values(selVar).some(Boolean) && (
          <div
            className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2"
            style={{ borderColor: TK.borderLight }}
          >
            <span className="text-sm">
              <strong>{selVarCount}</strong> selected
            </span>
            <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onAddToAggregate?.(MOCK_VARIATIONS.filter((v) => selVar[v.id]))}
            >
              Add to Aggregate
            </Button>
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setSaveListOpen(true)}>
              Save to List
            </Button>
            <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => exportVariationsCSV("selected")}>
              Export Selected
            </Button>
            <div className="ml-auto">
              <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setSelVar({})}>
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tab bodies */}
      {tab === "entities" && (
        <div className="relative">
          <div className="flex flex-wrap gap-2">
            {filteredEntities.map((e) => {
              const active = !!selectedEntities[e.text];
              const sizeClass = e.weight > 0.8 ? "text-[13px]" : e.weight > 0.6 ? "text-[12px]" : "text-[12px]";
              return (
                <button
                  key={e.text}
                  className={cn("border rounded-full px-3 py-1 cursor-pointer", sizeClass)}
                  style={{ borderColor: TK.borderLight, background: active ? TK.pastel : "#FFF" }}
                  onClick={() => toggleEntity(e.text)}
                  title={e.snippet || "Entity from results for this query."}
                >
                  {e.text}
                  <span className="ml-2 inline-flex items-center gap-1">
                    {e.sources.map((s, i) => (
                      <SourceBadge key={s + i} s={s as any} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {entitiesSelectedCount > 0 && (
            <div className="sticky bottom-2 mt-3 flex justify-end">
              <div
                className="inline-flex items-center gap-2 rounded border bg-white px-2 py-1"
                style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm }}
              >
                <span className="text-sm">{entitiesSelectedCount} selected</span>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => {
                    const items = Object.entries(selectedEntities)
                      .filter(([, v]) => v)
                      .map(([k]) => k);
                    krTrack("kr.drawer.related_added_to_cluster", { tab: "entities", count: items.length });
                    alert(`Added ${items.length} entities to cluster`);
                  }}
                >
                  Add to Cluster
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => {
                    const items = Object.entries(selectedEntities)
                      .filter(([, v]) => v)
                      .map(([k]) => k);
                    navigator.clipboard?.writeText(items.join(", "));
                    alert("Copied entities as tags");
                  }}
                >
                  Copy as tags
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "questions" && (
        <div>
          <div className="flex items-center justify-end mb-2">
            <Select value={questionSort} onValueChange={(v: any) => setQuestionSort(v)}>
              <SelectTrigger className="h-8 px-3 w-[200px] cursor-pointer">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seen">Seen count (desc)</SelectItem>
                <SelectItem value="az">A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border rounded" style={{ borderColor: TK.borderLight }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px] text-center">Select</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-[120px] text-center">Source</TableHead>
                  <TableHead className="w-[110px] text-right">Seen</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((r, i) => (
                  <TableRow key={i} className="hover:bg-[#F8FAFC]">
                    <TableCell className="text-center">
                      <Checkbox />
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
                        onClick={() => onOpenAnalyzer?.(r.text)}
                      >
                        {r.text}
                      </button>
                    </TableCell>
                    <TableCell className="text-center capitalize">{r.source}</TableCell>
                    <TableCell className="text-right">{r.seenCount ?? "—"}</TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer"
                              onClick={() => onOpenSerp?.(r.text)}
                            >
                              <Eye className="h-4 w-4" style={{ color: TK.brand }} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open SERP snapshot</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="cursor-pointer" onClick={() => alert("Added to brief (FAQ)")}>
                              <Plus className="h-4 w-4" style={{ color: TK.brand }} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add FAQ to brief</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="cursor-pointer"
                              onClick={() => navigator.clipboard?.writeText(r.text)}
                            >
                              <Copy className="h-4 w-4" style={{ color: TK.brand }} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === "variations" && (
        <div className="border rounded" style={{ borderColor: TK.borderLight }}>
          <Table className="text-sm">
            <TableHeader className="bg-white sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[46px] text-center">
                  <Checkbox
                    checked={allVarIds.length > 0 && allVarIds.every((id) => selVar[id])}
                    onCheckedChange={(v) => toggleAllVar(Boolean(v))}
                  />
                </TableHead>
                <TableHead className="min-w-[360px]">Keyword</TableHead>
                <TableHead className="w-[120px] text-center">Group</TableHead>
                <TableHead className="w-[120px] text-center">Intent</TableHead>
                <TableHead className="w-[110px] text-right">Volume</TableHead>
                <TableHead className="w-[140px] text-center">WKD</TableHead>
                <TableHead className="w-[110px] text-center">TM</TableHead>
                <TableHead className="w-[100px] text-right">CPC</TableHead>
                <TableHead className="w-[140px] text-center">Comp. Density</TableHead>
                <TableHead className="w-[150px] text-center">Source</TableHead>
                <TableHead className="w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((r) => (
                <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={!!selVar[r.id]}
                      onCheckedChange={(v) => setSelVar((s) => ({ ...s, [r.id]: Boolean(v) }))}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
                      onClick={() => onOpenAnalyzer?.(r.keyword)}
                      title="Open Analyzer"
                    >
                      {r.keyword}
                    </button>
                  </TableCell>
                  <TableCell className="text-center capitalize">{r.group}</TableCell>
                  <TableCell className="text-center">
                    <IntentChip intent={r.intent} />
                  </TableCell>
                  <TableCell className="text-right">{formatInt(r.volume)}</TableCell>
                  <TableCell className="text-center">
                    <WKDChip score={r.wkd} />
                  </TableCell>
                  <TableCell className="text-center">
                    <TMChip tm={r.tm} />
                  </TableCell>
                  <TableCell className="text-right">{currency(r.cpc)}</TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-2 w-20 rounded bg-[#E5E7EB] relative overflow-hidden">
                        <span
                          className="absolute left-0 top-0 h-full"
                          style={{ width: `${Math.round((r.compDensity ?? 0) * 100)}%`, background: TK.action }}
                        />
                      </div>
                      <span className="text-xs">{Math.round((r.compDensity ?? 0) * 100)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1">
                      {r.sources.map((s, i) => (
                        <SourceBadge key={s + i} s={s} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => onOpenSerp?.(r.keyword)}
                          >
                            <Eye className="h-4 w-4" style={{ color: TK.brand }} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open SERP snapshot</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={() => onOpenAnalyzer?.(r.keyword)}>
                            <Layers3 className="h-4 w-4" style={{ color: TK.brand }} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open analyzer</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => onSaveList?.([r], `KWs – ${keyword}`)}
                          >
                            <BookmarkPlus className="h-4 w-4" style={{ color: TK.brand }} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save to list</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={() => onAddToAggregate?.([r])}>
                            <Plus className="h-4 w-4" style={{ color: TK.brand }} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add to Aggregate</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {variations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-6 text-muted-foreground">
                    No results match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Save List Dialog */}
      <Dialog open={saveListOpen} onOpenChange={setSaveListOpen}>
        <DialogContent className="sm:max-w-[420px]" style={FONTS}>
          <DialogHeader>
            <DialogTitle>Save to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm">Name</div>
            <Input value={saveListName} onChange={(e) => setSaveListName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveListOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveList("selected");
                setSaveListOpen(false);
              }}
              className="cursor-pointer"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
};

/* =========================================================
   ===================== Page Mapping ======================
   ========================================================= */

type PageCandidate = {
  url: string;
  type: "Guide" | "Category" | "PDP" | "Listicle" | "Video" | "News";
  lastUpdated: string;
  onpage: { titleMatch: boolean; h1Match: boolean; topicFit: number }; // 0..100
  internalLinks: number;
  aqs: number;
  matchScore: number;
  predictedRank?: number;
};
type CurrentMapping = {
  rank?: number;
  url?: string;
  yourCpPct?: number;
  gsc?: { clicks: number; impressions: number; ctr: number };
  competingPages?: number;
};

const MOCK_CURRENT: CurrentMapping = {
  rank: 8,
  url: "/guide/technical-seo-checklist",
  yourCpPct: 7,
  gsc: { clicks: 420, impressions: 9800, ctr: 4.3 },
  competingPages: 2,
};
const MOCK_CANDIDATES: PageCandidate[] = [
  {
    url: "/guide/technical-seo-checklist",
    type: "Guide",
    lastUpdated: "2025-06-10",
    onpage: { titleMatch: true, h1Match: true, topicFit: 86 },
    internalLinks: 27,
    aqs: 62,
    matchScore: 90,
    predictedRank: 6,
  },
  {
    url: "/blog/technical-seo",
    type: "Guide",
    lastUpdated: "2025-03-02",
    onpage: { titleMatch: true, h1Match: false, topicFit: 72 },
    internalLinks: 14,
    aqs: 48,
    matchScore: 78,
    predictedRank: 9,
  },
  {
    url: "/resources/site-speed-audit",
    type: "Listicle",
    lastUpdated: "2024-12-01",
    onpage: { titleMatch: false, h1Match: false, topicFit: 41 },
    internalLinks: 9,
    aqs: 33,
    matchScore: 52,
    predictedRank: 14,
  },
];

/* ---- Compare Modal ---- */
const CompareModal: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  base?: CurrentMapping;
  rows: PageCandidate[];
}> = ({ open, onOpenChange, rows }) => {
  const left = rows[0];
  const right = rows[1];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]" style={FONTS}>
        <DialogHeader>
          <DialogTitle>Compare pages</DialogTitle>
        </DialogHeader>
        {!left && !right ? (
          <div className="text-sm text-muted-foreground">Select two candidates to compare.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>{left ? left.url : "—"}</TableHead>
                  <TableHead>{right ? right.url : "—"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Match Score</TableCell>
                  <TableCell>{left?.matchScore ?? "—"}</TableCell>
                  <TableCell>{right?.matchScore ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Pred. Rank</TableCell>
                  <TableCell>{left?.predictedRank ?? "—"}</TableCell>
                  <TableCell>{right?.predictedRank ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>{left?.type ?? "—"}</TableCell>
                  <TableCell>{right?.type ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Last updated</TableCell>
                  <TableCell>{left?.lastUpdated ?? "—"}</TableCell>
                  <TableCell>{right?.lastUpdated ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>On‑page</TableCell>
                  <TableCell>
                    {left
                      ? `${left.onpage.titleMatch ? "Title✓" : "Title—"} · ${left.onpage.h1Match ? "H1✓" : "H1—"} · Fit ${left.onpage.topicFit}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {right
                      ? `${right.onpage.titleMatch ? "Title✓" : "Title—"} · ${right.onpage.h1Match ? "H1✓" : "H1—"} · Fit ${right.onpage.topicFit}`
                      : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Internal links</TableCell>
                  <TableCell>{left?.internalLinks ?? "—"}</TableCell>
                  <TableCell>{right?.internalLinks ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>AQS</TableCell>
                  <TableCell>{left?.aqs ?? "—"}</TableCell>
                  <TableCell>{right?.aqs ?? "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PageMappingSection: React.FC<{
  mode: "domain" | "no-domain";
  gscConnected?: boolean;
  current?: CurrentMapping;
  candidates?: PageCandidate[];
  onMap?: (url: string) => void;
  onRetarget?: (url: string) => void;
  onOpenAnalyzer?: (path: string) => void;
}> = ({
  mode,
  gscConnected = true,
  current = MOCK_CURRENT,
  candidates = MOCK_CANDIDATES,
  onMap,
  onRetarget,
  onOpenAnalyzer,
}) => {
  const [scoreMin, setScoreMin] = React.useState<number>(60);
  const [typeFilter, setTypeFilter] = React.useState<PageCandidate["type"][]>([]);
  const [staleMax, setStaleMax] = React.useState<"3m" | "6m" | "12m" | "all">("12m");
  const [onlyRanked, setOnlyRanked] = React.useState<boolean>(false);

  // Selection for Compare
  const [cmpSel, setCmpSel] = React.useState<Record<string, boolean>>({});
  const cmpSelectedRows = React.useMemo(() => candidates.filter((c) => cmpSel[c.url]), [candidates, cmpSel]);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const cmpActive = cmpSelectedRows.length >= 2;

  const filtered = React.useMemo(() => {
    const now = new Date();
    return candidates.filter((c) => {
      if (c.matchScore < scoreMin) return false;
      if (typeFilter.length && !typeFilter.includes(c.type)) return false;
      if (staleMax !== "all") {
        const months = staleMax === "3m" ? 3 : staleMax === "6m" ? 6 : 12;
        const last = new Date(c.lastUpdated);
        const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (diff > months) return false;
      }
      if (onlyRanked) {
        if (c.predictedRank == null || c.predictedRank > 50) return false;
      }
      return true;
    });
  }, [candidates, scoreMin, typeFilter, staleMax, onlyRanked]);

  if (mode === "no-domain") {
    return (
      <SectionShell
        id="drawer-page-mapping"
        title={
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" style={{ color: TK.brand }} />
            <span className="text-[15px] font-semibold">Page Mapping</span>
          </div>
        }
      >
        <div className="border rounded p-3 flex items-center justify-between" style={{ borderColor: TK.borderLight, background: "#FAFBFF" }}>
          <div>
            <div className="font-medium mb-1">Connect a project to map landing pages, detect near‑wins, and fix cannibalization.</div>
            <div className="text-sm text-muted-foreground">Unlock GSC metrics, current rank mapping, candidate recommendations & tasks.</div>
          </div>
          <div className="inline-flex items-center gap-2">
            <Button onClick={() => alert("Connect Project flow")} className="cursor-pointer">
              Connect Project
            </Button>
            <Button variant="outline" onClick={() => alert("Learn more")} className="cursor-pointer">
              Learn more
            </Button>
          </div>
        </div>
      </SectionShell>
    );
  }

  // Recommendation banner (simple heuristic)
  const best = [...filtered].sort((a, b) => b.matchScore - a.matchScore || (a.predictedRank ?? 99) - (b.predictedRank ?? 99))[0];
  const recommendation = best ? (best.url === current?.url ? "Retarget existing" : "Map existing") : "Create new";
  const why = best
    ? `Topical fit ${best.onpage.topicFit} and match score ${best.matchScore}; predicted rank #${best.predictedRank ?? "?"}.`
    : "No strong candidate detected.";

  return (
    <SectionShell
      id="drawer-page-mapping"
      title={
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" style={{ color: TK.brand }} />
          <span className="text-[15px] font-semibold">Page Mapping</span>
        </div>
      }
      right={
        <div className="inline-flex items-center gap-2">
          {/* Compare button — brand background when active */}
          <Button
            variant={cmpActive ? "default" : "outline"}
            className={cn(
              "h-8 cursor-pointer",
              cmpActive && "bg-[#008CCD] hover:bg-[#007BB3] text-white border-[#008CCD]"
            )}
            onClick={() => setCompareOpen(true)}
            disabled={!cmpActive}
            aria-label="Compare selected"
            title={cmpActive ? "Compare selected" : "Select two rows to compare"}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare ({cmpSelectedRows.length})
          </Button>
          <span className="text-xs text-muted-foreground">Snapshot up to date</span>
        </div>
      }
    >
      {/* Current Mapping */}
      <div className="rounded border p-3 mb-3" style={{ borderColor: TK.borderLight }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Pill>
              <span className="text-xs">Rank</span>
              <span className="ml-1 font-semibold">{current?.rank ?? "—"}</span>
            </Pill>
            <a
              href={current?.url || "#"}
              onClick={(e) => e.preventDefault()}
              className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
            >
              {current?.url ?? "—"}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Pill title="Your click potential at current rank">
              <span className="text-xs">Your CP%</span>
              <span className="ml-1 font-semibold">{current?.yourCpPct ?? "—"}%</span>
            </Pill>
            <Pill
              title={gscConnected ? "Search Console performance" : "Connect GSC to view"}
              className={cn(!gscConnected && "opacity-60")}
            >
              {gscConnected ? (
                <span className="text-xs">
                  Clicks {current?.gsc?.clicks} · Impr {formatInt(current?.gsc?.impressions)} · CTR {current?.gsc?.ctr}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Lock className="h-3 w-3" /> Connect GSC
                </span>
              )}
            </Pill>
          </div>
          <div className="inline-flex items-center gap-2">
            {current?.competingPages && current.competingPages > 1 && (
              <Pill title="Multiple pages ranking for this keyword." className="border border-dashed">
                2 pages compete
              </Pill>
            )}
            <Button variant="outline" onClick={() => onMap?.(current?.url ?? "")} className="cursor-pointer">
              Map
            </Button>
            <Button onClick={() => onRetarget?.(current?.url ?? "")} className="cursor-pointer">
              Retarget
            </Button>
            <Button variant="ghost" onClick={() => onOpenAnalyzer?.(current?.url ?? "")} className="cursor-pointer">
              <ExternalLink className="h-4 w-4 mr-1" style={{ color: TK.brand }} />
              Page Analyzer
            </Button>
          </div>
        </div>
      </div>

      {/* Recommendation banner */}
      <div className="rounded border p-2 mb-2 flex items-center justify-between" style={{ borderColor: TK.borderLight, background: "#FAFCFF" }}>
        <div className="text-sm">
          Best action: <strong>{recommendation}</strong>.{" "}
          <button
            className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
            onClick={() => alert(why)}
          >
            Why?
          </button>
        </div>
        {recommendation === "Create new" && (
          <Button size="sm" onClick={() => alert("Create new page flow")} className="cursor-pointer">
            Create new page
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="text-sm text-muted-foreground">Score ≥</div>
        <div className="w-[160px]">
          <Slider value={[scoreMin]} min={0} max={100} step={1} onValueChange={(v: any) => setScoreMin(v[0])} />
        </div>
        <div className="text-sm w-10">{scoreMin}</div>

        <MultiSelectChips
          label="Type"
          options={["Guide", "Category", "PDP", "Listicle", "Video", "News"].map((t) => ({ id: t, label: t }))}
          value={typeFilter}
          onChange={setTypeFilter as any}
        />
        <div className="inline-flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Updated ≤</span>
          <Select value={staleMax} onValueChange={(v: any) => setStaleMax(v)}>
            <SelectTrigger className="h-8 px-3 w-[120px] cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 months</SelectItem>
              <SelectItem value="6m">6 months</SelectItem>
              <SelectItem value="12m">12 months</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="inline-flex items-center gap-2">
          <Checkbox checked={onlyRanked} onCheckedChange={(v) => setOnlyRanked(Boolean(v))} />
          <span className="text-sm">Only pages we rank with</span>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="border rounded" style={{ borderColor: TK.borderLight }}>
        <Table className="text-sm">
          <TableHeader className="bg-white sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[46px] text-center">Select</TableHead>
              <TableHead>Page</TableHead>
              <TableHead className="w-[140px] text-center">Match Score</TableHead>
              <TableHead className="w-[120px] text-center">Type</TableHead>
              <TableHead className="w-[130px] text-center">Last updated</TableHead>
              <TableHead className="w-[180px] text-center">On‑page match</TableHead>
              <TableHead className="w-[140px] text-center">Internal links</TableHead>
              <TableHead className="w-[110px] text-center">AQS</TableHead>
              <TableHead className="w-[120px] text-center">Pred. Rank</TableHead>
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const last = new Date(c.lastUpdated);
              const monthsOld = Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24 * 30));
              return (
                <TableRow key={c.url} className="hover:bg-[#F8FAFC]">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={!!cmpSel[c.url]}
                      onCheckedChange={(v) => setCmpSel((s) => ({ ...s, [c.url]: Boolean(v) }))}
                    />
                  </TableCell>
                  <TableCell>
                    <a
                      href={c.url}
                      onClick={(e) => e.preventDefault()}
                      className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
                    >
                      {c.url}
                    </a>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-2 w-24 rounded bg-[#E5E7EB] relative overflow-hidden">
                        <span className="absolute left-0 top-0 h-full" style={{ width: `${c.matchScore}%`, background: TK.action }} />
                      </div>
                      <span className="text-xs">{c.matchScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{c.type}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs">{c.lastUpdated}</span>
                    {monthsOld > 6 && <span className="ml-2 text-xs text-[var(--wr-critical,#EF4444)]">Outdated</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs">
                      {c.onpage.titleMatch ? "Title ✓" : "Title —"} · {c.onpage.h1Match ? "H1 ✓" : "H1 —"} · Fit {c.onpage.topicFit}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{c.internalLinks}</TableCell>
                  <TableCell className="text-center">{c.aqs}</TableCell>
                  <TableCell className="text-center">{c.predictedRank ?? "—"}</TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => onMap?.(c.url)} className="cursor-pointer">
                            Map here
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Map this page to the keyword</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" onClick={() => onRetarget?.(c.url)} className="cursor-pointer">
                            Retarget
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Create optimization task</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={() => onOpenAnalyzer?.(c.url)}>
                            <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open Page Analyzer</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                  No candidates match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Compare Modal */}
      <CompareModal open={compareOpen} onOpenChange={setCompareOpen} rows={cmpSelectedRows.slice(0, 2)} />
    </SectionShell>
  );
};

/* =========================================================
   ========================= Notes =========================
   ========================================================= */

type NotesPayload = {
  content: string;
  tags: string[];
  updatedAt?: string;
  versions?: { at: string; content: string }[];
};

const NotesSection: React.FC<{
  initial?: NotesPayload;
  onSave?: (p: NotesPayload) => void;
}> = ({ initial }) => {
  const [content, setContent] = React.useState<string>(initial?.content ?? "");
  const [tags, setTags] = React.useState<string[]>(initial?.tags ?? []);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string>(initial?.updatedAt ?? "");
  const [versions, setVersions] = React.useState<{ at: string; content: string }[]>(initial?.versions ?? []);
  const [newTag, setNewTag] = React.useState("");

  React.useEffect(() => {
    const id = setInterval(() => {
      if (!dirty) return;
      doSave(true);
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, content, tags]);

  function doSave(autosave = false) {
    const now = new Date().toISOString();
    setVersions((v) => [{ at: now, content }, ...v].slice(0, 10));
    setSavedAt(now);
    setDirty(false);
    krTrack("kr.drawer.notes_saved", { length: content.length, tags_count: tags.length, autosave });
  }
  function insertWrap(prefix: string, suffix = prefix) {
    const el = document.getElementById("kw-notes") as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = content.slice(0, start);
    const sel = content.slice(start, end) || "text";
    const after = content.slice(end);
    const next = before + prefix + sel + suffix + after;
    setContent(next);
    setDirty(true);
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + sel.length;
    }, 0);
  }
  function addTag() {
    const t = newTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setNewTag("");
    setDirty(true);
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
    setDirty(true);
  }

  return (
    <SectionShell
      id="drawer-notes"
      title={
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" style={{ color: TK.brand }} />
          <span className="text-[15px] font-semibold">Notes</span>
        </div>
      }
      right={<LastSavedLabel savedAt={savedAt} />}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <Button variant="outline" size="sm" onClick={() => insertWrap("**", "**")} className="cursor-pointer">
          <b>B</b>
        </Button>
        <Button variant="outline" size="sm" onClick={() => insertWrap("*", "*")} className="cursor-pointer">
          <i>I</i>
        </Button>
        <Button variant="outline" size="sm" onClick={() => insertWrap("[", "](url)")}>Link</Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setContent((c) => c + (c.endsWith("\n") ? "" : "\n") + "- [ ] ")}
          className="cursor-pointer"
        >
          [ ]
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="cursor-pointer">
                History
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px]" style={FONTS}>
              <div className="text-sm font-medium mb-2">Version history</div>
              <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
                {versions.map((v) => (
                  <div key={v.at} className="flex items-center justify-between">
                    <span className="text-xs">{new Date(v.at).toLocaleString()}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => {
                        setContent(v.content);
                        setDirty(true);
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
                {versions.length === 0 && <div className="text-xs text-muted-foreground">No versions yet.</div>}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setContent(initial?.content ?? "");
              setTags(initial?.tags ?? []);
              setDirty(false);
            }}
            className="cursor-pointer"
          >
            Discard
          </Button>
          <Button size="sm" onClick={() => doSave(false)} disabled={!dirty} className="cursor-pointer">
            Save
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded border p-2 mb-2" style={{ borderColor: TK.borderLight }}>
        <Textarea
          id="kw-notes"
          rows={8}
          placeholder="Add research notes, rationale, or TODOs for this keyword…"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          className="resize-y"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px]"
            style={{ borderColor: TK.borderLight, background: "#FFF" }}
          >
            {t}
            <button className="rounded hover:bg-[#F2F4F7] cursor-pointer" onClick={() => removeTag(t)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <Input
          className="w-[200px]"
          placeholder="Add tag…"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTag();
          }}
        />
        <Button size="sm" variant="outline" onClick={addTag} className="cursor-pointer">
          Add
        </Button>
      </div>
    </SectionShell>
  );
};

/* =========================================================
   ===================== Demo Wrapper ======================
   ========================================================= */

export default function DemoKeywordAnalyzerSections() {
  const [mode, setMode] = React.useState<"domain" | "no-domain">("domain");
  const [gsc, setGsc] = React.useState(true);
  const KW = "technical seo checklist";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 space-y-4" style={FONTS}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mode:</span>
          <Button variant={mode === "domain" ? "default" : "outline"} size="sm" onClick={() => setMode("domain")} className="cursor-pointer">
            Domain‑Aware
          </Button>
          <Button variant={mode === "no-domain" ? "default" : "outline"} size="sm" onClick={() => setMode("no-domain")} className="cursor-pointer">
            No‑Domain
          </Button>

          <div className="inline-flex items-center gap-2 ml-4">
            <Checkbox checked={gsc} onCheckedChange={(v) => setGsc(Boolean(v))} />
            <span className="text-sm">GSC Connected</span>
          </div>
        </div>

        <RelatedSection
          keyword={KW}
          onOpenAnalyzer={(kw) => alert(`Open Analyzer for "${kw}"`)}
          onOpenSerp={(kw) => alert(`Open SERP Snapshot for "${kw}"`)}
          onAddToAggregate={(rows) => alert(`Added ${rows.length} to Aggregate`)}
          onSaveList={(rows, name) => alert(`Saved ${Array.isArray(rows) ? rows.length : 0} items to list "${name}"`)}
        />

        <PageMappingSection
          mode={mode}
          gscConnected={gsc}
          onMap={(url) => alert(`Mapped to ${url}`)}
          onRetarget={(url) => alert(`Task created to retarget ${url}`)}
          onOpenAnalyzer={(path) => alert(`Open Page Analyzer: ${path}`)}
        />

        <NotesSection
          initial={{
            content: "- [ ] Add FAQ schema\n- [ ] Compare vs competitors\n\n**Idea:** build table of tools",
            tags: ["Quick win", "Schema"],
            updatedAt: "", // SSR‑safe: start empty; will populate on Save/Autosave only
            versions: [],
          }}
        />
      </div>
    </TooltipProvider>
  );
}


