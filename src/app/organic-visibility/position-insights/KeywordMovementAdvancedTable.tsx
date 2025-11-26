"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  SlidersHorizontal,
  Download,
  Search,
  Eye,
  ClipboardList,
  Plus,
  Lock,
  ListFilter,
  CalendarClock,
  ExternalLink,
  BarChart2,
  HelpCircle,
  Star,
  Image as ImageIcon,
  Video,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

/* ───────────────────────── Tokens (design-system safe) ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // brand color used on icons
  valueBlue: "var(--wr-action, #008CCD)",
  pastelBlue: "var(--wr-pastelBrand, #D9EEF8)",
  ok: "var(--wr-good, #34A853)",
  warn: "var(--wr-warning, #F59E0B)",
  critical: "var(--wr-critical, #E94134)",
  cardBg: "var(--wr-bg-card, #FFFFFF)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 10px)",
};

/* ───────────────────────── Types ───────────────────────── */
type Intent = "informational" | "commercial" | "navigational" | "transactional";
type ChangeType = "new" | "lost" | "improved" | "declined" | "same";

type FeatureKey = "fs" | "paa" | "video" | "image" | "discussions";
type FeatureDelta = "+" | "-" | "=" | "x"; // x = no longer triggered

type Row = {
  id: string;
  keyword: string;
  intent: Intent;
  branded: boolean;

  prevPos: number | null;
  currPos: number | null;
  changeType: ChangeType;
  posDelta: number | null;

  trafficDeltaAbs: number;
  trafficDeltaPct: number;
  hasSF: boolean;

  sfDelta: Partial<Record<FeatureKey, FeatureDelta>>;

  volume: number;
  kd: number;
  cpc: number;
  targetUrl: string;
  lastUpdated: string;

  rankSeries: (number | null)[]; // last 30 points (1..100 or null)
};

/* ───────────────────────── Utilities ───────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const fmtMoney = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function deriveChangeType(
  prev: number | null,
  curr: number | null
): { change: ChangeType; delta: number | null } {
  if (prev == null && curr != null) return { change: "new", delta: null };
  if (prev != null && curr == null) return { change: "lost", delta: null };
  if (prev != null && curr != null) {
    const d = prev - curr; // positive = improved
    if (d > 0) return { change: "improved", delta: d };
    if (d < 0) return { change: "declined", delta: d };
    return { change: "same", delta: 0 };
  }
  return { change: "same", delta: null };
}

/* ───────────────────────── Mock Data Generator (demo-safe) ───────────────────────── */
function makeMockRows(n = 120): Row[] {
  const intents: Intent[] = [
    "informational",
    "commercial",
    "navigational",
    "transactional",
  ];
  const features: FeatureKey[] = ["fs", "paa", "video", "image", "discussions"];
  const today = new Date();

  const mkSeries = () => {
    const days = 30;
    return Array.from({ length: days }, (_, i) => {
      const r = Math.random();
      if (r > 0.86) return null; // sometimes not ranked
      return Math.max(
        1,
        Math.min(
          100,
          Math.round(8 + Math.random() * 40 + Math.sin(i / 3) * 6)
        )
      );
    });
  };

  return Array.from({ length: n }, (_, i) => {
    const series = mkSeries();
    const prev = series[series.length - 2] ?? null;
    const curr = series[series.length - 1] ?? null;
    const { change, delta } = deriveChangeType(prev, curr);

    const sfDelta: Partial<Record<FeatureKey, FeatureDelta>> = {};
    features.forEach((f) => {
      const r = Math.random();
      sfDelta[f] = r > 0.85 ? "+" : r > 0.7 ? "-" : r > 0.5 ? "=" : "x";
    });
    const hasSF = Object.values(sfDelta).some((v) => v && v !== "x");

    const trafficDeltaAbs = Math.round((Math.random() - 0.5) * 800);
    const trafficDeltaPct = Math.round((Math.random() - 0.5) * 60);
    const dt = new Date(
      today.getTime() - Math.floor(Math.random() * 72) * 3600 * 1000
    );

    return {
      id: `kw-${i + 1}`,
      keyword: `seo tool for saas ${i + 1}`,
      intent: intents[i % intents.length],
      branded: Math.random() > 0.85,

      prevPos: prev,
      currPos: curr,
      changeType: change,
      posDelta: delta,

      trafficDeltaAbs,
      trafficDeltaPct,
      hasSF,

      sfDelta,

      volume: 200 + Math.floor(Math.random() * 25000),
      kd: Math.floor(Math.random() * 100),
      cpc: +(0.2 + Math.random() * 8).toFixed(2),
      targetUrl: `/path/${i + 1}/target-page`,
      lastUpdated: toISO(dt),

      rankSeries: series,
    };
  });
}

/* ───────────────────────── Modular UI: Chips & Toggle Switch ───────────────────────── */
function Segmented<V extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: {
  value: V;
  items: { value: V; label: React.ReactNode }[];
  onChange: (v: V) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border p-0.5"
      style={{ borderColor: TK.border }}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={String(it.value)}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(it.value)}
            className={`h-8 rounded-full px-3 text-sm transition cursor-pointer ${
              active
                ? "bg-[#D9EEF8] font-medium text-[#0C69B2]"
                : "hover:bg-gray-100"
            }`}
            title={typeof it.label === "string" ? it.label : undefined}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TK.border, color: active ? TK.text : TK.muted }}
      title={title || label}
    >
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full border"
        style={{
          borderColor: active ? TK.brand : TK.border,
          background: active ? "rgba(0,140,205,0.15)" : TK.appBg,
        }}
        aria-hidden
      >
        <span
          className="absolute h-4 w-4 rounded-full transition-transform"
          style={{
            background: TK.brand,
            transform: active ? "translateX(20px)" : "translateX(2px)",
          }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>
        {label}
      </span>
    </button>
  );
}

/* ───────────────────────── Micro UI ───────────────────────── */
const IntentChip: React.FC<{ intent: Intent }> = ({ intent }) => {
  const label = intent.charAt(0).toUpperCase() + intent.slice(1);
  const color =
    intent === "commercial"
      ? TK.ok
      : intent === "transactional"
      ? TK.valueBlue
      : intent === "navigational"
      ? TK.warn
      : TK.muted;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block rounded-full"
        style={{ width: 8, height: 8, background: color }}
      />
      <span className="text-[13px] leading-none">{label}</span>
    </span>
  );
};

const ChangeBadge: React.FC<{ c: ChangeType; delta: number | null }> = ({
  c,
  delta,
}) => {
  const base =
    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium";
  if (c === "new")
    return (
      <span className={base} style={{ background: TK.pastelBlue, color: TK.valueBlue }}>
        NEW
      </span>
    );
  if (c === "lost")
    return (
      <span className={base} style={{ background: "#FDE2E0", color: TK.critical }}>
        LOST
      </span>
    );
  if (c === "improved")
    return (
      <span className={base} style={{ background: "#E6F6EC", color: TK.ok }}>
        <ChevronUp className="h-3.5 w-3.5" /> {delta}
      </span>
    );
  if (c === "declined")
    return (
      <span className={base} style={{ background: "#FDF4E6", color: TK.warn }}>
        <ChevronDown className="h-3.5 w-3.5" /> {Math.abs(delta || 0)}
      </span>
    );
  return (
    <span className={base} style={{ background: "#EEF2F7", color: TK.muted }}>
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
};

const TrafficDeltaPill: React.FC<{
  abs: number;
  pct: number;
  showPct?: boolean;
}> = ({ abs, pct, showPct }) => {
  const up = abs > 0 || (showPct && pct > 0);
  const down = abs < 0 || (showPct && pct < 0);
  const tone = up ? TK.ok : down ? TK.critical : TK.muted;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5"
      style={{
        color: tone,
        border: `1px solid ${TK.borderLight}`,
        background: "#fff",
      }}
    >
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" />
      ) : down ? (
        <ArrowDownRight className="h-3.5 w-3.5" />
      ) : (
        <Minus className="h-3.5 w-3.5" />
      )}
      {nf(Math.abs(abs))}
      {showPct && (
        <span className="opacity-80">
          ({pct > 0 ? "+" : ""}
          {pct}%)
        </span>
      )}
    </span>
  );
};

const SFIcon: React.FC<{ k: FeatureKey; d?: FeatureDelta }> = ({ k, d = "=" }) => {
  const map: Record<FeatureKey, React.ReactNode> = {
    fs: <Star className="h-4 w-4" />,
    paa: <HelpCircle className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    image: <ImageIcon className="h-4 w-4" />,
    discussions: <MessageSquare className="h-4 w-4" />,
  };
  const col = d === "+"
    ? TK.ok
    : d === "-"
    ? TK.critical
    : d === "x"
    ? TK.muted
    : TK.valueBlue;

  return (
    <span className="relative inline-flex items-center justify-center" title={k.toUpperCase()}>
      <span style={{ color: col }}>{map[k]}</span>
      {d !== "=" && d !== "x" && (
        <span className="absolute -top-1 -right-1 text-[11px] font-semibold" style={{ color: col }}>
          {d}
        </span>
      )}
      {d === "x" && (
        <span className="absolute -top-1 -right-1 text-[11px] font-semibold" style={{ color: TK.muted }}>
          ×
        </span>
      )}
    </span>
  );
};

/* ───────────────────────── Mini rank chart with smart popover ───────────────────────── */
const MiniRankChart: React.FC<{
  series: (number | null)[];
  lastUpdated?: string;
}> = ({ series, lastUpdated }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    idx: number;
  } | null>(null);

  const days = series.length || 30;
  const dates = useMemo(() => {
    const end = lastUpdated ? new Date(lastUpdated) : new Date();
    const arr: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      arr.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    }
    return arr;
  }, [days, lastUpdated]);

  const W = 460;
  const H = 120;
  const padL = 36;
  const padR = 8;
  const padT = 8;
  const padB = 28;

  const xFor = (i: number) =>
    padL + (i * (W - padL - padR)) / Math.max(1, days - 1);
  const yFor = (v: number) => {
    const clamped = Math.max(1, Math.min(100, v));
    const t = (clamped - 1) / 99; // 0..1
    return padT + t * (H - padT - padB);
  };

  const yTicks = [1, 10, 20, 50, 100];
  const xTicks = [0, Math.floor((days - 1) / 2), days - 1];

  const path = series
    .map((v, i) => (v == null ? null : `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`))
    .filter(Boolean)
    .join(" ");

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const clampedX = Math.max(padL, Math.min(W - padR, relX));
    const t = (clampedX - padL) / (W - padL - padR);
    const idx = Math.round(t * (days - 1));
    const v = series[idx] ?? 100;
    const x = xFor(idx);
    const y = yFor(v);
    setHover({ x, y, idx });
  };

  const onLeave = () => setHover(null);

  // Smart popover position (avoid overflow)
  const popStyle = (): React.CSSProperties | undefined => {
    if (!hover || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const width = 160;
    const height = 56;
    let left = hover.x - width / 2;
    if (left < padL) left = hover.x + 10;
    if (left + width > rect.width - padR) left = hover.x - width - 10;
    const top = Math.max(padT, hover.y - height - 10);
    return {
      position: "absolute",
      left,
      top,
      width,
      height,
      background: "#fff",
      border: `1px solid ${TK.border}`,
      borderRadius: 6,
      boxShadow: "0 4px 14px rgba(0,0,0,.06)",
      padding: "8px 10px",
      pointerEvents: "none",
      fontSize: 12,
      zIndex: 10,
    };
  };

  return (
    <div
      ref={ref}
      className="relative select-none"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ cursor: "crosshair" }}
    >
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Rank timeline (last 30 checks)"
      >
        {/* Axes */}
        <line
          x1={padL}
          x2={W - padR}
          y1={H - padB}
          y2={H - padB}
          stroke={TK.borderLight}
        />
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke={TK.borderLight} />

        {/* Y ticks */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL - 4}
              x2={padL}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={TK.borderLight}
            />
            <text
              x={padL - 8}
              y={yFor(t) + 3}
              textAnchor="end"
              fontSize="10"
              fill={TK.muted}
            >
              {t}
            </text>
            {/* grid */}
            <line
              x1={padL}
              x2={W - padR}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke={TK.borderLight}
              opacity={0.35}
              strokeDasharray="3 4"
            />
          </g>
        ))}

        {/* X ticks */}
        {xTicks.map((ix, i) => (
          <g key={i}>
            <line
              x1={xFor(ix)}
              x2={xFor(ix)}
              y1={H - padB}
              y2={H - padB + 4}
              stroke={TK.borderLight}
            />
            <text
              x={xFor(ix)}
              y={H - 8}
              fontSize="10"
              textAnchor="middle"
              fill={TK.muted}
            >
              {dates[ix]}
            </text>
          </g>
        ))}

        {/* Line */}
        {path && (
          <path d={path} stroke={TK.valueBlue} strokeWidth={2} fill="none" />
        )}

        {/* Hover vertical line + dot */}
        {hover && (
          <>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={padT}
              y2={H - padB}
              stroke={TK.brand}
              strokeDasharray="4 4"
              opacity={0.75}
            />
            {series[hover.idx] != null && (
              <circle
                cx={hover.x}
                cy={yFor(series[hover.idx] as number)}
                r={3.5}
                fill={TK.brand}
              />
            )}
          </>
        )}
      </svg>

      {/* Smart popover (value) */}
      {hover && (
        <div style={popStyle()}>
          <div
            style={{
              fontWeight: 600,
              color: TK.text,
              marginBottom: 2,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BarChart2 className="h-4 w-4" style={{ color: TK.brand }} />
            {dates[hover.idx]}
          </div>
          <div style={{ color: TK.muted }}>
            Rank:{" "}
            <span style={{ color: TK.text, fontWeight: 600 }}>
              {series[hover.idx] ?? "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Column Model ───────────────────────── */
type ColKey =
  | "select"
  | "expander"
  | "keyword"
  | "prev"
  | "curr"
  | "delta"
  | "traffic"
  | "sfdelta"
  | "volume"
  | "kd"
  | "cpc"
  | "target"
  | "updated"
  | "actions";

type ColDef = {
  key: ColKey;
  label: string;
  width?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sticky?: boolean;
};

const COLS: ColDef[] = [
  { key: "select", label: "", width: 40, align: "center", sticky: true },
  { key: "expander", label: "", width: 40, align: "center", sticky: true },
  { key: "keyword", label: "Keyword", width: 340, sortable: true, sticky: true },
  { key: "prev", label: "Prev Pos.", width: 110, sortable: true, align: "center" },
  { key: "curr", label: "Curr Pos.", width: 110, sortable: true, align: "center" },
  { key: "delta", label: "Position Δ", width: 130, sortable: true, align: "center" },
  { key: "traffic", label: "Traffic Δ", width: 160, sortable: true, align: "right" },
  { key: "sfdelta", label: "SERP Feature Δ", width: 170, align: "left" },
  { key: "volume", label: "Volume", width: 120, sortable: true, align: "right" },
  { key: "kd", label: "KD", width: 90, sortable: true, align: "right" },
  { key: "cpc", label: "CPC", width: 110, sortable: true, align: "right" },
  { key: "target", label: "Target Page", width: 260 },
  { key: "updated", label: "Last Updated", width: 140, sortable: true, align: "center" },
  { key: "actions", label: "Actions", width: 220 },
];

const colDesc: Record<ColKey, string> = {
  select: "Select rows for bulk actions.",
  expander: "Expand to preview rank chart & quick actions.",
  keyword: "Keyword with intent type and brand tag (if applicable).",
  prev: "Previous known Google position in the selected range.",
  curr: "Current Google position.",
  delta: "Position change — improved, declined, NEW or LOST.",
  traffic: "Estimated traffic impact (abs and %).",
  sfdelta: "SERP Features delta — FS, PAA, Video, Image, Discussions.",
  volume: "Monthly search volume.",
  kd: "Keyword Difficulty (0–100).",
  cpc: "Avg CPC (USD).",
  target: "Ranking URL (short path; full in tooltip).",
  updated: "Timestamp of last rank update.",
  actions: "Quick actions: SERP • Track • Task.",
};

/* ───────────────────────── Component ───────────────────────── */
export default function KeywordMovementAdvancedTable({
  initialRows,
  isPro = true,
}: {
  initialRows?: Row[];
  isPro?: boolean;
}) {
  /* Base font */
  const fontStyle = {
    fontFamily:
      'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
  } as const;

  /* Data */
  const [rows, setRows] = useState<Row[]>(() => initialRows ?? makeMockRows(140));

  /* Column visibility */
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() =>
    COLS.reduce(
      (acc, c) => ({ ...acc, [c.key]: true }),
      {} as Record<ColKey, boolean>
    )
  );

  /* Sorting */
  const [sortBy, setSortBy] = useState<ColKey>("delta");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (key: ColKey) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return;
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  /* Expanded */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [multiExpand, setMultiExpand] = useState(false);
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      if (multiExpand) return { ...prev, [id]: !prev[id] };
      return prev[id] ? {} : { [id]: true };
    });
  };

  /* Filters */
  const [query, setQuery] = useState("");
  const [changeType, setChangeType] = useState<"all" | ChangeType>("all");
  const [intent, setIntent] = useState<"all" | Intent>("all");
  const [kwType, setKwType] = useState<"all" | "branded" | "non-branded">("all");
  const [withSF, setWithSF] = useState<"all" | "with" | "without">("all");
  const [sfFilter, setSfFilter] = useState<FeatureKey[] | "any">("any");

  /* Infinite vs Pagination */
  const [infinite, setInfinite] = useState(true);
  const [visibleCount, setVisibleCount] = useState(60);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* Visible columns list */
  const VISIBLE = useMemo(
    () => COLS.filter((c) => visibleCols[c.key] !== false),
    [visibleCols]
  );

  /* Sticky style for frozen left trio */
  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left: c.key === "select" ? 0 : c.key === "expander" ? 40 : 80,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)",
        }
      : undefined;

  /* Filtered */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (query) {
        const q = query.toLowerCase();
        if (
          !r.keyword.toLowerCase().includes(q) &&
          !r.targetUrl.toLowerCase().includes(q)
        )
          return false;
      }
      if (changeType !== "all" && r.changeType !== changeType) return false;
      if (intent !== "all" && r.intent !== intent) return false;
      if (kwType === "branded" && !r.branded) return false;
      if (kwType === "non-branded" && r.branded) return false;
      if (withSF === "with" && !r.hasSF) return false;
      if (withSF === "without" && r.hasSF) return false;
      if (Array.isArray(sfFilter) && sfFilter.length) {
        const hasChosen = sfFilter.some((k) => r.sfDelta[k] && r.sfDelta[k] !== "x");
        if (!hasChosen) return false;
      }
      return true;
    });
  }, [rows, query, changeType, intent, kwType, withSF, sfFilter]);

  /* Sorted */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (r: Row): any => {
      switch (sortBy) {
        case "keyword":
          return r.keyword;
        case "prev":
          return r.prevPos ?? 9999;
        case "curr":
          return r.currPos ?? 9999;
        case "delta":
          return r.posDelta == null
            ? r.changeType === "new"
              ? 9999
              : -9999
            : r.posDelta;
        case "traffic":
          return r.trafficDeltaAbs;
        case "volume":
          return r.volume;
        case "kd":
          return r.kd;
        case "cpc":
          return r.cpc;
        case "updated":
          return r.lastUpdated;
        default:
          return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a),
        bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Windowed rows */
  const windowedRows = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* Infinite sentinel */
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("km-scroll-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((v) => Math.min(sorted.length, v + 60));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  /* Page-scope ids & selection helpers */
  const pageIds = useMemo(() => windowedRows.map((r) => r.id), [windowedRows]);
  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const someSelected = !allSelected && pageIds.some((id) => selected[id]);

  const toggleSelectAll = () => {
    const checked = !allSelected;
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      pageIds.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  };

  /* Export CSV (filtered+sorted dataset) */
  const exportCSV = (onlySelected = false) => {
    const cols = VISIBLE.filter(
      (c) => !["select", "expander", "actions"].includes(c.key)
    );
    const headers = cols.map((c) => c.label).join(",");
    const set = onlySelected ? sorted.filter((r) => selected[r.id]) : sorted;

    const mapVal = (r: Row, key: ColKey) => {
      switch (key) {
        case "keyword":
          return `${r.keyword} (${r.intent}${r.branded ? ", branded" : ""})`;
        case "prev":
          return r.prevPos ?? "—";
        case "curr":
          return r.currPos ?? "—";
        case "delta":
          return r.changeType === "new"
            ? "NEW"
            : r.changeType === "lost"
            ? "LOST"
            : r.posDelta ?? 0;
        case "traffic":
          return `${r.trafficDeltaAbs}${
            isPro ? ` (${r.trafficDeltaPct > 0 ? "+" : ""}${r.trafficDeltaPct}%)` : ""
          }`;
        case "sfdelta": {
          const keys: FeatureKey[] = [
            "fs",
            "paa",
            "video",
            "image",
            "discussions",
          ];
          return keys.map((k) => `${k}:${r.sfDelta[k] ?? "-"}`).join(" ");
        }
        case "volume":
          return r.volume;
        case "kd":
          return r.kd;
        case "cpc":
          return r.cpc;
        case "target":
          return r.targetUrl;
        case "updated":
          return r.lastUpdated;
        default:
          return "";
      }
    };

    const lines = set.map((r) =>
      cols.map((c) => JSON.stringify(mapVal(r, c.key))).join(",")
    );
    const csv = [headers, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = onlySelected
      ? "keyword-movement-selected.csv"
      : "keyword-movement.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* Column control reset */
  const resetColumns = () => {
    setVisibleCols(
      COLS.reduce(
        (acc, c) => ({ ...acc, [c.key]: true }),
        {} as Record<ColKey, boolean>
      )
    );
  };

  /* Helpers */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  /* Header tooltip primitive */
  const HeaderCell = ({ col }: { col: ColDef }) => {
    const showSort = !!col.sortable;
    const isActive = sortBy === col.key;
    return (
      <div className="relative group select-none">
        {showSort ? (
          <button
            className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer"
            onClick={() => toggleSort(col.key)}
            title={`Sort by ${col.label}`}
          >
            <span>{col.label}</span>
            {isActive ? (
              sortDir === "asc" ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span>{col.label}</span>
        )}
        <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
          {colDesc[col.key]}
        </span>
      </div>
    );
  };

  return (
    <section className="space-y-3 mt-4" style={fontStyle}>
      <Card
        className="border w-full"
        style={{ borderColor: TK.border, borderRadius: TK.radius }}
      >
        {/* Header */}
        <CardHeader
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderBottom: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" style={{ color: TK.brand }} />
            <CardTitle className="text-lg" style={{ color: TK.text }}>
              Keyword Movement
            </CardTitle>
            <span className="text-sm" style={{ color: TK.muted }}>
              Full delta table
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Modular toggles (latest design) */}
            <ToggleSwitch
              label="Infinite"
              active={infinite}
              onClick={() => {
                const next = !infinite;
                setInfinite(next);
                if (next) setVisibleCount(60);
              }}
              title="Toggle infinite scrolling"
            />
            <ToggleSwitch
              label="Expand multiple rows"
              active={multiExpand}
              onClick={() => setMultiExpand((v) => !v)}
              title="Toggle multiple expansion"
            />

            {/* Column show/hide */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TK.border }}
                  title="Show/Hide Columns"
                >
                  <SlidersHorizontal
                    className="h-4 w-4"
                    style={{ color: TK.brand }}
                  />
                  Columns
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 max-h-[420px] overflow-auto">
                <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
                <div className="space-y-2">
                  {COLS.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        disabled={
                          c.key === "select" ||
                          c.key === "expander" ||
                          c.key === "keyword"
                        }
                        checked={visibleCols[c.key] !== false}
                        onCheckedChange={(v) =>
                          setVisibleCols((s) => ({ ...s, [c.key]: Boolean(v) }))
                        }
                      />
                      <span>{c.label || c.key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-between">
                  <Button variant="outline" size="sm" onClick={resetColumns}>
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    style={{ background: TK.brand, color: "#fff" }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TK.border }}
                >
                  <Download className="h-4 w-4" style={{ color: TK.brand }} />
                  Export
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <button
                  className="w-full px-3 py-2 text-left rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => exportCSV(false)}
                >
                  CSV (All)
                </button>
                {selectedIds.length > 0 && (
                  <button
                    className="w-full px-3 py-2 text-left rounded hover:bg-[#F5F7FA] cursor-pointer"
                    onClick={() => exportCSV(true)}
                  >
                    CSV (Selection)
                  </button>
                )}
                <div className="h-px my-1 bg-[#E5E7EB]" />
                <button className="w-full px-3 py-2 text-left rounded opacity-50 cursor-not-allowed inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" /> XLSX (Pro)
                </button>
                <button className="w-full px-3 py-2 text-left rounded opacity-50 cursor-not-allowed inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" /> PDF (Pro)
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>

        {/* Filter row */}
        <CardContent
          className="border-b pt-3 pb-3"
          style={{ borderColor: TK.borderLight }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2"
                style={{ color: TK.brand }}
              />
              <Input
                className="w-[300px] pl-7"
                placeholder="Search keyword or URL path…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!infinite) setPage(1);
                }}
              />
            </div>

            {/* Change type */}
            <Select
              value={changeType}
              onValueChange={(v: any) => {
                setChangeType(v);
                if (!infinite) setPage(1);
              }}
            >
              <SelectTrigger className="h-8 px-3 w-[180px] cursor-pointer">
                <SelectValue placeholder="Change Type" />
              </SelectTrigger>
              <SelectContent>
                {(["all", "new", "lost", "improved", "declined"] as const).map(
                  (v) => (
                    <SelectItem key={v} value={v}>
                      {v === "all" ? "Change Type — All" : v.toUpperCase()}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {/* Intent */}
            <Select
              value={intent}
              onValueChange={(v: any) => {
                setIntent(v);
                if (!infinite) setPage(1);
              }}
            >
              <SelectTrigger className="h-8 px-3 w-[200px] cursor-pointer">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                {(
                  ["all", "informational", "commercial", "navigational", "transactional"] as const
                ).map((v) => (
                  <SelectItem key={v} value={v}>
                    {v === "all" ? "Intent — All" : v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Keyword type chips (segmented) */}
            <Segmented
              ariaLabel="Keyword Type"
              value={kwType}
              onChange={(v) => {
                setKwType(v as any);
                if (!infinite) setPage(1);
              }}
              items={[
                { value: "all", label: "All" },
                { value: "branded", label: "Branded" },
                { value: "non-branded", label: "Non‑Branded" },
              ]}
            />

            {/* SERP features filter */}
            <Select
              value={withSF}
              onValueChange={(v: any) => {
                setWithSF(v);
                if (!infinite) setPage(1);
              }}
            >
              <SelectTrigger className="h-8 px-3 w-[170px] cursor-pointer">
                <SelectValue placeholder="SERP Features" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">SERP Features — All</SelectItem>
                <SelectItem value="with">With SF only</SelectItem>
                <SelectItem value="without">Without SF</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 bg-white hover:bg-[#F7FAFC] cursor-pointer"
                  style={{ borderColor: TK.border }}
                >
                  <ListFilter className="h-4 w-4" style={{ color: TK.brand }} />
                  Feature Types
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60">
                <div className="text-sm font-medium mb-2">Filter by Feature</div>
                {(
                  ["fs", "paa", "video", "image", "discussions"] as FeatureKey[]
                ).map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 text-sm mb-1 cursor-pointer"
                  >
                    <Checkbox
                      checked={Array.isArray(sfFilter) ? sfFilter.includes(k) : false}
                      onCheckedChange={(v) => {
                        setSfFilter((prev) => {
                          const arr = Array.isArray(prev) ? [...prev] : [];
                          if (Boolean(v)) {
                            if (!arr.includes(k)) arr.push(k);
                          } else {
                            const idx = arr.indexOf(k);
                            if (idx >= 0) arr.splice(idx, 1);
                          }
                          return arr.length ? arr : "any";
                        });
                      }}
                    />
                    <span className="inline-flex items-center gap-2 capitalize">
                      {k === "fs" ? "Featured Snippet" : k}
                    </span>
                  </label>
                ))}
                <div className="mt-2 flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setSfFilter("any")}>
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    style={{ background: TK.brand, color: "#fff" }}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div
              className="w-full mt-2 p-2 rounded border flex items-center gap-2"
              style={{ borderColor: TK.borderLight, background: TK.pastelBlue }}
            >
              <span className="text-sm">
                <strong>{selectedIds.length}</strong> selected
              </span>
              <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
              <Button size="sm" variant="outline" className="cursor-pointer">
                <ClipboardList className="h-4 w-4 mr-1" />
                Create Tasks
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer">
                <Plus className="h-4 w-4 mr-1" />
                Add to Tracking
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={() => exportCSV(true)}
              >
                <Download className="h-4 w-4 mr-1" />
                Export Selection
              </Button>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => setSelected({})}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Table */}
        <CardContent className="p-0">
          <div
            className="max-h-[560px] overflow-auto border-t"
            style={{ borderColor: TK.borderLight }}
          >
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                <TableRow>
                  {VISIBLE.map((c) => (
                    <TableHead
                      key={c.key}
                      style={{ minWidth: c.width, ...stickyStyle(c) }}
                      className={
                        c.align === "center"
                          ? "text-center"
                          : c.align === "right"
                          ? "text-right"
                          : undefined
                      }
                    >
                      {c.key === "select" ? (
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={someSelected ? "indeterminate" : allSelected}
                            onCheckedChange={toggleSelectAll}
                          />
                        </div>
                      ) : c.key === "expander" ? (
                        <span className="relative group">
                          <span />
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                            {colDesc[c.key]}
                          </span>
                        </span>
                      ) : (
                        <HeaderCell col={c} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {windowedRows.map((r) => (
                  <React.Fragment key={r.id}>
                    <TableRow className="group hover:bg-[#F8FAFC]">
                      {/* select */}
                      {visibleCols.select !== false && (
                        <TableCell style={stickyStyle(COLS[0]) as any}>
                          <Checkbox
                            checked={!!selected[r.id]}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [r.id]: Boolean(v) }))
                            }
                          />
                        </TableCell>
                      )}
                      {/* expander */}
                      {visibleCols.expander !== false && (
                        <TableCell style={stickyStyle(COLS[1]) as any}>
                          <button
                            onClick={() => toggleExpand(r.id)}
                            aria-label={expanded[r.id] ? "Collapse" : "Expand"}
                            className="rounded-md border p-1 hover:bg-muted cursor-pointer"
                          >
                            {expanded[r.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      {/* keyword (sticky) */}
                      {visibleCols.keyword !== false && (
                        <TableCell style={stickyStyle(COLS[2]) as any}>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{r.keyword}</div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="rounded px-1.5 py-0.5 text-[11px] border cursor-default"
                                    style={{
                                      borderColor: TK.borderLight,
                                      color: TK.muted,
                                    }}
                                  >
                                    {r.branded ? "Branded" : "Non‑Branded"}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Brand match classification
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="mt-1">
                            <IntentChip intent={r.intent} />
                          </div>
                        </TableCell>
                      )}
                      {/* prev */}
                      {visibleCols.prev !== false && (
                        <TableCell className="text-center">
                          {r.prevPos ?? "—"}
                        </TableCell>
                      )}
                      {/* curr */}
                      {visibleCols.curr !== false && (
                        <TableCell className="text-center">
                          {r.currPos ?? "—"}
                        </TableCell>
                      )}
                      {/* delta */}
                      {visibleCols.delta !== false && (
                        <TableCell className="text-center">
                          <ChangeBadge c={r.changeType} delta={r.posDelta} />
                        </TableCell>
                      )}
                      {/* traffic */}
                      {visibleCols.traffic !== false && (
                        <TableCell className="text-right">
                          <TrafficDeltaPill
                            abs={r.trafficDeltaAbs}
                            pct={r.trafficDeltaPct}
                            showPct={isPro}
                          />
                        </TableCell>
                      )}
                      {/* sf delta */}
                      {visibleCols.sfdelta !== false && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SFIcon k="fs" d={r.sfDelta.fs} />
                            <SFIcon k="paa" d={r.sfDelta.paa} />
                            <SFIcon k="video" d={r.sfDelta.video} />
                            <SFIcon k="image" d={r.sfDelta.image} />
                            <SFIcon k="discussions" d={r.sfDelta.discussions} />
                          </div>
                        </TableCell>
                      )}
                      {/* volume */}
                      {visibleCols.volume !== false && (
                        <TableCell className="text-right">{nf(r.volume)}</TableCell>
                      )}
                      {/* kd */}
                      {visibleCols.kd !== false && (
                        <TableCell className="text-right">{r.kd}</TableCell>
                      )}
                      {/* cpc */}
                      {visibleCols.cpc !== false && (
                        <TableCell className="text-right">
                          {fmtMoney(r.cpc)}
                        </TableCell>
                      )}
                      {/* target */}
                      {visibleCols.target !== false && (
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  className="underline inline-flex items-center gap-1 cursor-pointer"
                                  href={r.targetUrl}
                                  onClick={(e) => e.preventDefault()}
                                  style={{ color: TK.valueBlue }}
                                  title={r.targetUrl}
                                >
                                  {r.targetUrl.length > 42
                                    ? r.targetUrl
                                        .replace(/^https?:\/\/[^/]+/, "")
                                        .replace(/^\/?/, "/")
                                        .replace(/(.{18}).+(.{16})/, "$1…$2")
                                    : r.targetUrl
                                        .replace(/^https?:\/\/[^/]+/, "")
                                        .replace(/^\/?/, "/")}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>{r.targetUrl}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}
                      {/* updated */}
                      {visibleCols.updated !== false && (
                        <TableCell className="text-center">
                          <span
                            className="inline-flex items-center gap-1 text-xs"
                            style={{ color: TK.muted }}
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            {r.lastUpdated}
                          </span>
                        </TableCell>
                      )}
                      {/* actions — visible by default with hover animation */}
                      {visibleCols.actions !== false && (
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Open SERP"
                                    className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-110"
                                    style={{ color: TK.brand }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Open SERP</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Add to Tracking"
                                    className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-110"
                                    style={{ color: TK.brand }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add to Tracking</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Assign Task"
                                    className="cursor-pointer transition-transform hover:-translate-y-[1px] hover:scale-110"
                                    style={{ color: TK.brand }}
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Assign Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Expanded row */}
                    {expanded[r.id] && (
                      <TableRow>
                        <TableCell colSpan={VISIBLE.length}>
                          <div
                            className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 rounded-md border"
                            style={{
                              borderColor: TK.borderLight,
                              background: "#FAFBFF",
                            }}
                          >
                            {/* Left: Mini chart with axes + smart popover */}
                            <div>
                              <div className="text-sm font-medium mb-1">
                                Rank Timeline (last 30 checks)
                              </div>
                              <MiniRankChart
                                series={r.rankSeries}
                                lastUpdated={r.lastUpdated}
                              />
                            </div>

                            {/* Right: SERP feature chips + quick CTAs */}
                            <div className="space-y-3">
                              <div className="text-sm font-medium">
                                Recent SERP Feature Events
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                {(
                                  ["fs", "paa", "video", "image", "discussions"] as FeatureKey[]
                                ).map((k) => (
                                  <div
                                    key={k}
                                    className="inline-flex items-center gap-2 px-2 py-1 rounded border"
                                    style={{
                                      borderColor: TK.borderLight,
                                      background: "#fff",
                                    }}
                                  >
                                    <SFIcon k={k} d={r.sfDelta[k]} />
                                    <span className="text-xs capitalize">
                                      {k === "fs" ? "Featured Snippet" : k}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="text-sm font-medium">Quick Actions</div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  className="cursor-pointer"
                                  style={{ background: TK.brand, color: "#fff" }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View SERP (latest)
                                </Button>
                                <Button size="sm" variant="outline" className="cursor-pointer">
                                  <ClipboardList className="h-4 w-4 mr-1" />
                                  Assign Task
                                </Button>
                                <Button size="sm" variant="outline" className="cursor-pointer">
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add to Tracking
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {infinite && <div id="km-scroll-sentinel" className="h-8" />}
          </div>
        </CardContent>

        {/* Bottom pagination (when infinite off) */}
        {!infinite && (
          <div
            className="flex items-center justify-between p-3 border-t"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="text-sm" style={{ color: TK.muted }}>
              Showing{" "}
              {sorted.length === 0
                ? 0
                : (page - 1) * pageSize + 1}
              -
              {Math.min(
                sorted.length,
                (page - 1) * pageSize + windowedRows.length
              )}{" "}
              of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
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
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                First
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <div className="text-sm w-20 text-center">
                {page} / {Math.max(1, Math.ceil(sorted.length / pageSize))}
              </div>
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                disabled={page >= Math.ceil(sorted.length / pageSize)}
                onClick={() =>
                  setPage((p) =>
                    Math.min(Math.ceil(sorted.length / pageSize), p + 1)
                  )
                }
              >
                Next
              </Button>
              <Button
                variant="outline"
                className="h-8 px-3 cursor-pointer"
                disabled={page >= Math.ceil(sorted.length / pageSize)}
                onClick={() => setPage(Math.ceil(sorted.length / pageSize))}
              >
                Last
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ───────────────────────── Optional: Demo wrapper (remove in prod) ───────────────────────── */
export function DemoKeywordMovement() {
  return (
    <div style={{ padding: 16, background: TK.appBg }}>
      <KeywordMovementAdvancedTable isPro />
    </div>
  );
}

