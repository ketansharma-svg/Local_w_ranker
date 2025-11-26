import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Search, Globe, UsersRound, Languages, Monitor, Smartphone, CalendarClock, BarChartBig,
    LayoutPanelLeft, TrendingUp, LineChart, ActivitySquare, Filter, Play, RotateCcw, X,
    Info, Lock, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
    border: "var(--wr-border, #E5E7EB)",
    borderLight: "var(--wr-borderLight, #EFF0F6)",
    text: "var(--wr-text-strong, #111827)",
    muted: "var(--wr-muted, #6B7280)",
    brand: "var(--wr-brand, #1090D0)",
    action: "var(--wr-action, #0077FF)",
    pastel: "var(--wr-bg-pastel, #D9EEF8)",
    ok: "var(--wr-ok, #10B981)",
    warn: "var(--wr-warn, #F59E0B)",
    critical: "var(--wr-critical, #EF4444)",
    radius: "var(--wr-radius, 6px)",
    shadowSm: "0 1px 2px rgba(16, 24, 40, 0.06)",
};

/* ───────────────────────── Types ───────────────────────── */
export type KrMode = "no-domain" | "domain";
type Device = "desktop" | "mobile";
type DateRange = "30d" | "90d" | "12m";
type Source = "gkp" | "serp" | "trends" | "gsc" | "ga4";
type QuickFilter = "excludeBrand" | "questions" | "comparisons" | "local" | "commercial";

export interface QueryState {
    mode: KrMode;
    seeds: string[];
    domain?: string;
    includeSubdomains: boolean;
    competitors: string[];
    locale: { country: string; language: string };
    device: Device;
    dateRange: DateRange;
    sources: Source[];            // at least one of gkp|serp|trends
    quickFilters: QuickFilter[];
}

export interface SourceStatus {
    gkp?: "idle" | "loading" | "ok" | "error";
    serp?: "idle" | "loading" | "ok" | "error";
    trends?: "idle" | "loading" | "ok" | "error";
    gsc?: "idle" | "loading" | "ok" | "error";
    ga4?: "idle" | "loading" | "ok" | "error";
}

export interface QueryBarProps {
    mode: KrMode;
    projectConnected?: boolean;                 // unlocks GSC/GA4 chips when true
    defaultLocale?: { country: string; language: string };
    defaultDevice?: Device;
    defaultDateRange?: DateRange;
    defaultSources?: Source[];                  // default ["gkp","serp","trends"]
    maxSeeds?: number;                          // default 500

    initial?: Partial<QueryState>;              // to hydrate from URL or saved prefs
    isAnalyzing?: boolean;                      // external loading override (optional)

    onAnalyze: (payload: QueryState) => void | Promise<void>;
    onReset?: () => void;                       // resets to user defaults
    onClear?: () => void;                       // clears inputs (seeds/domain/comps/filters/sources->min)
    onStateChange?: (state: QueryState) => void; // URL/prefs sync
    onLoadSample?: () => string[];              // optional: return sample seeds
    onHelp?: () => void;                        // optional: open help
    onSuggestCompetitors?: (domain: string) => Promise<string[]>; // optional
}

/* ───────────────────────── Telemetry stub ───────────────────────── */
function krTrack(event: string, props: Record<string, unknown> = {}) {
    const envelope = {
        event,
        ts: new Date().toISOString(),
        schemaVersion: "1.0.0",
        props,
    };
    window.dispatchEvent(new CustomEvent("kr-analytics", { detail: envelope }));
}

/* ───────────────────────── Utils ───────────────────────── */
const MAX_SEEDS_DEFAULT = 500;
const DOMAIN_RE = /^(?:https?:\/\/)?([a-z0-9-]+(\.[a-z0-9-]+)+)(?:\/.*)?$/i;

function normalizeDomain(input: string): string | null {
    const v = input.trim().toLowerCase();
    if (!v) return null;
    const m = v.match(DOMAIN_RE);
    if (!m) return null;
    return m[1].replace(/\/+$/, "");
}
function unique<T>(arr: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of arr) {
        const k = String(item).toLowerCase();
        if (!seen.has(k)) { seen.add(k); out.push(item); }
    }
    return out;
}
function splitSeeds(raw: string): string[] {
    return raw
        .split(/[\n,;]+/g)
        .map(s => s.trim())
        .filter(Boolean);
}

/* ───────────────────────── Small UI elements ───────────────────────── */
const Chip = React.forwardRef<HTMLSpanElement, {
    children: React.ReactNode;
    onRemove?: () => void;
    className?: string;
    title?: string;
}>(({ children, onRemove, className, title }, ref) => (
    <span
        ref={ref}
        className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px]", className)}
        style={{ borderColor: TK.borderLight, background: "#FFF" }}
        title={title}
    >
        {children}
        {onRemove && (
            <button aria-label="Remove" className="ml-1 rounded hover:bg-[#F2F4F7]" onClick={onRemove}>
                <X size={14} />
            </button>
        )}
    </span>
));
Chip.displayName = "Chip";

const ToggleChip: React.FC<{
    active: boolean;
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    title?: string;
    /** FIX: allow 6px radius & border override for “Include subdomains” without changing others */
    radius?: "full" | "6";
    borderColor?: string;
}> = ({ active, label, onClick, icon, disabled, title, radius = "full", borderColor }) => (
    <button
        type="button"
        className={cn(
            "h-8 px-3 border text-sm inline-flex items-center gap-1",
            radius === "full" ? "rounded-full" : "rounded-[6px]",
            disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-[#F7FAFC]"
        )}
        style={{
            borderColor: borderColor ?? TK.borderLight,
            background: active ? TK.pastel : "#FFF",
        }}
        onClick={disabled ? undefined : onClick}
        aria-pressed={active}
        title={title}
    >
        {icon}{label}
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
            aria-checked={value === "desktop"}
            className="px-3 h-8 text-[13px] font-semibold rounded-[6px]"
            style={value === "desktop" ? { background: TK.pastel, color: TK.text, border: `1px solid ${TK.border}` } : { background: "#FFF", color: TK.muted, border: `1px solid ${TK.border}` }}
            onClick={() => onChange("desktop")}
        >
            <span className="inline-flex items-center gap-1"><Monitor size={16} />Desktop</span>
        </button>
        <button
            role="radio"
            aria-checked={value === "mobile"}
            className="px-3 h-8 text-[13px] font-semibold rounded-[6px]"
            style={value === "mobile" ? { background: TK.pastel, color: TK.text, border: `1px solid ${TK.border}` } : { background: "#FFF", color: TK.muted, border: `1px solid ${TK.border}` }}
            onClick={() => onChange("mobile")}
        >
            <span className="inline-flex items-center gap-1"><Smartphone size={16} />Mobile</span>
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
    const [draft, setDraft] = React.useState("");
    const fileRef = React.useRef<HTMLInputElement | null>(null);
    const [pasteOpen, setPasteOpen] = React.useState(false);
    const remaining = `${seeds.length} / ${maxSeeds}`;

    function addSeeds(incoming: string[]) {
        const clean = incoming.map(s => s.trim()).filter(s => s.length >= 2);
        const deduped = unique([...seeds, ...clean]).slice(0, maxSeeds);
        setSeeds(deduped);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === "," || e.key === ";") {
            e.preventDefault();
            if (draft.trim()) { addSeeds(splitSeeds(draft)); setDraft(""); }
        } else if (e.key === "Backspace" && !draft && seeds.length > 0) {
            setSeeds(seeds.slice(0, -1));
        }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
        const text = e.clipboardData.getData("text");
        if (text && /[\n,;]/.test(text)) { e.preventDefault(); addSeeds(splitSeeds(text)); setDraft(""); }
    }

    function parseCsv(text: string): string[] {
        const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (rows.length === 0) return [];
        const header = rows[0].toLowerCase();
        const hasHeader = /(keyword|query|term)/.test(header);
        const data = hasHeader ? rows.slice(1) : rows;
        return data.flatMap(line => line.split(",").map(c => c.replace(/^"(.*)"$/, "$1").trim())).filter(Boolean);
    }

    async function handleFile(files: FileList | null) {
        const f = files?.[0]; if (!f) return;
        const text = await f.text();
        const rows = parseCsv(text);
        onImportCsv(rows);
    }

    return (
        <div className="w-full">
            <div className="rounded-md border p-2" style={{ borderColor: TK.border, background: "#FFF" }}>
                <div className="flex items-start gap-2">
                    <Search size={16} className="mt-1 text-[#9E9E9E]" aria-hidden="true" />
                    <div className="flex-1">
                        {/* Chip row */}
                        <div className="flex flex-wrap items-center gap-1">
                            {seeds.map((s, i) => (
                                <Chip key={`${s}-${i}`} onRemove={() => { const next = seeds.slice(); next.splice(i, 1); setSeeds(next); }}>{s}</Chip>
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
                        {/* Actions row */}
                        <div className="mt-2 flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
                                <Upload className="h-4 w-4 mr-1" /> Paste list
                            </Button>
                            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files)} />
                            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-1" /> Import .csv
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSeeds([])}>
                                <X className="h-4 w-4 mr-1" /> Clear
                            </Button>
                            <span className="ml-auto text-xs text-muted-foreground">{remaining}</span>
                        </div>
                    </div>
                </div>
            </div>
            {error && <div id="seeds-error" className="mt-1 text-sm" style={{ color: TK.critical }}>{error}</div>}

            {/* Paste list dialog */}
            <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader><DialogTitle>Paste your keyword list</DialogTitle></DialogHeader>
                    <Textarea rows={8} placeholder="Paste keywords here (comma or new line)…" id="paste-textarea" />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                const el = document.getElementById("paste-textarea") as HTMLTextAreaElement | null;
                                if (!el) return;
                                const list = splitSeeds(el.value);
                                const clean = unique(list).filter(Boolean);
                                if (clean.length) {
                                    const deduped = unique([...seeds, ...clean]).slice(0, MAX_SEEDS_DEFAULT);
                                    setSeeds(deduped);
                                }
                                setPasteOpen(false);
                            }}
                        >Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

/* ───────────────────────── Main Component ───────────────────────── */
export const QueryBar: React.FC<QueryBarProps> = ({
    mode,
    projectConnected = false,
    defaultLocale = { country: "US", language: "en" },
    defaultDevice = "desktop",
    defaultDateRange = "90d",
    defaultSources = ["gkp", "serp", "trends"],
    maxSeeds = MAX_SEEDS_DEFAULT,
    initial,
    isAnalyzing: analyzingExternal,
    onAnalyze,
    onReset,
    onClear,
    onStateChange,
    onLoadSample,
    onHelp,
    onSuggestCompetitors,
}) => {
    /* State */
    const [seeds, setSeeds] = React.useState<string[]>(initial?.seeds ?? []);
    const [domain, setDomain] = React.useState<string>(initial?.domain ?? "");
    const [includeSub, setIncludeSub] = React.useState<boolean>(initial?.includeSubdomains ?? true);
    const [competitors, setCompetitors] = React.useState<string[]>(initial?.competitors ?? []);
    const [country, setCountry] = React.useState<string>(initial?.locale?.country ?? defaultLocale.country);
    const [language, setLanguage] = React.useState<string>(initial?.locale?.language ?? defaultLocale.language);
    const [device, setDevice] = React.useState<Device>(initial?.device ?? defaultDevice);
    const [dateRange, setDateRange] = React.useState<DateRange>(initial?.dateRange ?? defaultDateRange);
    const [sources, setSources] = React.useState<Source[]>(initial?.sources ?? defaultSources);
    const [quickFilters, setQuickFilters] = React.useState<QuickFilter[]>(initial?.quickFilters ?? []);
    const [errors, setErrors] = React.useState<{ seeds?: string; domain?: string; competitor?: string }>({});
    const [analyzingInternal, setAnalyzingInternal] = React.useState(false);
    const analyzing = analyzingExternal ?? analyzingInternal;

    // sticky shadow
    const [stuck, setStuck] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);
    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const sentinel = document.createElement("div");
        sentinel.style.position = "absolute";
        sentinel.style.top = "-1px"; sentinel.style.height = "1px"; sentinel.style.width = "1px";
        el.prepend(sentinel);
        const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: [1] });
        io.observe(sentinel);
        return () => { io.disconnect(); sentinel.remove(); };
    }, []);

    // announce state up
    React.useEffect(() => {
        onStateChange?.({
            mode, seeds, domain: domain || undefined, includeSubdomains: includeSub,
            competitors, locale: { country, language }, device, dateRange, sources, quickFilters,
        });
    }, [mode, seeds, domain, includeSub, competitors, country, language, device, dateRange, sources, quickFilters]);

    // keyboard shortcut: Analyze
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey;
            if (meta && e.key.toLowerCase() === "enter") { e.preventDefault(); handleAnalyze(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    });

    /* Validation */
    function validate(): boolean {
        const next: typeof errors = {};
        if (seeds.length === 0) next.seeds = "Add at least one keyword.";
        if (seeds.length > maxSeeds) next.seeds = `Limit ${maxSeeds} keywords. Remove some to continue.`;
        if (mode === "domain") {
            const norm = normalizeDomain(domain || "");
            if (!norm) next.domain = "Enter a valid domain.";
        } else if (domain) {
            const norm = normalizeDomain(domain || "");
            if (!norm) next.domain = "Domain looks invalid. Try example.com.";
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    }

    function handleAnalyze() {
        if (!validate()) return;
        const payload: QueryState = {
            mode,
            seeds,
            domain: normalizeDomain(domain || "") || undefined,
            includeSubdomains: includeSub,
            competitors,
            locale: { country, language },
            device,
            dateRange,
            sources,
            quickFilters,
        };
        krTrack("kr.query.analyze_clicked", {
            mode, seeds_count: seeds.length, domain_set: Boolean(payload.domain),
            competitors_count: competitors.length, country, language, device, date_range: dateRange,
            sources, quick_filters: quickFilters,
        });
        const maybePromise = onAnalyze(payload);
        if (maybePromise && typeof (maybePromise as any).then === "function") {
            setAnalyzingInternal(true);
            (maybePromise as Promise<void>).finally(() => setAnalyzingInternal(false));
        } else {
            setAnalyzingInternal(true);
        }
    }

    function handleReset() {
        setSeeds(initial?.seeds ?? []);
        setDomain(initial?.domain ?? "");
        setIncludeSub(initial?.includeSubdomains ?? true);
        setCompetitors(initial?.competitors ?? []);
        setCountry(defaultLocale.country);
        setLanguage(defaultLocale.language);
        setDevice(defaultDevice);
        setDateRange(defaultDateRange);
        setSources(defaultSources);
        setQuickFilters([]);
        setErrors({});
        krTrack("kr.query.reset_clicked", { mode });
        onReset?.();
    }

    function handleClear() {
        setSeeds([]);
        setDomain("");
        setIncludeSub(true);
        setCompetitors([]);
        setSources(["gkp", "serp", "trends"]);
        setQuickFilters([]);
        setErrors({});
        krTrack("kr.query.clear_clicked", { mode });
        onClear?.();
    }

    /* Sources & filters toggles */
    const toggleSource = (s: Source) => {
        const on = sources.includes(s);
        if (on) {
            const next = sources.filter(x => x !== s);
            if (next.length === 0) return; // keep at least one
            setSources(next);
        } else {
            setSources([...sources, s]);
        }
        krTrack("kr.query.source_toggled", { source: s, on: !on });
    };

    const toggleFilter = (f: QuickFilter) => {
        const on = quickFilters.includes(f);
        setQuickFilters(on ? quickFilters.filter(x => x !== f) : [...quickFilters, f]);
        krTrack("kr.query.quick_filter_toggled", { filter: f, on: !on });
    };

    /* Domain helpers */
    const domainValid = !domain || Boolean(normalizeDomain(domain));
    const domainError = errors.domain;

    /* Competitors add/remove */
    function addCompetitor(raw: string) {
        const norm = normalizeDomain(raw ?? "");
        if (!norm) { setErrors(e => ({ ...e, competitor: "Invalid domain." })); return; }
        setErrors(e => ({ ...e, competitor: undefined }));
        if (competitors.map(c => c.toLowerCase()).includes(norm)) {
            krTrack("kr.query.competitor_duplicate", { domain: norm });
            return;
        }
        if (competitors.length >= 10) return;
        setCompetitors([...competitors, norm]);
    }
    function removeCompetitor(i: number) { const next = competitors.slice(); next.splice(i, 1); setCompetitors(next); }

    /* Suggest competitors (optional) */
    const [suggestions, setSuggestions] = React.useState<string[] | null>(null);
    const [suggestOpen, setSuggestOpen] = React.useState(false);
    async function openSuggestions() {
        if (!onSuggestCompetitors) return;
        const d = normalizeDomain(domain || ""); if (!d) return;
        setSuggestOpen(true);
        const list = await onSuggestCompetitors(d);
        setSuggestions(list?.filter(Boolean) ?? []);
    }

    /* Seeds CSV import */
    function importCsvRows(rows: string[]) {
        const clean = rows.map(r => r.trim()).filter(Boolean);
        if (clean.length) {
            const merged = unique([...seeds, ...clean]).slice(0, maxSeeds);
            setSeeds(merged);
            krTrack("kr.query.import_csv_used", { rows: clean.length });
        }
    }

    const analyzeEnabled = seeds.length >= 1 && (mode === "no-domain" || !!normalizeDomain(domain));

    /* UI */
    return (
        <TooltipProvider delayDuration={150}>
            <div
                ref={ref}
                className="w-full bg-white"
                style={{
                    position: "sticky",
                    top: "var(--wr-sticky-top-2, calc(var(--wr-sticky-top, 56px) + 56px))",
                    zIndex: 80,
                    borderBottom: `1px solid ${TK.borderLight}`,
                    boxShadow: stuck ? TK.shadowSm : "none",
                }}
            >
                <div className="p-3 px-4">
                    <div className="flex flex-wrap items-start gap-2">
                        {/* Seeds (grows first) */}
                        <div className="min-w-[560px] flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                                    Seeds
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button aria-label="Seeds help" className="text-[#9E9E9E]"><Info size={14} /></button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">Paste or type keywords. Use comma or new lines. Up to 500 terms.</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                            <SeedsInput seeds={seeds} setSeeds={setSeeds} maxSeeds={maxSeeds} error={errors.seeds} onImportCsv={importCsvRows} />
                        </div>

                        {/* Domain */}
                        <div className="min-w-[360px] max-w-[420px] flex-1">
                            <div className="text-[12px] text-muted-foreground mb-1 inline-flex items-center gap-1">
                                Domain
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button aria-label="Domain info" className="text-[#9E9E9E]"><Info size={14} /></button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                        {mode === "domain" ? "Required in Domain‑Aware." : "Optional in No‑Domain."}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Globe className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
                                    <Input
                                        className="pl-7"
                                        placeholder="example.com"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        aria-invalid={!domainValid}
                                        aria-describedby={domainError ? "domain-error" : undefined}
                                        disabled={analyzing}
                                    />
                                </div>
                                {/* FIX: Include subdomains with 6px radius + outlined border like other buttons */}
                                <ToggleChip
                                    active={includeSub}
                                    label="Include subdomains"
                                    onClick={() => setIncludeSub(v => !v)}
                                    radius="6"
                                    borderColor={TK.border}
                                />
                            </div>
                            {domainError && <div id="domain-error" className="mt-1 text-sm" style={{ color: TK.critical }}>{domainError}</div>}
                        </div>

                        {/* Competitors */}
                        <div className="min-w-[420px] max-w-[560px] flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                                    Competitors
                                    <UsersRound size={14} className="text-[#9E9E9E]" />
                                </div>
                                <div className="text-[12px] text-muted-foreground">Tip: add up to 10 competitor domains</div>
                            </div>
                            <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                                <div className="flex flex-wrap items-center gap-1">
                                    {competitors.map((c, i) => (<Chip key={`${c}-${i}`} onRemove={() => removeCompetitor(i)}>{c}</Chip>))}
                                    <input
                                        aria-label="Add competitor domain"
                                        className="min-w-[220px] flex-1 outline-none text-sm py-1"
                                        placeholder="competitor.com (Enter to add)"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                const v = (e.target as HTMLInputElement).value;
                                                if (v.trim()) addCompetitor(v);
                                                (e.target as HTMLInputElement).value = "";
                                            }
                                        }}
                                        disabled={analyzing || competitors.length >= 10}
                                    />
                                </div>
                                {errors.competitor && <div className="mt-1 text-sm" style={{ color: TK.critical }}>{errors.competitor}</div>}
                                <div className="mt-2 flex items-center gap-2">
                                    <Button variant="outline" size="sm" disabled={!normalizeDomain(domain || "") || !onSuggestCompetitors} onClick={openSuggestions}>
                                        Suggest competitors
                                    </Button>
                                    <Popover open={suggestOpen} onOpenChange={setSuggestOpen}>
                                        <PopoverTrigger asChild><span className="hidden" /></PopoverTrigger>
                                        <PopoverContent align="start" className="w[280px] z-[200]">
                                            <div className="text-sm font-medium mb-2">Suggestions</div>
                                            {(!suggestions || suggestions.length === 0) ? (
                                                <div className="text-sm text-muted-foreground">No suggestions.</div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {suggestions.map(s => (
                                                        <div key={s} className="flex items-center justify-between">
                                                            <span className="text-sm">{s}</span>
                                                            <Button size="sm" variant="outline" onClick={() => addCompetitor(s)}>Add</Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        {/* Locale & Device */}
                        <div className="flex items-end gap-2 flex-wrap">
                            {/* Country */}
                            <div className="min-w-[160px]">
                                <div className="text-[12px] text-muted-foreground mb-1 inline-flex items-center gap-1">
                                    Country <Globe size={14} className="text-[#9E9E9E]" />
                                </div>
                                <Select value={country} onValueChange={setCountry}>
                                    <SelectTrigger className="h-8 px-3"><SelectValue placeholder="Country" /></SelectTrigger>
                                    {/* FIX: popper + high z-index so it renders ABOVE Sources container */}
                                    <SelectContent position="popper" className="z-[200]">
                                        <SelectItem value="US">United States</SelectItem>
                                        <SelectItem value="GB">United Kingdom</SelectItem>
                                        <SelectItem value="CA">Canada</SelectItem>
                                        <SelectItem value="AU">Australia</SelectItem>
                                        <SelectItem value="IN">India</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Language */}
                            <div className="min-w=[160px]">
                                <div className="text-[12px] text-muted-foreground mb-1 inline-flex items-center gap-1">
                                    Language <Languages size={14} className="text-[#9E9E9E]" />
                                </div>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger className="h-8 px-3"><SelectValue placeholder="Language" /></SelectTrigger>
                                    {/* FIX: popper + z-index */}
                                    <SelectContent position="popper" className="z-[200]">
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                        <SelectItem value="fr">French</SelectItem>
                                        <SelectItem value="de">German</SelectItem>
                                        <SelectItem value="hi">Hindi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Device */}
                            <div className="min-w-[140px]">
                                <div className="text-[12px] text-muted-foreground mb-1 inline-flex items-center gap-1">Device</div>
                                <SegmentedDevice value={device} onChange={setDevice} />
                            </div>

                            {/* Date range */}
                            <div className="min-w-[160px]">
                                <div className="text-[12px] text-muted-foreground mb-1 inline-flex items-center gap-1">
                                    Date range <CalendarClock size={14} className="text-[#9E9E9E]" />
                                </div>
                                {/* FIX: Tooltip wraps only the trigger; menu uses popper + z-index */}
                                <Select value={dateRange} onValueChange={(v: DateRange) => setDateRange(v)}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <SelectTrigger className="h-8 px-3"><SelectValue /></SelectTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-xs">Used for trends/seasonality and source querying.</TooltipContent>
                                    </Tooltip>
                                    <SelectContent position="popper" className="z-[200]">
                                        <SelectItem value="30d">30 days</SelectItem>
                                        <SelectItem value="90d">90 days</SelectItem>
                                        <SelectItem value="12m">12 months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Sources */}
                        <div className="flex items-end gap-2 flex-wrap">
                            <div className="text-[12px] text-muted-foreground w-full">Sources</div>
                            <ToggleChip active={sources.includes("gkp")} label="GKP" onClick={() => toggleSource("gkp")} icon={<BarChartBig size={16} />} />
                            <ToggleChip active={sources.includes("serp")} label="SERP" onClick={() => toggleSource("serp")} icon={<LayoutPanelLeft size={16} />} />
                            <ToggleChip active={sources.includes("trends")} label="Trends" onClick={() => toggleSource("trends")} icon={<TrendingUp size={16} />} />
                            {/* Domain‑Aware extras */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <ToggleChip
                                            active={sources.includes("gsc")}
                                            label="GSC"
                                            onClick={() => projectConnected ? toggleSource("gsc") : undefined}
                                            icon={projectConnected ? <LineChart size={16} /> : <Lock size={16} />}
                                            disabled={!projectConnected}
                                            title={projectConnected ? undefined : "Connect a project to use Search Console data."}
                                        />
                                    </span>
                                </TooltipTrigger>
                                {!projectConnected && <TooltipContent className="text-xs">Connect a project to use Search Console data.</TooltipContent>}
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span>
                                        <ToggleChip
                                            active={sources.includes("ga4")}
                                            label="GA4"
                                            onClick={() => projectConnected ? toggleSource("ga4") : undefined}
                                            icon={projectConnected ? <ActivitySquare size={16} /> : <Lock size={16} />}
                                            disabled={!projectConnected}
                                            title={projectConnected ? undefined : "Connect a project to use GA4 conversions."}
                                        />
                                    </span>
                                </TooltipTrigger>
                                {!projectConnected && <TooltipContent className="text-xs">Connect a project to use GA4 conversions.</TooltipContent>}
                            </Tooltip>
                        </div>

                        {/* Quick Filters */}
                        <div className="flex items-end gap-2 flex-wrap flex-1">
                            <div className="text-[12px] text-muted-foreground w-full inline-flex items-center gap-1">
                                <Filter size={14} className="text-[#9E9E9E]" /> Quick filters
                            </div>
                            <ToggleChip active={quickFilters.includes("excludeBrand")} label="Exclude brand" onClick={() => toggleFilter("excludeBrand")} />
                            <ToggleChip active={quickFilters.includes("questions")} label="Questions" onClick={() => toggleFilter("questions")} />
                            <ToggleChip active={quickFilters.includes("comparisons")} label="Comparisons" onClick={() => toggleFilter("comparisons")} />
                            <ToggleChip active={quickFilters.includes("local")} label="Local" onClick={() => toggleFilter("local")} />
                            <ToggleChip active={quickFilters.includes("commercial")} label="Commercial" onClick={() => toggleFilter("commercial")} />
                        </div>

                        {/* CTA group */}
                        <div className="ml-auto flex items-end gap-2">
                            <Button className="h-10 px-4" style={{ background: "#008CCD", color: "#FFF" }} onClick={handleAnalyze} disabled={!analyzeEnabled || analyzing}>
                                <Play className="h-4 w-4 mr-2" />
                                {analyzing ? "Analyzing…" : "Analyze"}
                            </Button>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" className="h-10 px-4" onClick={handleReset} disabled={analyzing}>
                                        <RotateCcw className="h-4 w-4 mr-2" /> Reset
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Reset to your defaults</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" className="h-10 px-4" onClick={handleClear} disabled={analyzing}>
                                        <X className="h-4 w-4 mr-2" /> Clear
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">Clear all inputs</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Optional empty hint */}
                    {seeds.length === 0 && (!domain || !normalizeDomain(domain)) && (
                        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Info size={16} /> Start with a few keywords or add a domain. You can always switch modes.</span>
                            {onLoadSample && (
                                <Button variant="outline" size="sm" onClick={() => {
                                    const samples = onLoadSample?.() ?? [];
                                    if (samples.length) setSeeds(unique([...seeds, ...samples]).slice(0, maxSeeds));
                                }}>Load sample keywords</Button>
                            )}
                            {onHelp && <Button variant="ghost" size="sm" onClick={onHelp}>Learn how it works</Button>}
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
};

/* ───────────────────────── Demo Wrapper (optional) ───────────────────────── */
export default function DemoQueryBarCanvas() {
    const [lastPayload, setLastPayload] = React.useState<any>(null);
    const [mode, setMode] = React.useState<KrMode>("domain");
    return (
        <div className="space-y-4" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}>

            <QueryBar
                mode={mode}
                projectConnected={true}
                defaultLocale={{ country: 'US', language: 'en' }}
                defaultDevice="desktop"
                defaultDateRange="90d"
                onAnalyze={async (payload) => { setLastPayload(payload); await new Promise(r => setTimeout(r, 800)); }}
                onSuggestCompetitors={async (domain) => { await new Promise(r => setTimeout(r, 500)); return [`best-${domain}`, `top-${domain}`, `compare-${domain}`]; }}
                onLoadSample={() => ["seo audit", "keyword research tool", "backlink analysis"]}
                onHelp={() => alert('Open docs: How the Query Bar works')}
            />
        </div>
    );
}


