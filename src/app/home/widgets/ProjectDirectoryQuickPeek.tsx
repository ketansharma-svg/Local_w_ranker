import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import {
  // layout + navigation
  LayoutList, LayoutGrid, Grid3X3,
  // actions + UI
  ChevronDown, ChevronRight, ChevronsUpDown, SlidersHorizontal, Download, Search, Info,
  Eye, ClipboardList, Link as LinkIcon, Pin, PinOff, GripVertical,
  // identity / tagging
  UserPlus, Tags, Tag, Shield, Star,
  // status
  Lock
} from "lucide-react";
import Demo_DirectoryQuickPeekDrawer from "../drawers/DirectoryQuickPeekDrawer";
/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",          // Brand blue
  action: "var(--wr-action, #0077FF)",
  pastelBlue: "var(--wr-pastelBlue, #D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#E94134",
  cardBg: "#FFFFFF",
  cardHover: "#F8FAFF",
  radius: "10px",
};

/* ───────────────────────── Types & mock data ───────────────────────── */
type Device = "mobile" | "desktop";
type Role = "Owner" | "Editor" | "Viewer";
type View = "list" | "grid" | "matrix";

type SeriesPoint = { date: string; clicks: number; sessions: number; wr: number; seo: number; kwRank: number };

type Project = {
  id: string;
  name: string;
  domain: string;
  favicon?: string;       // optional favicon url (actual project favicon)
  owner: { id: string; name: string; avatar?: string; role: Role };
  tags: string[];
  pinned?: boolean;
  // KPIs (current window)
  seoScore: number;       // 0..100
  healthScore: number;    // 0..100
  wrScore: number;        // 0..100
  clicks: number;
  sessions: number;
  // deltas (% vs previous window)
  clicksDelta: number;    // -0.12 => -12%
  sessionsDelta: number;
  // misc
  device: Device;
  series: SeriesPoint[];  // last 30 days for expansion + deltas calc
};

const USERS = [
  { id: "u1", name: "Alex Rivera" },
  { id: "u2", name: "Jordan Lee" },
  { id: "u3", name: "Priya Sharma" },
  { id: "u4", name: "Marcus Chen" },
];

function seedSeries(): SeriesPoint[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86400000).toISOString().slice(0, 10);
    const clicks = Math.max(0, Math.round(200 + 200 * Math.sin(i / 5) + (Math.random() - 0.5) * 90));
    const sessions = Math.max(0, Math.round(clicks * (1.2 + Math.random() * 0.6)));
    const wr = Math.max(20, Math.min(95, Math.round(55 + 14 * Math.sin(i / 6) + (Math.random() - 0.5) * 8)));
    const seo = Math.max(25, Math.min(98, Math.round(62 + 10 * Math.cos(i / 7) + (Math.random() - 0.5) * 8)));
    const kwRank = Math.max(5, Math.min(60, Math.round(30 - 8 * Math.sin(i / 4) + (Math.random() - 0.5) * 10))); // lower is better
    return { date: d, clicks, sessions, wr, seo, kwRank };
  });
}

function deltaPct(series: number[], window: number) {
  const n = series.length;
  if (n < window * 2) return 0;
  const cur = series.slice(n - window).reduce((s, v) => s + v, 0);
  const prev = series.slice(n - window * 2, n - window).reduce((s, v) => s + v, 0);
  if (prev === 0) return 0;
  return (cur - prev) / prev;
}

function makeProjects(n = 36): Project[] {
  return Array.from({ length: n }, (_, i) => {
    const series = seedSeries();
    const last = series.at(-1)!;
    const clicksDelta = deltaPct(series.map(s => s.clicks), 7);
    const sessionsDelta = deltaPct(series.map(s => s.sessions), 7);
    const name = i % 5 === 0 ? `Wranker HQ ${i}` : i % 3 === 0 ? `Growth Hub ${i}` : `Project ${i}`;
    const domain = i % 4 === 0 ? `wranker-${i}.com` : i % 3 === 0 ? `growth-${i}.io` : `site-${i}.app`;
    return {
      id: `proj-${i + 1}`,
      name,
      domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      owner: { id: USERS[i % USERS.length].id, name: USERS[i % USERS.length].name, role: (["Owner","Editor","Viewer"] as Role[])[i % 3] },
      tags: i % 2 === 0 ? ["SEO", "Core"] : ["Content"],
      pinned: i < 2, // a couple pinned by default
      seoScore: last.seo,
      healthScore: Math.round(Math.max(20, Math.min(98, last.seo + (Math.random() - 0.5) * 10))), // integer only
      wrScore: last.wr,
      clicks: last.clicks,
      sessions: last.sessions,
      clicksDelta,
      sessionsDelta,
      device: Math.random() > 0.5 ? "mobile" : "desktop",
      series,
    };
  });
}

/* ───────────────────────── Small UI helpers ───────────────────────── */
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
const pct = (p: number) => `${(p * 100).toFixed(1)}%`;
const deltaTone = (p: number) => p > 0 ? TK.ok : p < 0 ? TK.critical : TK.muted;
const scoreColor = (n: number) => (n < 50 ? TK.critical : n < 75 ? TK.warn : TK.ok);

const Avatar: React.FC<{ name: string; src?: string; size?: number; className?: string; title?: string }> = ({ name, src, size = 28, className, title }) => {
  const initials = name.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      title={title ?? name}
      style={{ width: size, height: size, borderRadius: "50%", background: "#E3F2FD", color: TK.brand }}
      className={cx("inline-flex items-center justify-center text-[12px] font-semibold overflow-hidden border", className)}
    >
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%" }} /> : initials}
    </div>
  );
};

const HeaderTip: React.FC<{ tip: string; children: React.ReactNode }> = ({ tip, children }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">{children}<Info className="h-3.5 w-3.5 text-[#9E9E9E]" /></span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ScoreBar: React.FC<{ value: number; label: string; animated?: boolean; integerOnly?: boolean }> = ({ value, label, animated, integerOnly }) => {
  const col = scoreColor(value);
  const display = integerOnly ? Math.round(value) : value;
  return (
    <div className="flex items-center gap-2" title={`${label}: ${display}/100`}>
      <div className="h-2.5 w-28 rounded" style={{ background: TK.borderLight }}>
        <div
          className="h-2.5 rounded"
          style={{
            width: `${value}%`,
            background: col,
            transition: animated ? "width 600ms cubic-bezier(.2,.8,.2,1)" : undefined
          }}
        />
      </div>
      <span className="text-xs" style={{ color: TK.text }}>{integerOnly ? Math.round(value) : value}</span>
    </div>
  );
};

const SmallDonut: React.FC<{ value: number }> = ({ value }) => {
  const size = 28, stroke = 4, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} >
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={TK.borderLight} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={TK.brand} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
};

/* SmartPopover – shared design pattern (Summary cards style) */
const SmartPopover: React.FC<{
  trigger: React.ReactNode;
  title: string;
  items: { label: string; value: string | number; tone?: string; icon?: React.ReactNode }[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}> = ({ trigger, title, items, open, onOpenChange }) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="text-[13px] font-medium mb-2">{title}</div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                {it.icon ?? <Info className="h-3.5 w-3.5" />}
                <span>{it.label}</span>
              </div>
              <b style={{ color: it.tone ?? TK.text }}>{it.value}</b>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ───────────────────────── SVG Micro-Chart primitives with axes ───────────────────────── */

type MetricChartProps = {
  title: string;
  type: "area" | "bar";
  color: string;
  series: { date: string; value: number }[];
  yRange?: [number, number];
  format?: (n: number) => string;
  className?: string;
};

function niceStep(raw: number) {
  // round to 1/2/5 * 10^k
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const base = raw / pow;
  const niceBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return niceBase * pow;
}

const MetricChart: React.FC<MetricChartProps> = ({
  title, type, color, series, yRange, format = (n) => String(n), className
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [openPop, setOpenPop] = useState(false);

  const W = 360, H = 180;
  const pad = { l: 42, r: 18, t: 22, b: 28 };
  const width = W - pad.l - pad.r;
  const height = H - pad.t - pad.b;
  const n = series.length;

  const vals = series.map(s => s.value);
  const lo0 = yRange ? yRange[0] : Math.min(...vals);
  const hi0 = yRange ? yRange[1] : Math.max(...vals);
  const span0 = Math.max(1e-6, hi0 - lo0);
  const step = niceStep(span0 / 4);
  const yMin = Math.floor(lo0 / step) * step;
  const yMax = Math.ceil(hi0 / step) * step;
  const span = Math.max(step, yMax - yMin);

  const xFor = (i: number) => pad.l + (i / (n - 1)) * width;
  const yFor = (v: number) => pad.t + (1 - (v - yMin) / span) * height;

  const pathD = series.map((s, i) => `${i ? "L" : "M"} ${xFor(i)} ${yFor(s.value)}`).join(" ");
  const areaD = `${pathD} L ${xFor(n - 1)} ${yFor(yMin)} L ${xFor(0)} ${yFor(yMin)} Z`;

  const xTicksIdx = [0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1];
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + i * (span / 4));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect(); if (!box) return;
    const mx = e.clientX - box.left;
    const ix = clamp(Math.round(((mx - pad.l) / width) * (n - 1)), 0, n - 1);
    setHover(ix);
    setOpenPop(true);
  };

  const labelDate = (i: number) => series[i]?.date ?? "";
  const labelVal = (i: number) => series[i] ? format(series[i].value) : "";

  return (
    <div className={cx("relative", className)}>
      {/* Title row with inline info popover bound to hover */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-muted-foreground">{title}</div>
        <SmartPopover
          open={openPop}
          onOpenChange={(o)=>setOpenPop(o)}
          title={`${title} • ${hover != null ? labelDate(hover) : series.at(-1)?.date ?? ""}`}
          items={[
            { label: "Value", value: hover != null ? labelVal(hover) : format(series.at(-1)?.value ?? 0), tone: color },
            { label: "Range", value: `${Math.round(yMin)} – ${Math.round(yMin + span)}` },
          ]}
          trigger={
            <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
              Details
            </button>
          }
        />
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={onMove}
        onMouseLeave={() => { setHover(null); setOpenPop(false); }}
      >
        {/* Axes */}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke={TK.borderLight} />
        <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke={TK.borderLight} />

        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <g key={`y-${i}`}>
            <line x1={pad.l} x2={W - pad.r} y1={yFor(t)} y2={yFor(t)} stroke={i === 0 ? TK.borderLight : "#F2F4F7"} />
            <text x={pad.l - 6} y={yFor(t) + 3} textAnchor="end" fontSize="10" fill={TK.muted}>
              {Math.round(t)}
            </text>
          </g>
        ))}

        {/* X ticks + labels */}
        {xTicksIdx.map((ix, i) => (
          <g key={`x-${i}`}>
            <line x1={xFor(ix)} x2={xFor(ix)} y1={H - pad.b} y2={H - pad.b + 4} stroke={TK.borderLight} />
            <text x={xFor(ix)} y={H - 6} textAnchor="middle" fontSize="10" fill={TK.muted}>
              {series[ix].date.slice(5)}{/* MM-DD */}
            </text>
          </g>
        ))}

        {/* Series */}
        {type === "area" ? (
          <>
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
            <path d={areaD} fill={hexToRgba(color, 0.12)} stroke="none" />
          </>
        ) : (
          <>
            {series.map((s, i) => {
              const bw = width / n * 0.7;
              const x = xFor(i) - bw / 2;
              const y = yFor(s.value);
              return (
                <rect key={i} x={x} y={y} width={bw} height={H - pad.b - y} fill={i === hover ? darken(color, 0.12) : color} />
              );
            })}
          </>
        )}

        {/* Crosshair + point */}
        {hover != null && (
          <>
            <line x1={xFor(hover)} x2={xFor(hover)} y1={pad.t} y2={H - pad.b} stroke={TK.border} />
            {type === "area" && <circle cx={xFor(hover)} cy={yFor(series[hover].value)} r="3.5" fill={color} />}
          </>
        )}
      </svg>

      {/* Hover bubble (compact) */}
      {hover != null && (
        <div
          className="absolute text-[11px] px-2 py-1 rounded text-white pointer-events-none"
          style={{
            right: 6, top: 4, background: "rgba(17,24,39,0.96)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.25)"
          }}
        >
          <div><b>{labelDate(hover)}</b></div>
          <div>{format(series[hover].value)}</div>
        </div>
      )}
    </div>
  );
};

/* color helpers */
function hexToRgba(hex: string, a = 1) {
  const h = hex.replace("#",""); const bigint = parseInt(h.length===3 ? h.split("").map(c=>c+c).join("") : h, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function darken(hex: string, amount = 0.1) {
  const h = hex.replace("#",""); const bigint = parseInt(h.length===3 ? h.split("").map(c=>c+c).join("") : h, 16);
  let r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  r = Math.round(r * (1 - amount)); g = Math.round(g * (1 - amount)); b = Math.round(b * (1 - amount));
  const toHex = (n:number)=>n.toString(16).padStart(2,"0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ───────────────────────── Views ───────────────────────── */

/* ——— Shared header with Export + view switcher ——— */
type ViewType = "list" | "grid" | "matrix";
const SectionHeader: React.FC<{
  view: ViewType; onView: (v: ViewType) => void; onExport: () => void;
  count: number;
}> = ({ view, onView, onExport, count }) => {
  const Btn: React.FC<{ v: ViewType; label: string; icon: React.ReactNode }> = ({ v, label, icon }) => (
    <button
      className={cx(
        "h-8 px-3 inline-flex items-center gap-2",
        view === v ? "font-medium text-white" : "hover:bg-[#F8FAFC]"
      )}
      style={view === v ? { background: TK.brand } : {}}
      onClick={() => onView(v)}
      title={`${label} View`}
    >
      {icon} {label}
    </button>
  );

  return (
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
      <CardTitle className="text-lg">Project Directory & Quick Peek <span className="text-muted-foreground font-normal">({count})</span></CardTitle>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-md border overflow-hidden" style={{ borderColor: TK.border }}>
          <Btn v="list" label="List" icon={<LayoutList className="h-4 w-4" />} />
          <Btn v="grid" label="Grid" icon={<LayoutGrid className="h-4 w-4" />} />
          <Btn v="matrix" label="Matrix" icon={<Grid3X3 className="h-4 w-4" />} />
        </div>

        <Button variant="outline" className="h-8 px-3" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" /> Export
        </Button>
      </div>
    </CardHeader>
  );
};

/* ——— Common Filter Chips (now visible in Grid & Matrix too) ——— */
const ViewFilters: React.FC = () => (
  <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
    <div className="flex flex-wrap items-center gap-2">
      <button className="h-8 px-3 rounded-full border text-sm hover:bg-[#F6FAFF]" style={{ borderColor: TK.borderLight }}>
        Pinned Only
      </button>
      <button className="h-8 px-3 rounded-full border text-sm hover:bg-[#F6FAFF]" style={{ borderColor: TK.borderLight }}>
        SEO &lt; 50
      </button>
      <button className="h-8 px-3 rounded-full border text-sm hover:bg-[#F6FAFF]" style={{ borderColor: TK.borderLight }}>
        Has Tag
      </button>
    </div>
  </CardContent>
);

/* ——— GRID VIEW (cards; drag & drop, pin, smart popovers, CTAs bottom-right) ——— */
const GridView: React.FC<{
  projects: Project[];
  onReorder: (idsInOrder: string[]) => void;
  onTogglePin: (id: string) => void;
  onAssignUser: (id: string, userId: string) => void;
}> = ({ projects, onReorder, onTogglePin, onAssignUser }) => {
  const [dragging, setDragging] = useState<string | null>(null);

  const onDragStart = (id: string, e: React.DragEvent) => {
    setDragging(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (overId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (overId: string, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === overId) return;
    const ids = projects.map(p => p.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(overId);
    const next = ids.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
    setDragging(null);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {projects.map(p => (
        <div
          key={p.id}
          draggable
          onDragStart={(e) => onDragStart(p.id, e)}
          onDragOver={(e) => onDragOver(p.id, e)}
          onDrop={(e) => onDrop(p.id, e)}
          className={cx(
            "border rounded-lg relative cursor-grab",
            "transition-transform duration-200 ease-out",
            "hover:-translate-y-0.5 hover:shadow-sm"
          )}
          style={{ borderColor: TK.border, background: TK.cardBg }}
        >
          {/* Drag handle (left) */}
          <div className="absolute top-2 left-2 inline-flex items-center">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Pin toggle (top-right) */}
          <div className="absolute top-2 right-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="p-1 rounded hover:bg-[#F4F6FA] cursor-pointer"
                    onClick={() => onTogglePin(p.id)}
                    aria-label={p.pinned ? "Unpin" : "Pin at top"}
                    title={p.pinned ? "Unpin" : "Pin at top"}
                  >
                    {p.pinned ? <Pin className="h-4 w-4" style={{ color: TK.brand }} /> : <PinOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{p.pinned ? "Unpin" : "Pin at top"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Header; add left padding to give gap from drag handle */}
          <div className="px-4 pt-4 pb-3 pl-8" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
            <div className="flex items-center gap-2">
              {p.favicon ? <img src={p.favicon} alt="" className="h-4 w-4 rounded-sm" /> : <Star className="h-3.5 w-3.5 text-muted-foreground" />}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="font-medium truncate cursor-pointer" title={p.name} style={{ maxWidth: "80%" }}>
                      {p.name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{p.domain}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Owner + role + tags */}
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2">
                <Avatar name={p.owner.name} src={p.owner.avatar} title={`Owner: ${p.owner.name}`} />
                <div className="text-sm">
                  <div className="leading-4">{p.owner.name}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5"/> {p.owner.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {p.tags.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full border text-xs inline-flex items-center gap-1" style={{ borderColor: TK.borderLight }}>
                    <Tag className="h-3.5 w-3.5"/>{t}
                  </span>
                ))}
              </div>
            </div>

            {/* KPIs with smart popovers */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <SmartPopover
                title="SEO Score Breakdown"
                items={[
                  { label: "On-page", value: `${Math.round(p.seoScore * 0.45)}`, tone: scoreColor(p.seoScore), icon: <Search className="h-3.5 w-3.5"/> },
                  { label: "Meta + Schema", value: `${Math.round(p.seoScore * 0.35)}` },
                  { label: "Internal links", value: `${Math.round(p.seoScore * 0.20)}` },
                ]}
                trigger={
                  <div className="cursor-pointer">
                    <div className="text-xs text-muted-foreground mb-1">SEO Score</div>
                    <ScoreBar value={p.seoScore} label="SEO Score" animated />
                  </div>
                }
              />
              <SmartPopover
                title="Health Score Breakdown"
                items={[
                  { label: "CWV / UX", value: `${Math.round(p.healthScore * 0.4)}`, tone: scoreColor(p.healthScore) },
                  { label: "Errors / Warnings", value: `${Math.round(p.healthScore * 0.35)}` },
                  { label: "Indexability", value: `${Math.round(p.healthScore * 0.25)}` },
                ]}
                trigger={
                  <div className="cursor-pointer">
                    <div className="text-xs text-muted-foreground mb-1">Health Score</div>
                    <ScoreBar value={p.healthScore} label="Health Score" animated integerOnly />
                  </div>
                }
              />
              <SmartPopover
                title="WR Score"
                items={[
                  { label: "Authority", value: `${Math.round(p.wrScore * 0.5)}`, icon: <Star className="h-3.5 w-3.5"/> },
                  { label: "Relevancy", value: `${Math.round(p.wrScore * 0.3)}` },
                  { label: "Freshness", value: `${Math.round(p.wrScore * 0.2)}` },
                ]}
                trigger={
                  <div className="cursor-pointer">
                    <div className="text-xs text-muted-foreground mb-1">WR Score</div>
                    <div className="inline-flex items-center gap-2"><SmallDonut value={p.wrScore}/><span className="text-sm">{p.wrScore}</span></div>
                  </div>
                }
              />
              <SmartPopover
                title="Traffic Breakdown (last 7d)"
                items={[
                  { label: "Clicks", value: fmt(p.clicks), tone: TK.text, icon: <Eye className="h-3.5 w-3.5"/> },
                  { label: "Sessions", value: fmt(p.sessions) },
                  { label: "Device", value: p.device },
                ]}
                trigger={
                  <div className="cursor-pointer">
                    <div className="text-xs text-muted-foreground mb-1">Clicks / Sessions</div>
                    <div className="text-sm">
                      <b>{fmt(p.clicks)}</b> / {fmt(p.sessions)}
                      <span className="ml-2 text-xs" style={{ color: deltaTone(p.clicksDelta) }}>{p.clicksDelta >= 0 ? "▲" : "▼"} {pct(Math.abs(p.clicksDelta))}</span>
                      <span className="ml-1 text-xs" style={{ color: deltaTone(p.sessionsDelta) }}>{p.sessionsDelta >= 0 ? "▲" : "▼"} {pct(Math.abs(p.sessionsDelta))}</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          {/* CTAs bottom-right (icons only; with labels on hover) */}
          <div className="absolute bottom-2 right-2 inline-flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open SERP">
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Open SERP</TooltipContent></Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Create Task">
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Create Task</TooltipContent></Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open Project">
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Open Project</TooltipContent></Tooltip>
            </TooltipProvider>

            {/* Assign User – show tooltip on hover */}
            <Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Assign User">
                        <UserPlus className="h-4 w-4 text-[#0EA5E9]" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Assign User</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent align="end" className="w-56">
                <div className="text-sm font-medium mb-2">Assign User</div>
                <div className="space-y-2">
                  {USERS.map(u => (
                    <button key={u.id} className="w-full text-left rounded px-2 py-1.5 hover:bg-[#F5F8FF] cursor-pointer"
                            onClick={() => onAssignUser(p.id, u.id)}>
                      {u.name}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Dragging veil */}
          {dragging === p.id && (
            <div className="absolute inset-0 bg-white/30 rounded-lg border-2 border-dashed" style={{ borderColor: TK.pastelBlue }}/>
          )}
        </div>
      ))}
    </div>
  );
};

/* ——— LIST VIEW (default) ——— */
type ColKey =
  | "select" | "expander" | "name"
  | "owner" | "role" | "tags"
  | "seo" | "health" | "wr"
  | "clicks" | "sessions" | "actions";

type ColDef = { key: ColKey; label: string; width?: number; sortable?: boolean; sticky?: boolean; tip?: string };
const COLS: ColDef[] = [
  { key: "select", label: "", width: 46, sticky: true },
  { key: "expander", label: "", width: 44, sticky: true },
  { key: "name", label: "Project", width: 320, sortable: true, sticky: true, tip: "Project name with favicon (hover: domain)" },
  { key: "owner", label: "Owner", width: 180, sortable: true, tip: "Assigned user" },
  { key: "role", label: "Role", width: 120, sortable: true, tip: "Role type (branded icon)" },
  { key: "tags", label: "Tags", width: 200, tip: "Project tags" },
  { key: "seo", label: "SEO Score", width: 160, sortable: true, tip: "0–100 (progress bar + value)" },
  { key: "health", label: "Health Score", width: 160, sortable: true, tip: "0–100 (progress bar + value)" },
  { key: "wr", label: "WR Score", width: 140, sortable: true, tip: "Brand-colored circular gauge" },
  { key: "clicks", label: "Clicks", width: 140, sortable: true, tip: "Value with Δ (selected period)" },
  { key: "sessions", label: "Sessions", width: 160, sortable: true, tip: "Value with Δ (selected period)" },
  { key: "actions", label: "Actions", width: 190, tip: "Quick actions & Assign User / Tags" },
];

const ListView: React.FC<{
  projects: Project[];
  availableTags: string[];
  onUpdateTags: (id: string, tags: string[]) => void;
  onAssignUser: (id: string, userId: string) => void;
  onTogglePin: (id: string) => void;

  // table controls
  timeRange: "7d" | "14d" | "30d";
  sortBy: ColKey; sortDir: "asc" | "desc"; setSort: (k: ColKey) => void;
  visibleCols: Record<ColKey, boolean>; setVisibleCols: (updater: (s: Record<ColKey, boolean>) => Record<ColKey, boolean>) => void;

  // selection + pagination
  selected: Record<string, boolean>; setSelected: (next: Record<string, boolean>) => void;
  page: number; setPage: (p: number) => void; pageSize: number; setPageSize: (n: number) => void;

  // series expand
  expanded: Record<string, boolean>; setExpanded: (updater: (s: Record<string, boolean>) => Record<string, boolean>) => void;

  // bulk assign tags
  onBulkAssignTags: (ids: string[], tag: string) => void;
}> = ({
  projects, availableTags, onUpdateTags, onAssignUser, onTogglePin,
  timeRange, sortBy, sortDir, setSort, visibleCols, setVisibleCols,
  selected, setSelected, page, setPage, pageSize, setPageSize,
  expanded, setExpanded, onBulkAssignTags,
}) => {

  const headerSortIcon = (key: ColKey) =>
    sortBy === key ? (sortDir === "asc" ? <ChevronDown className="h-4 w-4 rotate-180"/> : <ChevronDown className="h-4 w-4"/>) : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;

  const stickyStyle = (c: ColDef) =>
    c.sticky
      ? {
          position: "sticky" as const,
          left:
            c.key === "select" ? 0 :
            c.key === "expander" ? 46 :
            c.key === "name" ? 90 : 0,
          zIndex: 30,
          background: "#fff",
          boxShadow: "inset -1px 0 0 rgba(0,0,0,0.06)"
        }
      : undefined;

  const pageStart = (page - 1) * pageSize;
  const windowRows = projects.slice(pageStart, pageStart + pageSize);

  const pageIds = windowRows.map(p => p.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected[id]);

  const toggleSelectAll = () => {
    const checked = !allSelected;
    const next: Record<string, boolean> = { ...selected };
    pageIds.forEach(id => { next[id] = checked; });
    setSelected(next);
  };

  const visibleList = COLS.filter(c => visibleCols[c.key] !== false);

  const [drawerRow, setDrawerRow] = useState(false);
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

  return (
    <>
      {/* Top filter & column control row */}
      <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
        <div className="flex flex-wrap items-center gap-2">
                                          {drawerRow && (
                                      <Drawer title="Drawer" onClose={closeDrawer}>
                                        <Demo_DirectoryQuickPeekDrawer   />
                                      </Drawer>
                                    )}
          {/* Search by project name/domain */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="w-[300px] pl-7" placeholder="Search project…" onChange={() => { /* handled in parent */ }} />
          </div>

          {/* Modern filter chips */}
          <button className="h-8 px-3 rounded-full border text-sm hover:bg-[#F6FAFF]" style={{ borderColor: TK.borderLight }}>
            Pinned Only
          </button>
          <button className="h-8 px-3 rounded-full border text-sm hover:bg-[#F6FAFF]" style={{ borderColor: TK.borderLight }}>
            SEO &lt; 50
          </button>
          <button className="h-8 px-3 rounded-full border text-sm hover:bg-[#F6FAFF]" style={{ borderColor: TK.borderLight }}>
            Has Tag
          </button>

          {/* Time range (for delta) */}
          <div className="flex items_center gap-2 ml-2">
            <span className="text-sm text-muted-foreground">Period</span>
            <Select value={timeRange}>
              <SelectTrigger className="h-8 px-3 w-[140px]"><SelectValue placeholder="Period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Columns control */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 hover:bg-[#F7FAFC]">
                <SlidersHorizontal className="h-4 w-4" /> Column Control
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <div className="text-sm font-medium mb-2">Show / Hide Columns</div>
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {COLS.map(c => (
                  <label key={c.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      disabled={c.key === "select" || c.key === "expander" || c.key === "name"}
                      checked={visibleCols[c.key] !== false}
                      onCheckedChange={(v) => setVisibleCols(s => ({ ...s, [c.key]: Boolean(v) }))} />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Pagination controls (right align) */}
          <div className="ml-auto flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
              <SelectContent>
                {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-8 px-3" onClick={()=>setPage(1)}>First</Button>
            <Button variant="outline" className="h-8 px-3" onClick={()=>setPage(Math.max(1, page-1))}>Prev</Button>
            <div className="text-sm w-16 text-center">{page}</div>
            <Button variant="outline" className="h-8 px-3" onClick={()=>setPage(page+1)}>Next</Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {Object.values(selected).some(Boolean) && (
          <div className="w-full mt-2 p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
            <span className="text-sm"><strong>{Object.values(selected).filter(Boolean).length}</strong> selected</span>
            <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
            {/* Assign Tags (popover), create new if not available */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="cursor-pointer"><Tags className="h-3.5 w-3.5 mr-2"/> Assign tags</Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80">
                <div className="text-sm font-medium mb-2">Assign Tag</div>
                <AssignTagPanel
                  available={availableTags}
                  onChoose={(tag) => {
                    const ids = Object.entries(selected).filter(([,v]) => v).map(([id]) => id);
                    onBulkAssignTags(ids, tag);
                  }}
                />
              </PopoverContent>
            </Popover>

            <div className="ml-auto"><Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=>setSelected({})}>Clear</Button></div>
          </div>
        )}
      </CardContent>

      {/* Table */}
      <CardContent className="p-0">
        <div className="max-h-[560px] overflow-auto border-t" style={{ borderColor: TK.borderLight }}>
          <Table className="text-sm">
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-white">
                {COLS.filter(c => visibleCols[c.key] !== false).map(c => (
                  <TableHead key={c.key} style={{ minWidth: c.width, width: c.width, ...stickyStyle(c) }} className="text-left">
                    {c.key === "select" ? (
                      <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                    ) : c.sortable ? (
                      <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={()=>setSort(c.key)}>
                        <HeaderTip tip={c.tip ?? ""}><span>{c.label}</span></HeaderTip>
                        {headerSortIcon(c.key)}
                      </button>
                    ) : (
                      <HeaderTip tip={c.tip ?? ""}><span>{c.label}</span></HeaderTip>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {windowRows.map(p => (
                <React.Fragment key={p.id}>
                  <TableRow className="hover:bg-[#F8FAFC]">
                    {/* select */}
                    {visibleCols.select !== false && (
                      <TableCell style={stickyStyle(COLS[0]) as any} className="text-left">
                        <Checkbox checked={!!selected[p.id]} 
                        // onCheckedChange={(v)=>setSelected(s=>({ ...s, [p.id]: Boolean(v) }))} 
                        />
                      </TableCell>
                    )}
                    {/* expander */}
                    {visibleCols.expander !== false && (
                      <TableCell style={stickyStyle(COLS[1]) as any} className="text-left">
                        <button
                          onClick={()=>setExpanded(s=>({ ...s, [p.id]: !s[p.id] }))}
                          aria-label={expanded[p.id] ? "Collapse" : "Expand"}
                          className="rounded border p-1 hover:bg-muted cursor-pointer"
                        >
                          {expanded[p.id] ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                        </button>
                      </TableCell>
                    )}
                    {/* Project name + favicon */}
                    {visibleCols.name !== false && (
                      <TableCell style={{ ...stickyStyle(COLS[2]), minWidth: 320 }} className="text-left">
                        <div className="inline-flex items-center gap-2">
                          {p.favicon ? <img src={p.favicon} alt="" className="h-4 w-4 rounded-sm" /> : <Star className="h-3.5 w-3.5 text-muted-foreground" />}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="underline text-left cursor-pointer" style={{ color: TK.action }} title={p.name} onClick={openDrawer}>
                                  {p.name}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{p.domain}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {p.pinned && <Pin className="h-3.5 w-3.5" style={{ color: TK.brand }}  />}
                        </div>
                      </TableCell>
                    )}

                    {/* Owner with avatar (uses profile image if available) */}
                    {visibleCols.owner !== false && (
                      <TableCell className="text-left">
                        <div className="inline-flex items-center gap-2">
                          <Avatar name={p.owner.name} src={p.owner.avatar} title={`Owner: ${p.owner.name}`} />
                          <span>{p.owner.name}</span>
                        </div>
                      </TableCell>
                    )}

                    {/* Role (branded icon) */}
                    {visibleCols.role !== false && (
                      <TableCell className="text-left">
                        <div className="inline-flex items-center gap-1 text-sm">
                          <Shield className="h-3.5 w-3.5"/>{p.owner.role}
                        </div>
                      </TableCell>
                    )}

                    {/* Tags */}
                    {visibleCols.tags !== false && (
                      <TableCell className="text-left">
                        <div className="flex items-center flex-wrap gap-1.5">
                          {p.tags.map((t,i)=>(
                            <span key={i} className="px-2 py-0.5 rounded-full border text-xs inline-flex items-center gap-1" style={{ borderColor: TK.borderLight }}>
                              <Tag className="h-3.5 w-3.5"/>{t}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                    )}

                    {/* KPIs */}
                    {visibleCols.seo !== false && (
                      <TableCell className="text-left">
                        <ScoreBar value={p.seoScore} label="SEO Score" />
                      </TableCell>
                    )}
                    {visibleCols.health !== false && (
                      <TableCell className="text-left">
                        <ScoreBar value={p.healthScore} label="Health Score" integerOnly />
                      </TableCell>
                    )}
                    {visibleCols.wr !== false && (
                      <TableCell className="text-left">
                        <div className="inline-flex items-center gap-2"><SmallDonut value={p.wrScore} /><span className="text-sm">{p.wrScore}</span></div>
                      </TableCell>
                    )}
                    {visibleCols.clicks !== false && (
                      <TableCell className="text-left">
                        <div className="inline-flex items-center gap-2">
                          <b>{fmt(p.clicks)}</b>
                          <span className="text-xs" style={{ color: deltaTone(p.clicksDelta) }}>
                            {p.clicksDelta >= 0 ? "▲" : "▼"} {pct(Math.abs(p.clicksDelta))}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleCols.sessions !== false && (
                      <TableCell className="text-left">
                        <div className="inline-flex items-center gap-2">
                          <b>{fmt(p.sessions)}</b>
                          <span className="text-xs" style={{ color: deltaTone(p.sessionsDelta) }}>
                            {p.sessionsDelta >= 0 ? "▲" : "▼"} {pct(Math.abs(p.sessionsDelta))}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {/* Actions (no 3-dots now) */}
                    {visibleCols.actions !== false && (
                      <TableCell className="text-left">
                        <div className="inline-flex items-center gap-1.5">
                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-[#4286F5] cursor-pointer" aria-label="Open SERP" onClick={openDrawer}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger><TooltipContent>Open SERP</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-[#4286F5] cursor-pointer" aria-label="Create Task">
                                <ClipboardList className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger><TooltipContent>Create Task</TooltipContent></Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip><TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open Project">
                                <LinkIcon className="h-4 w-4"/>
                              </Button>
                            </TooltipTrigger><TooltipContent>Open Project</TooltipContent></Tooltip>
                          </TooltipProvider>

                          {/* Assign User */}
                          <Popover>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Assign User">
                                      <UserPlus className="h-4 w-4 text-[#0EA5E9]" />
                                    </Button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Assign User</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <PopoverContent align="end" className="w-56">
                              <div className="text-sm font-medium mb-2">Assign User</div>
                              <div className="space-y-2">
                                {USERS.map(u => (
                                  <button key={u.id} className="w-full text-left rounded px-2 py-1.5 hover:bg-[#F5F8FF] cursor-pointer"
                                          onClick={() => onAssignUser(p.id, u.id)}>
                                    {u.name}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Assign Tags */}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Assign Tags">
                                <Tags className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80">
                              <div className="text-sm font-medium mb-2">Assign Tag</div>
                              <AssignTagPanel
                                available={availableTags}
                                onChoose={(tag) => {
                                  const dedup = Array.from(new Set([...(p.tags ?? []), tag]));
                                  onUpdateTags(p.id, dedup);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expansion row — single-row charts, axes with numbers, vertical separators, smart popover shows exact date + value */}
                  {expanded[p.id] && (
                    <TableRow>
                      <TableCell colSpan={visibleList.length} className="text-left">
                        <div className="p-4 rounded-md border" style={{ borderColor: TK.borderLight, background: "#FAFBFF" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium">Trends (last 30 days)</div>
                            <div className="inline-flex items-center gap-1.5">
                              <Button size="icon" variant="ghost" title="Open Analytics"><LinkIcon className="h-4 w-4"/></Button>
                              <Button size="icon" variant="ghost" title="Lock row"><Lock className="h-4 w-4"/></Button>
                            </div>
                          </div>

                          {/* single row, vertical separators */}
                          <div className="grid grid-cols-4 gap-0 divide-x" style={{ borderColor: TK.borderLight }}>
                            <div className="pr-3">
                              <MetricChart
                                title="SEO Score"
                                type="area"
                                color={TK.ok}
                                yRange={[0,100]}
                                series={p.series.map(s=>({ date: s.date, value: s.seo }))}
                                format={(n)=>`${Math.round(n)}`}
                              />
                            </div>
                            <div className="px-3">
                              <MetricChart
                                title="WR Score"
                                type="area"
                                color={TK.brand}
                                yRange={[0,100]}
                                series={p.series.map(s=>({ date: s.date, value: s.wr }))}
                                format={(n)=>`${Math.round(n)}`}
                              />
                            </div>
                            <div className="px-3">
                              <MetricChart
                                title="Clicks"
                                type="bar"
                                color={TK.action}
                                series={p.series.map(s=>({ date: s.date, value: s.clicks }))}
                                format={(n)=>fmt(n)}
                              />
                            </div>
                            <div className="pl-3">
                              <MetricChart
                                title="Sessions"
                                type="bar"
                                color={darken(TK.action, 0.15)}
                                series={p.series.map(s=>({ date: s.date, value: s.sessions }))}
                                format={(n)=>fmt(n)}
                              />
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
        </div>
      </CardContent>

      {/* Bottom pagination */}
      <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TK.borderLight }}>
        <div className="text-sm text-muted-foreground">
          Showing {projects.length === 0 ? 0 : pageStart + 1}–{Math.min(projects.length, pageStart + windowRows.length)} of {projects.length}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 px-3" onClick={()=>setPage(1)}>First</Button>
          <Button variant="outline" className="h-8 px-3" onClick={()=>setPage(Math.max(1, page-1))}>Prev</Button>
          <div className="text-sm w-16 text-center">{page}</div>
          <Button variant="outline" className="h-8 px-3" onClick={()=>setPage(page+1)}>Next</Button>
          <Select value={String(pageSize)} onValueChange={(v:any)=>{ setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-8 px-3 w-[120px]"><SelectValue placeholder="Rows / page" /></SelectTrigger>
            <SelectContent>
              {[10,25,50,100].map(n => <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};

/* ——— MATRIX VIEW (single-row KPIs + actions bottom-right, pin top-right) ——— */
const MetricPill: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs" style={{ borderColor: TK.borderLight }}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const MatrixView: React.FC<{
  projects: Project[];
  onReorder: (idsInOrder: string[]) => void;
  onTogglePin: (id: string) => void;
  onAssignUser?: (id: string, userId: string) => void;
}> = ({ projects, onReorder, onTogglePin, onAssignUser }) => {
  const [dragging, setDragging] = useState<string | null>(null);

  const onDragStart = (id: string, e: React.DragEvent) => {
    setDragging(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropOver = (overId: string, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === overId) return;
    const ids = projects.map(p => p.id);
    const from = ids.indexOf(id), to = ids.indexOf(overId);
    const next = ids.slice();
    next.splice(to, 0, next.splice(from, 1)[0]);
    onReorder(next);
    setDragging(null);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-4">
      {projects.map(p => (
        <div key={p.id}
             draggable
             onDragStart={(e)=>onDragStart(p.id, e)}
             onDragOver={e=>e.preventDefault()}
             onDrop={(e)=>onDropOver(p.id, e)}
             className={cx(
               "border rounded-lg p-4 relative",
               "transition-all duration-200 ease-out hover:shadow-sm hover:-translate-y-0.5"
             )}
             style={{ borderColor: TK.border, background: TK.cardBg }}>
          {/* Drag handle left */}
          <div className="absolute top-2 left-2 inline-flex items-center">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Pin top-right */}
          <div className="absolute top-2 right-2">
            <button className="p-1 rounded hover:bg-[#F4F6FA] cursor-pointer" onClick={() => onTogglePin(p.id)} title={p.pinned ? "Unpin" : "Pin at top"}>
              {p.pinned ? <Pin className="h-4 w-4" style={{ color: TK.brand }} /> : <PinOff className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Header line (gap so drag doesn’t overlap favicon) */}
          <div className="mb-3 flex items-center gap-2 pl-6">
            {p.favicon ? <img src={p.favicon} alt="" className="h-4 w-4 rounded-sm" /> : <Star className="h-3.5 w-3.5 text-muted-foreground" />}
            <span className="font-medium truncate" title={p.domain}>{p.name}</span>
          </div>

          {/* Single-row KPIs with labels */}
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <MetricPill label="SEO Score" value={<ScoreBar value={p.seoScore} label="SEO Score" />} />
            <MetricPill label="Health Score" value={<ScoreBar value={p.healthScore} label="Health Score" integerOnly />} />
            <MetricPill label="WR Score" value={<div className="inline-flex items-center gap-1"><SmallDonut value={p.wrScore}/><span>{p.wrScore}</span></div>} />
            <MetricPill label="Clicks" value={<span>{fmt(p.clicks)}</span>} />
            <MetricPill label="Sessions" value={<span>{fmt(p.sessions)}</span>} />
          </div>

          {/* Actions bottom-right */}
          <div className="absolute bottom-2 right-2 inline-flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open SERP">
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Open SERP</TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Create Task">
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Create Task</TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Open Project">
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger><TooltipContent>Open Project</TooltipContent></Tooltip>
            </TooltipProvider>
            {onAssignUser && (
              <Popover>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className="cursor-pointer" aria-label="Assign User">
                          <UserPlus className="h-4 w-4 text-[#0EA5E9]" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Assign User</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <PopoverContent align="end" className="w-56">
                  <div className="text-sm font-medium mb-2">Assign User</div>
                  <div className="space-y-2">
                    {USERS.map(u => (
                      <button key={u.id} className="w-full text-left rounded px-2 py-1.5 hover:bg-[#F5F8FF] cursor-pointer"
                              onClick={() => onAssignUser(p.id, u.id)}>
                        {u.name}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {dragging === p.id && (
            <div className="absolute inset-0 bg-white/30 rounded-lg border-2 border-dashed" style={{ borderColor: TK.pastelBlue }}/>
          )}
        </div>
      ))}
    </div>
  );
};

/* ——— Assign Tag small panel (reused row + bulk) ——— */
const AssignTagPanel: React.FC<{ available: string[]; onChoose: (tag: string) => void }> = ({ available, onChoose }) => {
  const [q, setQ] = useState("");
  const [list, setList] = useState(available);
  useEffect(() => setList(available), [available]);
  const canCreate = q.trim().length > 0 && !list.includes(q.trim());
  return (
    <div className="space-y-2">
      <Input placeholder="Search or create tag…" value={q} onChange={e=>setQ(e.target.value)} />
      <div className="max-h-[180px] overflow-auto border rounded" style={{ borderColor: TK.borderLight }}>
        {list.filter(t => t.toLowerCase().includes(q.toLowerCase())).map(t => (
          <button key={t} className="w-full text-left px-2 py-1.5 hover:bg-[#F5F8FF] cursor-pointer" onClick={()=>onChoose(t)}>{t}</button>
        ))}
        {canCreate && (
          <button className="w-full text-left px-2 py-1.5 hover:bg-[#F5F8FF] cursor-pointer" onClick={()=>onChoose(q.trim())}>
            + Create & assign “{q.trim()}”
          </button>
        )}
      </div>
    </div>
  );
};

/* ───────────────────────── Parent: ProjectDirectoryQuickPeek (default view = List) ───────────────────────── */
export default function ProjectDirectoryQuickPeek() {
  const [raw, setRaw] = useState<Project[]>(() => makeProjects(42));
  const [view, setView] = useState<View>("list"); // default = List
  const [q, setQ] = useState("");
  const [timeRange] = useState<"7d" | "14d" | "30d">("7d");

  // Sort & pinning
  const [sortBy, setSortBy] = useState<ColKey>("seo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const setSort = (k: ColKey) => {
    if (!COLS.find(c => c.key === k)?.sortable) return;
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir(d => (d === "asc" ? "desc" : "asc"));
  };

  // Column visibility (List)
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(
    COLS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {} as Record<ColKey, boolean>)
  );

  // Selection + pagination + expansion
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Available tags (for assign)
  const [tags, setTags] = useState<string[]>(["SEO", "Core", "Content", "Paid"]);

  const filtered = useMemo(() => {
    return raw.filter(p => {
      if (!q) return true;
      const s = q.toLowerCase();
      return p.name.toLowerCase().includes(s) || p.domain.toLowerCase().includes(s);
    });
  }, [raw, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getter = (p: Project): any => {
      switch (sortBy) {
        case "name": return p.name.toLowerCase();
        case "owner": return p.owner.name.toLowerCase();
        case "role": return p.owner.role;
        case "seo": return p.seoScore;
        case "health": return p.healthScore;
        case "wr": return p.wrScore;
        case "clicks": return p.clicks;
        case "sessions": return p.sessions;
        default: return p.seoScore;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a), bv = getter(b);
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    // Pinned at top
    const pinned = arr.filter(p => p.pinned);
    const others = arr.filter(p => !p.pinned);
    return [...pinned, ...others];
  }, [filtered, sortBy, sortDir]);

  // For Grid/Matrix DnD: update order hard
  const reorderByIds = (idsInOrder: string[]) => {
    const map = new Map(raw.map(p => [p.id, p]));
    const next = idsInOrder.map(id => map.get(id)!).filter(Boolean);
    setRaw(next);
  };

  const togglePin = (id: string) => {
    setRaw(prev => prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  };

  const assignUser = (id: string, userId: string) => {
    const user = USERS.find(u => u.id === userId)!;
    setRaw(prev => prev.map(p => p.id === id ? { ...p, owner: { ...p.owner, id: user.id, name: user.name } } : p));
  };

  const updateTags = (id: string, tagsNext: string[]) => {
    // add new tags to global list if not present
    const newOnes = tagsNext.filter(t => !tags.includes(t));
    if (newOnes.length) setTags(prev => [...prev, ...newOnes]);
    setRaw(prev => prev.map(p => p.id === id ? { ...p, tags: tagsNext } : p));
  };

  const bulkAssignTags = (ids: string[], tag: string) => {
    if (!tags.includes(tag)) setTags(prev => [...prev, tag]);
    setRaw(prev => prev.map(p => ids.includes(p.id) ? { ...p, tags: Array.from(new Set([...(p.tags ?? []), tag])) } : p));
  };

  // Export CSV
  const exportCSV = () => {
    const hdrs = ["Project","Domain","Owner","Role","Tags","SEO","Health","WR","Clicks","Sessions","Pinned"];
    const rows = sorted.map(p => [
      JSON.stringify(p.name), p.domain, JSON.stringify(p.owner.name), p.owner.role, JSON.stringify((p.tags||[]).join(";")),
      p.seoScore, p.healthScore, p.wrScore, p.clicks, p.sessions, p.pinned ? "yes" : "no"
    ].join(","));
    const csv = [hdrs.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "project-directory.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-3 mt-4">
      <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
        <SectionHeader view={view} onView={setView} onExport={exportCSV} count={sorted.length} />

        {/* Section-level search (applies to all views) */}
        <CardContent className="border-b pt-3 pb-3" style={{ borderColor: TK.borderLight }}>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-[320px] pl-7" placeholder="Search name or domain…" value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardContent>

        {/* Filters visible for Grid & Matrix as well */}
        {(view === "grid" || view === "matrix") && <ViewFilters />}

        {/* View content */}
        {view === "list" && (
          <ListView
            projects={sorted}
            availableTags={tags}
            onUpdateTags={updateTags}
            onAssignUser={assignUser}
            onTogglePin={togglePin}
            timeRange={timeRange}
            sortBy={sortBy} sortDir={sortDir} setSort={setSort}
            visibleCols={visibleCols} setVisibleCols={(u)=>setVisibleCols(u(visibleCols))}
            selected={selected} setSelected={setSelected}
            page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize}
            expanded={expanded} setExpanded={setExpanded}
            onBulkAssignTags={bulkAssignTags}
          />
        )}

        {view === "grid" && (
          <GridView
            projects={sorted}
            onReorder={reorderByIds}
            onTogglePin={togglePin}
            onAssignUser={assignUser}
          />
        )}

        {view === "matrix" && (
          <MatrixView
            projects={sorted}
            onReorder={reorderByIds}
            onTogglePin={togglePin}
            onAssignUser={assignUser}
          />
        )}
      </Card>
    </section>
  );
}

/* ───────────────────────── Lightweight tests (logic only) ───────────────────────── */
export function __tests__() {
  // Pin + reorder
  const ids = ["a","b","c","d"];
  const reordered = (function () {
    const next = ids.slice();
    next.splice(2, 0, next.splice(0, 1)[0]); // move a → index 2
    return next; // ["b","c","a","d"]
  })();

  // Delta utility
  const s = [10,12,14,16,  20,22,24,26];
  const seven = deltaPct(s, 4); // current 4 vs previous 4 -> positive

  return { reordered, sevenPositive: seven > 0 };
}
