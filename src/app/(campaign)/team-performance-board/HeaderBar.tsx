"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * TeamPerformanceHeaderBar — Section 1 (Top Header)
 * Visual + interaction parity with other panels in the Wranker dashboard.
 * - Inter font only
 * - Tokens: primary #1090D0, border #E5E7EB, focus #D2EFFF
 * - 64px sticky header, z-index 30, bottom divider + stuck shadow
 */

/* ----------------------------- Design Tokens ----------------------------- */
const WDS = {
  fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial",
  primary: "#1090D0",
  primaryHover: "#0C7FBF",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  borderAlt: "#EFF0F6",
  focus: "#D2EFFF",
  bg: "#FFFFFF",
  hoverBg: "rgba(16,144,208,0.08)",
  danger: "#EA5455",
  success: "#28C76F",
  warning: "#FF9F43",
  neutral: "#9CA3AF",
};

type Preset = "today" | "last_7" | "last_30" | "this_week" | "qtd" | "custom";

export type Query = {
  members?: string[];        // user_ids
  projects?: string[];       // project_ids
  campaign_types?: string[]; // ['seo','content','technical','reporting','ads','internal']
  date_from: string;         // ISO
  date_to: string;           // ISO
  preset?: Preset;
};

type UserOption = { id: string; name: string; role: "admin"|"editor"|"viewer"; avatarColor?: string };
type ProjectOption = { id: string; name: string; group?: string };

type Props = {
  initialQuery?: Partial<Query>;
  canExport: boolean;
  canOpenSettings: boolean;
  datasetEmpty?: boolean; // disable export if true
  onQueryChange: (q: Query) => void;   // debounced
  onOpenFilters: () => void;           // opens Filters drawer (next section)
  onExport: (format: "csv" | "pdf") => void;
  onOpenSettings?: () => void;
  // Option sources (can be async in real app; kept inline for demo)
  membersOptions?: UserOption[];
  projectsOptions?: ProjectOption[];
};

const CAMPAIGN_TYPES = ["seo","content","technical","reporting","ads","internal"] as const;
const CAMPAIGN_LABEL: Record<string,string> = {
  seo:"SEO", content:"Content", technical:"Technical", reporting:"Reporting", ads:"Ads", internal:"Internal"
};
const CT_COLOR: Record<string,string> = {
  seo:"#0A84FF",
  content:"#21C08B",
  technical:"#6A76FF",
  reporting:"#FF8A65",
  ads:"#8E44AD",
  internal:"#6B7280",
};

/* ----------------------------- Small Helpers ----------------------------- */
const toISO = (d: Date) => d.toISOString().slice(0,10);
function presetToRange(preset: Preset): {from: string; to: string} {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  switch (preset) {
    case "today":
      return { from: toISO(now), to: toISO(now) };
    case "last_7":
      start.setDate(start.getDate() - 6);
      return { from: toISO(start), to: toISO(end) };
    case "last_30":
      start.setDate(start.getDate() - 29);
      return { from: toISO(start), to: toISO(end) };
    case "this_week": {
      const day = now.getDay(); // 0=Sun
      const diffFromMonday = (day + 6) % 7;
      start.setDate(start.getDate() - diffFromMonday);
      return { from: toISO(start), to: toISO(end) };
    }
    case "qtd": {
      const m = now.getMonth(); // 0..11
      const qStartMonth = [0,3,6,9][Math.floor(m/3)];
      start.setMonth(qStartMonth, 1);
      return { from: toISO(start), to: toISO(end) };
    }
    default:
      return { from: toISO(now), to: toISO(now) };
  }
}

const useDebouncedEffect = (fn: () => void, deps: any[], delay: number) => {
  useEffect(() => {
    const id = setTimeout(fn, delay);
    return () => clearTimeout(id);
  }, deps); // eslint-disable-line
};

function initials(name: string) {
  const parts = name.split(" ");
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

/* ------------------------------- UI Primitives ------------------------------- */
function Chip({
  selected, label, onClick, color,
  ariaLabel,
}: {selected?: boolean; label: string; onClick?: () => void; color?: string; ariaLabel?: string}) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      aria-label={ariaLabel || label}
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? WDS.primary : WDS.border}`,
        background: selected ? `rgba(16,144,208,.08)` : WDS.bg,
        padding: "6px 10px",
        borderRadius: 16,
        fontSize: 13,
        lineHeight: "16px",
        color: WDS.text,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        outline: "none",
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${WDS.focus}`)}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {color && (
        <span aria-hidden style={{
          width: 8, height: 8, borderRadius: 999, background: color, display: "inline-block"
        }}/>
      )}
      <span>{label}</span>
    </button>
  );
}

function IconButton({
  title, onClick, disabled, children, ariaLabel,
}: React.PropsWithChildren<{title?:string; ariaLabel?:string; onClick?:()=>void; disabled?:boolean;}>) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      disabled={disabled}
      onClick={onClick}
      style={{
        height: 36, minWidth: 36, padding: "0 10px",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: "transparent", border: `1px solid ${WDS.border}`, borderRadius: 8,
        color: disabled ? WDS.neutral : WDS.text, cursor: disabled ? "not-allowed" : "pointer"
      }}
      onMouseEnter={(e)=>!disabled&&(e.currentTarget.style.backgroundColor=WDS.hoverBg)}
      onMouseLeave={(e)=>!disabled&&(e.currentTarget.style.backgroundColor="transparent")}
      onFocus={(e)=> (e.currentTarget.style.boxShadow = `0 0 0 2px ${WDS.focus}`)}
      onBlur={(e)=> (e.currentTarget.style.boxShadow = "none")}
    >{children}</button>
  );
}

function PrimaryButton({
  label, onClick, disabled, outline, ariaLabel,
}: {label:string; ariaLabel?:string; onClick?:()=>void; disabled?:boolean; outline?:boolean;}) {
  const base = {
    height: 36, padding: "0 12px", borderRadius: 8, fontWeight: 600,
    border: `1px solid ${WDS.primary}`, cursor: disabled ? "not-allowed" : "pointer",
    color: outline ? WDS.primary : "#FFFFFF",
    background: outline ? "transparent" : WDS.primary,
  } as React.CSSProperties;
  return (
    <button
      type="button"
      aria-label={ariaLabel || label}
      disabled={disabled}
      onClick={onClick}
      style={base}
      onMouseEnter={(e)=>!disabled && (e.currentTarget.style.backgroundColor = outline ? "rgba(16,144,208,.08)" : WDS.primaryHover)}
      onMouseLeave={(e)=>!disabled && (e.currentTarget.style.backgroundColor = outline ? "transparent" : WDS.primary)}
      onFocus={(e)=> (e.currentTarget.style.boxShadow = `0 0 0 2px ${WDS.focus}`)}
      onBlur={(e)=> (e.currentTarget.style.boxShadow = "none")}
    >
      {label}
    </button>
  );
}

/* Multi-select with simple dropdown & checkboxes (keyboard accessible) */
function MultiSelect({
  label, options, value, onChange, placeholder, ariaLabel,
  itemPrefixAvatar,
}: {
  label?: string;
  options: {id:string; name:string; meta?:string}[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  itemPrefixAvatar?: (name:string)=>React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as any)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return ()=>document.removeEventListener("mousedown", onDoc);
  }, []);
  const chips = value
    .map(id => options.find(o=>o.id===id)?.name)
    .filter(Boolean) as string[];

  return (
    <div ref={ref} aria-label={ariaLabel || label} style={{ position:"relative", minWidth: 260 }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={()=>setOpen(v=>!v)}
        onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpen(v=>!v); } }}
        style={{
          height: 36, border: `1px solid ${WDS.border}`, borderRadius: 8, padding: "0 10px",
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#fff"
        }}
      >
        <span style={{fontSize:13,color:WDS.textMuted}}>{label}</span>
        <div style={{display:"flex",gap:6, flexWrap:"wrap"}}>
          {chips.length ? chips.slice(0,3).map((c)=>(
            <span key={c} style={{border:`1px solid ${WDS.border}`, borderRadius:12, padding:"2px 8px", fontSize:12}}>{c}</span>
          )) : <span style={{fontSize:13, color:WDS.textMuted}}>{placeholder || "Select…"}</span>}
          {chips.length > 3 && <span style={{fontSize:12,color:WDS.textMuted}}>+{chips.length-3}</span>}
        </div>
        <span style={{marginLeft:"auto", color: WDS.textMuted}}>▼</span>
      </div>
      {open && (
        <div role="listbox" aria-multiselectable className="dropdown"
             style={{
               position:"absolute", top: 40, left:0, zIndex: 1000,
               background:"#fff", border:`1px solid ${WDS.border}`, borderRadius:8,
               boxShadow:"0 8px 20px rgba(0,0,0,.08)", minWidth: 300, maxHeight: 280, overflow:"auto"
             }}>
          {options.map(opt=> {
            const checked = value.includes(opt.id);
            return (
              <label key={opt.id} style={{display:"flex", alignItems:"center", padding:"8px 10px", gap:8, cursor:"pointer"}}>
                <input
                  type="checkbox"
                  aria-checked={checked}
                  checked={checked}
                  onChange={(e)=>{
                    const next = new Set(value);
                    e.target.checked ? next.add(opt.id) : next.delete(opt.id);
                    onChange(Array.from(next));
                  }}
                />
                {itemPrefixAvatar?.(opt.name)}
                <span style={{fontSize:14}}>{opt.name}</span>
                {opt.meta && <span style={{marginLeft:"auto", fontSize:12, color:WDS.textMuted}}>{opt.meta}</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Campaign Type chips (multi-toggle) */
function CampaignTypeChips({
  values, onToggle,
}: {values: string[]; onToggle: (type: string)=>void}) {
  return (
    <div role="group" aria-label="Campaign type filter" style={{display:"flex", gap:8, flexWrap:"wrap"}}>
      {CAMPAIGN_TYPES.map(key => (
        <Chip
          key={key}
          selected={values.includes(key)}
          label={CAMPAIGN_LABEL[key]}
          color={CT_COLOR[key]}
          ariaLabel={`Campaign type ${CAMPAIGN_LABEL[key]}`}
          onClick={()=>onToggle(key)}
        />
      ))}
    </div>
  );
}

/* Time Range: presets + custom */
function TimeRange({
  value, onChange,
}: {value: {from:string; to:string; preset: Preset}; onChange:(v:{from:string; to:string; preset: Preset})=>void}) {
  const [open, setOpen] = useState(false);
  const presets: {key: Preset; label: string}[] = [
    {key:"today", label:"Today"},
    {key:"this_week", label:"This Week"},
    {key:"last_7", label:"Last 7"},
    {key:"last_30", label:"Last 30"},
    {key:"qtd", label:"Quarter‑to‑date"},
    {key:"custom", label:"Custom"},
  ];
  const ref = useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as any)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return ()=>document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{position:"relative", minWidth: 220}}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Time range"
        aria-expanded={open}
        onClick={()=>setOpen(v=>!v)}
        onKeyDown={(e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); setOpen(v=>!v); } }}
        style={{
          height: 36, border:`1px solid ${WDS.border}`, borderRadius:8, padding:"0 10px",
          display:"flex", alignItems:"center", gap:8, cursor:"pointer", background:"#fff"
        }}>
        <span style={{fontSize:13,color:WDS.textMuted}}>Time</span>
        <span style={{fontSize:13}}>
          {value.preset !== "custom"
            ? presets.find(p=>p.key===value.preset)?.label
            : `${value.from} → ${value.to}`}
        </span>
        <span style={{marginLeft:"auto", color:WDS.textMuted}}>▼</span>
      </div>
      {open && (
        <div style={{
          position:"absolute", top:40, left:0, zIndex:1000,
          background:"#fff", border:`1px solid ${WDS.border}`, borderRadius:8,
          boxShadow:"0 8px 20px rgba(0,0,0,.08)", width: 320, padding:8
        }}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
            {presets.map(p => (
              <button key={p.key} type="button"
                onClick={()=>{
                  if (p.key==="custom") return; // custom handled below
                  const {from,to} = presetToRange(p.key);
                  onChange({from,to,preset:p.key});
                  setOpen(false);
                }}
                style={{
                  border:`1px solid ${value.preset===p.key?WDS.primary:WDS.border}`,
                  background: value.preset===p.key ? "rgba(16,144,208,.08)" : "#fff",
                  borderRadius:8, padding:"8px 10px", textAlign:"left", fontSize:13, cursor:"pointer"
                }}
              >{p.label}</button>
            ))}
          </div>
          <div style={{marginTop:8, paddingTop:8, borderTop:`1px solid ${WDS.border}`}}>
            <div style={{fontSize:12, color:WDS.textMuted, marginBottom:6}}>Custom range</div>
            <div style={{display:"flex", gap:8}}>
              <input
                type="date" value={value.from}
                onChange={(e)=>onChange({from:e.target.value, to:value.to, preset:"custom"})}
                style={{border:`1px solid ${WDS.border}`, borderRadius:8, padding:"6px 8px"}}
              />
              <input
                type="date" value={value.to}
                onChange={(e)=>onChange({from:value.from, to:e.target.value, preset:"custom"})}
                style={{border:`1px solid ${WDS.border}`, borderRadius:8, padding:"6px 8px"}}
              />
              <PrimaryButton outline label="Apply"
                onClick={()=>setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Avatar circle from name */
function Avatar({name, size=20, color="#1090D0"}:{name:string; size?:number; color?:string}) {
  return (
    <div aria-hidden style={{
      width:size,height:size,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",
      backgroundColor: color, color:"#fff", fontSize: size*0.45, fontWeight:700
    }}>{initials(name).toUpperCase()}</div>
  );
}

/* ----------------------- Header Component (exported) ----------------------- */
export function TeamPerformanceHeaderBar({
  initialQuery,
  canExport,
  canOpenSettings,
  datasetEmpty,
  onQueryChange,
  onOpenFilters,
  onExport,
  onOpenSettings,
  membersOptions,
  projectsOptions,
}: Props) {
  // Demo options (fallback if not provided)
  const memberOpts = useMemo<UserOption[]>(()=> membersOptions ?? [
    {id:"u1", name:"Maya Sharma", role:"editor", avatarColor:"#6A76FF"},
    {id:"u2", name:"John Carter", role:"editor", avatarColor:"#1090D0"},
    {id:"u3", name:"Richa Gupta", role:"admin", avatarColor:"#21C08B"},
    {id:"u4", name:"Alex Kim", role:"viewer", avatarColor:"#FF8A65"},
  ], [membersOptions]);

  const projectOpts = useMemo<ProjectOption[]>(()=> projectsOptions ?? [
    {id:"p1", name:"ABC Website", group:"Client A"},
    {id:"p2", name:"Content Hub", group:"Client A"},
    {id:"p3", name:"ShopNow Storefront", group:"Internal"},
  ], [projectsOptions]);

  // Query state with defaults
  const defaults = presetToRange("last_30");
  const [query, setQuery] = useState<Query>({
    members: [],
    projects: [],
    campaign_types: [],
    date_from: initialQuery?.date_from || defaults.from,
    date_to: initialQuery?.date_to || defaults.to,
    preset: (initialQuery?.preset as Preset) || "last_30",
  });

  // sticky header shadow
  const headerRef = useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const el = headerRef.current!;
    const onScroll = ()=> {
      const stuck = window.scrollY > 2;
      el.classList.toggle("is-stuck", stuck);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, {passive:true});
    return ()=>window.removeEventListener("scroll", onScroll);
  }, []);

  // persistence
  useEffect(()=>{
    const key = "wrk.tpb.header.query";
    // load on mount (only once if initialQuery is minimal)
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Query;
        setQuery(parsed);
      } catch { /* ignore */ }
    }
  }, []);
  useEffect(()=>{
    sessionStorage.setItem("wrk.tpb.header.query", JSON.stringify(query));
  }, [query]);

  // debounce outward change
  useDebouncedEffect(()=> onQueryChange(query), [query], 400);

  const activeFiltersCount =
    (query.members?.length || 0) +
    (query.projects?.length || 0) +
    (query.campaign_types?.length || 0) +
    (query.preset !== "last_30" ? 1 : 0);

  return (
    <>
      {/* Inter font */}
      <style>{`
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 100 900;
          font-display: swap;
          src: local('Inter'), url('https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr0xQp.woff2') format('woff2');
        }
        .tpb-header {
          position: sticky; top: 0; z-index: 30;
          background: ${WDS.bg}; border-bottom: 1px solid ${WDS.border};
          font-family: ${WDS.fontFamily};
        }
        .tpb-header.is-stuck { box-shadow: 0 2px 8px rgba(0,0,0,.06); }
      `}</style>

      <header
        ref={headerRef}
        role="region"
        aria-label="Team Performance header"
        className="tpb-header"
      >
        <div style={{ margin:"0 auto", padding:"12px 20px"}}>
          {/* Row 1: Title + tools cluster */}
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <span aria-hidden style={{fontSize:20}}>📊</span>
              <h1 id="tpb-title" style={{margin:0, fontSize:24, fontWeight:700, color:"#000"}}>Team Performance Board</h1>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:8}}>
              <IconButton
                title={`Filters${activeFiltersCount ? ` (${activeFiltersCount})` : ""}`}
                ariaLabel="Open filters"
                onClick={onOpenFilters}
              >
                <span aria-hidden>🔁</span>
                <span style={{fontSize:14}}>Filters{activeFiltersCount ? ` (${activeFiltersCount})` : ""}</span>
              </IconButton>

              <PrimaryButton
                label="Export"
                ariaLabel="Export report"
                onClick={()=>!datasetEmpty && onExport("csv")}
                outline
                disabled={!canExport || !!datasetEmpty}
              />
              {canOpenSettings && (
                <IconButton title="Settings" ariaLabel="Open settings" onClick={onOpenSettings}>
                  <span aria-hidden>⚙️</span>
                </IconButton>
              )}
            </div>
          </div>

          {/* Row 2: Filters cluster */}
          <div style={{display:"flex", alignItems:"center", flexWrap:"wrap", gap:12, marginTop:12}}>
            <MultiSelect
              label="Team"
              options={memberOpts.map(u=>({id:u.id, name:u.name, meta:u.role.toUpperCase()}))}
              value={query.members || []}
              onChange={(ids)=> setQuery(q=>({...q, members: ids}))}
              placeholder="Select team members"
              itemPrefixAvatar={(name)=> <Avatar name={name} size={18} color={(memberOpts.find(m=>m.name===name)?.avatarColor)||WDS.primary} />}
            />
            <MultiSelect
              label="Projects"
              options={projectOpts.map(p=>({id:p.id, name:p.name, meta:p.group}))}
              value={query.projects || []}
              onChange={(ids)=> setQuery(q=>({...q, projects: ids}))}
              placeholder="Select projects"
            />
            <CampaignTypeChips
              values={query.campaign_types || []}
              onToggle={(type)=>{
                setQuery(q=>{
                  const set = new Set(q.campaign_types || []);
                  set.has(type) ? set.delete(type) : set.add(type);
                  return {...q, campaign_types: Array.from(set)};
                });
              }}
            />
            <TimeRange
              value={{ from: query.date_from, to: query.date_to, preset: (query.preset||"last_30") as Preset }}
              onChange={(v)=> setQuery(q=>({...q, date_from:v.from, date_to:v.to, preset:v.preset}))}
            />
          </div>
        </div>
      </header>
    </>
  );
}

/* ------------------------------- Demo usage ------------------------------- */
// Example: mount in your Team Performance Board page
export default function DemoTeamPerformanceHeader() {
  const [lastQuery, setLastQuery] = useState<any>({
    members: [], projects: [], campaign_types: [],
    ...presetToRange("last_30"), preset: "last_30",
  });

  return (
    <div style={{fontFamily: WDS.fontFamily}}>
      <TeamPerformanceHeaderBar
        initialQuery={lastQuery}
        canExport={true}
        canOpenSettings={true}
        datasetEmpty={false}
        onQueryChange={(q)=> setLastQuery(q)}
        onOpenFilters={()=> alert("Open Filters Drawer (will be provided in next section).")}
        onExport={(fmt)=> alert(`Export ${fmt} with current filters`) }
        onOpenSettings={()=> alert("Open Settings Panel")}
      />

    </div>
  );
}


