"use client";

import React, { useRef, useState } from "react";
import { Users, X, Info, Loader2, RefreshCw } from "lucide-react";

/* ───────────────────────────────── TOKENS ───────────────────────────────── */
const TK = {
  brand: "#008CCD",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  appBg: "var(--wr-bg-subtle, #F5F7FA)",
};

/* ─────────────────────────────── TYPES / PROPS ───────────────────────────── */
type Device = "desktop" | "mobile";
type Plan = "free" | "premium";
type TimeWindow = "7d" | "30d" | "90d";

export interface GapInputCardProps {
  plan: Plan;
  projectDomain: string;
  scope: { device: Device; locationISO: string };
  timeWindow: TimeWindow;
  initialCompetitors?: string[];
  isCached?: boolean;
  lastChecked?: string | null; // ISO
  onRun: (p: { scope: { device: Device; locationISO: string }; competitors: string[]; timeWindow: TimeWindow }) => Promise<{
    cached?: boolean;
    lastChecked?: string | null;
  }>;
  onSavedCompetitorsClick?: (blocked: boolean) => void;
}

/* ─────────────────────────────── UI PRIMITIVES ───────────────────────────── */
const Btn = ({
  children,
  variant = "outline",
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) => {
  const base =
    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const styles =
    variant === "primary"
      ? `bg-[${TK.brand}] text-white border-[${TK.brand}] hover:opacity-95`
      : variant === "ghost"
      ? `bg-white text-[${TK.brand}] border-[${TK.border}] hover:bg-gray-50`
      : `bg-white text-gray-900 border-[${TK.border}] hover:bg-gray-50`;
  return (
    <button className={`${base} ${styles}`} disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  );
};

const Chip = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) => (
  <span
    title={title}
    className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm"
    style={{ background: TK.appBg, borderColor: TK.border, color: TK.text }}
  >
    {children}
  </span>
);

const ChipRemovable = ({
  children,
  onRemove,
  ariaLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  ariaLabel: string;
}) => (
  <span
    className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm"
    style={{ borderColor: TK.border }}
  >
    {children}
    <button
      type="button"
      onClick={onRemove}
      aria-label={ariaLabel}
      className="rounded p-1 hover:bg-gray-100 cursor-pointer"
      title="Remove"
    >
      <X className="h-4 w-4" />
    </button>
  </span>
);

/* ────────────────────────────── DOMAIN UTILITIES ─────────────────────────── */
function normalizeDomain(input: string): string | null {
  const s = (input || "").trim().toLowerCase();
  if (!s) return null;
  const noProto = s.replace(/^https?:\/\//, "");
  const host = noProto.split("/")[0].split("?")[0].split("#")[0];
  const root = host.replace(/^www\./, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(root)) return null;
  return root;
}
function hueHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
function Avatar({ domain }: { domain: string }) {
  const hue = hueHash(domain);
  const bg = `hsl(${hue} 75% 92%)`;
  const fg = `hsl(${hue} 55% 32%)`;
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-[4px] text-[10px] font-bold"
      style={{ background: bg, color: fg }}
      aria-hidden="true"
      title={domain}
    >
      {domain[0]?.toUpperCase() || "•"}
    </span>
  );
}

/* ──────────────────────────────── MAIN CARD ─────────────────────────────── */
export function GapInputCard({
  plan,
  projectDomain,
  scope,
  timeWindow,
  initialCompetitors = [],
  isCached,
  lastChecked,
  onRun,
  onSavedCompetitorsClick,
}: GapInputCardProps) {
  const limit = plan === "free" ? 2 : 5;

  const [comps, setComps] = useState<string[]>(
    initialCompetitors.map(normalizeDomain).filter(Boolean) as string[]
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = comps.length < limit;
  const counterText = `${comps.length}/${limit} added`;

  const addChip = (raw: string) => {
    const d = normalizeDomain(raw);
    if (!d) return setError("Enter a root domain (e.g., example.com).");
    if (d === projectDomain) return setError("Project domain cannot be added.");
    if (comps.includes(d)) return setError("Duplicate domain removed.");
    if (!canAddMore) return setError("Limit reached on your plan.");
    setError(null);
    setComps((c) => [...c, d]);
  };

  const removeChip = (i: number) => setComps((c) => c.filter((_, j) => j !== i));

  const run = async () => {
    if (comps.length === 0 || !!error || loading) return;
    setLoading(true);
    try {
      await onRun({
        scope,
        competitors: comps.slice().sort(),
        timeWindow,
      });
    } catch {
      setError("Something went wrong. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = value.trim();
      if (v) {
        addChip(v);
        setValue("");
      } else {
        run();
      }
    }
  };

  return (
    <section
      className="w-full rounded-2xl border bg-white p-4 shadow-sm"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Competitor Input"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: TK.text }}>
          <Users className="h-5 w-5" style={{ color: TK.brand }} />
          Competitors
        </div>

        <Btn
          variant="ghost"
          onClick={() => onSavedCompetitorsClick?.(plan === "free")}
          title="Open saved competitor sets"
        >
          <Users className="h-4 w-4" style={{ color: TK.brand }} />
          Check Keywords Gap With Saved Competitors
        </Btn>
      </div>

      {/* Body */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Your domain */}
        <div className="space-y-1">
          <label className="text-[13px]" style={{ color: TK.muted }}>
            Your domain
          </label>
          <Chip title="Project’s primary domain (locked)">
            <Avatar domain={projectDomain} />
            {projectDomain}
          </Chip>
        </div>

        {/* Competitors input + chips */}
        <div className="space-y-1">
          <label className="text-[13px]" style={{ color: TK.muted }}>
            Competitors (up to {limit}){plan === "free" ? " · Free: 2" : ""}
          </label>

          <div
            className="flex flex-wrap items-center gap-2 rounded-md border bg-white p-2"
            style={{ borderColor: TK.border }}
            role="listbox"
            aria-label="Competitors"
          >
            {comps.map((d, i) => (
              <ChipRemovable key={d} onRemove={() => removeChip(i)} ariaLabel={`Remove ${d}`}>
                <Avatar domain={d} />
                {d}
              </ChipRemovable>
            ))}

            <input
              ref={inputRef}
              className="h-9 min-w-[220px] flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2 cursor-text"
              style={{ borderColor: TK.border }}
              placeholder="Add a competitor domain (e.g., semrush.com)"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              onBlur={() => {
                const v = value.trim();
                if (v) {
                  addChip(v);
                  setValue("");
                }
              }}
              onKeyDown={onKeyDown}
              disabled={!canAddMore || loading}
              aria-invalid={!!error}
              aria-describedby="comp-help comp-err"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div id="comp-help" className="text-xs" style={{ color: TK.muted }}>
              {counterText}
            </div>
            <div id="comp-err" className="text-xs text-red-600" aria-live="polite">
              {error || ""}
            </div>
            {!error && comps.length >= limit && (
              <div className="ml-auto text-xs" style={{ color: TK.muted }}>
                Limit reached on your plan.
              </div>
            )}
          </div>
        </div>

        {/* Scope & TW */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[13px]" style={{ color: TK.muted }}>
            Scope & Time window
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Chip title="Change in header">
              Device: {scope.device === "desktop" ? "Desktop" : "Mobile"}
            </Chip>
            <Chip title="Change in header">Location: {scope.locationISO}</Chip>
            <Chip title="Change in header">TW: {timeWindow}</Chip>
            {isCached && (
              <Chip title="Results may be cached">
                cached · Last checked{" "}
                {lastChecked ? new Date(lastChecked).toLocaleString() : "—"}
              </Chip>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="lg:col-span-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: TK.muted }}>
            <Info className="h-4 w-4" style={{ color: TK.brand }} />
            <span>
              Data may be cached · Last checked{" "}
              {lastChecked ? new Date(lastChecked).toLocaleString() : "—"}
            </span>
            <Btn
              variant="outline"
              onClick={run}
              disabled={loading || comps.length === 0}
              title="Force refresh"
            >
              <RefreshCw className="h-4 w-4" style={{ color: TK.brand }} />
              Refresh
            </Btn>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="outline" onClick={() => setComps([])} disabled={loading}>
              Clear
            </Btn>
            <Btn
              variant="primary"
              onClick={run}
              disabled={comps.length === 0 || !!error || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                "Run Comparison"
              )}
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────── DEMO (optional) ─────────────────────────── */
export default function GapInputCardApp() {
  return (
 <>
       <GapInputCard
        plan="free"
        projectDomain="wranker.com"
        scope={{ device: "desktop", locationISO: "IN" }}
        timeWindow="30d"
        initialCompetitors={["semrush.com", "ahrefs.com"]}
        isCached
        lastChecked={new Date().toISOString()}
        onRun={async () => {
          await new Promise((r) => setTimeout(r, 700));
          return { cached: true, lastChecked: new Date().toISOString() };
        }}
        onSavedCompetitorsClick={(blocked) =>
          blocked
            ? alert("Saved competitors is a premium feature.")
            : alert("Navigate to /competitor-intel?tab=gap…")
        }
      />
 </>
  );
}


