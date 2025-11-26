// AnalyticsPanelSettings.tsx
"use client";

import { Drawer } from "antd";
import React from "react";

/* ──────────────────────────────────────────────────────────────────────────────
   Font stack (Inter + Inter Fallback) & Token Aliases (fallbacks)
   -------------------------------------------------------------------------- */
const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

const TK = {
  brand: "var(--brand, #008CCD)",
  focus: "var(--focus, #4286F5)",
  text: "var(--text-strong, #111827)",
  muted: "var(--text-muted, #6B7280)",
  panel: "var(--bg-panel, #FFFFFF)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  success: "var(--success, #34A853)",
  warning: "var(--warning, #F9BB04)",
  critical: "var(--critical, #E94134)",
  successBg: "var(--success-bg, #CBF8D7)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  shadow: "var(--shadow, 0 1px 3px rgba(0,0,0,0.1))",
  radius: "var(--radius, 6px)",
  overlay: "var(--overlay, rgba(17,24,39,0.96))",
};

/* ──────────────────────────────────────────────────────────────────────────────
   Types
   -------------------------------------------------------------------------- */
type IntegrationStatus = "connected" | "expired" | "none";
type SourcePriority = "ga4_first" | "gsc_first";
type DevicePref = "all" | "desktop" | "mobile";
type Density = "compact" | "detailed";
type ChartMode = "auto" | "line" | "bar";
type LabelFmt = "abbr" | "full";
type RangeKey = "7d" | "30d" | "90d" | "custom";
type Frequency = "hourly" | "daily" | "weekly";

type SettingsModel = {
  integrations: {
    ga4: { status: IntegrationStatus; propertyId: string; lastSync: string };
    gsc: { status: IntegrationStatus; siteUrl: string; lastSync: string };
  };
  display: {
    range: RangeKey;
    customRange: { start: string; end: string };
    sourcePriority: SourcePriority;
    device: DevicePref;
    density: Density;
    chartMode: ChartMode;
    labelFormat: LabelFmt;
    grouping: "exact" | "canonical" | null;
  };
  thresholds: {
    minSessions: number;
    minImpressions: number;
    ctrWarnPct: number; // 0..10
    maxAvgPosition: number;
  };
  metrics: {
    visible: Array<
      "sessions" | "users" | "clicks" | "impressions" | "ctr" | "position" | "conversionRate"
    >;
    order: Array<"sessions" | "clicks" | "ctr" | "position" | "impressions">;
    tooltips: boolean;
  };
  refresh: {
    auto: boolean;
    frequency: Frequency;
    alertOnFailure: boolean;
    lastManual: string;
  };
  privacy: {
    ga4VerifiedAt: string;
    gscVerifiedAt: string;
  };
};

/* ──────────────────────────────────────────────────────────────────────────────
   Defaults (spec)
   -------------------------------------------------------------------------- */
const DEFAULTS: SettingsModel = {
  integrations: {
    ga4: { status: "connected", propertyId: "wranker.com (GA4-123)", lastSync: isoHoursAgo(6) },
    gsc: { status: "expired", siteUrl: "https://wranker.com/", lastSync: isoHoursAgo(20) },
  },
  display: {
    range: "30d",
    customRange: { start: "", end: "" },
    sourcePriority: "ga4_first",
    device: "all",
    density: "compact",
    chartMode: "auto",
    labelFormat: "abbr",
    grouping: null,
  },
  thresholds: {
    minSessions: 100,
    minImpressions: 300,
    ctrWarnPct: 2.5,
    maxAvgPosition: 20,
  },
  metrics: {
    visible: ["clicks", "impressions", "ctr", "position", "sessions"],
    order: ["sessions", "clicks", "ctr", "position", "impressions"],
    tooltips: true,
  },
  refresh: {
    auto: true,
    frequency: "daily",
    alertOnFailure: true,
    lastManual: "",
  },
  privacy: {
    ga4VerifiedAt: isoHoursAgo(6),
    gscVerifiedAt: isoHoursAgo(22),
  },
};

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
   -------------------------------------------------------------------------- */
function isoHoursAgo(h: number) {
  const d = new Date(Date.now() - h * 3600 * 1000);
  return d.toISOString();
}
function timeLabel(iso: string) {
  if (!iso) return "—";
  const dt = new Date(iso);
  const now = new Date();
  const diffH = Math.max(0, Math.round((+now - +dt) / 3600000));
  return `${diffH}h ago`;
}
function formatStamp(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* ──────────────────────────────────────────────────────────────────────────────
   Branded inline icons (no external lib; all use currentColor)
   -------------------------------------------------------------------------- */
const I = {
  Refresh: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M20 11a8 8 0 10-2.1 5.3M20 4v7h-7" />
    </svg>
  ),
  Link: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="2" d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 10-7.07-7.07L10 5" />
      <path strokeWidth="2" d="M14 11a5 5 0 01-7.07 0L4.8 8.88a5 5 0 117.07-7.07L14 5" />
    </svg>
  ),
  Alert: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-8h-2v6h2V10z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 16.17l-3.88-3.88L3.7 13.7 9 19l12-12-1.41-1.41z" />
    </svg>
  ),
  X: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3 10.59 10.59 16.89 4.3z" />
    </svg>
  ),
  Settings: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm10 4a2 2 0 01-1 1.73l-1.07.62.2 1.2a2 2 0 01-.98 2.1l-1 .58a2 2 0 01-2.12-.14l-.97-.7-1.06.61a2 2 0 01-2.12 0l-1.06-.61-.97.7a2 2 0 01-2.12.14l-1-.58a2 2 0 01-.98-2.1l.2-1.2-1.07-.62A2 2 0 0122 12z" />
    </svg>
  ),
  Trash: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M5.5 7l4.5 4.5L14.5 7z" />
    </svg>
  ),
  Grip: () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M7 4h2v2H7V4zm4 0h2v2h-2V4zM7 8h2v2H7V8zm4 0h2v2h-2V8zM7 12h2v2H7v-2zm4 0h2v2h-2v-2z" />
    </svg>
  ),
  /* Branded device/action icons */
  Devices: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="2" y="4" width="14" height="10" rx="2" strokeWidth="2" />
      <rect x="18" y="10" width="4" height="8" rx="1" strokeWidth="2" />
    </svg>
  ),
  Monitor: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" strokeWidth="2" />
      <path d="M8 20h8" strokeWidth="2" />
    </svg>
  ),
  Phone: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="8" y="3" width="8" height="18" rx="2" strokeWidth="2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  Lock: () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="4" y="11" width="16" height="9" rx="2" strokeWidth="2" />
      <path d="M8 11V8a4 4 0 118 0v3" strokeWidth="2" />
    </svg>
  ),
};

/* ──────────────────────────────────────────────────────────────────────────────
   Global pointer cursor for all interactive controls (refinement)
   -------------------------------------------------------------------------- */
function GlobalPointerStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
button, a, [role="button"], [role="switch"], [role="radio"],
input[type="checkbox"], input[type="radio"], input[type="date"], input[type="range"], input[type="number"],
select, summary, .cursor-pointer { cursor: pointer; }
`,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Small UI primitives (chips, toggles, cards, badges)
   -------------------------------------------------------------------------- */
function Card(props: React.PropsWithChildren<{ title?: string; actions?: React.ReactNode; desc?: string; icon?: React.ReactNode }>) {
  return (
    <div
      className="w-full"
      style={{
        background: TK.panel,
        border: `1px solid ${TK.border}`,
        borderRadius: TK.radius,
        boxShadow: TK.shadow,
      }}
    >
      {(props.title || props.actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: TK.borderSubtle }}>
          <div className="flex items-center gap-2">
            {props.icon && <span className="shrink-0" style={{ color: TK.brand }}>{props.icon}</span>}
            <div>
              {props.title && <h3 className="text-[20px] leading-6 font-semibold" style={{ color: TK.text }}>{props.title}</h3>}
              {props.desc && <div className="text-sm mt-0.5" style={{ color: TK.muted }}>{props.desc}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">{props.actions}</div>
        </div>
      )}
      <div className="p-4">{props.children}</div>
    </div>
  );
}
function Badge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "critical" | "muted";
  children: React.ReactNode;
}) {
  const map = {
    success: { bg: TK.successBg, fg: TK.success },
    warning: { bg: TK.warningBg, fg: TK.warning },
    critical: { bg: TK.criticalBg, fg: TK.critical },
    muted: { bg: "#F3F4F6", fg: TK.muted },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
      style={{ background: map.bg, color: map.fg, border: `1px solid ${TK.borderSubtle}` }}
    >
      {children}
    </span>
  );
}
function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      {label && <span className="text-sm" style={{ color: TK.text }}>{label}</span>}
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-6 w-11 rounded-full transition-colors cursor-pointer",
          checked ? "bg-[color:var(--brand,#008CCD)]" : "bg-gray-300/80",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        )}
        style={{ outlineColor: TK.focus }}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-5" : "left-0.5"
          )}
        />
      </button>
    </label>
  );
}

/** Segmented chips (now supports optional branded icons) */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string; icon?: React.ReactNode }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-md p-1 bg-gray-100"
      style={{ border: `1px solid ${TK.borderSubtle}` }}
    >
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={cx(
              "px-2.5 py-1.5 rounded text-xs transition cursor-pointer inline-flex items-center gap-1.5",
              active ? "bg-white shadow" : "hover:bg-white/70"
            )}
            style={{ color: active ? TK.text : TK.muted }}
          >
            {o.icon && <span className="shrink-0" style={{ color: TK.brand }}>{o.icon}</span>}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "h-8 px-3 rounded-full border text-sm cursor-pointer inline-flex items-center gap-1.5",
        active ? "font-semibold" : "font-normal",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      style={{
        borderColor: TK.borderSubtle,
        background: active ? "color-mix(in srgb, var(--brand, #008CCD) 12%, white)" : "#fff",
        color: TK.text,
        outlineColor: TK.focus,
      }}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Inputs with reset
   -------------------------------------------------------------------------- */
function InputNumber({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  onReset,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  onReset?: () => void;
  suffix?: string;
}) {
  const [local, setLocal] = React.useState(String(value));
  React.useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = (v: string) => {
    const n = Number(v);
    if (Number.isFinite(n)) {
      let c = n;
      if (typeof min === "number") c = Math.max(min, c);
      if (typeof max === "number") c = Math.min(max, c);
      onChange(c);
    }
  };

  return (
    <label className="inline-flex items-center gap-2">
      {label && <span className="text-sm" style={{ color: TK.muted }}>{label}</span>}
      <div className="flex items-center gap-2 rounded border px-2 h-9" style={{ borderColor: TK.border }}>
        <input
          className="w-20 outline-none text-sm"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => commit(local)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(local);
          }}
          type="number"
          step={step}
          min={min}
          max={max}
        />
        {suffix && <span className="text-xs" style={{ color: TK.muted }}>{suffix}</span>}
        {onReset && (
          <button
            title="Reset to default"
            onClick={onReset}
            className="text-xs rounded px-1.5 py-0.5 border hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: TK.borderSubtle, color: TK.muted }}
          >
            Reset
          </button>
        )}
      </div>
    </label>
  );
}

/* Slider (CTR %) */
function Slider({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.1,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm" style={{ color: TK.muted }}>{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={() => onChange(local)}
        onTouchEnd={() => onChange(local)}
        className="w-48 cursor-pointer"
      />
      <span className="text-sm tabular-nums" style={{ color: TK.text }}>{local.toFixed(1)}%</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Draggable KPI order list
   -------------------------------------------------------------------------- */
function DraggableList({
  items,
  onReorder,
  renderLabel,
}: {
  items: string[];
  onReorder: (next: string[]) => void;
  renderLabel?: (k: string) => string;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const onDragStart = (id: string) => setDragId(id);
  const onDrop = (id: string) => {
    if (!dragId || dragId === id) return;
    const next = [...items];
    const from = next.indexOf(dragId);
    const to = next.indexOf(id);
    next.splice(to, 0, next.splice(from, 1)[0]);
    setDragId(null);
    onReorder(next);
  };
  return (
    <ul className="space-y-2">
      {items.map((id) => (
        <li
          key={id}
          draggable
          onDragStart={() => onDragStart(id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(id)}
          className="flex items-center justify-between rounded border px-3 py-2 bg-white"
          style={{ borderColor: TK.borderSubtle }}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-500" title="Drag to reorder" style={{ cursor: "grab" }}>
              <I.Grip />
            </span>
            <span className="text-sm" style={{ color: TK.text }}>
              {renderLabel ? renderLabel(id) : id}
            </span>
          </div>
          <span className="text-xs" style={{ color: TK.muted }}>
            Drag
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Main Component
   -------------------------------------------------------------------------- */
export type AnalyticsPanelSettingsProps = {
  initial?: Partial<SettingsModel>;
  persistKey?: string;
  onSave?: (settings: SettingsModel) => void;
  onResetAll?: () => void;
  drawerRow?: boolean;
  closeDrawer?: () => void;
};

export default function AnalyticsPanelSettings({
  initial,
  persistKey = "wr:panel-settings:v1",
  onSave,
  onResetAll,
  drawerRow,
  closeDrawer,
}: AnalyticsPanelSettingsProps) {
  const boot = React.useMemo<SettingsModel>(() => {
    const merged: SettingsModel = deepMerge(DEFAULTS, initial || {});
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) return deepMerge(merged, JSON.parse(raw || "{}"));
    } catch {}
    return merged;
  }, [initial, persistKey]);

  const [s, setS] = React.useState<SettingsModel>(boot);
  const [savedNote, setSavedNote] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const bothConnected =
    s.integrations.ga4.status === "connected" && s.integrations.gsc.status === "connected";

  /* Save / Reset (global) */
  function saveAll() {
    localStorage.setItem(persistKey, JSON.stringify(s));
    setSavedNote("Settings saved. Changes apply on next data render.");
    onSave?.(s);
    dismissLater();
  }
  function resetAll() {
    setS((prev) => ({
      ...DEFAULTS,
      integrations: prev.integrations, // do not alter connections on reset
    }));
    setConfirmOpen(false);
    setSavedNote("Panel successfully reset to default configuration.");
    onResetAll?.();
    dismissLater();
  }
  function dismissLater() {
    setTimeout(() => setSavedNote(null), 3200);
  }

  /* Derived: data hiding preview (informational) */
  const hiddenPreview = React.useMemo(() => {
    const t = s.thresholds;
    let pts = 0;
    pts += t.minSessions / 400;
    pts += t.minImpressions / 1200;
    pts += t.ctrWarnPct / 20;
    pts += (t.maxAvgPosition - 10) / 80;
    const pct = clamp(Math.round((pts / 1.0) * 60), 0, 85);
    return pct;
  }, [s.thresholds]);

  /* Handlers helpers */
  const set = <K extends keyof SettingsModel>(key: K, val: SettingsModel[K]) =>
    setS((prev) => ({ ...prev, [key]: val }));
  const setDisplay = <K extends keyof SettingsModel["display"]>(
    key: K,
    val: SettingsModel["display"][K]
  ) => setS((prev) => ({ ...prev, display: { ...prev.display, [key]: val } }));
  const setThresh = <K extends keyof SettingsModel["thresholds"]>(
    key: K,
    val: SettingsModel["thresholds"][K]
  ) => setS((prev) => ({ ...prev, thresholds: { ...prev.thresholds, [key]: val } }));
  const setMetrics = <K extends keyof SettingsModel["metrics"]>(
    key: K,
    val: SettingsModel["metrics"][K]
  ) => setS((prev) => ({ ...prev, metrics: { ...prev.metrics, [key]: val } }));
  const setRefresh = <K extends keyof SettingsModel["refresh"]>(
    key: K,
    val: SettingsModel["refresh"][K]
  ) => setS((prev) => ({ ...prev, refresh: { ...prev.refresh, [key]: val } }));

  /* UI */
  return (
                  <Drawer title="Settings" open={drawerRow} onClose={closeDrawer} width={1020} >

    <section className="space-y-4" style={{ fontFamily: FONT_STACK }}>
      {/* Global pointer style */}
      <GlobalPointerStyles />

      {/* Section 1 — Integrations */}
      <Card
        title="Data Integrations"
        desc="Connect and manage GA4 & GSC access (read-only)."
        icon={<I.Link />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            name="Google Analytics 4"
            status={s.integrations.ga4.status}
            idOrUrl={s.integrations.ga4.propertyId}
            last={s.integrations.ga4.lastSync}
            verifiedAt={s.privacy.ga4VerifiedAt}
            onConnect={() => demoConnect("ga4")}
            onReconnect={() =>
              setS((p) => ({
                ...p,
                integrations: {
                  ...p.integrations,
                  ga4: {
                    ...p.integrations.ga4,
                    status: "connected",
                    lastSync: new Date().toISOString(),
                  },
                },
              }))
            }
            onManage={() => alert("Open GA4 property selector")}
            onDisconnect={() =>
              confirmDisconnect("GA4", () =>
                setS((p) => ({
                  ...p,
                  integrations: {
                    ...p.integrations,
                    ga4: { status: "none", propertyId: "", lastSync: "" },
                  },
                }))
              )
            }
          />
          <IntegrationCard
            name="Google Search Console"
            status={s.integrations.gsc.status}
            idOrUrl={s.integrations.gsc.siteUrl}
            last={s.integrations.gsc.lastSync}
            verifiedAt={s.privacy.gscVerifiedAt}
            onConnect={() => demoConnect("gsc")}
            onReconnect={() =>
              setS((p) => ({
                ...p,
                integrations: {
                  ...p.integrations,
                  gsc: {
                    ...p.integrations.gsc,
                    status: "connected",
                    lastSync: new Date().toISOString(),
                  },
                },
              }))
            }
            onManage={() => alert("Open GSC property selector")}
            onDisconnect={() =>
              confirmDisconnect("GSC", () =>
                setS((p) => ({
                  ...p,
                  integrations: {
                    ...p.integrations,
                    gsc: { status: "none", siteUrl: "", lastSync: "" },
                  },
                }))
              )
            }
          />
        </div>
      </Card>

      {/* Section 2 — Display Preferences */}
      <Card title="Preferred Data Display Settings" icon={<I.Settings />}>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Range */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TK.muted }}>
              Default Range
            </span>
            <Segmented
              ariaLabel="Default time range"
              value={s.display.range}
              onChange={(v) => setDisplay("range", v as RangeKey)}
              options={[
                { key: "7d", label: "7d" },
                { key: "30d", label: "30d" },
                { key: "90d", label: "90d" },
                { key: "custom", label: "Custom" },
              ]}
            />
          </div>
          {s.display.range === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-9 rounded border px-2 cursor-pointer"
                style={{ borderColor: TK.border }}
                value={s.display.customRange.start}
                onChange={(e) =>
                  setDisplay("customRange", { ...s.display.customRange, start: e.target.value })
                }
              />
              <span className="text-sm" style={{ color: TK.muted }}>
                →
              </span>
              <input
                type="date"
                className="h-9 rounded border px-2 cursor-pointer"
                style={{ borderColor: TK.border }}
                value={s.display.customRange.end}
                onChange={(e) =>
                  setDisplay("customRange", { ...s.display.customRange, end: e.target.value })
                }
              />
            </div>
          )}

          {/* Source priority */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TK.muted }}>
              Primary Source
            </span>
            <Segmented
              ariaLabel="Source priority"
              value={s.display.sourcePriority}
              onChange={(v) => setDisplay("sourcePriority", v as SourcePriority)}
              options={[
                { key: "ga4_first", label: "GA4 first" },
                { key: "gsc_first", label: "GSC first" },
              ]}
            />
          </div>

          {/* Device — with branded icons */}
          <div className="flex items-center gap-2">
            <span className="text-sm inline-flex items-center gap-1" style={{ color: TK.muted }}>
              <span style={{ color: TK.brand }}><I.Devices /></span> Device
            </span>
            <Segmented
              ariaLabel="Device preference"
              value={s.display.device}
              onChange={(v) => setDisplay("device", v as DevicePref)}
              options={[
                { key: "all", label: "All", icon: <I.Devices /> },
                { key: "desktop", label: "Desktop", icon: <I.Monitor /> },
                { key: "mobile", label: "Mobile", icon: <I.Phone /> },
              ]}
            />
          </div>

          {/* Density */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TK.muted }}>
              View
            </span>
            <Segmented
              ariaLabel="Default density"
              value={s.display.density}
              onChange={(v) => setDisplay("density", v as Density)}
              options={[
                { key: "compact", label: "Compact" },
                { key: "detailed", label: "Detailed" },
              ]}
            />
          </div>

          {/* Chart */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TK.muted }}>
              Charts
            </span>
            <Segmented
              ariaLabel="Chart mode"
              value={s.display.chartMode}
              onChange={(v) => setDisplay("chartMode", v as ChartMode)}
              options={[
                { key: "auto", label: "Auto" },
                { key: "line", label: "Line" },
                { key: "bar", label: "Bar" },
              ]}
            />
          </div>

          {/* Labels */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TK.muted }}>
              Labels
            </span>
            <Segmented
              ariaLabel="Metric label format"
              value={s.display.labelFormat}
              onChange={(v) => setDisplay("labelFormat", v as LabelFmt)}
              options={[
                { key: "abbr", label: "Abbreviated" },
                { key: "full", label: "Full" },
              ]}
            />
          </div>

          {/* Grouping (only if both connected) */}
          {bothConnected && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: TK.muted }}>
                Landing Page Grouping
              </span>
              <Segmented
                ariaLabel="Landing page grouping"
                value={(s.display.grouping ?? "exact") as "exact" | "canonical"}
                onChange={(v) => setDisplay("grouping", v as any)}
                options={[
                  { key: "exact", label: "Exact URL" },
                  { key: "canonical", label: "Canonical" },
                ]}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Section 3 — Thresholds */}
      <Card title="Threshold Settings" desc="Filter noise and drive flags/insights." icon={<I.Alert />}>
        <div className="flex flex-wrap items-center gap-4">
          <InputNumber
            label="Min Sessions"
            value={s.thresholds.minSessions}
            onChange={(n) => setThresh("minSessions", Math.round(clamp(n, 0, 100000)))}
            min={0}
            onReset={() => setThresh("minSessions", DEFAULTS.thresholds.minSessions)}
          />
          <InputNumber
            label="Min Impressions"
            value={s.thresholds.minImpressions}
            onChange={(n) => setThresh("minImpressions", Math.round(clamp(n, 0, 1000000)))}
            min={0}
            onReset={() => setThresh("minImpressions", DEFAULTS.thresholds.minImpressions)}
          />
          <Slider
            label="CTR Warning if below"
            value={s.thresholds.ctrWarnPct}
            onChange={(n) => setThresh("ctrWarnPct", Number(n.toFixed(1)))}
            min={0}
            max={10}
            step={0.1}
          />
          <InputNumber
            label="Avg. Position Limit"
            value={s.thresholds.maxAvgPosition}
            onChange={(n) => setThresh("maxAvgPosition", Math.round(clamp(n, 1, 100)))}
            min={1}
            max={100}
            onReset={() => setThresh("maxAvgPosition", DEFAULTS.thresholds.maxAvgPosition)}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge tone={hiddenPreview >= 50 ? "warning" : "muted"}>
            <span style={{ color: TK.brand }}>
              <I.Alert />
            </span>
            Current settings would hide ~{hiddenPreview}% of rows
          </Badge>
          <span className="text-xs" style={{ color: TK.muted }}>
            Adjust thresholds to tune signal vs noise.
          </span>
        </div>
      </Card>

      {/* Section 4 — Metrics & Customization */}
      <Card title="Metric Definitions & Customization" icon={<I.Settings />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visibility toggles */}
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: TK.text }}>
              Visibility
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["sessions", "Sessions"],
                ["users", "Users"],
                ["clicks", "Clicks"],
                ["impressions", "Impressions"],
                ["ctr", "CTR"],
                ["position", "Avg. Position"],
                ["conversionRate", "Conversion Rate"],
              ].map(([key, label]) => {
                const k = key as SettingsModel["metrics"]["visible"][number];
                const on = s.metrics.visible.includes(k);
                return (
                  <Chip
                    key={key}
                    active={on}
                    onClick={() =>
                      setMetrics(
                        "visible",
                        on ? s.metrics.visible.filter((m) => m !== k) : [...s.metrics.visible, k]
                      )
                    }
                  >
                    {label}
                  </Chip>
                );
              })}
            </div>

            <div className="mt-3">
              <Toggle
                checked={s.metrics.tooltips}
                onChange={(v) => setMetrics("tooltips", v)}
                label="Show metric definitions (tooltips)"
              />
            </div>
          </div>

          {/* KPI order (drag) */}
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: TK.text }}>
              KPI Card Order
            </div>
            <DraggableList
              items={s.metrics.order}
              onReorder={(next) => setMetrics("order", next as any)}
              renderLabel={(id) =>
                (
                  {
                    sessions: "Sessions",
                    clicks: "Clicks",
                    ctr: "CTR",
                    position: "Avg. Position",
                    impressions: "Impressions",
                  } as Record<string, string>
                )[id] || id
              }
            />
          </div>
        </div>
      </Card>

      {/* Section 5 — Data Refresh Controls */}
      <Card title="Data Refresh Controls" desc="Manage sync cadence and view health." icon={<I.Refresh />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SourceStatus
            label="GA4"
            status={s.integrations.ga4.status}
            last={s.integrations.ga4.lastSync}
            onRetry={() =>
              setS((p) => ({
                ...p,
                integrations: {
                  ...p.integrations,
                  ga4: {
                    ...p.integrations.ga4,
                    status: "connected",
                    lastSync: new Date().toISOString(),
                  },
                },
              }))
            }
          />
          <SourceStatus
            label="GSC"
            status={s.integrations.gsc.status}
            last={s.integrations.gsc.lastSync}
            onRetry={() =>
              setS((p) => ({
                ...p,
                integrations: {
                  ...p.integrations,
                  gsc: {
                    ...p.integrations.gsc,
                    status: "connected",
                    lastSync: new Date().toISOString(),
                  },
                },
              }))
            }
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setRefresh("lastManual", new Date().toISOString());
              setS((p) => ({
                ...p,
                integrations: {
                  ...p.integrations,
                  ga4: { ...p.integrations.ga4, lastSync: new Date().toISOString() },
                  gsc: { ...p.integrations.gsc, lastSync: new Date().toISOString() },
                },
              }));
            }}
            className="inline-flex items-center gap-2 px-3 h-9 rounded text-sm text-white cursor-pointer"
            style={{ background: TK.brand }}
            title="Refresh data now"
          >
            <I.Refresh /> Refresh Now
          </button>

          <div className="text-xs" style={{ color: TK.muted }}>
            Last manual sync: {s.refresh.lastManual ? formatStamp(s.refresh.lastManual) : "—"}
          </div>

          <span className="inline-block w-px h-5 bg-gray-200" />

          <Toggle
            checked={s.refresh.auto}
            onChange={(v) => setRefresh("auto", v)}
            label="Enable Auto Sync"
          />

          <select
            disabled={!s.refresh.auto}
            className="h-9 rounded border px-2 text-sm disabled:opacity-60 cursor-pointer"
            style={{ borderColor: TK.border, color: TK.text }}
            value={s.refresh.frequency}
            onChange={(e) => setRefresh("frequency", e.target.value as Frequency)}
            aria-label="Sync frequency"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>

          <label className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: TK.text }}>
            <input
              type="checkbox"
              checked={s.refresh.alertOnFailure}
              onChange={(e) => setRefresh("alertOnFailure", e.target.checked)}
            />
            Notify on sync failure
          </label>
        </div>
      </Card>

      {/* Section 6 — Privacy & Permissions */}
      <Card title="Privacy & Permissions" desc="View scopes, reconnect, or revoke" icon={<I.Lock />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrivacyCard
            label="GA4 Access"
            connected={s.integrations.ga4.status === "connected"}
            verifiedAt={s.privacy.ga4VerifiedAt}
            scopes={["View property & settings", "Read-only analytics data"]}
            onReconnect={() => alert("Start GA4 OAuth (read-only scope)")}
            onRevoke={() =>
              confirmDisconnect("GA4 (revoke)", () =>
                setS((p) => ({
                  ...p,
                  integrations: { ...p.integrations, ga4: { status: "none", propertyId: "", lastSync: "" } },
                }))
              )
            }
          />
          <PrivacyCard
            label="GSC Access"
            connected={s.integrations.gsc.status === "connected"}
            verifiedAt={s.privacy.gscVerifiedAt}
            scopes={["View verified site data", "Read index coverage & performance"]}
            onReconnect={() => alert("Start GSC OAuth (read-only scope)")}
            onRevoke={() =>
              confirmDisconnect("GSC (revoke)", () =>
                setS((p) => ({
                  ...p,
                  integrations: { ...p.integrations, gsc: { status: "none", siteUrl: "", lastSync: "" } },
                }))
              )
            }
          />
        </div>

        <div className="mt-3">
          <a
            className="text-sm underline cursor-pointer"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Open Privacy Center in new tab");
            }}
            style={{ color: TK.brand }}
          >
            Learn more about how Wranker handles your data → Privacy Center
          </a>
        </div>
      </Card>

      {/* Section 7 — Reset to Defaults */}
      <Card
        title="Reset to Defaults"
        desc="Restore all settings to baseline (does not disconnect integrations)."
        icon={<I.Trash />}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: TK.text }}>
            This will:
            <ul className="list-disc ml-5 mt-1 space-y-0.5" style={{ color: TK.muted }}>
              <li>Restore ranges, priorities, thresholds, metrics, density, and chart mode</li>
              <li>Reorder KPI cards to defaults</li>
              <li>Keep GA4/GSC connections intact</li>
            </ul>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 px-3 h-9 rounded border text-sm cursor-pointer"
            style={{ color: TK.critical, borderColor: TK.critical }}
            title="Reset all panel settings"
          >
            <I.Trash /> Reset All Panel Settings
          </button>
        </div>
      </Card>

      {/* Sticky footer actions */}
      <div
        className="sticky bottom-0 z-10"
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "saturate(140%) blur(6px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: TK.border }}>
          <div className="text-xs" style={{ color: TK.muted }}>
            All changes are saved at project level.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setS(boot)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border, color: TK.text }}
              title="Reset (this session) to last loaded settings"
            >
              <span style={{ color: TK.brand }}><I.Settings /></span> Reset Section
            </button>
            <button
              onClick={saveAll}
              className="inline-flex items-center gap-2 h-9 px-4 rounded text-sm text-white cursor-pointer"
              style={{ background: TK.brand }}
              title="Save & apply changes"
            >
              <I.Check /> Save & Apply Changes
            </button>
          </div>
        </div>
      </div>

      {/* Saved / success message */}
      {savedNote && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-6 px-3 py-2 rounded text-sm shadow"
          style={{ background: TK.overlay, color: "white" }}
        >
          {savedNote}
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md rounded p-4"
            style={{ background: TK.panel, boxShadow: TK.shadow, border: `1px solid ${TK.border}` }}
          >
            <div className="text-lg font-semibold" style={{ color: TK.text }}>
              Are you sure you want to reset everything?
            </div>
            <div className="mt-2 text-sm" style={{ color: TK.muted }}>
              This will erase all saved display preferences, metric toggles, thresholds, and filters
              for this project’s Analytics Panel. <b>This action cannot be undone.</b>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="h-9 px-3 rounded border text-sm cursor-pointer"
                style={{ borderColor: TK.border, color: TK.text }}
              >
                Cancel
              </button>
              <button
                onClick={resetAll}
                className="h-9 px-3 rounded text-sm text-white cursor-pointer"
                style={{ background: TK.critical }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </section>              </Drawer>

  );

  /* Demo connect helpers */
  function demoConnect(kind: "ga4" | "gsc") {
    alert(`Launch ${kind.toUpperCase()} OAuth (read-only scopes)`);
  }
  function confirmDisconnect(label: string, onYes: () => void) {
    if (confirm(`Disconnect ${label}? Data will no longer sync.`)) onYes();
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
   Subcomponents for Section cards
   -------------------------------------------------------------------------- */
function IntegrationCard({
  name,
  status,
  idOrUrl,
  last,
  verifiedAt,
  onConnect,
  onReconnect,
  onManage,
  onDisconnect,
}: {
  name: string;
  status: IntegrationStatus;
  idOrUrl: string;
  last: string;
  verifiedAt?: string;
  onConnect: () => void;
  onReconnect: () => void;
  onManage: () => void;
  onDisconnect: () => void;
}) {
  const isConnected = status === "connected";
  const isExpired = status === "expired";
  return (
    <div className="rounded border p-3 h-full flex flex-col justify-between" style={{ borderColor: TK.border }}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: TK.text }}>
          {name}
        </div>
        <div>
          {isConnected && (
            <Badge tone="success">
              <span style={{ color: TK.brand }}>
                <I.Check />
              </span>
              Connected
            </Badge>
          )}
          {isExpired && (
            <Badge tone="critical">
              <span style={{ color: TK.brand }}>
                <I.Alert />
              </span>
              Expired
            </Badge>
          )}
          {status === "none" && <Badge tone="muted">Not connected</Badge>}
        </div>
      </div>

      <div className="mt-2 text-sm" style={{ color: TK.muted }}>
        {isConnected ? (
          <>
            <div>
              <span className="font-medium" style={{ color: TK.text }}>
                Property:
              </span>{" "}
              {idOrUrl || "—"}
            </div>
            <div className="mt-0.5">
              Last synced: {formatStamp(last)} · <span>{timeLabel(last)}</span>
            </div>
            {verifiedAt && <div className="mt-0.5">Verified: {formatStamp(verifiedAt)}</div>}
          </>
        ) : status === "expired" ? (
          <div>Reconnect required to resume sync.</div>
        ) : (
          <div>Connect to start populating analytics.</div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {status === "connected" ? (
          <>
            <button
              onClick={onReconnect}
              className="h-9 px-3 rounded text-sm text-white cursor-pointer inline-flex items-center gap-2"
              style={{ background: TK.brand }}
            >
              <I.Refresh /> Reconnect
            </button>
            <button
              onClick={onManage}
              className="h-9 px-3 rounded border text-sm cursor-pointer inline-flex items-center gap-2"
              style={{ borderColor: TK.border, color: TK.text }}
            >
              <span style={{ color: TK.brand }}>
                <I.Settings />
              </span>
              Manage
            </button>
            <button
              onClick={onDisconnect}
              className="h-9 px-3 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.critical, color: TK.critical }}
            >
              Disconnect
            </button>
          </>
        ) : status === "expired" ? (
          <button
            onClick={onReconnect}
            className="h-9 px-3 rounded text-sm text-white cursor-pointer inline-flex items-center gap-2"
            style={{ background: TK.brand }}
          >
            <I.Refresh /> Reconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="h-9 px-3 rounded text-sm text-white cursor-pointer inline-flex items-center gap-2"
            style={{ background: TK.brand }}
          >
            <I.Link /> Connect Now
          </button>
        )}
      </div>
    </div>
  );
}

function SourceStatus({
  label,
  status,
  last,
  onRetry,
}: {
  label: "GA4" | "GSC";
  status: IntegrationStatus;
  last: string;
  onRetry: () => void;
}) {
  const tone = status === "connected" ? "success" : status === "expired" ? "critical" : "warning";
  return (
    <div
      className={cx("rounded border p-3", status !== "connected" && "ring-1")}
      style={{
        borderColor: TK.border,
        boxShadow: TK.shadow,
        ringColor: status === "expired" ? TK.critical : undefined,
      } as any}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium" style={{ color: TK.text }}>
          {label} {status === "connected" ? "Last Synced" : status === "expired" ? "Last Failed" : "Status"}
        </div>
        <Badge tone={tone as any}>
          {status === "connected" ? (
            <span style={{ color: TK.brand }}>
              <I.Check />
            </span>
          ) : (
            <span style={{ color: TK.brand }}>
              <I.Alert />
            </span>
          )}
          {status}
        </Badge>
      </div>
      <div className="mt-1 text-sm" style={{ color: TK.muted }}>
        {last ? `${formatStamp(last)} · ${timeLabel(last)}` : "—"}
      </div>
      {status !== "connected" && (
        <div className="mt-2">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 h-8 px-3 rounded text-sm text-white cursor-pointer"
            style={{ background: TK.brand }}
          >
            <I.Refresh /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

function PrivacyCard({
  label,
  connected,
  verifiedAt,
  scopes,
  onReconnect,
  onRevoke,
}: {
  label: string;
  connected: boolean;
  verifiedAt: string;
  scopes: string[];
  onReconnect: () => void;
  onRevoke: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded border p-3" style={{ borderColor: TK.border }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium" style={{ color: TK.text }}>
            {label}
          </div>
          <div className="text-xs mt-0.5 inline-flex items-center gap-2" style={{ color: TK.muted }}>
            <span className="inline-flex items-center gap-1">
              <span style={{ color: connected ? TK.brand : TK.critical }}>
                {connected ? <I.Check /> : <I.X />}
              </span>
              <span>{connected ? "Connected" : "Disconnected"}</span>
            </span>
            <span>· Verified: {formatStamp(verifiedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReconnect}
            className="h-8 px-3 rounded text-sm text-white cursor-pointer inline-flex items-center gap-2"
            style={{ background: TK.brand }}
          >
            <I.Link /> Reconnect
          </button>
          <button
            onClick={onRevoke}
            className="h-8 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.critical, color: TK.critical }}
          >
            Revoke Access
          </button>
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-sm underline cursor-pointer"
        style={{ color: TK.text }}
        aria-expanded={open}
      >
        OAuth Scopes <I.ChevronDown />
      </button>
      {open && (
        <ul className="mt-2 text-sm list-disc ml-5" style={{ color: TK.muted }}>
          {scopes.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────────
   Utilities
   -------------------------------------------------------------------------- */
function deepMerge<T>(base: T, patch: Partial<T>): T {
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k in patch) {
    const pv: any = (patch as any)[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      out[k] = deepMerge((base as any)[k] ?? {}, pv);
    } else {
      out[k] = pv;
    }
  }
  return out as T;
}
