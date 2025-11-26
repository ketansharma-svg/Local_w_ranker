import * as React from "react";
import {
  Grid2x2, List as ListIcon, Save, Download, Plus, ChevronDown, Settings2, Filter,
  Star, StarOff, Share2, MoreHorizontal, FileUp, FolderCog, Trash2, Archive, ArchiveRestore,
  Users, Tags, Globe2, ShieldCheck, Copy, Lock, Unlock, Link2, ExternalLink, MessageSquareMore
} from "lucide-react";

/* ------------------- shadcn/ui ------------------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell
} from "@/components/ui/table";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/* ------------------- Tokens ------------------- */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  muted: "var(--wr-muted,#6B7280)",
  text: "var(--wr-text-strong,#111827)",
  brand: "#008CCD", // brand color per instruction
  action: "var(--wr-action,#0077FF)",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  radius: "6px",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const fmtInt = (n: number) => (n >= 1_000_000 ? (n/1_000_000).toFixed(1)+"M" : n >= 1_000 ? (n/1_000).toFixed(1)+"k" : String(n));
const fmtISO = (iso: string) => (iso ? iso.slice(0, 10) : "—");

/* ------------------- Types ------------------- */
type Mode = "domain" | "no-domain";
type ListType = "static" | "smart";
type Device = "desktop" | "mobile";
type Source = "gkp" | "serp" | "trends" | "gsc" | "ga4";

type ListRow = {
  id: string;
  name: string;
  type: ListType;
  owner: { id: string; name: string; avatar?: string };
  tags: string[];
  description?: string;
  keywordsCount: number;
  locale: { country: string; language: string };
  device: Device;
  sources: Source[];
  view: { columns: string[]; sort: [string, "asc"|"desc"] };
  filters?: any; // for smart lists
  createdAt: string;
  updatedAt: string;
  shared: { link: { enabled: boolean; expiry?: string }; users: { id:string; name:string; role:"viewer"|"commenter"|"editor"|"admin" }[] };
  archived: boolean;
  starred?: boolean;
  space?: string; // workspace/space name
  versions?: { v: number; at: string; note: string }[];
};

type LibraryFilters = {
  q: string;
  mine: boolean;
  sharedWithMe: boolean;
  starred: boolean;
  archived: boolean;
  modes: ("static"|"smart")[];
  tags: string[];
  locales: string[]; // "US-EN"
};

type ExportFormat = "csv"|"xlsx"|"pdf"|"gsheet";
type Role = "viewer"|"commenter"|"editor"|"admin";
type SmartRule = {
  seed?: string;
  intents?: ("informational"|"commercial"|"transactional"|"navigational"|"local")[];
  wkd?: ("easy"|"moderate"|"difficult"|"very")[];
  volumeMin?: number;
  volumeMax?: number;
  cpMin?: number; cpMax?: number;
  wosMin?: number; wosMax?: number;
  tmMin?: number; tmMax?: number;
  features?: ("fs"|"paa"|"local"|"shopping"|"video"|"images"|"news"|"sitelinks")[];
  locale: string;            // required
  device: Device;            // required
  sources: Source[];         // required set
  nearWinOnly?: boolean;
  gap?: ("new"|"missed"|"shared")[];
  savedView?: { columns: string[]; sort: [string,"asc"|"desc"] };
};

/* ------------------- Telemetry stub ------------------- */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail: { event, ts: new Date().toISOString(), props } }));
}

/* ------------------- Mock data ------------------- */
const MOCK_LISTS: ListRow[] = [
  {
    id: "lst_1",
    name: "Near‑Wins — US‑EN (Sept)",
    type: "static",
    owner: { id: "u_1", name: "Alex Morgan" },
    tags: ["nearwins","us-en","sept"],
    keywordsCount: 412,
    locale: { country: "US", language: "en" },
    device: "desktop",
    sources: ["gkp","serp","trends","gsc"],
    view: { columns: ["keyword","volume","wkd","cp","wos","tm","serp"], sort: ["wos","desc"] },
    createdAt: "2025-09-02T10:22:11Z",
    updatedAt: "2025-09-08T07:14:03Z",
    shared: { link: { enabled: false }, users: [{ id:"u_2", name:"Priya", role:"viewer"}] },
    archived: false,
    starred: true,
    space: "Default",
    versions: [{ v:1, at:"2025-09-02T10:22:11Z", note:"Initial save"}],
  },
  {
    id: "lst_2",
    name: "Rising Topics — Tech SEO",
    type: "smart",
    owner: { id: "u_3", name: "Samir" },
    tags: ["rising","trends"],
    keywordsCount: 268,
    locale: { country: "US", language: "en" },
    device: "desktop",
    sources: ["trends","serp","gkp"],
    filters: { tmMin: 1, volumeMin: 100, locale:"US-EN", device:"desktop" },
    view: { columns: ["keyword","volume","tm","seasonality","serp","format","ops"], sort: ["tm","desc"] },
    createdAt: "2025-09-01T16:19:12Z",
    updatedAt: "2025-09-07T09:02:45Z",
    shared: { link: { enabled: true, expiry:"2025-10-01" }, users: [{ id:"u_1", name:"Alex Morgan", role:"editor"}] },
    archived: false,
    starred: false,
    space: "Growth",
    versions: [{ v:1, at:"2025-09-01T16:19:12Z", note:"Smart rules" }],
  },
  {
    id: "lst_3",
    name: "Format Fit — How‑to targets",
    type: "smart",
    owner: { id: "u_1", name: "Alex Morgan" },
    tags: ["format","howto"],
    keywordsCount: 156,
    locale: { country: "GB", language: "en" },
    device: "desktop",
    sources: ["serp","gkp"],
    filters: { intents:["informational"], features:["paa"], locale:"GB-EN", device:"desktop" },
    view: { columns: ["keyword","volume","wkd","intent","serp","format","impact","ops"], sort: ["ops","desc"] },
    createdAt: "2025-09-05T10:21:01Z",
    updatedAt: "2025-09-05T12:41:55Z",
    shared: { link: { enabled: false }, users: [] },
    archived: false,
    starred: false,
  },
  {
    id: "lst_4",
    name: "Archived — Old sprint",
    type: "static",
    owner: { id: "u_4", name: "Jamie" },
    tags: ["archived","q2"],
    keywordsCount: 89,
    locale: { country: "US", language: "en" },
    device: "mobile",
    sources: ["gkp","serp"],
    view: { columns: ["keyword","volume","wkd","cp","wos"], sort: ["wos","desc"] },
    createdAt: "2025-05-10T10:00:00Z",
    updatedAt: "2025-07-01T10:00:00Z",
    shared: { link: { enabled: false }, users: [] },
    archived: true,
    starred: false,
  },
];

/* Sample keywords per list (static)—for export demo */
const MOCK_ITEMS: Record<string, { keyword: string; volume: number; wkd: number; intent: string; tm?: number }[]> = {
  lst_1: [
    { keyword:"technical seo checklist", volume:2900, wkd:57, intent:"informational", tm:0.8 },
    { keyword:"best technical seo tools", volume:880, wkd:61, intent:"commercial", tm:1.2 },
  ],
  lst_2: [
    { keyword:"ai seo tools 2025", volume:5400, wkd:48, intent:"commercial", tm:1.6 },
    { keyword:"how to improve core web vitals", volume:1900, wkd:52, intent:"informational", tm:1.3 },
  ],
  lst_3: [
    { keyword:"how to add faq schema", volume:1600, wkd:46, intent:"informational", tm:0.9 },
  ],
  lst_4: [
    { keyword:"old sprint kw 1", volume:260, wkd:39, intent:"informational" },
  ],
};

/* ------------------- API stubs (replace with backend) ------------------- */
const api = {
  async list(): Promise<ListRow[]> { await delay(300); return JSON.parse(JSON.stringify(MOCK_LISTS)); },
  async createList(payload: Partial<ListRow>): Promise<ListRow> {
    await delay(300);
    const id = `lst_${Math.floor(Math.random()*10_000)}`;
    const row: ListRow = {
      id,
      name: payload.name || "Untitled",
      type: payload.type || "static",
      owner: payload.owner || { id:"u_me", name:"You" },
      tags: payload.tags || [],
      description: payload.description || "",
      keywordsCount: payload.keywordsCount || 0,
      locale: payload.locale || { country: "US", language: "en" },
      device: payload.device || "desktop",
      sources: payload.sources || ["serp","gkp"],
      view: payload.view || { columns:["keyword","volume","wkd"], sort:["wkd","desc"] },
      filters: payload.filters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shared: { link:{ enabled:false }, users:[] },
      archived: false,
      starred: false,
      space: payload.space || "Default",
      versions: [{ v:1, at:new Date().toISOString(), note:"Initial" }],
    };
    MOCK_LISTS.unshift(row);
    return JSON.parse(JSON.stringify(row));
  },
  async updateList(id: string, patch: Partial<ListRow>): Promise<void> {
    await delay(250);
    const idx = MOCK_LISTS.findIndex(l => l.id === id);
    if (idx >= 0) {
      MOCK_LISTS[idx] = { ...MOCK_LISTS[idx], ...patch, updatedAt: new Date().toISOString() };
    }
  },
  async deleteList(id: string): Promise<void> { await delay(200); const i = MOCK_LISTS.findIndex(l => l.id === id); if (i>=0) MOCK_LISTS.splice(i,1); },
  async exportList(id: string, format: ExportFormat, scope: "selected"|"all", visibleCols: string[]): Promise<Blob> {
    await delay(400);
    const rows = MOCK_ITEMS[id] || [];
    const csv = [visibleCols.join(","), ...rows.map(r => visibleCols.map(c => JSON.stringify((r as any)[c] ?? "")).join(","))].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  },
  async previewSmart(_rule: SmartRule): Promise<number> { await delay(250); return Math.floor(150 + Math.random()*800); },
  async mergeLists(sourceIds: string[], targetId: string): Promise<void> {
    await delay(400);
    const target = MOCK_LISTS.find(l => l.id === targetId);
    if (target) {
      const added = sourceIds.filter(id => id!==targetId).map(id => (MOCK_LISTS.find(l=>l.id===id)?.keywordsCount||0)).reduce((a,b)=>a+b,0);
      target.keywordsCount += added;
      target.versions = [{ v:(target.versions?.[0]?.v??1)+1, at:new Date().toISOString(), note:`Merged ${sourceIds.length-1} lists` }, ...(target.versions||[])];
    }
  },
  async splitList(id: string, method: "intent"|"modifier"|"serp"): Promise<{ created: ListRow[] }> {
    await delay(400);
    const src = MOCK_LISTS.find(l => l.id===id);
    if (!src) return { created:[] };
    const mk = async (suffix:string) => api.createList({
      name: `${src.name} — ${suffix}`,
      type: src.type,
      tags: [...src.tags, "split"],
      keywordsCount: Math.max(1, Math.floor(src.keywordsCount/2)),
      locale: src.locale, device: src.device, sources: src.sources, space: src.space
    });
    const a = await mk(method==="intent"?"Info":"Set A");
    const b = await mk(method==="intent"?"Commercial":"Set B");
    return { created:[a,b] };
  },
};

/* util */
function delay(ms:number){ return new Promise(r => setTimeout(r, ms)); }

/* ------------------- Little UI atoms ------------------- */
const Chip: React.FC<{ children: React.ReactNode; active?: boolean; muted?: boolean; className?: string }> = ({ children, active, muted, className }) => (
  <span
    className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]", className, active && "font-semibold")}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastel : muted ? "#F9FAFB" : "#FFF" }}
  >{children}</span>
);

const ToggleChip: React.FC<{ label: string; active: boolean; onClick: () => void; title?: string }> = ({ label, active, onClick, title }) => (
  <button
    type="button"
    className={cn("h-8 px-3 rounded-full border text-sm cursor-pointer", active ? "font-semibold" : "hover:bg-[#F7FAFC]")}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastel : "#FFF" }}
    onClick={onClick}
    aria-pressed={active}
    title={title}
  >
    {label}
  </button>
);

/* branded section header */
const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <div className="h-[56px] flex items-center justify-between px-3 rounded-md border bg-white" style={{ borderColor: TK.border }}>
    <h2 className="text-[16px] font-semibold inline-flex items-center gap-2">
      <ListIcon className="h-4 w-4" style={{ color: TK.brand }} />
      {title}
    </h2>
    <div className="flex items-center gap-2">{right}</div>
  </div>
);

/* ------------------- Top-level Tab Component ------------------- */
export default function ListsTabDemo() {
  const [mode] = React.useState<Mode>("domain"); // mode-aware, but both work here
  const [lists, setLists] = React.useState<ListRow[]>([]);
  const [view, setView] = React.useState<"grid"|"list">("grid");
  const [filters, setFilters] = React.useState<LibraryFilters>({
    q:"", mine:false, sharedWithMe:false, starred:false, archived:false, modes:[], tags:[], locales:[]
  });
  const [selected, setSelected] = React.useState<Record<string,boolean>>({});
  const [sort, setSort] = React.useState<{ key:"name"|"updated"|"owner"|"keywords"; dir:"asc"|"desc" }>({ key:"updated", dir:"desc" });

  // Dialogs / Sheets
  const [createOpen, setCreateOpen] = React.useState<boolean>(false);
  const [createType, setCreateType] = React.useState<ListType>("static");
  const [smartOpen, setSmartOpen] = React.useState<boolean>(false);
  const [smartRule, setSmartRule] = React.useState<SmartRule>({ locale:"US-EN", device:"desktop", sources:["serp","gkp"] });

  const [importOpen, setImportOpen] = React.useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = React.useState<boolean>(false);
  const [shareOpen, setShareOpen] = React.useState<{open:boolean; list?:ListRow}>({ open:false });
  const [exportOpen, setExportOpen] = React.useState<{open:boolean; list?:ListRow}>({ open:false });
  const [renameOpen, setRenameOpen] = React.useState<{open:boolean; list?:ListRow}>({ open:false });
  const [moveOpen, setMoveOpen] = React.useState<{open:boolean; list?:ListRow}>({ open:false });
  const [confirmOpen, setConfirmOpen] = React.useState<{open:boolean; kind:"delete"|"archive"|"restore"; list?:ListRow}>({ open:false, kind:"delete" });

  const [mergeOpen, setMergeOpen] = React.useState<boolean>(false);
  const [mergeTarget, setMergeTarget] = React.useState<string>("");
  const [splitOpen, setSplitOpen] = React.useState<{open:boolean; list?:ListRow}>({ open:false });

  const [commentsOpen, setCommentsOpen] = React.useState<{open:boolean; list?:ListRow}>({ open:false });

  React.useEffect(() => {
    (async () => {
      const data = await api.list();
      setLists(data);
      krTrack("kr.lists.library_opened", { filters, view });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const me = "u_1"; // current user id (mock)

  /* ---------- Filtering ---------- */
  const tagUniverse = React.useMemo(() => Array.from(new Set(lists.flatMap(l => l.tags))).sort(), [lists]);
  const localeUniverse = React.useMemo(() => {
    const code = (l:ListRow) => `${l.locale.country}-${l.locale.language.toUpperCase()}`;
    return Array.from(new Set(lists.map(code))).sort();
  }, [lists]);

  const filtered = React.useMemo(() => {
    const q = filters.q.toLowerCase();
    return lists.filter(l => {
      if (filters.mine && l.owner.id !== me) return false;
      if (filters.sharedWithMe && !l.shared.users.some(u => u.id === me)) return false;
      if (filters.starred && !l.starred) return false;
      if (!filters.archived && l.archived) return false;
      if (filters.modes.length && !filters.modes.includes(l.type)) return false;
      if (filters.tags.length && !filters.tags.every(t => l.tags.includes(t))) return false;
      const loc = `${l.locale.country}-${l.locale.language.toUpperCase()}`;
      if (filters.locales.length && !filters.locales.includes(loc)) return false;
      if (q && !(`${l.name}|${l.owner.name}|${l.tags.join(",")}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [lists, filters, me]);

  /* ---------- Sorting ---------- */
  const sorted = React.useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const copy = [...filtered].sort((a,b) => {
      if (sort.key === "name") return dir * a.name.localeCompare(b.name);
      if (sort.key === "updated") return dir * (a.updatedAt.localeCompare(b.updatedAt));
      if (sort.key === "owner") return dir * a.owner.name.localeCompare(b.owner.name);
      if (sort.key === "keywords") return dir * (a.keywordsCount - b.keywordsCount);
      return 0;
    });
    return copy;
  }, [filtered, sort]);

  const selectedIds = React.useMemo(() => Object.keys(selected).filter(id => selected[id]), [selected]);

  /* ---------- Actions ---------- */
  const openList = (l: ListRow) => {
    krTrack("kr.lists.opened", { id:l.id, type:l.type, keywords:l.keywordsCount, from:"library" });
    alert(`Navigate to Analyze with list: ${l.name}\nType: ${l.type.toUpperCase()}\nKeywords: ${l.keywordsCount}\n(Stub)`);
  };

  const duplicate = async (l: ListRow) => {
    const copy = await api.createList({
      ...l,
      id: undefined,
      name: `${l.name} (copy)`,
      owner: l.owner,
      keywordsCount: l.keywordsCount,
      filters: l.filters
    });
    setLists(prev => [copy, ...prev]);
  };

  const toggleStar = async (l: ListRow) => {
    await api.updateList(l.id, { starred: !l.starred });
    setLists(prev => prev.map(x => x.id===l.id ? {...x, starred: !x.starred } : x));
  };

  const archive = async (l: ListRow, on: boolean) => {
    await api.updateList(l.id, { archived: on });
    setLists(prev => prev.map(x => x.id===l.id ? ({...x, archived:on}) : x));
    krTrack(on? "kr.lists.archived":"kr.lists.restored", { id:l.id });
  };

  const remove = async (l: ListRow) => {
    await api.deleteList(l.id);
    setLists(prev => prev.filter(x => x.id !== l.id));
  };

  const bulkMerge = async () => {
    if (!mergeTarget || selectedIds.length < 2) return;
    await api.mergeLists(selectedIds, mergeTarget);
    setMergeOpen(false);
    setSelected({});
    const data = await api.list();
    setLists(data);
  };

  const doSplit = async (listId: string, method:"intent"|"modifier"|"serp") => {
    const res = await api.splitList(listId, method);
    setSplitOpen({ open:false });
    setLists(prev => [...res.created, ...prev]);
  };

  /* ---------- Header ---------- */
  const header = (
    <SectionHeader
      title="Lists"
      right={
        <>
          {/* Export (library-level quick) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 px-3 cursor-pointer">
                <Download className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export library (demo)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Export visible lists (CSV) stub")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Export visible lists (XLSX) stub")}>XLSX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Export as PDF (white‑label) stub")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add to Reports */}
          <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={() => alert("Add to Reports (pick or create) stub")}>
            <Save className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Add to Reports
          </Button>

          {/* Settings */}
          <Button variant="outline" className="h-8 px-3 cursor-pointer" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Settings
          </Button>

          {/* New List (split) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 px-3 cursor-pointer">
                <Plus className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> New List
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setCreateType("static"); setCreateOpen(true); }}>Create Static</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCreateType("smart"); setSmartOpen(true); }}>Create Smart</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Import CSV → List</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );

  /* ---------- Filter bar ---------- */
  const filterBar = (
    <div className="mt-3 rounded-md border bg-white px-3 py-2" style={{ borderColor: TK.border }}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Input
            className="w-[320px] pl-8"
            placeholder="Search lists by name, tag, owner…"
            value={filters.q}
            onChange={(e)=>setFilters(f => ({ ...f, q:e.target.value }))}
          />
          <svg className="absolute left-2 top-1/2 -translate-y-1/2" width="16" height="16"><circle cx="7" cy="7" r="6" fill="none" stroke="#9E9E9E" /><line x1="11" y1="11" x2="15" y2="15" stroke="#9E9E9E" /></svg>
        </div>

        {/* Simple chips */}
        <ToggleChip label="My lists" active={filters.mine} onClick={()=>setFilters(f => ({ ...f, mine:!f.mine }))} />
        <ToggleChip label="Shared with me" active={filters.sharedWithMe} onClick={()=>setFilters(f => ({ ...f, sharedWithMe:!f.sharedWithMe }))} />
        <ToggleChip label="Starred" active={filters.starred} onClick={()=>setFilters(f => ({ ...f, starred:!f.starred }))} />
        <ToggleChip label="Archived" active={filters.archived} onClick={()=>setFilters(f => ({ ...f, archived:!f.archived }))} />

        {/* Mode chips */}
        <ToggleChip label="Static" active={filters.modes.includes("static")} onClick={()=>toggleMulti(filters.modes,"static",(v)=>setFilters(f=>({...f, modes:v})))} />
        <ToggleChip label="Smart" active={filters.modes.includes("smart")} onClick={()=>toggleMulti(filters.modes,"smart",(v)=>setFilters(f=>({...f, modes:v})))} />

        {/* Tag filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-3 cursor-pointer"><Tags className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Tags</Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px]">
            <div className="text-sm font-medium mb-2">Filter by tags</div>
            <div className="flex flex-wrap gap-1">
              {tagUniverse.map(t => (
                <button key={t} className={cn("px-2 py-0.5 rounded-full border text-[12px] cursor-pointer", filters.tags.includes(t) ? "font-semibold" : "hover:bg-[#F7FAFC]")}
                        style={{ borderColor: TK.borderLight, background: filters.tags.includes(t) ? TK.pastel : "#FFF" }}
                        onClick={()=>toggleMulti(filters.tags, t, (v)=>setFilters(f=>({...f,tags:v})))}>
                  {t}
                </button>
              ))}
              {tagUniverse.length===0 && <div className="text-xs text-muted-foreground">No tags yet.</div>}
            </div>
          </PopoverContent>
        </Popover>

        {/* Locale filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 px-3 cursor-pointer"><Globe2 className="h-4 w-4 mr-2" style={{ color: TK.brand }}/> Locale</Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px]">
            <div className="text-sm font-medium mb-2">Locale (Country‑Language)</div>
            <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
              {localeUniverse.map(loc => (
                <label key={loc} className="flex items-center justify-between text-sm py-0.5">
                  <span>{loc}</span>
                  <Checkbox
                    checked={filters.locales.includes(loc)}
                    onCheckedChange={(v)=>setFilters(f => ({ ...f, locales: toggleInArray(f.locales, loc, Boolean(v)) }))}
                  />
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* View toggle */}
        <div className="inline-flex items-center gap-0.5 rounded-[6px] p-0.5 ml-auto" style={{ border: `1px solid ${TK.border}`, background: "#FFF" }}>
          <button
            className={cn("h-8 px-3 rounded-[6px] cursor-pointer", view === "grid" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")}
            onClick={() => setView("grid")}
          ><Grid2x2 className="h-4 w-4 mr-1 inline" style={{ color: TK.brand }} />Grid</button>
          <button
            className={cn("h-8 px-3 rounded-[6px] cursor-pointer", view === "list" ? "bg-[var(--wr-bg-pastel,#D9EEF8)] font-semibold" : "text-[var(--wr-muted,#6B7280)]")}
            onClick={() => setView("list")}
          ><ListIcon className="h-4 w-4 mr-1 inline" style={{ color: TK.brand }} />List</button>
        </div>

        <Button variant="ghost" className="h-8 px-3 cursor-pointer" onClick={() => setFilters({ q:"", mine:false, sharedWithMe:false, starred:false, archived:false, modes:[], tags:[], locales:[] })}>Clear</Button>
      </div>

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="mt-2 w-full p-2 rounded border bg-[#F5F7FA] flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
          <span className="text-sm"><strong>{selectedIds.length}</strong> selected</span>
          <span className="inline-block h-5 w-px bg-[#E5E7EB]" />
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setShareOpen({ open:true, list: lists.find(l=>l.id===selectedIds[0]) })}><Share2 className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Share</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="cursor-pointer"><Download className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => alert("Export selected (CSV) stub")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Export selected (XLSX) stub")}>XLSX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Export selected (PDF) stub")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => alert("Add to Reports (selected) stub")}><Save className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Add to Reports</Button>
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => setMergeOpen(true)}><FolderCog className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Merge lists</Button>
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => bulkArchive(true)}><Archive className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Archive</Button>
          <Button size="sm" variant="outline" onClick={() => bulkDelete()} className="text-[var(--wr-critical,#EF4444)] cursor-pointer"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          <div className="ml-auto"><Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setSelected({})}>Clear selection</Button></div>
        </div>
      )}
    </div>
  );

  function bulkArchive(on:boolean) {
    const jobs = selectedIds.map(async id => {
      const l = lists.find(x => x.id===id);
      if (l) await archive(l, on);
    });
    Promise.all(jobs).then(() => setSelected({}));
  }

  function bulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} list(s)? This action can’t be undone.`)) return;
    const jobs = selectedIds.map(async id => {
      const l = lists.find(x => x.id===id);
      if (l) await remove(l);
    });
    Promise.all(jobs).then(() => setSelected({}));
  }

  /* ---------- Grid view ---------- */
  const grid = (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {sorted.map(l => (
        <div key={l.id} className={cn("rounded-md border bg-white", l.archived && "opacity-75")} style={{ borderColor: TK.border, boxShadow: TK.shadowSm }}>
          {/* Header */}
          <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: TK.borderLight }}>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!selected[l.id]} onCheckedChange={(v)=>setSelected(s => ({ ...s, [l.id]:Boolean(v) }))} />
              <button className="text-[15px] font-semibold text-left hover:underline underline-offset-2 cursor-pointer" onClick={()=>openList(l)}>{l.name}</button>
              {l.archived && <Chip muted>Archived</Chip>}
            </div>
            <div className="inline-flex items-center gap-1.5">
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=>toggleStar(l)} aria-label="Toggle star">
                  {l.starred ? <Star className="h-4 w-4" style={{ color: TK.brand }}/> : <StarOff className="h-4 w-4" />}
                </Button>
              </TooltipTrigger><TooltipContent>{l.starred ? "Unstar" : "Star"}</TooltipContent></Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={()=>setRenameOpen({open:true,list:l})}>Rename</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>setMoveOpen({open:true,list:l})}><FolderCog className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Move</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={()=>setSplitOpen({open:true, list:l})}>Split list…</DropdownMenuItem>
                  <DropdownMenuItem onClick={()=>duplicate(l)}>Duplicate</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!l.archived ? (
                    <DropdownMenuItem onClick={()=>setConfirmOpen({ open:true, kind:"archive", list:l })}><Archive className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Archive</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={()=>setConfirmOpen({ open:true, kind:"restore", list:l })}><ArchiveRestore className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Restore</DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-[var(--wr-critical,#EF4444)]" onClick={()=>setConfirmOpen({ open:true, kind:"delete", list:l })}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta */}
          <div className="px-3 py-2 text-sm flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-2">
                <AvatarCircle name={l.owner.name} />
                <span className="text-[13px]">{l.owner.name}</span>
              </span>
            </span>
            <div className="inline-flex items-center gap-2">
              <span className="text-[12px]" style={{ color: TK.muted }}>Updated {fmtISO(l.updatedAt)}</span>
              <Chip muted><b>{fmtInt(l.keywordsCount)}</b> kws</Chip>
            </div>
          </div>

          {/* Badges */}
          <div className="px-3 pb-1.5 flex items-center gap-2 flex-wrap">
            <Chip active>{l.type === "static" ? "Static" : "Smart"}</Chip>
            <Chip><Globe2 className="h-3.5 w-3.5" style={{ color: TK.brand }} /> {l.locale.country}-{l.locale.language.toUpperCase()} · {l.device}</Chip>
            <Chip>{l.sources.map(s => s.toUpperCase()).join(" / ")}</Chip>
            {l.tags.map(t => <Chip key={t} muted>{t}</Chip>)}
            {l.shared.link.enabled && <Chip><Link2 className="h-3.5 w-3.5" style={{ color: TK.brand }} /> Link</Chip>}
            {l.shared.users.length>0 && <Chip><Users className="h-3.5 w-3.5" style={{ color: TK.brand }} /> {l.shared.users.length}</Chip>}
          </div>

          {/* Footer actions */}
          <div className="px-3 py-2 border-t flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
            <div className="inline-flex items-center gap-2">
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>openList(l)}>Open</Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>setShareOpen({ open:true, list:l })}><Share2 className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Share</Button>
              <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>setExportOpen({ open:true, list:l })}><Download className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Export</Button>
            </div>
            <div className="inline-flex items-center gap-2">
              <Button size="sm" variant="ghost" className="cursor-pointer" onClick={()=>setCommentsOpen({ open:true, list:l })}><MessageSquareMore className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Comments</Button>
            </div>
          </div>
        </div>
      ))}
      {sorted.length===0 && (
        <div className="col-span-full text-center text-sm text-muted-foreground py-10">
          Save your selections or smart filters as Lists for fast reuse and sharing.
          <div className="mt-3 inline-flex gap-2">
            <Button className="cursor-pointer" onClick={()=>{ setCreateType("static"); setCreateOpen(true); }}>Create Static List</Button>
            <Button variant="outline" className="cursor-pointer" onClick={()=> setSmartOpen(true)}>Create Smart List</Button>
            <Button variant="outline" className="cursor-pointer" onClick={()=> setImportOpen(true)}><FileUp className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Import CSV</Button>
          </div>
        </div>
      )}
    </div>
  );

  /* ---------- List view (table) ---------- */
  const listTable = (
    <div className="mt-3 border rounded bg-white" style={{ borderColor: TK.border }}>
      <Table className="text-sm">
        <TableHeader className="sticky top-0 bg-white z-10" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
          <TableRow>
            <TableHead className="w-[46px] text-center">
              <Checkbox
                checked={sorted.length>0 && sorted.every(l => selected[l.id])}
                onCheckedChange={(v)=>setSelected(prev => {
                  const next = { ...prev };
                  sorted.forEach(l => next[l.id] = Boolean(v));
                  return next;
                })}
              />
            </TableHead>
            <TableHead className="min-w-[300px]">
              <HeaderSort label="Name" active={sort.key==="name"} dir={sort.dir} onSort={(dir)=>setSort({key:"name", dir})} />
            </TableHead>
            <TableHead className="w-[160px]">
              <HeaderSort label="Owner" active={sort.key==="owner"} dir={sort.dir} onSort={(dir)=>setSort({key:"owner", dir})} />
            </TableHead>
            <TableHead className="w-[140px]">
              <HeaderSort label="Updated" active={sort.key==="updated"} dir={sort.dir} onSort={(dir)=>setSort({key:"updated", dir})} />
            </TableHead>
            <TableHead className="w-[120px]" >
              <HeaderSort label="Keywords" active={sort.key==="keywords"} dir={sort.dir} onSort={(dir)=>setSort({key:"keywords", dir})} />
            </TableHead>
            <TableHead className="w-[110px] text-center">Mode</TableHead>
            <TableHead className="min-w-[160px]">Tags</TableHead>
            <TableHead className="w-[160px]">Locale</TableHead>
            <TableHead className="w-[110px] text-center">Shared</TableHead>
            <TableHead className="w-[260px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(l => (
            <TableRow key={l.id} className="hover:bg-[#F8FAFC]">
              <TableCell className="text-center">
                <Checkbox checked={!!selected[l.id]} onCheckedChange={(v)=>setSelected(s => ({ ...s, [l.id]:Boolean(v) }))} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <button className="text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer" onClick={()=>openList(l)}>{l.name}</button>
                  {l.archived && <Chip muted>Archived</Chip>}
                  <Chip muted>{l.space || "Default"}</Chip>
                </div>
              </TableCell>
              <TableCell>
                <div className="inline-flex items-center gap-2"><AvatarCircle name={l.owner.name} /> {l.owner.name}</div>
              </TableCell>
              <TableCell>{fmtISO(l.updatedAt)}</TableCell>
              <TableCell>{fmtInt(l.keywordsCount)}</TableCell>
              <TableCell className="text-center">{l.type==="static" ? "Static" : "Smart"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">{l.tags.map(t => <Chip key={t} muted>{t}</Chip>)}</div>
              </TableCell>
              <TableCell><Globe2 className="h-3.5 w-3.5 inline mr-1" style={{ color: TK.brand }} /> {l.locale.country}-{l.locale.language.toUpperCase()} · {l.device}</TableCell>
              <TableCell className="text-center">
                <div className="inline-flex items-center gap-1">
                  {l.shared.link.enabled && <Chip><Link2 className="h-3.5 w-3.5" style={{ color: TK.brand }} /> Link</Chip>}
                  {l.shared.users.length>0 && <Chip><Users className="h-3.5 w-3.5" style={{ color: TK.brand }} /> {l.shared.users.length}</Chip>}
                </div>
              </TableCell>
              <TableCell>
                <div className="inline-flex items-center gap-1.5">
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>openList(l)}>Open</Button>
                  </TooltipTrigger><TooltipContent>Open in Analyze</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>setShareOpen({ open:true, list:l })}><Share2 className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Share</Button>
                  </TooltipTrigger><TooltipContent>Share</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={()=>setExportOpen({ open:true, list:l })}><Download className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Export</Button>
                  </TooltipTrigger><TooltipContent>Export</TooltipContent></Tooltip>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="cursor-pointer"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={()=>setRenameOpen({open:true,list:l})}>Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={()=>setMoveOpen({open:true,list:l})}><FolderCog className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Move</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={()=>setSplitOpen({open:true, list:l})}>Split list…</DropdownMenuItem>
                      <DropdownMenuItem onClick={()=>duplicate(l)}>Duplicate</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!l.archived ? (
                        <DropdownMenuItem onClick={()=>setConfirmOpen({ open:true, kind:"archive", list:l })}><Archive className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Archive</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={()=>setConfirmOpen({ open:true, kind:"restore", list:l })}><ArchiveRestore className="h-4 w-4 mr-2" style={{ color: TK.brand }} /> Restore</DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-[var(--wr-critical,#EF4444)]" onClick={()=>setConfirmOpen({ open:true, kind:"delete", list:l })}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {sorted.length===0 && (
            <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No lists match your filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 space-y-3" style={FONTS}>
        {header}
        {filterBar}
        {view === "grid" ? grid : listTable}
      </div>

      {/* Create Static List Modal (centered by default) */}
      <CreateStaticListDialog
        open={createOpen && createType==="static"}
        onOpenChange={setCreateOpen}
        onCreate={async (payload) => {
          const created = await api.createList(payload);
          setLists(prev => [created, ...prev]);
          setCreateOpen(false);
          krTrack("kr.lists.created", { type:"static", source:"library" });
        }}
      />

      {/* Smart List Builder Drawer */}
      <SmartListDrawer
        open={smartOpen}
        initial={smartRule}
        onOpenChange={setSmartOpen}
        onPreview={api.previewSmart}
        onSave={async (rule) => {
          const created = await api.createList({
            type:"smart",
            name: rule.seed ? `Smart: ${rule.seed}` : "Smart List",
            owner: { id: me, name: "You" },
            keywordsCount: Math.floor(300 + Math.random()*600),
            locale: toLocaleObj(rule.locale),
            device: rule.device,
            sources: rule.sources,
            filters: rule,
            tags: ["smart"],
            view: rule.savedView || { columns:["keyword","volume","wkd","cp","wos","tm"], sort:["wos","desc"] },
          });
          setLists(prev => [created, ...prev]);
          setSmartOpen(false);
          krTrack("kr.lists.created", { type:"smart", source:"library" });
        }}
      />

      {/* CSV Import */}
      <ImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={async ({ listName, keywordsCount, locale, device, tags }) => {
          const created = await api.createList({
            type:"static",
            name: listName,
            owner: { id: me, name: "You" },
            keywordsCount,
            locale: toLocaleObj(locale),
            device,
            sources:["serp","gkp"],
            tags:[...tags, "import"],
          });
          setLists(prev => [created, ...prev]);
          setImportOpen(false);
          krTrack("kr.lists.csv_imported", { rows_in: keywordsCount, rows_kept: keywordsCount, rows_skipped: 0 });
        }}
      />

      {/* Settings (centered) */}
      <ListsSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Share */}
      <ShareModal
        open={shareOpen.open}
        list={shareOpen.list}
        onOpenChange={(o)=>setShareOpen({ open:o })}
        onSave={async (patch) => {
          if (!shareOpen.list) return;
          await api.updateList(shareOpen.list.id, patch as any);
          setLists(prev => prev.map(x => x.id===shareOpen.list!.id ? ({ ...x, ...patch }) : x));
          setShareOpen({ open:false });
          krTrack("kr.lists.shared", { id: shareOpen.list.id, link_enabled: (patch as any)?.shared?.link?.enabled ?? shareOpen.list.shared.link.enabled });
        }}
      />

      {/* Export */}
      <ExportModal
        open={exportOpen.open}
        list={exportOpen.list}
        onOpenChange={(o)=>setExportOpen({ open:o })}
        onExport={async (fmt, scope, cols) => {
          if (!exportOpen.list) return;
          const blob = await api.exportList(exportOpen.list.id, fmt, scope, cols);
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `list-${slugify(exportOpen.list.name)}-${new Date().toISOString().slice(0,10)}.${fmt==="csv"?"csv":fmt==="xlsx"?"xlsx":"csv"}`;
          a.click();
          URL.revokeObjectURL(a.href);
          setExportOpen({ open:false });
          krTrack("kr.lists.exported", { id: exportOpen.list.id, format: fmt, rows: MOCK_ITEMS[exportOpen.list.id]?.length ?? 0, columns: cols.length });
        }}
      />

      {/* Rename */}
      <RenameDialog
        open={renameOpen.open}
        currentName={renameOpen.list?.name || ""}
        onOpenChange={(o)=>setRenameOpen({ open:o })}
        onSave={async (name) => {
          if (!renameOpen.list) return;
          await api.updateList(renameOpen.list.id, { name });
          setLists(prev => prev.map(x => x.id===renameOpen.list!.id ? ({ ...x, name }) : x));
          setRenameOpen({ open:false });
        }}
      />

      {/* Move */}
      <MoveDialog
        open={moveOpen.open}
        currentSpace={moveOpen.list?.space || "Default"}
        onOpenChange={(o)=>setMoveOpen({ open:o })}
        onSave={async (space) => {
          if (!moveOpen.list) return;
          await api.updateList(moveOpen.list.id, { space });
          setLists(prev => prev.map(x => x.id===moveOpen.list!.id ? ({ ...x, space }) : x));
          setMoveOpen({ open:false });
        }}
      />

      {/* Confirm Archive/Restore/Delete */}
      <Dialog open={confirmOpen.open} onOpenChange={(o)=>setConfirmOpen(c => ({ ...c, open:o }))}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{confirmOpen.kind === "delete" ? "Delete list" : confirmOpen.kind==="archive"?"Archive list":"Restore list"}</DialogTitle>
            <DialogDescription>
              {confirmOpen.kind === "delete"
                ? "This will permanently remove the list. You can archive first if you aren't sure."
                : confirmOpen.kind === "archive"
                  ? "Archived lists are hidden by default and can be restored later."
                  : "This will unarchive the list and make it active again."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">List: <b>{confirmOpen.list?.name}</b></div>
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={()=>setConfirmOpen(c => ({ ...c, open:false }))}>Cancel</Button>
            {confirmOpen.kind === "delete" ? (
              <Button className="bg-[var(--wr-critical,#EF4444)] hover:opacity-90 cursor-pointer" onClick={async ()=>{
                if (confirmOpen.list) await remove(confirmOpen.list);
                setConfirmOpen({ open:false, kind:"delete" });
              }}>Delete</Button>
            ) : confirmOpen.kind === "archive" ? (
              <Button className="cursor-pointer" onClick={async ()=>{
                if (confirmOpen.list) await archive(confirmOpen.list, true);
                setConfirmOpen({ open:false, kind:"archive" });
              }}>Archive</Button>
            ) : (
              <Button className="cursor-pointer" onClick={async ()=>{
                if (confirmOpen.list) await archive(confirmOpen.list, false);
                setConfirmOpen({ open:false, kind:"restore" });
              }}>Restore</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge lists (bulk) */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Merge lists</DialogTitle>
            <DialogDescription>Select the target list to merge the others into.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-sm">Selected: <b>{selectedIds.length}</b></div>
            <Select value={mergeTarget} onValueChange={setMergeTarget}>
              <SelectTrigger className="h-9 cursor-pointer"><SelectValue placeholder="Pick target list" /></SelectTrigger>
              <SelectContent>
                {selectedIds.map(id => {
                  const l = lists.find(x => x.id===id)!;
                  return <SelectItem key={id} value={id}>{l.name}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">All other selected lists will be merged into the target. This adds their keywords (deduped server‑side).</div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={()=>setMergeOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" disabled={!mergeTarget || selectedIds.length<2} onClick={bulkMerge}>Merge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split list */}
      <Dialog open={splitOpen.open} onOpenChange={(o)=>setSplitOpen(s => ({ ...s, open:o }))}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Split list</DialogTitle>
            <DialogDescription>Create child lists by rule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>List: <b>{splitOpen.list?.name}</b></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={()=>doSplit(splitOpen.list!.id, "intent")}>By intent</Button>
              <Button variant="outline" className="cursor-pointer" onClick={()=>doSplit(splitOpen.list!.id, "modifier")}>By modifier family</Button>
              <Button variant="outline" className="cursor-pointer" onClick={()=>doSplit(splitOpen.list!.id, "serp")}>By SERP separation</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="cursor-pointer" onClick={()=>setSplitOpen({ open:false })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments panel */}
      <CommentsPanel
        open={commentsOpen.open}
        list={commentsOpen.list}
        onOpenChange={(o)=>setCommentsOpen({ open:o })}
      />
    </TooltipProvider>
  );
}

/* ------------------- Helpers ------------------- */
function toggleInArray<T>(arr:T[], v:T, on:boolean){ return on ? (arr.includes(v) ? arr : [...arr, v]) : arr.filter(x => x!==v); }
function toggleMulti<T extends string>(arr:T[], val:T, setter:(v:T[])=>void) {
  setter(arr.includes(val) ? arr.filter(x => x!==val) : [...arr, val]);
}
function slugify(s:string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function toLocaleObj(code:string){ const [c,l] = code.split("-"); return { country: c || "US", language: (l||"en").toLowerCase() }; }

/* ------------------- Atoms / small components ------------------- */
const HeaderSort: React.FC<{ label:string; active?:boolean; dir?:"asc"|"desc"; onSort:(dir:"asc"|"desc")=>void; }> = ({ label, active, dir, onSort }) => (
  <button className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => onSort(!active ? "desc" : dir === "desc" ? "asc" : "desc")} aria-pressed={active}>
    <span>{label}</span>
    {active ? (dir === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-180" />) : <ChevronDown className="h-4 w-4 opacity-40" />}
  </button>
);

const AvatarCircle: React.FC<{ name: string }> = ({ name }) => {
  const initials = name.split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase();
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]" style={{ background:"#EEF2FF", color:"#4338CA" }}>{initials}</span>;
};

/* ------------------- Create Static List Dialog ------------------- */
const CreateStaticListDialog: React.FC<{
  open: boolean;
  onOpenChange: (o:boolean)=>void;
  onCreate: (payload: Partial<ListRow>) => Promise<void>;
}> = ({ open, onOpenChange, onCreate }) => {
  const [name, setName] = React.useState("New List");
  const [tags, setTags] = React.useState<string>("");
  const [desc, setDesc] = React.useState("");
  const [locale, setLocale] = React.useState("US-EN");
  const [device, setDevice] = React.useState<Device>("desktop");
  const [paste, setPaste] = React.useState("");
  const [dedupe, setDedupe] = React.useState(true);
  const [lower, setLower] = React.useState(true);
  const [trim, setTrim] = React.useState(true);
  const [skipLong, setSkipLong] = React.useState(true);

  function processKeywords(): string[] {
    let k = paste.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lower) k = k.map(s => s.toLowerCase());
    if (trim)  k = k.map(s => s.replace(/\s+/g," "));
    if (skipLong) k = k.filter(s => s.split(/\s+/).length <= 8);
    if (dedupe) k = Array.from(new Set(k));
    return k;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Create Static List</DialogTitle>
          <DialogDescription>Paste or import keywords; we’ll dedupe and clean them.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} />
            <label className="text-sm font-medium">Tags (comma)</label>
            <Input value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="nearwins, us-en" />
            <label className="text-sm font-medium">Description (optional)</label>
            <Textarea rows={4} value={desc} onChange={(e)=>setDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Locale</label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US-EN">US‑EN</SelectItem>
                    <SelectItem value="GB-EN">GB‑EN</SelectItem>
                    <SelectItem value="DE-DE">DE‑DE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Device</label>
                <Select value={device} onValueChange={(v:any)=>setDevice(v)}>
                  <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Add keywords (one per line)</label>
            <Textarea rows={12} value={paste} onChange={(e)=>setPaste(e.target.value)} placeholder="keyword one&#10;keyword two" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="inline-flex items-center gap-2"><Checkbox checked={dedupe} onCheckedChange={(v)=>setDedupe(Boolean(v))} /> Deduplicate</label>
              <label className="inline-flex items-center gap-2"><Checkbox checked={lower}  onCheckedChange={(v)=>setLower(Boolean(v))}  /> Lowercase</label>
              <label className="inline-flex items-center gap-2"><Checkbox checked={trim}   onCheckedChange={(v)=>setTrim(Boolean(v))}   /> Trim spaces</label>
              <label className="inline-flex items-center gap-2"><Checkbox checked={skipLong} onCheckedChange={(v)=>setSkipLong(Boolean(v))} /> Skip &gt; 8 words</label>
            </div>
            <div className="text-xs text-muted-foreground">Count: {processKeywords().length}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button className="cursor-pointer" onClick={()=>{
            const kws = processKeywords();
            onCreate({
              type:"static",
              name,
              tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
              description: desc,
              keywordsCount: kws.length,
              locale: toLocaleObj(locale),
              device,
              sources:["serp","gkp"]
            });
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------- Smart List Drawer ------------------- */
const SmartListDrawer: React.FC<{
  open: boolean;
  initial: SmartRule;
  onOpenChange: (o:boolean)=>void;
  onPreview: (rule:SmartRule)=>Promise<number>;
  onSave: (rule:SmartRule)=>Promise<void>;
}> = ({ open, initial, onOpenChange, onPreview, onSave }) => {
  const [rule, setRule] = React.useState<SmartRule>(initial);
  const [count, setCount] = React.useState<number|undefined>(undefined);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(()=>{ setRule(initial); setCount(undefined); }, [initial, open]);

  async function doPreview() {
    setLoading(true);
    const n = await onPreview(rule);
    setCount(n);
    setLoading(false);
  }

  function toggle<T extends string>(arr:T[]|undefined, val:T, updater:(v:T[])=>void) {
    const cur = arr || [];
    updater(cur.includes(val) ? cur.filter(x=>x!==val) : [...cur, val]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create Smart List</DialogTitle>
          <DialogDescription>Save filters that re‑evaluate on open. Locale & device are required.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seed contains (optional)</label>
            <Input value={rule.seed || ""} onChange={(e)=>setRule({ ...rule, seed:e.target.value })} placeholder="phrase appears in keywords" />
            <label className="text-sm font-medium">Intents</label>
            <div className="flex flex-wrap gap-1">
              {["informational","commercial","transactional","navigational","local"].map(i => (
                <ToggleChip key={i} label={cap(i)} active={!!rule.intents?.includes(i as any)}
                  onClick={()=>toggle(rule.intents as any, i as any, v => setRule({ ...rule, intents:v as any }))} />
              ))}
            </div>
            <label className="text-sm font-medium">WKD bands</label>
            <div className="flex flex-wrap gap-1">
              {["easy","moderate","difficult","very"].map(b => (
                <ToggleChip key={b} label={cap(b)} active={!!rule.wkd?.includes(b as any)}
                  onClick={()=>toggle(rule.wkd as any, b as any, v => setRule({ ...rule, wkd:v as any }))} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Volume ≥</label>
                <Input type="number" value={rule.volumeMin ?? ""} onChange={(e)=>setRule({ ...rule, volumeMin: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <label className="text-sm font-medium">Volume ≤</label>
                <Input type="number" value={rule.volumeMax ?? ""} onChange={(e)=>setRule({ ...rule, volumeMax: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-sm font-medium">CP% ≥</label><Input type="number" value={rule.cpMin ?? ""} onChange={(e)=>setRule({ ...rule, cpMin: e.target.value ? Number(e.target.value) : undefined })} /></div>
              <div><label className="text-sm font-medium">WOS ≥</label><Input type="number" value={rule.wosMin ?? ""} onChange={(e)=>setRule({ ...rule, wosMin: e.target.value ? Number(e.target.value) : undefined })} /></div>
              <div><label className="text-sm font-medium">TM ≥</label><Input type="number" value={rule.tmMin ?? ""} onChange={(e)=>setRule({ ...rule, tmMin: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SERP features</label>
            <div className="flex flex-wrap gap-1">
              {["fs","paa","local","shopping","video","images","news","sitelinks"].map(f => (
                <ToggleChip key={f} label={f.toUpperCase()} active={!!rule.features?.includes(f as any)}
                  onClick={()=>toggle(rule.features as any, f as any, v => setRule({ ...rule, features:v as any }))} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Locale</label>
                <Select value={rule.locale} onValueChange={(v)=>setRule({ ...rule, locale:v })}>
                  <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US-EN">US‑EN</SelectItem>
                    <SelectItem value="GB-EN">GB‑EN</SelectItem>
                    <SelectItem value="DE-DE">DE‑DE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Device</label>
                <Select value={rule.device} onValueChange={(v:any)=>setRule({ ...rule, device:v })}>
                  <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="text-sm font-medium">Sources</label>
            <div className="flex flex-wrap gap-1">
              {(["gkp","serp","trends","gsc","ga4"] as Source[]).map(s => (
                <ToggleChip key={s} label={s.toUpperCase()} active={(rule.sources||[]).includes(s)}
                  onClick={()=> {
                    const cur = rule.sources || [];
                    setRule({ ...rule, sources: cur.includes(s) ? cur.filter(x=>x!==s) : [...cur, s] });
                  }} />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox checked={!!rule.nearWinOnly} onCheckedChange={(v)=>setRule({ ...rule, nearWinOnly: Boolean(v) })} />
                Near‑Win only
              </label>
              <div>
                <label className="text-sm font-medium">Gap</label>
                <div className="flex flex-wrap gap-1">
                  {["new","missed","shared"].map(g => (
                    <ToggleChip key={g} label={cap(g)} active={!!rule.gap?.includes(g as any)}
                      onClick={()=> {
                        const cur = rule.gap || [];
                        setRule({ ...rule, gap: cur.includes(g as any) ? cur.filter(x=>x!==g) as any : [...cur, g as any] });
                      }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2">
              <label className="text-sm font-medium">Save view</label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder='Columns (comma, e.g., "keyword,volume,wkd")' value={rule.savedView?.columns.join(",") || ""} onChange={(e)=>setRule({ ...rule, savedView:{ columns: e.target.value.split(",").map(s=>s.trim()).filter(Boolean), sort: rule.savedView?.sort || ["ops","desc"] } })} />
                <Input placeholder='Sort (e.g., "ops,desc")' value={rule.savedView ? rule.savedView.sort.join(",") : ""} onChange={(e)=> {
                  const parts = e.target.value.split(",").map(s=>s.trim());
                  const sort: any = parts.length===2 ? [parts[0], parts[1]] : ["ops","desc"];
                  setRule({ ...rule, savedView: { columns: rule.savedView?.columns || ["keyword","ops"], sort } });
                }} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm">{count != null && <span className="text-[var(--wr-action,#0077FF)] font-medium">{count}</span>} {count != null ? "results" : ""}</div>
          <div className="inline-flex items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={doPreview} disabled={loading}><Filter className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> {loading ? "Preview…" : "Preview results"}</Button>
            <Button className="cursor-pointer" onClick={()=>onSave(rule)} disabled={!rule.locale || !rule.device || !(rule.sources||[]).length}>Save Smart List</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function cap(s:string){ return s.charAt(0).toUpperCase() + s.slice(1); }

/* ------------------- Import CSV Dialog ------------------- */
const ImportCsvDialog: React.FC<{
  open: boolean;
  onOpenChange: (o:boolean)=>void;
  onImport: (payload: { listName:string; keywordsCount:number; locale:string; device:Device; tags:string[] })=>Promise<void>;
}> = ({ open, onOpenChange, onImport }) => {
  const [name, setName] = React.useState("Imported List");
  const [locale, setLocale] = React.useState("US-EN");
  const [device, setDevice] = React.useState<Device>("desktop");
  const [tags, setTags] = React.useState("");
  const [file, setFile] = React.useState<File|null>(null);
  const [opts, setOpts] = React.useState({ dedupe:true, lower:true, trim:true, skipLong:true });

  async function handleImport() {
    let count = 0;
    if (file) {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
      const header = rows[0].split(",").map(c => c.replace(/^"|"$/g,"").toLowerCase());
      const idx = header.findIndex(c => ["keyword","query","term"].includes(c));
      const kws = rows.slice(1).map(r => {
        const cols = parseCSV(r);
        const cell = idx>=0 ? cols[idx] : cols[0];
        return cell?.toString() || "";
      }).filter(Boolean);
      let cleaned = kws;
      if (opts.lower) cleaned = cleaned.map(s => s.toLowerCase());
      if (opts.trim)  cleaned = cleaned.map(s => s.replace(/\s+/g," ").trim());
      if (opts.skipLong) cleaned = cleaned.filter(s => s.split(/\s+/).length <= 8);
      if (opts.dedupe) cleaned = Array.from(new Set(cleaned));
      count = cleaned.length;
    }
    await onImport({ listName: name, keywordsCount: count, locale, device, tags: tags.split(",").map(s=>s.trim()).filter(Boolean) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import CSV → List</DialogTitle>
          <DialogDescription>We’ll detect a keyword column automatically. Options apply to the imported rows.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">File</label>
            <Input type="file" accept=".csv,text/csv" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
            <label className="text-sm font-medium">List name</label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} />
            <label className="text-sm font-medium">Tags (comma)</label>
            <Input value={tags} onChange={(e)=>setTags(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Locale</label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US-EN">US‑EN</SelectItem>
                    <SelectItem value="GB-EN">GB‑EN</SelectItem>
                    <SelectItem value="DE-DE">DE‑DE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Device</label>
                <Select value={device} onValueChange={(v:any)=>setDevice(v)}>
                  <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="inline-flex items-center gap-2"><Checkbox checked={opts.dedupe} onCheckedChange={(v)=>setOpts(o=>({...o, dedupe:Boolean(v)}))} /> Deduplicate</label>
              <label className="inline-flex items-center gap-2"><Checkbox checked={opts.lower}  onCheckedChange={(v)=>setOpts(o=>({...o, lower:Boolean(v)}))}  /> Lowercase</label>
              <label className="inline-flex items-center gap-2"><Checkbox checked={opts.trim}   onCheckedChange={(v)=>setOpts(o=>({...o, trim:Boolean(v)}))}   /> Trim</label>
              <label className="inline-flex items-center gap-2"><Checkbox checked={opts.skipLong} onCheckedChange={(v)=>setOpts(o=>({...o, skipLong:Boolean(v)}))} /> Skip &gt; 8 words</label>
            </div>
            <div className="rounded-md border p-2 text-xs" style={{ borderColor: TK.borderLight, background:"#FAFBFF" }}>
              Exports don’t include raw GSC/GA4 rows; only computed aggregates.
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button disabled={!file} className="cursor-pointer" onClick={handleImport}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function parseCSV(row:string): string[] {
  // naive CSV parser for demo
  const out:string[] = [];
  let cur="", inQ=false;
  for (let i=0;i<row.length;i++){
    const ch=row[i];
    if (ch==='"' ){ inQ=!inQ; continue; }
    if (ch===',' && !inQ){ out.push(cur); cur=""; continue; }
    cur+=ch;
  }
  out.push(cur);
  return out.map(s=>s.trim());
}

/* ------------------- Settings Dialog (centered) ------------------- */
const ListsSettingsDialog: React.FC<{ open:boolean; onOpenChange:(o:boolean)=>void; }> = ({ open, onOpenChange }) => {
  const [targetRank, setTargetRank] = React.useState<"top1"|"top3"|"top5">("top3");
  const [baseline, setBaseline] = React.useState<number>(20);
  const [effort, setEffort] = React.useState({ content:40, links:30, tech:20, backlinks:10 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Lists Settings</DialogTitle>
          <DialogDescription>Defaults for list creation and calculations shown when lists open in Analyze.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Target rank</label>
            <Select value={targetRank} onValueChange={(v:any)=>setTargetRank(v)}>
              <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top1">Top‑1</SelectItem>
                <SelectItem value="top3">Top‑3</SelectItem>
                <SelectItem value="top5">Top‑5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Baseline rank (non‑ranking)</label>
            <Input type="number" value={baseline} onChange={(e)=>setBaseline(Number(e.target.value||20))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Effort weights</label>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <Input value={effort.content} onChange={(e)=>setEffort({...effort, content:Number(e.target.value||0)})} />
              <Input value={effort.links} onChange={(e)=>setEffort({...effort, links:Number(e.target.value||0)})} />
              <Input value={effort.tech} onChange={(e)=>setEffort({...effort, tech:Number(e.target.value||0)})} />
              <Input value={effort.backlinks} onChange={(e)=>setEffort({...effort, backlinks:Number(e.target.value||0)})} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Content / Internal Links / Technical / Backlinks</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Close</Button>
          <Button className="cursor-pointer" onClick={()=>{ onOpenChange(false); krTrack("kr.lists.settings_changed", { targetRank, baseline, effort }); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------- Share Modal ------------------- */
const ShareModal: React.FC<{
  open:boolean; list?:ListRow; onOpenChange:(o:boolean)=>void;
  onSave: (patch: Partial<ListRow>) => Promise<void>;
}> = ({ open, list, onOpenChange, onSave }) => {
  const [linkEnabled, setLinkEnabled] = React.useState<boolean>(!!list?.shared.link.enabled);
  const [expiry, setExpiry] = React.useState<string>(list?.shared.link.expiry || "");
  const [requireSignin, setRequireSignin] = React.useState<boolean>(true);
  const [disableExport, setDisableExport] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState(list?.shared.users || []);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("viewer");

  React.useEffect(()=> {
    if (!open || !list) return;
    setLinkEnabled(list.shared.link.enabled);
    setExpiry(list.shared.link.expiry || "");
    setUsers(list.shared.users);
  }, [open, list]);

  function addUser() {
    const e = email.trim();
    if (!e) return;
    setUsers(prev => [...prev, { id:`inv_${Date.now()}`, name:e, role } as any]);
    setEmail("");
  }
  function removeUser(id:string){ setUsers(prev => prev.filter(u => u.id !== id)); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Share “{list?.name}”</DialogTitle>
          <DialogDescription>Invite teammates, enable link sharing, and set permissions. External viewers see aggregates only.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Link sharing */}
          <div className="rounded-md border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Link sharing</div>
              <div className="inline-flex items-center gap-2 text-sm">
                <span>Off</span>
                <Switch checked={linkEnabled} onCheckedChange={setLinkEnabled} />
                <span>On</span>
              </div>
            </div>
            {linkEnabled && (
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input value={`${location.origin}/share/${list?.id}`} readOnly />
                <Button variant="outline" className="cursor-pointer" onClick={()=>navigator.clipboard.writeText(`${location.origin}/share/${list?.id}`)}><Copy className="h-4 w-4 mr-1" style={{ color: TK.brand }} /> Copy</Button>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Expiry (optional)</label>
                    <Input type="date" value={expiry ? expiry.slice(0,10) : ""} onChange={(e)=>setExpiry(e.target.value ? new Date(e.target.value).toISOString() : "")} />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm mt-6"><Checkbox checked={requireSignin} onCheckedChange={(v)=>setRequireSignin(Boolean(v))} /> Require sign‑in</label>
                </div>
              </div>
            )}
          </div>

          {/* People */}
          <div className="rounded-md border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="text-sm font-medium mb-2">Invite people</div>
            <div className="grid grid-cols-[1fr_140px_auto] gap-2">
              <Input placeholder="Email or name" value={email} onChange={(e)=>setEmail(e.target.value)} />
              <Select value={role} onValueChange={(v:any)=>setRole(v)}>
                <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="commenter">Commenter</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button className="cursor-pointer" onClick={addUser}><Users className="h-4 w-4 mr-1" style={{ color: TK.brand }}/> Invite</Button>
            </div>

            <div className="mt-2 space-y-1 max-h-[180px] overflow-auto pr-1">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm" style={{ borderColor: TK.borderLight }}>
                  <span>{u.name}</span>
                  <div className="inline-flex items-center gap-2">
                    <Chip muted>{u.role}</Chip>
                    <Button variant="ghost" size="sm" className="cursor-pointer" onClick={()=>removeUser(u.id)}>Remove</Button>
                  </div>
                </div>
              ))}
              {users.length===0 && <div className="text-xs text-muted-foreground">No collaborators yet.</div>}
            </div>
          </div>

          {/* Advanced */}
          <div className="rounded-md border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="text-sm font-medium mb-2">Advanced</div>
            <label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={disableExport} onCheckedChange={(v)=>setDisableExport(Boolean(v))} /> Disable export/printing for external viewers</label>
            <div className="text-xs text-muted-foreground mt-1">Watermark (email + timestamp) is applied to external viewers.</div>
          </div>

          <div className="text-xs text-muted-foreground">Shared with {users.length} people • Last change by You just now</div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button className="cursor-pointer" onClick={()=>onSave({
            shared: {
              link: { enabled: linkEnabled, expiry: expiry || undefined },
              users
            } as any
          })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------- Export Modal ------------------- */
const ExportModal: React.FC<{
  open:boolean; list?:ListRow; onOpenChange:(o:boolean)=>void;
  onExport: (fmt:ExportFormat, scope:"selected"|"all", visibleCols:string[])=>Promise<void>;
}> = ({ open, list, onOpenChange, onExport }) => {
  const [format, setFormat] = React.useState<ExportFormat>("csv");
  const [scope, setScope] = React.useState<"selected"|"all">("all");
  const [cols, setCols] = React.useState<string>("keyword,volume,wkd,tm");

  React.useEffect(()=> { if (open) { setFormat("csv"); setScope("all"); setCols("keyword,volume,wkd,tm"); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Export “{list?.name}”</DialogTitle>
          <DialogDescription>Visible columns only (recommended). External exports exclude raw GSC/GA4 rows.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Format</label>
            <Select value={format} onValueChange={(v:any)=>setFormat(v)}>
              <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
                <SelectItem value="gsheet">Google Sheets</SelectItem>
                <SelectItem value="pdf">PDF (white‑label)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Scope</label>
            <Select value={scope} onValueChange={(v:any)=>setScope(v)}>
              <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire list</SelectItem>
                <SelectItem value="selected">Selected rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Columns (visible)</label>
            <Input value={cols} onChange={(e)=>setCols(e.target.value)} />
          </div>
          <div className="rounded-md border p-2 text-xs md:col-span-2" style={{ borderColor: TK.borderLight }}>
            Exports don’t include raw GSC/GA4 rows; only computed aggregates.
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button className="cursor-pointer" onClick={()=>onExport(format, scope, cols.split(",").map(s=>s.trim()).filter(Boolean))}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------- Rename Dialog ------------------- */
const RenameDialog: React.FC<{ open:boolean; currentName:string; onOpenChange:(o:boolean)=>void; onSave:(name:string)=>void; }> = ({ open, currentName, onOpenChange, onSave }) => {
  const [name, setName] = React.useState(currentName);
  React.useEffect(()=>{ if (open) setName(currentName); }, [open, currentName]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Rename list</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e)=>setName(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button className="cursor-pointer" onClick={()=>onSave(name)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------- Move Dialog (spaces) ------------------- */
const MoveDialog: React.FC<{ open:boolean; currentSpace:string; onOpenChange:(o:boolean)=>void; onSave:(space:string)=>void; }> = ({ open, currentSpace, onOpenChange, onSave }) => {
  const [space, setSpace] = React.useState(currentSpace);
  React.useEffect(()=>{ if (open) setSpace(currentSpace); }, [open, currentSpace]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>Move to workspace/space</DialogTitle></DialogHeader>
        <Select value={space} onValueChange={setSpace}>
          <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Default">Default</SelectItem>
            <SelectItem value="Growth">Growth</SelectItem>
            <SelectItem value="Client A">Client A</SelectItem>
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button className="cursor-pointer" onClick={()=>onSave(space)}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ------------------- Comments Panel (modal) ------------------- */
const CommentsPanel: React.FC<{ open:boolean; onOpenChange:(o:boolean)=>void; list?:ListRow }> = ({ open, onOpenChange, list }) => {
  const [comments, setComments] = React.useState<{ id:string; author:string; at:string; text:string }[]>([]);
  const [text, setText] = React.useState("");
  React.useEffect(()=>{ if (open) { setComments([{ id:"c1", author:"Alex", at:new Date().toISOString(), text:"Let's prioritize near‑wins first." }]); } }, [open]);
  function add(){ const t = text.trim(); if (!t) return; setComments(c => [{ id:`c_${Date.now()}`, author:"You", at:new Date().toISOString(), text:t }, ...c]); setText(""); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Comments — {list?.name}</DialogTitle>
          <DialogDescription>List‑level thread. @mention to notify.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
          {comments.map(c => (
            <div key={c.id} className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
              <div className="text-xs text-muted-foreground">{c.author} • {fmtISO(c.at)}</div>
              <div className="text-sm">{c.text}</div>
            </div>
          ))}
          {comments.length===0 && <div className="text-xs text-muted-foreground">No comments yet.</div>}
        </div>
        <div className="mt-2">
          <Textarea rows={3} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a comment… Use @ to mention." />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Close</Button>
          <Button className="cursor-pointer" onClick={add}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
