"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings2,
  ArrowUpDown,
  Link as LinkIcon,
  FileText,
  Save,
  Undo2,
  X,
  Info,
  Lock,
} from "lucide-react";

/**
 * Alert Rule Engine – Modal/Drawer (drop‑in)
 * ------------------------------------------------------------------
 * ✅ Inter / Inter Fallback font stack applied
 * ✅ No emoji anywhere
 * ✅ Branded (#008CCD) icons for section titles & action types
 * ✅ Favicon chips for project & competitor domains
 * ✅ Modular Switch, Chip, NumberInput, Buttons with cursor-pointer
 *
 * Exports:
 *   - AlertRuleEngineModal (named): controlled component
 *   - default AlertRuleEngineDemo: a demo host you can drop in to see it live
 */

// ----------------------------- Tokens ------------------------------
const TK = {
  brand: "#008CCD", // branded icons & primary actions
  alt: "#0077FF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  divider: "#E5E7EB",
  danger: "#EF4444",
  ok: "#10B981",
  warn: "#F59E0B",
};

const INTER_FONT = {
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

type Role = "admin" | "editor" | "viewer";

type Scope =
  | { type: "page"; competitorDomain: string; pageUrl: string; keyword?: undefined }
  | { type: "keyword"; competitorDomain: string; keyword: string; pageUrl?: undefined };

type Frequency = "instant" | "daily" | "weekly";

type RuleSetVM = {
  scope: Scope;
  rules: {
    rankImprove: { enabled: boolean; positions: number };
    rankDrop: { enabled: boolean; positions: number };
    backlinkNew: { enabled: boolean };
    backlinkRemoved: { enabled: boolean };
    contentLengthDelta: { enabled: boolean; pct: number };
    newHeadings: { enabled: boolean };
  };
  frequency: Frequency;
  role: Role;
  updatedAtISO?: string;
};

type Persisted = {
  id?: string;
  projectId?: string;
  scope: Scope;
  rules: {
    rankImprove?: { positions: number } | null;
    rankDrop?: { positions: number } | null;
    backlinkNew?: true | null;
    backlinkRemoved?: true | null;
    contentLengthDelta?: { pct: number } | null;
    newHeadings?: true | null;
  };
  frequency: Frequency;
  cooldownHours?: number; // default 24
  updatedAtISO?: string;
};

// --------------------------- Mock API --------------------------------
async function mockGetRules(scope: Scope): Promise<Persisted | null> {
  await delay(300);
  return {
    id: "rule_abc123",
    scope,
    rules: {
      rankImprove: { positions: 4 },
      rankDrop: { positions: 3 },
      backlinkNew: true,
      backlinkRemoved: true,
      contentLengthDelta: { pct: 12 },
      newHeadings: null,
    },
    frequency: "instant",
    cooldownHours: 24,
    updatedAtISO: new Date(Date.now() - 3600_000).toISOString(),
  };
}

async function mockSaveRules(payload: Persisted): Promise<{ id: string; updatedAtISO: string }> {
  await delay(300);
  return { id: payload.id || "rule_new_" + Math.random().toString(36).slice(2), updatedAtISO: new Date().toISOString() };
}
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --------------------------- Defaults/Helpers ------------------------
const DEFAULTS: RuleSetVM["rules"] = {
  rankImprove: { enabled: true, positions: 3 },
  rankDrop: { enabled: true, positions: 2 },
  backlinkNew: { enabled: true },
  backlinkRemoved: { enabled: true },
  contentLengthDelta: { enabled: true, pct: 10 },
  newHeadings: { enabled: false },
};

const clampInt = (n: any, min: number, max: number) => {
  const v = Number.parseInt(String(n), 10);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
};
const dequal = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const faviconFor = (domain?: string) =>
  domain ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}` : "/favicon.ico";

// -------------------------- UI Primitives ----------------------------
function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-[color:var(--wr-brand,#008CCD)]" : "bg-gray-200",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      style={{ ["--wr-brand" as any]: TK.brand }}
      title={label}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function NumberInput({
  value,
  onChange,
  min = 1,
  max = 100,
  step = 1,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <div className="inline-flex items-center rounded-md border bg-white" style={{ borderColor: TK.divider }}>
      <button
        type="button"
        onClick={() => !disabled && onChange(clampInt(value - step, min, max))}
        className="cursor-pointer px-2 py-1 text-sm text-gray-600 disabled:opacity-40"
        disabled={disabled}
        aria-label="Decrement"
        title="Decrement"
      >
        –
      </button>
      <input
        aria-label={ariaLabel}
        className="w-14 border-0 bg-transparent px-1 py-1 text-center text-sm outline-none"
        value={txt}
        inputMode="numeric"
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => onChange(clampInt(txt, min, max))}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => !disabled && onChange(clampInt(value + step, min, max))}
        className="cursor-pointer px-2 py-1 text-sm text-gray-600 disabled:opacity-40"
        disabled={disabled}
        aria-label="Increment"
        title="Increment"
      >
        +
      </button>
    </div>
  );
}

function Chip({ children }: React.PropsWithChildren) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: TK.divider, color: TK.muted }}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-2 flex items-start gap-2">
      <div className="mt-0.5">
        <span className="inline-grid h-6 w-6 place-items-center rounded-md bg-[#E8F5FD]">
          {/* brand-colored icon */}
          <span className="text-[color:var(--brand,#008CCD)]" style={{ ["--brand" as any]: TK.brand }}>
            {icon}
          </span>
        </span>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{title}</div>
        {desc ? <div className="text-xs text-gray-500">{desc}</div> : null}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse">
      <div className="mb-2 h-4 w-1/2 rounded bg-gray-200" />
      <div className="mb-3 h-4 w-2/3 rounded bg-gray-100" />
      <div className="mb-4 h-24 w-full rounded bg-gray-100" />
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center" style={INTER_FONT}>
      <div
        className="rounded-md border bg-white px-3 py-2 text-sm shadow"
        style={{ borderColor: TK.border, color: TK.text }}
      >
        {msg}
      </div>
    </div>
  );
}

// ----------------------------- Modal Component ------------------------
export function AlertRuleEngineModal({
  open,
  onClose,
  scope,
  role = "admin",
  initial,
  projectId,
  onSave,
  projectDomain = "you.example", // used to show a favicon for your project
}: {
  open: boolean;
  onClose: () => void;
  scope: Scope;
  role?: Role;
  initial?: Partial<RuleSetVM>;
  projectId?: string;
  onSave?: (payload: Persisted) => Promise<void> | void;
  projectDomain?: string;
}) {
  const canEdit = role === "admin";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [persistedId, setPersistedId] = useState<string | undefined>(undefined);
  const [updatedAtISO, setUpdatedAtISO] = useState<string | undefined>(undefined);

  const [rules, setRules] = useState<RuleSetVM["rules"]>(initial?.rules || DEFAULTS);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency || "instant");

  const original = useRef<{ rules: RuleSetVM["rules"]; frequency: Frequency } | null>(null);

  // Focus trap + restore focus
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  // Load on open
  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const got = await mockGetRules(scope);
        if (!got) {
          setRules(DEFAULTS);
          setFrequency("instant");
          setPersistedId(undefined);
          setUpdatedAtISO(undefined);
          original.current = { rules: DEFAULTS, frequency: "instant" };
        } else {
          const vm: RuleSetVM["rules"] = {
            rankImprove: { enabled: !!got.rules.rankImprove, positions: got.rules.rankImprove?.positions ?? 3 },
            rankDrop: { enabled: !!got.rules.rankDrop, positions: got.rules.rankDrop?.positions ?? 2 },
            backlinkNew: { enabled: !!got.rules.backlinkNew },
            backlinkRemoved: { enabled: !!got.rules.backlinkRemoved },
            contentLengthDelta: { enabled: !!got.rules.contentLengthDelta, pct: got.rules.contentLengthDelta?.pct ?? 10 },
            newHeadings: { enabled: !!got.rules.newHeadings },
          };
          setRules(vm);
          setFrequency(got.frequency);
          setPersistedId(got.id);
          setUpdatedAtISO(got.updatedAtISO);
          original.current = { rules: vm, frequency: got.frequency };
        }
      } catch {
        setError("Couldn't load rules. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, scope]);

  // Close cleanup & restore focus
  const restoreFocus = () => {
    const el = lastActiveRef.current;
    if (el && typeof el.focus === "function") {
      setTimeout(() => el.focus(), 0);
    }
  };

  // Focus trap & ESC
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        attemptClose();
      } else if (e.key === "Tab") {
        // focus trap
        const focusables = el.querySelectorAll<HTMLElement>(
          [
            "button:not(:disabled)",
            "a[href]",
            "input:not(:disabled)",
            "select:not(:disabled)",
            "textarea:not(:disabled)",
            "[tabindex]:not([tabindex='-1'])",
          ].join(","),
        );
        const array = Array.from(focusables);
        if (array.length === 0) return;
        const first = array[0];
        const last = array[array.length - 1];
        if (!el.contains(document.activeElement)) {
          first.focus();
          e.preventDefault();
        } else {
          if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          } else if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rules, frequency]);

  const dirty = useMemo(() => {
    if (!original.current) return false;
    return !dequal(original.current, { rules, frequency });
  }, [rules, frequency]);

  const [errors, setErrors] = useState<{ improve?: string; drop?: string; pct?: string }>({});

  const validate = () => {
    const next: typeof errors = {};
    const imp = rules.rankImprove.positions;
    if (rules.rankImprove.enabled && (imp < 1 || imp > 50 || !Number.isInteger(imp))) next.improve = "Enter a whole number 1–50";
    const drp = rules.rankDrop.positions;
    if (rules.rankDrop.enabled && (drp < 1 || drp > 50 || !Number.isInteger(drp))) next.drop = "Enter a whole number 1–50";
    const pct = rules.contentLengthDelta.pct;
    if (rules.contentLengthDelta.enabled && (pct < 1 || pct > 100 || !Number.isInteger(pct))) next.pct = "Enter a whole number 1–100";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const attemptClose = () => {
    if (dirty && canEdit) {
      const ok = window.confirm("Discard unsaved changes?");
      if (!ok) return;
    }
    onClose();
    restoreFocus();
  };

  const save = async () => {
    if (!canEdit) return;
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const payload: Persisted = {
        id: persistedId,
        projectId,
        scope,
        rules: {
          rankImprove: rules.rankImprove.enabled ? { positions: rules.rankImprove.positions } : null,
          rankDrop: rules.rankDrop.enabled ? { positions: rules.rankDrop.positions } : null,
          backlinkNew: rules.backlinkNew.enabled ? true : null,
          backlinkRemoved: rules.backlinkRemoved.enabled ? true : null,
          contentLengthDelta: rules.contentLengthDelta.enabled ? { pct: rules.contentLengthDelta.pct } : null,
          newHeadings: rules.newHeadings.enabled ? true : null,
        },
        frequency,
        cooldownHours: 24,
      };

      let res: { id: string; updatedAtISO: string } = {
        id: persistedId || "rule_local",
        updatedAtISO: new Date().toISOString(),
      };
      if (onSave) {
        await onSave(payload);
      } else {
        res = await mockSaveRules(payload);
      }

      setPersistedId(res.id);
      setUpdatedAtISO(res.updatedAtISO);
      original.current = { rules, frequency };
      setToast("Alert rules saved");
      setTimeout(() => setToast(null), 1800);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = () => {
    setRules(DEFAULTS);
    setFrequency("instant");
    setErrors({});
  };

  if (!open) return null;

  const subject =
    scope.type === "page" ? (
      <code className="rounded bg-gray-50 px-1.5 py-0.5 text-[12px]">{scope.pageUrl}</code>
    ) : (
      <span className="italic">“{scope.keyword}”</span>
    );

  const viewOnly = role !== "admin";

  return (
    <>
      {toast && <Toast msg={toast} />}

      {/* Scrim */}
      {/* <div className="fixed inset-0 z-[60] bg-black/30" onClick={attemptClose} /> */}

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Manage Alert Rules"
        className="fixed right-0 top-0 z-[61] h-full w-full max-w-[520px] bg-white shadow-xl"
        style={{ borderLeft: `1px solid ${TK.border}`, ...INTER_FONT }}
        ref={dialogRef}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between border-b bg-white px-4 py-3"
          style={{ borderColor: TK.border }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-grid h-7 w-7 place-items-center rounded-md bg-[#E8F5FD]">
                <Settings2 size={18} color={TK.brand} />
              </span>
              <h3 className="truncate text-[15px] font-semibold text-gray-900">
                Manage Alert Rules for {subject}
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              {/* Your project (favicon) */}
              <Chip>
                <span className="inline-flex items-center gap-1">
                  <img src={faviconFor(projectDomain)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  <span className="font-mono">{projectDomain}</span>
                </span>
              </Chip>
              {/* Competitor (favicon) */}
              <Chip>
                <span className="inline-flex items-center gap-1">
                  <img src={faviconFor(scope.competitorDomain)} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  Competitor: <span className="font-mono">{scope.competitorDomain}</span>
                </span>
              </Chip>
              {updatedAtISO && <Chip>Updated: {new Date(updatedAtISO).toLocaleString()}</Chip>}
              {viewOnly && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                  style={{ borderColor: TK.divider, color: TK.muted }}
                  title="View-only"
                >
                  <Lock size={12} color={TK.brand} /> View only
                </span>
              )}
            </div>
          </div>
          {/* <button
            type="button"
            onClick={attemptClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md hover:bg-gray-100"
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button> */}
        </div>

        {/* Body */}
        <div className="h-[calc(100%-122px)] overflow-auto px-4 py-4 sm:px-5">
          <ModalBody
            loading={loading}
            error={error}
            rules={rules}
            setRules={setRules}
            frequency={frequency}
            setFrequency={setFrequency}
            viewOnly={viewOnly}
            errors={errors}
            setErrors={setErrors}
            scope={scope}
          />
        </div>

        {/* Footer (actions) */}
        <div
          className="sticky bottom-0 flex items-center justify-between gap-2 border-t bg-white px-4 py-3 sm:px-5"
          style={{ borderColor: TK.border }}
        >
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: TK.divider }}
            disabled={loading || viewOnly}
            title="Reset to defaults"
          >
            <Undo2 size={16} color={TK.brand} /> Reset to Default
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={attemptClose}
              className="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={save}
                className={[
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white shadow-sm",
                  loading ? "opacity-80" : "hover:opacity-95",
                ].join(" ")}
                style={{ background: TK.brand }}
                disabled={loading || !validateNoThrow(rules, errors)}
                title={loading ? "Saving…" : "Save alert rules"}
              >
                <Save size={16} /> {loading ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function ModalBody({
  loading,
  error,
  rules,
  setRules,
  frequency,
  setFrequency,
  viewOnly,
  errors,
  setErrors,
  scope,
}: {
  loading: boolean;
  error: string | null;
  rules: RuleSetVM["rules"];
  setRules: React.Dispatch<React.SetStateAction<RuleSetVM["rules"]>>;
  frequency: Frequency;
  setFrequency: React.Dispatch<React.SetStateAction<Frequency>>;
  viewOnly: boolean;
  errors: { improve?: string; drop?: string; pct?: string };
  setErrors: React.Dispatch<React.SetStateAction<{ improve?: string; drop?: string; pct?: string }>>;
  scope: Scope;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border p-4" style={{ borderColor: TK.border }}>
        <div className="flex items-start gap-2">
          <Info className="mt-0.5" size={18} color={TK.danger} />
          <div>
            <div className="text-sm font-medium text-gray-900">Error</div>
            <div className="text-sm text-gray-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Rank Change Alerts */}
      <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: TK.border }}>
        <SectionHeader
          icon={<ArrowUpDown size={16} color={TK.brand} />}
          title="Rank change alerts"
          desc="Notify when the page's ranking moves significantly."
        />
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={rules.rankImprove.enabled}
              onChange={(v) => setRules((s) => ({ ...s, rankImprove: { ...s.rankImprove, enabled: v } }))}
              disabled={viewOnly}
              label="Notify if rank improves"
            />
            <span className="text-sm text-gray-800">Notify if rank improves by</span>
            <NumberInput
              ariaLabel="Improve positions"
              value={rules.rankImprove.positions}
              min={1}
              max={50}
              step={1}
              disabled={viewOnly || !rules.rankImprove.enabled}
              onChange={(v) => {
                setRules((s) => ({ ...s, rankImprove: { ...s.rankImprove, positions: v } }));
                setErrors((e) => ({ ...e, improve: undefined }));
              }}
            />
            <span className="text-sm text-gray-800">positions</span>
          </div>
          {errors.improve && <div className="ml-[44px] text-xs text-red-600">{errors.improve}</div>}

          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={rules.rankDrop.enabled}
              onChange={(v) => setRules((s) => ({ ...s, rankDrop: { ...s.rankDrop, enabled: v } }))}
              disabled={viewOnly}
              label="Notify if rank drops"
            />
            <span className="text-sm text-gray-800">Notify if rank drops by</span>
            <NumberInput
              ariaLabel="Drop positions"
              value={rules.rankDrop.positions}
              min={1}
              max={50}
              step={1}
              disabled={viewOnly || !rules.rankDrop.enabled}
              onChange={(v) => {
                setRules((s) => ({ ...s, rankDrop: { ...s.rankDrop, positions: v } }));
                setErrors((e) => ({ ...e, drop: undefined }));
              }}
            />
            <span className="text-sm text-gray-800">positions</span>
          </div>
          {errors.drop && <div className="ml-[44px] text-xs text-red-600">{errors.drop}</div>}
        </div>
      </div>

      {/* Backlink Alerts */}
      <div className="mt-3 rounded-lg border p-3 sm:p-4" style={{ borderColor: TK.border }}>
        <SectionHeader icon={<LinkIcon size={16} color={TK.brand} />} title="Backlink alerts" desc="Detect new or removed backlinks pointing to this page." />
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Switch
              checked={rules.backlinkNew.enabled}
              onChange={(v) => setRules((s) => ({ ...s, backlinkNew: { enabled: v } }))}
              disabled={viewOnly}
              label="Notify on new backlinks"
            />
            <span className="text-sm">Notify on new backlinks added</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={rules.backlinkRemoved.enabled}
              onChange={(v) => setRules((s) => ({ ...s, backlinkRemoved: { enabled: v } }))}
              disabled={viewOnly}
              label="Notify if backlink is removed"
            />
            <span className="text-sm">Notify if backlink is removed</span>
          </div>
        </div>
      </div>

      {/* Content Change Alerts */}
      <div className="mt-3 rounded-lg border p-3 sm:p-4" style={{ borderColor: TK.border }}>
        <SectionHeader icon={<FileText size={16} color={TK.brand} />} title="Content change alerts" desc="Watch for meaningful content updates." />
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              checked={rules.contentLengthDelta.enabled}
              onChange={(v) => setRules((s) => ({ ...s, contentLengthDelta: { ...s.contentLengthDelta, enabled: v } }))}
              disabled={viewOnly}
              label="Alert if content length changes"
            />
            <span className="text-sm text-gray-800">Alert if content length changes by</span>
            <NumberInput
              ariaLabel="Content delta percent"
              value={rules.contentLengthDelta.pct}
              min={1}
              max={100}
              step={1}
              disabled={viewOnly || !rules.contentLengthDelta.enabled}
              onChange={(v) => {
                setRules((s) => ({ ...s, contentLengthDelta: { ...s.contentLengthDelta, pct: v } }));
                setErrors((e) => ({ ...e, pct: undefined }));
              }}
            />
            <span className="text-sm text-gray-800">%</span>
          </div>
          {errors.pct && <div className="ml-[44px] text-xs text-red-600">{errors.pct}</div>}

          <div className="flex items-center gap-3">
            <Switch
              checked={rules.newHeadings.enabled}
              onChange={(v) => setRules((s) => ({ ...s, newHeadings: { enabled: v } }))}
              disabled={viewOnly}
              label="Notify on new headings"
            />
            <span className="text-sm">Notify on new heading (H1/H2) additions</span>
          </div>
        </div>
      </div>

      {/* Frequency & Mode */}
      <div className="mt-3 rounded-lg border p-3 sm:p-4" style={{ borderColor: TK.border }}>
        <SectionHeader icon={<Settings2 size={16} color={TK.brand} />} title="Frequency & mode" desc="Choose how often alerts are delivered." />
        {/* Desktop radios */}
        <div className="mt-2 hidden gap-4 sm:flex">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="freq"
              className="accent-[color:var(--wr-brand,#008CCD)]"
              style={{ ["--wr-brand" as any]: TK.brand }}
              checked={frequency === "instant"}
              onChange={() => setFrequency("instant")}
              disabled={viewOnly}
            />
            Instant
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="freq"
              className="accent-[color:var(--wr-brand,#008CCD)]"
              style={{ ["--wr-brand" as any]: TK.brand }}
              checked={frequency === "daily"}
              onChange={() => setFrequency("daily")}
              disabled={viewOnly}
            />
            Daily digest (7am)
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="freq"
              className="accent-[color:var(--wr-brand,#008CCD)]"
              style={{ ["--wr-brand" as any]: TK.brand }}
              checked={frequency === "weekly"}
              onChange={() => setFrequency("weekly")}
              disabled={viewOnly}
            />
            Weekly summary (Mon 8am)
          </label>
        </div>
        {/* Mobile select */}
        <div className="mt-2 sm:hidden">
          <select
            className="h-9 w-full cursor-pointer rounded-md border bg-white px-2 text-sm"
            style={{ borderColor: TK.divider }}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            disabled={viewOnly}
          >
            <option value="instant">Instant</option>
            <option value="daily">Daily digest (7am)</option>
            <option value="weekly">Weekly summary (Mon 8am)</option>
          </select>
        </div>
      </div>

      {/* Helper Note */}
      <div
        className="mt-3 rounded-md border px-3 py-2 text-xs"
        style={{ borderColor: TK.border, color: TK.muted }}
      >
        <span className="inline-flex items-center gap-1">
          <Info size={14} color={TK.brand} />
          Alerts include a 24‑hour cool‑down. Events are still written to the Alert Log.
        </span>
      </div>
    </>
  );
}

function validateNoThrow(rules: RuleSetVM["rules"], errs: { improve?: string; drop?: string; pct?: string }) {
  const tmp: typeof errs = {};
  if (rules.rankImprove.enabled && (!Number.isInteger(rules.rankImprove.positions) || rules.rankImprove.positions < 1 || rules.rankImprove.positions > 50)) {
    tmp.improve = "...";
  }
  if (rules.rankDrop.enabled && (!Number.isInteger(rules.rankDrop.positions) || rules.rankDrop.positions < 1 || rules.rankDrop.positions > 50)) {
    tmp.drop = "...";
  }
  if (rules.contentLengthDelta.enabled && (!Number.isInteger(rules.contentLengthDelta.pct) || rules.contentLengthDelta.pct < 1 || rules.contentLengthDelta.pct > 100)) {
    tmp.pct = "...";
  }
  return Object.keys(tmp).length === 0 && Object.keys(errs).length === 0;
}

// ----------------------------- Demo Host -----------------------------
export default function AlertRuleEngineDemo() {
  const [open, setOpen] = useState(true); // visible by default so you can see it
  return (
<>
<AlertRuleEngineModal
        open={open}
        onClose={() => setOpen(false)}
        role="admin"
        projectId="proj_demo_123"
        projectDomain="you.example"
        scope={{ type: "page", competitorDomain: "comp1.com", pageUrl: "/seo-guide" }}
        onSave={async (payload) => {
          // Replace with your API call:
          console.log("Saving payload →", payload);
          await delay(200);
        }}
      />
</>
  );
}
