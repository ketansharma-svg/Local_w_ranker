"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Globe2,
  ChevronDown,
  RefreshCcw,
  Settings,
  Download,
  Plus,
  Filter as FilterIcon,
  Search,
  CheckCircle2,
  Smartphone,
  Monitor,
  MoreVertical,
  ChevronRight,
  Copy,
  ExternalLink,
  Scale,
  Link as LinkIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Global tokens + Inter / Inter Fallback (aligned with recent designs)
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-brand-hover:#067AAF;
  --wr-text:#111827;
  --wr-body:#111827;
  --wr-muted:#6B7280;
  --wr-surface:#FFFFFF;
  --wr-subtle:#F5F7FA;
  --wr-accent:#D9EEF8;
  --wr-border:#EFF0F6;
  --wr-border-strong:#E5E7EB;
  --wr-success:#28C76F;
  --wr-warning:#FF9F43;
  --wr-danger:#EA5455;
  --wr-radius-card:16px;
  --wr-radius-chip:10px;
  --wr-shadow-sm:0 2px 6px rgba(17,24,39,.06);
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;}
`}</style>
);

/* ──────────────────────────────────────────────────────────────────────────────
   Local styles (kept small & idempotent)
────────────────────────────────────────────────────────────────────────────── */
const KeywordsHeaderStyles = () => (
  <style>{`
.kw-header{position:sticky; top:0; z-index:80; background:var(--wr-surface); border-bottom:1px solid var(--wr-border-strong);}
.kw-bar{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px;}
.kw-row1{min-height:50px;}
.kw-row2{min-height:54px; border-top:1px solid var(--wr-border); background:var(--wr-surface);}
.kw-left,.kw-right{display:flex; align-items:center; gap:10px; flex-wrap:wrap}
.kw-bc{display:flex; align-items:center; gap:6px; color:var(--wr-muted); font-size:14px}
.kw-bc b{color:var(--wr-body)}
.sep{color:#9CA3AF}

/* Page chip */
.kw-pagechip{display:inline-flex; align-items:center; gap:8px; max-width:560px; height:34px; padding:0 10px;
  border:1px solid var(--wr-border); background:#fff; border-radius:999px; cursor:pointer}
.kw-pagechip:hover{background:var(--wr-subtle)}
.kw-favicon{width:16px; height:16px; border-radius:4px; background:#F3F4F6; flex:0 0 16px}
.kw-pagechip .label{overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:420px; font-size:13px; color:var(--wr-body)}

/* Pills (chips) */
.pill{display:inline-flex; align-items:center; gap:8px; height:30px; padding:0 10px; border:1px solid var(--wr-border);
  border-radius:999px; background:#fff; font-size:12px; color:var(--wr-body); cursor:pointer}
.pill[aria-disabled="true"]{opacity:.6; cursor:not-allowed}
.pill[data-tone="ok"]{background:rgba(40,199,111,.10); border-color:rgba(40,199,111,.25); color:var(--wr-success)}
.pill[data-tone="bad"]{background:rgba(234,84,85,.10); border-color:rgba(234,84,85,.25); color:var(--wr-danger)}

/* Buttons */
.btn{height:36px; padding:0 12px; border-radius:10px; border:1px solid var(--wr-border);
  background:#fff; display:inline-flex; align-items:center; gap:8px; font-size:14px; color:var(--wr-body); cursor:pointer}
.btn:hover{background:var(--wr-subtle)}
.btn[disabled]{opacity:.6; cursor:not-allowed}
.btn-primary{background:var(--wr-brand); color:#fff; border-color:var(--wr-brand)}
.btn-primary:hover{background:var(--wr-brand-hover)}
.iconbtn{width:36px; height:36px; display:inline-grid; place-items:center; border-radius:10px; border:1px solid var(--wr-border); background:#fff; cursor:pointer}
.iconbtn:hover{background:var(--wr-subtle)}
.badge{min-width:18px; height:18px; border-radius:999px; background:var(--wr-accent); color:var(--wr-brand);
  display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; padding:0 6px}

/* Segmented control */
.seg{display:inline-flex; border:1px solid var(--wr-border); border-radius:999px; overflow:hidden}
.seg button{height:32px; padding:0 10px; font-size:13px; background:#fff; border:0; cursor:pointer; display:inline-flex; align-items:center; gap:6px}
.seg button[aria-pressed="true"]{background:var(--wr-accent); color:var(--wr-body)}

/* Menu & Select */
.menu{position:relative}
.menu-list{position:absolute; right:0; margin-top:8px; min-width:220px; background:#fff; border:1px solid var(--wr-border);
  border-radius:10px; box-shadow:var(--wr-shadow-sm); overflow:hidden; z-index:70}
.menu-item{display:flex; align-items:center; gap:8px; padding:8px 10px; font-size:13px; cursor:pointer; white-space:nowrap}
.menu-item:hover{background:#F5F7FA}
.menu-label{padding:6px 10px; font-size:11px; color:var(--wr-muted)}

.select{position:relative}
.select button{height:32px}
.select-list{position:absolute; left:0; margin-top:6px; background:#fff; border:1px solid var(--wr-border); border-radius:10px;
  box-shadow:var(--wr-shadow-sm); overflow:auto; z-index:70; min-width:220px; max-height:260px}
.select-item{display:flex; align-items:center; gap:8px; padding:8px 10px; font-size:13px; cursor:pointer}
.select-item:hover{background:#F5F7FA}
.truncate-chip{max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block}

/* Search */
.search{display:flex; align-items:center; gap:8px; height:36px; border:1px solid var(--wr-border); border-radius:10px; padding:0 10px; background:#fff}
.search input{border:0; outline:0; width:280px; font-size:14px; color:var(--wr-body); background:transparent}
.search input::placeholder{color:var(--wr-muted)}
.search .clear{opacity:.8; cursor:pointer; line-height:1}

/* Progress */
.progress{position:absolute; left:0; right:0; bottom:-1px; height:2px; overflow:hidden}
.progress .bar{position:absolute; left:-40%; width:40%; height:100%; background:var(--wr-brand); animation:kw-indet 1s linear infinite}
@keyframes kw-indet{0%{left:-40%}100%{left:140%}}

/* Responsive */
@media (max-width:1024px){ .search input{width:220px} }
@media (max-width:767px){
  .desktop-only{display:none !important}
  .wrap{flex-wrap:wrap}
  .kw-row2 .kw-left{flex:1 1 100%; order:1}
  .kw-row2 .kw-right{width:100%; justify-content:flex-end; order:2}
}

/* Focus ring */
.btn:focus-visible, .iconbtn:focus-visible, .pill:focus-visible, .seg button:focus-visible,
.kw-pagechip:focus-visible, .search input:focus-visible, .select button:focus-visible{
  outline:2px solid var(--wr-accent); outline-offset:2px;
}
`}</style>
);

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */
export type KeywordHeaderState = {
  pageId: string;
  pageUrl: string;
  lang?: string;
  canonical?: boolean;
  market: string; // "US"
  device: "desktop" | "mobile";
  engine: "google" | "bing";
  snapshotId?: string;
  filtersCount: number;
  compare: { enabled: boolean; baselineSnapshotId?: string; competitorUrl?: string };
  query: string;
  role: "viewer" | "editor" | "admin";
};
export type KeywordHeaderEvents = {
  onMarketChange: (country: string) => void;
  onDeviceChange: (d: "desktop" | "mobile") => void;
  onEngineChange: (e: "google" | "bing") => void;
  onSnapshotChange: (id: string) => void;
  onSearch: (q: string) => void;
  onOpenFilters: () => void;
  onToggleCompare: (on: boolean) => void;
  onAddKeyword: () => void;
  onExport: (fmt: "csv" | "xlsx" | "pdf") => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onGoToAnalyzerRoot?: () => void;
};

type SelectOption = { value: string; label: string; icon?: React.ReactNode; disabled?: boolean };
export type KeywordsHeaderProps = {
  state: KeywordHeaderState;
  events: KeywordHeaderEvents;
  markets: SelectOption[];
  engines: SelectOption[];
  snapshots: SelectOption[];
  loading?: boolean;
};

/* ──────────────────────────────────────────────────────────────────────────────
   Utilities
────────────────────────────────────────────────────────────────────────────── */
function useOutsideCloser<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  return ref;
}
function domainFrom(url: string) {
  try {
    const u = new URL(url);
    const path = (u.pathname + u.search + u.hash) || "/";
    return { host: u.host, path };
  } catch {
    return { host: url, path: "" };
  }
}
function useDebounced<T>(val: T, ms: number) {
  const [d, setD] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setD(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return d;
}
function persist(pageId: string, key: string, value: string | boolean) {
  try {
    localStorage.setItem(`kw:page:${pageId}:${key}`, String(value));
  } catch {}
}
function loadPersist(pageId: string, key: string): string | null {
  try {
    return localStorage.getItem(`kw:page:${pageId}:${key}`);
  } catch {
    return null;
  }
}
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
   Small primitives: Tooltip, Select, Export menu
────────────────────────────────────────────────────────────────────────────── */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <span
          className="absolute top-[110%] right-0 rounded-md border bg-white px-2 py-1 text-xs shadow"
          style={{ borderColor: "var(--wr-border)" }}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
}: {
  label?: React.ReactNode;
  value?: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideCloser<HTMLDivElement>(open, () => setOpen(false));
  const active = options.find(o => o.value === value);
  return (
    <div className="select" ref={ref}>
      <button
        className="pill"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        type="button"
      >
        {active?.icon ? <span className="shrink-0">{active.icon}</span> : null}
        <span className="truncate-chip">{active?.label ?? label ?? "Select"}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="select-list" role="listbox" aria-label={ariaLabel}>
          {options.map(o => (
            <div
              key={o.value}
              className="select-item"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                if (!o.disabled) {
                  onChange(o.value);
                  setOpen(false);
                }
              }}
            >
              {o.icon ? <span className="shrink-0">{o.icon}</span> : null}
              <span style={{ flex: 1 }} className="truncate">
                {o.label}
              </span>
              {o.value === value && <CheckCircle2 size={16} style={{ color: "var(--wr-brand)" }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExportMenu({ disabled, onPick }: { disabled?: boolean; onPick: (fmt: "csv" | "xlsx" | "pdf") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideCloser<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="menu" ref={ref}>
      <button
        className="btn"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        <Download size={16} style={{ color: "var(--wr-brand)" }} /> Export
      </button>
      {open && (
        <div className="menu-list" role="menu">
          <div className="menu-item" role="menuitem" onClick={() => (setOpen(false), onPick("csv"))}>
            CSV (keywords + metrics)
          </div>
          <div className="menu-item" role="menuitem" onClick={() => (setOpen(false), onPick("xlsx"))}>
            Excel (.xlsx)
          </div>
          <div className="menu-item" role="menuitem" onClick={() => (setOpen(false), onPick("pdf"))}>
            PDF (snapshot)
          </div>
          <div className="menu-label">filename: keywords_{`{domain}`}_{`{market}`}_{`{device}`}_{`{date}`}</div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Component
────────────────────────────────────────────────────────────────────────────── */
export function PageKeywordsHeader({
  state,
  events,
  markets,
  engines,
  snapshots,
  loading = false,
}: KeywordsHeaderProps) {
  const { host, path } = useMemo(() => domainFrom(state.pageUrl), [state.pageUrl]);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useOutsideCloser<HTMLDivElement>(showMore, () => setShowMore(false));

  // debounced search
  const [q, setQ] = useState(state.query ?? "");
  const debouncedQ = useDebounced(q, 300);
  useEffect(() => {
    if (debouncedQ !== state.query) events.onSearch(debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // hydrate persisted
  useEffect(() => {
    const m = loadPersist(state.pageId, "market");
    if (m) events.onMarketChange(m);
    const d = loadPersist(state.pageId, "device");
    if (d === "desktop" || d === "mobile") events.onDeviceChange(d);
    const e = loadPersist(state.pageId, "engine");
    if (e === "google" || e === "bing") events.onEngineChange(e);
    const c = loadPersist(state.pageId, "compare.enabled");
    if (c != null) events.onToggleCompare(c === "true");
    const b = loadPersist(state.pageId, "compare.baseline");
    if (b) events.onSnapshotChange(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAdd = state.role !== "viewer";
  const canRefresh = state.role !== "viewer";
  const canSettings = state.role !== "viewer";
  const showEngine = engines.length > 1;
  const hasSnapshot = !!state.snapshotId;

  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        events.onOpenFilters();
      }
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        const on = !state.compare.enabled;
        persist(state.pageId, "compare.enabled", on);
        events.onToggleCompare(on);
      }
      if (e.key.toLowerCase() === "r") {
        if (canRefresh) {
          e.preventDefault();
          events.onRefresh();
        }
      }
      if (e.key === "Escape") events.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [events, state.compare.enabled, state.pageId, canRefresh]);

  const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;

  return (
    <>
      <GlobalTokens />
      <KeywordsHeaderStyles />

      <header className="kw-header wr-font" role="region" aria-label="Page Keywords Analysis Header">
        {/* Row 1 — Breadcrumb + Page chip + Lang/Canonical + Close */}
        <div className="kw-bar kw-row1">
          <div className="kw-left">
            <nav className="kw-bc" aria-label="Breadcrumb">
              <button
                className="btn"
                style={{ background: "transparent", borderColor: "transparent", padding: 0 }}
                onClick={() => (events.onGoToAnalyzerRoot ? events.onGoToAnalyzerRoot() : undefined)}
                title="Back to Page Analyzer"
                type="button"
              >
                Page Analyzer
              </button>
              <span className="sep">›</span>
              <span className="inline-flex items-center gap-1.5">
                <Search size={16} style={{ color: "var(--wr-brand)" }} />
                <b>Keywords</b>
              </span>
            </nav>

            <button
              className="kw-pagechip"
              title="Open page in a new tab"
              onClick={() => window.open(state.pageUrl, "_blank")}
              aria-label="Open page"
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="kw-favicon" src={favicon} alt="" aria-hidden />
              <span className="label">{host + (path.length > 1 ? ` ${path}` : "")}</span>
              <ExternalLink size={14} style={{ color: "var(--wr-brand)" }} />
            </button>

            {state.lang && (
              <span className="pill" aria-disabled="true">
                <Globe2 size={14} style={{ color: "var(--wr-brand)" }} />
                <span className="truncate-chip">{state.lang.toUpperCase()}</span>
              </span>
            )}
            <span
              className="pill"
              data-tone={state.canonical ? "ok" : "bad"}
              title={state.canonical ? "Canonical present" : "Canonical not found"}
              aria-disabled="true"
            >
              {state.canonical ? (
                <CheckCircle2 size={14} />
              ) : (
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--wr-danger)" }} />
              )}
              <span className="truncate-chip">Canonical {state.canonical ? "OK" : "Missing"}</span>
            </span>
          </div>

          <div className="kw-right">
          </div>

          {loading && (
            <div className="progress" aria-hidden>
              <div className="bar" />
            </div>
          )}
        </div>

        {/* Row 2 — Scope controls + Actions */}
        <div className="kw-bar kw-row2 wrap">
          <div className="kw-left" style={{ minWidth: 0 }}>
            {/* Market (no emoji; branded icon) */}
            <Select
              ariaLabel="Select market"
              value={state.market}
              options={
                markets.length
                  ? markets.map(m => ({
                      ...m,
                      icon: m.icon ?? <Globe2 size={14} style={{ color: "var(--wr-brand)" }} />,
                    }))
                  : [{ value: state.market, label: state.market, icon: <Globe2 size={14} style={{ color: "var(--wr-brand)" }} /> }]
              }
              onChange={v => {
                persist(state.pageId, "market", v);
                events.onMarketChange(v);
              }}
            />

            {/* Device segmented control (branded icons) */}
            <div className="seg" role="tablist" aria-label="Device">
              <button
                role="tab"
                aria-pressed={state.device === "desktop"}
                onClick={() => {
                  persist(state.pageId, "device", "desktop");
                  events.onDeviceChange("desktop");
                }}
                type="button"
              >
                <Monitor size={16} style={{ color: "var(--wr-brand)" }} /> Desktop
              </button>
              <button
                role="tab"
                aria-pressed={state.device === "mobile"}
                onClick={() => {
                  persist(state.pageId, "device", "mobile");
                  events.onDeviceChange("mobile");
                }}
                type="button"
              >
                <Smartphone size={16} style={{ color: "var(--wr-brand)" }} /> Mobile
              </button>
            </div>

            {/* Engine (if multiple) */}
            {engines.length > 1 && (
              <Select
                ariaLabel="Select search engine"
                value={state.engine}
                options={engines.map(e => ({
                  ...e,
                  icon: e.icon ?? <Search size={14} style={{ color: "var(--wr-brand)" }} />,
                }))}
                onChange={v => {
                  persist(state.pageId, "engine", v);
                  events.onEngineChange(v as "google" | "bing");
                }}
              />
            )}

            {/* Snapshot */}
            <Select
              ariaLabel="Select snapshot"
              value={state.snapshotId}
              options={snapshots.length ? snapshots : [{ value: "", label: "No snapshot available", disabled: true }]}
              onChange={id => {
                persist(state.pageId, "snapshot", id);
                events.onSnapshotChange(id);
              }}
            />

            {/* Search */}
            <div className="search" role="search" aria-label="Search keywords on this page" style={{ flexGrow: 1 }}>
              <Search size={16} style={{ color: "var(--wr-brand)" }} />
              <input
                ref={searchRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search keywords…"
                aria-label="Search keywords on this page"
              />
              {q && (
                <span className="clear" onClick={() => setQ("")} aria-label="Clear search">
                  ×
                </span>
              )}
            </div>
          </div>

          <div className="kw-right">
            {/* Filters (modern chip-like button) */}
            <button className="btn" onClick={() => events.onOpenFilters()} aria-label={`Open filters (${state.filtersCount})`} type="button">
              <FilterIcon size={16} style={{ color: "var(--wr-brand)" }} /> Filters{" "}
              {state.filtersCount > 0 && <span className="badge">{state.filtersCount}</span>}
            </button>

            {/* Compare toggle */}
            <Tip text="Compare with past snapshot or competitor (C)">
              <button
                className="btn"
                aria-pressed={state.compare.enabled}
                onClick={() => {
                  const on = !state.compare.enabled;
                  persist(state.pageId, "compare.enabled", on);
                  events.onToggleCompare(on);
                }}
                type="button"
              >
                <Scale size={16} style={{ color: "var(--wr-brand)" }} /> Compare
                {state.compare.enabled && <span className="badge">ON</span>}
              </button>
            </Tip>

            {/* Add Keyword to Tracker (renamed per requirement) */}
            <Tip text={canAdd ? "Add a keyword to the tracker" : "Viewers cannot add keywords"}>
              <button
                className={`btn ${canAdd ? "btn-primary" : ""}`}
                disabled={!canAdd}
                onClick={() => canAdd && events.onAddKeyword()}
                type="button"
                title="Add Keyword to Tracker"
              >
                <Plus size={16} /> Add Keyword to Tracker
              </button>
            </Tip>

            {/* Export */}
            <Tip text={hasSnapshot ? "Export list (scope respected)" : "No snapshot available"}>
              <span>
                <ExportMenu disabled={!hasSnapshot} onPick={fmt => events.onExport(fmt)} />
              </span>
            </Tip>

            {/* Refresh */}
            <Tip text="Refresh data (R)">
              <button
                className="iconbtn"
                aria-label="Refresh"
                disabled={!canRefresh}
                onClick={() => canRefresh && events.onRefresh()}
                type="button"
              >
                <RefreshCcw size={18} style={{ color: "var(--wr-brand)" }} />
              </button>
            </Tip>

            {/* Settings */}
            <Tip text={canSettings ? "Module settings" : "Permission required"}>
              <button
                className="iconbtn"
                aria-label="Settings"
                disabled={!canSettings}
                onClick={() => canSettings && events.onOpenSettings()}
                type="button"
              >
                <Settings size={18} style={{ color: "var(--wr-brand)" }} />
              </button>
            </Tip>

            {/* More */}
            <div className="menu desktop-only" ref={moreRef}>
              <button className="iconbtn" aria-label="More" onClick={() => setShowMore(o => !o)} type="button">
                <MoreVertical size={18} />
              </button>
              {showMore && (
                <div className="menu-list" role="menu">
                  <div className="menu-item" role="menuitem" onClick={async () => (setShowMore(false), await copyToClipboard(state.pageUrl))}>
                    <Copy size={16} style={{ color: "var(--wr-brand)" }} /> Copy page URL
                  </div>
                  <div className="menu-item" role="menuitem" onClick={() => (setShowMore(false), window.open(state.pageUrl, "_blank"))}>
                    <LinkIcon size={16} style={{ color: "var(--wr-brand)" }} /> Open page
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compare belt */}
        {state.compare.enabled && (
          <div className="flex items-center gap-3 px-3 py-2 border-t bg-white" style={{ borderColor: "var(--wr-border)" }} role="region" aria-label="Compare belt">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--wr-muted)" }}>
                Baseline snapshot
              </span>
              <Select
                ariaLabel="Baseline snapshot"
                value={state.compare.baselineSnapshotId ?? state.snapshotId}
                options={snapshots}
                onChange={id => {
                  persist(state.pageId, "compare.baseline", id);
                  events.onSnapshotChange(id);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--wr-muted)" }}>
                Competitor (optional)
              </span>
              <input
                type="url"
                placeholder="https://competitor.com/page…"
                defaultValue={state.compare.competitorUrl ?? ""}
                className="h-8 rounded-[10px] border px-2 text-sm"
                style={{ borderColor: "var(--wr-border)", minWidth: 260 }}
                onBlur={e => persist(state.pageId, "compare.competitor", e.target.value || "")}
              />
            </div>
            <Tip text="Hide compare (C)">
              <button
                className="btn"
                onClick={() => {
                  persist(state.pageId, "compare.enabled", false);
                  events.onToggleCompare(false);
                }}
                type="button"
              >
                Hide Compare <ChevronRight size={16} />
              </button>
            </Tip>
          </div>
        )}
      </header>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Demo (remove in production)
────────────────────────────────────────────────────────────────────────────── */
export default function DemoKeywordsHeader() {
  const [state, setState] = useState<KeywordHeaderState>({
    pageId: "pg_123",
    pageUrl: "https://example.com/blog/seo-guide",
    lang: "en",
    canonical: true,
    market: "US",
    device: "desktop",
    engine: "google",
    snapshotId: "latest",
    filtersCount: 2,
    compare: { enabled: false },
    query: "",
    role: "editor",
  });

  const markets: SelectOption[] = [
    { value: "US", label: "United States (US)", icon: <Globe2 size={14} style={{ color: "var(--wr-brand)" }} /> },
    { value: "GB", label: "United Kingdom (GB)", icon: <Globe2 size={14} style={{ color: "var(--wr-brand)" }} /> },
    { value: "IN", label: "India (IN)", icon: <Globe2 size={14} style={{ color: "var(--wr-brand)" }} /> },
  ];
  const engines: SelectOption[] = [
    { value: "google", label: "Google", icon: <Search size={14} style={{ color: "var(--wr-brand)" }} /> },
    { value: "bing", label: "Bing", icon: <Search size={14} style={{ color: "var(--wr-brand)" }} /> },
  ];
  const snapshots: SelectOption[] = [
    { value: "latest", label: "Latest" },
    { value: "2025-09-13T10:22", label: "2025‑09‑13 10:22" },
    { value: "2025-09-05T09:10", label: "2025‑09‑05 09:10" },
  ];
  const [loading, setLoading] = useState(false);

  const events: KeywordHeaderEvents = {
    onMarketChange: country => setState(s => ({ ...s, market: country })),
    onDeviceChange: d => setState(s => ({ ...s, device: d })),
    onEngineChange: e => setState(s => ({ ...s, engine: e })),
    onSnapshotChange: id => setState(s => ({ ...s, snapshotId: id })),
    onSearch: q => setState(s => ({ ...s, query: q })),
    onOpenFilters: () => alert("Open Filters drawer"),
    onToggleCompare: on => setState(s => ({ ...s, compare: { ...s.compare, enabled: on } })),
    onAddKeyword: () => alert("Add Keyword to Tracker"),
    onExport: fmt => alert(`Export: ${fmt}`),
    onRefresh: async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      setLoading(false);
    },
    onOpenSettings: () => alert("Open Settings"),
    onClose: () => alert("Close drawer"),
    onGoToAnalyzerRoot: () => alert("Back to Page Analyzer root"),
  };

  return (
<>
      <PageKeywordsHeader state={state} events={events} markets={markets} engines={engines} snapshots={snapshots} loading={loading} />
</>
  );
}
