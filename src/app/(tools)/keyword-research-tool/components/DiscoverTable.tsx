'use client';

import * as React from 'react';

/* shadcn/ui (keep your existing imports & styles) */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Modal, Select as AntSelect, message, Pagination } from 'antd';
import { useProjectManager } from '@/src/hooks/use-project-manager';
import Cookies from "js-cookie"

/* lucide icons (brand color for section & card titles) */
/* Import only very-stable icons directly; everything else goes through safe wrappers below */
import {
  Search, Globe, Monitor, Smartphone, Play, RotateCcw, X, Info, Lock, Upload,
  ArrowLeft, ArrowRight, Download, ArrowUp, ArrowDown, Plus, BookmarkPlus, Filter,
} from 'lucide-react';
import * as Lucide from 'lucide-react'; // used for safe fallbacks

import { cn } from '@/lib/utils';
import axios from 'axios';
import { BASE_URL_WR } from '@/src/util/api';
import { toast } from 'sonner';

/* ───────────────────────── Safe icon wrappers ───────────────────────── */
/** Create a component that renders the first available icon by name, or a tiny square fallback. */
function makeIcon(...names: string[]) {
  const Impl = names.map((n) => (Lucide as any)[n]).find(Boolean) || null;
  const Fallback: React.FC<any> = (props) => (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: props?.size ?? 16,
        height: props?.size ?? 16,
        borderRadius: 2,
        background: '#9CA3AF',
      }}
      className={props?.className}
    />
  );
  const Comp: React.FC<any> = (props) => (Impl ? React.createElement(Impl, props) : <Fallback {...props} />);
  Comp.displayName = `Icon(${names.join('|')})`;
  return Comp;
}

/* Icons used in this file with fallbacks for older lucide versions */
const IconUsers = makeIcon('UsersRound', 'Users');
const IconLanguages = makeIcon('Languages', 'Globe');
const IconCalendarRange = makeIcon('CalendarClock', 'Calendar');
const IconBarGKP = makeIcon('BarChartBig', 'BarChart3', 'BarChart2');
const IconSERP = makeIcon('LayoutPanelLeft', 'PanelLeft', 'LayoutDashboard');
const IconTrends = makeIcon('TrendingUp', 'LineChart');
const IconGSC = makeIcon('LineChart', 'TrendingUp');
const IconGA4 = makeIcon('ActivitySquare', 'Activity');
const IconPAA = makeIcon('MessageSquareQuestion', 'MessageCircleQuestion', 'HelpCircle', 'MessageSquare');
const IconRelated = makeIcon('ChartBar', 'BarChart3', 'BarChart2');
const IconWand = makeIcon('Wand2', 'Wand');
const IconLayers = makeIcon('Layers');
const IconTable = makeIcon('Table2', 'Table');
const IconListChecks = makeIcon('ListChecks', 'List');

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: 'var(--wr-border, #E5E7EB)',
  borderLight: 'var(--wr-borderLight, #EFF0F6)',
  text: 'var(--wr-text-strong, #111827)',
  muted: 'var(--wr-muted, #6B7280)',
  brand: 'var(--wr-brand, #008CCD)',
  action: 'var(--wr-action, #0077FF)',
  pastel: 'var(--wr-bg-pastel, #D9EEF8)',
  ok: 'var(--wr-ok, #10B981)',
  warn: 'var(--wr-warn, #F59E0B)',
  critical: 'var(--wr-critical, #EF4444)',
  radius: 'var(--wr-radius, 6px)',
  shadowSm: '0 1px 2px rgba(16, 24, 40, 0.06)',
};

const fontStack =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

/* ───────────────────────── Types ───────────────────────── */
export type KrMode = 'no-domain' | 'domain';
type Device = 'desktop' | 'mobile';
type DateRange = '30d' | '90d' | '12m';
type Source = 'gkp' | 'serp' | 'trends' | 'gsc' | 'ga4';
type QuickFilter = 'excludeBrand' | 'questions' | 'comparisons' | 'local' | 'commercial';

export interface QueryState {
  mode: KrMode;
  seeds: string[];
  domain?: string;
  includeSubdomains: boolean;
  competitors: string[];
  locale: { country: string; language: string };
  device: Device;
  dateRange: DateRange;
  sources: Source[];
  quickFilters: QuickFilter[];
}

/* Discover sources / table types */
type SourceType = 'autosuggest' | 'paa' | 'related' | 'competitor' | 'trends' | 'gkp' | 'gsc';
type GroupType = 'question' | 'comparison' | 'longtail' | 'exact' | 'localized' | 'commercial';
type IntentFull = 'informational' | 'commercial' | 'navigational' | 'transactional';

type SuggestionRow = {
  keyword: string;
  type: SourceType;
  group: GroupType;
  volume?: number;
  tm?: number;
  trend?: number[];
  flags: { brandLike?: boolean; containsCity?: boolean };
  sourceMeta?: { domain?: string };
};

type AggRow = {
  id: string;
  keyword: string;
  group: GroupType | 'commercial';
  type: SourceType[];
  intent: IntentFull;
  kd: number; // 0–100
  volume?: number;
  trend?: number[];
  cpc?: number;
  comp?: number; // 0–1
  results?: number;
  updatedAt: string;
  flags: string[];
  selected: boolean;
  contrib: Record<SourceType, boolean>;
};

type VisibleCols = Record<
  'keyword' | 'intent' | 'kd' | 'volume' | 'trend' | 'cpc' | 'comp' | 'results' | 'type' | 'updated' | 'flags',
  boolean
>;

/* ───────────────────────── Utilities ───────────────────────── */
const MAX_SEEDS_DEFAULT = 500;
const DOMAIN_RE = /^(?:https?:\/\/)?([a-z0-9-]+(\.[a-z0-9-]+)+)(?:\/.*)?$/i;
const normKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const idFor = (s: string) => 'kw_' + normKey(s).replace(/[^a-z0-9]+/g, '_').slice(0, 60);
const fmtNum = (n?: number) => (n == null ? '' : n.toLocaleString());

const INTENT_MAP: Record<IntentFull, { label: string; dot: string; abbr: string }> = {
  informational: { label: 'Informational', dot: '#6366F1', abbr: 'I' },
  commercial: { label: 'Commercial', dot: '#10B981', abbr: 'C' },
  navigational: { label: 'Navigational', dot: '#F59E0B', abbr: 'N' },
  transactional: { label: 'Transactional', dot: '#EF4444', abbr: 'T' },
};
const kdLevel = (kd: number) => (kd >= 70 ? 'hard' : kd >= 40 ? 'medium' : 'easy');
const kdColor = (kd: number) => (kd >= 70 ? TK.critical : kd >= 40 ? TK.warn : TK.ok);

const unique = <T,>(arr: T[]) => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = String(item).toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
};
const splitSeeds = (raw: string) =>
  raw
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
const normalizeDomain = (input: string): string | null => {
  const v = input.trim().toLowerCase();
  if (!v) return null;
  const m = v.match(DOMAIN_RE);
  if (!m) return null;
  return m[1].replace(/\/+$/, '');
};

/* ───────────────────────── Micro atoms ───────────────────────── */
const Chip = React.forwardRef<
  HTMLSpanElement,
  { children: React.ReactNode; onRemove?: () => void; title?: string; bg?: string }
>(({ children, onRemove, title, bg }, ref) => (
  <span
    ref={ref}
    className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]"
    style={{ borderColor: TK.borderLight, background: bg ?? '#FFF' }}
    title={title}
  >
    {children}
    {onRemove && (
      <button aria-label="Remove" className="ml-1 rounded hover:bg-[#F2F4F7] cursor-pointer" onClick={onRemove}>
        <X size={14} />
      </button>
    )}
  </span>
));
Chip.displayName = 'Chip';

const ToggleChip: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  radius?: 'full' | '6';
  borderColor?: string;
}> = ({ active, label, onClick, icon, disabled, radius = 'full', borderColor }) => (
  <button
    type="button"
    className={cn(
      'h-8 px-3 border text-sm inline-flex items-center gap-1',
      radius === 'full' ? 'rounded-full' : 'rounded-[6px]',
      disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#F7FAFC]',
      'cursor-pointer',
    )}
    style={{ borderColor: borderColor ?? TK.borderLight, background: active ? TK.pastel : '#FFF' }}
    onClick={disabled ? undefined : onClick}
    aria-pressed={active}
  >
    {icon}
    {label}
  </button>
);

const SegmentedDevice: React.FC<{ value: Device; onChange: (d: Device) => void }> = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Device"
    className="inline-flex items-center gap-1 p-0.5 rounded-[6px] bg-white"
    style={{ border: `1px solid ${TK.border}` }}
  >
    <button
      role="radio"
      aria-checked={value === 'desktop'}
      className="px-3 h-8 text-[13px] font-semibold rounded-[6px] cursor-pointer"
      style={value === 'desktop' ? { background: TK.pastel, color: TK.text, border: `1px solid ${TK.border}` } : { background: '#FFF', color: TK.muted, border: `1px solid ${TK.border}` }}
      onClick={() => onChange('desktop')}
    >
      <span className="inline-flex items-center gap-1">
        <Monitor size={16} /> Desktop
      </span>
    </button>
    <button
      role="radio"
      aria-checked={value === 'mobile'}
      className="px-3 h-8 text-[13px] font-semibold rounded-[6px] cursor-pointer"
      style={value === 'mobile' ? { background: TK.pastel, color: TK.text, border: `1px solid ${TK.border}` } : { background: '#FFF', color: TK.muted, border: `1px solid ${TK.border}` }}
      onClick={() => onChange('mobile')}
    >
      <span className="inline-flex items-center gap-1">
        <Smartphone size={16} /> Mobile
      </span>
    </button>
  </div>
);

/* ───────────────────────── Seeds Chip Input ───────────────────────── */
const SeedsInput: React.FC<{
  seeds: string[];
  setSeeds: (seeds: string[]) => void;
  maxSeeds: number;
  error?: string;
  onImportCsv: (rows: string[]) => void;
}> = ({ seeds, setSeeds, maxSeeds, error, onImportCsv }) => {
  const [draft, setDraft] = React.useState('');
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  function addSeeds(incoming: string[]) {
    const clean = incoming.map((s) => s.trim()).filter((s) => s.length >= 2);
    const deduped = unique([...seeds, ...clean]).slice(0, maxSeeds);
    setSeeds(deduped);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      if (draft.trim()) {
        addSeeds(splitSeeds(draft));
        setDraft('');
      }
    } else if (e.key === 'Backspace' && !draft && seeds.length > 0) {
      setSeeds(seeds.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (text && /[\n,;]/.test(text)) {
      e.preventDefault();
      addSeeds(splitSeeds(text));
      setDraft('');
    }
  }

  async function handleFile(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const text = await f.text();
    const rows = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .flatMap((line) => line.split(',').map((c) => c.replace(/^"(.*)"$/, '$1').trim()))
      .filter(Boolean);
    onImportCsv(rows);
  }

  return (
    <div className="w-full ">
      <div className="rounded-md border p-2" style={{ borderColor: TK.border, background: '#FFF' }}>
        <div className="flex items-start gap-2">
          <Search size={16} className="mt-1 text-[#9E9E9E]" aria-hidden="true" />
          <div className="flex-1">
            {/* Chips + input */}
            <div className="flex flex-wrap items-center gap-1">
              {seeds.map((s, i) => (
                <Chip key={`${s}-${i}`} bg={TK.pastel} onRemove={() => setSeeds(seeds.filter((_, idx) => idx !== i))}>
                  {s}
                </Chip>
              ))}
              <input
                aria-label="Enter keywords"
                className="min-w-[240px] flex-1 outline-none text-sm py-1"
                placeholder="Enter keywords (comma or new line)…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={seeds.length >= maxSeeds}
              />
            </div>

            {/* actions */}
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setPasteOpen(true)}>
                <Upload className="h-4 w-4 mr-1" /> Paste list
              </Button>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files)} />
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Import .csv
              </Button>
              <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setSeeds([])}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {seeds.length} / {MAX_SEEDS_DEFAULT}
              </span>
            </div>
          </div>
        </div>
      </div>
      {error && (
        <div id="seeds-error" className="mt-1 text-sm" style={{ color: TK.critical }}>
          {error}
        </div>
      )}

      {/* Paste dialog */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Paste your keyword list</DialogTitle>
          </DialogHeader>
          <Textarea rows={8} placeholder="Paste keywords here (comma or new line)…" id="paste-textarea" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const el = document.getElementById('paste-textarea') as HTMLTextAreaElement | null;
                if (!el) return;
                const list = splitSeeds(el.value);
                if (list.length) {
                  const deduped = unique([...seeds, ...list]).slice(0, MAX_SEEDS_DEFAULT);
                  setSeeds(deduped);
                }
                setPasteOpen(false);
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───────────────────────── QueryBar (merged into Discover tab) ───────────────────────── */
type QueryBarProps = {
  mode: KrMode;
  projectConnected?: boolean;
  defaultLocale?: { country: string; language: string };
  defaultDevice?: Device;
  defaultDateRange?: DateRange;
  defaultSources?: Source[];
  initial?: Partial<QueryState>;
  onDiscover: (payload: QueryState) => void | Promise<void>;
  onStateChange?: (state: QueryState) => void;
};
type LocationItem = {
  id: number;
  name: string;
  country_code: string;
  location_code: number;
  target_type: "Country" | "Region" | "City";
};

type LanguageItem = {
  id: number;
  name: string;
  code: string;
};

const BASE_KEYWORD_API = `${BASE_URL_WR}keyword-research-discover/`;
const BASE_ANALYZE_API = `${BASE_URL_WR}keyword-research-analyse/`;
const DEFAULT_ANALYZE_LOCALE = 'en-US';

const buildLocaleFromSelection = (language?: LanguageItem | null, countries?: LocationItem[]) => {
  const langPart = (language?.code || 'en').split(/[-_]/)[0]?.toLowerCase() || 'en';
  const countryPart = (countries && countries.length ? countries[0].country_code : 'US') || 'US';
  return `${langPart}-${countryPart.toUpperCase()}`;
};

const projectDisplayName = (project?: { name?: string | null; domain?: string | null; url?: string | null; id?: string | number } | null) => {
  if (!project) return 'Project';
  return (project.name && project.name.trim()) || project.domain || project.url || (project.id ? `Project #${project.id}` : 'Project');
};

const QueryBar: React.FC<QueryBarProps> = ({
  mode,
  projectConnected = false,
  defaultLocale = { country: 'US', language: 'en' },
  defaultDevice = 'desktop',
  defaultDateRange = '90d',
  defaultSources = ['gkp', 'serp', 'trends'],
  initial,
  onDiscover,
  onStateChange,
}) => {
  const [seeds, setSeeds] = React.useState<string[]>(initial?.seeds ?? []);
  const [domain, setDomain] = React.useState<string>(initial?.domain ?? '');
  const [includeSub, setIncludeSub] = React.useState<boolean>(initial?.includeSubdomains ?? true);
  const [competitors, setCompetitors] = React.useState<string[]>(initial?.competitors ?? []);
  const [country, setCountry] = React.useState<string>(initial?.locale?.country ?? defaultLocale.country);
  const [language, setLanguage] = React.useState<string>(initial?.locale?.language ?? defaultLocale.language);
  const [device, setDevice] = React.useState<Device>(initial?.device ?? defaultDevice);
  const [dateRange, setDateRange] = React.useState<DateRange>(initial?.dateRange ?? defaultDateRange);
  const [sources, setSources] = React.useState<Source[]>(initial?.sources ?? defaultSources);
  const [quickFilters, setQuickFilters] = React.useState<QuickFilter[]>(initial?.quickFilters ?? []);
  const [errors, setErrors] = React.useState<{ seeds?: string; domain?: string; competitor?: string }>({});

  // --- Countries (search + multi select) ---
  const [searchTerm, setSearchTerm] = React.useState("");
  const [fetchingCont, setFetchingCont] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<LocationItem[]>([]);
  const [selectedCountries, setSelectedCountries] = React.useState<LocationItem[]>([]);

  // --- Languages (API) ---
  const [languages, setLanguages] = React.useState<LanguageItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = React.useState<LanguageItem | null>(null);

  const announce = React.useCallback(() => {
    onStateChange?.({
      mode,
      seeds,
      domain: domain || undefined,
      includeSubdomains: includeSub,
      competitors,
      locale: { country, language },
      device,
      dateRange,
      sources,
      quickFilters,
    });
  }, [mode, seeds, domain, includeSub, competitors, country, language, device, dateRange, sources, quickFilters, onStateChange]);

  React.useEffect(() => {
    announce();
  }, [announce]);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await axios.get<LanguageItem[]>(`${BASE_URL_WR}get-languages/`);
        setLanguages(res.data || []);
        const match = res.data?.find(l => l.code === language) || res.data?.[0] || null;
        if (match) {
          setSelectedLanguage(match);
          setLanguage(match.code);
        }
      } catch (e) {
        console.error("Failed to load languages", e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (searchTerm.trim().length >= 3) {
      const fetchSuggestions = async () => {
        try {
          setFetchingCont(true);
          const response = await axios.get(`${BASE_URL_WR}search-locations/?search_term=${encodeURIComponent(searchTerm)}`);
          setSuggestions(response.data?.data || []);
        } catch (error) {
          console.error("Error fetching locations:", error);
        } finally {
          setFetchingCont(false);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchTerm]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (seeds.length === 0) next.seeds = 'Add at least one keyword.';
    if (mode === 'domain' && !normalizeDomain(domain || '')) next.domain = 'Enter a valid domain.';
    if (!selectedLanguage) next.competitor = 'Choose a language.';
    if (selectedCountries.length === 0) next.competitor = 'Add at least one location.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleDiscover() {
    if (!validate()) return;
    const payload: QueryState = {
      mode,
      seeds,
      domain: normalizeDomain(domain || '') || undefined,
      includeSubdomains: includeSub,
      competitors,
      locale: { country, language },
      device,
      dateRange,
      sources,
      quickFilters,
    };
    (payload as any).__selectedCountries = selectedCountries;
    (payload as any).__selectedLanguage = selectedLanguage;
    onDiscover(payload);
  }

  const toggleSource = (s: Source) =>
    setSources((prev) => {
      const on = prev.includes(s);
      if (on) {
        const next = prev.filter((x) => x !== s);
        return next.length ? next : prev;
      }
      return [...prev, s];
    });

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="bg-white z-[70]"
        style={{
          borderBottom: `1px solid ${TK.borderLight}`,
          fontFamily: fontStack,
        }}
        aria-label="Keyword Research Query Bar"
      >
        <div className="px-4 py-3">
          <div className="space-y-4">

            {/* Row 1: Seeds + (Domain + Competitors) */}
            <div className="flex gap-4 justify-between">
              {/* Seeds */}
              <div className="w-full h-full">
                <div className=" inline-flex items-center gap-1">
                  <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">
                    Seeds
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-[#9E9E9E] cursor-pointer" aria-label="Seeds info">
                        <Info size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" sideOffset={6} className="text-xs z-[300]">
                      Paste or type keywords. Use comma or new lines. Up to 500 terms.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <SeedsInput
                  seeds={seeds}
                  setSeeds={setSeeds}
                  maxSeeds={MAX_SEEDS_DEFAULT}
                  error={errors.seeds}
                  onImportCsv={(rows) => setSeeds((p) => unique([...p, ...rows]).slice(0, MAX_SEEDS_DEFAULT))}
                />
              </div>

              {/* Right stack: Domain + Competitors */}
              <div className="w-full space-y-2">
                {/* Domain */}
                <div className="w-full">
                  <div className="mb-1 inline-flex items-center gap-1">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.04em]">
                      Domain
                    </h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-[#9E9E9E] cursor-pointer" aria-label="Domain info">
                          <Info size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" sideOffset={6} className="text-xs z-[300]">
                        {mode === 'domain' ? 'Required in Domain-Aware.' : 'Optional in No-Domain.'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Globe className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
                      <Input
                        className="pl-7 h-9"
                        placeholder="example.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        aria-invalid={!!errors.domain}
                      />
                    </div>
                    <ToggleChip
                      active={includeSub}
                      label="Include subdomains"
                      onClick={() => setIncludeSub((v) => !v)}
                      radius="6"
                      borderColor={TK.border}
                    />
                  </div>
                  {errors.domain && (
                    <div id="domain-error" className="mt-1 text-sm" style={{ color: TK.critical }}>
                      {errors.domain}
                    </div>
                  )}
                </div>

                {/* Competitors */}
                {/* <div className="w-full">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.04em] inline-flex items-center gap-1">
                      Competitors <IconUsers size={16} className="text-[#9E9E9E]" />
                    </h3>
                    <div className="text-[11px] text-muted-foreground">Up to 10 domains</div>
                  </div>
                  <div
                    className="rounded-md border bg-white px-2 py-1.5"
                    style={{ borderColor: TK.border }}
                  >
                    <div className="flex flex-wrap items-center gap-1">
                      {competitors.map((c, i) => (
                        <Chip key={`${c}-${i}`} onRemove={() => setCompetitors(competitors.filter((_, idx) => idx !== i))}>
                          {c}
                        </Chip>
                      ))}
                      <input
                        aria-label="Add competitor domain"
                        className="min-w-[180px] flex-1 outline-none text-sm py-1"
                        placeholder="competitor.com (Enter to add)"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = (e.target as HTMLInputElement).value;
                            if (v.trim()) {
                              const norm = normalizeDomain(v);
                              if (norm && !competitors.includes(norm) && competitors.length < 10) {
                                setCompetitors([...competitors, norm]);
                              }
                            }
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div> */}
              </div>
            </div>

            {/* Row 2: Locale / Device / Date range */}
            <div className="flex gap-4 justify-between">
              {/* Country */}
              <div className="w-full">
                <div className="mb-1 inline-flex items-center gap-1">
                  <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.04em] inline-flex items-center gap-1">
                    Country <Globe size={16} className="text-[#9E9E9E]" />
                  </h3>
                </div>
                {selectedCountries.length > 0 && <div className="flex flex-wrap gap-1 mb-1 min-h-[24px]">
                  {selectedCountries.map((c, idx) => (
                    <Chip
                      key={`${c.id}-${idx}`}
                      onRemove={() => setSelectedCountries(selectedCountries.filter((_, i) => i !== idx))}
                      bg={TK.pastel}
                    >
                      {c.name}
                      <span className="ml-1 text-[11px] text-muted-foreground">({c.target_type})</span>
                    </Chip>
                  ))}
                </div>}
                <div className="relative">
                  <Input
                    className="h-8 px-3"
                    placeholder="Type location (3+ chars)…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {!!suggestions.length && (
                    <div
                      className="absolute z-[300] mt-1 w-full rounded-md border bg-white shadow-sm max-h-[220px] overflow-auto"
                      style={{ borderColor: TK.borderLight }}
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-[#F7FAFC] cursor-pointer"
                          onClick={() => {
                            if (!selectedCountries.some(c => c.id === s.id)) {
                              setSelectedCountries([...selectedCountries, s]);
                            }
                            setSearchTerm("");
                            setSuggestions([]);
                          }}
                        >
                          <div className="font-medium">{s.name}</div>
                          <div className="text-[12px] text-muted-foreground">
                            {s.country_code} · {s.target_type} · {s.location_code}
                          </div>
                        </button>
                      ))}
                      {fetchingCont && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Loading…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className='w-full flex gap-4'>
                {/* Language */}
                <div className="">
                  <div className="mb-1 inline-flex items-center gap-1">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.04em] inline-flex items-center gap-1">
                      Language <IconLanguages size={16} className="text-[#9E9E9E]" />
                    </h3>
                  </div>
                  <Select
                    value={selectedLanguage?.id ? String(selectedLanguage.id) : undefined}
                    onValueChange={(v) => {
                      const lang = languages.find(l => String(l.id) === v) || null;
                      setSelectedLanguage(lang);
                      if (lang) setLanguage(lang.code);
                    }}
                  >
                    <SelectTrigger className="h-8 px-3">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[300]">
                      {languages.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name} ({l.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date range */}
                <div className="">
                  <div className="mb-1 inline-flex items-center gap-1">
                    <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.04em] inline-flex items-center gap-1">
                      Date range <IconCalendarRange size={16} className="text-[#9E9E9E]" />
                    </h3>
                  </div>
                  <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
                    <SelectTrigger className="h-8 px-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[300]">
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                      <SelectItem value="12m">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>

            {/* Row 3: Sources + Quick filters + CTAs */}
            <div className="">

              {/* CTA group */}
              <div className="w-full flex  gap-2">
                <Button
                  className="h-10 px-4 cursor-pointer"
                  style={{ background: TK.brand, color: '#FFF' }}
                  onClick={handleDiscover}
                  disabled={
                    seeds.length === 0 ||
                    !selectedLanguage ||
                    selectedCountries.length === 0 ||
                    (mode === 'domain' && !normalizeDomain(domain || ''))
                  }
                >
                  <Play className="h-4 w-4 mr-2" />
                  Discover
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4 cursor-pointer"
                  onClick={() => {
                    setSeeds([]);
                    setDomain('');
                    setIncludeSub(true);
                    setCompetitors([]);
                    setCountry(defaultLocale.country);
                    setLanguage(defaultLocale.language);
                    setDevice(defaultDevice);
                    setDateRange(defaultDateRange);
                    setSources(defaultSources);
                    setQuickFilters([]);
                    setErrors({});
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};


/* ───────────────────────── Source Card (carousel item) ───────────────────────── */
const CARD_INFO: Record<SourceType, string> = {
  autosuggest: 'Autocomplete ideas drawn from search boxes.',
  paa: '“People Also Ask” questions from SERPs.',
  related: 'Related searches from SERP footers.',
  competitor: 'Ideas influenced by competitor domains.',
  trends: 'Topics/queries trending over time.',
  gkp: 'Google Keyword Planner-style expansions (mock).',
  gsc: 'Search Console expansions from connected property (mock).',
};

const SourceCard: React.FC<{
  source: SourceType;
  title: string;
  titleIcon: React.ReactNode; // brand‑colored icon
  rows: SuggestionRow[];
  showInAggregate: boolean;
  onToggleShowInAggregate: (source: SourceType, next: boolean, allRows: SuggestionRow[]) => void;
  onQuickAdd: (source: SourceType, row: SuggestionRow) => void;
  onAddSelected: (source: SourceType, rows: SuggestionRow[]) => void;
  onAddAll: (source: SourceType, rows: SuggestionRow[]) => void;
  onVisibleChanged?: (source: SourceType, visibleRows: SuggestionRow[]) => void;
  maxVisible?: number;
}> = ({
  source,
  title,
  titleIcon,
  rows,
  showInAggregate,
  onToggleShowInAggregate,
  onQuickAdd,
  onAddSelected,
  onAddAll,
  onVisibleChanged,
  maxVisible = 8,
}) => {
    const [showMore, setShowMore] = React.useState(false);
    const [selected, setSelected] = React.useState<Record<number, boolean>>({});
    const visible = React.useMemo(() => (showMore ? rows : rows.slice(0, maxVisible)), [rows, showMore, maxVisible]);

    React.useEffect(() => setSelected({}), [rows]);

    const cbRef = React.useRef(onVisibleChanged);
    React.useEffect(() => {
      cbRef.current = onVisibleChanged;
    }, [onVisibleChanged]);

    const lastSig = React.useRef<string>('');
    React.useEffect(() => {
      const sig = visible.map((v) => v.keyword).join('|');
      if (sig !== lastSig.current) {
        lastSig.current = sig;
        cbRef.current?.(source, visible);
      }
    }, [source, visible]);

    const selectedRows = visible.filter((_, i) => selected[i]);

    return (
      <div className="min-w-[360px] max-w-[360px] shrink-0 rounded-md border bg-white p-3 hover:shadow-sm" style={{ borderColor: TK.border }}>
        {/* Card header with tooltip */}
        <div className="mb-2 flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-2 cursor-help">
                <span className="shrink-0">{titleIcon}</span>
                <div className="font-medium">{title}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{CARD_INFO[source]}</TooltipContent>
          </Tooltip>

          <button
            className="h-8 px-3 rounded-[6px] border text-sm cursor-pointer"
            style={{ borderColor: TK.border, background: showInAggregate ? TK.pastel : '#FFF' }}
            onClick={() => onToggleShowInAggregate(source, !showInAggregate, rows)}
            aria-pressed={showInAggregate}
          >
            Show in aggregate
          </button>
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {rows.length === 0 ? (
            <div className="py-4 text-sm text-muted-foreground">No suggestions.</div>
          ) : (
            visible.map((r, i) => (
              <div key={`${r.keyword}-${i}`} className="flex items-center gap-2 py-1.5">
                <Checkbox checked={!!selected[i]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: Boolean(v) }))} />
                <div className="flex-1 truncate">
                  <span className="font-medium">{r.keyword}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{r.group}</span>
                  {typeof r.volume === 'number' && <span className="ml-2 text-xs text-muted-foreground">• {r.volume.toLocaleString()}</span>}
                  {r.sourceMeta?.domain && <span className="ml-2 text-xs text-muted-foreground">• {r.sourceMeta.domain}</span>}
                </div>
                <Button variant="ghost" size="icon" aria-label="Quick add" className="cursor-pointer" onClick={() => onQuickAdd(source, r)}>
                  <Plus size={16} />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && (
          <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: TK.borderLight }}>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => onAddSelected(source, selectedRows)} disabled={selectedRows.length === 0}>
                Add selected
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => onAddAll(source, rows)}>
                Add all ({rows.length})
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setShowMore((v) => !v)}>
              {showMore ? 'Show less' : `Show more (${Math.max(0, rows.length - maxVisible)})`}
            </Button>
          </div>
        )}
      </div>
    );
  };

/* ───────────────────────── Trend sparkline (small) ───────────────────────── */
const TrendMini: React.FC<{ data?: number[] }> = ({ data }) => {
  if (!data || data.length === 0) return <span className="text-xs text-muted-foreground">–</span>;
  const W = 70;
  const H = 24;
  const pad = 1;
  const xs = data.map((_, i) => i / (data.length - 1));
  const min = Math.min(...data);
  const max = Math.max(...data);
  const ys = data.map((v) => (max === min ? 0.5 : 1 - (v - min) / (max - min)));
  const pts = xs.map((x, i) => `${pad + x * (W - pad * 2)},${pad + ys[i] * (H - pad * 2)}`).join(' ');
  const area = `M ${pad},${H - pad} L ${pts} L ${W - pad},${H - pad} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="cursor-default">
      <path d={area} fill="rgba(0,140,205,.16)" />
      <polyline points={pts} fill="none" stroke={TK.brand} strokeWidth={1.6} />
    </svg>
  );
};

const IntentBadge: React.FC<{ intent: IntentFull }> = ({ intent }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-xs cursor-default">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: INTENT_MAP[intent].dot }} />
          <span className="inline-block w-4 h-4 text-[11px] font-semibold leading-[16px] text-center" style={{ color: TK.text }}>
            {INTENT_MAP[intent].abbr}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{INTENT_MAP[intent].label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const KDDot: React.FC<{ kd: number }> = ({ kd }) => {
  const color = kdColor(kd);
  const label = kd >= 70 ? 'Hard' : kd >= 40 ? 'Medium' : 'Easy';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs cursor-default">
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
            <span>{kd}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          Difficulty {kd} • {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/* ───────────────────────── Aggregate Table (with sorting) ───────────────────────── */
type TrendDir = 'rising' | 'falling' | 'flat';
type AggFilters = {
  q: string;
  intents: IntentFull[];
  kdBuckets: Array<'easy' | 'medium' | 'hard'>;
  types: SourceType[];
  trendDirs: TrendDir[];
  volumeBuckets: Array<'vLow' | 'vMid' | 'vHigh'>;
  cpcBuckets: Array<'cLow' | 'cMid' | 'cHigh'>;
  compBuckets: Array<'cdLow' | 'cdMid' | 'cdHigh'>;
  resultsBuckets: Array<'rLow' | 'rMid' | 'rHigh'>;
  updatedWindows: Array<'24h' | '7d' | '30d' | '90d'>;
  flags: string[];
};

type SortKey = 'keyword' | 'intent' | 'kd' | 'volume' | 'trend' | 'cpc' | 'comp' | 'results' | 'updated' | 'type' | 'flags';
type SortDir = 'asc' | 'desc';

const SortHeader: React.FC<{
  label: string;
  column: SortKey;
  sortBy: SortKey;
  dir: SortDir;
  onSort: (col: SortKey) => void;
  align?: 'left' | 'center' | 'right';
  tip?: string;
}> = ({ label, column, sortBy, dir, onSort, align = 'left', tip }) => {
  const active = sortBy === column;
  const btn = (
    <button
      className={cn('flex items-center gap-1 w-full select-none', 'cursor-pointer', align === 'right' && 'justify-end', align === 'center' && 'justify-center')}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(column)}
    >
      <span className={cn('text-sm font-medium', active && 'underline')}>{label}</span>
      {active ? (dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : null}
    </button>
  );
  return tip ? (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{tip}</TooltipContent>
    </Tooltip>
  ) : (
    btn
  );
};

type AggregateTableHandle = {
  exportCsv: (scope?: 'filtered' | 'selected' | 'all') => void;
  getSelectedCount: () => number;
};

type KeywordList = {
  id: string;
  name: string;
  count: number;
};

const AggregateTable = React.forwardRef<AggregateTableHandle, {
  rows: AggRow[];
  setRows: (rows: AggRow[]) => void;
  visibleCols: VisibleCols;
  onAddToAnalyze?: (rows: AggRow[]) => void;
  isLoading?: boolean;
}>(({ rows, setRows, visibleCols, onAddToAnalyze, isLoading = false }, ref) => {
  
  const [filters, setFilters] = React.useState<AggFilters>({
    q: '',
    intents: [],
    kdBuckets: [],
    types: [],
    trendDirs: [],
    volumeBuckets: [],
    cpcBuckets: [],
    compBuckets: [],
    resultsBuckets: [],
    updatedWindows: [],
    flags: [],
  });
  const [sortBy, setSortBy] = React.useState<SortKey>('keyword');
  const [dir, setDir] = React.useState<SortDir>('asc');
  const [quickFilters, setQuickFilters] = React.useState<QuickFilter[]>([]);
  const PAGE_SIZE = 10;
  const [page, setPage] = React.useState(1);
  const [lists, setLists] = React.useState<KeywordList[]>([
    { id: 'shortlist', name: 'Shortlist', count: 0 },
    { id: 'contentIdeas', name: 'Content ideas', count: 0 },
  ]);
  const selectedRows = React.useMemo(() => rows.filter((r) => r.selected), [rows]);

  const sendToAnalyze = React.useCallback((payload: AggRow[]) => {
    if (!payload.length) {
      message.warning('Select at least one keyword first');
      return;
    }
    if (!onAddToAnalyze) {
      message.info('Analyze workflow coming soon');
      return;
    }
    onAddToAnalyze(payload);
  }, [onAddToAnalyze]);

  const addKeywordsToList = React.useCallback((listId: string, keywords: AggRow[]) => {
    if (!keywords.length) {
      message.warning('Select at least one keyword first');
      return;
    }
    const target = lists.find((list) => list.id === listId);
    if (!target) {
      message.error('List not found');
      return;
    }
    setLists((prev) =>
      prev.map((list) => (list.id === listId ? { ...list, count: list.count + keywords.length } : list)),
    );
    message.success(`Added ${keywords.length} keyword${keywords.length === 1 ? '' : 's'} to "${target.name}"`);
  }, [lists]);

  const createListAndAdd = React.useCallback((keywords: AggRow[]) => {
    const base = `List ${new Date().toLocaleDateString()}`;
    const existing = lists.filter((l) => l.name.startsWith(base)).length;
    const name = existing ? `${base} (${existing + 1})` : base;
    const id = `list_${Date.now().toString(36)}`;
    setLists((prev) => [...prev, { id, name, count: keywords.length }]);
    if (keywords.length) {
      message.success(`Created "${name}" with ${keywords.length} keyword${keywords.length === 1 ? '' : 's'}`);
    } else {
      message.success(`Created empty list "${name}"`);
    }
  }, [lists]);

  const setSort = (col: SortKey) => {
    if (col === sortBy) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(col);
      setDir('asc');
    }
  };

  const allFlags = React.useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.flags.forEach((f) => set.add(f)));
    if (!set.size) ['brandLike', 'containsCity'].forEach((f) => set.add(f));
    return Array.from(set.values());
  }, [rows]);

  const trendDirOf = (t?: number[]): TrendDir | null => {
    if (!t || t.length < 2) return null;
    const delta = t[t.length - 1] - t[0];
    if (delta > 5) return 'rising';
    if (delta < -5) return 'falling';
    return 'flat';
  };
  const volumeBucket = (v?: number) => (v == null ? null : v < 1000 ? 'vLow' : v < 10000 ? 'vMid' : 'vHigh');
  const cpcBucket = (v?: number) => (v == null ? null : v < 1 ? 'cLow' : v <= 3 ? 'cMid' : 'cHigh');
  const compBucket = (v?: number) => (v == null ? null : v < 0.3 ? 'cdLow' : v <= 0.7 ? 'cdMid' : 'cdHigh');
  const resultsBucket = (v?: number) => (v == null ? null : v < 100_000 ? 'rLow' : v <= 1_000_000 ? 'rMid' : 'rHigh');
  const withinWindow = (iso: string, w: '24h' | '7d' | '30d' | '90d') => {
    const ms = Date.now() - new Date(iso).getTime();
    const day = 24 * 60 * 60 * 1000;
    const max = w === '24h' ? day : w === '7d' ? 7 * day : w === '30d' ? 30 * day : 90 * day;
    return ms <= max;
  };

  const filtered = React.useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.keyword.toLowerCase().includes(q)) return false;
      if (filters.intents.length && !filters.intents.includes(r.intent)) return false;
      if (filters.kdBuckets.length && !filters.kdBuckets.includes(kdLevel(r.kd) as any)) return false;
      if (filters.types.length && !r.type.some((t) => filters.types.includes(t))) return false;
      if (filters.trendDirs.length) {
        const d = trendDirOf(r.trend);
        if (!d || !filters.trendDirs.includes(d)) return false;
      }
      if (filters.volumeBuckets.length) {
        const b = volumeBucket(r.volume);
        if (!b || !filters.volumeBuckets.includes(b)) return false;
      }
      if (filters.cpcBuckets.length) {
        const b = cpcBucket(r.cpc);
        if (!b || !filters.cpcBuckets.includes(b)) return false;
      }
      if (filters.compBuckets.length) {
        const b = compBucket(r.comp);
        if (!b || !filters.compBuckets.includes(b)) return false;
      }
      if (filters.resultsBuckets.length) {
        const b = resultsBucket(r.results);
        if (!b || !filters.resultsBuckets.includes(b)) return false;
      }
      if (filters.updatedWindows.length && !filters.updatedWindows.some((w) => withinWindow(r.updatedAt, w))) return false;
      if (filters.flags.length && !filters.flags.some((f) => r.flags.includes(f))) return false;
      return true;
    });
  }, [rows, filters]);

  const sorted = React.useMemo(() => {
    const mul = dir === 'asc' ? 1 : -1;
    const valueFor = (r: AggRow) => {
      switch (sortBy) {
        case 'keyword': return r.keyword.toLowerCase();
        case 'intent': return r.intent;
        case 'kd': return r.kd;
        case 'volume': return r.volume ?? -1;
        case 'trend': return r.trend?.at(-1) ?? -1;
        case 'cpc': return r.cpc ?? -1;
        case 'comp': return r.comp ?? -1;
        case 'results': return r.results ?? -1;
        case 'updated': return new Date(r.updatedAt).getTime();
        case 'type': return r.type.join('|');
        case 'flags': return r.flags.join('|');
        default: return '';
      }
    };
    return [...filtered].sort((a, b) => {
      const va = valueFor(a);
      const vb = valueFor(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
  }, [filtered, sortBy, dir]);

  React.useEffect(() => {
    setPage(1);
  }, [filters, quickFilters, sortBy, dir, rows.length]);
  React.useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    setPage((prev) => (prev > maxPage ? maxPage : prev));
  }, [sorted.length]);

  const pageRows = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const selectedCount = selectedRows.length;

  const hasActiveFilters = React.useMemo(() => {
  const {
    q,
    intents,
    kdBuckets,
    types,
    trendDirs,
    volumeBuckets,
    cpcBuckets,
    compBuckets,
    resultsBuckets,
    updatedWindows,
    flags,
  } = filters;

  return Boolean(
    q ||
      intents.length ||
      kdBuckets.length ||
      types.length ||
      trendDirs.length ||
      volumeBuckets.length ||
      cpcBuckets.length ||
      compBuckets.length ||
      resultsBuckets.length ||
      updatedWindows.length ||
      flags.length ||
      quickFilters.length,
  );
}, [filters, quickFilters]);


  const handleAddSelected = React.useCallback(() => {
    sendToAnalyze(selectedRows);
  }, [selectedRows, sendToAnalyze]);

  const allSelected = pageRows.length > 0 && pageRows.every((r) => r.selected);

  const toggleAll = () => {
    const idsOnPage = new Set(pageRows.map((r) => r.id));
    setRows(rows.map((r) => (idsOnPage.has(r.id) ? { ...r, selected: !allSelected } : r)));
  };

  // Export helper
  const makeCsv = (data: AggRow[]) => {
    const lines = [
      ['keyword', 'intent', 'kd', 'volume', 'cpc', 'comp', 'results', 'types', 'updatedAt', 'flags'].join(','),
      ...data.map((r) =>
        [JSON.stringify(r.keyword), r.intent, r.kd, r.volume ?? '', r.cpc ?? '', r.comp ?? '', r.results ?? '', r.type.join('|'), r.updatedAt, r.flags.join('|')].join(','),
      ),
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'discover-aggregate.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  React.useImperativeHandle(ref, () => ({
    exportCsv: (scope = 'filtered') => {
      if (scope === 'selected') makeCsv(rows.filter((r) => r.selected));
      else if (scope === 'all') makeCsv(rows);
      else makeCsv(sorted);
    },
    getSelectedCount: () => selectedCount,
  }), [rows, sorted, selectedCount]);

  /* Dropdown builders for filters */
const MenuWrap: React.FC<{ label: string; children: React.ReactNode; active?: boolean }> = ({
  label,
  children,
  active = false,
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className={cn('h-8 px-3 cursor-pointer', active && 'font-semibold')}
        style={{
          borderColor: active ? TK.brand : TK.borderLight,
          background: active ? TK.pastel : '#FFF',
          color: active ? TK.text : undefined,
        }}
      >
        {label}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-[220px] z-[300]">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);


  const intentOptions: IntentFull[] = ['informational', 'commercial', 'navigational', 'transactional'];
  const trendOptions: TrendDir[] = ['rising', 'flat', 'falling'];
  const typeOptions: SourceType[] = ['autosuggest', 'paa', 'related', 'competitor', 'trends', 'gkp', 'gsc'];
  const AddToListDropdown: React.FC<{
    keywords: AggRow[];
    size?: 'default' | 'sm';
    variant?: 'default' | 'outline';
    align?: 'start' | 'end';
    disabled?: boolean;
  }> = ({ keywords, size = 'sm', variant = 'outline', align = 'start', disabled = false }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} className="cursor-pointer" disabled={disabled}>
          <BookmarkPlus className="h-4 w-4 mr-1" /> Add to List
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-[240px] z-[280]">
        <DropdownMenuLabel>Lists</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {lists.length === 0 && (
          <div className="px-2 py-1 text-xs text-muted-foreground">No lists yet. Create one below.</div>
        )}
        {lists.map((list) => (
          <DropdownMenuItem
            key={list.id}
            onClick={() => addKeywordsToList(list.id, keywords)}
            className="cursor-pointer"
            disabled={!keywords.length}
          >
            {list.name}
            <span className="ml-auto text-xs text-muted-foreground">{list.count}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => createListAndAdd(keywords)}
          className="cursor-pointer"
          disabled={!keywords.length}
        >
          <Plus className="h-4 w-4 mr-1" /> Create new list
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="rounded-md border bg-white" style={{ borderColor: TK.borderLight }}>
      {/* Sub‑controls (filters bar) */}
      <div className="flex flex-wrap items-center gap-2 border-b p-3" style={{ borderColor: TK.borderLight }}>
        <div className="relative">
          <Input className="w-[260px] pl-7" placeholder="Search aggregate…" value={filters.q} onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))} />
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">/</span>
        </div>

        {/* Intents */}
        <MenuWrap label="Intent" active={filters.intents.length > 0}>
          {intentOptions.map((iv) => (
            <DropdownMenuCheckboxItem
              key={iv}
              checked={filters.intents.includes(iv)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  intents: v ? [...s.intents, iv] : s.intents.filter((x) => x !== iv),
                }))
              }
            >
              {INTENT_MAP[iv].label}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* KD */}
        <MenuWrap label="KD" active={filters.kdBuckets.length > 0}>
          {(['easy', 'medium', 'hard'] as const).map((b) => (
            <DropdownMenuCheckboxItem
              key={b}
              checked={filters.kdBuckets.includes(b)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  kdBuckets: v ? [...s.kdBuckets, b] : s.kdBuckets.filter((x) => x !== b),
                }))
              }
            >
              {b === 'easy' ? 'KD Easy' : b === 'medium' ? 'KD Medium' : 'KD Hard'}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Type */}
        <MenuWrap label="Type"  active={filters.types.length > 0}>
          {typeOptions.map((t) => (
            <DropdownMenuCheckboxItem
              key={t}
              checked={filters.types.includes(t)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  types: v ? [...s.types, t] : s.types.filter((x) => x !== t),
                }))
              }
            >
              {t}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Trend */}
        <MenuWrap label="Trend"  active={filters.trendDirs.length > 0}>
          {trendOptions.map((d) => (
            <DropdownMenuCheckboxItem
              key={d}
              checked={filters.trendDirs.includes(d)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  trendDirs: v ? [...s.trendDirs, d] : s.trendDirs.filter((x) => x !== d),
                }))
              }
            >
              {d === 'rising' ? 'Trend ↑' : d === 'falling' ? 'Trend ↓' : 'Trend →'}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Volume */}
        <MenuWrap label="Volume" active={filters.volumeBuckets.length > 0}>
          {(['vLow', 'vMid', 'vHigh'] as const).map((b) => (
            <DropdownMenuCheckboxItem
              key={b}
              checked={filters.volumeBuckets.includes(b)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  volumeBuckets: v ? [...s.volumeBuckets, b] : s.volumeBuckets.filter((x) => x !== b),
                }))
              }
            >
              {b === 'vLow' ? 'Vol <1K' : b === 'vMid' ? 'Vol 1–10K' : 'Vol 10K+'}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* CPC */}
        <MenuWrap label="CPC" active={filters.cpcBuckets.length > 0}>
          {(['cLow', 'cMid', 'cHigh'] as const).map((b) => (
            <DropdownMenuCheckboxItem
              key={b}
              checked={filters.cpcBuckets.includes(b)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  cpcBuckets: v ? [...s.cpcBuckets, b] : s.cpcBuckets.filter((x) => x !== b),
                }))
              }
            >
              {b === 'cLow' ? 'CPC <$1' : b === 'cMid' ? 'CPC $1–3' : 'CPC >$3'}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Competitive density */}
        <MenuWrap label="Comp Density" active={filters.compBuckets.length > 0}>
          {(['cdLow', 'cdMid', 'cdHigh'] as const).map((b) => (
            <DropdownMenuCheckboxItem
              key={b}
              checked={filters.compBuckets.includes(b)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  compBuckets: v ? [...s.compBuckets, b] : s.compBuckets.filter((x) => x !== b),
                }))
              }
            >
              {b === 'cdLow' ? 'CD <0.3' : b === 'cdMid' ? 'CD 0.3–0.7' : 'CD >0.7'}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Results */}
        <MenuWrap label="Results" active={filters.resultsBuckets.length > 0}>
          {(['rLow', 'rMid', 'rHigh'] as const).map((b) => (
            <DropdownMenuCheckboxItem
              key={b}
              checked={filters.resultsBuckets.includes(b)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  resultsBuckets: v ? [...s.resultsBuckets, b] : s.resultsBuckets.filter((x) => x !== b),
                }))
              }
            >
              {b === 'rLow' ? 'Results <100K' : b === 'rMid' ? 'Results 100K–1M' : 'Results >1M'}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Updated */}
        <MenuWrap label="Updated" active={filters.updatedWindows.length > 0}>
          {(['24h', '7d', '30d', '90d'] as const).map((w) => (
            <DropdownMenuCheckboxItem
              key={w}
              checked={filters.updatedWindows.includes(w)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  updatedWindows: v ? [...s.updatedWindows, w] : s.updatedWindows.filter((x) => x !== w),
                }))
              }
            >
              Updated {w}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        {/* Flags */}
        <MenuWrap label="Flags" active={filters.flags.length > 0}>
          {allFlags.map((f) => (
            <DropdownMenuCheckboxItem
              key={f}
              checked={filters.flags.includes(f)}
              onCheckedChange={(v) =>
                setFilters((s) => ({
                  ...s,
                  flags: v ? [...s.flags, f] : s.flags.filter((x) => x !== f),
                }))
              }
            >
              #{f}
            </DropdownMenuCheckboxItem>
          ))}
        </MenuWrap>

        <div className="flex flex-wrap items-center gap-2">
          {(['excludeBrand', 'questions', 'comparisons'] as QuickFilter[]).map((f) => (
            <ToggleChip
              key={f}
              active={quickFilters.includes(f)}
              label={f === 'excludeBrand' ? 'Exclude brand' : f[0].toUpperCase() + f.slice(1)}
              onClick={() =>
                setQuickFilters((prev) =>
                  prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
                )
              }
            />
          ))}
        </div>


        <div className="ml-auto text-sm text-muted-foreground flex gap-1.5 items-center">

<Button
  variant="ghost"
  size="sm"
  className="h-8 px-3 cursor-pointer"
  disabled={!hasActiveFilters}
  onClick={() => {
    setFilters({
      q: '',
      intents: [],
      kdBuckets: [],
      types: [],
      trendDirs: [],
      volumeBuckets: [],
      cpcBuckets: [],
      compBuckets: [],
      resultsBuckets: [],
      updatedWindows: [],
      flags: [],
    });
    setQuickFilters([]);
    setPage(1);
  }}
>
  <RotateCcw className="h-4 w-4 mr-1" /> Reset filters
</Button>
        </div>
      </div>

      {/* Bulk selection bar (above selected keywords) */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-white" style={{ borderColor: TK.borderLight }}>
          <div className="text-sm font-medium">{selectedCount} selected</div>
          <div className="flex items-center gap-2">

            <AddToListDropdown keywords={selectedRows} size="sm" variant="outline" disabled={!selectedCount} />
            <Button className="h-8 px-3 cursor-pointer" style={{ background: TK.brand, color: '#fff' }} onClick={handleAddSelected} disabled={!selectedCount}>
              <IconListChecks className="h-4 w-4 mr-1" /> Add to Analyze
            </Button>
            <Button
              variant="outline"
              className="h-8 px-3 cursor-pointer"
              onClick={() => {
                const chosen = rows.filter((r) => r.selected);
                if (!chosen.length) return;
                const csv = [
                  ['keyword', 'intent', 'kd', 'volume', 'cpc', 'comp', 'results', 'types', 'updatedAt', 'flags'].join(','),
                  ...chosen.map((r) =>
                    [JSON.stringify(r.keyword), r.intent, r.kd, r.volume ?? '', r.cpc ?? '', r.comp ?? '', r.results ?? '', r.type.join('|'), r.updatedAt, r.flags.join('|')].join(','),
                  ),
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'discover-selected.csv';
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="max-h-[560px] overflow-auto" aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
              <div key={`agg-skeleton-${idx}`} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-1 flex justify-center">
                  <div className="h-4 w-4 rounded bg-slate-200 animate-pulse" />
                </div>
                <div className="col-span-4 h-10 rounded bg-slate-100 animate-pulse" />
                <div className="col-span-2 h-8 rounded bg-slate-100/80 animate-pulse" />
                <div className="col-span-2 hidden md:block h-8 rounded bg-slate-100/70 animate-pulse" />
                <div className="col-span-3 h-8 rounded bg-slate-100/60 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader className="bg-white">
              <TableRow>
                <TableHead className="w-[46px]">
                  <Checkbox checked={allSelected} onCheckedChange={() => toggleAll()} />
                </TableHead>

                {visibleCols.keyword && (
                  <TableHead style={{ minWidth: 420 }}>
                    <SortHeader tip="The keyword text." label="Keyword" column="keyword" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}
                {visibleCols.intent && (
                  <TableHead className="w-[120px]">
                    <SortHeader tip="Primary search intent." label="Intent" column="intent" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}
                {visibleCols.kd && (
                  <TableHead className="w-[100px]">
                    <SortHeader tip="Keyword difficulty (0–100)." label="KD" column="kd" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}
                {visibleCols.volume && (
                  <TableHead className="w-[120px]">
                    <SortHeader tip="Estimated monthly searches." label="Volume" column="volume" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}

                {visibleCols.cpc && (
                  <TableHead className="w-[110px]">
                    <SortHeader tip="Average CPC in USD." label="CPC" column="cpc" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}
                {visibleCols.comp && (
                  <TableHead className="w-[150px]">
                    <SortHeader tip="Competitive density (0–1)." label="Competitive density" column="comp" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}

                {visibleCols.type && (
                  <TableHead className="w-[160px]">
                    <SortHeader tip="Sources contributing this keyword." label="Type" column="type" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}
                {visibleCols.updated && (
                  <TableHead className="w-[120px]">
                    <SortHeader tip="Last updated timestamp." label="Updated" column="updated" sortBy={sortBy} dir={dir} onSort={setSort} align="left" />
                  </TableHead>
                )}


                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.id} className="hover:bg-[#F8FAFC]">
                  <TableCell>
                    <Checkbox checked={r.selected} onCheckedChange={(v) => setRows(rows.map((x) => (x.id === r.id ? { ...x, selected: Boolean(v) } : x)))} />
                  </TableCell>

                  {visibleCols.keyword && <TableCell className="font-medium">{r.keyword}</TableCell>}
                  {visibleCols.intent && (
                    <TableCell>
                      <IntentBadge intent={r.intent} />
                    </TableCell>
                  )}
                  {visibleCols.kd && (
                    <TableCell>
                      <KDDot kd={r.kd} />
                    </TableCell>
                  )}
                  {visibleCols.volume && <TableCell>{fmtNum(r.volume)}</TableCell>}

                  {visibleCols.cpc && <TableCell>{r.cpc == null ? '–' : `$${r.cpc.toFixed(2)}`}</TableCell>}
                  {visibleCols.comp && <TableCell>{r.comp == null ? '–' : r.comp.toFixed(2)}</TableCell>}
                  {visibleCols.type && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.type.map((t) => (
                          <span key={t} className="text-[11px] px-1.5 py-0.5 rounded border" style={{ borderColor: TK.borderLight }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  )}
                  {visibleCols.updated && <TableCell>{new Date(r.updatedAt).toLocaleDateString()}</TableCell>}


                  <TableCell className='flex items-center gap-2'>
                                            <Button className="h-8 px-3 cursor-pointer bg-transparent border border-brand-blue1 hover:text-white text-brand-blue1"  onClick={() => sendToAnalyze([r])}>
                          <IconListChecks className="h-4 w-4 mr-1" /> Add to Analyze
                        </Button>
                    <AddToListDropdown keywords={[r]} size="sm" variant="outline" align="end" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-end border-t px-3 py-2" style={{ borderColor: TK.borderLight }}>
        <Pagination
          size="small"
          current={page}
          pageSize={PAGE_SIZE}
          total={sorted.length}
          showSizeChanger={false}
          showLessItems
          hideOnSinglePage
          onChange={(next) => setPage(next)}
        />
      </div>

      {/* Footer actions (kept) */}
      <div className="flex items-center justify-between border-t p-3" style={{ borderColor: TK.borderLight }}>
        <div className="text-sm text-muted-foreground">Select rows to perform bulk actions.</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 px-3 cursor-pointer"
            onClick={() => {
              const csv = [
                ['keyword', 'intent', 'kd', 'volume', 'cpc', 'comp', 'results', 'types', 'updatedAt', 'flags'].join(','),
                ...sorted.map((r) =>
                  [JSON.stringify(r.keyword), r.intent, r.kd, r.volume ?? '', r.cpc ?? '', r.comp ?? '', r.results ?? '', r.type.join('|'), r.updatedAt, r.flags.join('|')].join(','),
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'discover-aggregate.csv';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>

          <Button className="h-8 px-3 cursor-pointer" style={{ background: TK.brand, color: '#fff' }} onClick={handleAddSelected} disabled={!selectedRows.length}>
            <IconListChecks className="h-4 w-4 mr-1" /> Add to Analyze
          </Button>
        </div>
      </div>
    </div>
  );
});
AggregateTable.displayName = 'AggregateTable';

/* ───────────────────────── Mock suggestion generator ───────────────────────── */
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const trend12 = () => {
  const base = rand(10, 80);
  return Array.from({ length: 12 }, (_, i) => Math.max(0, Math.min(100, base + Math.round(Math.sin((i / 12) * Math.PI * 2) * 20 + rand(-6, 6)))));
};
const suggestionsFor = (source: SourceType, seed: string, comps: string[] = [], count = 18): SuggestionRow[] => {
  const groups: GroupType[] = ['question', 'comparison', 'longtail', 'exact', 'localized', 'commercial'];
  return Array.from({ length: count }).map((_, i) => {
    const kw =
      source === 'autosuggest'
        ? `${seed} ${['tool', 'guide', 'tips', 'best', 'checklist', '2025'][i % 6]}`
        : source === 'competitor'
          ? `${['compare', 'alternative', 'review', 'pricing', 'vs'][i % 5]} ${seed}`
          : `${seed} ${['how to', 'what is', 'near me', 'vs', 'price', 'best'][i % 6]}`.replace(' ', ' ');
    const metaDomain = source === 'competitor' && comps.length ? comps[i % comps.length] : undefined;
    return {
      keyword: `${kw} ${i + 1}`,
      type: source,
      group: groups[i % groups.length],
      volume: Math.random() > 0.4 ? rand(90, 24000) : undefined,
      tm: Math.random() > 0.5 ? (Math.random() > 0.5 ? +1 : -1) * Math.round(Math.random() * 2) : undefined,
      trend: Math.random() > 0.5 ? trend12() : undefined,
      flags: {},
      sourceMeta: metaDomain ? { domain: metaDomain } : undefined,
    };
  });
};

/* ───────────────────────── MERGED SECTION: Query Bar + Discover Cards + Aggregate ───────────────────────── */
export default function KeywordDiscoverySection({
  mode = 'no-domain',
  projectConnected = false,
}: {
  mode?: KrMode;
  projectConnected?: boolean;
}) {
  /* seeds & query state (lifted from QueryBar) */
  const queryStateRef = React.useRef<QueryState | null>(null);

  /* Cards data */
  const [cards, setCards] = React.useState<Record<SourceType, SuggestionRow[]>>({
    autosuggest: [],
    paa: [],
    related: [],
    competitor: [],
    trends: [],
    gkp: [],
    gsc: [],
  });

  /* Aggregate table rows */
  const [aggRows, setAggRows] = React.useState<AggRow[]>([]);
  const [, setVisibleBySource] = React.useState<Record<SourceType, SuggestionRow[]>>({
    autosuggest: [],
    paa: [],
    related: [],
    competitor: [],
    trends: [],
    gkp: [],
    gsc: [],
  });
  const [showAgg, setShowAgg] = React.useState<Record<SourceType, boolean>>({
    autosuggest: false,
    paa: false,
    related: false,
    competitor: false,
    trends: false,
    gkp: false,
    gsc: false,
  });

  /* Column visibility (new) */
  const [visibleCols, setVisibleCols] = React.useState<VisibleCols>({
    keyword: true,
    intent: true,
    kd: true,
    volume: true,
    trend: true,
    cpc: true,
    comp: true,
    results: true,
    type: true,
    updated: true,
    flags: true,
  });
  const [isDiscoverLoading, setDiscoverLoading] = React.useState(false);
  const [rowsForAnalyze, setRowsForAnalyze] = React.useState<AggRow[]>([]);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = React.useState(false);
  const [selectedAnalyzeProjectId, setSelectedAnalyzeProjectId] = React.useState<string | undefined>(undefined);
  const [analyzeSubmitting, setAnalyzeSubmitting] = React.useState(false);
  const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
  const [lastLocale, setLastLocale] = React.useState(DEFAULT_ANALYZE_LOCALE);

  const {
    projects = [],
    sharedProjects = [],
    selectedProject,
    loading: projectsLoading,
  } = useProjectManager();
  const projectOptions = React.useMemo<{ label: string; value: string }[]>(() => {
    const allProjects = [...projects, ...sharedProjects];
    return allProjects
      .map((project) => {
        const idValue =
          project?.id != null
            ? String(project.id)
            : project?.project_id != null
              ? String(project.project_id)
              : '';
        if (!idValue) return null;
        return { label: projectDisplayName(project), value: idValue };
      })
      .filter((opt): opt is { label: string; value: string } => Boolean(opt));
  }, [projects, sharedProjects]);
  const handleAddToAnalyzeRequest = React.useCallback((selectedRows: AggRow[]) => {
    if (!selectedRows.length) {
      message.warning('Select at least one keyword first');
      return;
    }
    setRowsForAnalyze(selectedRows);
    setSelectedAnalyzeProjectId(selectedProject ? String(selectedProject.id) : undefined);
    setAnalyzeError(null);
    setIsAnalyzeModalOpen(true);
  }, [selectedProject]);

  const closeAnalyzeModal = React.useCallback(() => {
    setIsAnalyzeModalOpen(false);
    setRowsForAnalyze([]);
    setAnalyzeError(null);
  }, []);

  const token = Cookies.get("login_access_token_wrank")

  const handleAnalyzeSubmit = React.useCallback(async () => {
    if (!rowsForAnalyze.length) {
      message.warning('Select at least one keyword first');
      return;
    }
    setAnalyzeSubmitting(true);
    setAnalyzeError(null);
    try {
      const entries = rowsForAnalyze.map((row) => ({
        keyword: row.keyword,
        locale: lastLocale || DEFAULT_ANALYZE_LOCALE,
        volume: row.volume ?? 0,
        wkd_score: row.kd ?? 0,
        intent: [INTENT_MAP[row.intent]?.label ?? row.intent],
      }));
      const payload: Record<string, any> = { entries };
      if (selectedAnalyzeProjectId) {
        const numericId = Number(selectedAnalyzeProjectId);
        if (!Number.isNaN(numericId)) payload.project_id = numericId;
      }
      await axios.post(BASE_ANALYZE_API, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      message.success('Keywords sent to Analyze');
      const selectedIds = new Set(rowsForAnalyze.map((row) => row.id));
      setAggRows((prev) => prev.map((row) => (selectedIds.has(row.id) ? { ...row, selected: false } : row)));
      setRowsForAnalyze([]);
      setIsAnalyzeModalOpen(false);
    } catch (err) {
      console.error('Failed to send keywords to Analyze', err);
      setAnalyzeError('Unable to add keywords right now. Please try again.');
      message.error('Failed to add keywords to Analyze');
    } finally {
      setAnalyzeSubmitting(false);
    }
  }, [rowsForAnalyze, selectedAnalyzeProjectId, lastLocale, setAggRows]);

  /* Discover runner (called from QueryBar) */
  const runDiscover = React.useCallback(async (payload: QueryState) => {
    queryStateRef.current = payload;

    // Build Month range → "Month YYYY"
    const monthFmt = (d: Date) => d.toLocaleString('en-GB', { month: 'long', year: 'numeric' }); // "November 2025"
    const now = new Date();
    const monthsBack = payload.dateRange === '12m' ? 11 : payload.dateRange === '90d' ? 3 : 1;
    const startDate = monthFmt(now);
    const endDate = monthFmt(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1));

    // Locations & Language from QueryBar
    const selectedCountries: LocationItem[] = (payload as any).__selectedCountries ?? [];
    const selectedLanguage: LanguageItem | null = (payload as any).__selectedLanguage ?? null;
    const localeString = buildLocaleFromSelection(selectedLanguage, selectedCountries) || DEFAULT_ANALYZE_LOCALE;
    setLastLocale(localeString);

    // Build request body
    const body = {
      url: payload.domain ?? "",
      search_by: "keyword",
      countries: selectedCountries.map(c => ({
        id: c.id,
        name: c.name,
        country_code: c.country_code,
        location_code: c.location_code,
        target_type: c.target_type,
      })),
      paid_user: true,
      all_locations: false,
      by_url: false,
      language: selectedLanguage?.id ?? 1, // fallback English
      start_date: startDate,
      end_date: endDate,
      seed_keywords: payload.seeds.length ? payload.seeds : ["keyword research"],
    };

    try {
      setDiscoverLoading(true);
      // Clear previous cards & table before fetch
      setCards({ autosuggest: [], paa: [], related: [], competitor: [], trends: [], gkp: [], gsc: [] });
      setAggRows([]);

      const res = await axios.post(BASE_KEYWORD_API, body);
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];

      // Map API → AggRow[]
      const mapped: AggRow[] = rows.map((it: any, idx: number): AggRow => {
        // intent mapping
        const intents: string[] = Array.isArray(it.keyword_intent) ? it.keyword_intent.map((s: string) => s.toLowerCase()) : [];
        const asIntent: IntentFull =
          intents.includes("commercial") ? "commercial" :
            intents.includes("transactional") ? "transactional" :
              intents.includes("navigational") ? "navigational" :
                "informational";

        // trend from monthly keys (e.g. "Searches: Aug 2025")
        const monthKeys = Object.keys(it).filter(k => k.startsWith("Searches: "));
        const trend = monthKeys
          .sort((a, b) => new Date(a.replace("Searches: ", "")).getTime() - new Date(b.replace("Searches: ", "")).getTime())
          .map(k => Number(it[k] ?? 0))
          .filter(n => Number.isFinite(n));

        const flags: string[] = [];
        if (it.is_requested_keyword) flags.push("requested");
        if (intents.some(x => x.includes("local"))) flags.push("local");
        if ((it.competition_enum || "").toLowerCase() === "low") flags.push("low_comp");
        if ((it.difficulty_band || "").toLowerCase() === "easy") flags.push("easy");

        return {
          id: `kw_api_${idx}_${it.keyword}`,
          keyword: it.keyword,
          group: "longtail",
          type: ["gkp"], // API says type: "GKP"
          intent: asIntent,
          kd: Number(it.wkd_score ?? 0),
          volume: Number(it.avg_monthly_searches ?? 0),
          trend: trend.length ? trend : undefined,
          cpc: Number(it.average_cpc ?? 0) || undefined,
          comp: typeof it.competition_density === "number" ? it.competition_density : undefined,
          results: undefined,
          updatedAt: it.last_seen || new Date().toISOString(),
          flags,
          selected: false,
          contrib: { autosuggest: false, paa: false, related: false, competitor: false, trends: false, gkp: true, gsc: false },
        };
      });

      setAggRows(mapped);
      // Optionally pin “Volume/CPC/Comp” columns visible if someone hid them
      setVisibleCols((s) => ({ ...s, volume: true, cpc: true, comp: true, trend: true }));

    } catch (err: any) {
      console.error("Keyword research failed", err);
      toast.error(err?.response?.data?.error)
    } finally {
      setDiscoverLoading(false);
    }
  }, []);


  /* Merge helpers for aggregate */
  function toAggRow(r: SuggestionRow, origin: SourceType): AggRow {
    const id = idFor(r.keyword);
    const now = new Date().toISOString();
    const kd = rand(10, 85);
    const intent: IntentFull = (['informational', 'commercial', 'navigational', 'transactional'][rand(0, 3)] as IntentFull);
    return {
      id,
      keyword: r.keyword,
      group: r.group,
      type: [origin],
      intent,
      kd,
      volume: r.volume,
      trend: r.trend,
      cpc: Math.random() > 0.65 ? Number((Math.random() * 7 + 0.2).toFixed(2)) : undefined,
      comp: Math.random() > 0.6 ? Number(Math.random().toFixed(2)) : undefined,
      results: Math.random() > 0.45 ? rand(10_000, 90_000_000) : undefined,
      updatedAt: now,
      flags: Object.entries(r.flags)
        .filter(([, v]) => v)
        .map(([k]) => k),
      selected: false,
      contrib: {
        autosuggest: origin === 'autosuggest',
        paa: origin === 'paa',
        related: origin === 'related',
        competitor: origin === 'competitor',
        trends: origin === 'trends',
        gkp: origin === 'gkp',
        gsc: origin === 'gsc'
      },

    };
  }

  function mergeToAggregate(rows: SuggestionRow[], preselect: boolean, origin: SourceType) {
    setAggRows((prev) => {
      const map = new Map<string, AggRow>(prev.map((r) => [normKey(r.keyword), r]));
      for (const s of rows) {
        const key = normKey(s.keyword);
        const existing = map.get(key);
        if (existing) {
          if (!existing.type.includes(origin)) existing.type = [...existing.type, origin];
          existing.contrib[origin] = true;
          if (s.volume != null && existing.volume == null) existing.volume = s.volume;
          if (!existing.trend && s.trend) existing.trend = s.trend;
          if (preselect) existing.selected = true;
          map.set(key, { ...existing });
        } else {
          const row = toAggRow(s, origin);
          row.selected = preselect;
          map.set(key, row);
        }
      }
      return Array.from(map.values());
    });
  }

  function removeBySource(origin: SourceType) {
    setAggRows((prev) => {
      const next: AggRow[] = [];
      for (const r of prev) {
        if (r.contrib && r.contrib[origin]) {
          const still = Object.keys(r.contrib).filter((k) => k !== origin);
          if (still.length === 0) continue; // drop row
          const t = r.type.filter((x) => x !== origin);
          const c = { ...r.contrib };
          delete c[origin];
          next.push({ ...r, type: t, contrib: c });
        } else next.push(r);
      }
      return next;
    });
  }

  function handleToggleShow(source: SourceType, next: boolean, allRows: SuggestionRow[]) {
    setShowAgg((s) => ({ ...s, [source]: next }));
    if (next) mergeToAggregate(allRows, false, source);
    else removeBySource(source);
  }
  

  /* Cards carousel scroll */
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollBy = (dx: number) => scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  // Table ref to trigger header Export
  const tableRef = React.useRef<AggregateTableHandle | null>(null);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4" style={{ fontFamily: fontStack }}>
        {/* Section 1: Query Bar (inside Discover tab) */}
        <QueryBar
          mode={mode}
          projectConnected={projectConnected}
          onDiscover={runDiscover}
          onStateChange={(s) => {
            queryStateRef.current = s;
          }}
        />

        {/* Section 3: Aggregate Table */}
        <div className="px-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconTable size={18} color={TK.brand} />
              <h2 className="text-[15px] font-semibold" style={{ color: TK.text }}>
                Aggregated Keywords
              </h2>
            </div>
            {/* Column control + Export */}
            <div className="flex items-center gap-2">


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 cursor-pointer">Columns</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px] z-[300]">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(
                    [
                      ['keyword', 'Keyword'],
                      ['intent', 'Intent'],
                      ['kd', 'KD'],
                      ['volume', 'Volume'],
                      ['trend', 'Trend'],
                      ['cpc', 'CPC'],
                      ['comp', 'Competitive density'],
                      ['results', 'Results'],
                      ['type', 'Type'],
                      ['updated', 'Updated'],
                      ['flags', 'Flags'],
                    ] as Array<[keyof VisibleCols, string]>
                  ).map(([k, label]) => (
                    <DropdownMenuCheckboxItem
                      key={k}
                      checked={visibleCols[k]}
                      onCheckedChange={(v) => setVisibleCols((s) => ({ ...s, [k]: Boolean(v) }))}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                onClick={() => tableRef.current?.exportCsv('filtered')}
              >
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>

          <AggregateTable
            ref={tableRef}
            rows={aggRows}
            setRows={setAggRows}
            visibleCols={visibleCols}
            onAddToAnalyze={handleAddToAnalyzeRequest}
            isLoading={isDiscoverLoading}
          />
        </div>
      </div>
      <Modal
        title="Add keywords to Analyze"
        centered
        open={isAnalyzeModalOpen}
        onCancel={closeAnalyzeModal}
        onOk={handleAnalyzeSubmit}
        okText={selectedAnalyzeProjectId ? 'Associate & Analyze' : 'Analyze without project'}
        confirmLoading={analyzeSubmitting}
        okButtonProps={{ disabled: !rowsForAnalyze.length }}
      >
        <p className="text-sm text-muted-foreground">
          We'll send {rowsForAnalyze.length} keyword{rowsForAnalyze.length === 1 ? '' : 's'} to Analyze. You can <span className='font-medium text-gray-700'>optionally</span> link them to a project.
        </p>
        <div className="mt-4 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Associate with project</label>
          <AntSelect<string>
            showSearch
            allowClear
            className="w-full"
            placeholder="Choose a project (optional)"
            loading={projectsLoading}
            options={projectOptions}
            optionFilterProp="label"
            value={selectedAnalyzeProjectId}
            onChange={(value) => setSelectedAnalyzeProjectId(value || undefined)}
          />
          {projectOptions.length === 0 && !projectsLoading && (
            <div className="text-xs text-muted-foreground">No projects available. Keywords will stay unassigned.</div>
          )}
        </div>
        {analyzeError && (
          <div className="mt-2 text-xs text-red-500">
            {analyzeError}
          </div>
        )}
      </Modal>
    </TooltipProvider>
  );
}
