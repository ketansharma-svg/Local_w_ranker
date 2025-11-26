/* Section 7 — Smart Recommendations
   Drop‑in React + Tailwind TSX (no emojis)

   Refinements:
   • Subtle hover animations on cards and clickable elements
   • Pointer cursor on all clickable elements
   • No structural or logic changes
*/

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  X,
  AlertTriangle,
  Octagon,
  Info,
  Circle,
  ClipboardList,
  KeyRound,
  LayoutGrid,
  Clock,
  TrendingUp,
  XCircle,
  CheckCircle2,
} from "lucide-react";

/* ───────────────────────────────── Tokens (match recent sections) ───────────────────────────────── */
const TK = {
  brand: "#1090D0",
  blue: "#0077ff",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderSubtle: "#EFF0F6",
  subtle: "#F5F7FA",
  card: "#FFFFFF",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};
const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif";

/* ───────────────────────────────── Types ───────────────────────────────── */
type Suggestion = {
  id: string;
  type:
    | "inactive_admins"
    | "high_engagement_viewers"
    | "custom_role_unused"
    | "stale_invites"
    | "no_usage_with_access"
    | "active_but_unassigned"
    | "over_concentration";
  title: string;
  severity: "info" | "advisory" | "warning" | "risk";
  confidence?: "low" | "medium" | "high";
  reason_tags?: string[];
  affected?: Array<{ id: string; name: string; email: string; avatar?: string }>;
  actions?: string[];
  metrics?: { count?: number; days?: number; active_tasks?: number; top_user_share?: number };
  role_key?: string;
  created_at?: string;
  expires_at?: string;
};

/* ───────────────────────────────── Utils & Mock API ───────────────────────────────── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const relDays = (days?: number) =>
  Number.isFinite(days) ? `Based on past ${Math.round(days!)} days` : "Based on recent activity";
const avatarUrl = (user: { email: string }) => `https://i.pravatar.cc/64?u=${encodeURIComponent(user.email)}`;

function actionLabelsFor(t: Suggestion["type"]) {
  switch (t) {
    case "inactive_admins":
      return { primary: "Downgrade to Viewer", secondary: "Reassign Tasks" };
    case "high_engagement_viewers":
      return { primary: "Upgrade to Editor", secondary: "Send Training Link" };
    case "custom_role_unused":
      return { primary: "Edit Role", secondary: "Archive Role" };
    case "stale_invites":
      return { primary: "Resend All", secondary: "Cancel All" };
    case "no_usage_with_access":
      return { primary: "Remove Access", secondary: "Send Reminder" };
    case "active_but_unassigned":
      return { primary: "Assign Tasks", secondary: "Send Nudge" };
    case "over_concentration":
      return { primary: "Rebalance Tasks", secondary: "Compare in Trends" };
    default:
      return { primary: "Review", secondary: "Open Table" };
  }
}

async function fetchSuggestions() {
  await sleep(320);
  const now = new Date();
  const d = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  const mkUser = (id: string, name: string) => ({
    id,
    name,
    email: `${name.split(" ")[0].toLowerCase()}@agency.com`,
  });
  const items: Suggestion[] = [
    {
      id: "sg_01",
      type: "inactive_admins",
      title: "Inactive Admins detected (3)",
      severity: "warning",
      confidence: "high",
      reason_tags: ["0 logins", "0 usage", "≥30d"],
      affected: [mkUser("u1", "Michael Green"), mkUser("u2", "Ana Costa"), mkUser("u3", "Aditya Chauhan")],
      metrics: { count: 3, days: 30, active_tasks: 12 },
      role_key: "admin",
      created_at: d(1),
      expires_at: d(-13),
    },
    {
      id: "sg_02",
      type: "high_engagement_viewers",
      title: "Viewers with high engagement (2)",
      severity: "advisory",
      confidence: "medium",
      reason_tags: ["2 dashboards", "High completion"],
      affected: [mkUser("u4", "Arjun Rao"), mkUser("u5", "Ethan Brown")],
      metrics: { count: 2, days: 30 },
      created_at: d(0.5),
    },
    {
      id: "sg_03",
      type: "custom_role_unused",
      title: "Custom role ‘GA4 Analyst’ unused",
      severity: "info",
      reason_tags: ["0 usage", "≥30d"],
      affected: [],
      metrics: { days: 30 },
      role_key: "custom:ga4-analyst",
      created_at: d(2),
    },
    {
      id: "sg_04",
      type: "no_usage_with_access",
      title: "Access granted but no usage (7 users)",
      severity: "warning",
      reason_tags: ["0 sessions", "Has access"],
      affected: [
        mkUser("u6", "Karan Malhotra"),
        mkUser("u7", "Sara Mehta"),
        mkUser("u8", "Priya Singh"),
        mkUser("u9", "John White"),
        mkUser("u10", "Kim Lee"),
        mkUser("u11", "Nina Di"),
        mkUser("u12", "Asha Gupta"),
      ],
      metrics: { count: 7, days: 30 },
      created_at: d(1.2),
    },
    {
      id: "sg_05",
      type: "over_concentration",
      title: "Single point of failure risk",
      severity: "risk",
      confidence: "low",
      reason_tags: ["Top user >40% activity"],
      affected: [mkUser("u5", "Ethan Brown")],
      metrics: { top_user_share: 0.45 },
      created_at: d(0.4),
    },
  ];
  return { items };
}

/* ───────────────────────────────── UI Bits ───────────────────────────────── */
function TypeIcon({
  t,
  className,
  tone,
}: {
  t: Suggestion["type"];
  className?: string;
  tone?: "default" | "accent";
}) {
  const common = { className, style: { color: tone === "accent" ? TK.brand : TK.text } as React.CSSProperties };
  switch (t) {
    case "inactive_admins":
      return <KeyRound {...common} />;
    case "high_engagement_viewers":
      return <TrendingUp {...common} />;
    case "custom_role_unused":
      return <LayoutGrid {...common} />;
    case "stale_invites":
      return <Clock {...common} />;
    case "no_usage_with_access":
      return <KeyRound {...common} />;
    case "active_but_unassigned":
      return <ClipboardList {...common} />;
    case "over_concentration":
      return <AlertTriangle {...common} style={{ color: TK.warn }} />;
    default:
      return <Sparkles {...common} />;
  }
}

function SeverityPill({ level }: { level: Suggestion["severity"] }) {
  const map: Record<
    Suggestion["severity"],
    { label: string; color: string; Icon: React.ComponentType<any> }
  > = {
    info: { label: "Info", color: "#9CA3AF", Icon: Circle },
    advisory: { label: "Advisory", color: TK.brand, Icon: Info },
    warning: { label: "Warning", color: TK.warn, Icon: AlertTriangle },
    risk: { label: "Risk", color: TK.danger, Icon: Octagon },
  };
  const S = map[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: TK.border, background: TK.card, color: S.color }}
    >
      <S.Icon className="h-3.5 w-3.5" />
      {S.label}
    </span>
  );
}

function ConfidencePill({ c }: { c?: "low" | "medium" | "high" }) {
  if (!c) return null;
  const color = c === "low" ? "#A78BFA" : c === "medium" ? "#60A5FA" : TK.good;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: TK.border, background: TK.card, color }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      AI: {c[0].toUpperCase() + c.slice(1)}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors duration-150"
      style={{ borderColor: TK.border, background: "#fff", color: TK.text }}
    >
      {children}
    </span>
  );
}

/* ───────────────────────────────── Card ───────────────────────────────── */
function SuggestionCard({
  item,
  isAdmin,
  onAction,
  onDismiss,
  onSnooze,
  onWhy,
}: {
  item: Suggestion;
  isAdmin: boolean;
  onAction: (id: string, which: "primary" | "secondary", selected: string[]) => void;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  onWhy: (id: string) => void;
}) {
  const affected = item.affected || [];
  const first3 = affected.slice(0, 3);
  const more = Math.max(0, affected.length - first3.length);
  const labels = actionLabelsFor(item.type);

  const [selOpen, setSelOpen] = useState<boolean>(false);
  const [whyOpen, setWhyOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const allChecked = affected.length > 0 && affected.every((u) => selected[u.id]);
  const selectedIds = useMemo(
    () => affected.filter((u) => selected[u.id]).map((u) => u.id),
    [selected, affected]
  );

  useEffect(() => {
    if (affected.length) {
      setSelected((prev) => {
        const next = { ...prev };
        affected.forEach((u) => {
          if (next[u.id] === undefined) next[u.id] = true;
        });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <div
      className="relative rounded-md border p-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: TK.border, background: TK.card, fontFamily: FONT }}
      role="group"
      aria-labelledby={`sg-${item.id}-t`}
      aria-describedby={`sg-${item.id}-d`}
    >
      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div id={`sg-${item.id}-t`} className="flex items-center gap-2 text-[14px] font-semibold text-gray-900">
            <TypeIcon t={item.type} className="h-4 w-4" tone="accent" />
            <span className="truncate">{item.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <SeverityPill level={item.severity} />
            <ConfidencePill c={item.confidence} />
            <span className="text-gray-500">{relDays(item.metrics?.days ?? 30)}</span>
          </div>
        </div>

        {/* Overflow menu */}
        <div className="relative">
          <button
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border transition-colors duration-150 hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
            aria-label="More actions"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-9 z-40 w-48 rounded-md border bg-white p-1.5 shadow-lg"
              style={{ borderColor: TK.border }}
              onMouseLeave={() => setMenuOpen(false)}
              role="menu"
            >
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
                onClick={() => (setMenuOpen(false), onSnooze(item.id, 7))}
              >
                <Clock className="h-4 w-4 text-gray-700" /> Snooze 7 days
              </button>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
                onClick={() => (setMenuOpen(false), onDismiss(item.id))}
              >
                <XCircle className="h-4 w-4" style={{ color: TK.danger }} /> Dismiss
              </button>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
                onClick={() => (setMenuOpen(false), onSnooze(item.id, 30))}
              >
                <Octagon className="h-4 w-4" style={{ color: TK.warn }} /> Never show for this role
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p id={`sg-${item.id}-d`} className="mb-2 text-[13px] text-gray-600">
        {item.type === "inactive_admins" &&
          `These admins haven't logged in or used any dashboards in the last ${item.metrics?.days ?? 30} days.`}
        {item.type === "high_engagement_viewers" &&
          "These viewers complete many tasks across multiple dashboards—consider upgrading."}
        {item.type === "custom_role_unused" &&
          "No one accessed dashboards scoped to this custom role in the selected range."}
        {item.type === "stale_invites" && "Invitations pending for more than 7 days."}
        {item.type === "no_usage_with_access" && "Members have access but recorded no usage in this period."}
        {item.type === "active_but_unassigned" && "Active users with no assigned tasks."}
        {item.type === "over_concentration" && "A single user accounts for a large share of team activity."}
      </p>

      {/* Avatars + tags */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {first3.map((u) => (
            <img
              key={u.id}
              src={avatarUrl(u)}
              alt={u.name}
              className="h-7 w-7 rounded-full border object-cover transition-transform duration-150 hover:scale-[1.03]"
              style={{ borderColor: TK.borderSubtle }}
              title={`${u.name} • ${u.email}`}
            />
          ))}
          {more > 0 && (
            <button
              className="cursor-pointer rounded-full border px-2 py-0.5 text-xs transition-colors duration-150 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.border }}
              onClick={() => setSelOpen((v) => !v)}
              aria-expanded={selOpen}
            >
              +{more} more
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(item.reason_tags || []).map((t, i) => (
            <Chip key={i}>{t}</Chip>
          ))}
          {item.confidence && <Chip>AI confidence: {item.confidence}</Chip>}
        </div>
      </div>

      {/* Selection tray */}
      {selOpen && affected.length > 0 && (
        <div className="mb-2 rounded-md border" style={{ borderColor: TK.border }}>
          <div
            className="flex items-center justify-between border-b px-2 py-1.5 text-sm"
            style={{ borderColor: TK.border }}
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                className="cursor-pointer"
                type="checkbox"
                checked={allChecked}
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  const next: Record<string, boolean> = {};
                  affected.forEach((u) => (next[u.id] = on));
                  setSelected(next);
                }}
              />
              Apply to all ({affected.length})
            </label>
            <button
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded border transition-colors duration-150 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.borderSubtle }}
              onClick={() => setSelOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-40 overflow-auto p-2">
            {affected.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-3 rounded px-1 py-1 text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
              >
                <input
                  className="cursor-pointer"
                  type="checkbox"
                  checked={!!selected[u.id]}
                  onChange={(e) => setSelected((s) => ({ ...s, [u.id]: e.currentTarget.checked }))}
                />
                <img
                  src={avatarUrl(u)}
                  alt={u.name}
                  className="h-7 w-7 rounded-full border object-cover"
                  style={{ borderColor: TK.borderSubtle }}
                />
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">{u.name}</div>
                  <div className="truncate text-xs text-gray-500">{u.email}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="my-2 h-px" style={{ background: TK.border }} />

      {/* CTAs & Why */}
      <div className="flex items-center gap-2">
        <button
          className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5"
          style={{ background: TK.brand, borderColor: TK.border }}
          disabled={!isAdmin}
          title={isAdmin ? "" : "Insufficient permission."}
          onClick={() => onAction(item.id, "primary", selectedIds)}
        >
          <CheckCircle2 className="h-4 w-4" />
          {labels.primary}
        </button>
        {labels.secondary && (
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.border, color: TK.brand, background: TK.card }}
            disabled={!isAdmin}
            title={isAdmin ? "" : "Insufficient permission."}
            onClick={() => onAction(item.id, "secondary", selectedIds)}
          >
            {labels.secondary}
          </button>
        )}
        <button
          className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition-colors duration-150 hover:opacity-80"
          style={{ color: TK.brand }}
          onClick={() => (setWhyOpen((v) => !v), onWhy(item.id))}
        >
          <Info className="h-4 w-4" />
          Why?
        </button>
      </div>

      {/* Smart “Why” popover */}
      {whyOpen && (
        <div
          className="absolute right-3 top-3 z-40 w-[320px] rounded-md border bg-white p-3 text-sm shadow-lg animate-[fadeIn_140ms_ease-out]"
          style={{ borderColor: TK.border }}
          role="dialog"
          onMouseLeave={() => setWhyOpen(false)}
        >
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
            <Info className="h-4 w-4" style={{ color: TK.brand }} />
            Why this recommendation?
          </div>
          <ul className="ml-4 list-disc space-y-1 text-[13px] text-gray-800">
            {item.type === "inactive_admins" && (
              <>
                <li>
                  Rule: role = Admin AND 0 logins AND 0 sessions for ≥ {item.metrics?.days ?? 30} days.
                </li>
                <li>Evidence: {item.metrics?.count ?? (item.affected?.length || 0)} admins matched.</li>
              </>
            )}
            {item.type === "no_usage_with_access" && (
              <>
                <li>Rule: has_access = true AND sessions = 0 in range.</li>
                <li>Evidence: {item.metrics?.count ?? (item.affected?.length || 0)} users matched.</li>
              </>
            )}
            {item.type === "over_concentration" && (
              <li>
                Rule: top user share &gt; 40%. Observed:{" "}
                {Math.round((item.metrics?.top_user_share ?? 0) * 100)}%.
              </li>
            )}
            {item.reason_tags?.length ? <li>Tags: {item.reason_tags.join(" • ")}</li> : null}
            <li>{relDays(item.metrics?.days ?? 30)}</li>
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="cursor-pointer text-xs font-semibold transition-colors duration-150 hover:opacity-80" style={{ color: TK.brand }}>
              Open Engagement Table
            </button>
            <button className="cursor-pointer text-xs font-semibold transition-colors duration-150 hover:opacity-80" style={{ color: TK.brand }}>
              Open Heatmap
            </button>
            <button className="cursor-pointer text-xs font-semibold transition-colors duration-150 hover:opacity-80" style={{ color: TK.brand }}>
              Open Trends
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────────── Section ───────────────────────────────── */
export default function SmartRecommendations({
  filters,
  isAdmin = true,
  maxVisible = 7,
}: {
  filters?: Record<string, any>;
  isAdmin?: boolean;
  maxVisible?: number;
}) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    setItems(null);
    try {
      const res = await fetchSuggestions();
      setItems((res.items || []).slice(0, maxVisible));
    } catch {
      setErr("Couldn't load recommendations. Retry.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const onAction = async (_id: string, _which: "primary" | "secondary", _selected: string[]) => {
    setToast("Executing…");
    await sleep(420);
    setToast("Done.");
    setTimeout(() => setToast(null), 1100);
  };

  const onDismiss = (id: string) => {
    setItems((arr) => (arr || []).filter((x) => x.id !== id));
  };
  const onSnooze = (id: string, _days: number) => {
    setItems((arr) => (arr || []).filter((x) => x.id !== id));
  };
  const onWhy = (_id: string) => {};

  return (
    <section
      className="rounded-md border bg-transparent"
      style={{ borderColor: "transparent", fontFamily: FONT, color: TK.text }}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: TK.brand }} />
          <div>
            <h3 className="m-0 text-[16px] font-semibold text-gray-900">Smart Recommendations</h3>
            <div className="text-xs text-gray-500">Automated, actionable insights from recent activity</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border px-3 text-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
            onClick={load}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border px-3 text-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#F7FAFC]"
            style={{ borderColor: TK.borderSubtle }}
          >
            <ExternalLink className="h-4 w-4" />
            View all insights
          </button>
        </div>
      </div>

      {/* Loading */}
      {!items && !err && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse rounded-md border"
              style={{ borderColor: TK.border, background: "#F6F8FA" }}
              aria-hidden
            />
          ))}
        </div>
      )}

      {/* Error */}
      {err && (
        <div
          className="mb-2 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: TK.border, background: "#FFF7ED", color: "#7C2D12" }}
        >
          {err}{" "}
          <button
            className="cursor-pointer font-semibold transition-opacity duration-150 hover:opacity-80"
            style={{ color: TK.brand }}
            onClick={load}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {items && items.length === 0 && (
        <div className="rounded-md border p-3 text-sm text-gray-500" style={{ borderColor: TK.border }}>
          No recommendations for your current filters.{" "}
          <button
            className="cursor-pointer font-semibold transition-opacity duration-150 hover:opacity-80"
            style={{ color: TK.brand }}
            onClick={load}
          >
            Adjust filters / Refresh
          </button>
        </div>
      )}

      {/* Cards */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <SuggestionCard
              key={it.id}
              item={it}
              isAdmin={true}
              onAction={onAction}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              onWhy={onWhy}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-3 left-3 z-50 rounded-md px-3 py-2 text-xs text-white shadow-lg animate-[fadeIn_120ms_ease-out]"
          style={{ background: "#111827" }}
        >
          {toast}
        </div>
      )}

      {/* tiny keyframes for subtle pop/fade */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(2px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </section>
  );
}
