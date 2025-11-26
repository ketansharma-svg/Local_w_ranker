"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Wrench,
  RefreshCw,
  UserPlus,
  Search,
  BarChart3,
  Globe,
  LineChart,
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Info,
  Clock,
} from "lucide-react";
import SetupTaskDrawerDemo from "./drawers/SetupTask";
import HealthDetailsDrawerDemo, { HealthDetailsDrawer } from "./drawers/HealthDetails";
import ActivityDetailsDrawerDemo from "./drawers/ActivityDetails";

/* ──────────────────────────────────────────────────────────────────────────
   Global tokens (aligned with Wranker tokens)
   – Inter, Brand #008CCD, Pastel #D9EEF8, Status, Radius 6px, Shadows
   – Focus ring + pointer cursor on interactive elements
   – Card radius/borders/elevation unified here
   ───────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --brand:#008CCD; --brand-600:#007BB8; --pastel:#D9EEF8;
  --text-strong:#111827; --text:#374151; --text-muted:#6B7280;
  --bg-app:#F5F7FA; --bg-panel:#FFFFFF;
  --border:#E5E7EB; --border-subtle:#EFF0F6;
  --success:#34A853; --success-bg:#CBF8D7;
  --warning:#F9BB04; --warning-bg:#FCEBB8;
  --critical:#E94134; --critical-bg:#FBC4BF;

  --overlay: rgba(17,24,39,0.96);
  --radius:6px;

  --shadow-xs:0 1px 2px rgba(0,0,0,.05);
  --shadow-sm:0 1px 3px rgba(0,0,0,.10);
  --shadow-md:0 4px 6px rgba(0,0,0,.10);
}
* { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Helvetica Neue", sans-serif; }
.wr-focus { outline:2px solid transparent; outline-offset:2px; box-shadow: 0 0 0 3px rgba(66,134,245,.35); }
button, [role="button"], .wr-click { cursor: pointer; }
`}</style>
);

/* =========================
   Types & helpers
========================= */
type ConnectorKey = "gsc" | "ga4" | "crawl";
type TaskKey = "connect_gsc" | "connect_ga4" | "enable_crawl" | "enable_rank" | "set_kpi_targets";
type StatusTone = "ok" | "warning" | "error" | "todo" | "skipped";
type ActivityKind = "connectors" | "modules" | "reports" | "access" | "audit";
type Outcome = "success" | "warning" | "error";

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";
const timeAgo = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
};

const toneToken = (tone: "success" | "warning" | "critical") => {
  switch (tone) {
    case "success":
      return { fg: "var(--success)", bg: "var(--success-bg)" };
    case "warning":
      return { fg: "var(--warning)", bg: "var(--warning-bg)" };
    default:
      return { fg: "var(--critical)", bg: "var(--critical-bg)" };
  }
};

const statusToneToChip = (s: StatusTone) => {
  switch (s) {
    case "ok":
      return { text: "OK", ...toneToken("success") };
    case "warning":
      return { text: "Warning", ...toneToken("warning") };
    case "error":
      return { text: "Error", ...toneToken("critical") };
    case "skipped":
      return { text: "Skipped", fg: "var(--text-muted)", bg: "var(--border-subtle)" };
    default:
      return { text: "To do", fg: "var(--text)", bg: "var(--border-subtle)" };
  }
};

const barColorForPct = (pct: number) => (pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--critical)");

/* =========================
   Small UI atoms
========================= */
const Card: React.FC<{ title?: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode; className?: string; headerRight?: React.ReactNode}> =
  ({ title, meta, children, className, headerRight }) => (
    <section
      className={cn("rounded-[var(--radius)] border bg-white shadow-[var(--shadow-sm)]", className)}
      style={{ borderColor: "var(--border)" }}
    >
      {(title || meta || headerRight) && (
        <header className="px-4 py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {title && <h2 className="text-[20px] leading-6 font-semibold text-[var(--text-strong)] truncate">{title}</h2>}
              {meta && <div className="text-xs text-[var(--text-muted)] mt-0.5">{meta}</div>}
            </div>
            {headerRight}
          </div>
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );

const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md";
    iconLeft?: React.ReactNode;
  }
> = ({ variant = "secondary", size = "md", iconLeft, className, children, ...rest }) => {
  const sz = size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm";
  const v =
    variant === "primary"
      ? "text-white bg-[var(--brand)] hover:bg-[var(--brand-600)]"
      : variant === "ghost"
      ? "text-[var(--text)] hover:bg-[var(--bg-app)]"
      : "text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-app)]";
  return (
    <button className={cn("inline-flex items-center gap-2 rounded-[var(--radius)] font-medium wr-click focus-visible:wr-focus", sz, v, className)} {...rest}>
      {iconLeft}
      {children}
    </button>
  );
};

const StatusChip: React.FC<{ tone: StatusTone; label?: string; aria?: string }> = ({ tone, label, aria }) => {
  const c = statusToneToChip(tone);
  return (
    <span
      className="inline-flex items-center h-6 px-2 rounded-[var(--radius)] text-xs"
      style={{ color: c.fg, background: c.bg }}
      aria-label={aria}
    >
      {label ?? c.text}
    </span>
  );
};

const ProgressBar: React.FC<{ pct: number; srLabel?: string }> = ({ pct, srLabel }) => (
  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={srLabel}>
    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColorForPct(pct) }} />
  </div>
);

/* =========================
   1) Setup Progress (connectors & modules)
========================= */
type Task = {
  key: TaskKey;
  icon: React.ReactNode;
  title: string;
  helper: string;
  status: StatusTone; // ok, warning, error, todo, skipped
  lastOkAt?: string;
  lastError?: string;
  hardError?: boolean; // surfaces red callout
};

const DEFAULT_TASKS: Task[] = [
  {
    key: "connect_gsc",
    icon: <Search className="h-4 w-4" />,
    title: "Connect Google Search Console",
    helper: "Required for search data.",
    status: "ok",
    lastOkAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    key: "connect_ga4",
    icon: <BarChart3 className="h-4 w-4" />,
    title: "Connect Google Analytics 4",
    helper: "Recommended for engagement metrics.",
    status: "warning",
    lastError: "Token expiring soon. Re‑authorize to avoid interruptions.",
  },
  {
    key: "enable_crawl",
    icon: <Globe className="h-4 w-4" />,
    title: "Enable Crawl",
    helper: "Crawl your site to surface technical issues.",
    status: "todo",
  },
  {
    key: "enable_rank",
    icon: <LineChart className="h-4 w-4" />,
    title: "Enable Rank Tracker",
    helper: "Track ranking changes for your keywords.",
    status: "ok",
    lastOkAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    key: "set_kpi_targets",
    icon: <Target className="h-4 w-4" />,
    title: "Set KPI targets",
    helper: "Provide targets to unlock certain automations & reports.",
    status: "skipped",
  },
];

const rowCtaFor = (t: Task) => {
  switch (t.status) {
    case "warning":
      return { label: "Re‑auth", variant: "primary" as const };
    case "error":
      return { label: "Fix", variant: "primary" as const };
    case "todo":
      return { label: "Connect", variant: "primary" as const };
    default:
      return null; // no primary CTA when OK or skipped
  }
};

const SetupProgressCard: React.FC<{
  tasks: Task[];
  onAction: (task: Task, action: "primary" | "skip" | "manage") => void;
}> = ({ tasks, onAction }) => {
  const [expanded, setExpanded] = useState<Record<TaskKey, boolean>>({} as any);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "ok").length;
  const pct = Math.round((completed / total) * 100);
  const allOk = completed === total;

  const hard = tasks.find((t) => t.status === "error" && t.hardError);
const [openDrawerKey, setOpenDrawerKey] = useState<string | null>(null);

const openDrawer = (key: string) => {
  setOpenDrawerKey(key);
};

const closeDrawer = () => {
  setOpenDrawerKey(null);
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
    <Card
      title="Setup progress"
      meta={
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {completed} of {total} complete
          </span>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="w-full max-w-[180px]">
            <ProgressBar pct={pct} srLabel="Setup completion" />
          </div>
          <span className="text-xs text-[var(--text-muted)]">{pct}%</span>
        </div>
      }
    >
{openDrawerKey === "connect_gsc" && (
  <Drawer title="Connect Google Search Console" onClose={closeDrawer}>
    <SetupTaskDrawerDemo />
  </Drawer>
)}

      {/* Success banner */}
      {allOk && (
        <div
          className="mb-3 flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--radius)]"
          style={{ background: "var(--pastel)" }}
          aria-live="polite"
        >
          <div className="text-sm text-[var(--text-strong)] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: "var(--success)" }} />
            You’re all set.
          </div>
          <button className="text-sm underline wr-click hover:opacity-80">Review settings</button>
        </div>
      )}

      {/* Hard error callout (scoped) */}
      {hard && (
        <div
          className="mb-3 px-3 py-2 rounded-[var(--radius)] flex items-center justify-between gap-3"
          style={{ background: "var(--critical-bg)", color: "var(--critical)" }}
          role="alert"
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">
              {hard.title}: {hard.lastError || "A critical error occurred."}
            </span>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => onAction(hard, "primary")}>
            Fix now
          </Btn>
        </div>
      )}

      <ul className="space-y-2">
        {tasks.map((t) => {
          const primary = rowCtaFor(t);
          const isOpen = !!expanded[t.key];
          return (
            <li key={t.key} className="rounded-[var(--radius)] border" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="p-3 flex items-center gap-3">
                <button
                  className={cn(
                    "h-6 w-6 rounded flex items-center justify-center wr-click",
                    "hover:bg-[var(--bg-app)] focus-visible:wr-focus"
                  )}
                  aria-label={isOpen ? `Collapse ${t.title}` : `Expand ${t.title}`}
                  aria-expanded={isOpen}
                  onClick={() => setExpanded((e) => ({ ...e, [t.key]: !isOpen }))}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
                </button>

                <div
                  className={cn(
                    "h-8 w-8 rounded-[var(--radius)] flex items-center justify-center",
                    "bg-[var(--bg-app)] text-[var(--brand)]"
                  )}
                  aria-hidden
                >
                  {t.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
    <div onClick={() => openDrawer(t.key)} className="text-sm font-medium text-[var(--text-strong)] truncate">
     <a className="cursor-pointer underline">  {t.title} </a>
    </div>

                    {t.status === "skipped" && (
                      <span className="text-xs text-[var(--text-muted)]">(Skipped)</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{t.helper}</div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusChip
                    tone={t.status}
                    aria={`${t.title} status: ${statusToneToChip(t.status).text}`}
                  />
                  {primary ? (
                    <Btn
                      size="sm"
                      variant="primary"
                      onClick={() => onAction(t, "primary")}
                      aria-label={`${primary.label} ${t.title}`}
                    >
                      {primary.label}
                    </Btn>
                  ) : (
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => onAction(t, "manage")}
                      aria-label={`Manage ${t.title}`}
                    >
                      Manage
                    </Btn>
                  )}
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => onAction(t, "skip")}
                    aria-label={`Skip ${t.title} for now`}
                  >
                    Skip for now
                  </Btn>
                </div>
              </div>

              {isOpen && (
                <div className="px-12 pb-3 text-sm">
                  {t.status === "warning" && t.lastError && (
                    <div className="mb-2 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5" style={{ color: "var(--warning)" }} />
                      <p className="text-[var(--text)]">{t.lastError}</p>
                    </div>
                  )}
                  {t.status === "error" && t.lastError && (
                    <div className="mb-2 flex items-start gap-2">
                      <XCircle className="h-4 w-4 mt-0.5" style={{ color: "var(--critical)" }} />
                      <p className="text-[var(--text)]">{t.lastError}</p>
                    </div>
                  )}
                  <ul className="list-disc pl-5 text-[13px] text-[var(--text)] space-y-1">
                    <li>Ensure you have the correct permissions.</li>
                    <li>Choose the correct property/account during auth.</li>
                    <li>Re‑try and contact support if the issue persists.</li>
                  </ul>
                  {t.lastOkAt && (
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Last successful sync: {fmtDateTime(t.lastOkAt)}
                    </div>
                  )}
                  <button className="mt-2 text-sm underline wr-click hover:opacity-80">View details</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

/* =========================
   2) Project Health (score + mini bar + blockers)
========================= */
const ProjectHealthCard: React.FC<{
  score: number; // 0..100
  lastCheck?: string;
  blockers?: string[]; // top 3 issues
  deltaLabel?: string; // e.g., "+4 vs 30d"
}> = ({ score, lastCheck, blockers = [], deltaLabel }) => {
  const label =
    score >= 80 ? "Healthy" : score >= 50 ? "Needs attention" : "Critical";
  const tone = score >= 80 ? "success" : score >= 50 ? "warning" : "critical";
  const palette = toneToken(tone as any);
const [openDrawerKey, setOpenDrawerKey] = useState(false);
const [opengaDrawer, setGaDrawer] = useState(false);

const openGa = () => {
  setGaDrawer(true);
};

const closeGa = () => {
  setGaDrawer(false);
};

const openDrawer = () => {
  setOpenDrawerKey(true);
};

const closeDrawer = () => {
  setOpenDrawerKey(false);
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
    <Card
      title={<span onClick={openDrawer} className="cursor-pointer underline">Project health</span>}
      meta={<span>Last check: {timeAgo(lastCheck)}</span>}
      headerRight={deltaLabel ? <span className="text-xs text-[var(--text-muted)]">{deltaLabel}</span> : undefined}
    >
      {openDrawerKey  && (
          <Drawer title="Connect Google Search Console" onClose={closeDrawer}>
            <HealthDetailsDrawerDemo />
          </Drawer>
        )}
              {opengaDrawer  && (
          <Drawer title="Connect Google Search Console" onClose={closeGa}>
            <ActivityDetailsDrawerDemo />
          </Drawer>
        )}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center h-7 px-2 rounded-[var(--radius)] text-sm" style={{ color: palette.fg, background: palette.bg }}>
          {label}
        </span>
        <div className="w-32">
          <ProgressBar pct={score} srLabel="Project health score" />
        </div>
        <span className="text-sm text-[var(--text-strong)]">{score}</span>
      </div>

      {blockers.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-[var(--text-muted)] mb-1">Top blockers</div>
          <ul className="list-disc pl-5 text-sm text-[var(--text)] space-y-1">
            {blockers.slice(0, 3).map((b, i) => (
              <li key={i}>
                <a className="underline wr-click hover:opacity-80" onClick={openGa}>{b}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

/* =========================
   3) Source Status (chips)
========================= */
type SourceChip = {
  key: ConnectorKey;
  label: "GSC" | "GA4" | "Crawl";
  status: StatusTone; // ok | warning | error
  lastSync?: string;
};

const SourceStatusCard: React.FC<{
  sources: SourceChip[];
  onOpenDetails?: (key: ConnectorKey) => void;
}> = ({ sources, onOpenDetails }) => {
  return (
    <Card title="Source status">
      <div className="flex flex-wrap gap-2">
        {sources.map((s) => {
          const chip = statusToneToChip(s.status);
          const meta = s.lastSync ? `• synced ${timeAgo(s.lastSync)}` : "";
          return (
            <button
              key={s.key}
              className="inline-flex items-center gap-2 h-8 px-2 rounded-[var(--radius)] border wr-click hover:bg-[var(--bg-app)]"
              style={{ borderColor: "var(--border-subtle)" }}
              onClick={() => onOpenDetails?.(s.key)}
              aria-label={`${s.label} status: ${chip.text}${s.lastSync ? `, last sync ${timeAgo(s.lastSync)}` : ""}`}
            >
              {s.key === "gsc" && <Search className="h-4 w-4" />}
              {s.key === "ga4" && <BarChart3 className="h-4 w-4" />}
              {s.key === "crawl" && <Globe className="h-4 w-4" />}
              <span className="text-sm">{s.label}</span>
              <span className="text-xs" style={{ color: chip.fg, background: chip.bg, padding: "2px 6px", borderRadius: "var(--radius)" }}>
                {chip.text}
              </span>
              <span className="text-xs text-[var(--text-muted)]">{meta}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-[var(--text-muted)]">
        <Info className="h-4 w-4 mt-0.5" />
        <span>Click a chip to view connection details, scopes, and re‑auth/retry options.</span>
      </div>
    </Card>
  );
};

/* =========================
   4) Quick Actions
========================= */
const QuickActionsCard: React.FC<{
  canSync: boolean;
  onRunAudit: () => void;
  onSync: () => void;
  onInvite: () => void;
}> = ({ canSync, onRunAudit, onSync, onInvite }) => {
  return (
    <Card title="Quick actions">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Btn variant="primary" iconLeft={<Wrench className="h-4 w-4" />} onClick={onRunAudit} aria-label="Run audit">
          Run audit
        </Btn>
        <Btn variant="secondary" iconLeft={<RefreshCw className="h-4 w-4" />} onClick={onSync} disabled={!canSync} aria-label="Sync now">
          Sync now
        </Btn>
        <Btn variant="secondary" iconLeft={<UserPlus className="h-4 w-4" />} onClick={onInvite} aria-label="Invite">
          Invite
        </Btn>
      </div>
    </Card>
  );
};

/* =========================
   5) Recent Activity / Changelog
========================= */
type ActivityItem = {
  id: string;
  kind: ActivityKind;
  outcome: Outcome;
  title: string;
  actor?: string;
  at: string; // ISO
  details?: string;
};

const ACTIVITY_MOCK: ActivityItem[] = [
  {
    id: "a1",
    kind: "connectors",
    outcome: "warning",
    title: "GA4 needs re‑auth",
    actor: "System",
    at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    details: "Token expiring in 48h.",
  },
  {
    id: "a2",
    kind: "modules",
    outcome: "success",
    title: "Enabled Rank Tracker",
    actor: "Alice",
    at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
  },
  {
    id: "a3",
    kind: "audit",
    outcome: "success",
    title: "Audit run completed",
    actor: "System",
    at: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    details: "Found 23 opportunities.",
  },
  {
    id: "a4",
    kind: "access",
    outcome: "success",
    title: "Invited David Lee",
    actor: "Alice",
    at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
];

const outcomeToken = (o: Outcome) => (o === "success" ? toneToken("success") : o === "warning" ? toneToken("warning") : toneToken("critical"));

const ActivityFeedCard: React.FC<{
  items: ActivityItem[];
}> = ({ items }) => {
  const [filter, setFilter] = useState<ActivityKind | "all">("all");
  const filtered = items.filter((i) => (filter === "all" ? true : i.kind === filter));

  const Chip: React.FC<{ value: ActivityKind | "all"; label: string }> = ({ value, label }) => {
    const active = filter === value;
    return (
      <button
        onClick={() => setFilter(value)}
        className={cn(
          "h-8 px-3 rounded-full text-sm border wr-click",
          active ? "bg-[var(--pastel)] border-[var(--brand)] text-[var(--text-strong)]" : "bg-white border-[var(--border)] text-[var(--text)]",
          "hover:bg-[var(--bg-app)]"
        )}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  return (
    <Card
      title="Recent activity"
      headerRight={
        <div className="flex flex-wrap gap-2">
          <Chip value="all" label="All" />
          <Chip value="connectors" label="Connectors" />
          <Chip value="modules" label="Modules" />
          <Chip value="reports" label="Reports" />
          <Chip value="access" label="Access" />
          <Chip value="audit" label="Audit" />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div className="p-4 text-sm text-[var(--text-muted)]">
          No recent changes yet. Try running an audit or connecting a source.
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
          {filtered.map((e) => {
            const pal = outcomeToken(e.outcome);
            return (
              <li key={e.id} className="py-3 px-1 flex items-start gap-3" role="listitem" aria-label={`${e.actor || "System"} ${e.title} • ${timeAgo(e.at)} • ${e.outcome}`}>
                <div className="h-8 w-8 rounded-[var(--radius)] bg-[var(--bg-app)] flex items-center justify-center text-[var(--brand)]" aria-hidden>
                  {e.kind === "connectors" && <Search className="h-4 w-4" />}
                  {e.kind === "modules" && <LineChart className="h-4 w-4" />}
                  {e.kind === "reports" && <FileGlyph />}
                  {e.kind === "access" && <UserPlus className="h-4 w-4" />}
                  {e.kind === "audit" && <Wrench className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-[var(--text-strong)] truncate">{e.title}</div>
                    <span className="inline-flex items-center h-5 px-2 rounded-[var(--radius)] text-xs" style={{ color: pal.fg, background: pal.bg }}>
                      {e.outcome === "success" ? "Success" : e.outcome === "warning" ? "Warning" : "Error"}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                    {e.actor && <span>{e.actor}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {timeAgo(e.at)}
                    </span>
                  </div>
                  {e.details && <div className="mt-1 text-sm text-[var(--text)]">{e.details}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3">
        <Btn variant="ghost" className="text-sm" aria-label="Show older activity">
          Show older
        </Btn>
      </div>
    </Card>
  );
};

const FileGlyph = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="2" />
    <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

/* =========================
   Main – Overview Tab (page-level composition)
========================= */
export default function OverviewTab() {
  // Mock state (replace with real data/wiring)
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);

  const sources: SourceChip[] = useMemo(
    () => [
      { key: "gsc", label: "GSC", status: tasks.find((t) => t.key === "connect_gsc")?.status === "ok" ? "ok" : "error", lastSync: tasks.find((t) => t.key === "connect_gsc")?.lastOkAt },
      { key: "ga4", label: "GA4", status: (tasks.find((t) => t.key === "connect_ga4")?.status as StatusTone) || "error", lastSync: tasks.find((t) => t.key === "connect_ga4")?.lastOkAt },
      { key: "crawl", label: "Crawl", status: tasks.find((t) => t.key === "enable_crawl")?.status === "ok" ? "ok" : tasks.find((t) => t.key === "enable_crawl")?.status === "warning" ? "warning" : "error", lastSync: undefined },
    ],
    [tasks]
  );

  const canSync = sources.some((s) => s.status === "ok");

  const completed = tasks.filter((t) => t.status === "ok").length;
  const total = tasks.length;
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      // Simple illustrative model (implementation will replace this):
      completed / total * 70 + // completeness weight
        (sources.filter((s) => s.status === "ok").length / 3) * 20 + // connections weight
        (tasks.some((t) => t.status === "error") ? -10 : 10) // error posture
    )
  );

  const blockers = [
    ...(tasks.find((t) => t.key === "connect_ga4")?.status === "warning" ? ["GA4 re‑auth required"] : []),
    ...(tasks.find((t) => t.key === "enable_crawl")?.status !== "ok" ? ["Crawl disabled"] : []),
  ];

  const onTaskAction = (task: Task, action: "primary" | "skip" | "manage") => {
    // Demo handlers; replace with real drawers/modals/auth flows.
    if (action === "skip") {
      setTasks((prev) =>
        prev.map((t) => (t.key === task.key ? { ...t, status: "skipped", lastError: undefined, hardError: false } : t))
      );
      return;
    }
    if (action === "primary") {
      if (task.status === "todo") {
        // Simulate connect → OK
        setTasks((prev) => prev.map((t) => (t.key === task.key ? { ...t, status: "ok", lastOkAt: new Date().toISOString() } : t)));
      } else if (task.status === "warning" || task.status === "error") {
        // Simulate fix → OK
        setTasks((prev) => prev.map((t) => (t.key === task.key ? { ...t, status: "ok", lastOkAt: new Date().toISOString(), lastError: undefined, hardError: false } : t)));
      }
      return;
    }
    // manage → no-op in demo
    alert(`Open management for: ${task.title}`);
  };

  return (
    <div className="w-full bg-[var(--bg-app)]">
      <GlobalTokens />

      <main className="mx-auto w-full px-6 py-6">
        {/* Above the fold: 7/12 + 5/12 */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7">
            <SetupProgressCard tasks={tasks} onAction={onTaskAction} />
          </div>

          <div className="col-span-12 lg:col-span-5 space-y-4">
            <ProjectHealthCard score={Math.round(healthScore)} lastCheck={new Date().toISOString()} deltaLabel="+4 vs 30d" blockers={blockers} />
            <SourceStatusCard sources={sources} onOpenDetails={(k) => alert(`Open ${k} details`)} />
          </div>
        </div>

        {/* Below the fold */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <QuickActionsCard
              canSync={canSync}
              onRunAudit={() => alert("Run audit")}
              onSync={() => alert("Sync started")}
              onInvite={() => alert("Invite dialog")}
            />
          </div>

          <div className="col-span-12">
            <ActivityFeedCard items={ACTIVITY_MOCK} />
          </div>
        </div>
      </main>
    </div>
  );
}
