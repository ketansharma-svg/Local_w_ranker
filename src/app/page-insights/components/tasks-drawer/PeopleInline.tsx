"use client";

import * as React from "react";
import { Users, SlidersHorizontal, Download, ChevronDown, ChevronUp } from "lucide-react";

/* ───────────────────────────────────────────────────────────────────────────
 *  Global Tokens (aligned with recent sections) + Inter / Inter Fallback
 *  These fall back to your app-level CSS vars if already defined.
 *  ─────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-action:#0077FF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-surface:#FFFFFF;
  --wr-subtle:#F5F7FA;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-success:#28C76F;
  --wr-warning:#FF9F43;
  --wr-danger:#EA5455;
  --wr-radius:12px;
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;}
`}</style>
);

/* ───────────────────────────────────────────────────────────────────────────
 *  Tokens (referencing CSS variables so theme stays consistent)
 *  ─────────────────────────────────────────────────────────────────────────── */
const TK = {
  surface: "var(--wr-surface)",
  subtle: "var(--wr-subtle)",
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  brand: "var(--wr-brand)",
  text: "var(--wr-text)",
  muted: "var(--wr-muted)",
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  danger: "var(--wr-danger)",
  radius: 12,
};

/* ───────────────────────────────────────────────────────────────────────────
 *  Types (unchanged)
 *  ─────────────────────────────────────────────────────────────────────────── */
type AssigneeStats = {
  id: string;
  name: string;
  avatarUrl?: string;
  assigned: number;
  completed: number;
  overdue: number;
  avgDurationHours?: number | null;
  lastActivity?: string | null;
};

export type PeopleInlineModuleProps = {
  data?: AssigneeStats[];
  isLoading?: boolean;
  onApplyAssigneeFilter?: (assigneeId: string, opts?: { onlyOverdue?: boolean }) => void;
  onJumpToTasks?: () => void;
  persistKey?: string;
  meId?: string;
  className?: string;
  title?: string;
};

/* ───────────────────────────────────────────────────────────────────────────
 *  Utils
 *  ─────────────────────────────────────────────────────────────────────────── */
function cx(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(" ");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d2 = Math.floor(h / 24);
  return `${d2}d ago`;
}

function fmtAvgHours(h?: number | null) {
  if (!Number.isFinite(h || NaN) || !h) return "—";
  if (h >= 24) {
    const days = Math.floor(h / 24);
    const remH = Math.round(h % 24);
    return `${days}d ${remH}h`;
  }
  if (h >= 1) return `${h.toFixed(1)}h`;
  const mins = Math.round((h as number) * 60);
  return `${mins}m`;
}

function truncateMid(s: string, max = 40) {
  if (!s) return "";
  if (s.length <= max) return s;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return s.slice(0, head) + "…" + s.slice(-tail);
}

/** Lightweight Avatar (uses image when available; initials fallback) */
function AvatarLite({ src, name, size = 28 }: { src?: string; name: string; size?: number }) {
  const [err, setErr] = React.useState(false);
  const dim = { width: size, height: size };
  const bg = "#D2EFFF";
  const fg = TK.brand;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden select-none"
      style={{ ...dim, background: bg, color: fg, border: `1px solid ${TK.border}` }}
      aria-label={name}
      title={name}
    >
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          onError={() => setErr(true)}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <span style={{ fontSize: Math.max(10, Math.floor(size * 0.38)), fontWeight: 600 }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** Demo seed (preserved) */
function makeDemo(): AssigneeStats[] {
  const N = 7;
  const names = ["Alex Rivera", "Priya Shah", "Jordan Lee", "Samir Patel", "Maya Chen", "Noah Thompson", "Ava Brooks"];
  return Array.from({ length: N }, (_, i) => {
    const assigned = 12 + Math.floor(Math.random() * 18);
    const completed = Math.max(0, Math.min(assigned, Math.floor(assigned * (0.45 + Math.random() * 0.4))));
    const overdue = Math.max(0, Math.floor((assigned - completed) * (Math.random() * 0.6)));
    const avg = 6 + Math.random() * 24;
    const last = new Date(Date.now() - (Math.random() * 6 + 0.2) * 86400000).toISOString();
    return {
      id: `u-${i + 1}`,
      name: names[i % names.length],
      assigned,
      completed,
      overdue,
      avgDurationHours: avg,
      lastActivity: last,
    };
  });
}

/** Export CSV (no prop changes required) */
function exportPeopleCSV(rows: AssigneeStats[]) {
  const header = ["Assignee ID", "Name", "Assigned", "Completed", "Overdue", "Avg Duration (h)", "Last Activity"];
  const body = rows.map((r) => [
    r.id,
    r.name.replace(/"/g, '""'),
    String(r.assigned),
    String(r.completed),
    String(r.overdue),
    r.avgDurationHours ?? "",
    r.lastActivity ?? "",
  ]);
  const csv = [header, ...body].map((cols) => cols.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `people-inline_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────────────────────────────────────────────────────────────────────────
 *  Component
 *  ─────────────────────────────────────────────────────────────────────────── */
export function PeopleInlineModule({
  data,
  isLoading,
  onApplyAssigneeFilter,
  onJumpToTasks,
  persistKey = "wr:people-collapsed",
  meId,
  className,
  title = "People",
}: PeopleInlineModuleProps) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      const raw = persistKey ? window?.localStorage?.getItem(persistKey) : null;
      return raw === "1";
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    try {
      if (persistKey) window.localStorage.setItem(persistKey, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed, persistKey]);

  const rowsAll = React.useMemo<AssigneeStats[]>(
    () => (Array.isArray(data) && data.length ? data : makeDemo()),
    [data]
  );

  // top‑5 by Assigned (desc)
  const rowsTop = React.useMemo(() => {
    return [...rowsAll].sort((a, b) => b.assigned - a.assigned).slice(0, 5);
  }, [rowsAll]);

  const maxOverdue = React.useMemo(() => Math.max(1, ...rowsTop.map((r) => r.overdue)), [rowsTop]);

  const apply = (assigneeId: string, opts?: { onlyOverdue?: boolean }) => {
    if (onApplyAssigneeFilter) onApplyAssigneeFilter(assigneeId, opts);
    else window.dispatchEvent(new CustomEvent("wr:people:applyFilter", { detail: { assigneeId, ...opts } }));
    if (onJumpToTasks) onJumpToTasks();
    else window.dispatchEvent(new CustomEvent("wr:people:jumpToTab", { detail: { tab: "tasks" } }));
  };

  return (
    <>
      <GlobalTokens />
      <section className={cx("wr-font w-full mt-4", className)} aria-label="People — Assignees snapshot">
        <div
          className="border rounded-[var(--wr-radius)] bg-[var(--wr-surface)] shadow-sm"
          style={{ borderColor: TK.border }}
        >
          {/* ─ Header (title + chips + actions with branded icons & Export) ─ */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b"
            style={{ borderColor: TK.borderLight }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users size={18} color="var(--wr-brand)" />
                <h3 className="text-sm font-semibold text-[var(--wr-text)]">{title}</h3>
              </div>

              {/* Small descriptor chip (modern) */}
              <span className="inline-flex items-center h-7 px-2.5 rounded-full border text-[12px] bg-white"
                style={{ borderColor: TK.border, color: TK.muted }}
              >
                Top assignees in this scope
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Filters button (modern chip) */}
              <button
                type="button"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] hover:bg-[var(--wr-subtle)]"
                style={{ borderColor: TK.border }}
                onClick={() => window.dispatchEvent(new CustomEvent("wr:people:openFilters"))}
                title="Filters"
              >
                <SlidersHorizontal size={14} color="var(--wr-brand)" />
                <span>Filters</span>
              </button>

              {/* Export button (CSV) */}
              <button
                type="button"
                className="inline-flex items-center gap-2 h-8 px-3 rounded-full border bg-white text-[12px] hover:bg-[var(--wr-subtle)]"
                style={{ borderColor: TK.border }}
                onClick={() => exportPeopleCSV(rowsAll)}
                title="Export CSV"
              >
                <Download size={14} color="var(--wr-brand)" />
                <span>Export</span>
              </button>

              {/* Collapse */}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] border bg-white text-[12px] hover:bg-[var(--wr-subtle)]"
                style={{ borderColor: TK.border }}
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                title={collapsed ? "Show" : "Hide"}
              >
                {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span className="hidden sm:inline">{collapsed ? "Show" : "Hide"}</span>
              </button>
            </div>
          </div>

          {/* ─ Body ─ */}
          {!collapsed && (
            <>
              {/* Overdue mini-bars */}
              <div className="hidden md:block px-4 pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium" style={{ color: TK.muted }}>
                    Overdue by assignee
                  </div>
                  <div className="text-xs" style={{ color: TK.muted }}>
                    Click a bar to filter; Tasks tab opens
                  </div>
                </div>

                <div className="space-y-2">
                  {rowsTop
                    .slice()
                    .sort((a, b) => b.overdue - a.overdue)
                    .map((r) => {
                      const pct = Math.round((r.overdue / maxOverdue) * 100);
                      return (
                        <button
                          key={`bar-${r.id}`}
                          onClick={() => apply(r.id, { onlyOverdue: true })}
                          className="w-full text-left"
                          aria-label={`Filter overdue tasks for ${r.name} (${r.overdue})`}
                          style={{ outlineOffset: 2, cursor: "pointer" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 w-[220px] min-w-[180px]">
                              <AvatarLite name={r.name} src={r.avatarUrl} />
                              <span className="truncate text-sm" style={{ color: TK.text }} title={r.name}>
                                {r.name}
                              </span>
                            </div>
                            <div className="relative flex-1 h-2 rounded bg-[#F3F4F6] overflow-hidden">
                              <div
                                className="h-2 rounded transition-[width] duration-200"
                                style={{ width: `${pct}%`, background: TK.danger, opacity: 0.9 }}
                                aria-hidden
                              />
                            </div>
                            <span className="w-10 text-right text-sm tabular-nums" style={{ color: TK.danger, fontWeight: 600 }}>
                              {r.overdue}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Table */}
              <div className="px-4 pb-3 pt-2">
                <div className="rounded border overflow-hidden" style={{ borderColor: TK.borderLight }}>
                  <div className="grid grid-cols-12 px-3 py-2 text-[13px] font-medium" style={{ background: TK.subtle, color: TK.muted }}>
                    <div className="col-span-5">Assignee</div>
                    <div className="col-span-1 text-right">Assigned</div>
                    <div className="col-span-1 text-right">Done</div>
                    <div className="col-span-1 text-right">Overdue</div>
                    <div className="col-span-2 text-center">Avg duration</div>
                    <div className="col-span-2 text-right">Last activity</div>
                  </div>

                  <div role="rowgroup" className="divide-y" style={{ borderColor: TK.borderLight }}>
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <div key={`sk-${i}`} className="grid grid-cols-12 px-3 py-3 animate-pulse">
                            <div className="col-span-5 flex items-center gap-2">
                              <span className="rounded-full" style={{ width: 28, height: 28, background: "#E5E7EB" }} />
                              <span className="h-3 w-40 rounded" style={{ background: "#E5E7EB" }} />
                            </div>
                            <div className="col-span-1" />
                            <div className="col-span-1" />
                            <div className="col-span-1" />
                            <div className="col-span-2" />
                            <div className="col-span-2" />
                          </div>
                        ))
                      : rowsTop.map((r) => {
                          const highlight = meId && r.id === meId;
                          return (
                            <div
                              key={r.id}
                              role="row"
                              className={cx("grid grid-cols-12 px-3 py-2 items-center hover:bg-[#F9FAFB]")}
                              style={{ background: highlight ? "#F7FBFF" : undefined }}
                            >
                              {/* Assignee */}
                              <div className="col-span-5 flex items-center gap-3 min-w-0">
                                <AvatarLite name={r.name} src={r.avatarUrl} />
                                <div className="min-w-0">
                                  <div className="truncate text-sm" style={{ color: TK.text, fontWeight: 600 }} title={r.name}>
                                    {r.name}
                                  </div>
                                  <div className="text-xs" style={{ color: TK.muted }}>
                                    {r.completed} done · {r.assigned} assigned
                                  </div>
                                </div>
                              </div>

                              {/* Assigned (clickable -> filter) */}
                              <button
                                className="col-span-1 text-right text-sm tabular-nums underline-offset-2 hover:underline"
                                style={{ color: TK.brand, cursor: "pointer" }}
                                onClick={() => apply(r.id)}
                                aria-label={`Filter tasks assigned to ${r.name}`}
                                title={`Filter tasks for ${truncateMid(r.name, 24)}`}
                              >
                                {r.assigned}
                              </button>

                              {/* Completed (clickable -> filter same assignee) */}
                              <button
                                className="col-span-1 text-right text-sm tabular-nums underline-offset-2 hover:underline"
                                style={{ color: TK.success, cursor: "pointer" }}
                                onClick={() => apply(r.id)}
                                aria-label={`Filter tasks for ${r.name}`}
                                title={`Filter tasks for ${truncateMid(r.name, 24)}`}
                              >
                                {r.completed}
                              </button>

                              {/* Overdue (clickable -> overdue only) */}
                              <button
                                className="col-span-1 text-right text-sm tabular-nums underline-offset-2 hover:underline"
                                style={{ color: TK.danger, fontWeight: r.overdue > 0 ? 700 : 500, cursor: "pointer" }}
                                onClick={() => apply(r.id, { onlyOverdue: true })}
                                aria-label={`Filter overdue tasks for ${r.name}`}
                                title={r.overdue > 0 ? "Show overdue only" : "No overdue"}
                              >
                                {r.overdue}
                              </button>

                              {/* Avg duration */}
                              <div className="col-span-2 text-center text-sm" style={{ color: TK.text }}>
                                {fmtAvgHours(r.avgDurationHours)}
                              </div>

                              {/* Last activity */}
                              <div className="col-span-2 text-right text-sm" style={{ color: TK.muted }} title={r.lastActivity || undefined}>
                                {timeAgo(r.lastActivity)}
                              </div>
                            </div>
                          );
                        })}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs" style={{ color: TK.muted }}>
                    Click a number or bar to filter; Tasks tab opens
                  </div>
                  <button
                    type="button"
                    className="text-sm underline underline-offset-2"
                    onClick={() => {
                      if (rowsTop[0]) apply(rowsTop[0].id);
                    }}
                    style={{ color: TK.brand, cursor: "pointer" }}
                    title="Open Tasks tab with assignee filter"
                  >
                    View all
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default PeopleInlineModule;
