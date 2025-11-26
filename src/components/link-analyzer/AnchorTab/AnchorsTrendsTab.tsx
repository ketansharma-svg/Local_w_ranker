import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Info,
  Download,
  ChevronDown,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Percent,
  X as Close,
  ExternalLink,
  Anchor as AnchorIcon,
  Target,
  Quote,
  Puzzle,
  Tag,
  Shapes,
  ImageOff,
  GitCompare,
  MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";

/**
 * Wranker – Anchors (Tab 3)
 * Section: Anchor Trends (drop‑in, React + Tailwind)
 * Refinements applied:
 *  - Inter / Inter Fallback font stack
 *  - Removed emojis; replaced with branded icons (lucide) for section title & anchor types
 *  - Smart popover = white card (matches global tooltip style)
 *  - Toggle switches keep design; now include branded icons where helpful
 *  - Charts: no changes
 */

/** ---------------- Visual Tokens (global + anchors) ---------------- */
const TOKENS = {
  brand: "#008CCD",
  actionBlue: "#0077FF",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  cardBg: "#FFFFFF",
  // Anchors color map (spec)
  deepBlue: "#0B63D6", // Exact
  skyBlue: "#4AA3FF", // Phrase
  teal: "#0EA5A6", // Partial
  indigo: "#6366F1", // Branded
  mutedGray: "#9CA3AF", // Generic
  lightRed: "#FCA5A5", // Empty/Image
  success: "#34A853",
  warning: "#F9BB04",
  critical: "#E94134",
};
const RADIUS = "rounded-[6px]";
const SHADOW_SM = "shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
const SHADOW_MD = "shadow-[0_8px_24px_rgba(17,24,39,0.08)]";

/** ---------------- Anchor Types ---------------- */
type AnchorTypeSpec = {
  key: "exact" | "phrase" | "partial" | "branded" | "generic" | "empty";
  label: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ANCHOR_TYPES: AnchorTypeSpec[] = [
  { key: "exact", label: "Exact Match", color: TOKENS.deepBlue, Icon: Target },
  { key: "phrase", label: "Phrase Match", color: TOKENS.skyBlue, Icon: Quote },
  { key: "partial", label: "Partial Match", color: TOKENS.teal, Icon: Puzzle },
  { key: "branded", label: "Branded", color: TOKENS.indigo, Icon: Tag },
  { key: "generic", label: "Generic", color: TOKENS.mutedGray, Icon: Shapes },
  { key: "empty", label: "Empty / Image", color: TOKENS.lightRed, Icon: ImageOff },
];

/** ---------------- Utilities ---------------- */
function daysAgo(num: number) {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return d;
}
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function logEvent(name: string, payload: unknown) {
  try {
    console.log(`[telemetry] ${name}`, payload);
  } catch {}
}

/** ---------------- Mock API ---------------- */
type TrendRow = {
  date: string;
  exact: number;
  phrase: number;
  partial: number;
  branded: number;
  generic: number;
  empty: number;
  total: number;
};

// ---- 2️⃣ genSeries function ----
function genSeries(startDays: number, lenDays: number, seedBase = 1): TrendRow[] {
  const rnd = (n: number) => {
    const x = Math.sin(n * 9301 + seedBase * 49297) * 233280;
    return x - Math.floor(x);
  };

  const rows: TrendRow[] = [];

  for (let i = 0; i < lenDays; i++) {
    const date = fmtDate(daysAgo(startDays - i));
    const exact = Math.floor(60 + rnd(i + 11) * 50);
    const phrase = Math.floor(90 + rnd(i + 22) * 80);
    const partial = Math.floor(70 + rnd(i + 33) * 60);
    const branded = Math.floor(40 + rnd(i + 44) * 35);
    const generic = Math.floor(30 + rnd(i + 55) * 25);
    const empty = Math.floor(10 + rnd(i + 66) * 15);
    const total = exact + phrase + partial + branded + generic + empty;

    rows.push({ date, exact, phrase, partial, branded, generic, empty, total });
  }

  return rows;
}

// ---- 3️⃣ mockFetchTrends function ----
async function mockFetchTrends({
  rangeDays = 30,
  compare = false,
}: {
  rangeDays?: number;
  compare?: boolean;
}) {
  const data: TrendRow[] = genSeries(rangeDays, rangeDays);

  let competitor: TrendRow[] | null = null;

  if (compare) {
    competitor = genSeries(rangeDays, rangeDays, 7).map((r, i) => ({
      date: r.date,
      exact: Math.max(0, Math.round(r.exact * 0.9 + (i % 7) - 2)),
      phrase: Math.max(0, Math.round(r.phrase * 1.05 - (i % 5))),
      partial: Math.max(0, Math.round(r.partial * 0.85 + (i % 3))),
      branded: Math.max(0, Math.round(r.branded * 1.15)),
      generic: Math.max(0, Math.round(r.generic * 1.1)),
      empty: Math.max(0, Math.round(r.empty * 0.8)),
      total: 0,
    }));

    competitor.forEach((r) => {
      r.total =
        r.exact + r.phrase + r.partial + r.branded + r.generic + r.empty;
    });
  }

  const annotations = [
    {
      id: "a1",
      date: data[Math.floor(rangeDays * 0.3)]?.date,
      type: "ai",
      text: "Spike in exact-match anchors detected",
      severity: "warning",
    },
    {
      id: "a2",
      date: data[Math.floor(rangeDays * 0.7)]?.date,
      type: "ai",
      text: "Brand anchor usage dipped after redesign",
      severity: "info",
    },
  ];

  return {
    series: data,
    competitor,
    annotations,
    totals: { totalAnchors: data.reduce((a, r) => a + r.total, 0) },
  };
}



/** ---------------- Small Controls ---------------- */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: AnchorTypeSpec[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (key: string) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onChange(next);
  };
  return (
    <div className="relative">
      <button
        className={`inline-flex items-center gap-2 px-3 py-2 border ${RADIUS} text-sm hover:bg-[#F5F7FA]`}
        style={{ borderColor: TOKENS.border }}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-medium">{label}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div
          role="listbox"
          className={`absolute z-10 mt-2 w-56 bg-white border ${RADIUS} p-2 ${SHADOW_MD}`}
          style={{ borderColor: TOKENS.border }}
        >
          {options.map((opt) => {
            const Ic = opt.Icon;
            return (
              <label key={opt.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F5F7FA] cursor-pointer">
                <input type="checkbox" className="accent-[#008CCD]" checked={selected.includes(opt.key)} onChange={() => toggle(opt.key)} />
                <span className="text-sm flex items-center gap-2" style={{ color: TOKENS.text }}>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px]" style={{ background: "#F8FAFC", border: `1px solid ${TOKENS.border}` }}>
                    <Ic size={14} className="text-[#6B7280]" />
                  </span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: opt.color }} />
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`inline-flex border ${RADIUS}`} style={{ borderColor: TOKENS.border }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-2 text-sm flex items-center gap-2 ${i === 0 ? "rounded-l-[6px]" : ""} ${i === options.length - 1 ? "rounded-r-[6px]" : ""} ${
            value === opt.value ? "bg-[#D9EEF8]" : "bg-white"
          }`}
          style={{ color: TOKENS.text }}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** ---------------- Export Modal ---------------- */
function ExportModal({ open, onClose, onExportCSV }: { open: boolean; onClose: () => void; onExportCSV: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`absolute right-1/2 translate-x-1/2 top-24 w-[520px] bg-white ${RADIUS} ${SHADOW_MD} border`} style={{ borderColor: TOKENS.border }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-2">
            <Download size={18} />
            <h3 className="text-base font-semibold" style={{ color: TOKENS.text }}>Export Trends</h3>
          </div>
          <button className="p-1 hover:bg-[#F5F7FA] rounded" onClick={onClose} aria-label="Close Export Modal">
            <Close size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm" style={{ color: TOKENS.text }}>
          <p className="text-[13px]" style={{ color: TOKENS.textMuted }}>
            Choose a format. Exports include projectId, filters, and timestamp.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button className={`border ${RADIUS} px-3 py-2 hover:bg-[#F5F7FA]`} onClick={onExportCSV} style={{ borderColor: TOKENS.border }}>
              CSV
            </button>
            <button className={`border ${RADIUS} px-3 py-2 opacity-60 cursor-not-allowed`} style={{ borderColor: TOKENS.border }}>
              PNG (soon)
            </button>
            <button className={`border ${RADIUS} px-3 py-2 opacity-60 cursor-not-allowed`} style={{ borderColor: TOKENS.border }}>
              PDF (soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------------- Tooltip (smart popover, white card) ---------------- */
function TrendsTooltip({
  active,
  payload,
  label,
  mode,
  typeMeta,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  mode: "count" | "pct";
  typeMeta: AnchorTypeSpec[];
}) {
  // ✅ Hooks always run
  const metaByLabel = useMemo(() => {
    const m = new Map<string, AnchorTypeSpec>();
    typeMeta.forEach((t) => m.set(t.label, t));
    return m;
  }, [typeMeta]);

  // Then handle early return
  if (!active || !payload || !payload.length) return null;



  return (
    <div
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
      role="tooltip"
    >
      <div className="text-[12px] font-medium mb-1" style={{ color: TOKENS.text }}>
        {new Date(label!).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </div>
      <div className="space-y-1">
        {payload
          .filter((p) => typeof p.value === "number")
          .map((p, idx) => {
            const meta = metaByLabel.get(p.name as string);
            const Ic = meta?.Icon;
            return (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Branded icon box + color swatch for consistency */}
                  <span className="inline-flex items-center justify-center w-4.5 h-4.5 rounded-[4px]" style={{ border: `1px solid ${TOKENS.border}` }}>
                    {Ic ? <Ic size={12} className="text-[#6B7280]" /> : null}
                  </span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="truncate text-[12px]" style={{ color: TOKENS.text }}>{p.name}</span>
                </div>
                <div className="text-[12px] font-semibold" style={{ color: TOKENS.text }}>
                  {mode === "pct" ? `${(p.value as number).toFixed(1)}%` : p.value}
                </div>
              </div>
            );
          })}
      </div>
      <div className="mt-2 text-[11px] text-[#0B63D6] inline-flex items-center gap-1">
        <ExternalLink size={12} /> View in table
      </div>
    </div>
  );
}
// --- Helpers: date utils in UTC (avoid TZ drift) ---
const toUTCDateKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
const utcFromYMD = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
};

// Build 1 row per day with zeros for missing days.
// `raw` is your mapped series from the API: [{ date: iso, exact, phrase, partial, branded, generic, empty, total }]
function normalizeDailySeries(raw: any[], days: number) {
  // 1) Group API rows by UTC date (YYYY-MM-DD)
  const byDay = new Map<string, { exact: number; phrase: number; partial: number; branded: number; generic: number; empty: number; total: number }>();
  for (const r of raw) {
    const key = toUTCDateKey(r.date);
    const acc = byDay.get(key) || { exact: 0, phrase: 0, partial: 0, branded: 0, generic: 0, empty: 0, total: 0 };
    acc.exact += Number(r.exact || 0);
    acc.phrase += Number(r.phrase || 0);
    acc.partial += Number(r.partial || 0);
    acc.branded += Number(r.branded || 0);
    acc.generic += Number(r.generic || 0);
    acc.empty += Number(r.empty || 0);
    acc.total += Number(r.total || (r.exact||0)+(r.phrase||0)+(r.partial||0)+(r.branded||0)+(r.generic||0)+(r.empty||0));
    byDay.set(key, acc);
  }

  // 2) Build continuous day range: last day = today (UTC) to keep UX stable
  const last = new Date(); // now (local), but we'll format UTC Y-M-D below
  const lastKey = toUTCDateKey(last.toISOString());
  const lastUTC = utcFromYMD(lastKey);
  const startUTC = lastUTC - (days - 1) * 24 * 60 * 60 * 1000;

  const series: any[] = [];
  const ticks: number[] = [];

  for (let i = 0; i < days; i++) {
    const tUTC = startUTC + i * 24 * 60 * 60 * 1000;
    const d = new Date(tUTC);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const v = byDay.get(key) || { exact: 0, phrase: 0, partial: 0, branded: 0, generic: 0, empty: 0, total: 0 };

    series.push({
      ts: tUTC,
       date: key,
      dateLabel: key,     // "YYYY-MM-DD" → use in tooltip if needed
      ...v,
    });
    ticks.push(tUTC);
  }

  return { series, ticks, domain: [startUTC, lastUTC] as [number, number] };
}


export default function AnchorsTrendsTab(props?: {
  trendsOverride?: { series: any[]; totals: { totalAnchors: number } };
    fetchTrends?: (days: number) => Promise<{ series: any[]; totals: { totalAnchors: number } }>;
}) {
  // Global sticky header chips
  const [chips, setChips] = useState<{ key: string; label: string; onRemove: () => void }[]>([]);

  // Trends controls
  const [range, setRange] = useState(7); // 7,14,30,90
  const [mode, setMode] = useState<"count" | "pct">("count");
  const [chartType, setChartType] = useState<"line" | "area">("line");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ANCHOR_TYPES.map((t) => t.key));
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [annotationsOn, setAnnotationsOn] = useState(true);
  const [scope, setScope] = useState<"internal" | "external" | "all">("all");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]); // primary
  const [comp, setComp] = useState<any[] | null>(null); // competitor
  const [ann, setAnn] = useState<any[]>([]);

  // Diagnostics state
  const [testResults, setTestResults] = useState<{ name: string; pass: boolean; detail?: string }[]>([]);
const [xTicks, setXTicks] = React.useState<number[]>([]);
const [xDomain, setXDomain] = React.useState<[number, number] | undefined>(undefined);

  // Fetch data
  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);

      // a) If parent supplied override data, just use it
      if (props?.trendsOverride) {
        if (!mounted) return;
        setData(props.trendsOverride.series);
        setComp(null);
        setAnn([]);
        setLoading(false);
        return;
      }

      // b) Use real API fetcher when provided
      if (props?.fetchTrends) {
        try {
          const res = await props.fetchTrends(range);
          if (!mounted) return;

        const norm = normalizeDailySeries(res.series, range);
        setData(norm.series);
        setXTicks(norm.ticks);
        setXDomain(norm.domain);

        setComp(null);
        setAnn([]);

        } catch (e) {
          console.error(e);
          if (mounted) {
          setData([]);
          setXTicks([]);
          setXDomain(undefined);
          setComp(null);
          setAnn([]);
          }
        } finally {
          if (mounted) setLoading(false);
        }
        return;
      }

      // c) Fallback to mock (dev)
      const res = await mockFetchTrends({ rangeDays: range, compare: compareEnabled });
      if (!mounted) return;
      setData(res.series);
      setComp(res.competitor);
      setAnn(res.annotations);
      setLoading(false);
    }

    run();
    return () => { mounted = false; };
  }, [range, compareEnabled, props?.trendsOverride, props?.fetchTrends]);

  // Compute chart rows with mode transform
  const chartRows = useMemo(() => {
    if (!data?.length) return [];
    return data.map((r, idx) => {
      const total = r.total || 1;
      const row: Record<string, any> = { date: r.date };
      ANCHOR_TYPES.forEach((t) => {
        const val = r[t.key] || 0;
        row[t.key] = mode === "pct" ? (val / total) * 100 : val;
      });
      if (comp && comp[idx]) {
        ANCHOR_TYPES.forEach((t) => {
          const val = (comp[idx] as any)[t.key] || 0;
          const tot = (comp[idx] as any).total || 1;
          row[`${t.key}_c`] = mode === "pct" ? (val / tot) * 100 : val;
        });
      }
      return row;
    });
  }, [data, comp, mode]);

  // SR summary
  const srSummary = useMemo(() => {
    const last = chartRows[chartRows.length - 1];
    if (!last) return "No data available.";
    const parts = ANCHOR_TYPES.filter((t) => selectedTypes.includes(t.key)).map((t) => {
      const v = last[t.key] || 0;
      return `${t.label} = ${mode === "pct" ? v.toFixed(1) + "%" : Math.round(v)}`;
    });
    return `Latest (${last.date}): ` + parts.join(", ");
  }, [chartRows, selectedTypes, mode]);

  // Filter chips content
  useEffect(() => {
    const c: { key: string; label: string; onRemove: () => void }[] = [];
    if (mode === "pct") c.push({ key: "mode", label: "% Share", onRemove: () => setMode("count") });
    if (scope !== "all") c.push({ key: "scope", label: `Scope: ${scope}`, onRemove: () => setScope("all") });
    if (ANCHOR_TYPES.length !== selectedTypes.length)
      c.push({ key: "types", label: `${selectedTypes.length} types`, onRemove: () => setSelectedTypes(ANCHOR_TYPES.map((t) => t.key)) });
    if (compareEnabled) c.push({ key: "cmp", label: "Comparing competitor", onRemove: () => setCompareEnabled(false) });
    setChips(c);
  }, [mode, scope, selectedTypes, compareEnabled]);

  // CSV export – schema: date, exact_match_count, phrase_match_count, ... , total_count
  function exportCSV() {
    const headers = [
      "date",
      "exact_match_count",
      "phrase_match_count",
      "partial_match_count",
      "branded_count",
      "generic_count",
      "empty_count",
      "total_count",
    ];
    const rows = data.map((r) => [r.date, r.exact, r.phrase, r.partial, r.branded, r.generic, r.empty, r.total].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anchors-trends-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent("anchor_trends_exported", { userId: "u-demo", projectId: "p-demo", filterSummary: { range, mode, selectedTypes, compareEnabled, scope }, timestamp: Date.now() });
  }

  const [exportOpen, setExportOpen] = useState(false);
  const visibleTypes = ANCHOR_TYPES.filter((t) => selectedTypes.includes(t.key));

  return (
    <div
      className="w-full"
      style={{
        color: TOKENS.text,
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
      }}
    >
      {/* ---- Global Sticky Summary Header ---- */}
      <div className={`sticky top-0 z-30 bg-white/95 backdrop-blur border-b`} style={{ borderColor: TOKENS.border }}>
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold">Anchors</h2>
          </div>
          {/* Export & Refresh here per spec */}
          <div className="flex items-center gap-2">
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 border ${RADIUS} text-sm hover:bg-[#F5F7FA]`}
              style={{ borderColor: TOKENS.border }}
              onClick={() => setExportOpen(true)}
              aria-label="Export"
            >
              <Download size={16} /> Export
            </button>
            <button
              className={`inline-flex items-center gap-2 px-3 py-2 border ${RADIUS} text-sm hover:bg-[#F5F7FA]`}
              style={{ borderColor: TOKENS.border }}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 500);
              }}
              aria-label="Refresh"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>
        {/* Filter chips row under sticky header */}
        <div className=" mx-auto px-4 pb-3 flex items-center flex-wrap gap-2">
          {chips.length === 0 ? (
            <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
              No filters applied
            </span>
          ) : (
            chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-2 px-2.5 py-2 bg-[#F5F7FA] text-[12px] border rounded-full h-[32px]"
                style={{ borderColor: TOKENS.border }}
              >
                {c.label}
                <button aria-label={`Remove ${c.label}`} onClick={c.onRemove} className="p-0.5">
                  <Close size={12} />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* ---- Body ---- */}
      <div className="w-full space-y-6">
        {/* SECTION 3 — Anchor Trends */}
        <section className={`bg-white border ${RADIUS} ${SHADOW_SM}`} style={{ borderColor: TOKENS.border }} aria-label="Anchor Trends">
          {/* Section header controls (filters only) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: TOKENS.border }}>
            <div className="flex items-center gap-2 text-[16px] font-semibold">
              <AnchorIcon size={18} /> Anchor Trends
              <span className="ml-1 text-[12px]" style={{ color: TOKENS.textMuted }}>
                (Counts over time · switch to % for share)
              </span>
              <Info
                size={14}
                className="ml-1"
                style={{ color: TOKENS.textMuted }}
                // title="Time series of anchor usage. Use controls to filter, compare and export."
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Date presets */}
              <Segmented
                value={String(range)}
                onChange={(v) => setRange(Number(v))}
                options={[
                  { value: "7", label: "7D" },
                  { value: "14", label: "14D" },
                  { value: "30", label: "30D" },
                  { value: "90", label: "90D" },
                ]}
              />
              {/* Types */}
              <MultiSelect label="Types" options={ANCHOR_TYPES} selected={selectedTypes} onChange={setSelectedTypes} />
              {/* Y axis */}
              <Segmented
                value={mode}
                onChange={(v) => setMode(v as "count" | "pct")}
                options={[
                  { value: "count", label: "Count", icon: <LineChartIcon size={14} /> },
                  { value: "pct", label: "% Share", icon: <Percent size={14} /> },
                ]}
              />
              {/* Graph */}
              <Segmented
                value={chartType}
                onChange={(v) => setChartType(v as "line" | "area")}
                options={[
                  { value: "line", label: "Line", icon: <LineChartIcon size={14} /> },
                  { value: "area", label: "Area", icon: <AreaChartIcon size={14} /> },
                ]}
              />
              {/* Scope */}
              <Segmented
                value={scope}
                onChange={(v) => setScope(v as "internal" | "external" | "all")}
                options={[
                  { value: "internal", label: "Internal" },
                  { value: "external", label: "External" },
                  { value: "all", label: "All" },
                ]}
              />
              {/* Toggles (same design, with branded icons) */}
              <label className="inline-flex items-center gap-2 text-sm px-3 py-2 border rounded h-[32px]" style={{ borderColor: TOKENS.border }}>
                <GitCompare size={14} className="text-[#6B7280]" />
                <input type="checkbox" className="accent-[#008CCD]" checked={compareEnabled} onChange={(e) => setCompareEnabled(e.target.checked)} />
                Compare competitor
              </label>
              <label className="inline-flex items-center gap-2 text-sm px-3 py-2 border rounded h-[32px]" style={{ borderColor: TOKENS.border }}>
                <MessageSquare size={14} className="text-[#6B7280]" />
                <input type="checkbox" className="accent-[#008CCD]" checked={annotationsOn} onChange={(e) => setAnnotationsOn(e.target.checked)} />
                Annotations
              </label>
            </div>
          </div>

          {/* Chart body */}
          <div className="p-4" role="region" aria-label="Trends chart region">
            {loading ? (
              <div className="h-[320px] grid place-items-center text-sm" style={{ color: TOKENS.textMuted }}>
                Loading…
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer>
                  {chartType === "line" ? (
                    <LineChart data={chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (mode === "pct" ? `${v}%` : v)} width={52} />
                      <Tooltip content={<TrendsTooltip mode={mode} typeMeta={ANCHOR_TYPES} />} cursor={{ stroke: "#C7E2F8", strokeWidth: 1 }} />
                      {visibleTypes.map((t) => (
                        <Line key={t.key} type="monotone" dataKey={t.key} name={t.label} stroke={t.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      ))}
                      {compareEnabled &&
                        visibleTypes.map((t) => (
                          <Line
                            key={`${t.key}_c`}
                            type="monotone"
                            dataKey={`${t.key}_c`}
                            name={`${t.label} (Competitor)`}
                            stroke={t.color}
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3 }}
                          />
                        ))}
                      {annotationsOn &&
                        ann.map((a) => (
                          <ReferenceDot key={a.id} x={a.date} y={(chartRows.find((r) => r.date === a.date) as any)?.exact || 0} r={4} fill={TOKENS.warning} stroke="none" />
                        ))}
                    </LineChart>
                  ) : (
                    <AreaChart data={chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => (mode === "pct" ? `${v}%` : v)} width={52} />
                      <Tooltip content={<TrendsTooltip mode={mode} typeMeta={ANCHOR_TYPES} />} cursor={{ stroke: "#C7E2F8", strokeWidth: 1 }} />
                      {visibleTypes.map((t) => (
                        <Area key={t.key} type="monotone" dataKey={t.key} name={t.label} stroke={t.color} fill={t.color} fillOpacity={0.15} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      ))}
                      {compareEnabled &&
                        visibleTypes.map((t) => (
                          <Line
                            key={`${t.key}_c`}
                            type="monotone"
                            dataKey={`${t.key}_c`}
                            name={`${t.label} (Competitor)`}
                            stroke={t.color}
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3 }}
                          />
                        ))}
                      {annotationsOn &&
                        ann.map((a) => (
                          <ReferenceDot key={a.id} x={a.date} y={(chartRows.find((r) => r.date === a.date) as any)?.exact || 0} r={4} fill={TOKENS.warning} stroke="none" />
                        ))}
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend-like toggles */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
              {ANCHOR_TYPES.map((t) => {
                const Ic = t.Icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSelectedTypes((prev) => (prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.preventDefault();
                        setSelectedTypes((prev) => (prev.includes(t.key) ? prev.filter((k) => k !== t.key) : [...prev, t.key]));
                      }
                    }}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 border ${RADIUS} ${
                      selectedTypes.includes(t.key) ? "bg-[#F5F7FA]" : "bg-white"
                    }`}
                    style={{ borderColor: TOKENS.border }}
                    role="button"
                    aria-label={`Toggle ${t.label}`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-[4px]" style={{ border: `1px solid ${TOKENS.border}` }}>
                      <Ic size={14} className="text-[#6B7280]" />
                    </span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    {t.label}
                  </button>
                );
              })}
              {compareEnabled && (
                <span className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                  Competitor shown as dashed
                </span>
              )}
            </div>
            <div className="sr-only" aria-live="polite">
              {srSummary}
            </div>
          </div>
        </section>

      </div>

      {/* Export modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExportCSV={() => {
          setExportOpen(false);
          exportCSV();
        }}
      />
    </div>
  );
}

