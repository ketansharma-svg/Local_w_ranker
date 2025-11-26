"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X as CloseIcon,
  Search,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save as SaveIcon,
  Trash2,
  Lock,
  Plus,
  GitCompare,
  Globe,
  ListFilter,
  CheckSquare,
  Send,
} from "lucide-react";

/**
 * Compare Setup Drawer — Drop‑in React + Tailwind TSX
 * ---------------------------------------------------
 * Named export:
 *   <CompareSetupDrawer open onClose={...} vm={...} />
 *
 * Default export (demo harness):
 *   Renders a button to open the drawer so you can see it immediately.
 *
 * Design compliance (per spec):
 *  - Inter / Inter Fallback fonts applied
 *  - No emoji
 *  - Branded (#008CCD) icons for section titles, card titles, and action buttons
 *  - Favicon used for project/domain (baseline.faviconUrl or /favicon.ico)
 *  - Modular Toggle, Chip, Button components; all clickables use cursor-pointer
 */

/* -------------------------------- Tokens -------------------------------- */
const TK = {
  brand: "#008CCD",
  surface: "#FFFFFF",
  borderBrand: "#EFF0F6",
  borderSubtle: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  chipBg: "#F5F7FA",
  chipActiveBg: "#E8F5FD",
  chipActiveText: "#0B6FAE",
  btnPrimaryBg: "#008CCD",
  btnPrimaryText: "#FFFFFF",
  btnGhostBorder: "#E5E7EB",
  you: "#008CCD",
  competitor: "#0077FF",
  zebra: "#FAFCFE",
} as const;

/* -------------------------------- Fonts --------------------------------- */
const SectionFont = {
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* -------------------------------- Types --------------------------------- */
type Context = "profiles" | "insights";

type Competitor = {
  domain: string;
  nickname?: string;
  wr?: number;
  tags?: string[];
  addedAtISO?: string;
};

type SavedSet = { id: string; name: string; domains: string[]; updatedAtISO: string };

export type CompareSetupVM = {
  projectId: string;
  baseline: {
    domain: string;
    wr?: number;
    country?: string;
    device?: "desktop" | "mobile";
    faviconUrl?: string; // NEW (optional) — favicon for your project/domain
  };
  planCap: number;
  competitors: Competitor[];
  selectedDomains: string[]; // ordered
  savedSets?: SavedSet[];
  pro: boolean;
  context: Context;
};

export type CompareApplyPayload = {
  projectId: string;
  selectedDomains: string[];
  context: Context;
  alsoOpenInsights?: boolean;
};

export type CompareSetSavePayload = {
  projectId: string;
  name: string;
  domains: string[];
  overwriteId?: string;
};

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  vm?: Partial<CompareSetupVM>;
  onApply?: (payload: CompareApplyPayload) => void | Promise<void>;
  onSaveSet?: (payload: CompareSetSavePayload) => void | Promise<void>;
};

/* ------------------------------ Mock (demo) ------------------------------ */
const MOCK_COMPETITORS: Competitor[] = [
  { domain: "comp1.com", nickname: "Comp 1", wr: 72, tags: ["SaaS", "Tech"], addedAtISO: "2025-07-02" },
  { domain: "comp2.ai", nickname: "Comp 2", wr: 66, tags: ["AI", "Tools"], addedAtISO: "2025-06-16" },
  { domain: "comp3.io", nickname: "Comp 3", wr: 59, tags: ["Marketplace"], addedAtISO: "2025-05-10" },
  { domain: "comp4.dev", nickname: "Comp 4", wr: 81, tags: ["Tech"], addedAtISO: "2025-07-03" },
  { domain: "comp5.org", nickname: "Comp 5", wr: 48, tags: ["Local"], addedAtISO: "2025-04-11" },
  { domain: "comp6.net", nickname: "Comp 6", wr: 63, tags: ["SaaS"], addedAtISO: "2025-03-04" },
  { domain: "comp7.xyz", nickname: "Comp 7", wr: 53, tags: ["Content"], addedAtISO: "2025-05-26" },
  { domain: "comp8.co", nickname: "Comp 8", wr: 76, tags: ["AI", "Tech"], addedAtISO: "2025-07-04" },
  { domain: "comp9.app", nickname: "Comp 9", wr: 69, tags: ["Tools"], addedAtISO: "2025-05-29" },
  { domain: "comp10.dev", nickname: "Comp 10", wr: 57, tags: ["Local"], addedAtISO: "2025-06-01" },
];

const DEFAULT_VM: CompareSetupVM = {
  projectId: "proj_demo",
  baseline: { domain: "yourdomain.com", wr: 78, country: "US", device: "desktop", faviconUrl: "/favicon.ico" },
  planCap: 3,
  competitors: MOCK_COMPETITORS,
  selectedDomains: ["comp1.com"],
  savedSets: [{ id: "set1", name: "Top Tech", domains: ["comp4.dev", "comp8.co", "comp1.com"], updatedAtISO: "2025-07-06" }],
  pro: true,
  context: "profiles",
};

/* -------------------------------- Helpers -------------------------------- */
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso || "";
  }
}
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
/** Build a relative deep link to Insights; safe client-side. */
function toInsightsPath(projectId: string, baseline: string, selected: string[]) {
  const params = new URLSearchParams({
    tab: "shared",
    projectId,
    baseline,
    competitors: selected.join(","),
    utm_source: "wranker",
    utm_medium: "profiles",
    utm_campaign: "compare-apply",
  });
  return `/ci/insights?${params.toString()}`;
}

/* ----------------------------- UI Primitives ----------------------------- */
function BrandIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-[6px] border"
      style={{ borderColor: TK.borderSubtle, background: TK.chipBg }}>
      {children}
    </span>
  );
}

function Chip({ children, onClick, active = false }: React.PropsWithChildren<{ onClick?: () => void; active?: boolean }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
        "transition-colors", "cursor-pointer")}
      style={{
        borderColor: TK.borderSubtle,
        background: active ? TK.chipActiveBg : TK.chipBg,
        color: active ? TK.chipActiveText : TK.text,
      }}
    >
      {children}
    </button>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" };
function Button({ variant = "outline", className, style, children, ...rest }: ButtonProps) {
  const base = "inline-flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm transition cursor-pointer";
  const styles =
    variant === "primary"
      ? { class: "text-white shadow-sm hover:opacity-95", style: { background: TK.btnPrimaryBg, color: TK.btnPrimaryText } }
      : variant === "ghost"
      ? { class: "hover:bg-gray-50", style: { background: "transparent", borderColor: "transparent" } }
      : { class: "border hover:bg-gray-50", style: { borderColor: TK.btnGhostBorder } };
  return (
    <button {...rest} className={classNames(base, styles.class, className)} style={{ ...(style || {}), ...(styles.style as any) }}>
      {children}
    </button>
  );
}

/** Accessible toggle switch (used for "Include" in list) */
function ToggleSwitch({
  checked,
  onChange,
  disabled,
  size = "sm",
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}) {
  const dims = size === "sm" ? { w: 36, h: 20, knob: 16, translate: 16 } : { w: 44, h: 24, knob: 20, translate: 20 };
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={classNames("relative inline-flex items-center rounded-full transition outline-none",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}
      style={{ width: dims.w, height: dims.h, background: checked ? TK.brand : "#D1D5DB" }}
      title={label}
    >
      <span
        className="absolute rounded-full bg-white shadow transition-transform"
        style={{
          width: dims.knob, height: dims.knob, transform: `translateX(${checked ? dims.translate : 2}px)`,
        }}
      />
    </button>
  );
}

/* --------------------------- Compare Setup Drawer --------------------------- */
export function CompareSetupDrawer(props: DrawerProps) {
  const merged: CompareSetupVM = { ...DEFAULT_VM, ...(props.vm || {}) };
  const { projectId, baseline, planCap, competitors, savedSets: initialSaved = [], pro, context } = merged;

  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(merged.selectedDomains || []);
  const [savedSets, setSavedSets] = useState<SavedSet[]>(initialSaved);
  const [savingSetName, setSavingSetName] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);
  const [alsoOpenInsights, setAlsoOpenInsights] = useState(false);
  const [sortKey, setSortKey] = useState<"wr" | "recent" | "domain">("wr");
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // A11y: Focus trap + restore focus
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!props.open) return;
    lastActiveRef.current = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (!props.open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
      } else if (e.key === "Tab") {
        const node = drawerRef.current;
        if (!node) return;
        const focusables = node.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not(:disabled)",
            "input:not(:disabled)",
            "select:not(:disabled)",
            "textarea:not(:disabled)",
            "[tabindex]:not([tabindex='-1'])",
          ].join(",")
        );
        const arr = Array.from(focusables);
        if (arr.length === 0) return;
        const first = arr[0];
        const last = arr[arr.length - 1];
        const active = document.activeElement as HTMLElement;
        if (!node.contains(active)) {
          first.focus();
          e.preventDefault();
        } else {
          if (!e.shiftKey && active === last) {
            first.focus();
            e.preventDefault();
          } else if (e.shiftKey && active === first) {
            last.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    // reset when reopened
    setSearch("");
    setTagFilter([]);
    setSelected(merged.selectedDomains || []);
    setSortKey("wr");
    setAlsoOpenInsights(false);
    setDirty(false);
    setSavingSetName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);

  const allTags = useMemo(() => uniq(competitors.flatMap((c) => c.tags || [])).sort((a, b) => a.localeCompare(b)), [competitors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = competitors.filter((c) => c.domain !== baseline.domain);
    if (q) {
      list = list.filter((c) => {
        const hay = [c.domain, c.nickname, ...(c.tags || [])].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (tagFilter.length) {
      list = list.filter((c) => (c.tags || []).some((t) => tagFilter.includes(t)));
    }
    switch (sortKey) {
      case "wr":
        list = [...list].sort((a, b) => (b.wr || 0) - (a.wr || 0));
        break;
      case "recent":
        list = [...list].sort((a, b) => new Date(b.addedAtISO || 0).getTime() - new Date(a.addedAtISO || 0).getTime());
        break;
      case "domain":
        list = [...list].sort((a, b) => a.domain.localeCompare(b.domain));
        break;
    }
    return list;
  }, [competitors, baseline.domain, search, tagFilter, sortKey]);

  const atCap = selected.length >= planCap;
  const canApply = selected.length > 0 && selected.length <= planCap;
  const isProfiles = context === "profiles";

  function raiseToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }
  function attemptClose() {
    if (dirty && !confirm("Discard changes?")) return;
    props.onClose();
    const el = lastActiveRef.current;
    if (el && typeof el.focus === "function") setTimeout(() => el.focus(), 0);
  }

  function toggleTag(t: string) {
    setDirty(true);
    setTagFilter((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }
  function toggleSelect(domain: string) {
    setDirty(true);
    setSelected((s) => {
      if (s.includes(domain)) return s.filter((d) => d !== domain);
      if (s.length >= planCap) {
        raiseToast(`You can compare up to ${planCap} competitors on this plan.`);
        return s;
      }
      return [...s, domain];
    });
  }
  function move(domain: string, dir: -1 | 1) {
    setDirty(true);
    setSelected((s) => {
      const i = s.indexOf(domain);
      if (i < 0) return s;
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function clearSelection() {
    setDirty(true);
    setSelected([]);
  }
  function resetDefault() {
    setDirty(true);
    setSelected(merged.selectedDomains || []);
    setTagFilter([]);
    setSearch("");
    setSortKey("wr");
  }

  async function apply() {
    if (!canApply) return;
    setApplyBusy(true);
    const payload: CompareApplyPayload = {
      projectId,
      selectedDomains: selected,
      context,
      alsoOpenInsights: isProfiles ? alsoOpenInsights : false,
    };
    try {
      if (props.onApply) await props.onApply(payload);
      if (isProfiles && alsoOpenInsights) {
        window.location.href = toInsightsPath(projectId, baseline.domain, selected);
        return;
      }
      raiseToast("Selection applied");
      setDirty(false);
      setApplyBusy(false);
      props.onClose();
    } catch {
      setApplyBusy(false);
      raiseToast("Could not apply selection");
    }
  }

  function loadSet(setId: string) {
    const found = savedSets.find((s) => s.id === setId);
    if (!found) return;
    const trimmed = found.domains.filter((d) => d !== baseline.domain);
    setSelected(trimmed.slice(0, planCap));
    setDirty(true);
  }

  function saveSet(overwriteId?: string) {
    if (!pro) return;
    const name = savingSetName.trim();
    if (!name) { raiseToast("Enter a set name"); return; }
    if (!selected.length) { raiseToast("Select at least 1 competitor"); return; }

    if (overwriteId) {
      setSavedSets((arr) =>
        arr.map((s) => (s.id === overwriteId ? { ...s, name, domains: [...selected], updatedAtISO: new Date().toISOString() } : s))
      );
      raiseToast("Set overwritten");
      return;
    }
    const exists = savedSets.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      if (confirm(`A set named “${name}” exists. Overwrite it?`)) saveSet(exists.id);
      return;
    }
    const newSet: SavedSet = { id: "set_" + Math.random().toString(36).slice(2, 8), name, domains: [...selected], updatedAtISO: new Date().toISOString() };
    setSavedSets((arr) => [newSet, ...arr]);
    if (props.onSaveSet) props.onSaveSet({ projectId, name, domains: [...selected] });
    raiseToast("Set saved");
    setSavingSetName("");
  }

  function deleteSet(id: string) {
    const s = savedSets.find((x) => x.id === id);
    if (!s) return;
    if (!confirm(`Delete set “${s.name}”? This can’t be undone.`)) return;
    setSavedSets((arr) => arr.filter((x) => x.id !== id));
  }

  if (!props.open) return null;

  return (
    <>
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center" style={SectionFont}>
          <div className="rounded-md border bg-white px-3 py-2 text-sm shadow" style={{ borderColor: TK.borderBrand }}>
            {toast}
          </div>
        </div>
      )}

      {/* Scrim */}
      {/* <div className="fixed inset-0 z-[60] bg-black/30" onClick={attemptClose} /> */}

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Compare Setup"
        ref={drawerRef}
        className="fixed right-0 top-0 z-[61] h-full w-full max-w-[720px] bg-white shadow-xl outline-none"
        style={{ borderLeft: `1px solid ${TK.borderBrand}`, ...SectionFont }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3 md:px-5" style={{ borderColor: TK.borderBrand }}>
          <div className="min-w-0 flex items-center gap-2">
            <BrandIcon>
              <GitCompare size={16} color={TK.brand} />
            </BrandIcon>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
                Compare Setup
              </div>
              <div className="mt-1 text-xs" style={{ color: TK.muted }}>
                You:&nbsp;
                {baseline.faviconUrl ? (
                  <img src={baseline.faviconUrl} alt="site" className="mr-1 inline-block h-3.5 w-3.5 rounded-sm align-[-2px]" />
                ) : (
                  <img src="/favicon.ico" alt="site" className="mr-1 inline-block h-3.5 w-3.5 rounded-sm align-[-2px]" />
                )}
                <span className="font-mono text-[12px]" style={{ color: TK.you }}>
                  {baseline.domain}
                </span>
                {baseline.wr != null && <span className="ml-2 rounded-full bg-[var(--wr-chip-filter-bg,#F5F7FA)] px-2 py-[2px]">WR {baseline.wr}</span>}
                {baseline.country && <span className="ml-2 rounded-full bg-[var(--wr-chip-filter-bg,#F5F7FA)] px-2 py-[2px]">{baseline.country}</span>}
                {baseline.device && <span className="ml-2 rounded-full bg-[var(--wr-chip-filter-bg,#F5F7FA)] px-2 py-[2px] capitalize">{baseline.device}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={attemptClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100 focus:outline-none cursor-pointer"
          >
            <CloseIcon size={18} color={TK.brand} />
          </button>
        </div>

        {/* Body */}
        <div className="h-[calc(100%-126px)] overflow-auto px-4 py-4 md:px-5">
          {/* Baseline */}
          <section aria-label="Baseline" className="rounded-lg border p-3 md:p-4" style={{ borderColor: TK.borderBrand, background: TK.surface }}>
            <div className="flex items-center gap-2">
              <BrandIcon>
                <Globe size={16} color={TK.brand} />
              </BrandIcon>
              <div className="text-sm font-medium" style={{ color: TK.text }}>
                Baseline
              </div>
            </div>
            <div className="mt-1 text-sm" style={{ color: TK.muted }}>
              Your project domain used as reference in comparisons.
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm" style={{ borderColor: TK.borderSubtle }}>
                {baseline.faviconUrl ? (
                  <img src={baseline.faviconUrl} alt="fav" className="h-4 w-4 rounded-sm" />
                ) : (
                  <img src="/favicon.ico" alt="fav" className="h-4 w-4 rounded-sm" />
                )}
                <span className="font-mono">{baseline.domain}</span>
              </span>
              {baseline.wr != null && (
                <Chip>
                  <CheckSquare size={12} color={TK.brand} />
                  WR {baseline.wr}
                </Chip>
              )}
            </div>
          </section>

          {/* Picker */}
          <section className="mt-3 rounded-lg border p-3 md:p-4" style={{ borderColor: TK.borderBrand }}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BrandIcon>
                  <ListFilter size={16} color={TK.brand} />
                </BrandIcon>
                <div className="text-sm font-medium" style={{ color: TK.text }}>
                  Pick competitors
                </div>
              </div>
              <Chip>
                Selected: <b>{selected.length}</b> / {planCap}
              </Chip>
            </div>

            {/* Search + Sort */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search domain, nickname, or tag…"
                  className="h-9 w-[280px] rounded-md border pl-8 pr-2 text-sm outline-none focus:ring-0"
                  style={{ borderColor: TK.borderSubtle }}
                />
              </div>
              <div className="ml-1">
                <label className="mr-1 text-xs" style={{ color: TK.muted }}>
                  Sort:
                </label>
                <select
                  className="h-9 rounded-md border bg-white px-2 text-sm cursor-pointer"
                  style={{ borderColor: TK.borderSubtle }}
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as any)}
                >
                  <option value="wr">WR Score (desc)</option>
                  <option value="recent">Recently Added</option>
                  <option value="domain">Domain (A–Z)</option>
                </select>
              </div>
            </div>

            {/* Tag filters */}
            {allTags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Chip onClick={() => { setDirty(true); setTagFilter([]); }} active={tagFilter.length === 0}>
                  All
                </Chip>
                {allTags.map((t) => {
                  const active = tagFilter.includes(t);
                  return (
                    <Chip key={t} onClick={() => toggleTag(t)} active={active}>
                      {t}
                    </Chip>
                  );
                })}
              </div>
            )}

            {/* Cap helper */}
            {atCap && (
              <div className="mt-2 rounded-md border px-2 py-1 text-xs" style={{ borderColor: TK.borderSubtle, color: TK.muted }}>
                You can compare up to {planCap} competitors on this plan.
              </div>
            )}

            {/* List */}
            <div className="mt-3 max-h-[260px] overflow-auto rounded-md border" style={{ borderColor: TK.borderSubtle }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b" style={{ borderColor: TK.borderSubtle }}>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: TK.muted, minWidth: 220 }}>
                      Domain
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: TK.muted, minWidth: 140 }}>
                      Tags
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: TK.muted, minWidth: 90 }}>
                      WR
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: TK.muted, minWidth: 110 }}>
                      Added
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium" style={{ color: TK.muted, minWidth: 100 }}>
                      Include
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: TK.muted }}>
                        No competitors match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => {
                      const on = selected.includes(c.domain);
                      const disableAdd = !on && atCap;
                      const zebra = i % 2 === 1 ? TK.zebra : "#fff";
                      return (
                        <tr key={c.domain} className="hover:bg-[#F7FAFC]" style={{ background: zebra, borderColor: TK.borderSubtle }}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-4 w-4 rounded bg-gray-200" aria-hidden />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{c.domain}</div>
                                {c.nickname && (
                                  <div className="truncate text-xs" style={{ color: TK.muted }}>
                                    {c.nickname}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {(c.tags || []).map((t) => (
                                <span key={t} className="rounded-full bg-[var(--wr-chip-filter-bg,#F5F7FA)] px-2 py-[2px] text-[11px]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {c.wr != null ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wr-chip-filter-bg,#F5F7FA)] px-2 py-[2px] text-xs">
                                {c.wr}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: TK.muted }}>
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: TK.muted }}>
                            {fmtDate(c.addedAtISO) || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <ToggleSwitch
                              size="sm"
                              checked={on}
                              disabled={disableAdd}
                              onChange={() => toggleSelect(c.domain)}
                              label={on ? "Remove" : "Add"}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Selected preview */}
          <section className="mt-3 rounded-lg border p-3 md:p-4" style={{ borderColor: TK.borderBrand }}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandIcon>
                  <CheckSquare size={16} color={TK.brand} />
                </BrandIcon>
                <div className="text-sm font-medium" style={{ color: TK.text }}>
                  Selected (order affects chart legends)
                </div>
              </div>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs underline decoration-dotted hover:text-gray-800 cursor-pointer"
                  style={{ color: TK.muted }}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.length === 0 ? (
                <div className="text-sm" style={{ color: TK.muted }}>
                  None selected.
                </div>
              ) : (
                selected.map((d) => (
                  <div key={d} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm" style={{ borderColor: TK.competitor }}>
                    <GripVertical size={14} className="text-gray-400" aria-hidden />
                    <span className="font-mono">{d}</span>
                    <div className="ml-1 flex items-center">
                      <button
                        type="button"
                        aria-label="Move up"
                        title="Move up"
                        className="grid h-6 w-6 place-items-center rounded hover:bg-gray-100 cursor-pointer"
                        onClick={() => move(d, -1)}
                      >
                        <ChevronUp size={14} color={TK.brand} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        title="Move down"
                        className="grid h-6 w-6 place-items-center rounded hover:bg-gray-100 cursor-pointer"
                        onClick={() => move(d, +1)}
                      >
                        <ChevronDown size={14} color={TK.brand} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove"
                        title="Remove"
                        className="ml-0.5 grid h-6 w-6 place-items-center rounded hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleSelect(d)}
                      >
                        <CloseIcon size={14} color={TK.brand} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Saved Sets (Pro) */}
          <section className="mt-3 rounded-lg border p-3 md:p-4" style={{ borderColor: TK.borderBrand }}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrandIcon>
                  <SaveIcon size={16} color={TK.brand} />
                </BrandIcon>
                <div className="text-sm font-medium" style={{ color: TK.text }}>
                  Saved Sets (Pro)
                </div>
              </div>
              {!pro && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs"
                  style={{ borderColor: TK.borderSubtle, color: TK.muted }}>
                  <Lock size={12} color={TK.brand} /> Pro
                </span>
              )}
            </div>

            {pro ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {/* Load */}
                <div className="rounded-md border p-2" style={{ borderColor: TK.borderSubtle }}>
                  <div className="text-xs" style={{ color: TK.muted }}>
                    Load
                  </div>
                  <div className="mt-1 space-y-1">
                    {savedSets.length === 0 ? (
                      <div className="text-sm" style={{ color: TK.muted }}>
                        No saved sets.
                      </div>
                    ) : (
                      savedSets.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded px-2 py-1 hover:bg-gray-50">
                          <div className="min-w-0">
                            <div className="truncate text-sm">{s.name}</div>
                            <div className="truncate text-[11px]" style={{ color: TK.muted }}>
                              {s.domains.length} domains • {fmtDate(s.updatedAtISO)}
                            </div>
                          </div>
                          <div className="ml-2 flex items-center gap-1">
                            <Button variant="outline" className="h-7 px-2 py-1 text-xs" onClick={() => loadSet(s.id)} title="Load set">
                              Load
                            </Button>
                            <button
                              type="button"
                              className="grid h-7 w-7 place-items-center rounded-md hover:bg-gray-100 cursor-pointer"
                              onClick={() => deleteSet(s.id)}
                              title="Delete set"
                            >
                              <Trash2 size={14} color={TK.brand} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {/* Save */}
                <div className="rounded-md border p-2" style={{ borderColor: TK.borderSubtle }}>
                  <div className="text-xs" style={{ color: TK.muted }}>
                    Save
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      value={savingSetName}
                      onChange={(e) => setSavingSetName(e.target.value)}
                      placeholder="Set name (e.g., Top Tech)"
                      className="h-9 flex-1 rounded-md border px-2 text-sm outline-none"
                      style={{ borderColor: TK.borderSubtle }}
                    />
                    <Button variant="outline" className="text-sm" onClick={() => saveSet()} title="Save as new set">
                      <SaveIcon size={14} color={TK.brand} /> Save
                    </Button>
                  </div>
                  {savedSets.length > 0 && (
                    <div className="mt-2 text-[11px]" style={{ color: TK.muted }}>
                      Tip: Enter an existing name to overwrite, or you’ll be prompted.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-md border px-3 py-2 text-sm" style={{ borderColor: TK.borderSubtle, color: TK.muted }}>
                Saved sets are available on Pro.
              </div>
            )}
          </section>

          {/* Apply destination (Profiles only) */}
          {isProfiles && (
            <section className="mt-3 rounded-lg border p-3 md:p-4" style={{ borderColor: TK.borderBrand }}>
              <div className="mb-1 flex items-center gap-2">
                <BrandIcon>
                  <Send size={16} color={TK.brand} />
                </BrandIcon>
                <div className="text-sm font-medium" style={{ color: TK.text }}>
                  Apply Destination
                </div>
              </div>
              <div className="mt-2 space-y-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="applydest"
                    checked={!alsoOpenInsights}
                    onChange={() => setAlsoOpenInsights(false)}
                    className="accent-[var(--wr-btn-primary-bg,#008CCD)] cursor-pointer"
                  />
                  Apply here (Profiles)
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="applydest"
                    checked={alsoOpenInsights}
                    onChange={() => setAlsoOpenInsights(true)}
                    className="accent-[var(--wr-btn-primary-bg,#008CCD)] cursor-pointer"
                  />
                  Apply & Open Insights (Shared Keywords)
                </label>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-white px-4 py-3 md:px-5" style={{ borderColor: TK.borderBrand }}>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetDefault} title="Reset to default">
              Reset
            </Button>
            <Button variant="outline" onClick={clearSelection} title="Clear all">
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {pro ? (
              <Button variant="outline" onClick={() => saveSet()} title="Save current selection as set">
                <Plus size={14} color={TK.brand} /> Save as Set
              </Button>
            ) : (
              <Button variant="outline" disabled title="Pro feature" className="opacity-60">
                <Lock size={14} color={TK.brand} /> Save as Set
              </Button>
            )}
            <Button variant="ghost" onClick={attemptClose} title="Cancel">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={apply}
              disabled={!canApply || applyBusy}
              className={classNames((!canApply || applyBusy) ? "opacity-70 cursor-not-allowed" : "")}
              title={!canApply ? "Select at least 1 (within plan cap)" : "Apply"}
            >
              {applyBusy ? "Applying…" : "Apply"}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ----------------------------- Demo Harness ------------------------------ */
export default function CompareSetupDrawerDemo() {
  const [open, setOpen] = useState(true);
  return (
  <>
  <CompareSetupDrawer
        open={open}
        onClose={() => setOpen(false)}
        vm={{
          projectId: "proj_123",
          baseline: { domain: "yourdomain.com", wr: 78, country: "US", device: "desktop", faviconUrl: "/favicon.ico" },
          planCap: 3,
          competitors: MOCK_COMPETITORS,
          selectedDomains: ["comp1.com"],
          savedSets: [{ id: "set1", name: "Top Tech", domains: ["comp4.dev", "comp8.co", "comp1.com"], updatedAtISO: "2025-07-06" }],
          pro: true,
          context: "profiles",
        }}
        onApply={(p) => console.log("APPLY", p)}
        onSaveSet={(p) => console.log("SAVE SET", p)}
      />
  
  </>
  );
}
