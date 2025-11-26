import { X, ExternalLink, ChevronDown, ChevronUp, Filter, RefreshCw, FileDown, Globe, Link2, ClipboardList } from "lucide-react";
import {useState, useEffect, useRef, useMemo} from "react";
// Optional PDF export (fallback provided if not available)


/**
 * Wranker – Link Analyzer → Anchors Tab
 * Target URL Mini Drawer (responsive, full-width)
 * Latest updates:
 *  - Added filter chips for Anchor Frequency & AQS (range chips)
 *  - Fixed Export dropdown (toggle + outside-click to close)
 *  - Added "Create Task" icon to Actions column (with hover title)
 *  - Added client-side pagination + page size: 10 / 25 / 50 / 100
 */

// --- Tokens ---------------------------------------------------------------
const WR_COLORS = {
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  text: "#111827",
  muted: "#6B7280",
  valueBlue: "#0077FF",
  success: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
};

function classNames(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}
function formatDisplayUrl(url: string) {
  try {
    if (url.startsWith("http")) {
      const u = new URL(url);
      const path = u.pathname.length > 1 ? u.pathname : "";
      return `${u.hostname}${path}`;
    }
    return url;
  } catch { return url; }
}
function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}
function aqsTone(aqs: number) {
  if (aqs >= 75) return WR_COLORS.success;
  if (aqs >= 50) return WR_COLORS.warning;
  return WR_COLORS.critical;
}

// --- Mock API -------------------------------------------------------------
const MOCK_DATA = {
  anchorId: "a-123",
  anchorText: "seo tools",
  totalCount: 28,
  targets: [
    { url: "/seo-guide", anchorFrequency: 12, aqs: 68, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-20T10:12:00Z", sourcePages: 7, aqsBreakdown: { generic: 20, diversity: 55, placement: 25 } },
    { url: "/seo-tools", anchorFrequency: 9, aqs: 78, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-22T08:01:00Z", sourcePages: 5, aqsBreakdown: { generic: 10, diversity: 70, placement: 20 } },
    { url: "/keyword-analyzer", anchorFrequency: 5, aqs: 52, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-19T12:25:00Z", sourcePages: 4, aqsBreakdown: { generic: 30, diversity: 45, placement: 25 } },
    { url: "/learn/anchor-text", anchorFrequency: 4, aqs: 41, linkType: "internal", rel: "nofollow", lastUsed: "2025-08-18T14:42:00Z", sourcePages: 3, aqsBreakdown: { generic: 45, diversity: 35, placement: 20 } },
    { url: "https://external-partner.com/blog/seo-stack", anchorFrequency: 3, aqs: 45, linkType: "external", rel: "nofollow", lastUsed: "2025-08-18T14:42:00Z", sourcePages: 3, aqsBreakdown: { generic: 40, diversity: 40, placement: 20 } },
    { url: "https://marketing.io/tools", anchorFrequency: 2, aqs: 62, linkType: "external", rel: "sponsored", lastUsed: "2025-08-12T10:00:00Z", sourcePages: 2, aqsBreakdown: { generic: 20, diversity: 60, placement: 20 } },
    { url: "/academy/seo-course", anchorFrequency: 2, aqs: 81, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-10T10:00:00Z", sourcePages: 2, aqsBreakdown: { generic: 10, diversity: 75, placement: 15 } },
    { url: "/tools/free", anchorFrequency: 1, aqs: 38, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-09T09:11:00Z", sourcePages: 1, aqsBreakdown: { generic: 55, diversity: 25, placement: 20 } },
    // add a few more to demonstrate pagination
    { url: "/tools/optimizer", anchorFrequency: 7, aqs: 73, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-21T12:25:00Z", sourcePages: 3, aqsBreakdown: { generic: 20, diversity: 50, placement: 30 } },
    { url: "/blog/how-to-seo", anchorFrequency: 6, aqs: 66, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-15T11:20:00Z", sourcePages: 3, aqsBreakdown: { generic: 25, diversity: 50, placement: 25 } },
    { url: "/docs/api", anchorFrequency: 11, aqs: 58, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-14T09:10:00Z", sourcePages: 6, aqsBreakdown: { generic: 30, diversity: 45, placement: 25 } },
    { url: "/pricing", anchorFrequency: 8, aqs: 72, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-13T17:00:00Z", sourcePages: 5, aqsBreakdown: { generic: 20, diversity: 50, placement: 30 } },
    { url: "/partners", anchorFrequency: 3, aqs: 49, linkType: "internal", rel: "nofollow", lastUsed: "2025-08-11T08:40:00Z", sourcePages: 2, aqsBreakdown: { generic: 40, diversity: 40, placement: 20 } },
    { url: "https://example.com/guide", anchorFrequency: 2, aqs: 35, linkType: "external", rel: "nofollow", lastUsed: "2025-08-05T08:40:00Z", sourcePages: 1, aqsBreakdown: { generic: 60, diversity: 25, placement: 15 } },
    { url: "/case-studies/saas", anchorFrequency: 4, aqs: 83, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-07T08:40:00Z", sourcePages: 2, aqsBreakdown: { generic: 10, diversity: 70, placement: 20 } },
    { url: "/academy/advanced", anchorFrequency: 1, aqs: 90, linkType: "internal", rel: "dofollow", lastUsed: "2025-08-06T08:40:00Z", sourcePages: 1, aqsBreakdown: { generic: 5, diversity: 80, placement: 15 } },
  ],
};

type LinkType = "all" | "internal" | "external";
type RelFilters = { dofollow: boolean; nofollow: boolean; sponsored: boolean };

type FreqFilter = "all" | "1-3" | "4-10" | ">10";

type AqsFilter = "all" | "high" | "medium" | "low"; // high>=75, medium 50-74, low<50

function useAnchorTargets(anchorId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<typeof MOCK_DATA | null>(null);
  const fetchData = async () => {
    setLoading(true); setError(null);
    try { await new Promise((r) => setTimeout(r, 350)); setData(MOCK_DATA); }
    catch { setError("Failed to load targets"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (anchorId) fetchData(); }, [anchorId]);
  return { loading, error, data, refetch: fetchData };
}

// --- Drawer ---------------------------------------------------------------
interface DrawerProps { isOpen: boolean; onClose: () => void; anchorId: string; anchorText: string; }

function TargetUrlMiniDrawer({ isOpen, onClose, anchorId, anchorText }: DrawerProps) {
  const { loading, error, data, refetch } = useAnchorTargets(anchorId);
  const [linkType, setLinkType] = useState<LinkType>("all");
  const [rel, setRel] = useState<RelFilters>({ dofollow: true, nofollow: true, sponsored: true });
  const [freqFilter, setFreqFilter] = useState<FreqFilter>("all");
  const [aqsFilter, setAqsFilter] = useState<AqsFilter>("all");
  const [sortKey, setSortKey] = useState<"frequency" | "aqs" | "date">("frequency");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ESC close + focus
  useEffect(() => { function onKey(e: KeyboardEvent){ if(e.key==='Escape') { if (exportOpen) setExportOpen(false); else onClose(); } }
    if(isOpen) document.addEventListener('keydown', onKey);
    return ()=> document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, exportOpen]);
  useEffect(() => { if (isOpen && panelRef.current) panelRef.current.focus(); }, [isOpen]);

  // Close export on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent){
      if (!exportRef.current) return;
      if (exportOpen && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return ()=> document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  const filteredSorted = useMemo(() => {
    const rows = data?.targets ?? [];
    const relActive = Object.entries(rel).filter(([,v])=>v).map(([k])=>k);

    let out = rows.filter(r => (linkType==='all' ? true : r.linkType===linkType) && relActive.includes(r.rel));

    // Frequency filter
    out = out.filter((r)=>{
      if (freqFilter==='all') return true;
      if (freqFilter==='1-3') return r.anchorFrequency >=1 && r.anchorFrequency <=3;
      if (freqFilter==='4-10') return r.anchorFrequency >=4 && r.anchorFrequency <=10;
      return r.anchorFrequency > 10; // ">10"
    });

    // AQS filter
    out = out.filter((r)=>{
      if (aqsFilter==='all') return true;
      if (aqsFilter==='high') return r.aqs >= 75;
      if (aqsFilter==='medium') return r.aqs >= 50 && r.aqs <= 74;
      return r.aqs < 50;
    });

    // Sort
    out = out.sort((a,b)=>{
      let A=0,B=0; if (sortKey==='frequency'){A=a.anchorFrequency;B=b.anchorFrequency;} else if (sortKey==='aqs'){A=a.aqs;B=b.aqs;} else {A=new Date(a.lastUsed).getTime();B=new Date(b.lastUsed).getTime();}
      return sortDir==='asc'? A-B : B-A;
    });

    return out;
  }, [data, linkType, rel, sortDir, sortKey, freqFilter, aqsFilter]);

  const totalFiltered = filteredSorted.length;
  const totalCount = data?.totalCount ?? 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const pageRows = filteredSorted.slice(startIdx, startIdx + pageSize);

  useEffect(()=>{ setPage(1); }, [linkType, rel, sortKey, sortDir, freqFilter, aqsFilter, pageSize]);

  function toggleRel(key: keyof RelFilters){ setRel(p=>({...p,[key]:!p[key]})); }
 const [jsPDFRef, setJsPDFRef] = useState<any>(null);
  // Exports
  function exportCSV(){
    const rows = filteredSorted.map(r=>({url:r.url, anchorFrequency:r.anchorFrequency, aqs:r.aqs, linkType:r.linkType, rel:r.rel, lastUsed:r.lastUsed}));
    const headers = ["Target URL","Frequency","AQS","Link Type","Rel","Last Used"];
    const csv = [headers.join(','), ...rows.map(r=>[`"${r.url.replaceAll('"','""')}"`, r.anchorFrequency, `${r.aqs}%`, r.linkType, r.rel, new Date(r.lastUsed).toISOString()].join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`anchor_targets_${anchorId}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  function exportPDF(){
    if(!jsPDFRef){ const w=window.open('', '_blank'); if(!w) return; w.document.write(`<h3>Anchor: ${anchorText} (showing ${totalFiltered}/${totalCount})</h3>`);
      w.document.write(`<table border=\"1\" cellspacing=\"0\" cellpadding=\"6\"><tr><th>Target URL</th><th>Freq</th><th>AQS</th><th>Type</th><th>Rel</th><th>Last Used</th></tr>`);
      for(const r of filteredSorted){ w.document.write(`<tr><td>${r.url}</td><td>${r.anchorFrequency}</td><td>${r.aqs}%</td><td>${r.linkType}</td><td>${r.rel}</td><td>${formatDate(r.lastUsed)}</td></tr>`);} w.document.write(`</table>`); w.print(); return; }
    const doc = new jsPDFRef.jsPDF({orientation:'p', unit:'pt', format:'a4'});
    doc.setFontSize(14); doc.text(`Anchor: ${anchorText} (showing ${totalFiltered}/${totalCount})`,40,40);
    let y=70; doc.setFontSize(11);
    doc.text("Target URL",40,y); doc.text("Freq",220,y); doc.text("AQS",260,y); doc.text("Type",300,y); doc.text("Rel",360,y); doc.text("Last Used",420,y);
    y+=12; doc.setLineWidth(0.5); doc.line(40,y,550,y); y+=14;
    filteredSorted.forEach(r=>{ const url = formatDisplayUrl(r.url); doc.text(String(url).slice(0,40),40,y); doc.text(String(r.anchorFrequency),220,y); doc.text(String(r.aqs)+"%",260,y); doc.text(String(r.linkType),300,y); doc.text(String(r.rel),360,y); doc.text(formatDate(r.lastUsed),420,y); y+=18; if(y>760){doc.addPage(); y=40;} });
    doc.save(`anchor_targets_${anchorId}.pdf`);
  }

  function openPageDrawer(url: string){ alert(`Open Page Drawer for: ${url}`); }

  // Sorting via column headers
  function toggleSort(newKey: "frequency" | "aqs" | "date"){
    if (sortKey === newKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(newKey);
      setSortDir('desc');
    }
  }

  function SortIcon({active, dir}:{active:boolean; dir:'asc'|'desc'}){
    if (!active) return <span className="ml-1 text-gray-300">↕</span>;
    return dir==='asc' ? <ChevronUp className="ml-1 h-3.5 w-3.5 text-gray-700"/> : <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-700"/>;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel (full width) */}
      <div ref={panelRef} tabIndex={-1} className="absolute right-0 top-0 flex h-full flex-col bg-white shadow-xl outline-none" style={{ boxShadow: "-8px 0 24px rgba(0,0,0,0.08)" }} onClick={(e)=>e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="drawer-title" className="font-semibold text-[18px]" style={{ color: WR_COLORS.text }}>Target Pages: “{anchorText}”</h2>
              <p className="text-sm" style={{ color: WR_COLORS.muted }}>All destination URLs linked with this anchor</p>
              <div className="mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium" style={{ background: WR_COLORS.chipBg, color: WR_COLORS.valueBlue }}>
                {totalCount} Target Pages{totalFiltered!==totalCount && (<span className="ml-1 text-[11px]" style={{ color: WR_COLORS.muted }}>• showing {totalFiltered}</span>)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Export in header */}
              <div ref={exportRef} className="relative">
                <button onClick={()=> setExportOpen(o=>!o)} className="mr-16 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50" style={{ borderColor: WR_COLORS.borderLight }} title="Export Target Pages">
                  <FileDown className="h-4 w-4" /> Export
                </button>
                {exportOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-md border bg-white shadow" style={{ borderColor: WR_COLORS.borderLight }}>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={()=>{ setExportOpen(false); exportCSV(); }}>CSV</button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={()=>{ setExportOpen(false); exportPDF(); }}>PDF</button>
                  </div>
                )}
              </div>
              {/* <button aria-label="Close" onClick={onClose} className="rounded p-1 transition-colors hover:bg-gray-100" title="Close"><X className="h-5 w-5"/></button> */}
            </div>
          </div>
        </div>
        <div className="mt-3 border-b" style={{ borderColor: WR_COLORS.borderLight }} />

        {/* Toolbar (filters only) */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500"><Filter className="h-3.5 w-3.5"/> Filters</span>
          {/* Link Type */}
          <div className="ml-2 inline-flex overflow-hidden rounded-md border" style={{ borderColor: WR_COLORS.borderLight }}>
            {[{k:'all',label:'All'},{k:'internal',label:'Internal'},{k:'external',label:'External'}].map(opt=> (
              <button key={opt.k as string} onClick={()=>setLinkType(opt.k as LinkType)} onKeyDown={(e)=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); setLinkType(opt.k as LinkType);} }}
                className={classNames("px-3 py-1.5 text-sm outline-none", linkType===opt.k?"bg-[#D9EEF8] text-[#0077FF]":"bg-white text-gray-700 hover:bg-gray-50")} aria-pressed={linkType===opt.k}>{opt.label}</button>
            ))}
          </div>
          {/* Rel chips */}
          <div className="ml-1 flex items-center gap-1">
            {(['dofollow','nofollow','sponsored'] as const).map(k=> (
              <button key={k} onClick={()=>toggleRel(k)} onKeyDown={(e)=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggleRel(k);} }}
                className={classNames("rounded-full border px-3 py-1 text-sm", (rel as any)[k] ? "bg-[#F5F7FA] text-gray-800" : "bg-white text-gray-400")} style={{ borderColor: WR_COLORS.borderLight }} aria-pressed={(rel as any)[k]}>
                {k==='dofollow'?'DoFollow':k==='nofollow'?'NoFollow':'Sponsored'}
              </button>
            ))}
          </div>
          {/* Frequency filter chips */}
          <div className="ml-1 flex items-center gap-1">
            {[{k:'all', l:'Freq: All'}, {k:'1-3', l:'1–3'}, {k:'4-10', l:'4–10'}, {k:'>10', l:'>10'}].map(opt => (
              <button key={opt.k} onClick={()=> setFreqFilter(opt.k as FreqFilter)} className={classNames("rounded-full border px-3 py-1 text-sm", freqFilter===opt.k ? "bg-[#F5F7FA] text-gray-800" : "bg-white text-gray-400")} style={{ borderColor: WR_COLORS.borderLight }} aria-pressed={freqFilter===opt.k}>{opt.l}</button>
            ))}
          </div>
          {/* AQS filter chips */}
          <div className="ml-1 flex items-center gap-1">
            {[{k:'all', l:'AQS: All'}, {k:'high', l:'High ≥75'}, {k:'medium', l:'50–74'}, {k:'low', l:'<50'}].map(opt => (
              <button key={opt.k} onClick={()=> setAqsFilter(opt.k as AqsFilter)} className={classNames("rounded-full border px-3 py-1 text-sm", aqsFilter===opt.k ? "bg-[#F5F7FA] text-gray-800" : "bg-white text-gray-400")} style={{ borderColor: WR_COLORS.borderLight }} aria-pressed={aqsFilter===opt.k}>{opt.l}</button>
            ))}
          </div>

          {/* Refresh */}
          <div className="ml-auto">
            <button onClick={refetch} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm hover:bg-gray-50" style={{ borderColor: WR_COLORS.borderLight }} title="Refresh">
              <RefreshCw className={classNames("h-4 w-4", loading && "animate-spin")} /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-2 pb-2">
          <div className="overflow-hidden rounded-md border" style={{ borderColor: WR_COLORS.borderLight }}>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="w-[40%] sm:w-[38%] md:w-[34%] lg:w-[30%] px-3 py-2 font-medium">
                    <button className="inline-flex items-center" onClick={()=>{}} title="Target URL" disabled>
                      Target URL
                    </button>
                  </th>
                  <th className="hidden sm:table-cell w-[18%] md:w-[12%] px-3 py-2 font-medium">
                    <button className="inline-flex items-center" onClick={()=>toggleSort('frequency')} title="Sort by Frequency">
                      Anchor Frequency
                      <SortIcon active={sortKey==='frequency'} dir={sortDir}/>
                    </button>
                  </th>
                  <th className="w-[14%] sm:w-[12%] md:w-[10%] px-3 py-2 font-medium">
                    <button className="inline-flex items-center" onClick={()=>toggleSort('aqs')} title="Sort by AQS">
                      AQS
                      <SortIcon active={sortKey==='aqs'} dir={sortDir}/>
                    </button>
                  </th>
                  <th className="hidden md:table-cell w-[10%] px-3 py-2 font-medium">
                    <button className="inline-flex items-center" onClick={()=>{}} disabled title="Link Type">
                      Link Type
                    </button>
                  </th>
                  <th className="hidden lg:table-cell w-[13%] px-3 py-2 font-medium">
                    <button className="inline-flex items-center" onClick={()=>{}} disabled title="Rel Attribute">
                      Rel Attribute
                    </button>
                  </th>
                  <th className="hidden sm:table-cell w-[18%] md:w-[15%] px-3 py-2 font-medium">
                    <button className="inline-flex items-center" onClick={()=>toggleSort('date')} title="Sort by Last Used">
                      Last Used
                      <SortIcon active={sortKey==='date'} dir={sortDir}/>
                    </button>
                  </th>
                  <th className="hidden md:table-cell w-[10%] px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Loading target pages…</td></tr>
                )}
                {error && !loading && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-red-500">{error}</td></tr>
                )}
                {!loading && !error && pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-600">
                      <div className="mx-auto max-w-[280px]">
                        <p className="mb-2 font-medium">No target pages found for this anchor.</p>
                        <p className="text-sm text-gray-500">Try changing filters or refresh the crawl.</p>
                        <button onClick={refetch} className="mt-3 rounded-md border px-3 py-2 text-sm hover:bg-gray-50" style={{ borderColor: WR_COLORS.borderLight }}>Refresh Crawl</button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && pageRows.map((r) => (
                  <tr key={r.url} className="group align-top transition-colors hover:bg-gray-50">
                    {/* Target URL */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-sm border" style={{ borderColor: WR_COLORS.borderLight }}>
                          {r.linkType === 'external' ? <Globe className="h-3.5 w-3.5"/> : <Link2 className="h-3.5 w-3.5"/>}
                        </div>
                        <button className="truncate text-left text-[#0077FF] hover:underline" title={r.url} onClick={() => openPageDrawer(r.url)}>
                          {formatDisplayUrl(r.url)}
                        </button>
                      </div>

                      {/* Mobile-only compact meta row */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                        <span className="text-xs" title={`Used ${r.anchorFrequency} times across ${r.sourcePages ?? '?'} source pages`}>Freq: {r.anchorFrequency}</span>
                        <span className="text-xs" style={{ color: aqsTone(r.aqs) }}>AQS: {r.aqs}%</span>
                        <span className="text-[11px]" style={{ color: r.linkType==='internal'? WR_COLORS.valueBlue : WR_COLORS.muted }}>{r.linkType==='internal'?'Internal':'External'}</span>
                        <span className="text-[11px]">{r.rel==='dofollow'?'DoFollow':r.rel==='nofollow'?'NoFollow':'Sponsored'}</span>
                        <span className="text-[11px] text-gray-600">{formatDate(r.lastUsed)}</span>
                      </div>
                    </td>

                    {/* Anchor Frequency */}
                    <td className="hidden sm:table-cell px-3 py-2">
                      <span title={`Used ${r.anchorFrequency} times across ${r.sourcePages ?? '?'} source pages`}>{r.anchorFrequency}</span>
                    </td>

                    {/* AQS as progress bar */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2" title={`AQS ${r.aqs}%\nBreakdown: generic ${r.aqsBreakdown?.generic ?? '-'}% • diversity ${r.aqsBreakdown?.diversity ?? '-'}% • placement ${r.aqsBreakdown?.placement ?? '-' }%`}>
                        <div className="h-2 w-full rounded" style={{ background: '#F3F4F6' }} aria-hidden="true">
                          <div className="h-2 rounded" style={{ width: `${r.aqs}%`, background: aqsTone(r.aqs) }} />
                        </div>
                        <span className="min-w-[34px] text-right tabular-nums">{r.aqs}%</span>
                      </div>
                    </td>

                    {/* Link Type */}
                    <td className="hidden md:table-cell px-3 py-2">
                      <span className="text-xs font-medium" style={{ color: r.linkType === 'internal' ? WR_COLORS.valueBlue : WR_COLORS.muted }}>
                        {r.linkType === 'internal' ? 'Internal' : 'External'}
                      </span>
                    </td>

                    {/* Rel Attribute */}
                    <td className="hidden lg:table-cell px-3 py-2">
                      <span className="text-xs">{r.rel === 'dofollow' ? 'DoFollow' : r.rel === 'nofollow' ? 'NoFollow' : 'Sponsored'}</span>
                    </td>

                    {/* Last Used */}
                    <td className="hidden sm:table-cell px-3 py-2">
                      <span title={new Date(r.lastUsed).toLocaleString()}>{formatDate(r.lastUsed)}</span>
                    </td>

                    {/* Action */}
                    <td className="hidden md:table-cell px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button className="rounded p-1 transition-transform hover:scale-105 hover:bg-gray-100" aria-label={`Open in Page Analyzer for ${r.url}`} title="Open in Page Analyzer" onClick={() => openPageDrawer(r.url)}>
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1 transition-transform hover:scale-105 hover:bg-gray-100" aria-label={`Create Task for ${r.url}`} title="Create Task">
                          <ClipboardList className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer: pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm" style={{ borderColor: WR_COLORS.borderLight }}>
          <div className="text-xs text-gray-500">Showing {Math.min(totalFiltered, startIdx + 1)}–{Math.min(totalFiltered, startIdx + pageRows.length)} of {totalFiltered} filtered (Total: {totalCount})</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Rows per page</span>
              <select value={pageSize} onChange={(e)=> setPageSize(Number(e.target.value))} className="rounded border px-2 py-1 text-sm" style={{ borderColor: WR_COLORS.borderLight }}>
                {[10,25,50,100].map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={currentPage===1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: WR_COLORS.borderLight }} title="Previous">Prev</button>
              {/* Page numbers (max 5 shown) */}
              {Array.from({length: Math.min(5, totalPages)}, (_,i)=>{
                let start = Math.max(1, Math.min(currentPage-2, totalPages-4));
                const pageNum = start + i;
                if (pageNum>totalPages) return null;
                return (
                  <button key={pageNum} onClick={()=> setPage(pageNum)} className={classNames("rounded border px-2 py-1", pageNum===currentPage?"bg-[#D9EEF8] text-[#0077FF]":"bg-white hover:bg-gray-50")} style={{ borderColor: WR_COLORS.borderLight }}>{pageNum}</button>
                );
              })}
              <button disabled={currentPage===totalPages} onClick={()=> setPage(p=> Math.min(totalPages, p+1))} className="rounded border px-2 py-1 disabled:opacity-50" style={{ borderColor: WR_COLORS.borderLight }} title="Next">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-in */}
      <style>{`
        [role='dialog'] > div:last-child { 
          transform: translateX(0%);
          transition: transform 220ms ease-in;
        }
      `}</style>
    </div>
  );
}

// --- Demo Launcher --------------------------------------------------------
export default function AnchorTargetsDrawerDemo(){
  const [open, setOpen] = useState(true);
  const anchorMeta = { id: 'a-123', text: 'seo tools' };
  return (
    <div className="min-h-screen w-full bg-white p-6" style={{ fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      {/* Mock: Anchor Usage Table row */}
      {/* <div className="mx-auto max-w-4xl rounded-lg border bg-white p-4" style={{ borderColor: WR_COLORS.borderLight }}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold" style={{ color: WR_COLORS.text }}>Anchor Usage Table (Demo Row)</h3><span className="text-sm text-gray-500">Click the chip to open the drawer</span></div>
        <div className="overflow-hidden rounded-md border" style={{ borderColor: WR_COLORS.borderLight }}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr><th className="px-3 py-2 text-left font-medium">Anchor Text</th><th className="px-3 py-2 text-left font-medium">Target Pages</th></tr></thead>
            <tbody>
              <tr className="h-14 hover:bg-gray-50">
                <td className="px-3 py-2">seo tools</td>
                <td className="px-3 py-2">
                  <button className="rounded-full px-3 py-1 text-sm" style={{ background: WR_COLORS.chipBg, color: WR_COLORS.valueBlue }} onClick={()=> setOpen(true)} title="View Target Pages">28 Target Pages</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div> */}

      <TargetUrlMiniDrawer isOpen={open} onClose={()=> setOpen(false)} anchorId={anchorMeta.id} anchorText={anchorMeta.text} />
    </div>
  );
}
