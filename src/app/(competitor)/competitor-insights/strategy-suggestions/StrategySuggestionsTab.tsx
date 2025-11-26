import React, { useEffect, useMemo, useState } from "react";
import ExplainSuggestionModalDemo from "../drawers/ExplainSuggestion";

/** ──────────────────────────────────────────────────────────────
 *  Strategy Suggestions Tab (Tab 6)
 *  - React + Tailwind, TypeScript, no external UI deps
 *  - Filters, grid, bulk actions, CSV export, mock scorer, settings drawer
 *  - Drop-in: self-contained; wire callbacks as needed
 *  ────────────────────────────────────────────────────────────── */

type Priority = "High" | "Medium" | "Low";
type Category =
  | "SERP_FEATURES"
  | "LINK_BUILDING"
  | "CONTENT"
  | "TECHNICAL"
  | "KEYWORD_GAP";

type InsightSource =
  | "SERP Layout Tab"
  | "Backlink Gap"
  | "Keyword Gap"
  | "Shared Keywords"
  | "Speed Comparison"
  | "Content Gap";

type DeepLink = {
  label: string;
  href: string; // route to open (can be real route or hash)
};

type Suggestion = {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  source: InsightSource;
  domains: string[]; // competitors or "mydomain.com"
  aiGenerated: boolean;
  aiConfidence: number; // 0..1
  impactScore: number; // 0..100 (CTR/FS gain/link equity model)
  inGlobal: boolean; // will be overridden when auto-sync ON
  dismissed: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deepLinks: DeepLink[];
};

type Filters = {
  domains: string[]; // multi
  categories: Category[]; // multi
  priority: Priority | "All";
  aiOnly: boolean;
  insightSources: any; // multi
//   insightSources: InsightSource[]; // multi
  showDismissed: boolean; // when false → hide dismissed
};

type Props = {
  projectDomain: string;
  initialSuggestions?: Suggestion[];
  onAddToTask?: (items: Suggestion[]) => void;
  onDeepLink?: (href: string) => void;
  onExplain?: (s: Suggestion) => void;
  onExport?: (items: Suggestion[], format: "csv" | "json") => void;
};

/* ────────────────────────────────────────────────────────────── */
/* Utilities                                                     */
/* ────────────────────────────────────────────────────────────── */

const cx = (...classes: Array<string | boolean | undefined>) =>
  classes.filter(Boolean).join(" ");

const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const toCSV = (rows: Suggestion[]) => {
  const headers = [
    "id",
    "title",
    "category",
    "priority",
    "source",
    "domains",
    "aiGenerated",
    "aiConfidence",
    "impactScore",
    "inGlobal",
    "dismissed",
    "createdAt",
    "updatedAt",
    "links",
  ];
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    const values = [
      r.id,
      escapeCSV(r.title),
      r.category,
      r.priority,
      r.source,
      escapeCSV(r.domains.join("|")),
      String(r.aiGenerated),
      r.aiConfidence.toFixed(2),
      String(r.impactScore),
      String(r.inGlobal),
      String(r.dismissed),
      r.createdAt,
      r.updatedAt,
      escapeCSV(r.deepLinks.map((d) => `${d.label}:${d.href}`).join("|")),
    ];
    lines.push(values.map(csvCell).join(","));
  });
  return lines.join("\n");
};

const escapeCSV = (s: string) => s.replace(/"/g, '""');
const csvCell = (s: string) => `"${escapeCSV(s)}"`;

/** Mock scoring: higher = more important for Global Holder */
const scoreSuggestion = (s: Suggestion) => {
  const priorityWeight = s.priority === "High" ? 1.0 : s.priority === "Medium" ? 0.65 : 0.35;
  const recencyDays =
    Math.max(0, (Date.now() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const recencyBoost = Math.max(0, 1 - Math.min(recencyDays / 30, 1)); // 0..1 over 30 days
  const base = s.impactScore / 100; // normalize 0..1
  const ai = s.aiGenerated ? s.aiConfidence : 0.25 * s.aiConfidence;
  const finalScore = 100 * (0.52 * base + 0.28 * ai + 0.2 * recencyBoost) * priorityWeight;
  return finalScore;
};

/* ────────────────────────────────────────────────────────────── */
/* Visual Maps                                                   */
/* ────────────────────────────────────────────────────────────── */

const CATEGORY_META: Record<
  Category,
  { label: string; color: string; border: string; icon: string }
> = {
  SERP_FEATURES: {
    label: "SERP Features",
    color: "bg-amber-300/20 text-amber-700",
    border: "before:bg-amber-400",
    icon: "⭐",
  },
  LINK_BUILDING: {
    label: "Link Building",
    color: "bg-emerald-300/20 text-emerald-700",
    border: "before:bg-emerald-400",
    icon: "🔗",
  },
  CONTENT: {
    label: "Content",
    color: "bg-sky-300/20 text-sky-700",
    border: "before:bg-sky-400",
    icon: "📝",
  },
  TECHNICAL: {
    label: "Technical",
    color: "bg-rose-300/20 text-rose-700",
    border: "before:bg-rose-400",
    icon: "⚙️",
  },
  KEYWORD_GAP: {
    label: "Keyword Gap",
    color: "bg-purple-300/20 text-purple-700",
    border: "before:bg-purple-400",
    icon: "🔎",
  },
};

const PRIORITY_COLOR: Record<Priority, string> = {
  High: "bg-rose-50 text-rose-600 ring-rose-200",
  Medium: "bg-amber-50 text-amber-600 ring-amber-200",
  Low: "bg-slate-50 text-slate-600 ring-slate-200",
};

/* ────────────────────────────────────────────────────────────── */
/* Smart Popover (tiny, no deps)                                 */
/* ────────────────────────────────────────────────────────────── */

const SmartPopover: React.FC<{
  trigger: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ trigger, children, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          // close if clicking outside
          const current = e.currentTarget;
          setTimeout(() => {
            if (!current.contains(document.activeElement)) setOpen(false);
          }, 0);
        }}
        className="align-middle"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <div
          className={cx(
            "absolute z-20 mt-2 w-72 origin-top-right rounded-lg border border-slate-200 bg-white p-3 shadow-xl",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* Drawer (Settings)                                             */
/* ────────────────────────────────────────────────────────────── */

const RightDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  return (
    <div
      className={cx(
        "fixed inset-0 z-40 transition",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cx(
          "absolute inset-0 bg-slate-900/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={cx(
          "absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        <div className="h-[calc(100%-56px)] overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* Filter Controls                                               */
/* ────────────────────────────────────────────────────────────── */

const MultiSelect: React.FC<{
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
  className?: string;
}> = ({ label, options, values, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) =>
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);

  return (
    <div className={cx("relative", className)}>
      <button
        type="button"
        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:border-sky-300"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">{label}</span>
          <span className="text-xs text-slate-500">
            {values.length > 0 ? `${values.length} selected` : "All"}
          </span>
        </div>
      </button>
      {open && (
        <div
          className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="max-h-56 overflow-y-auto pr-1">
            {options.map((opt) => {
              const checked = values.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={checked}
                    onChange={() => toggle(opt)}
                  />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <button
              className="text-xs text-slate-500 hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
            <button
              className="rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Switch: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}> = ({ label, checked, onChange, className }) => {
  return (
    <label className={cx("flex items-center gap-3", className)}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-sky-600" : "bg-slate-300"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cx(
            "inline-block h-4 w-4 transform rounded-full bg-white transition",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </label>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* Suggestion Card                                               */
/* ────────────────────────────────────────────────────────────── */

const SuggestionCard: React.FC<{
  s: Suggestion;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onAddTask: (s: Suggestion) => void;
  onView: (href: string) => void;
  onExplain?: (s: Suggestion) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
}> = ({ s, selected, onToggleSelect, onAddTask, onView, onExplain, onDismiss, onRestore }) => {
  const cat = CATEGORY_META[s.category];
    const [drawerSerp, setSerp] = useState(false);
  
      const openSerp = () => {
           setSerp(true);
      };
    
      // This function will handle closing the drawer
      const closeSerp = () => {
        setSerp(false);
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
    <div
      className={cx(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1",
        cat.border
      )}
    >
                               {drawerSerp && (
                                   <ExplainSuggestionModalDemo  onClose={closeSerp} />
                               )}
      {/* Select box */}
      <div className="absolute left-2 top-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          checked={selected}
          onChange={() => onToggleSelect(s.id)}
          aria-label={`Select ${s.title}`}
        />
      </div>

      <div className="flex flex-col gap-3 p-4 pl-9">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {cat.icon} {cat.label}
              </span>
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1",
                  PRIORITY_COLOR[s.priority]
                )}
                title="Priority"
              >
                ⚡ {s.priority}
              </span>
              {s.aiGenerated && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  🧠 AI
                </span>
              )}
              {s.inGlobal && !s.dismissed && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700 ring-1 ring-sky-200">
                  💡 In Global
                </span>
              )}
              {s.dismissed && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">
                  ❌ Dismissed Globally
                </span>
              )}
            </div>
            <h4 className="text-base font-semibold text-slate-800">{s.title}</h4>
          </div>

          <SmartPopover
            trigger={
              <span className="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50" onClick={openSerp}>
                ℹ Why this
              </span>
            }
          >
            <div className="space-y-2 text-sm text-slate-700">
              <p className="font-medium">Reasoning</p>
              <p className="text-slate-600">{s.description}</p>
              <div className="rounded-md bg-slate-50 p-2 text-xs">
                <div>Impact Score: <b>{s.impactScore}</b></div>
                <div>AI Confidence: <b>{fmtPct(s.aiConfidence)}</b></div>
                <div>Updated: <b>{fmtDate(s.updatedAt)}</b></div>
              </div>
            </div>
          </SmartPopover>
        </div>

        <div className="text-sm text-slate-600">
          <span className="font-medium">From:</span> {s.source}{" "}
          <span className="mx-2">•</span>
          <span className="font-medium">Priority:</span> {s.priority}{" "}
          <span className="mx-2">•</span>
          <span className="font-medium">Domains:</span> {s.domains.join(", ")}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {s.deepLinks.map((d) => (
            <button
              key={d.href}
              onClick={() => onView(d.href)}
              className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            >
              🔗 {d.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => onAddTask(s)}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            ➕ Add to Task
          </button>
          <button
            onClick={() => (onExplain ? onExplain(s) : onView(s.deepLinks[0]?.href ?? "#"))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            🔎 View Details →
          </button>

          <div className="ml-auto flex items-center gap-2">
            {!s.dismissed ? (
              <button
                onClick={() => onDismiss(s.id)}
                className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                title="Hide from Global View"
              >
                Hide from Global
              </button>
            ) : (
              <button
                onClick={() => onRestore(s.id)}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                title="Restore to Global View"
              >
                Restore to Global
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* Main Component                                                */
/* ────────────────────────────────────────────────────────────── */

export const StrategySuggestionsTab: React.FC<Props> = ({
  projectDomain,
  initialSuggestions,
  onAddToTask,
  onDeepLink,
  onExplain,
  onExport,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoSyncGlobal, setAutoSyncGlobal] = useState(true);
  const [disableGlobal, setDisableGlobal] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    domains: [],
    categories: [],
    priority: "All",
    aiOnly: false,
    insightSources: [],
    showDismissed: true,
  });

  const [data, setData] = useState<Suggestion[]>(() =>
    initialSuggestions ?? demoSuggestions(projectDomain)
  );

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Auto-sync logic: mark top 4 High + not dismissed as In Global (unless disabled)
  useEffect(() => {
    if (!autoSyncGlobal || disableGlobal) return;
    setData((prev) => {
      const copy = [...prev];
      const eligible = copy.filter((s) => s.priority === "High" && !s.dismissed);
      eligible.sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a));
      const topIds = new Set(eligible.slice(0, 4).map((s) => s.id));
      return copy.map((s) => ({ ...s, inGlobal: topIds.has(s.id) }));
    });
  }, [autoSyncGlobal, disableGlobal]);

  const allDomains = useMemo(
    () =>
      Array.from(
        new Set(
          data.flatMap((d) => d.domains).concat([projectDomain])
        )
      ).sort(),
    [data, projectDomain]
  );

  const allSources: InsightSource[] = [
    "SERP Layout Tab",
    "Backlink Gap",
    "Keyword Gap",
    "Shared Keywords",
    "Speed Comparison",
    "Content Gap",
  ];

  const categoryOptions = Object.keys(CATEGORY_META) as Category[];

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (!filters.showDismissed && s.dismissed) return false;
      if (filters.aiOnly && !s.aiGenerated) return false;
      if (filters.priority !== "All" && s.priority !== filters.priority) return false;
      if (filters.domains.length > 0 && !filters.domains.some((d) => s.domains.includes(d)))
        return false;
      if (filters.categories.length > 0 && !filters.categories.includes(s.category)) return false;
      if (filters.insightSources.length > 0 && !filters.insightSources.includes(s.source))
        return false;
      return true;
    });
  }, [data, filters]);

  const visible = useMemo(() => {
    // Always show High first, then by score
    const sorted = [...filtered].sort((a, b) => {
      const p = priorityRank(a.priority) - priorityRank(b.priority);
      if (p !== 0) return p;
      return scoreSuggestion(b) - scoreSuggestion(a);
    });
    return sorted;
  }, [filtered]);

  const selectedItems = useMemo(
    () => visible.filter((v) => selected[v.id]),
    [visible, selected]
  );
  const hasSelection = selectedItems.length > 0;

  const resetSelection = () => setSelected({});

  const toggleSelected = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const bulkSet = (value: boolean) => {
    const next: Record<string, boolean> = {};
    visible.forEach((v) => (next[v.id] = value));
    setSelected(next);
  };

  const handleAddToTask = (items: Suggestion[]) => {
    if (onAddToTask) onAddToTask(items);
    // minimal feedback
    alert(`Added ${items.length} suggestion${items.length > 1 ? "s" : ""} to Task Drawer.`);
  };

  const handleDismiss = (ids: string[]) => {
    setData((prev) =>
      prev.map((s) =>
        ids.includes(s.id) ? { ...s, dismissed: true, inGlobal: false } : s
      )
    );
    resetSelection();
  };

  const handleRestore = (ids: string[]) => {
    setData((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, dismissed: false } : s))
    );
    resetSelection();
  };

  const refresh = () => {
    // Light refresh: bump updatedAt and add a little noise to impactScore
    setData((prev) =>
      prev.map((s) => ({
        ...s,
        updatedAt: new Date().toISOString(),
        impactScore: Math.min(100, Math.max(0, Math.round(s.impactScore + (Math.random() * 8 - 4)))),
      }))
    );
  };

  const exportCSV = (rows: Suggestion[]) => {
    if (onExport) onExport(rows, "csv");
    const csv = toCSV(rows);
    downloadText(
      `strategy_suggestions_${projectDomain}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv
    );
  };

  const exportJSON = (rows: Suggestion[]) => {
    if (onExport) onExport(rows, "json");
    const text = JSON.stringify(rows, null, 2);
    downloadText(
      `strategy_suggestions_${projectDomain}_${new Date().toISOString().slice(0, 10)}.json`,
      text
    );
  };

  const globalCount = useMemo(() => data.filter((d) => d.inGlobal && !d.dismissed).length, [data]);

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="truncate text-lg font-semibold text-slate-800">
            Strategy Suggestions for Project: <span className="text-sky-700">{projectDomain}</span>
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            💡 In Global: {disableGlobal ? 0 : globalCount}/4
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            🔄 Refresh Suggestions
          </button>
          <div className="relative">
            <SmartPopover
              trigger={
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  📤 Export
                </button>
              }
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => exportCSV(visible)}
                  className="rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50"
                >
                  Export filtered as CSV
                </button>
                <button
                  onClick={() => exportJSON(visible)}
                  className="rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50"
                >
                  Export filtered as JSON
                </button>
                {hasSelection && (
                  <>
                    <hr className="my-1 border-slate-200" />
                    <button
                      onClick={() => exportCSV(selectedItems)}
                      className="rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50"
                    >
                      Export selected as CSV
                    </button>
                    <button
                      onClick={() => exportJSON(selectedItems)}
                      className="rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50"
                    >
                      Export selected as JSON
                    </button>
                  </>
                )}
              </div>
            </SmartPopover>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MultiSelect
          label="🧍 Domain"
          options={allDomains}
          values={filters.domains}
          onChange={(v) => setFilters((f) => ({ ...f, domains: v }))}
        />
        <MultiSelect
          label="🏷️ Action Type"
          options={categoryOptions.map((c) => CATEGORY_META[c].label)}
          values={filters.categories.map((c) => CATEGORY_META[c].label)}
          onChange={(vals) =>
            setFilters((f) => ({
              ...f,
              categories: categoryOptions.filter((c) => vals.includes(CATEGORY_META[c].label)),
            }))
          }
        />
        <div className="flex items-center gap-2">
          <label className="w-full">
            <span className="mb-1 block text-sm font-medium text-slate-700">⚡ Priority</span>
            <select
              className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-sky-300"
              value={filters.priority}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priority: e.target.value as Filters["priority"] }))
              }
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
        </div>
        <Switch
          label="🧠 AI Only"
          checked={filters.aiOnly}
          onChange={(v) => setFilters((f) => ({ ...f, aiOnly: v }))}
        />
        <MultiSelect
          label="🗂️ Insight Source"
          options={allSources}
          values={filters.insightSources}
          onChange={(v) => setFilters((f) => ({ ...f, insightSources: v }))}
        />
        <Switch
          label="👁️ Show Dismissed"
          checked={filters.showDismissed}
          onChange={(v) => setFilters((f) => ({ ...f, showDismissed: v }))}
        />
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No suggestions match your current filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((s) => (
              <SuggestionCard
                key={s.id}
                s={s}
                selected={!!selected[s.id]}
                onToggleSelect={toggleSelected}
                onAddTask={(item) => handleAddToTask([item])}
                onView={(href) => (onDeepLink ? onDeepLink(href) : window.location.assign(href))}
                onExplain={onExplain}
                onDismiss={(id) => handleDismiss([id])}
                onRestore={(id) => handleRestore([id])}
              />
            ))}
          </div>

          {/* Bulk action bar */}
          {hasSelection && (
            <div className="sticky bottom-3 mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  checked={selectedItems.length === visible.length}
                  onChange={(e) => bulkSet(e.target.checked)}
                />
                <div className="text-sm text-slate-700">
                  {selectedItems.length} selected
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAddToTask(selectedItems)}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                >
                  📋 Bulk Add to Tasks
                </button>
                <button
                  onClick={() => exportCSV(selectedItems)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  📤 Export Selected (CSV)
                </button>
                <button
                  onClick={() => handleDismiss(selectedItems.map((s) => s.id))}
                  className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  ❌ Dismiss from Global
                </button>
                <button
                  onClick={() => handleRestore(selectedItems.map((s) => s.id))}
                  className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                >
                  🔄 Restore to Global
                </button>
                <button
                  onClick={() => resetSelection()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Settings Drawer */}
      <RightDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Strategy Suggestions Settings"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              Global Card Sync
            </h4>
            <Switch
              label="Auto‑sync to Global View (top 4 High priority)"
              checked={autoSyncGlobal}
              onChange={setAutoSyncGlobal}
              className="justify-between"
            />
            <Switch
              label="Disable global suggestions for this project"
              checked={disableGlobal}
              onChange={setDisableGlobal}
              className="mt-3 justify-between"
            />
            <p className="mt-2 text-xs text-slate-500">
              When auto‑sync is ON, the top 4 eligible suggestions are marked <b>💡 In Global</b>.
              Disabling global suggestions shows all items here, but none in the floating holder.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              Export & Data
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportCSV(visible)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                📤 Export Filtered (CSV)
              </button>
              <button
                onClick={() => exportJSON(visible)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                🧾 Export Filtered (JSON)
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Exports include your current filters and the latest scores.
            </p>
          </div>
        </div>
      </RightDrawer>
    </section>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* Helpers & Demo Data                                           */
/* ────────────────────────────────────────────────────────────── */

const priorityRank = (p: Priority) => (p === "High" ? 0 : p === "Medium" ? 1 : 2);

const nowISO = () => new Date().toISOString();
const daysAgoISO = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const link = (label: string, href: string): DeepLink => ({ label, href });

function demoSuggestions(project: string): Suggestion[] {
  const comp1 = "comp1.com";
  const comp2 = "comp2.com";
  const base: Suggestion[] = [
    {
      id: "s1",
      title: "You missed 12 Featured Snippets that comp1.com currently owns",
      description:
        "You rank P2–P5 on these queries with FS present. Add concise definitions, Q&A blocks, and table summaries to qualify.",
      category: "SERP_FEATURES",
      priority: "High",
      source: "SERP Layout Tab",
      domains: [comp1],
      aiGenerated: true,
      aiConfidence: 0.82,
      impactScore: 86,
      inGlobal: true,
      dismissed: false,
      createdAt: daysAgoISO(20),
      updatedAt: daysAgoISO(3),
      deepLinks: [
        link("View Keywords", "/analyzer/competitors/serp-layout?feature=Featured%20Snippet"),
        link("Open Snapshot", "/analyzer/competitors/serp-layout?snapshot=true"),
      ],
    },
    {
      id: "s2",
      title: "24 domains link to competitors but not you (14 available via Vefogix)",
      description:
        "High authority blogs linking to competitors include techinsider.com, startupdigest.xyz. Prioritize guest posts and insertions.",
      category: "LINK_BUILDING",
      priority: "High",
      source: "Backlink Gap",
      domains: [comp1, comp2],
      aiGenerated: true,
      aiConfidence: 0.76,
      impactScore: 79,
      inGlobal: true,
      dismissed: false,
      createdAt: daysAgoISO(18),
      updatedAt: daysAgoISO(2),
      deepLinks: [
        link("View Domains", "/analyzer/competitors/backlink-gap?filter=opportunities"),
        link("Open Vefogix", "https://vefogix.com"),
      ],
    },
    {
      id: "s3",
      title: "42 keywords stuck in CTR dead zone (positions 5–9)",
      description:
        "Titles & descriptions underperform. Test brackets/years and add sitelink-worthy internal anchors.",
      category: "CONTENT",
      priority: "Medium",
      source: "Shared Keywords",
      domains: [project],
      aiGenerated: true,
      aiConfidence: 0.61,
      impactScore: 63,
      inGlobal: false,
      dismissed: true, // dismissed globally in example
      createdAt: daysAgoISO(25),
      updatedAt: daysAgoISO(10),
      deepLinks: [link("View Keywords", "/analyzer/competitors/shared-keywords?rankRange=5-9")],
    },
    {
      id: "s4",
      title: "CWV slower than competitors on 9 key pages",
      description:
        "Reduce third-party scripts and compress hero images. LCP > 3s on 6 pages vs 1.6s on comp2.com.",
      category: "TECHNICAL",
      priority: "Medium",
      source: "Speed Comparison",
      domains: [project, comp2],
      aiGenerated: false,
      aiConfidence: 0.44,
      impactScore: 58,
      inGlobal: false,
      dismissed: false,
      createdAt: daysAgoISO(14),
      updatedAt: daysAgoISO(1),
      deepLinks: [link("Open Speed Drawer", "/site-audit/speed?cmp=comp2.com")],
    },
    {
      id: "s5",
      title: "Missing 486 low‑difficulty keywords (KD < 35)",
      description:
        "Build a content cluster for 'seo audit template', 'technical seo steps', 'seo report sample'.",
      category: "KEYWORD_GAP",
      priority: "High",
      source: "Keyword Gap",
      domains: [comp1],
      aiGenerated: true,
      aiConfidence: 0.74,
      impactScore: 72,
      inGlobal: true,
      dismissed: false,
      createdAt: daysAgoISO(9),
      updatedAt: daysAgoISO(4),
      deepLinks: [link("Show Quick Wins", "/analyzer/competitors/keyword-gap?difficulty=low")],
    },
    {
      id: "s6",
      title: "Add FAQ schema to 7 landing pages to unlock PAA",
      description:
        "Pages already rank 4–8 where PAA is present. Add H2‑Q with short answers and FAQ schema.",
      category: "SERP_FEATURES",
      priority: "High",
      source: "SERP Layout Tab",
      domains: [project],
      aiGenerated: true,
      aiConfidence: 0.69,
      impactScore: 68,
      inGlobal: false, // will be auto-synced if among top 4
      dismissed: false,
      createdAt: daysAgoISO(8),
      updatedAt: daysAgoISO(2),
      deepLinks: [link("Visual SERP", "/analyzer/competitors/serp-layout?feature=PAA")],
    },
    {
      id: "s7",
      title: "Improve internal linking for 10 underlinked pages",
      description:
        "Add contextual links from high‑authority posts; raise PILS to distribute equity to conversion pages.",
      category: "CONTENT",
      priority: "Low",
      source: "Content Gap",
      domains: [project],
      aiGenerated: false,
      aiConfidence: 0.32,
      impactScore: 38,
      inGlobal: false,
      dismissed: false,
      createdAt: daysAgoISO(12),
      updatedAt: daysAgoISO(7),
      deepLinks: [link("Open Link Analyzer", "/links/internal?weak=1")],
    },
    {
      id: "s8",
      title: "Reclaim 6 broken backlinks pointing to 404s",
      description:
        "301 to nearest topical page or recreate the content. Quick equity gain likely.",
      category: "LINK_BUILDING",
      priority: "Medium",
      source: "Backlink Gap",
      domains: [project],
      aiGenerated: false,
      aiConfidence: 0.41,
      impactScore: 55,
      inGlobal: false,
      dismissed: false,
      createdAt: daysAgoISO(6),
      updatedAt: daysAgoISO(2),
      deepLinks: [link("View Broken Links", "/analyzer/competitors/backlink-gap?broken=1")],
    },
    {
      id: "s9",
      title: "Consolidate 3 overlapping listicles into a single hub",
      description:
        "Merge cannibalizing posts; keep strongest URL. Redirect others with canonical anchors.",
      category: "CONTENT",
      priority: "Medium",
      source: "Content Gap",
      domains: [project],
      aiGenerated: true,
      aiConfidence: 0.57,
      impactScore: 46,
      inGlobal: false,
      dismissed: false,
      createdAt: daysAgoISO(11),
      updatedAt: daysAgoISO(3),
      deepLinks: [link("Open Content Audit", "/content/audit?cluster=seo-tools")],
    },
    {
      id: "s10",
      title: "Secure 3 guest posts on techinsider.com, startupdigest.xyz, backlinkgenius.com",
      description:
        "All 3 link to competitors (WR > 70). Vefogix has vetted packages available.",
      category: "LINK_BUILDING",
      priority: "High",
      source: "Backlink Gap",
      domains: [comp1, comp2],
      aiGenerated: true,
      aiConfidence: 0.71,
      impactScore: 81,
      inGlobal: false, // will be auto-sync candidate
      dismissed: false,
      createdAt: daysAgoISO(4),
      updatedAt: daysAgoISO(1),
      deepLinks: [link("View Opportunities", "/backlinks/opportunities?source=competitor-gap")],
    },
    {
      id: "s11",
      title: "Add table lead‑ins to 5 comparison posts for rich snippet wins",
      description:
        "Tables often trigger FS. Add short 2–3 column comparison summaries.",
      category: "SERP_FEATURES",
      priority: "Low",
      source: "SERP Layout Tab",
      domains: [project],
      aiGenerated: false,
      aiConfidence: 0.27,
      impactScore: 31,
      inGlobal: false,
      dismissed: false,
      createdAt: daysAgoISO(15),
      updatedAt: daysAgoISO(9),
      deepLinks: [link("Open SERP Layout", "/analyzer/competitors/serp-layout?feature=Featured%20Snippet")],
    },
  ];

  // Initial auto-global like backend would calculate
  const topEligible = base
    .filter((s) => s.priority === "High" && !s.dismissed)
    .sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a))
    .slice(0, 4)
    .map((s) => s.id);
  return base.map((s) => ({ ...s, inGlobal: topEligible.includes(s.id) || s.inGlobal }));
}

/* ────────────────────────────────────────────────────────────── */
/* Default export (optional)                                     */
/* ────────────────────────────────────────────────────────────── */

export default StrategySuggestionsTab;
