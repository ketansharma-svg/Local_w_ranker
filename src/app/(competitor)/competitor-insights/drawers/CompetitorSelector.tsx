import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  X,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Plus,
  Save,
  Filter,
  AlertCircle,
  Users,
  Star,
} from "lucide-react";

/**
 * Wranker – Competitor Selector Modal
 * - Multi-select with search, sort, quick selects, saved sets
 * - Role-aware (Owner/Admin can add; Editor compare-only; Viewer read-only)
 * - Enforces compare limit (e.g., max 3 at a time)
 * - Seat usage banner + upgrade CTA
 * - Locked seat display (cannot re-add until reset)
 *
 * Drop-in. No external UI deps besides tailwind + lucide-react.
 */

// -------------------- Tokens (align with global design) --------------------
const TOKENS = {
  brand: "#1090D0", // Sky Blue
  brandHover: "#0a7cb7",
  text: "#282829",
  textMuted: "#6B7280",
  bgSoft: "#F5F7FA",
  bgPanel: "#FFFFFF",
  border: "#E5E7EB",
  borderSoft: "#D2EFFF",
  danger: "#F04438",
  warn: "#FEC84B",
  success: "#10B981",
  lock: "#9CA3AF",
  chipHover: "#EEF2F7",
};

type Role = "Owner" | "Admin" | "Editor" | "Viewer";

export type CompetitorItem = {
  id: string;
  domain: string;
  nickname?: string;
  tags?: string[]; // category tags eg: 'Local', 'Blog', 'Marketplace'
  wrScore?: number; // 0..100
  addedAt?: string; // ISO
  lockedUntil?: string | null; // if locked until reset
  addedBy?: { name: string; role: Role };
};

export type SavedCompareSet = {
  id: string;
  name: string;
  competitorIds: string[];
};

export type CompetitorSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;

  // Data
  competitors: CompetitorItem[];
  savedSets?: SavedCompareSet[];

  // Initial selection + limits
  selectedIds?: string[];
  maxCompare?: number; // default 3

  // Seats + plan
  seatUsed: number; // e.g., 6
  seatLimit: number; // e.g., 10
  resetDateISO: string; // e.g., "2025-08-01"

  // Permissions
  role: Role;

  // Actions
  onCompare: (ids: string[]) => void;
  onSaveSet?: (name: string, ids: string[]) => void;
  onApplySet?: (setId: string) => void; // optional (we apply internally too)
  onAddCompetitor?: () => void;
  onUpgradePlan?: () => void;
};

// -------------------- Helpers --------------------
function classNames(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(" ");
}
function daysUntil(dateISO: string) {
  const t = new Date(dateISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, t - now);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

type SortKey = "wr" | "az" | "recent";

// -------------------- Modal Component --------------------
export function CompetitorSelectorModal({
  isOpen,
  onClose,
  competitors,
  savedSets = [],
  selectedIds = [],
  maxCompare = 3,
  seatUsed,
  seatLimit,
  resetDateISO,
  role,
  onCompare,
  onSaveSet,
  onApplySet,
  onAddCompetitor,
  onUpgradePlan,
}: CompetitorSelectorModalProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("wr");
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // hydrate selection on open
  useEffect(() => {
    if (isOpen) setSelected(selectedIds);
  }, [isOpen, selectedIds]);

  // basic filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = competitors;

    if (q) {
      arr = arr.filter((c) => {
        const hay = [
          c.domain,
          c.nickname || "",
          ...(c.tags || []),
          c.addedBy?.name || "",
          c.addedBy?.role || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    switch (sortKey) {
      case "wr":
        arr = [...arr].sort((a, b) => (b.wrScore ?? -1) - (a.wrScore ?? -1));
        break;
      case "az":
        arr = [...arr].sort((a, b) => a.domain.localeCompare(b.domain));
        break;
      case "recent":
        arr = [...arr].sort(
          (a, b) => (new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime())
        );
        break;
    }
    return arr;
  }, [competitors, query, sortKey]);

  const selectedCount = selected.length;
  const compareLimitExceeded = selectedCount > maxCompare;

  const canModifySeats = role === "Owner" || role === "Admin";
  const canCompare = role === "Owner" || role === "Admin" || role === "Editor";
  const isReadOnly = role === "Viewer";

  // toggle one
  const toggle = useCallback(
    (id: string) => {
      if (!canCompare || isReadOnly) return;
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        return [...prev, id];
      });
    },
    [canCompare, isReadOnly]
  );

  // select visible (capped by maxCompare visually but still allow beyond; we warn)
  const selectVisible = () => {
    if (!canCompare || isReadOnly) return;
    const ids = filtered.map((c) => c.id);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };
  const clearVisible = () => {
    if (!canCompare || isReadOnly) return;
    const visibleIds = new Set(filtered.map((c) => c.id));
    setSelected((prev) => prev.filter((id) => !visibleIds.has(id)));
  };
  const clearAll = () => setSelected([]);

  // quick picks
  const pickTopWR = () => {
    if (!canCompare || isReadOnly) return;
    const ids = filtered
      .slice()
      .sort((a, b) => (b.wrScore ?? -1) - (a.wrScore ?? -1))
      .slice(0, maxCompare)
      .map((c) => c.id);
    setSelected(ids);
  };
  const pickRecent = () => {
    if (!canCompare || isReadOnly) return;
    const ids = filtered
      .slice()
      .sort(
        (a, b) => (new Date(b.addedAt || 0).getTime() - new Date(a.addedAt || 0).getTime())
      )
      .slice(0, maxCompare)
      .map((c) => c.id);
    setSelected(ids);
  };

  // saved set apply
  const applySet = (setId: string) => {
    const s = savedSets.find((x) => x.id === setId);
    if (!s) return;
    setSelected(s.competitorIds.filter((id) => competitors.some((c) => c.id === id)));
    onApplySet?.(setId);
  };

  // compare action
  const handleCompare = () => {
    if (!canCompare || isReadOnly) return;
    if (selected.length === 0) return;
    if (compareLimitExceeded) return;
    onCompare(selected);
    onClose();
  };

  // save set
  const handleSaveSet = () => {
    if (!onSaveSet) return;
    const name = saveName.trim();
    if (!name || selected.length === 0) return;
    onSaveSet(name, selected);
    setSaveName("");
    setSaveOpen(false);
  };

  // keyboard: enter => compare
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !compareLimitExceeded && canCompare && !isReadOnly) {
        e.preventDefault();
        handleCompare();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, compareLimitExceeded, canCompare, isReadOnly]);

  if (!isOpen) return null;

  // seat usage display
  const resetsIn = daysUntil(resetDateISO);

  // role info for tooltip
  const roleHelp =
    role === "Viewer"
      ? "View-only role: comparisons disabled."
      : role === "Editor"
      ? "Editors can compare existing competitors but cannot add or delete."
      : "Admins/Owners can add/delete competitors and compare.";

  // -------------------- Render --------------------
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 md:pt-16"
      aria-modal="true"
      role="dialog"
      aria-labelledby="competitor-selector-title"
      onClick={(e) => {
        // close if clicking backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl rounded-xl bg-white shadow-xl ring-1 ring-black/5"
        style={{ color: TOKENS.text }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: TOKENS.border }}>
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: TOKENS.brand }} />
              <h2 id="competitor-selector-title" className="text-lg font-semibold">
                Select Competitors to Compare
              </h2>
            </div>
            <p className="mt-1 text-sm" style={{ color: TOKENS.textMuted }}>
              Choose up to <span className="font-medium">{maxCompare}</span> competitors for this comparison.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100"
            aria-label="Close"
            title="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Seat banner + upgrade */}
        <div className="flex flex-col gap-2 border-b px-5 py-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: TOKENS.border }}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm" style={{ borderColor: TOKENS.borderSoft, background: TOKENS.bgSoft }}>
              <span className="font-medium">Competitor Slots:</span>
              <span className="font-semibold">{seatUsed}</span>
              <span>/</span>
              <span className="font-semibold">{seatLimit}</span>
              <span className="mx-2 h-4 w-px bg-gray-200" />
              <span className="flex items-center gap-1 text-gray-600">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                Resets in <span className="font-medium">{resetsIn} days</span>
              </span>
            </div>

            <div className="group relative text-sm">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-gray-600 ring-1 ring-inset" style={{ borderColor: TOKENS.border }}>
                <Info className="h-4 w-4" />
                <span className="hidden md:inline">How seats work</span>
              </span>
              <div className="pointer-events-none absolute left-0 top-[115%] z-50 hidden w-80 rounded-md border bg-white p-3 text-xs shadow-lg group-hover:block" style={{ borderColor: TOKENS.border }}>
                Deleting a competitor does not free a seat immediately. Seats refill on the next monthly reset ({fmtDate(resetDateISO)}).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {seatUsed >= seatLimit && (
              <button
                onClick={onUpgradePlan}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
                style={{ borderColor: TOKENS.border, color: TOKENS.text }}
                title="Upgrade to increase competitor slots"
              >
                <Star className="h-4 w-4" />
                Upgrade Plan
              </button>
            )}
            <button
              onClick={onAddCompetitor}
              disabled={!canModifySeats}
              className={classNames(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white",
                canModifySeats ? "hover:brightness-110" : "opacity-50 cursor-not-allowed"
              )}
              style={{ background: TOKENS.brand }}
              title={canModifySeats ? "Add Competitor" : "Only Admins/Owners can add competitors"}
            >
              <Plus className="h-4 w-4" />
              Add Competitor
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-col gap-3 border-b px-5 py-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: TOKENS.border }}>
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by domain, nickname, tag, or added by…"
                className="w-full rounded-md border pl-8 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2"
                style={{ borderColor: TOKENS.border, color: TOKENS.brand }}
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: TOKENS.border }}
              >
                <Filter className="h-4 w-4 text-gray-500" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border px-2 py-2 text-sm"
              style={{ borderColor: TOKENS.border }}
            >
              <option value="wr">WR Score (desc)</option>
              <option value="az">Domain A–Z</option>
              <option value="recent">Recently Added</option>
            </select>

            <div className="hidden md:block h-5 w-px bg-gray-200" />
            <button
              onClick={pickTopWR}
              disabled={!canCompare || isReadOnly}
              className={classNames(
                "rounded-md border px-3 py-2 text-sm",
                canCompare && !isReadOnly ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
              )}
              style={{ borderColor: TOKENS.border }}
              title="Auto-pick top by WR (up to compare limit)"
            >
              Top by WR
            </button>
            <button
              onClick={pickRecent}
              disabled={!canCompare || isReadOnly}
              className={classNames(
                "rounded-md border px-3 py-2 text-sm",
                canCompare && !isReadOnly ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
              )}
              style={{ borderColor: TOKENS.border }}
              title="Auto-pick most recently added"
            >
              Recent
            </button>
          </div>
        </div>

        {/* Saved Sets (pills) */}
        {savedSets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3" style={{ borderColor: TOKENS.border }}>
            <span className="text-sm font-medium">Saved Sets:</span>
            {savedSets.map((s) => {
              const isActive = s.competitorIds.every((id) => selected.includes(id)) && s.competitorIds.length === selected.length;
              return (
                <button
                  key={s.id}
                  onClick={() => applySet(s.id)}
                  className={classNames(
                    "rounded-full border px-3 py-1 text-sm",
                    isActive ? "font-semibold" : ""
                  )}
                  style={{
                    borderColor: isActive ? TOKENS.brand : TOKENS.border,
                    color: isActive ? TOKENS.brand : TOKENS.text,
                    background: isActive ? "#E9F7FF" : "white",
                  }}
                  title={`Apply set: ${s.name}`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Filter chips (expand) – reserved for future tag/category filters */}
        {showFilters && (
          <div className="border-b px-5 py-3" style={{ borderColor: TOKENS.border }}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 ring-1 ring-inset" style={{ borderColor: TOKENS.border }}>
                <span className="h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} />
                Showing {filtered.length} of {competitors.length}
              </span>
              <span className="text-gray-400">•</span>
              <span className="inline-flex items-center gap-2">
                Role: <span className="rounded bg-gray-100 px-2 py-0.5">{role}</span>
                <span className="group relative">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="pointer-events-none absolute left-1/2 z-50 hidden w-64 -translate-x-1/2 rounded-md border bg-white p-2 text-xs shadow group-hover:block" style={{ borderColor: TOKENS.border }}>
                    {roleHelp}
                  </span>
                </span>
              </span>
            </div>
          </div>
        )}

        {/* List */}
        <div className="max-h-[52vh] overflow-auto px-5 py-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-md border py-12 text-center" style={{ borderColor: TOKENS.border }}>
              <Search className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600">No competitors match your search.</p>
            </div>
          )}

          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {filtered.map((c) => {
              const isSelected = selected.includes(c.id);
              const disabledByRole = !canCompare || isReadOnly;
              const itemClasses = classNames(
                "relative flex items-start gap-3 rounded-lg border p-3",
                "hover:bg-gray-50",
                isSelected ? "ring-1 ring-sky-200 bg-[#FAFDFF]" : "",
              );
              const locked = Boolean(c.lockedUntil && new Date(c.lockedUntil!).getTime() > Date.now());
              const lockLabel = locked ? `Locked until ${fmtDate(c.lockedUntil!)}` : null;

              return (
                <li key={c.id} className={itemClasses} style={{ borderColor: TOKENS.border }}>
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabledByRole}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                      title={disabledByRole ? (isReadOnly ? "Viewer: cannot compare" : "Comparison disabled") : "Select competitor"}
                    />
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#EAF6FD] font-semibold text-sky-700">
                        {c.domain.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{c.domain}</span>
                          {c.nickname && (
                            <span className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {c.nickname}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {typeof c.wrScore === "number" && (
                            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 ring-1 ring-inset" style={{ borderColor: TOKENS.borderSoft }}>
                              WR: <span className="font-medium">{c.wrScore}</span>
                            </span>
                          )}
                          {c.tags?.slice(0, 3).map((t) => (
                            <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5">
                              {t}
                            </span>
                          ))}
                          {c.addedBy && (
                            <span className="group relative inline-flex items-center gap-1 rounded px-1.5 py-0.5 ring-1 ring-inset" style={{ borderColor: TOKENS.border }}>
                              Added by: <span className="font-medium">{c.addedBy.name}</span>
                              <span className="pointer-events-none absolute left-0 top-[120%] z-50 hidden w-56 rounded-md border bg-white p-2 text-[11px] shadow group-hover:block" style={{ borderColor: TOKENS.border }}>
                                Added by: {c.addedBy.name} ({c.addedBy.role})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      {c.addedAt && <span>Added: {fmtDate(c.addedAt)}</span>}
                      {locked && (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">
                          <Lock className="h-3.5 w-3.5 text-gray-500" />
                          {lockLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute right-2 top-2 rounded-full bg-sky-50 p-1 ring-1 ring-sky-200">
                      <Check className="h-4 w-4" style={{ color: TOKENS.brand }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer actions */}
        <div className="border-t px-5 py-4" style={{ borderColor: TOKENS.border }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={selectVisible}
                disabled={!canCompare || isReadOnly}
                className={classNames(
                  "rounded-md border px-3 py-2 text-sm",
                  canCompare && !isReadOnly ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                )}
                style={{ borderColor: TOKENS.border }}
                title="Select all visible"
              >
                Select Visible
              </button>
              <button
                onClick={clearVisible}
                disabled={!canCompare || isReadOnly}
                className={classNames(
                  "rounded-md border px-3 py-2 text-sm",
                  canCompare && !isReadOnly ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                )}
                style={{ borderColor: TOKENS.border }}
                title="Clear visible selection"
              >
                Clear Visible
              </button>
              <button
                onClick={clearAll}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                style={{ borderColor: TOKENS.border }}
                title="Clear all selected"
              >
                Clear All
              </button>

              <div className="ml-2 inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 text-sm ring-1 ring-inset" style={{ borderColor: TOKENS.border }}>
                Selected:
                <span
                  className={classNames(
                    "rounded-md px-2 py-0.5 font-medium",
                    compareLimitExceeded ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-700"
                  )}
                >
                  {selectedCount} / {maxCompare}
                </span>
                {compareLimitExceeded && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Max {maxCompare} allowed
                  </span>
                )}
              </div>
            </div>

            {/* Save set + Compare */}
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              {/* Save named set */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSaveOpen((s) => !s)}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                  style={{ borderColor: TOKENS.border }}
                  title="Save current selection as a named compare set"
                >
                  <Save className="h-4 w-4 text-gray-500" />
                  Save Set
                  {saveOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
                {saveOpen && (
                  <div className="flex items-center gap-2">
                    <input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Set name (e.g., Local Rivals)"
                      className="w-52 rounded-md border px-2 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: TOKENS.border }}
                    />
                    <button
                      onClick={handleSaveSet}
                      disabled={!onSaveSet || saveName.trim() === "" || selected.length === 0}
                      className={classNames(
                        "rounded-md px-3 py-2 text-sm font-medium text-white",
                        saveName.trim() && selected.length > 0 ? "hover:brightness-110" : "opacity-50 cursor-not-allowed"
                      )}
                      style={{ background: TOKENS.brand }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="hidden h-5 w-px bg-gray-200 md:block" />

              {/* Cancel / Compare */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompare}
                  disabled={!canCompare || isReadOnly || selected.length === 0 || compareLimitExceeded}
                  className={classNames(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white",
                    canCompare && !isReadOnly && selected.length > 0 && !compareLimitExceeded
                      ? "hover:brightness-110"
                      : "opacity-50 cursor-not-allowed"
                  )}
                  style={{ background: TOKENS.brand }}
                >
                  <Check className="h-4 w-4" />
                  Compare Now
                </button>
              </div>
            </div>
          </div>

          {/* Role notice */}
          {!canCompare && (
            <p className="mt-2 text-xs text-red-600">
              Your role does not allow comparisons. Contact an Admin or Project Owner.
            </p>
          )}
          {isReadOnly && (
            <p className="mt-2 text-xs text-gray-600">
              View-only access: comparisons are disabled for Viewers.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo wrapper for canvas preview (not required in your app)
// ---------------------------------------------------------------------------
const MOCK_COMPETITORS: CompetitorItem[] = [
  { id: "c1", domain: "comp1.com", nickname: "Main US Blog", tags: ["Blog","Tech"], wrScore: 87, addedAt: "2025-06-12", addedBy: { name: "John", role: "Admin" } },
  { id: "c2", domain: "comp2.com", tags: ["Marketplace"], wrScore: 74, addedAt: "2025-05-21", lockedUntil: "2025-12-01", addedBy: { name: "Sara", role: "Editor" } },
  { id: "c3", domain: "rival.io", tags: ["SaaS","Local"], wrScore: 66, addedAt: "2025-07-15", addedBy: { name: "Dev", role: "Owner" } },
  { id: "c4", domain: "alpha.dev", tags: ["Tools"], wrScore: 92, addedAt: "2025-07-25", addedBy: { name: "Kim", role: "Admin" } },
  { id: "c5", domain: "beta.co", tags: ["Blog"], wrScore: 58, addedAt: "2025-06-28", addedBy: { name: "Jas", role: "Editor" } },
];

const MOCK_SETS: SavedCompareSet[] = [
  { id: "s1", name: "Local Rivals", competitorIds: ["c1", "c3"] },
  { id: "s2", name: "Big Players", competitorIds: ["c1", "c4"] },
];

export default function DemoCanvas() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("Editor");
  const [selected, setSelected] = useState<string[]>(["c1"]);
  const [seatUsed, setSeatUsed] = useState(6);
  const [seatLimit] = useState(10);

  return (
    // <div className="min-h-[80vh] bg-[var(--wr-bg,#fff)]">
    //   <div className="mx-auto max-w-5xl px-4 py-6">
    //     <div className="mb-4 flex flex-wrap items-center gap-2">
    //       <button
    //         onClick={() => setOpen(true)}
    //         className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:brightness-110"
    //       >
    //         Open Competitor Selector
    //       </button>

    //       <select
    //         value={role}
    //         onChange={(e) => setRole(e.target.value as Role)}
    //         className="rounded-md border px-2 py-2 text-sm"
    //       >
    //         <option>Owner</option>
    //         <option>Admin</option>
    //         <option>Editor</option>
    //         <option>Viewer</option>
    //       </select>

    //       <div className="ml-auto inline-flex items-center gap-2 text-sm">
    //         <span className="rounded border px-2 py-1">Seats: {seatUsed}/{seatLimit}</span>
    //         <button
    //           onClick={() => setSeatUsed((s) => Math.min(seatLimit, s + 1))}
    //           className="rounded border px-2 py-1 hover:bg-gray-50"
    //         >
    //           + seat
    //         </button>
    //         <button
    //           onClick={() => setSeatUsed((s) => Math.max(0, s - 1))}
    //           className="rounded border px-2 py-1 hover:bg-gray-50"
    //         >
    //           - seat
    //         </button>
    //       </div>
    //     </div>

    //     <p className="text-sm text-gray-600">Current role: <span className="font-medium">{role}</span></p>
    //   </div>

    //   <CompetitorSelectorModal
    //     isOpen={open}
    //     onClose={() => setOpen(false)}
    //     competitors={MOCK_COMPETITORS}
    //     savedSets={MOCK_SETS}
    //     selectedIds={selected}
    //     maxCompare={3}
    //     seatUsed={seatUsed}
    //     seatLimit={seatLimit}
    //     resetDateISO={"2025-12-01"}
    //     role={role}
    //     onCompare={(ids) => {
    //       setSelected(ids);
    //       alert(`Compare triggered with: ${ids.join(", ")}`);
    //     }}
    //     onSaveSet={(name, ids) => {
    //       alert(`Saved set "${name}" with ${ids.length} competitors`);
    //     }}
    //     onApplySet={() => {}}
    //     onAddCompetitor={() => alert("Add competitor clicked")}
    //     onUpgradePlan={() => alert("Upgrade plan clicked")}
    //   />
    // </div>
<>
          <button
            onClick={() => setOpen(true)}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:brightness-110 cursor-pointer"
          >
          Competitor Selector
          </button>
      <CompetitorSelectorModal
        isOpen={open}
        onClose={() => setOpen(false)}
        competitors={MOCK_COMPETITORS}
        savedSets={MOCK_SETS}
        selectedIds={selected}
        maxCompare={3}
        seatUsed={seatUsed}
        seatLimit={seatLimit}
        resetDateISO={"2025-12-01"}
        role={role}
        onCompare={(ids) => {
          setSelected(ids);
          alert(`Compare triggered with: ${ids.join(", ")}`);
        }}
        onSaveSet={(name, ids) => {
          alert(`Saved set "${name}" with ${ids.length} competitors`);
        }}
        onApplySet={() => {}}
        onAddCompetitor={() => alert("Add competitor clicked")}
        onUpgradePlan={() => alert("Upgrade plan clicked")}
      />

</>  

);
}
