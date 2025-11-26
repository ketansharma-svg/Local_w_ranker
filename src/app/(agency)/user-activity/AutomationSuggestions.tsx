/* Section B — Automation Suggestions
   Drop‑in React + Tailwind TSX (no emojis)

   Design pattern parity with recent sections:
   • Inter font stack + shared tokens
   • Branded icons (lucide-react)
   • Profile images via pravatar
   • Branded buttons
   • Subtle hover animations and pointer cursor on clickable elements
   • Smart popovers (Why? and Affected users)
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Workflow,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  X,
  Info,
  Clock,
  KeyRound,
  LayoutDashboard,
  ShieldAlert,
  AlertTriangle,
  Octagon,
  UserX,
  ClipboardList,
  Check,
} from "lucide-react";
import ReassignmentPanel from "./ReassignmentPanel";
/* ───────────────────────────────── Tokens (shared look & feel) ───────────────────────────────── */
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
type Severity = "critical" | "warning" | "info";
type PrimaryKey =
  | "reassign"
  | "downgrade"
  | "remind"
  | "resend"
  | "cancel"
  | "remove"
  | "limit"
  | "revoke";
type SecondaryKey =
  | "remind"
  | "changeRole"
  | "assign"
  | "openUserSummaries"
  | "filterActivity"
  | "exportList";

type Affected = {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  lastLoginDays?: number;
  sessions?: number;
  tasks?: number;
  excludedByPolicy?: boolean;
};

type SuggestionCardData = {
  id: string;
  type: "inactive_users" | "stale_invites" | "overprivileged" | "no_tasks" | "dashboard_not_used";
  severity: Severity;
  title: string;
  subtext: string;
  affected: Affected[];
  evidence?: string[];
  createdAt?: string;
  primary: { key: PrimaryKey; label: string; disabledReason?: string };
  secondary?: { key: SecondaryKey; label: string; disabledReason?: string };
  more?: { key: string; label: string }[];
  why?: { rule: string; threshold?: string; note?: string };
};

/* ───────────────────────────────── Helpers / Mock API ───────────────────────────────── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const avatarUrl = (idOrEmail: string) => `https://i.pravatar.cc/64?u=${encodeURIComponent(idOrEmail)}`;
const initials = (name: string) => name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

function mkUser(id: string, name: string, email?: string): Affected {
  return { userId: id, name, email: email ?? `${name.split(" ")[0].toLowerCase()}@agency.com` };
}

async function fetchAutomationSuggestions(): Promise<{ items: SuggestionCardData[] }> {
  await sleep(320);
  const items: SuggestionCardData[] = [
    {
      id: "s1",
      type: "inactive_users",
      severity: "warning",
      title: "Inactive Users Detected (3)",
      subtext: "No login in ≥ 30 days. 10 active tasks may be stalled.",
      affected: [
        { ...mkUser("u1", "Sara Mehta"), lastLoginDays: 42, sessions: 0, tasks: 6, role: "Admin" },
        { ...mkUser("u2", "John Patel"), lastLoginDays: 39, sessions: 0, tasks: 3, role: "Editor" },
        { ...mkUser("u3", "Lauren Chen"), lastLoginDays: 31, sessions: 0, tasks: 1, role: "Viewer" },
        { ...mkUser("u4", "Owner (policy)", "owner@agency.com"), excludedByPolicy: true },
      ],
      evidence: ["Last login 30+ days", "0 sessions in range"],
      primary: { key: "reassign", label: "Reassign Tasks" },
      secondary: { key: "remind", label: "Send Reminder" },
      more: [
        { key: "openUserSummaries", label: "Open User Summaries" },
        { key: "filterActivity", label: "Filter Activity Log" },
      ],
      why: { rule: "last_login_days ≥ 30 OR last_event_days ≥ 45", threshold: "30d", note: "Configurable in workspace." },
    },
    {
      id: "s2",
      type: "overprivileged",
      severity: "critical",
      title: "Overprivileged Users (2)",
      subtext: "Admins/Editors with 0 usage in the last 30 days.",
      affected: [
        { ...mkUser("u5", "Michael Green"), sessions: 0, role: "Admin" },
        { ...mkUser("u6", "Ana Singh"), sessions: 0, role: "Admin" },
      ],
      evidence: ["Role: Admin", "0 sessions"],
      primary: { key: "downgrade", label: "Downgrade to Viewer" },
      secondary: { key: "remind", label: "Send Reminder" },
      more: [{ key: "filterRole", label: "Filter by Role" }],
      why: { rule: "role ∈ {Admin,Editor} ∧ sessions=0 ∧ events=0", threshold: "30d" },
    },
    {
      id: "s3",
      type: "stale_invites",
      severity: "warning",
      title: "Stale Pending Invites (5)",
      subtext: "Invites pending for 7+ days.",
      affected: [mkUser("i1", "Jake Hill"), mkUser("i2", "Tina Roy"), mkUser("i3", "Sam Lee"), mkUser("i4", "Nina Di"), mkUser("i5", "Lee Park")],
      evidence: ["Invite age ≥ 7d"],
      primary: { key: "resend", label: "Resend Invites" },
      secondary: { key: "changeRole", label: "Cancel Invites" },
      more: [{ key: "viewPending", label: "View Pending" }],
      why: { rule: "invite_age_days ≥ 7", threshold: "7d" },
    },
  ];
  return { items };
}

/* ───────────────────────────────── Small UI bits ───────────────────────────────── */
function SeverityPill({ level }: { level: Severity }) {
  const map: Record<Severity, { label: string; color: string; Icon: React.ComponentType<any>; bg: string }> = {
    critical: { label: "Critical", color: TK.danger, Icon: Octagon, bg: "rgba(239,68,68,.10)" },
    warning: { label: "Warning", color: TK.warn, Icon: AlertTriangle, bg: "rgba(245,158,11,.12)" },
    info: { label: "Info", color: TK.brand, Icon: Info, bg: "rgba(16,144,208,.12)" },
  };
  const S = map[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
      style={{ borderColor: TK.border, background: S.bg, color: S.color }}
    >
      <S.Icon className="h-3.5 w-3.5" />
      {S.label}
    </span>
  );
}

function TypeIcon({ t, className }: { t: SuggestionCardData["type"]; className?: string }) {
  const props = { className, style: { color: TK.brand } as React.CSSProperties };
  switch (t) {
    case "inactive_users":
      return <UserX {...props} />;
    case "stale_invites":
      return <Clock {...props} />;
    case "overprivileged":
      return <ShieldAlert {...props} />;
    case "no_tasks":
      return <ClipboardList {...props} />;
    case "dashboard_not_used":
      return <LayoutDashboard {...props} />;
    default:
      return <Workflow {...props} />;
  }
}

/* Popover outside-click */
function useOutsideCloser<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  return ref;
}

/* Affected users popover */
function AffectedPopover({
  all,
  selected,
  onChange,
  onClose,
}: {
  all: Affected[];
  selected: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const view = useMemo(
    () =>
      all.filter(
        (a) =>
          a.name.toLowerCase().includes(q.toLowerCase()) ||
          (a.email ? a.email.toLowerCase().includes(q.toLowerCase()) : false)
      ),
    [all, q]
  );
  const ref = useOutsideCloser<HTMLDivElement>(true, onClose);
  const toggleVisibleAll = () => {
    const allSelected = view.every((v) => selected[v.userId] || v.excludedByPolicy);
    const next = { ...selected };
    view.forEach((v) => {
      if (v.excludedByPolicy) return;
      if (allSelected) delete next[v.userId];
      else next[v.userId] = true;
    });
    onChange(next);
  };

  return (
    <div
      ref={ref}
      className="z-50 w-[360px] rounded-md border bg-white p-2 shadow-xl animate-[fadeIn_140ms_ease-out]"
      style={{ borderColor: TK.border, fontFamily: FONT }}
      role="dialog"
      aria-label="Affected users"
    >
      <div className="mb-2 flex items-center gap-2">
        <input
          className="h-8 w-full rounded border px-2 text-sm outline-none"
          style={{ borderColor: TK.borderSubtle }}
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="cursor-pointer rounded border px-2 py-1 text-xs transition-colors duration-150 hover:bg-[#F7FAFC]"
          style={{ borderColor: TK.border }}
          onClick={toggleVisibleAll}
        >
          Toggle
        </button>
      </div>

      <div className="max-h-72 space-y-2 overflow-auto pr-1">
        {view.map((u) => (
          <label
            key={u.userId}
            className={`flex cursor-pointer items-center gap-3 rounded border p-2 text-sm transition-colors duration-150 hover:bg-[#F7FAFC] ${
              u.excludedByPolicy ? "opacity-60" : ""
            }`}
            style={{ borderColor: TK.borderSubtle }}
            title={u.excludedByPolicy ? "Excluded by policy" : ""}
          >
            <input
              type="checkbox"
              className="cursor-pointer"
              disabled={u.excludedByPolicy}
              checked={!!selected[u.userId]}
              onChange={(e) => {
                const next = { ...selected };
                if (e.currentTarget.checked) next[u.userId] = true;
                else delete next[u.userId];
                onChange(next);
              }}
            />
            {u.avatar ? (
              <img src={u.avatar} alt="" className="h-7 w-7 rounded-full border object-cover" style={{ borderColor: TK.borderSubtle }} />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold" style={{ borderColor: TK.border, background: "#E1ECF8", color: TK.brand }}>
                {initials(u.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{u.name}</div>
              <div className="truncate text-xs text-gray-500">{u.email}</div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
              {typeof u.lastLoginDays === "number" && <span className="rounded border px-1.5 py-0.5" style={{ borderColor: TK.border }}>Last {u.lastLoginDays}d</span>}
              {typeof u.sessions === "number" && <span className="rounded border px-1.5 py-0.5" style={{ borderColor: TK.border }}>{u.sessions} sessions</span>}
              {typeof u.tasks === "number" && <span className="rounded border px-1.5 py-0.5" style={{ borderColor: TK.border }}>{u.tasks} tasks</span>}
            </div>
          </label>
        ))}
        {view.length === 0 && <div className="py-3 text-center text-xs text-gray-500">No matches.</div>}
      </div>

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          className="cursor-pointer rounded border px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
          style={{ borderColor: TK.border }}
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────── Card ───────────────────────────────── */
function AutomationSuggestionCard({
  data,
  onPrimary,
  onSecondary,
  onMore,
  onViewFiltered,
  onWhyOpen,
  onSnooze,
  onDismiss,
}: {
  data: SuggestionCardData;
  onPrimary?: (p: { id: string; action: PrimaryKey; selectedIds: string[] }) => void;
  onSecondary?: (p: { id: string; action: SecondaryKey; selectedIds: string[] }) => void;
  onMore?: (p: { id: string; action: string; selectedIds: string[] }) => void;
  onViewFiltered?: (id: string) => void;
  onWhyOpen?: (id: string) => void;
  onSnooze?: (id: string, days: number) => void;
  onDismiss?: (id: string, days: number) => void;
}) {
  const [sel, setSel] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    data.affected.forEach((a) => {
      if (!a.excludedByPolicy) init[a.userId] = true;
    });
    return init;
  });
  const selectedIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);

  const menuRef = useOutsideCloser<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
  const whyRef = useOutsideCloser<HTMLDivElement>(whyOpen, () => setWhyOpen(false));
  const usersRef = useOutsideCloser<HTMLDivElement>(usersOpen, () => setUsersOpen(false));

  const canPrimary = selectedIds.length > 0 && !data.primary.disabledReason;
  const canSecondary = !!data.secondary && selectedIds.length > 0 && !data.secondary?.disabledReason;

  const chips = data.affected.slice(0, 3);
  const hiddenCount = Math.max(0, data.affected.length - chips.length);

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };
  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
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
    <section
      className="relative rounded-md border p-3 shadow-sm "
      style={{ borderColor: TK.border, background: TK.card, fontFamily: FONT }}
      role="region"
      aria-labelledby={`auto-${data.id}-title`}
    >
            {drawerRow && (
                  <Drawer title="Page Analyzer" onClose={closeDrawer}>
        <ReassignmentPanel />
            </Drawer>
      )}
      {/* Header */}
      <div className="mb-1 flex items-start gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TypeIcon t={data.type} className="h-4 w-4" />
          <h4 id={`auto-${data.id}-title`} className="m-0 truncate text-[14px] font-semibold text-gray-900">
            {data.title}
          </h4>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SeverityPill level={data.severity} />
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
              ref={menuRef}
              className="absolute right-3 top-9 z-40 w-48 rounded-md border bg-white p-1.5 shadow-lg animate-[fadeIn_140ms_ease-out]"
              style={{ borderColor: TK.border }}
              role="menu"
            >
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
                onClick={() => {
                  setMenuOpen(false);
                  onSnooze?.(data.id, 7);
                }}
              >
                <Clock className="h-4 w-4 text-gray-700" /> Snooze 7 days
              </button>
              <button
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
                onClick={() => {
                  setMenuOpen(false);
                  onDismiss?.(data.id, 30);
                }}
              >
                <X className="h-4 w-4 text-gray-700" /> Dismiss 30 days
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtext */}
      <p className="mb-2 text-[13px] text-gray-600">{data.subtext}</p>

      {/* Affected row */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((u) => (
            <label
              key={u.userId}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 text-xs transition-colors duration-150 ${
                u.excludedByPolicy ? "opacity-60" : "hover:bg-[#F7FAFC]"
              }`}
              style={{ borderColor: TK.border }}
            >
              <input
                type="checkbox"
                className="cursor-pointer"
                disabled={u.excludedByPolicy}
                checked={!!sel[u.userId]}
                onChange={(e) => {
                  const next = { ...sel };
                  if (e.currentTarget.checked) next[u.userId] = true;
                  else delete next[u.userId];
                  setSel(next);
                }}
              />
              <img
                src={u.avatar || avatarUrl(u.email || u.userId)}
                alt={u.name}
                className="h-5 w-5 rounded-full border object-cover"
                style={{ borderColor: TK.borderSubtle }}
              />
              <span className="font-medium text-gray-800">{u.name}</span>
            </label>
          ))}

          {hiddenCount > 0 && (
            <div className="relative" ref={usersRef}>
              <button
                className="cursor-pointer rounded-full border px-2 py-1 text-xs transition-colors duration-150 hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.border }}
                onClick={() => setUsersOpen((v) => !v)}
                aria-expanded={usersOpen}
              >
                +{hiddenCount} more
              </button>
              {usersOpen && (
                <div className="absolute right-0 top-8">
                  <AffectedPopover
                    all={data.affected}
                    selected={sel}
                    onChange={setSel}
                    onClose={() => setUsersOpen(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Evidence tags */}
        {!!data.evidence?.length && (
          <div className="flex flex-wrap items-center gap-2">
            {data.evidence.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
                style={{ borderColor: TK.border, background: TK.card, color: TK.muted }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          className={`inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold text-white transition-transform duration-150 ${canPrimary ? "hover:-translate-y-0.5" : "opacity-50 cursor-not-allowed"}`}
          style={{ background: TK.brand, borderColor: TK.brand }}
          // onClick={() => canPrimary && onPrimary?.({ id: data.id, action: data.primary.key, selectedIds })}
          onClick={openDrawer}
          title={data.primary.disabledReason || ""}
        >
          <Check className="h-4 w-4" />
          {data.primary.label}
        </button>

        {data.secondary && (
          <button
            className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${canSecondary ? "cursor-pointer hover:bg-[#F7FAFC]" : "opacity-50 cursor-not-allowed"}`}
            style={{ borderColor: TK.border, color: TK.brand, background: TK.card }}
            onClick={() =>
              canSecondary && onSecondary?.({ id: data.id, action: data.secondary!.key, selectedIds })
            }
            title={data.secondary.disabledReason || ""}
          >
            {data.secondary.label}
          </button>
        )}

        {!!data.more?.length && (
          <div className="relative" ref={menuRef}>
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.border, background: TK.card }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              More
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-9 z-40 w-48 rounded-md border bg-white p-1.5 shadow-lg animate-[fadeIn_140ms_ease-out]"
                style={{ borderColor: TK.border }}
                role="menu"
              >
                {data.more.map((m) => (
                  <button
                    key={m.key}
                    className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
                    onClick={() => {
                      setMenuOpen(false);
                      onMore?.({ id: data.id, action: m.key, selectedIds });
                    }}
                  >
                    <ExternalLink className="h-4 w-4 text-gray-700" /> {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition-opacity duration-150 hover:opacity-80"
            style={{ color: TK.brand }}
            onClick={() => {
              setWhyOpen((v) => !v);
              onWhyOpen?.(data.id);
            }}
          >
            <Info className="h-4 w-4" />
            Why?
          </button>
          <span className="h-3 w-px" style={{ background: TK.border }} />
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold transition-opacity duration-150 hover:opacity-80"
            style={{ color: TK.brand }}
            onClick={() => onViewFiltered?.(data.id)}
          >
            <LayoutDashboard className="h-4 w-4" />
            View table
          </button>
        </div>
      </div>

      {/* Why popover */}
      {whyOpen && (
        <div
          ref={whyRef}
          className="absolute right-3 top-3 z-40 w-[340px] rounded-md border bg-white p-3 text-sm shadow-lg animate-[fadeIn_140ms_ease-out]"
          style={{ borderColor: TK.border }}
          role="dialog"
        >
          <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
            <Info className="h-4 w-4" style={{ color: TK.brand }} />
            Why this suggestion?
          </div>
          <div className="space-y-1 text-[13px] text-gray-800">
            <div>
              <span className="font-semibold">Rule:</span> {data.why?.rule ?? "Engine threshold matched"}
            </div>
            {data.why?.threshold && (
              <div>
                <span className="font-semibold">Threshold:</span> {data.why.threshold}
              </div>
            )}
            {data.why?.note && (
              <div>
                <span className="font-semibold">Note:</span> {data.why.note}
              </div>
            )}
            <div className="text-gray-500">Open: Engagement Table · Heatmap · Trends</div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              className="cursor-pointer rounded border px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-[#F7FAFC]"
              style={{ borderColor: TK.border }}
              onClick={() => setWhyOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────────────── Section wrapper ───────────────────────────────── */
export default function AutomationSuggestions({
  isAdmin = true,
}: {
  isAdmin?: boolean;
}) {
  const [items, setItems] = useState<SuggestionCardData[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setItems(null);
    try {
      const res = await fetchAutomationSuggestions();
      setItems(res.items);
    } catch {
      setErr("Couldn't load automation suggestions. Retry.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="rounded-md border bg-transparent mt-4" style={{ borderColor: "transparent", fontFamily: FONT, color: TK.text }}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5" style={{ color: TK.brand }} />
          <div>
            <h3 className="m-0 text-[16px] font-semibold text-gray-900">Automation Suggestions</h3>
            <div className="text-xs text-gray-500">Suggested admin actions based on recent activity</div>
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
            onClick={() => console.log("dismiss all")}
          >
            <X className="h-4 w-4" />
            Dismiss All
          </button>
        </div>
      </div>

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

      {/* Loading */}
      {!items && !err && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse rounded-md border"
              style={{ borderColor: TK.border, background: "#F6F8FA" }}
              aria-hidden
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {items && items.length === 0 && (
        <div className="rounded-md border p-3 text-sm text-gray-500" style={{ borderColor: TK.border }}>
          No automation suggestions for the selected filters.
        </div>
      )}

      {/* Cards */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <AutomationSuggestionCard
              key={it.id}
              data={it}
              onPrimary={(p) => console.log("primary", p)}
              onSecondary={(p) => console.log("secondary", p)}
              onMore={(p) => console.log("more", p)}
              onViewFiltered={(id) => console.log("view filtered", id)}
              onWhyOpen={(id) => console.log("why", id)}
              onSnooze={(id, d) => console.log("snooze", id, d)}
              onDismiss={(id, d) => console.log("dismiss", id, d)}
            />
          ))}
        </div>
      )}

      {/* Keyframes for subtle fade-in */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(2px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </section>
  );
}