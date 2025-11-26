"use client";

import React, { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Copy as SaveAs,
  Download,
  Share2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Eye,
  EyeOff,
  Info,
  LayoutDashboard,
  Building2,
  Shield,
  Folder,
  User,
  SlidersHorizontal,
  Gauge,
  TrendingUp,
  AlertTriangle,
  ListChecks,
  Users,
  Network,
  Boxes,
  BarChart3,
  ShieldCheck,
  GitBranch,
  Link2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Wand2,
  Trash2,
  PencilLine,
} from "lucide-react";

/* -----------------------------------------------------------------------------
   TOKENS
----------------------------------------------------------------------------- */
const TK = {
  brand: "#008CCD",
  brandTint: "rgba(0,140,205,0.10)",
  text: "#111827",
  muted: "#6B7280",
  card: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  radius: "12px",
};
const fontStack =
  'Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans"';

const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

/* -----------------------------------------------------------------------------
   TYPES
----------------------------------------------------------------------------- */
type Scope = "workspace" | "role" | "project" | "user";
type Persona = "solo" | "am" | "techlead" | "custom";
type SectionKey =
  | "kpiBar"
  | "risk"
  | "movers"
  | "tasks"
  | "directory"
  | "matrix"
  | "stale"
  | "crawlCwv"
  | "indexability"
  | "https"
  | "redirects"
  | "teamAccess";

type SectionMeta = {
  key: SectionKey;
  label: string;
  tip: string;
  icon:
    | React.FC<React.SVGProps<SVGSVGElement>>
    | ((p: React.SVGProps<SVGSVGElement>) => ReactElement);
};

type View = {
  id: string;
  name: string;
  scope: Scope;
  scopeRef?: string; // roleId(s)/projectId(s)/"me"/"__ALL__"
  persona?: Persona | string;
  sections: Array<{ key: SectionKey; visible: boolean }>;
  order: SectionKey[];
  options?: Record<string, unknown>;
  updatedAt: string; // ISO
  updatedBy: string;
  isDefault?: boolean;
};

/* -----------------------------------------------------------------------------
   SECTION CATALOG
----------------------------------------------------------------------------- */
const S: SectionMeta[] = [
  { key: "kpiBar", label: "KPI Bar", tip: "Top KPIs across the workspace", icon: Gauge },
  { key: "risk", label: "Risk & Alerts", tip: "Key risks & warnings", icon: AlertTriangle },
  { key: "movers", label: "Movers", tip: "Top winners & losers vs last period", icon: TrendingUp },
  { key: "tasks", label: "Workload & Tasks", tip: "Task load & urgent actions", icon: ListChecks },
  { key: "directory", label: "Client Directory", tip: "Portfolio directory", icon: Users },
  { key: "matrix", label: "Portfolio Matrix", tip: "Health/impact grid", icon: Boxes },
  { key: "stale", label: "Stale/At-Risk", tip: "Projects with stale signals", icon: Network },
  { key: "crawlCwv", label: "Crawl & CWV Tiles", tip: "Crawl & Core Web Vitals tiles", icon: BarChart3 },
  { key: "indexability", label: "Indexability", tip: "Indexable vs blocked pages", icon: ShieldCheck },
  { key: "https", label: "HTTPS/SSL", tip: "HTTPS adoption & SSL state", icon: Link2 },
  { key: "redirects", label: "Redirects", tip: "Redirect chains & loops", icon: GitBranch },
  { key: "teamAccess", label: "Team & Access", tip: "Team members with access", icon: Users },
];

/* -----------------------------------------------------------------------------
   PERSONA SEEDS & PRODUCT DEFAULT
----------------------------------------------------------------------------- */
const personaSeeds: Record<Exclude<Persona, "custom">, SectionKey[]> = {
  solo: ["kpiBar", "risk", "movers", "tasks"],
  am: ["directory", "matrix", "stale", "tasks"],
  techlead: ["crawlCwv", "risk", "tasks"],
};

const productDefaultOrder: SectionKey[] = [
  "kpiBar",
  "risk",
  "movers",
  "tasks",
  "directory",
  "matrix",
  "stale",
  "crawlCwv",
  "indexability",
  "https",
  "redirects",
  "teamAccess",
];

/* -----------------------------------------------------------------------------
   LOCAL STORAGE (demo persistence)
----------------------------------------------------------------------------- */
const LS_KEY = "homePanel.settings.views.v2";
function loadViews(): View[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as View[]) : [];
  } catch {
    return [];
  }
}
function persistViews(v: View[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(v));
}

/* -----------------------------------------------------------------------------
   SMALL PRIMITIVES
----------------------------------------------------------------------------- */
function IconLabel({
  icon: Icon,
  children,
  className,
}: {
  icon: SectionMeta["icon"];
  children: React.ReactNode;
  className?: string;
}) {
  const I = Icon as any;
  return (
    <span className={cls("inline-flex items-center gap-1.5", className)}>
      <I className="h-4 w-4" style={{ color: TK.brand }} />
      {children}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      title={title}
      className={cls(
        "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2",
        active ? "font-semibold" : "",
        "hover:bg-white"
      )}
      style={{
        borderColor: TK.border,
        background: active ? TK.brandTint : "#FFFFFF",
        color: active ? TK.brand : TK.text,
      }}
      onClick={onClick}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}

function ChipDropdown({
  label,
  children,
  active,
  title,
  align = "left",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  title?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        title={title}
        className={cls(
          "h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-2",
          active ? "font-semibold" : ""
        )}
        style={{
          borderColor: TK.border,
          background: active ? TK.brandTint : "#FFFFFF",
          color: active ? TK.brand : TK.text,
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown className="h-4 w-4 opacity-70" />
      </button>
      {open && (
        <div
          className={cls(
            "absolute z-50 mt-2 w-[280px] rounded-md border bg-white p-3 text-sm shadow-lg",
            align === "right" ? "right-0" : "left-0"
          )}
          style={{ borderColor: TK.border }}
          onMouseLeave={() => setOpen(false)}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  "aria-label": aria,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ key: T; label: React.ReactNode }>;
  "aria-label"?: string;
}) {
  return (
    <div
      aria-label={aria}
      className="inline-flex rounded-md border p-0.5"
      style={{ borderColor: TK.border, background: "#FFFFFF" }}
      role="group"
    >
      {options.map((opt) => (
        <button
          key={String(opt.key)}
          className={cls(
            "px-3 py-1.5 text-sm rounded cursor-pointer focus:outline-none focus:ring-2",
            value === opt.key ? "font-semibold" : "text-gray-700"
          )}
          style={{
            background: value === opt.key ? TK.brandTint : "transparent",
            color: value === opt.key ? TK.brand : undefined,
          }}
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  title?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer" title={title}>
      <button
        role="switch"
        aria-checked={checked}
        className="h-5 w-9 rounded-full relative transition-colors border"
        style={{
          background: checked ? TK.brand : "#E5E7EB",
          borderColor: checked ? TK.brand : "#E5E7EB",
        }}
        onClick={() => onChange(!checked)}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0px)" }}
        />
      </button>
      {label ? <span className="text-sm">{label}</span> : null}
    </label>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/30" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="absolute left-1/2 top-12 -translate-x-1/2 rounded-lg border bg-white shadow-xl"
        style={{ width, borderColor: TK.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: TK.border }}>
          <div className="inline-flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" style={{ color: TK.brand }} />
            <div className="font-semibold">{title}</div>
          </div>
        </div>
        <div className="p-4">{children}</div>
        {footer ? (
          <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: TK.border }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1200]">
      <div className="rounded-md border bg-white px-3 py-2 text-sm shadow" style={{ borderColor: TK.border }}>
        {msg}
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   UTILS
----------------------------------------------------------------------------- */
const id = () => Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();

function defaultSections(order: SectionKey[]): Array<{ key: SectionKey; visible: boolean }> {
  return order.map((k) => ({ key: k, visible: true }));
}

function ensureAllSections(v: View): View {
  const allKeys = new Set<SectionKey>(S.map((x) => x.key));
  const known = new Set(v.sections.map((s) => s.key));
  const missing = [...allKeys].filter((k) => !known.has(k));
  return {
    ...v,
    sections: [...v.sections, ...missing.map((k) => ({ key: k, visible: false }))],
    order: [...v.order, ...missing],
  };
}

/* -----------------------------------------------------------------------------
   MAIN
----------------------------------------------------------------------------- */
type TabKey = "layout" | "views" | "export";

export default function HomePanelSettings() {
  /* ---------- top‑level state ---------- */
  const [tab, setTab] = useState<TabKey>("layout");

  const [scope, setScope] = useState<Scope>("workspace");
  const [persona, setPersona] = useState<Persona>("custom");

  const [roleSel, setRoleSel] = useState<Record<string, boolean>>({
    owner: false,
    admin: false,
    editor: false,
    viewer: false,
  });
  const roleValues = useMemo(() => Object.keys(roleSel).filter((k) => roleSel[k]), [roleSel]);

  const [projectSel, setProjectSel] = useState<Record<string, boolean>>({
    "wranker.com": false,
    "app.w3era.com": false,
    "client-site.io": false,
  });
  const projectValues = useMemo(() => Object.keys(projectSel).filter((k) => projectSel[k]), [projectSel]);

  // scopeRef logic — ensures Sections & Layout is ALWAYS editable in Role/Project/User
  const scopeRef: string | undefined =
    scope === "workspace"
      ? undefined
      : scope === "role"
      ? roleValues.join(",") || "__ALL__"
      : scope === "project"
      ? projectValues.join(",") || "__ALL__"
      : "me";

  const [views, setViews] = useState<View[]>(() => {
    const existing = loadViews();
    if (existing.length) return existing;
    const base: View = ensureAllSections({
      id: id(),
      name: "Product Default",
      scope: "workspace",
      sections: defaultSections(productDefaultOrder),
      order: [...productDefaultOrder],
      updatedAt: nowISO(),
      updatedBy: "me",
      isDefault: true,
    });
    persistViews([base]);
    return [base];
  });

  const metaByKey = useMemo(
    () => Object.fromEntries(S.map((m) => [m.key, m] as const)) as Record<SectionKey, SectionMeta>,
    []
  );

  /* ---------- view filtering / active & edit buffer ---------- */
  const scopedViews = useMemo(
    () => views.filter((v) => v.scope === scope && (v.scopeRef ?? "__WORK__") === (scopeRef ?? "__WORK__")),
    [views, scope, scopeRef]
  );

  const [activeViewId, setActiveViewId] = useState<string | undefined>(() => scopedViews[0]?.id);
  useEffect(() => {
    setActiveViewId(scopedViews[0]?.id);
  }, [scope, scopeRef]); // reset selection when scope changes

  const currentSaved = useMemo(
    () => scopedViews.find((v) => v.id === activeViewId) || scopedViews[0] || null,
    [scopedViews, activeViewId]
  );

  // Working copy (always present) — if no saved view exists yet, start from product defaults for this scope
  const [edit, setEdit] = useState<View>(() => {
    const seed: View =
      currentSaved ??
      ensureAllSections({
        id: "__unsaved__",
        name: "Unsaved View",
        scope,
        scopeRef,
        sections: defaultSections(productDefaultOrder),
        order: [...productDefaultOrder],
        updatedAt: nowISO(),
        updatedBy: "me",
      });
    return { ...seed };
  });

  useEffect(() => {
    const seed: View =
      currentSaved ??
      ensureAllSections({
        id: "__unsaved__",
        name: "Unsaved View",
        scope,
        scopeRef,
        sections: defaultSections(productDefaultOrder),
        order: [...productDefaultOrder],
        updatedAt: nowISO(),
        updatedBy: "me",
      });
    setEdit({ ...seed });
  }, [currentSaved?.id, scope, scopeRef]);

  const unsaved = useMemo(() => JSON.stringify(edit) !== JSON.stringify(currentSaved ?? {}), [edit, currentSaved]);

  /* ---------- general knobs ---------- */
  const [defaultOnOpen, setDefaultOnOpen] = useState<string>("auto");
  const [refresh, setRefresh] = useState<"manual" | "15m" | "hourly" | "daily">("daily");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  /* ---------- export/share settings (NO color customization) ---------- */
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [paper, setPaper] = useState<"A4" | "Letter">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [includeCSV, setIncludeCSV] = useState<boolean>(true);
  const [includeChartsAsImages, setIncludeChartsAsImages] = useState<boolean>(true);
  const [includeMethodology, setIncludeMethodology] = useState<boolean>(false);

  const [shareTTL, setShareTTL] = useState<"7" | "30" | "90">("30");
  const [shareRoles, setShareRoles] = useState<Record<string, boolean>>({ viewer: true, editor: false, admin: false });
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  /* ---------- transient UI ---------- */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState<string>("New view");
  const [toast, setToast] = useState<string | null>(null);

  /* ---------- reorder & visibility helpers ---------- */
  const order = edit?.order ?? [];
  const secMap = useMemo(() => {
    const m: Record<SectionKey, boolean> = {} as any;
    edit?.sections.forEach((s) => (m[s.key] = s.visible));
    return m;
  }, [edit?.sections]);

  function setVisible(k: SectionKey, v: boolean) {
    setEdit({
      ...edit,
      sections: edit.sections.map((s) => (s.key === k ? { ...s, visible: v } : s)),
      updatedAt: nowISO(),
    });
  }
  function reorder(from: number, to: number) {
    const arr = [...edit.order];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setEdit({ ...edit, order: arr, updatedAt: nowISO() });
  }

  // mouse DnD
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // keyboard reorder
  const [kbdGrab, setKbdGrab] = useState<number | null>(null);
  function onRowKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      setKbdGrab(kbdGrab === i ? null : i);
      return;
    }
    if (kbdGrab === null) return;
    if (e.key === "Escape") {
      setKbdGrab(null);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const tgt = Math.max(0, kbdGrab - 1);
      if (tgt !== kbdGrab) {
        reorder(kbdGrab, tgt);
        setKbdGrab(tgt);
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const tgt = Math.min(order.length - 1, kbdGrab + 1);
      if (tgt !== kbdGrab) {
        reorder(kbdGrab, tgt);
        setKbdGrab(tgt);
      }
    }
    if (e.key === "Enter") setKbdGrab(null);
  }

  /* ---------- Save / Save As / Reset ---------- */
  function doSave(asNew?: boolean, nameOverride?: string) {
    // Build a view with current scope/scopeRef
    const withScope: View = ensureAllSections({
      ...edit,
      name: nameOverride ?? edit.name ?? "Untitled view",
      scope,
      scopeRef,
      updatedAt: nowISO(),
      updatedBy: "me",
      id: asNew || !views.some((v) => v.id === edit.id) ? id() : edit.id,
    });

    // Upsert
    const next = views.slice();
    const ix = next.findIndex((v) => v.id === withScope.id);
    if (ix >= 0 && !asNew) next[ix] = withScope;
    else next.push(withScope);

    setViews(next);
    persistViews(next);
    setActiveViewId(withScope.id);
    setToast(asNew ? "Saved as new view" : "Saved");
  }

  function onSave() {
    // If we are editing a not-yet-saved working copy, route to Save As (name prompt)
    const exists = views.some((v) => v.id === edit.id);
    if (!exists) {
      setSaveAsName(edit.name || "New view");
      setSaveAsOpen(true);
      return;
    }
    doSave(false);
  }

  function onSaveAs(name: string) {
    doSave(true, name);
    setSaveAsOpen(false);
  }

  function resetToProductDefaults() {
    const base: View = ensureAllSections({
      ...edit,
      sections: defaultSections(productDefaultOrder),
      order: [...productDefaultOrder],
      updatedAt: nowISO(),
    });
    setEdit(base);
    setToast("Reset to product defaults");
  }

  function setDefaultForScope(v: View) {
    const next = views.map((x) =>
      x.scope === v.scope && (x.scopeRef ?? "__WORK__") === (v.scopeRef ?? "__WORK__")
        ? { ...x, isDefault: x.id === v.id }
        : x
    );
    setViews(next);
    persistViews(next);
    setToast("Default updated");
  }

  function applyPersona(p: Exclude<Persona, "custom">) {
    setPersona(p);
    const seedOrder = personaSeeds[p];
    let seeded: View = ensureAllSections({
      ...edit,
      order: [...seedOrder, ...productDefaultOrder.filter((k) => !seedOrder.includes(k))],
      sections: defaultSections(seedOrder).map((s) => ({ ...s, visible: true })),
      updatedAt: nowISO(),
      persona: p,
    });
    seeded.sections = S.map((m) => seeded.sections.find((x) => x.key === m.key) ?? { key: m.key, visible: false });
    setEdit(seeded);
    setToast(`Applied persona: ${p}`);
  }

  function scopeBadge() {
    if (scope === "workspace") return "Workspace";
    if (scope === "user") return "Me";
    if (scope === "role") return roleValues.length ? `Role: ${roleValues.join(", ")}` : "Role: All";
    if (scope === "project") return projectValues.length ? `Project: ${projectValues.join(", ")}` : "Project: All";
    return "Scope";
  }

  function genShareLink() {
    const slug = id();
    const url = `${location.origin}/r/home/${slug}`;
    setShareUrl(url);
    setToast("Share link created (demo)");
  }

  /* ---------- TABS CONTENT ---------- */
  function LayoutTab() {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: TK.border }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: TK.border }}>
          <IconLabel icon={LayoutDashboard} className="font-semibold">
            Sections & Layout
          </IconLabel>
          <span className="text-xs text-gray-500">
            {scopeBadge()} • Drag to reorder. Toggle visibility. Keyboard: Space pick, ↑/↓ move, Enter drop, Esc cancel.
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: TK.border }}>
          {(order || []).map((k, i) => {
            const m = metaByKey[k];
            const visible = secMap[k] ?? false;
            const grabbed = kbdGrab === i;
            const isOver = overIndex === i && dragIndex !== null && dragIndex !== i;
            return (
              <div
                key={k}
                className={cls("relative px-3 py-2 flex items-center gap-3 group hover:bg-[#FAFCFF]")}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={() => {
                  if (dragIndex != null && overIndex != null && dragIndex !== overIndex) reorder(dragIndex, overIndex);
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setOverIndex(null);
                }}
              >
                {isOver && <div className="absolute -top-0.5 left-0 right-0 h-0.5" style={{ background: TK.brand }} />}

                <button
                  className="h-8 w-8 grid place-items-center rounded border opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-grab"
                  style={{ borderColor: TK.border }}
                  title="Drag"
                  onKeyDown={(e) => onRowKeyDown(i, e)}
                >
                  <GripVertical className="h-4 w-4" style={{ color: TK.brand }} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <m.icon className="h-4 w-4" style={{ color: TK.brand }} />
                    <span className="text-sm font-medium text-[#0B4C6C]">{m.label}</span>
                    {grabbed && <span className="text-xs text-gray-500">(moving)</span>}
                    {!visible && (
                      <span
                        className="ml-1 inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border"
                        style={{ borderColor: TK.border, color: TK.muted }}
                      >
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-1">{m.tip}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={visible} onChange={(v) => setVisible(k, v)} title="Show/Hide section" />
                  <button className="h-8 w-8 grid place-items-center rounded border" style={{ borderColor: TK.border }}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {order.length === 0 && <div className="px-4 py-10 text-sm text-gray-500">No sections available.</div>}
        </div>
      </div>
    );
  }

  function ViewsTab() {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: TK.border }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: TK.border }}>
          <div className="flex items-center gap-2">
            <IconLabel icon={LayoutDashboard} className="font-semibold">
              Saved Views
            </IconLabel>
            <span className="text-xs text-gray-500">{scopeBadge()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Chip
              title="New (product defaults)"
              onClick={() => {
                const unsaved: View = ensureAllSections({
                  id: "__unsaved__",
                  name: "Unsaved View",
                  scope,
                  scopeRef,
                  sections: defaultSections(productDefaultOrder),
                  order: [...productDefaultOrder],
                  updatedAt: nowISO(),
                  updatedBy: "me",
                });
                setEdit(unsaved);
                setActiveViewId(undefined);
                setTab("layout");
              }}
            >
              <IconLabel icon={Wand2}>New View</IconLabel>
            </Chip>
          </div>
        </div>

        <div className="p-3">
          {scopedViews.length === 0 ? (
            <div className="text-sm text-gray-600">No views in this scope yet. Create one with “New View”.</div>
          ) : (
            <div className="overflow-auto rounded-md border" style={{ borderColor: TK.border }}>
              <table className="w-full text-sm">
                <thead className="bg-white sticky top-0 z-10" style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
                  <tr>
                    <th className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700">Updated</th>
                    <th className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700">Default</th>
                    <th className="px-3 py-2 text-left text-[12px] font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedViews.map((v) => (
                    <tr key={v.id} className="border-t hover:bg-[#FAFCFF]" style={{ borderColor: TK.border }}>
                      <td className="px-3 py-2">{v.name}</td>
                      <td className="px-3 py-2">
                        <span className="text-gray-700">{v.updatedAt.slice(0, 10)}</span>
                      </td>
                      <td className="px-3 py-2">
                        {v.isDefault ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs" style={{ background: TK.brandTint, color: TK.brand }}>
                            Default
                          </span>
                        ) : (
                          <button
                            className="h-8 px-2 rounded border text-xs cursor-pointer hover:bg-white"
                            style={{ borderColor: TK.border }}
                            onClick={() => setDefaultForScope(v)}
                            title="Make default"
                          >
                            Make default
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            className="h-8 px-2 rounded border text-xs cursor-pointer hover:bg-white"
                            style={{ borderColor: TK.border }}
                            onClick={() => {
                              setActiveViewId(v.id);
                              setTab("layout");
                            }}
                            title="Open"
                          >
                            Open
                          </button>
                          <button
                            className="h-8 px-2 rounded border text-xs cursor-pointer hover:bg-white"
                            style={{ borderColor: TK.border }}
                            onClick={() => {
                              const copy: View = ensureAllSections({
                                ...v,
                                id: id(),
                                name: `${v.name} (Copy)`,
                                updatedAt: nowISO(),
                                updatedBy: "me",
                                isDefault: false,
                              });
                              const next = [...views, copy];
                              setViews(next);
                              persistViews(next);
                              setActiveViewId(copy.id);
                              setTab("layout");
                              setToast("Duplicated");
                            }}
                            title="Duplicate"
                          >
                            Duplicate
                          </button>
                          <button
                            className="h-8 px-2 rounded border text-xs cursor-pointer hover:bg-white"
                            style={{ borderColor: TK.border }}
                            onClick={() => {
                              const newName = prompt("Rename view", v.name);
                              if (!newName) return;
                              const next = views.map((x) => (x.id === v.id ? { ...x, name: newName, updatedAt: nowISO() } : x));
                              setViews(next);
                              persistViews(next);
                              setToast("Renamed");
                            }}
                            title="Rename"
                          >
                            <PencilLine className="h-3.5 w-3.5 inline mr-1" />
                            Rename
                          </button>
                          <button
                            className="h-8 px-2 rounded border text-xs cursor-pointer hover:bg-white"
                            style={{ borderColor: TK.border }}
                            onClick={() => {
                              if (v.isDefault) return alert("Cannot delete the default view. Make another default first.");
                              if (!confirm(`Delete view "${v.name}"?`)) return;
                              const next = views.filter((x) => x.id !== v.id);
                              setViews(next);
                              persistViews(next);
                              if (activeViewId === v.id) setActiveViewId(next.find((x) => x.scope === scope && (x.scopeRef ?? "__WORK__") === (scopeRef ?? "__WORK__"))?.id);
                              setToast("Deleted");
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  function ExportTab() {
    const visibleForExport = (order || []).filter((k) => edit?.options?.[`export.${k}`] ?? true);
    return (
      <div className="space-y-4">
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: TK.border }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: TK.border }}>
            <IconLabel icon={Download} className="font-semibold">
              Export & Share
            </IconLabel>
            <span className="text-xs text-gray-500">White‑label export, CSV bundle, and secure share link</span>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
              <div className="font-medium mb-2">Branding</div>
              <label className="block mb-2">
                <span className="block mb-1">Logo (URL)</span>
                <input
                  className="w-full rounded border px-2 py-1"
                  style={{ borderColor: TK.border }}
                  placeholder="https://…/logo.png"
                  value={brandLogo ?? ""}
                  onChange={(e) => setBrandLogo(e.target.value || null)}
                />
              </label>
              <div className="text-xs text-gray-500">Color customization is disabled (brand palette is fixed).</div>
            </div>

            <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
              <div className="font-medium mb-2">Page Setup</div>
              <label className="flex items-center justify-between gap-3 mb-2">
                <span>Paper size</span>
                <select
                  className="rounded border px-2 py-1 text-sm cursor-pointer"
                  style={{ borderColor: TK.border }}
                  value={paper}
                  onChange={(e) => setPaper(e.target.value as any)}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>Orientation</span>
                <select
                  className="rounded border px-2 py-1 text-sm cursor-pointer"
                  style={{ borderColor: TK.border }}
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as any)}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
            </div>

            <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
              <div className="font-medium mb-2">Content</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(order || []).map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!(edit?.options?.[`export.${k}`] ?? true)}
                      onChange={(e) =>
                        setEdit((x) => ({
                          ...x,
                          options: { ...(x.options || {}), [`export.${k}`]: e.target.checked },
                          updatedAt: nowISO(),
                        }))
                      }
                    />
                    <span>{metaByKey[k].label}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Export respects your current **Sections & Layout** visibility and order.
              </div>
            </div>

            <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
              <div className="font-medium mb-2">Data</div>
              <div className="grid grid-cols-2 gap-2">
                <Switch checked={includeCSV} onChange={setIncludeCSV} label="Include CSV bundle" />
                <Switch checked={includeChartsAsImages} onChange={setIncludeChartsAsImages} label="Include charts as images" />
                <Switch checked={includeMethodology} onChange={setIncludeMethodology} label="Add Methodology appendix" />
              </div>
            </div>

            <div className="rounded-md border p-3 lg:col-span-2" style={{ borderColor: TK.border }}>
              <div className="font-medium mb-2">Actions</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                  style={{ borderColor: TK.border }}
                  onClick={() => {
                    // CSV demo
                    const header = ["section_key", "label", "visible", "position"];
                    const lines = (order || []).map((k, i) =>
                      [k, metaByKey[k].label, String(!!(edit?.options?.[`export.${k}`] ?? true)), String(i + 1)].join(",")
                    );
                    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
                      type: "text/csv;charset=utf-8",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "home_panel_export.csv";
                    a.click();
                    URL.revokeObjectURL(a.href);
                    setToast("CSV exported (demo)");
                  }}
                  title="Export CSV (demo)"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export CSV
                </button>

                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                  style={{ borderColor: TK.border }}
                  onClick={() => {
                    // PDF payload demo
                    const payload = {
                      view: currentSaved?.name ?? edit?.name,
                      scope,
                      scopeRef,
                      paper,
                      orientation,
                      brandLogo,
                      includeCSV,
                      includeChartsAsImages,
                      includeMethodology,
                      sections: visibleForExport,
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], {
                      type: "application/json",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "report_payload.json";
                    a.click();
                    URL.revokeObjectURL(a.href);
                    setToast("PDF generated (payload demo)");
                  }}
                  title="Generate PDF (demo)"
                >
                  <FileText className="h-4 w-4" /> Generate PDF (demo)
                </button>

                <button
                  className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                  style={{ borderColor: TK.border }}
                  onClick={genShareLink}
                  title="Create share link"
                >
                  <Share2 className="h-4 w-4" /> Create Share Link
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Share links are scoped and should enforce TTL and allowed roles (demo). Admins can revoke.
              </div>

              {shareUrl && (
                <div className="mt-3 rounded border p-2 flex items-center justify-between" style={{ borderColor: TK.border }}>
                  <code className="text-xs truncate">{shareUrl}</code>
                  <button
                    className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                    style={{ borderColor: TK.border }}
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setToast("Copied");
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="flex items-center justify-between gap-3">
                  <span>Expiration</span>
                  <select
                    className="rounded border px-2 py-1 text-sm cursor-pointer"
                    style={{ borderColor: TK.border }}
                    value={shareTTL}
                    onChange={(e) => setShareTTL(e.target.value as any)}
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                  </select>
                </label>
                <div>
                  <div className="mb-1">Allowed roles</div>
                  {Object.keys(shareRoles).map((r) => (
                    <label key={r} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shareRoles[r]}
                        onChange={(e) => setShareRoles((s) => ({ ...s, [r]: e.target.checked }))}
                      />
                      <span className="capitalize">{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: TK.border }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: TK.border }}>
            <IconLabel icon={Eye} className="font-semibold">
              Preview
            </IconLabel>
            <span className="text-xs text-gray-500">Quick snapshot of sections included in export</span>
          </div>
          <div className="p-3 space-y-2 text-sm">
            {(order || [])
              .filter((k) => edit?.options?.[`export.${k}`] ?? true)
              .map((k) => {
                const m = metaByKey[k];
                return (
                  <div key={k} className="rounded-md border p-2 flex items-center gap-2" style={{ borderColor: TK.border }}>
                    <m.icon className="h-4 w-4" style={{ color: TK.brand }} />
                    <div className="font-medium">{m.label}</div>
                    <span className="text-xs text-gray-500">{m.tip}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- RIGHT SIDE: HOW IT WORKS ---------- */
  function HowItWorks() {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: TK.border }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: TK.border }}>
          <IconLabel icon={Info} className="font-semibold">
            How it works
          </IconLabel>
        </div>
        <div className="p-3 text-sm space-y-2">
          {tab === "layout" && (
            <>
              <p>Reorder and show/hide sections for the selected scope target. These settings define the layout of your Home Panel.</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Drag with the handle or use keyboard (Space, ↑/↓, Enter/Esc).</li>
                <li>Toggle visibility per section; changes are local until you **Save**.</li>
                <li>Use <b>Persona</b> to seed a starting layout (e.g., Solo, AM, Tech Lead).</li>
                <li><b>Scope precedence</b>: User &gt; Project &gt; Role &gt; Workspace.</li>
              </ul>
            </>
          )}
          {tab === "views" && (
            <>
              <p>Saved Views let you keep multiple layouts per scope and pick a default.</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Create a new view, rename, duplicate, delete, or make default.</li>
                <li>Open a view to edit it in **Sections & Layout**.</li>
                <li>Defaults apply when no personal override exists.</li>
              </ul>
            </>
          )}
          {tab === "export" && (
            <>
              <p>Export current layout to white‑label PDF/CSV and generate scoped share links.</p>
              <ul className="list-disc ml-5 space-y-1">
                <li>Brand logo is supported; color customization is disabled.</li>
                <li>Pick page setup and which sections to include. CSV bundles are optional.</li>
                <li>Share links are time‑limited; restrict to roles as needed.</li>
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ---------- HEADER ---------- */
  return (
    <section className="space-y-3" style={{ fontFamily: `var(--font-sans, ${fontStack})` }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b" style={{ borderColor: TK.border }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" style={{ color: TK.brand }} />
            <div className="text-lg font-semibold">Settings</div>
            <span className="text-sm text-gray-500">/ Home Panel</span>
            <span
              className="ml-2 px-2 py-0.5 rounded border text-xs text-muted-foreground"
              style={{ borderColor: TK.border }}
              title="Scope precedence: User › Project › Role › Workspace"
            >
              Precedence: User › Project › Role › Workspace
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Active view switcher (quick) */}
            <ChipDropdown
              label={
                <span className="inline-flex items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4" style={{ color: TK.brand }} />
                  {currentSaved ? currentSaved.name : edit.name}
                </span>
              }
              align="right"
              title="Active View"
            >
              <div className="text-sm font-medium mb-2">Views in this scope</div>
              <div className="max-h-64 overflow-auto pr-1 space-y-1">
                {scopedViews.map((v) => (
                  <div
                    key={v.id}
                    className={cls(
                      "flex items-center justify-between gap-2 px-2 py-1 rounded cursor-pointer hover:bg-[#F7FAFC]",
                      v.id === activeViewId && "bg-[#F7FAFC]"
                    )}
                    onClick={() => setActiveViewId(v.id)}
                  >
                    <div className="truncate">
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-gray-500">
                        {v.isDefault ? "Default • " : ""}
                        {v.updatedAt.slice(0, 10)}
                      </div>
                    </div>
                    {!v.isDefault && (
                      <button
                        className="h-7 px-2 rounded border text-xs cursor-pointer hover:bg-white"
                        style={{ borderColor: TK.border }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultForScope(v);
                        }}
                        title="Make default for this scope"
                      >
                        Make default
                      </button>
                    )}
                  </div>
                ))}
                {scopedViews.length === 0 && <div className="text-xs text-gray-500">No views for this scope yet.</div>}
              </div>
            </ChipDropdown>

            {/* Actions */}
            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
              style={{ borderColor: TK.border, background: unsaved ? TK.brandTint : "#fff", color: unsaved ? TK.brand : TK.text }}
              title="Save"
              onClick={onSave}
            >
              <Save className="h-4 w-4" /> Save
            </button>
            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
              style={{ borderColor: TK.border }}
              title="Save as…"
              onClick={() => {
                setSaveAsName(edit.name || "New view");
                setSaveAsOpen(true);
              }}
            >
              <SaveAs className="h-4 w-4" /> Save as…
            </button>
            <button
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
              style={{ borderColor: TK.border }}
              title="Reset to product defaults"
              onClick={resetToProductDefaults}
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        {/* Scope + Persona + General chips */}
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Scope>
              aria-label="Scope"
              value={scope}
              onChange={setScope}
              options={[
                {
                  key: "workspace",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" style={{ color: TK.brand }} />
                      Workspace
                    </span>
                  ),
                },
                {
                  key: "role",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Shield className="h-4 w-4" style={{ color: TK.brand }} />
                      Role
                    </span>
                  ),
                },
                {
                  key: "project",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Folder className="h-4 w-4" style={{ color: TK.brand }} />
                      Project
                    </span>
                  ),
                },
                {
                  key: "user",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4" style={{ color: TK.brand }} />
                      Me
                    </span>
                  ),
                },
              ]}
            />

            {scope === "role" && (
              <ChipDropdown
                label={<span>Roles {roleValues.length ? `(${roleValues.length})` : ""}</span>}
                active={roleValues.length > 0}
                title="Target roles for this scope"
              >
                {["owner", "admin", "editor", "viewer"].map((r) => (
                  <label key={r} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={!!roleSel[r]}
                      onChange={(e) => setRoleSel((s) => ({ ...s, [r]: e.target.checked }))}
                    />
                    <span className="capitalize">{r}</span>
                  </label>
                ))}
                <div className="mt-2 text-xs text-gray-500">No selection = edit Role default (All).</div>
              </ChipDropdown>
            )}

            {scope === "project" && (
              <ChipDropdown
                label={<span>Projects {projectValues.length ? `(${projectValues.length})` : ""}</span>}
                active={projectValues.length > 0}
                title="Target projects for this scope"
              >
                {Object.keys(projectSel).map((p) => (
                  <label key={p} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={!!projectSel[p]}
                      onChange={(e) => setProjectSel((s) => ({ ...s, [p]: e.target.checked }))}
                    />
                    <span>{p}</span>
                  </label>
                ))}
                <div className="mt-2 text-xs text-gray-500">No selection = edit Project default (All).</div>
              </ChipDropdown>
            )}

            <ChipDropdown
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4" style={{ color: TK.brand }} />
                  Persona {persona !== "custom" ? `(${persona})` : ""}
                </span>
              }
              active={persona !== "custom"}
              title="Apply persona default"
            >
              <div className="text-sm font-medium mb-2">Apply default layout</div>
              {(["solo", "am", "techlead"] as const).map((p) => (
                <button
                  key={p}
                  className="w-full text-left px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer"
                  onClick={() => applyPersona(p)}
                >
                  {p === "solo" && "Solo — My Focus"}
                  {p === "am" && "Agency AM — Client Health"}
                  {p === "techlead" && "Tech Lead — Crawl & CWV First"}
                </button>
              ))}
              <div className="mt-2 text-xs text-gray-500">Persona seeds the layout; you can still edit and save.</div>
            </ChipDropdown>

            <ChipDropdown
              label={
                <span className="inline-flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" style={{ color: TK.brand }} />
                  General
                </span>
              }
              title="General settings"
            >
              <div className="space-y-2 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Default view on open</span>
                  <select
                    className="rounded border px-2 py-1 text-sm cursor-pointer"
                    style={{ borderColor: TK.border }}
                    value={defaultOnOpen}
                    onChange={(e) => setDefaultOnOpen(e.target.value)}
                  >
                    <option value="auto">Auto (scope default)</option>
                    <option value="last">Last used</option>
                    <option value="product">Product default</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Refresh cadence</span>
                  <select
                    className="rounded border px-2 py-1 text-sm cursor-pointer"
                    style={{ borderColor: TK.border }}
                    value={refresh}
                    onChange={(e) => setRefresh(e.target.value as any)}
                  >
                    <option value="manual">Manual</option>
                    <option value="15m">Every 15 min</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Section density</span>
                  <select
                    className="rounded border px-2 py-1 text-sm cursor-pointer"
                    style={{ borderColor: TK.border }}
                    value={density}
                    onChange={(e) => setDensity(e.target.value as any)}
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
              </div>
            </ChipDropdown>

            <Chip title="Preview Home Panel" onClick={() => setPreviewOpen(true)}>
              <IconLabel icon={Eye}>Preview</IconLabel>
            </Chip>

            <div className="ml-auto text-sm">
              {unsaved ? (
                <span className="px-2 py-0.5 rounded border" style={{ borderColor: TK.border, background: TK.brandTint, color: TK.brand }}>
                  Unsaved changes
                </span>
              ) : (
                <span className="text-gray-500">All changes saved</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-2">
            <Segmented<TabKey>
              aria-label="Tabs"
              value={tab}
              onChange={setTab}
              options={[
                {
                  key: "layout",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutDashboard className="h-4 w-4" style={{ color: TK.brand }} />
                      Sections & Layout
                    </span>
                  ),
                },
                {
                  key: "views",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <LayoutDashboard className="h-4 w-4" style={{ color: TK.brand }} />
                      Saved Views
                    </span>
                  ),
                },
                {
                  key: "export",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Download className="h-4 w-4" style={{ color: TK.brand }} />
                      Export & Share
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main body: two columns */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          {tab === "layout" && <LayoutTab />}
          {tab === "views" && <ViewsTab />}
          {tab === "export" && <ExportTab />}
        </div>
        <div className="col-span-12 lg:col-span-5">
          <HowItWorks />
        </div>
      </div>

      {/* Footer (sticky minimal) */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2">
          {unsaved ? (
            <>
              <span className="text-sm text-gray-700">You have unsaved changes</span>
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                style={{ borderColor: TK.border, background: TK.brand, color: "white" }}
                onClick={onSave}
                title="Save"
              >
                <Save className="h-4 w-4" /> Save
              </button>
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                style={{ borderColor: TK.border }}
                onClick={() => {
                  setSaveAsName(edit.name || "New view");
                  setSaveAsOpen(true);
                }}
                title="Save as…"
              >
                <SaveAs className="h-4 w-4" /> Save as…
              </button>
              <button
                className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
                style={{ borderColor: TK.border }}
                onClick={resetToProductDefaults}
                title="Reset to product defaults"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <div className="ml-auto text-xs text-gray-500">User overrides take precedence over role/workspace defaults.</div>
            </>
          ) : (
            <div className="text-sm text-gray-600">All changes saved</div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Home Panel — Preview"
        width={720}
        footer={
          <button
            className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-white"
            style={{ borderColor: TK.border }}
            onClick={() => setPreviewOpen(false)}
          >
            Close
          </button>
        }
      >
        <div className="space-y-2 text-sm">
          {(order || [])
            .filter((k) => secMap[k])
            .map((k) => {
              const m = metaByKey[k];
              return (
                <div key={k} className="rounded-md border p-3 flex items-center gap-2" style={{ borderColor: TK.border, background: "#fff" }}>
                  <m.icon className="h-4 w-4" style={{ color: TK.brand }} />
                  <div className="font-medium">{m.label}</div>
                  <span className="text-xs text-gray-500">{m.tip}</span>
                </div>
              );
            })}
          {order.filter((k) => secMap[k]).length === 0 && <div className="text-gray-500">No visible sections selected.</div>}
        </div>
      </Modal>

      {/* Save As modal */}
      <Modal
        open={saveAsOpen}
        onClose={() => setSaveAsOpen(false)}
        title="Save View As…"
        width={520}
        footer={
          <>
            <button
              className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-white"
              style={{ borderColor: TK.border }}
              onClick={() => setSaveAsOpen(false)}
            >
              Cancel
            </button>
            <button
              className="h-8 px-3 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border, background: TK.brand, color: "white" }}
              onClick={() => onSaveAs(saveAsName.trim() || "New view")}
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="block mb-1">View name</span>
            <input
              className="w-full rounded border px-2 py-1"
              style={{ borderColor: TK.border }}
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              autoFocus
            />
          </label>
          <div className="text-xs text-gray-500">
            The new view will be saved for <b>{scopeBadge()}</b>. You can make it default from the **Saved Views** tab.
          </div>
        </div>
      </Modal>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </section>
  );
}

/* -----------------------------------------------------------------------------
   DEMO RENDER
----------------------------------------------------------------------------- */
export function Example() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <HomePanelSettings />
    </div>
  );
}
