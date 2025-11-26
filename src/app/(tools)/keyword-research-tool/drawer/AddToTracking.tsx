import * as React from "react";
import {
  Globe, Smartphone, Plus, Trash2, Info, X, AlertTriangle, Check, Loader2, ChevronDown,
  Target, Briefcase, Settings2
} from "lucide-react";

/* ---------- shadcn/ui (expected in your codebase) ---------- */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import {
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
} from "@/components/ui/tooltip";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell
} from "@/components/ui/table";

/* ============================================================
   ============== Minimal toast system (inline) ================
   (Fixes: Module not found '@/components/ui/use-toast')
   ============================================================ */
type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "info";
  duration?: number; // ms
};
type ToastCtx = { toast: (t: Omit<ToastItem, "id">) => void };
const ToastContext = React.createContext<ToastCtx | null>(null);
function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ToastProvider = ({ children }: React.PropsWithChildren) => {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, duration: 3800, variant: "default", ...t };
    setItems((prev) => [...prev, item]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, item.duration);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster items={items} onClose={(id) => setItems((p) => p.filter((x) => x.id !== id))} />
    </ToastContext.Provider>
  );
};

const Toaster: React.FC<{ items: ToastItem[]; onClose: (id: string) => void }> = ({ items, onClose }) => {
  const tone = (v?: ToastItem["variant"]) =>
    v === "destructive" ? "#EF4444" :
    v === "success"     ? "#10B981" :
    v === "info"        ? "#0EA5E9" : "#111827";
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {items.map((t) => (
        <div key={t.id}
             className="min-w-[280px] max-w-[360px] rounded-md border bg-white px-3 py-2 shadow-sm"
             style={{ borderColor: "var(--wr-border,#E5E7EB)" }}>
          <div className="flex items-start gap-2">
            <div className="mt-[2px]">
              {t.variant === "destructive" ? <AlertTriangle className="h-4 w-4" style={{ color: tone(t.variant) }} /> :
               t.variant === "success" ? <Check className="h-4 w-4" style={{ color: tone(t.variant) }} /> :
               <Info className="h-4 w-4" style={{ color: tone(t.variant) }} />}
            </div>
            <div className="flex-1">
              {t.title && <div className="text-sm font-semibold" style={{ color: tone(t.variant) }}>{t.title}</div>}
              {t.description && <div className="text-sm text-[#374151]">{t.description}</div>}
            </div>
            <button aria-label="Close toast" className="p-1 rounded hover:bg-[#F3F4F6] cursor-pointer"
                    onClick={() => onClose(t.id)}><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ============================================================
   ================== Visual tokens / utils ===================
   ============================================================ */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // branded icons and accents
  action: "var(--wr-action,#0077FF)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
  radius: "6px",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const formatInt = (n: number) => (n >= 1_000_000 ? (n/1_000_000).toFixed(1)+"M" : n >= 1_000 ? (n/1_000).toFixed(1)+"k" : String(n));

/* modern Chip */
const Chip: React.FC<{ children: React.ReactNode; active?: boolean; muted?: boolean; className?: string }> = ({ children, active, muted, className }) => (
  <span
    className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]", className, active && "font-semibold")}
    style={{ borderColor: TK.borderLight, background: active ? TK.pastel : muted ? "#F9FAFB" : "#FFF" }}
  >{children}</span>
);

  /* Domain badge with favicon */
  const DomainBadge: React.FC<{ domain?: string; className?: string }> = ({ domain, className }) => {
    const [showImg, setShowImg] = React.useState(true);

    if (!domain) return null;
    
    const hostname = domain.replace(/^https?:\/\//, "").split("/")[0];
    const src = `https://icons.duckduckgo.com/ip3/${hostname}.ico`;

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm", className)}
          style={{ borderColor: TK.borderLight, background: "#FFF" }}>
      {showImg ? (
        <img
          src={src}
          alt=""
          className="h-4 w-4 rounded-sm"
          onError={() => setShowImg(false)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="inline-flex items-center justify-center h-4 w-4 rounded-sm text-[10px]" style={{ background:"#E6F4FA", color: TK.brand }}>
          {hostname.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate max-w-[180px]">{hostname}</span>
    </span>
  );
};

/* ============================================================
   ========================= Types ============================
   ============================================================ */
type Device = "desktop" | "mobile";
type Locale = { country: string; language: string };

type Project = { id: string; name: string; domain?: string };

type TrackedKey = { keyword: string; locale: Locale; device: Device };

type AddTrackingPayload = {
  projectId: string;
  keywords: string[];
  locales: Locale[];
  devices: Device[];
  group: string;
  frequency: "daily" | "every3" | "weekly";
  startDate: string; // ISO yyyy-mm-dd
  backfillFromGsc: boolean;
  normalize: boolean;
};

type AddToTrackingModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  from?: string; // telemetry source
  domainAware: boolean;
  project?: Project | null;                 // if provided, lock to this project
  availableProjects?: Project[];            // if not provided, simple mock select hidden
  queryBarLocale?: Locale;                  // prefill
  queryBarDevice?: Device;                  // prefill
  initialKeywords: string[];                // required
  trackedAlready?: TrackedKey[];            // for dedupe (optional)
  onAdd?: (payload: AddTrackingPayload) => Promise<{ added: number; skipped: number; duplicates: number }>;
  queryBarDomain?: string;                  // optional: show mismatch warning
};

/* ============================================================
   ======================= Telemetry stub =====================
   ============================================================ */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  const envelope = { event, ts: new Date().toISOString(), props };
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail: envelope }));
}

/* ============================================================
   =================== Helper computations ====================
   ============================================================ */
const DEFAULT_LOCALES: Locale[] = [
  { country: "US", language: "en" },
  { country: "GB", language: "en" },
  { country: "IN", language: "en" },
  { country: "DE", language: "de" },
];

function keyOf(l: Locale, d: Device, kw: string) {
  return `${kw.toLowerCase().trim()}__${l.country}-${l.language}__${d}`;
}

function dedupe(
  keywords: string[],
  locales: Locale[],
  devices: Device[],
  tracked: TrackedKey[] = []
) {
  const uniqueSel = new Set<string>();
  const trackedSet = new Set(tracked.map(t => keyOf(t.locale, t.device, t.keyword)));
  let duplicates = 0;

  for (const kw of keywords) {
    for (const loc of locales) {
      for (const dev of devices) {
        const k = keyOf(loc, dev, kw);
        if (uniqueSel.has(k)) continue;
        uniqueSel.add(k);
        if (trackedSet.has(k)) duplicates++;
      }
    }
  }
  return { uniqueCount: uniqueSel.size, duplicates };
}

function creditEstimate(nKeywords: number, nTargets: number, freq: "daily" | "every3" | "weekly") {
  const perMonth = freq === "daily" ? 30 : freq === "every3" ? 10 : 4;
  return nKeywords * nTargets * perMonth;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

/* ============================================================
   =================== AddToTrackingModal =====================
   ============================================================ */
export const AddToTrackingModal: React.FC<AddToTrackingModalProps> = ({
  open, onOpenChange,
  from = "unknown",
  domainAware,
  project,
  availableProjects = [
    { id: "prj_1", name: "Main Site", domain: "example.com" },
    { id: "prj_2", name: "Blog", domain: "blog.example.com" },
  ],
  queryBarLocale = { country: "US", language: "en" },
  queryBarDevice = "desktop",
  initialKeywords,
  trackedAlready = [],
  onAdd,
  queryBarDomain,
}) => {
  const { toast } = useToast();

  // gate if not domain-aware or no project
  const needsGate = !domainAware || !project?.id;

  // state
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(project?.id ?? availableProjects[0]?.id ?? "");
  const [group, setGroup] = React.useState<string>(() => `KR — ${todayISO()}`);
  const [frequency, setFrequency] = React.useState<"daily" | "every3" | "weekly">("daily");
  const [startDate, setStartDate] = React.useState<string>(todayISO());
  const [backfill, setBackfill] = React.useState<boolean>(true);
  const [normalize, setNormalize] = React.useState<boolean>(true);
  const [previewOpen, setPreviewOpen] = React.useState<boolean>(false);
  const [adding, setAdding] = React.useState<boolean>(false);

  // location/device matrix (rows)
  type TargetRow = { locale: Locale; device: Device; enabled: boolean; unavailable?: boolean };
  const [targets, setTargets] = React.useState<TargetRow[]>([
    { locale: queryBarLocale, device: queryBarDevice, enabled: true }
  ]);

  // domain mismatch banner
  const selectedProject = React.useMemo(() => (project?.id ? project : availableProjects.find(p => p.id === selectedProjectId)), [project, selectedProjectId, availableProjects]);
  const mismatch = !!(queryBarDomain && selectedProject?.domain && selectedProject.domain !== queryBarDomain);

  // compute dedupe summary
  const activeTargets = targets.filter(t => t.enabled && !t.unavailable);
  const { uniqueCount, duplicates } = React.useMemo(() => {
    const locs = activeTargets.map(t => t.locale);
    const devs = activeTargets.map(t => t.device);
    const kws = (normalize ? initialKeywords.map(k => k.trim()) : initialKeywords).filter(Boolean);
    return dedupe(kws, locs, devs, trackedAlready);
  }, [targets, trackedAlready, initialKeywords, normalize]);

  const willAddKeywords = Math.max(0, uniqueCount - duplicates);
  const creditEstimateValue = creditEstimate(initialKeywords.length, activeTargets.length, frequency);

  function addRow() {
    const last = targets[targets.length - 1] ?? { locale: queryBarLocale, device: queryBarDevice };
    const nextDev: Device = last.device === "desktop" ? "mobile" : "desktop";
    setTargets(t => [...t, { locale: last.locale, device: nextDev, enabled: true }]);
  }
  function updateRow(i: number, patch: Partial<TargetRow>) {
    setTargets(t => t.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }
  function removeRow(i: number) {
    setTargets(t => t.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (needsGate) {
      toast({ title: "Project required", description: "Connect a project to start tracking rankings.", variant: "info" });
      return;
    }
    if (!selectedProjectId) {
      toast({ title: "Select a project", description: "Please choose a project for tracking.", variant: "info" });
      return;
    }
    if (!initialKeywords.length || activeTargets.length === 0) {
      toast({ title: "Nothing to add", description: "Provide keywords and at least one location/device.", variant: "info" });
      return;
    }
    setAdding(true);
    try {
      const locales = activeTargets.map(t => t.locale);
      const devices = activeTargets.map(t => t.device);
      const payload: AddTrackingPayload = {
        projectId: selectedProjectId,
        keywords: normalize ? initialKeywords.map(k => k.trim()).filter(Boolean) : initialKeywords,
        locales,
        devices,
        group,
        frequency,
        startDate,
        backfillFromGsc: backfill,
        normalize
      };

      krTrack("kr.tracking.opened", { from, count: payload.keywords.length, projectId: payload.projectId });
      const res = await (onAdd
        ? onAdd(payload)
        : mockAddTracking(payload)); // demo fallback

      toast({
        title: `Added ${res.added} to Tracking`,
        description: res.duplicates > 0
          ? `${res.duplicates} duplicate${res.duplicates > 1 ? "s" : ""} skipped.`
          : "All items were new.",
        variant: "success"
      });
      krTrack("kr.tracking.added", {
        added: res.added, skipped: res.skipped, duplicates: res.duplicates,
        locales: locales.length, devices: devices.length, frequency
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to add to Tracking", description: e?.message || "Please try again.", variant: "destructive" });
      krTrack("kr.tracking.failed", { reason: e?.message || "unknown" });
    } finally {
      setAdding(false);
    }
  }

  // demo fallback backend
  async function mockAddTracking(_: AddTrackingPayload) {
    await new Promise(r => setTimeout(r, 900));
    return { added: willAddKeywords, skipped: 0, duplicates };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-auto" onOpenAutoFocus={(e)=>e.preventDefault()} style={FONTS}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: TK.brand }} />
            Add to Tracking
            <span className="text-xs font-normal text-muted-foreground">
              {initialKeywords.length === 1 ? `— ${initialKeywords[0]}` : `— ${initialKeywords.length} keywords`}
            </span>
          </DialogTitle>
          <DialogDescription>Choose project, locations & options. We’ll dedupe against tracked items in this project.</DialogDescription>
        </DialogHeader>

        {/* Domain-aware gating */}
        {needsGate ? (
          <div className="rounded-md border p-4 bg-[#FAFBFF]" style={{ borderColor: TK.borderLight }}>
            <div className="text-sm font-medium mb-1">Connect a project to track rankings for these keywords.</div>
            <div className="text-sm text-muted-foreground mb-3">Tracking shows your daily ranks, near‑wins, and progress in Opportunities.</div>
            <div className="flex items-center gap-2">
              <Button className="cursor-pointer" onClick={()=>toast({ title: "Project flow", description: "Open Create/Connect Project flow.", variant: "info" })}>Create/Connect Project</Button>
              <Button variant="outline" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mismatch banner (optional) */}
            {mismatch && (
              <div className="rounded-md border p-2 mb-2 flex items-start gap-2" style={{ borderColor: TK.border }}>
                <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: TK.critical }} />
                <div className="text-sm">
                  <b>Domain mismatch:</b> Tracking will be added for project{" "}
                  <DomainBadge domain={selectedProject?.domain} /> which differs from the Query Bar domain{" "}
                  <DomainBadge domain={queryBarDomain} />.
                </div>
              </div>
            )}

            {/* Project & summary */}
            <section className="rounded-md border" style={{ borderColor: TK.borderLight }}>
              <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
                <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                  <Briefcase className="h-4 w-4" style={{ color: TK.brand }} /> Project & scope
                </h3>
                <div className="text-xs text-muted-foreground">
                  Will add <b>{willAddKeywords}</b> ({initialKeywords.length} × {targets.filter(t=>t.enabled && !t.unavailable).length} minus {duplicates} duplicates)
                </div>
              </div>
              <div className="p-3 space-y-3">
                {/* Project select (read-only chip if locked) */}
                {project?.id ? (
                  <div className="inline-flex items-center gap-2 text-sm">
                    <Chip>
                      <Briefcase className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                      <span className="font-medium">{project.name}</span>
                    </Chip>
                    {project.domain && <DomainBadge domain={project.domain} />}
                  </div>
                ) : (
                  <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
                    <label className="text-sm text-muted-foreground">Project</label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="h-9 w-full cursor-pointer"><SelectValue placeholder="Choose project" /></SelectTrigger>
                      <SelectContent>
                        {availableProjects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}{p.domain ? ` — ${p.domain}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </section>

            {/* Location & device */}
            <section className="rounded-md border mt-3" style={{ borderColor: TK.borderLight }}>
              <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
                <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                  <Globe className="h-4 w-4" style={{ color: TK.brand }} /> Location & device
                </h3>
                <button
                  className="text-sm text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer"
                  onClick={addRow}
                >Add another location/device</button>
              </div>
              <div className="p-3">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[46px] text-center">On</TableHead>
                      <TableHead className="w-[220px]">Country–Language</TableHead>
                      <TableHead className="w-[200px]">Device</TableHead>
                      <TableHead className="w-[120px] text-center">Status</TableHead>
                      <TableHead className="w-[60px] text-center">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((row, i) => (
                      <TableRow key={i} className={cn(row.unavailable && "opacity-70")}>
                        <TableCell className="text-center">
                          <Checkbox checked={row.enabled} onCheckedChange={(v)=>updateRow(i, { enabled: Boolean(v) })} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" style={{ color: TK.brand }} />
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="h-8 px-2 justify-between w-[180px] cursor-pointer">
                                  {row.locale.country}-{row.locale.language} <ChevronDown className="h-4 w-4 ml-2 opacity-60" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px]">
                                <div className="text-xs text-muted-foreground mb-1">Pick a locale</div>
                                <div className="space-y-1">
                                  {DEFAULT_LOCALES.map(l => (
                                    <Button key={`${l.country}-${l.language}`} variant="ghost" className="w-full justify-start h-8 cursor-pointer"
                                            onClick={()=>updateRow(i,{ locale: l })}>
                                      {l.country}-{l.language}
                                    </Button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-2">
                            <div
                              className={cn(
                                "rounded-full border px-2 py-0.5 cursor-pointer",
                                row.device === "desktop" ? "font-semibold" : "opacity-70"
                              )}
                              style={{ borderColor: TK.borderLight, background: row.device === "desktop" ? TK.pastel : "#FFF" }}
                              onClick={()=>updateRow(i,{ device: "desktop" })}
                            >
                              Desktop
                            </div>
                            <div
                              className={cn(
                                "rounded-full border px-2 py-0.5 cursor-pointer",
                                row.device === "mobile" ? "font-semibold" : "opacity-70"
                              )}
                              style={{ borderColor: TK.borderLight, background: row.device === "mobile" ? TK.pastel : "#FFF" }}
                              onClick={()=>updateRow(i,{ device: "mobile" })}
                            >
                              Mobile
                            </div>
                            <Smartphone className="h-4 w-4 opacity-50" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {row.unavailable ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                                  style={{ borderColor: TK.borderLight, color: TK.warn }}>
                              <AlertTriangle className="h-3.5 w-3.5" /> Unavailable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
                                  style={{ borderColor: TK.borderLight, color: TK.ok }}>
                              <Check className="h-3.5 w-3.5" /> OK
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="cursor-pointer" onClick={()=>removeRow(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {targets.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No targets yet. Add one.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Options */}
            <section className="rounded-md border mt-3" style={{ borderColor: TK.borderLight }}>
              <div className="px-3 py-2 border-b flex items-center gap-2" style={{ borderColor: TK.borderLight }}>
                <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                  <Settings2 className="h-4 w-4" style={{ color: TK.brand }} /> Options
                </h3>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <label className="text-sm text-muted-foreground">Group/Label</label>
                  <Input value={group} onChange={(e)=>setGroup(e.target.value)} placeholder="e.g., KR — 2025‑09‑08" />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <label className="text-sm text-muted-foreground">Frequency</label>
                  <Select value={frequency} onValueChange={(v:any)=>setFrequency(v)}>
                    <SelectTrigger className="h-9 cursor-pointer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="every3">Every 3 days</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <label className="text-sm text-muted-foreground">Start tracking</label>
                  <Input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value || todayISO())} />
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <label className="text-sm text-muted-foreground">Backfill (GSC)</label>
                  <div className="inline-flex items-center gap-2">
                    <Checkbox checked={backfill} onCheckedChange={(v)=>setBackfill(Boolean(v))} />
                    <span className="text-sm">Estimate last 28d from GSC</span>
                  </div>
                </div>
                <div className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <label className="text-sm text-muted-foreground">Normalize</label>
                  <div className="inline-flex items-center gap-2">
                    <Checkbox checked={normalize} onCheckedChange={(v)=>setNormalize(Boolean(v))} />
                    <span className="text-sm">Trim whitespace; keep casing</span>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-between mt-2">
                  <button
                    className="text-sm text-[var(--wr-action,#0077FF)] hover:underline underline-offset-2 cursor-pointer"
                    onClick={()=>setPreviewOpen(v => !v)}
                  >
                    {previewOpen ? "Hide preview" : "Preview"}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    Estimated monthly credits: <b>{formatInt(creditEstimateValue)}</b> ({initialKeywords.length} keywords × {activeTargets.length} targets × {frequency === "daily" ? "30" : frequency === "every3" ? "10" : "4"})
                  </div>
                </div>

                {previewOpen && (
                  <div className="md:col-span-2 rounded border p-2" style={{ borderColor: TK.borderLight }}>
                    <div className="text-xs font-medium mb-1" style={{ color: TK.muted }}>Preview (first 10)</div>
                    <div className="flex flex-wrap gap-2">
                      {initialKeywords.slice(0,10).map((kw,i) => (
                        <span key={i} className="inline-flex items-center gap-2 border rounded px-2 py-1 text-sm" style={{ borderColor: TK.borderLight }}>
                          {kw}
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border"
                                style={{ borderColor: TK.borderLight }}>
                            {activeTargets.map((t,idx)=><span key={idx} className="opacity-70">{t.locale.country}-{t.locale.language}/{t.device}</span>)}
                          </span>
                        </span>
                      ))}
                      {initialKeywords.length > 10 && (
                        <span className="text-xs text-muted-foreground">+ {initialKeywords.length - 10} more…</span>
                      )}
                    </div>
                    {duplicates > 0 && (
                      <div className="mt-2 inline-flex items-center gap-2 text-xs px-2 py-1 rounded border"
                           style={{ borderColor: TK.borderLight, background:"#FFF3F3", color: TK.critical }}>
                        <AlertTriangle className="h-3.5 w-3.5" /> {duplicates} already tracked (will be skipped)
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Long queries (&gt; 8 words) are supported, but rank coverage may be lower.
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <DialogFooter className="mt-2">
          {!needsGate && (
            <div className="mr-auto text-xs text-muted-foreground">
              Dedupe by <b>keyword + locale + device + project</b>.
            </div>
          )}
          <Button variant="outline" className="cursor-pointer" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button className="cursor-pointer" onClick={handleSubmit} disabled={needsGate || adding || willAddKeywords <= 0}>
            {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add {willAddKeywords} to Tracking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ============================================================
   ================== Demo (Safe to remove) ===================
   ============================================================ */
export default function DemoAddToTrackingModal() {
  const [open, setOpen] = React.useState(false);
  const initialKeywords = [
    "technical seo checklist",
    "best technical seo tools",
    "site speed audit",
    "schema markup guide",
    "seo vs sem",
  ];
  const tracked: TrackedKey[] = [
    { keyword: "technical seo checklist", locale: { country:"US", language:"en" }, device: "desktop" },
    { keyword: "seo vs sem", locale: { country:"US", language:"en" }, device: "desktop" },
  ];

  return (
    <ToastProvider>
      <TooltipProvider delayDuration={150}>
        <div className="p-4 space-y-4" style={FONTS}>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold inline-flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: TK.brand }} /> Add to Tracking — Demo
            </h1>
            <Button className="cursor-pointer" onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Open Modal</Button>
          </div>

          <AddToTrackingModal
            open={open}
            onOpenChange={setOpen}
            from="analyze_row"
            domainAware={true}
            project={{ id:"prj_1", name:"Main Site", domain:"example.com" }}
            availableProjects={[
              { id:"prj_1", name:"Main Site", domain:"example.com" },
              { id:"prj_2", name:"Blog", domain:"blog.example.com" },
            ]}
            queryBarLocale={{ country:"US", language:"en" }}
            queryBarDevice="desktop"
            queryBarDomain="example.com"
            initialKeywords={initialKeywords}
            trackedAlready={tracked}
            onAdd={async (payload) => {
              // Replace this with your real API call
              await new Promise(r => setTimeout(r, 900));
              // fake: treat 2 as duplicates
              const duplicates = 2;
              const locs = payload.locales.length;
              const devs = payload.devices.length;
              const uniqueCount = payload.keywords.length * locs * devs;
              return { added: Math.max(0, uniqueCount - duplicates), skipped: 0, duplicates };
            }}
          />
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}


