"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown, ChevronUp, ChevronsUpDown, ClipboardList, Eye, Filter, Info, Layers,
  Link2, Save, Search, Settings2, ShoppingCart, SlidersHorizontal, TrendingDown, TrendingUp
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import DetailViewer from "../drawer/Drawer";
/* ──────────────────────────────────────────────────────────────────────────────
   Global tokens + Inter font (aligned with recent designs)
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
    :root{
      --wr-brand:#008CCD;
      --wr-brand-hover:#067AAF;
      --wr-brand-pastel:#D9EEF8;
      --wr-text:#111827;
      --wr-muted:#6B7280;
      --wr-surface:#FFFFFF;
      --wr-subtle:#F5F7FA;
      --wr-border:#E5E7EB;
      --wr-borderLight:#EFF0F6;
      --wr-success:#28C76F;
      --wr-warning:#FF9F43;
      --wr-danger:#EA5455;
      --wr-radius:12px;
    }
    .wr-font{
      font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
    }
  `}</style>
);

/* ---------- Tokens ---------- */
const TOKENS = {
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  textStrong: "var(--wr-text)",
  muted: "var(--wr-muted)",
  brand: "var(--wr-brand)",
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  critical: "var(--wr-danger)",
  appBg: "var(--wr-subtle)",
  pastelBrand: "var(--wr-brand-pastel)",
  radius: "var(--wr-radius)",
};

/* ---------- Types & mock data ---------- */
type OppType = "GP" | "LI" | "PR";
type MatchReason = "competitor" | "niche" | "trending" | "best_value";
type DeliveryPreset = "fast" | "std" | "flex";
type Currency = "USD" | "EUR";

type OpportunityRow = {
  id: string;
  domain: string;
  wrScore: number;        // 0..100
  spamScore: number;      // 0..100
  monthlyTraffic: number;
  trafficTrend: -1 | 0 | 1;
  type: OppType;
  match: MatchReason;
  priceUSD: number;
  deliveryDays: number;
  region: string;
  language: string;
  category: string;
  vefogix: boolean;       // inventory present
};

const REGIONS = ["US","UK","DE","FR","ES","IN","CA","AU","SG","NL"];
const LANGUAGES = ["EN","ES","DE","FR","HI","IT","PT","PL","NL"];
const CATEGORIES = ["Tech","Finance","Health","Travel","Lifestyle","Business","Gaming","Education","Green","Fashion"];

const numK = (n: number) => (n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : String(n));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const usdTo = (usd: number, currency: Currency) => (currency === "EUR" ? Math.round(usd * 0.92) : usd);
const priceFmt = (n: number, cur: Currency) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);
const spamBand = (s: number) => s <= 20 ? { label: "Low", color: TOKENS.success } :
                                 s <= 40 ? { label: "Med", color: TOKENS.warning } :
                                           { label: "High", color: TOKENS.critical };

function makeRows(count = 180): OpportunityRow[] {
  const rows: OpportunityRow[] = [];
  for (let i = 1; i <= count; i++) {
    const wr = Math.round(45 + Math.random() * 55);
    const spam = Math.round(Math.random() * 45);
    const traffic = Math.floor(500 + Math.random() * 150_000);
    const trend: -1 | 0 | 1 = Math.random() > 0.6 ? 1 : Math.random() > 0.5 ? -1 : 0;
    const type: OppType = Math.random() > 0.66 ? "PR" : Math.random() > 0.5 ? "LI" : "GP";
    const match: MatchReason = (["competitor","niche","trending","best_value"] as MatchReason[])[Math.floor(Math.random()*4)];
    const priceUSD = Math.round(30 + Math.random() * 400);
    const deliveryDays = Math.ceil(Math.random() * 18);
    const region = REGIONS[Math.floor(Math.random()*REGIONS.length)];
    const language = LANGUAGES[Math.floor(Math.random()*LANGUAGES.length)];
    const category = CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)];
    const vefogix = Math.random() > 0.1;
    rows.push({
      id: `o-${i}`,
      domain: `domain${i}.example.com`,
      wrScore: wr, spamScore: spam, monthlyTraffic: traffic, trafficTrend: trend,
      type, match, priceUSD, deliveryDays, region, language, category, vefogix,
    });
  }
  return rows;
}

/* ---------- Small UI pieces ---------- */
function MiniDonut({ value, size = 22, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} role="img" aria-label={`WR ${value}`} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} stroke="#E5EEF6" strokeWidth={stroke} fill="none" />
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={TOKENS.brand}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}
const TypeTag = ({ t }: { t: OppType }) => {
  const label = t === "GP" ? "Guest Post" : t === "LI" ? "Link Insertion" : "PR";
  const color = t === "GP" ? "#2563EB" : t === "LI" ? "#0EA5E9" : "#7C3AED";
  return (
    <span
      className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
      style={{ color, background: `${color}14`, border: `1px solid ${color}33` }}
    >
      {label}
    </span>
  );
};
const DeliveryBadge = ({ days }: { days: number }) => {
  const color = days <= 3 ? TOKENS.success : days <= 10 ? TOKENS.warning : TOKENS.muted;
  return (
    <span className="inline-flex items-center px-2 py-[2px] rounded text-[12px] font-medium"
      style={{ background: `${color}1A`, color, border: `1px solid ${color}26` }}>
      {days} day{days === 1 ? "" : "s"}
    </span>
  );
};
const MatchPill = ({ reason, onClick }: { reason: MatchReason; onClick?: () => void }) => {
  const map: Record<MatchReason, { label: string; color: string }> = {
    competitor: { label: "Competitor Match", color: "#3B82F6" },
    niche:      { label: "Niche Match",      color: "#8B5CF6" },
    trending:   { label: "Trending",         color: TOKENS.warning },
    best_value: { label: "Best Value",       color: TOKENS.success },
  };
  const { label, color } = map[reason];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-2 py-[2px] rounded-full border text-[12px] cursor-pointer"
      style={{ color, borderColor: `${color}55`, background: `${color}12` }}
      title="Filter by this match type"
    >
      {label}
    </button>
  );
};

/* ---------- Filter chips (modular) ---------- */
function ChipButton({
  label, active, count, className, children,
}: { label: string; active?: boolean; count?: number; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={`inline-flex items-center h-8 px-3 rounded-full border bg-white ${className || ""}`}
      style={{ borderColor: active ? TOKENS.brand : TOKENS.borderLight }}
    >
      <span className="text-sm">{label}{typeof count === "number" ? ` (${count})` : ""}</span>
      {children}
    </div>
  );
}

/* ---------- URL helpers ---------- */
const parseList = (s?: string | null) => !s ? [] : s.split(",").map(v => v.trim()).filter(Boolean);
const parseRange = (s?: string | null, maxCap = 9999999) => {
  if (!s) return [undefined, undefined] as const;
  const [a,b] = s.split("-").map(x => x.trim());
  const min = a === "*" || a === "" ? undefined : Number(a);
  const max = b === "*" || b === "" ? undefined : Number(b);
  return [isNaN(min as number)? undefined : min, isNaN(max as number)? undefined : max ?? maxCap] as const;
};
const buildRange = (min?: number, max?: number) => `${min ?? 0}-${max ?? "*"}`;

/* ---------- Component ---------- */
type Props = { projectId?: string; stickyOffsetPx?: number };

export default function OpportunityTableSection({ projectId, stickyOffsetPx = 0 }: Props) {
  /* Data & prefs */
  const [rows, setRows] = useState<OpportunityRow[]>(() => makeRows());

  type ViewMode = "table" | "grid";
const [view, setView] = useState<ViewMode>("table");
const [infinite, setInfinite] = useState<boolean>(true);
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState<number>(50);

useEffect(() => {
  if (typeof window !== "undefined") {
    setView((localStorage.getItem(`wr:view:${projectId}`) as ViewMode) || "table");
    setInfinite(localStorage.getItem(`wr:inf:${projectId}`) !== "0");
    setPageSize(Number(localStorage.getItem(`wr:ps:${projectId}`) || 50));
  }
}, [projectId]);

useEffect(() => {
  if (typeof window !== "undefined") {
    localStorage.setItem(`wr:view:${projectId}`, view);
  }
}, [view, projectId]);

useEffect(() => {
  if (typeof window !== "undefined") {
    localStorage.setItem(`wr:inf:${projectId}`, infinite ? "1" : "0");
  }
}, [infinite, projectId]);

useEffect(() => {
  if (typeof window !== "undefined") {
    localStorage.setItem(`wr:ps:${projectId}`, String(pageSize));
  }
}, [pageSize, projectId]);


  /* Sort */
  type SortKey = "domain" | "wrScore" | "spamScore" | "monthlyTraffic" | "type" | "match" | "priceUSD" | "deliveryDays";
  const [sortBy, setSortBy] = useState<SortKey>("wrScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const toggleSort = (k: SortKey) => {
    if (sortBy !== k) { setSortBy(k); setSortDir("asc"); }
    else setSortDir(d => d === "asc" ? "desc" : "asc");
  };

  /* Currency */
  const [currency, setCurrency] = useState<Currency>("USD");

  /* Filters state */
  const [typeSel, setTypeSel] = useState<Set<OppType>>(new Set(["GP","LI","PR"]));
  const [matchSel, setMatchSel] = useState<Set<MatchReason>>(new Set(["competitor","niche"]));
  const [regions, setRegions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [wrMin, setWrMin] = useState<number>(50);
  const [wrMax, setWrMax] = useState<number>(100);
  const [spamMin, setSpamMin] = useState<number>(0);
  const [spamMax, setSpamMax] = useState<number>(30);
  const [trafficMin, setTrafficMin] = useState<number>(1000);
  const [trafficMax, setTrafficMax] = useState<number | undefined>(undefined);
  const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
  const [delivery, setDelivery] = useState<Set<DeliveryPreset>>(new Set(["std","flex"]));
  const [search, setSearch] = useState("");
  const [searchLive, setSearchLive] = useState("");
  const searchTimer = useRef<number | undefined>(undefined);
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
            <aside className="absolute right-0 top-0 h-full w-[70vw] overflow-auto bg-white p-4 shadow-xl">
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
  
  const onSearchChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value;
    setSearchLive(v);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => setSearch(v), 300);
  };

  /* Advanced drawer model */
  const [adv, setAdv] = useState({
    excludeIfSpamAbove: 0,
    dofollowOnly: false,
    noSponsored: false,
    noUGC: false,
    allowCasinoAdult: false,
    deliverySLA: undefined as number | undefined,
    newThisWeek: false,
    priceDropped: false,
  });

  /* Apply, Reset */
  const [loading, setLoading] = useState(false);
  const apply = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 500);
    const params = new URLSearchParams(location.search);
    params.set("type", Array.from(typeSel).join(",").toLowerCase());
    params.set("match", Array.from(matchSel).join(","));
    params.set("wr", buildRange(wrMin, wrMax));
    params.set("spam", buildRange(spamMin, spamMax));
    params.set("traffic", buildRange(trafficMin, trafficMax));
    if (priceMin != null || priceMax != null) params.set("price", buildRange(priceMin ?? 0, priceMax));
    else params.delete("price");
    if (regions.length) params.set("geo", regions.join(",")); else params.delete("geo");
    if (languages.length) params.set("lang", languages.join(",")); else params.delete("lang");
    params.set("delivery", Array.from(delivery).join(","));
    const url = `${location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", url);
  };
  const resetFilters = () => {
    setTypeSel(new Set(["GP","LI","PR"]));
    setMatchSel(new Set(["competitor","niche"]));
    setRegions([]); setLanguages([]); setCategories([]);
    setWrMin(50); setWrMax(100); setSpamMin(0); setSpamMax(30);
    setTrafficMin(1000); setTrafficMax(undefined);
    setPriceMin(undefined); setPriceMax(undefined);
    setDelivery(new Set(["std","flex"]));
    setSearch(""); setSearchLive("");
  };

  /* Restore from URL */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // if (params.get("type")) setTypeSel(new Set(parseList(params.get("type").toUpperCase()) as OppType[]));
    if (params.get("match")) setMatchSel(new Set(parseList(params.get("match")) as MatchReason[]));
    const [wrA, wrB] = parseRange(params.get("wr"), 100);
    if (wrA != null) setWrMin(wrA);
    if (wrB != null) setWrMax(wrB);
    const [spA, spB] = parseRange(params.get("spam"), 100);
    if (spA != null) setSpamMin(spA);
    if (spB != null) setSpamMax(spB);
    const [trA, trB] = parseRange(params.get("traffic"));
    if (trA != null) setTrafficMin(trA);
    if (trB != null) setTrafficMax(trB);
    const [prA, prB] = parseRange(params.get("price"));
    if (prA != null) setPriceMin(prA);
    if (prB != null) setPriceMax(prB);
    const geo = parseList(params.get("geo")); if (geo.length) setRegions(geo);
    const lang = parseList(params.get("lang")); if (lang.length) setLanguages(lang);
    const del = parseList(params.get("delivery")) as DeliveryPreset[]; if (del.length) setDelivery(new Set(del));
  }, []);

  /* Derived filtering */
  const filtered = useMemo(() => {
    const hasFast = delivery.has("fast");
    const hasStd = delivery.has("std");
    const hasFlex = delivery.has("flex");
    const searchLower = search.trim().toLowerCase();
    return rows.filter(r => {
      if (!r.vefogix) return false;
      if (!typeSel.has(r.type)) return false;
      if (matchSel.size && !matchSel.has(r.match)) return false;
      if (!(r.wrScore >= wrMin && r.wrScore <= wrMax)) return false;
      if (!(r.spamScore >= spamMin && r.spamScore <= spamMax)) return false;
      if (!(r.monthlyTraffic >= (trafficMin || 0))) return false;
      if (trafficMax != null && !(r.monthlyTraffic <= trafficMax)) return false;
      const p = usdTo(r.priceUSD, currency);
      if (priceMin != null && p < priceMin) return false;
      if (priceMax != null && p > priceMax) return false;
      const d = r.deliveryDays;
      const inPreset = (d <= 3 && hasFast) || (d >= 4 && d <= 10 && hasStd) || ((d > 10) && hasFlex);
      if (!inPreset) return false;
      if (regions.length && !regions.includes(r.region)) return false;
      if (languages.length && !languages.includes(r.language)) return false;
      if (categories.length && !categories.includes(r.category)) return false;
      if (adv.excludeIfSpamAbove && r.spamScore > adv.excludeIfSpamAbove) return false;
      if (adv.newThisWeek) {
        const isNewish = parseInt(r.id.split("-")[1], 10) > rows.length * 0.85;
        if (!isNewish) return false;
      }
      if (searchLower && !r.domain.toLowerCase().includes(searchLower)) return false;
      return true;
    });
  }, [
    rows, typeSel, matchSel, wrMin, wrMax, spamMin, spamMax, trafficMin, trafficMax,
    priceMin, priceMax, delivery, regions, languages, categories, adv.excludeIfSpamAbove, adv.newThisWeek,
    search, currency
  ]);

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const A = a[sortBy]; const B = b[sortBy];
      if (A === B) return 0;
      if (typeof A === "string" && typeof B === "string") {
        return sortDir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
      }
      return sortDir === "asc" ? (A as any) - (B as any) : (B as any) - (A as any);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  /* Windowing */
  const [visibleCount, setVisibleCount] = useState(50);
  useEffect(() => { if (infinite) setVisibleCount(50); }, [infinite, apply]);
  useEffect(() => {
    if (!infinite) return;
    const el = document.getElementById("opp-sentinel");
    if (!el) return;
    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting) setVisibleCount(v => Math.min(sorted.length, v + 50)); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, sorted.length]);

  const windowed = useMemo(() => {
    if (infinite) return sorted.slice(0, visibleCount);
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, infinite, visibleCount, page, pageSize]);

  /* Selection */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const visibleIds = windowed.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected[id]);
  const someVisibleSelected = visibleIds.some(id => selected[id]) && !allVisibleSelected;
  const selectedIds = Object.keys(selected).filter(k => selected[k]);
  const anySelected = selectedIds.length > 0;

  /* ---------- Header & Filters (with modular chips) ---------- */
  const FilterChips = () => (
    <div className="px-4 py-3 border-t border-b" style={{ borderColor: TOKENS.borderLight, background: TOKENS.appBg }}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" color="#008CCD" />
          <span>Filters</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Use chips to quickly refine by type, match, geo, language, ranges, and delivery.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Type chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <ChipButton label="Type" active={typeSel.size !== 3} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px]">
            <div className="space-y-2">
              {(["GP","LI","PR"] as OppType[]).map(t => {
                const on = typeSel.has(t);
                return (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={on} onCheckedChange={(v) => {
                      const next = new Set(typeSel);
                      v ? next.add(t) : next.delete(t);
                      if (!next.size) next.add(t);
                      setTypeSel(next);
                    }} />
                    {t === "GP" ? "Guest Post" : t === "LI" ? "Link Insertion" : "PR"}
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setTypeSel(new Set(["GP","LI","PR"]))}>Reset</Button>
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={apply}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Match chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <ChipButton label="Match" active={!(matchSel.has("competitor") && matchSel.has("niche"))} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[260px]">
            <div className="space-y-2">
              {(["competitor","niche","trending","best_value"] as MatchReason[]).map(m => {
                const on = matchSel.has(m);
                return (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={on} onCheckedChange={(v) => {
                      const next = new Set(matchSel);
                      v ? next.add(m) : next.delete(m);
                      if (!next.size) next.add(m);
                      setMatchSel(next);
                    }} />
                    {m.replace("_"," ")}
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setMatchSel(new Set(["competitor","niche"]))}>Reset</Button>
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={apply}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Region chip */}
        <MultiSelectChip label="Region" options={REGIONS} selected={regions} onChange={setRegions} />
        {/* Language chip */}
        <MultiSelectChip label="Language" options={LANGUAGES} selected={languages} onChange={setLanguages} />
        {/* Category chip */}
        <MultiSelectChip label="Category" options={CATEGORIES} selected={categories} onChange={setCategories} extraAction={{ label: "Suggest from My Niche", onClick: () => setCategories(["Tech","Finance"]) }} />

        {/* Range chips */}
        <RangeChip label="WR" left={wrMin} right={wrMax} min={0} max={100}
          onChange={(a, b) => { setWrMin(a); setWrMax(b); }} onReset={() => { setWrMin(50); setWrMax(100); }} />
        <RangeChip label="Spam" left={spamMin} right={spamMax} min={0} max={100}
          onChange={(a, b) => { setSpamMin(a); setSpamMax(b); }} onReset={() => { setSpamMin(0); setSpamMax(30); }} />
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <ChipButton label={`Traffic ≥ ${numK(trafficMin)}${trafficMax ? `, ≤ ${numK(trafficMax)}` : ""}`} active={trafficMin !== 1000 || trafficMax != null} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[360px]">
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground w-20">Min</span>
                <Input type="number" className="h-8 w-28" value={trafficMin} onChange={e => setTrafficMin(Math.max(0, Number(e.target.value)||0))} />
                <span className="text-sm text-muted-foreground w-20">Max</span>
                <Input type="number" className="h-8 w-28" value={trafficMax ?? ""} onChange={e => setTrafficMax(e.target.value === "" ? undefined : Math.max(trafficMin, Number(e.target.value)||0))} placeholder="*" />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => { setTrafficMin(1000); setTrafficMax(undefined); }}>Reset</Button>
                <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={apply}>Apply</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <ChipButton label={`Price ${priceMin ?? 0}-${priceMax ?? "*"} ${currency}`} active={priceMin != null || priceMax != null} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[360px]">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-20">Min</span>
              <Input type="number" className="h-8 w-28" value={priceMin ?? ""} onChange={e => setPriceMin(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)||0))} placeholder="0" />
              <span className="text-sm text-muted-foreground w-20">Max</span>
              <Input type="number" className="h-8 w-28" value={priceMax ?? ""} onChange={e => setPriceMax(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)||0))} placeholder="*" />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPriceMin(undefined); setPriceMax(undefined); }}>Reset</Button>
                <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={apply}>Apply</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Delivery chip */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <ChipButton label="Delivery" active={!(delivery.has("std") && delivery.has("flex"))} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[280px]">
            <div className="space-y-2">
              {(["fast","std","flex"] as DeliveryPreset[]).map(d => (
                <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={delivery.has(d)} onCheckedChange={(v) => {
                    const next = new Set(delivery);
                    v ? next.add(d) : next.delete(d);
                    if (!next.size) next.add(d);
                    setDelivery(next);
                  }} />
                  {d === "fast" ? "Fast (1–3d)" : d === "std" ? "Std (4–10d)" : "Flexible"}
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setDelivery(new Set(["std","flex"]))}>Reset</Button>
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }} onClick={apply}>Apply</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchLive} onChange={onSearchChange} placeholder="Find a specific domain…" className="w-[260px] pl-7" />
        </div>

        {/* Controls on the right */}
        <div className="flex items-center gap-2">
          <SelectCurrency value={currency} onChange={setCurrency} />
          <Button variant="link" size="sm" className="text-sm cursor-pointer" onClick={resetFilters}>Reset</Button>

          {/* Saved views */}
          <SavedViews projectId={projectId} applyCurrent={apply}
            getState={() => ({
              typeSel: Array.from(typeSel), matchSel: Array.from(matchSel), wrMin, wrMax, spamMin, spamMax,
              trafficMin, trafficMax, priceMin, priceMax, regions, languages, categories, delivery: Array.from(delivery), adv
            })}
            setState={(p) => {
              setTypeSel(new Set(p.typeSel as OppType[]));
              setMatchSel(new Set(p.matchSel as MatchReason[]));
              setWrMin(p.wrMin ?? wrMin); setWrMax(p.wrMax ?? wrMax);
              setSpamMin(p.spamMin ?? spamMin); setSpamMax(p.spamMax ?? spamMax);
              setTrafficMin(p.trafficMin ?? trafficMin); setTrafficMax(p.trafficMax ?? trafficMax);
              setPriceMin(p.priceMin ?? priceMin); setPriceMax(p.priceMax ?? priceMax);
              setRegions(p.regions ?? regions); setLanguages(p.languages ?? languages); setCategories(p.categories ?? categories);
              setDelivery(new Set((p.delivery || Array.from(delivery)) as DeliveryPreset[]));
            }}
          />

          {/* More Filters — branded & wider drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
                <SlidersHorizontal className="h-4 w-4 mr-2" /> More Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[760px] sm:w-[860px] md:w-[920px]">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-sm font-medium">Authority & Quality</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-28 text-muted-foreground">WR min/max</span>
                    <Input type="number" className="h-8 w-20" value={wrMin} onChange={e => setWrMin(clamp(Number(e.target.value) || 0, 0, wrMax))} />
                    <Input type="number" className="h-8 w-20" value={wrMax} onChange={e => setWrMax(clamp(Number(e.target.value) || 0, wrMin, 100))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-28 text-muted-foreground">Spam max</span>
                    <Input type="number" className="h-8 w-24" value={spamMax} onChange={e => setSpamMax(clamp(Number(e.target.value) || 0, spamMin, 100))} />
                    <span className="text-sm w-32 text-muted-foreground">Exclude if &gt;</span>
                    <Input type="number" className="h-8 w-24" value={adv.excludeIfSpamAbove} onChange={e => setAdv(a => ({ ...a, excludeIfSpamAbove: clamp(Number(e.target.value)||0, 0, 100) }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Commerce & Ops</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-28 text-muted-foreground">Price min/max</span>
                    <Input type="number" className="h-8 w-24" value={priceMin ?? ""} onChange={e => setPriceMin(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)||0))} placeholder="0" />
                    <Input type="number" className="h-8 w-24" value={priceMax ?? ""} onChange={e => setPriceMax(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)||0))} placeholder="*" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm w-28 text-muted-foreground">Delivery SLA</span>
                    <Input type="number" className="h-8 w-24" value={adv.deliverySLA ?? ""} onChange={e => setAdv(a => ({ ...a, deliverySLA: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)||1) }))} placeholder="days" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">Editorial Rules</div>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={adv.dofollowOnly} onCheckedChange={v => setAdv(a => ({ ...a, dofollowOnly: Boolean(v) }))} /> Dofollow only</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={adv.noSponsored} onCheckedChange={v => setAdv(a => ({ ...a, noSponsored: Boolean(v) }))} /> No “Sponsored” attribute</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={adv.noUGC} onCheckedChange={v => setAdv(a => ({ ...a, noUGC: Boolean(v) }))} /> No “UGC” attribute</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={adv.allowCasinoAdult} onCheckedChange={v => setAdv(a => ({ ...a, allowCasinoAdult: Boolean(v) }))} /> Allow Casino/Adult?</label>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-medium">History</div>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={adv.newThisWeek} onCheckedChange={v => setAdv(a => ({ ...a, newThisWeek: Boolean(v) }))} /> New this week</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={adv.priceDropped} onCheckedChange={v => setAdv(a => ({ ...a, priceDropped: Boolean(v) }))} /> Price dropped</label>
                </div>
              </div>
              <SheetFooter className="mt-6">
                <Button variant="outline" onClick={() => {
                  setAdv({ excludeIfSpamAbove: 0, dofollowOnly: false, noSponsored: false, noUGC: false, allowCasinoAdult: false, deliverySLA: undefined, newThisWeek: false, priceDropped: false });
                }}>Reset</Button>
                <Button onClick={apply} style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button size="sm" onClick={apply} className="cursor-pointer" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  /* ---------- Columns ---------- */
  type ColKey = "select" | "domain" | "wrScore" | "spamScore" | "monthlyTraffic" | "type" | "match" | "price" | "delivery" | "actions";
  const cols: { key: ColKey; label: string; width?: number; sortable?: boolean; align?: "left"|"center"|"right" }[] = [
    { key: "select", label: "", width: 36, align: "center" },
    { key: "domain", label: "Domain", width: 300, sortable: true },
    { key: "wrScore", label: "WR Score", width: 130, sortable: true },
    { key: "spamScore", label: "Spam Score", width: 140, sortable: true },
    { key: "monthlyTraffic", label: "Monthly Traffic", width: 160, sortable: true },
    { key: "type", label: "Opportunity Type", width: 160, sortable: true },
    { key: "match", label: "Match Reason", width: 200, sortable: true },
    { key: "price", label: "Price", width: 120, sortable: true, align: "right" },
    { key: "delivery", label: "Delivery Time", width: 140, sortable: true },
    { key: "actions", label: "Actions", width: 160 },
  ];

  /* ---------- Render ---------- */
  return (
    <section className="space-y-3 wr-font mt-4 w-full px-5 py-2">
                              {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <DetailViewer   />
                    </Drawer>
                  )}
      <GlobalTokens />

      <Card className="border" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2">
              <Link2 className="h-5 w-5" color="#008CCD" aria-hidden />
              <CardTitle className="text-lg">Section 3 — Opportunity Table / Grid</CardTitle>
            </div>
            <div className="inline-flex items-center rounded border px-1 py-1" style={{ borderColor: TOKENS.borderLight, background: "#fff" }}>
              <Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")} className="h-8 px-3 cursor-pointer">Table View</Button>
              <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")} className="h-8 px-3 cursor-pointer">Grid View</Button>
            </div>
            <div className="inline-flex items-center gap-2 text-sm ml-2">
              <span className="text-muted-foreground">Infinite</span>
              <Switch checked={infinite} onCheckedChange={(v) => setInfinite(Boolean(v))} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => setRows(makeRows())}>
              <Layers className="h-4 w-4" color="#008CCD" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2 cursor-pointer" onClick={() => {
              const headers = [
                "Domain","WR Score","Spam Score","Monthly Traffic","Traffic Trend",
                "Type","Match Reason","Price","Delivery Days","Region","Language","Category"
              ];
              const rowsCsv = sorted.map(r => {
                const price = priceFmt(usdTo(r.priceUSD, currency), currency);
                const trend = r.trafficTrend === 1 ? "Up" : r.trafficTrend === -1 ? "Down" : "Flat";
                const vals = [
                  r.domain, r.wrScore, r.spamScore, r.monthlyTraffic, trend,
                  r.type, r.match, price, r.deliveryDays, r.region, r.language, r.category
                ];
                return vals.map(v => {
                  const s = String(v);
                  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                }).join(",");
              });
              const csv = [headers.join(","), ...rowsCsv].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `opportunities_${projectId}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}>
              <Save className="h-4 w-4" color="#008CCD" /> Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* Filters (modular chips) */}
        <FilterChips />

        {/* Bulk selection bar (kept minimal; inherits default surface) */}
        {anySelected && (
          <div className="px-4 py-2 border-b" style={{ borderColor: TOKENS.borderLight }}>
            <div className="inline-flex items-center gap-2 mr-2 px-2 py-1 rounded border" style={{ borderColor: TOKENS.borderLight, background: TOKENS.pastelBrand }}>
              <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
              <Button size="sm" variant="outline" className="gap-1 cursor-pointer text-[var(--wr-brand)] border-[var(--wr-brand)]">
                <ClipboardList className="h-4 w-4" /> Create Tasks
              </Button>
            </div>
          </div>
        )}

        {/* TABLE / GRID */}
        {view === "table" ? (
          <CardContent className="p-0">
            <div className="max-h-[540px] overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 rounded animate-pulse" style={{ background: "#F3F4F6" }} />
                  ))}
                </div>
              ) : (
                <Table className="text-sm">
                  <TableHeader className="sticky top-0 z-50 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                    <TableRow>
                      {cols.map(c => (
                        <TableHead key={c.key} style={{ minWidth: c.width }} className={c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : undefined}>
                          {c.key === "select" ? (
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
                                onCheckedChange={(v) => {
                                  const on = Boolean(v);
                                  const patch: Record<string, boolean> = {};
                                  visibleIds.forEach(id => { patch[id] = on; });
                                  setSelected(s => ({ ...s, ...patch }));
                                }}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : c.sortable ? (
                            <button className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort((c.key === "price" ? "priceUSD" : c.key) as SortKey)}>
                              <span>{c.label}</span>
                              {sortBy === (c.key === "price" ? "priceUSD" : c.key)
                                ? (sortDir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                                : <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />}
                            </button>
                          ) : c.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {windowed.map(r => (
                      <TableRow key={r.id} className="hover:bg-[var(--wr-subtle)]">
                        {/* select */}
                        <TableCell className="text-center">
                          <Checkbox checked={!!selected[r.id]} onCheckedChange={(v) => setSelected(s => ({ ...s, [r.id]: Boolean(v) }))} className="cursor-pointer" />
                        </TableCell>

                        {/* Domain with favicon */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.domain)}&sz=64`}
                              alt=""
                              className="w-4 h-4 rounded-sm"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                            <button className="underline text-left cursor-pointer" style={{ color: TOKENS.brand }} title={r.domain}>
                              {r.domain}
                            </button>
                          </div>
                        </TableCell>

                        {/* WR Score */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MiniDonut value={r.wrScore} />
                            <span className="font-medium">{r.wrScore}</span>
                          </div>
                        </TableCell>

                        {/* Spam Score */}
                        <TableCell>
                          <div className="inline-flex items-center gap-2">
                            <span className="text-sm">{r.spamScore}</span>
                            <span
                              className="text-[12px] px-2 py-[2px] rounded border"
                              style={{ color: spamBand(r.spamScore).color, borderColor: `${spamBand(r.spamScore).color}44`, background: `${spamBand(r.spamScore).color}12` }}
                            >
                              {spamBand(r.spamScore).label}
                            </span>
                          </div>
                        </TableCell>

                        {/* Traffic */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-medium">{numK(r.monthlyTraffic)}</span>
                            {r.trafficTrend > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> :
                             r.trafficTrend < 0 ? <TrendingDown className="h-4 w-4 text-red-600" /> :
                             <span className="text-muted-foreground text-xs">—</span>}
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell><TypeTag t={r.type} /></TableCell>

                        {/* Match */}
                        <TableCell><MatchPill reason={r.match} onClick={() => {
                          setMatchSel(new Set([r.match])); apply();
                        }} /></TableCell>

                        {/* Price (right) */}
                        <TableCell className="text-right">{priceFmt(usdTo(r.priceUSD, currency), currency)}</TableCell>

                        {/* Delivery */}
                        <TableCell><DeliveryBadge days={r.deliveryDays} /></TableCell>

                        {/* Actions (icons only; branded; full name on hover) */}
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="View Details"
                                    className="text-[var(--wr-brand)] cursor-pointer"
                                    onClick={openDrawer}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Add to Cart"
                                    className="text-[var(--wr-brand)] cursor-pointer"
                                  >
                                    <ShoppingCart className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Add to Cart</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label="Create Task"
                                    className="text-[var(--wr-brand)] cursor-pointer"
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Create Task</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!windowed.length && !loading && (
                      <TableRow>
                        <TableCell colSpan={cols.length}>
                          <div className="p-6 text-center space-y-3">
                            <div className="text-sm font-medium">No opportunities found with current filters.</div>
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setWrMin(45); setSpamMax(35); setPriceMax(undefined);
                              }}>Widen WR range</Button>
                              <Button size="sm" variant="outline" onClick={() => { setPriceMax(undefined); }}>Increase price</Button>
                              <Button size="sm" variant="outline" onClick={() => { const next = new Set<DeliveryPreset>(delivery); next.add("flex"); setDelivery(next); }}>Include Flexible</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {infinite && <div id="opp-sentinel" className="h-8" />}
            </div>
          </CardContent>
        ) : (
          /* GRID VIEW */
          <CardContent className="border-t p-4" style={{ borderColor: TOKENS.borderLight }}>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded animate-pulse" style={{ background: "#F3F4F6" }} />)}
              </div>
            ) : windowed.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {windowed.map(r => (
                  <div key={r.id} className="rounded border p-3 space-y-3 hover:shadow-sm" style={{ borderColor: TOKENS.borderLight }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.domain)}&sz=64`}
                          alt=""
                          className="w-5 h-5 rounded-sm"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="min-w-0">
                          <button className="font-medium underline text-left truncate cursor-pointer" style={{ color: TOKENS.brand }} title={r.domain}>
                            {r.domain}
                          </button>
                          <div className="text-xs text-muted-foreground">{r.region} · {r.language}</div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <MiniDonut value={r.wrScore} />
                        <span className="text-sm font-medium">{r.wrScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeTag t={r.type} />
                      <MatchPill reason={r.match} onClick={() => { setMatchSel(new Set([r.match])); apply(); }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="text-muted-foreground">Traffic</div>
                        <div className="inline-flex items-center gap-1">
                          <span className="font-medium">{numK(r.monthlyTraffic)}</span>
                          {r.trafficTrend > 0 ? <TrendingUp className="h-4 w-4" /> : r.trafficTrend < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Price</div>
                        <div className="font-medium">{priceFmt(usdTo(r.priceUSD, currency), currency)}</div>
                      </div>
                      <div className="text-sm">
                        <div className="text-muted-foreground">Delivery</div>
                        <DeliveryBadge days={r.deliveryDays} />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="View Details" className="text-[var(--wr-brand)] cursor-pointer">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">View Details</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Add to Cart" className="text-[var(--wr-brand)] cursor-pointer">
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Add to Cart</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="Create Task" className="text-[var(--wr-brand)] cursor-pointer">
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Create Task</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm">No opportunities found with current filters.</div>
            )}
          </CardContent>
        )}

        {/* Pagination (when Infinite OFF) */}
        {!infinite && (
          <div className="flex items-center justify-between p-3 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(1)} className="cursor-pointer">First</Button>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="cursor-pointer">Prev</Button>
              <div className="text-sm w-16 text-center">{page}</div>
              <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage(p => p + 1)} className="cursor-pointer">Next</Button>
              <Button variant="outline" size="sm" disabled={page * pageSize >= sorted.length} onClick={() => setPage(Math.ceil(sorted.length / pageSize))} className="cursor-pointer">Last</Button>
              <select
                className="h-8 px-2 border rounded"
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                {[25, 50, 100].map((n) => (<option key={n} value={n}>{n} / page</option>))}
              </select>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ---------- Aux components ---------- */
function SavedViews({
  projectId, getState, setState, applyCurrent
}: {
  projectId?: string;
  getState: () => any;
  setState: (payload: any) => void;
  applyCurrent: () => void;
}) {
  const [open, setOpen] = useState(false);
  type SavedView = { id: string; name: string; payload: any; isDefault?: boolean };
  const [views, setViews] = useState<SavedView[]>(() => {
    const key = `wr:views:${projectId}`;
  let raw: string | null = null;
if (typeof window !== "undefined") {
  raw = localStorage.getItem(key);
}

    if (raw) return JSON.parse(raw) as SavedView[];
    return [
      { id: "best_value", name: "Best Value", payload: { wrMin: 60, spamMax: 20, priceMax: 150, matchSel: ["competitor","niche"], typeSel: ["GP","LI","PR"], delivery: ["std","flex"] } },
      { id: "high_auth", name: "High Authority", payload: { wrMin: 80, spamMax: 25, trafficMin: 10000 } },
      { id: "pr_blitz", name: "PR Blitz (Fast)", payload: { typeSel: ["PR"], delivery: ["fast"], regions: [], languages: [], wrMin: 50, spamMax: 30 } },
    ];
  });
const persistViews = (v: SavedView[]) => {
  setViews(v);
  if (typeof window !== "undefined") {
    localStorage.setItem(`wr:views:${projectId}`, JSON.stringify(v));
  }
};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 cursor-pointer"><Save className="h-4 w-4" /> Save View</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader><DialogTitle>Saved Views</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Defaults</div>
          <div className="flex flex-wrap gap-2">
            {views.map(v => (
              <Button
                key={v.id}
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => { setState(v.payload || {}); applyCurrent(); }}
              >
                {v.name}
              </Button>
            ))}
          </div>
          <div className="border-t pt-3" style={{ borderColor: TOKENS.borderLight }}>
            <div className="text-sm font-medium mb-2">Save current filters as new view</div>
            <SaveViewForm
              onSave={(name) => {
                const payload = getState();
                const next = [...views, { id: String(Date.now()), name, payload }];
                persistViews(next);
                setOpen(false);
              }}
            />
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveViewForm({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My High‑Auth View" className="h-8" />
      <Button disabled={!name.trim()} onClick={() => onSave(name.trim())} className="cursor-pointer">Save</Button>
    </div>
  );
}

function MultiSelectChip({
  label, options, selected, onChange, extraAction
}: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
  extraAction?: { label: string; onClick: () => void }
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">
          <ChipButton label={`${label}${selected.length ? ` (${selected.length})` : ""}`} active={selected.length > 0} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px]">
        <div className="mb-2">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="h-8" />
        </div>
        <ScrollArea className="max-h-[240px] pr-2">
          <div className="space-y-1">
            {filtered.map(o => {
              const on = selected.includes(o);
              return (
                <label key={o} className={`flex items-center gap-2 text-sm px-2 py-1 rounded cursor-pointer ${on ? "bg-[var(--wr-subtle)]" : ""}`}>
                  <Checkbox checked={on} onCheckedChange={(v) => {
                    const next = new Set(selected);
                    v ? next.add(o) : next.delete(o);
                    onChange(Array.from(next));
                  }} />
                  {o}
                </label>
              );
            })}
            {!filtered.length && <div className="text-xs text-muted-foreground px-2 py-1">No results</div>}
          </div>
        </ScrollArea>
        <div className="mt-3 flex justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange([])}>Clear</Button>
            {extraAction && <Button variant="ghost" size="sm" onClick={extraAction.onClick} className="cursor-pointer">{extraAction.label}</Button>}
          </div>
          <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RangeChip({
  label, left, right, min, max, onChange, onReset
}: {
  label: string; left: number; right: number; min: number; max: number;
  onChange: (a: number, b: number) => void; onReset: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">
          <ChipButton label={`${label} ${left}–${right}`} active={left !== min || right !== max} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px]" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{label} range</span>
            <span className="text-muted-foreground">{left} – {right}</span>
          </div>
          <Slider value={[left, right]} min={min} max={max} step={1}
            onValueChange={(v) => { const [a,b] = v as [number,number]; onChange(a, b); }} />
          <div className="flex gap-2">
            <Input type="number" className="h-8 w-20" value={left} onChange={e => onChange(clamp(Number(e.target.value)||0, min, right), right)} />
            <Input type="number" className="h-8 w-20" value={right} onChange={e => onChange(left, clamp(Number(e.target.value)||0, left, max))} />
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={onReset}>Reset</Button>
              <Button size="sm" style={{ backgroundColor: TOKENS.brand, color: "#fff" }}>Apply</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SelectCurrency({ value, onChange }: { value: Currency; onChange: (v: Currency) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="cursor-pointer">
          <ChipButton label={`Currency: ${value}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[160px]">
        <div className="space-y-1">
          {(["USD","EUR"] as Currency[]).map(c => (
            <button
              key={c}
              className={`w-full text-left h-8 px-3 rounded border ${value === c ? "bg-[var(--wr-subtle)] border-[var(--wr-border)]" : "bg-white"}`}
              onClick={() => { onChange(c); setOpen(false); }}
            >
              {c}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
