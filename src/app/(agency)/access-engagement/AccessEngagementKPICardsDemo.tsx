"use client";

import React, { useMemo, useState, useContext, createContext } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  AreaChart,
  Area,
} from "recharts";
import TeamActivityTrendsDemo from "./TeamActivityTrendsDemo";
import DashboardUsageHeatmap from "./DashboardUsageHeatmap";
import UserEngagementTableDemo from "./UserEngagementTableDemo";
import RoleUtilizationBreakdown from "./RoleUtilizationBreakdown";
import SmartRecommendations from "./SmartRecommendations";
import UserSummaryDrawerDemo from "./UserSummaryDrawerDemo";
/* ========================================================================================
 * TOKENS (brand-aligned) — same font language as the panel, no emojis
 * ====================================================================================== */
const TK = {
  brand: "#1090D0",
  brandSubtle: "#D2EFFF",
  text: "#282829",
  muted: "rgba(40,40,41,0.64)",
  surface: "#FFFFFF",
  subtle: "#F5F7FA",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
};

/* ========================================================================================
 * ICONS — branded inline glyphs used for titles & CTAs
 * ====================================================================================== */
type IconName =
  | "users"
  | "idle"
  | "dashboard"
  | "tasks"
  | "sessions"
  | "trend"
  | "arrow-right"
  | "time"
  | "info";

const Icon: React.FC<{ name: IconName; size?: number; className?: string; title?: string }> = ({
  name,
  size = 18,
  className,
  title,
}) => {
  const s = "stroke-current";
  const p = { width: size, height: size, className, "aria-label": title } as any;
  switch (name) {
    case "users":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="8" cy="8" r="3.5" />
          <path className={s} fill="none" strokeWidth="1.8" d="M2.5 20a5.5 5.5 0 0 1 11 0" />
          <circle className={s} fill="none" strokeWidth="1.8" cx="17" cy="8" r="3" />
          <path className={s} fill="none" strokeWidth="1.8" d="M14 20a5 5 0 0 1 8 0" />
        </svg>
      );
    case "idle":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="9.5" />
          <path className={s} fill="none" strokeWidth="1.8" d="M12 7v6l4 2" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <rect className={s} fill="none" strokeWidth="1.8" x="3" y="3" width="8" height="8" rx="1.5" />
          <rect className={s} fill="none" strokeWidth="1.8" x="13" y="3" width="8" height="5" rx="1.5" />
          <rect className={s} fill="none" strokeWidth="1.8" x="13" y="10" width="8" height="11" rx="1.5" />
          <rect className={s} fill="none" strokeWidth="1.8" x="3" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M4 6h16M4 12h10M4 18h6" />
          <path className={s} fill="none" strokeWidth="1.8" d="m16 16 2 2 4-4" />
        </svg>
      );
    case "sessions":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="10" />
          <path className={s} fill="none" strokeWidth="1.8" d="M12 8v4l3 2" />
        </svg>
      );
    case "trend":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M3 17l6-6 4 4 7-7" />
          <path className={s} fill="none" strokeWidth="1.8" d="M14 8h7v7" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      );
    case "time":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="10" />
          <path className={s} fill="none" strokeWidth="1.8" d="M12 6v6l4 2" />
        </svg>
      );
    case "info":
      return (
        <svg {...p} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="10" />
          <path className={s} fill="none" strokeWidth="1.8" d="M12 8h.01M11 12h1v4h1" />
        </svg>
      );
  }
};

/* ========================================================================================
 * TYPES — input model for this KPI section
 * ====================================================================================== */
type RoleKey = "owner" | "admin" | "editor" | "viewer" | string;

type UserMeta = {
  id: string;
  name: string;
  role: RoleKey;
  avatar?: string;
  projectsCount: number;
  lastSeenAt?: string; // ISO
};

type DashboardKey = "seo" | "content" | "campaign" | "reporting" | string;

type DashboardMeta = { key: DashboardKey; label: string; color: string };

type ProjectMeta = { id: string; name: string; favicon?: string; domain?: string; color?: string };

type DayPoint<T = unknown> = { t: string } & T;

/** Input data contract (drop-in) */
export type KPICardsInput = {
  periodDays: 7 | 15;
  users: UserMeta[];
  dashboards: DashboardMeta[];
  projects: ProjectMeta[];
  summary: {
    totalUsers: number;
    /** Card 1 */
    activeDistinctUserIds: string[];
    /** Card 2 */
    idleDistinctUserIds: string[];
    /** Card 3 */
    mostVisitedDashboardKey: DashboardKey;
    mostVisitedUsers: Array<{ userId: string; visits: number; percentTime: number }>;
    /** Card 4 */
    totalTasksCompleted: number;
    tasksByUser: Array<{ userId: string; completed: number; pending: number }>;
    /** Card 5 */
    avgSessionsPerUser: number;
    sessionsByUser: Array<{ userId: string; sessions: number }>;
    /** Card 6 */
    topPerformerId: string;
    topPerformer: {
      timeMinutes: number;
      tasksCompleted: number;
      tasksAssigned: number;
      projects: Array<{ projectId: string; minutes: number; tasksCompleted: number; tasksPending: number }>;
    };
  };
  trends: {
    /** Card 1 — per day active list */
    activeDaily: DayPoint<{ userIds: string[] }>[]; // tooltip shows up to 10 users then "+N others"
    /** Card 2 — per day idle list */
    idleDaily: DayPoint<{ userIds: string[] }>[]; // tooltip shows up to 10 users then "+N others"
    /** Card 3 — per day: the leading user for that day and their time breakdown */
    usersTimeDaily: DayPoint<{
      userId: string;
      totalMinutes: number;
      byDashboard: Array<{ key: DashboardKey; minutes: number }>;
      topProjectId?: string;
    }>[]; // tooltip shows dashboards & top project
    /** Card 4 — per day completed tasks with per-user breakdown */
    tasksCompletedDaily: DayPoint<{ items: Array<{ userId: string; completed: number }> }>[]; // tooltip shows top users for that date
    /** Card 5 — per day sessions with per-user breakdown */
    sessionsDaily: DayPoint<{ items: Array<{ userId: string; sessions: number }> }>[]; // tooltip shows users & share vs period
    /** Card 6 — top performer time/tasks per day with per-project breakdown */
    topPerformerDaily: {
      time: DayPoint<{ byProject: Array<{ projectId: string; minutes: number; tasksCompleted: number }> }>[];
      tasks: DayPoint<{ byProject: Array<{ projectId: string; minutes: number; tasksCompleted: number }> }>[];
    };
  };
};

/* ========================================================================================
 * HELPERS
 * ====================================================================================== */
const nf = new Intl.NumberFormat();
const pf0 = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const pf1 = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });
const dtLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const fmtInt = (n?: number | null) => (n == null ? "—" : nf.format(n));
const minutesToHM = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
};

function hashColor(key: string, base = TK.brand) {
  // pastel hash color
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h % 10) / 10;
  const mix = (c: number) => Math.round(c * (0.45 + t * 0.45) + 255 * (0.1 + (1 - t) * 0.1));
  const br = parseInt(base.slice(1, 3), 16);
  const bg = parseInt(base.slice(3, 5), 16);
  const bb = parseInt(base.slice(5, 7), 16);
  const toHex = (x: number) => x.toString(16).padStart(2, "0");
  return `#${toHex(mix(br))}${toHex(mix(bg))}${toHex(mix(bb))}`;
}
const getUser = (users: UserMeta[], id: string) => users.find((u) => u.id === id);
const dashColor = (dashboards: DashboardMeta[], key: DashboardKey) =>
  dashboards.find((d) => d.key === key)?.color || TK.brand;

/* ========================================================================================
 * LAYER CONTEXT — raise a card above neighbors while any chart tooltip is visible
 * ====================================================================================== */
const CardLayerCtx = createContext<{ setRaised: (v: boolean) => void } | null>(null);
const useCardLayer = () => useContext(CardLayerCtx);

/* ========================================================================================
 * ATOMS — Avatar, Favicon, CTA, Title, Card, Popover
 * ====================================================================================== */
const Avatar: React.FC<{ user: UserMeta; size?: number }> = ({ user, size = 20 }) => {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return user.avatar ? (
    <img
      src={user.avatar}
      alt={user.name}
      width={size}
      height={size}
      className="rounded-full border"
      style={{ borderColor: TK.borderStrong, objectFit: "cover" }}
    />
  ) : (
    <div
      className="flex items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ width: size, height: size, background: hashColor(user.id) }}
      aria-hidden
      title={user.name}
    >
      {initials || "•"}
    </div>
  );
};

const Favicon: React.FC<{ project: ProjectMeta; size?: number }> = ({ project, size = 14 }) => {
  return project.favicon ? (
    <img
      src={project.favicon}
      alt={project.name}
      width={size}
      height={size}
      className="rounded-sm border"
      style={{ borderColor: TK.borderStrong, objectFit: "cover" }}
      title={project.domain || project.name}
    />
  ) : (
    <div
      className="flex items-center justify-center rounded-sm text-[9px] font-semibold text-white"
      style={{ width: size, height: size, background: project.color || TK.brand }}
      title={project.domain || project.name}
    >
      {project.name[0]?.toUpperCase()}
    </div>
  );
};

const CTA: React.FC<{ onClick: () => void; label: string; icon?: IconName }> = ({ onClick, label, icon = "arrow-right" }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold"
    style={{ borderColor: TK.borderStrong, background: TK.surface, color: TK.text }}
  >
    <Icon name={icon} className="text-[#1090D0]" size={14} />
    <span className="underline decoration-dotted underline-offset-2" style={{ color: TK.brand }}>
      {label}
    </span>
  </button>
);

const TitleRow: React.FC<{ icon: IconName; title: string; info?: string }> = ({ icon, title, info }) => (
  <div className="mb-2 flex items-center justify-between">
    <div className="group/title relative flex min-w-0 items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#F5F7FA]">
        <Icon name={icon} className="text-[#1090D0]" />
      </span>
      <div className="truncate text-[13px] font-semibold" style={{ color: TK.text }}>
        {title}
      </div>
      {info ? (
        <>
          <Icon name="info" size={15} className="text-[#9CA3AF]" />
          <div
            role="tooltip"
            className="invisible absolute left-0 top-7 z-[60] w-[300px] rounded-md border bg-white p-2 text-xs leading-snug shadow group-hover/title:visible"
            style={{ borderColor: TK.border, color: TK.text }}
          >
            {info}
          </div>
        </>
      ) : null}
    </div>
  </div>
);

/** Card that can raise its z-index while tooltips are active */
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [raised, setRaised] = useState(false);
  return (
    <div
      className={`relative flex h-full flex-col rounded-[12px] border bg-white p-4 shadow-sm transition-transform hover:-translate-y-[2px] ${
        raised ? "z-[200]" : "z-0"
      }`}
      style={{ borderColor: TK.border, fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <CardLayerCtx.Provider value={{ setRaised }}>{children}</CardLayerCtx.Provider>
    </div>
  );
};

const Popover: React.FC<{ title?: React.ReactNode; children?: React.ReactNode }> = ({ title, children }) => (
  <div
    className="rounded-md border bg-white p-2 text-xs shadow"
    style={{
      borderColor: TK.border,
      color: TK.text,
      pointerEvents: "none",
      width: "max-content",
      maxWidth: 420,
    }}
  >
    {title ? (
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        {title}
      </div>
    ) : null}
    <div className="flex flex-col gap-1">{children}</div>
  </div>
);

/* ========================================================================================
 * MICRO CHARTS — Stacked Donut (multi-slice), Bars (tiny), Area (tiny)
 * (Popover layer fix: raise card + escape viewbox + huge z-index)
 * ====================================================================================== */
type DonutPart = { label: string; value: number; color: string; id?: string };
const DonutStack: React.FC<{
  parts: DonutPart[];
  size?: number;
  tooltip?: React.ReactNode;
  ariaLabel: string;
}> = ({ parts, size = 72, tooltip, ariaLabel }) => {
  const layer = useCardLayer();
  const total = Math.max(1, parts.reduce((s, p) => s + (p.value || 0), 0));
  const data = parts.map((p) => ({ ...p, v: clamp01(p.value / total) }));
  return (
    <div
      className="relative h-[72px] w-[72px]"
      style={{ width: size, height: size }}
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={tooltip ? () => <Popover>{tooltip}</Popover> : undefined}
            wrapperStyle={{ zIndex: 2147483647, pointerEvents: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
          />
          <Pie data={data} dataKey="v" innerRadius={size / 2 - 12} outerRadius={size / 2} startAngle={90} endAngle={-270} isAnimationActive>
            {data.map((p, i) => (
              <Cell key={i} fill={p.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

type TinyBar = { x: string; y: number; extra?: any };
const BarsTiny: React.FC<{
  data: TinyBar[];
  color?: string;
  tooltipRender: (d: TinyBar) => React.ReactNode;
  ariaLabel: string;
}> = ({ data, color = TK.brand, tooltipRender, ariaLabel }) => {
  const layer = useCardLayer();
  return (
    <div
      className="h-[68px] w-[220px]"
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <RTooltip
            content={({ active, payload }: any) => {
              const d = payload?.[0]?.payload as TinyBar | undefined;
              return active && d ? <Popover title={dtLabel(d.x)}>{tooltipRender(d)}</Popover> : null;
            }}
            wrapperStyle={{ zIndex: 2147483647, pointerEvents: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="y" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

type TinyArea = { x: string; y: number; extra?: any };
const AreaTiny: React.FC<{
  data: TinyArea[];
  color?: string;
  tooltipRender: (d: TinyArea) => React.ReactNode;
  ariaLabel: string;
}> = ({ data, color = TK.brand, tooltipRender, ariaLabel }) => {
  const layer = useCardLayer();
  return (
    <div
      className="h-[68px] w-[220px]"
      onMouseEnter={() => layer?.setRaised(true)}
      onMouseLeave={() => layer?.setRaised(false)}
      onFocus={() => layer?.setRaised(true)}
      onBlur={() => layer?.setRaised(false)}
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide />
          <RTooltip
            content={({ active, payload }: any) => {
              const d = payload?.[0]?.payload as TinyArea | undefined;
              return active && d ? <Popover title={dtLabel(d.x)}>{tooltipRender(d)}</Popover> : null;
            }}
            wrapperStyle={{ zIndex: 2147483647, pointerEvents: "none" }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={12}
            cursor={{ stroke: "rgba(0,0,0,0.08)" }}
          />
          <defs>
            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill="url(#gA)" />
        </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
};

/* ========================================================================================
 * MAIN SECTION — KPI Cards Grid (single-view cards, donuts + trends)
 * ====================================================================================== */
export function AccessEngagementKPICards({
  model,
  onDrill = (dest, payload) => console.log("kpi.drill", dest, payload),
}: {
  model: KPICardsInput;
  onDrill?: (dest: string, payload?: any) => void;
}) {
  const { users, dashboards, projects, summary, trends, periodDays } = model;
  const totalUsers = summary.totalUsers || users.length;

  // Helpers to cut lists to 10 with "+N others"
  const cap10 = <T,>(arr: T[]) => ({ top: arr.slice(0, 10), more: Math.max(0, arr.length - 10) });

  // Simple JSON export
  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kpi-cards-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // no-op
    }
  };

  // === CARD 1: Active Users (donut by people, trend = bar per day) ======================
  const activeDistinct = summary.activeDistinctUserIds;
  const activePartsFull = activeDistinct
    .map((uid) => getUser(users, uid))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, label: u!.name, value: 1, color: hashColor(u!.id) }));
  const { top: auTop, more: auMore } = cap10(activePartsFull);
  const auParts: DonutPart[] = auTop;
  if (auMore > 0) auParts.push({ label: "Others", value: auMore, color: "#E5E7EB" });

  const auTooltip = (
    <>
      <div className="mb-1 font-semibold">Breakdown — Active users</div>
      {auTop.map((p) => {
        const u = getUser(users, (p as any).id);
        if (!u) return null;
        return (
          <div key={u.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span className="font-medium">{u.name}</span>
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {u.role} · {u.projectsCount} projects
            </div>
          </div>
        );
      })}
      {auMore > 0 ? (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          +{auMore} others
        </div>
      ) : null}
    </>
  );

  const auBars: TinyBar[] = (trends.activeDaily || []).slice(-periodDays).map((d) => ({
    x: d.t,
    y: d.userIds.length,
    extra: d.userIds,
  }));

  // === CARD 2: Idle Users (donut by people, trend = bar per day) ========================
  const idleDistinct = summary.idleDistinctUserIds;
  const idleFull = idleDistinct
    .map((uid) => getUser(users, uid))
    .filter(Boolean)
    .map((u) => ({ id: u!.id, label: u!.name, value: 1, color: hashColor(u!.id, TK.danger) }));
  const { top: iuTop, more: iuMore } = cap10(idleFull);
  const iuParts: DonutPart[] = iuTop;
  if (iuMore > 0) iuParts.push({ label: "Others", value: iuMore, color: "#F3F4F6" });

  const iuTooltip = (
    <>
      <div className="mb-1 font-semibold">Breakdown — Idle users</div>
      {iuTop.map((p) => {
        const u = getUser(users, (p as any).id);
        if (!u) return null;
        return (
          <div key={u.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span className="font-medium">{u.name}</span>
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {u.role} · {u.projectsCount} projects · {u.lastSeenAt ? `last seen ${dtLabel(u.lastSeenAt)}` : "no record"}
            </div>
          </div>
        );
      })}
      {iuMore > 0 ? (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          +{iuMore} others
        </div>
      ) : null}
    </>
  );

  const iuBars: TinyBar[] = (trends.idleDaily || []).slice(-periodDays).map((d) => ({
    x: d.t,
    y: d.userIds.length,
    extra: d.userIds,
  }));

  // === CARD 3: Most Visited Dashboard (donut by users in that dash, trend = bar/day top user time)
  const mvdKey = summary.mostVisitedDashboardKey;
  const mvdUsers = [...summary.mostVisitedUsers].sort((a, b) => b.percentTime - a.percentTime);
  const { top: mvdTop, more: mvdMore } = cap10(mvdUsers);
  const mvdParts: DonutPart[] = mvdTop.map((r) => ({
    id: r.userId,
    label: getUser(users, r.userId)?.name || r.userId,
    value: r.percentTime,
    color: hashColor(r.userId),
  }));
  if (mvdMore > 0) mvdParts.push({ label: "Others", value: mvdUsers.slice(10).reduce((s, x) => s + x.percentTime, 0), color: "#E5E7EB" });
  const mvdTooltip = (
    <>
      <div className="mb-1 font-semibold">Breakdown — {dashboards.find((d) => d.key === mvdKey)?.label || "Dashboard"}</div>
      {mvdTop.map((r) => {
        const u = getUser(users, r.userId);
        if (!u) return null;
        return (
          <div key={u.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: hashColor(u.id) }} />
              <span className="font-medium">{u.name}</span>
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {r.visits} visits · {pf1.format(r.percentTime)}
            </div>
          </div>
        );
      })}
      {mvdMore > 0 ? (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          +{mvdMore} others
        </div>
      ) : null}
    </>
  );

  const utBars: TinyBar[] = (trends.usersTimeDaily || []).slice(-periodDays).map((d) => ({
    x: d.t,
    y: d.totalMinutes,
    extra: d,
  }));

  // === CARD 4: Total Completed Tasks (donut by user completed, trend = area/day)
  const tbuSorted = [...summary.tasksByUser].sort((a, b) => b.completed - a.completed);
  const { top: tcTop, more: tcMore } = cap10(tbuSorted);
  const tcParts: DonutPart[] = tcTop.map((r) => ({
    id: r.userId,
    label: getUser(users, r.userId)?.name || r.userId,
    value: r.completed,
    color: hashColor(r.userId, TK.good),
  }));
  if (tcMore > 0) tcParts.push({ label: "Others", value: tbuSorted.slice(10).reduce((s, x) => s + x.completed, 0), color: "#E5E7EB" });
  const tcTooltip = (
    <>
      <div className="mb-1 font-semibold">Breakdown — Completed tasks</div>
      {tcTop.map((r) => {
        const u = getUser(users, r.userId);
        const total = r.completed + (r.pending || 0);
        const ratio = total > 0 ? r.completed / total : 0;
        if (!u) return null;
        return (
          <div key={u.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: hashColor(u.id, TK.good) }} />
              <span className="font-medium">{u.name}</span>
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {r.completed} done · {total - r.completed} pending · {pf1.format(ratio)} done
            </div>
          </div>
        );
      })}
      {tcMore > 0 ? (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          +{tcMore} others
        </div>
      ) : null}
    </>
  );
  const tcArea: TinyArea[] = (trends.tasksCompletedDaily || [])
    .slice(-periodDays)
    .map((d) => ({ x: d.t, y: d.items.reduce((s, it) => s + it.completed, 0), extra: d }));

  // === CARD 5: Avg Sessions / User (donut by per-user total sessions, trend = area/day)
  const sbuSorted = [...summary.sessionsByUser].sort((a, b) => b.sessions - a.sessions);
  const { top: sesTop, more: sesMore } = cap10(sbuSorted);
  const sesParts: DonutPart[] = sesTop.map((r) => ({
    id: r.userId,
    label: getUser(users, r.userId)?.name || r.userId,
    value: r.sessions,
    color: hashColor(r.userId, TK.brand),
  }));
  if (sesMore > 0) sesParts.push({ label: "Others", value: sbuSorted.slice(10).reduce((s, x) => s + x.sessions, 0), color: "#E5E7EB" });
  const sesTooltip = (
    <>
      <div className="mb-1 font-semibold">Breakdown — Total sessions</div>
      {sesTop.map((r) => {
        const u = getUser(users, r.userId);
        if (!u) return null;
        return (
          <div key={u.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: hashColor(u.id, TK.brand) }} />
              <span className="font-medium">{u.name}</span>
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {u.projectsCount} projects · {r.sessions} sessions
            </div>
          </div>
        );
      })}
      {sesMore > 0 ? (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          +{sesMore} others
        </div>
      ) : null}
    </>
  );
  const sesArea: TinyArea[] = (trends.sessionsDaily || [])
    .slice(-periodDays)
    .map((d) => ({ x: d.t, y: d.items.reduce((s, it) => s + it.sessions, 0), extra: d }));

  const totalSessionsPeriod = sbuSorted.reduce((s, r) => s + r.sessions, 0);

  // === CARD 6: Top Performer (donut by projects/time; trend = bars with toggle) =========
  const topUser = getUser(users, summary.topPerformerId);
  const [tpMode, setTpMode] = useState<"time" | "tasks">("time");
  const tpDonutParts: DonutPart[] = summary.topPerformer.projects
    .map((p) => {
      const meta = projects.find((x) => x.id === p.projectId);
      return {
        label: meta?.name || p.projectId,
        value: p.minutes,
        color: meta?.color || hashColor(p.projectId),
        id: p.projectId,
      };
    })
    .sort((a, b) => b.value - a.value);
  const tpTooltip = (
    <>
      <div className="mb-1 font-semibold">Projects — {topUser?.name}</div>
      {tpDonutParts.slice(0, 10).map((p) => {
        const meta = projects.find((x) => x.id === p.id);
        const src = summary.topPerformer.projects.find((x) => x.projectId === p.id)!;
        return (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Favicon project={{ ...(meta || { id: "", name: String(p.label) }), favicon: meta?.favicon, domain: meta?.domain }} />
              <span className="font-medium">{meta?.name || p.label}</span>
            </div>
            <div className="text-[11px]" style={{ color: TK.muted }}>
              {minutesToHM(src.minutes)} · {src.tasksCompleted} done · {src.tasksPending} pending
            </div>
          </div>
        );
      })}
      {tpDonutParts.length > 10 ? (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          +{tpDonutParts.length - 10} other projects
        </div>
      ) : null}
    </>
  );

  const tpBars: TinyBar[] =
    (tpMode === "time" ? trends.topPerformerDaily.time : trends.topPerformerDaily.tasks)?.slice(-periodDays).map((d) => ({
      x: d.t,
      y:
        tpMode === "time"
          ? d.byProject.reduce((s, p) => s + p.minutes, 0)
          : d.byProject.reduce((s, p) => s + p.tasksCompleted, 0),
      extra: d,
    })) || [];
    
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
    <section className="w-full" style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}>
      {/* Section header with Export */}
                        {drawerRow && (
              <Drawer title="Drawer" onClose={closeDrawer}>
                <UserSummaryDrawerDemo   />
              </Drawer>
            )}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            Team Activity Summary
          </h3>
          <div className="text-xs" style={{ color: TK.muted }}>
            Last {periodDays} days
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold"
          style={{ borderColor: TK.borderStrong, background: TK.surface, color: TK.text }}
          aria-label="Export section data"
          title="Export JSON"
        >
          {/* inline download icon to avoid modifying Icon union */}
          <svg width="16" height="16" viewBox="0 0 24 24" className="stroke-current">
            <path fill="none" strokeWidth="1.8" d="M12 3v12m0 0 4-4m-4 4-4-4" />
            <path fill="none" strokeWidth="1.8" d="M4 21h16" />
          </svg>
          Export
        </button>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {/* Card 1 — Active Users */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <Card>
            <TitleRow icon="users" title="Active Users (last period)" info="Distinct users with ≥1 login or tracked action in the selected period." />
            <div className="flex items-center justify-between gap-3">
              <DonutStack parts={auParts} ariaLabel="Active users breakdown" tooltip={auTooltip} />
              <div className="min-w-[160px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(activeDistinct.length)} / {fmtInt(totalUsers)}
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  active of total users
                </div>
              </div>
              <BarsTiny
                data={auBars}
                ariaLabel="Daily active users"
                color={TK.brand}
                tooltipRender={(d) => {
                  const ids: string[] = d.extra || [];
                  const { top, more } = cap10(ids);
                  return (
                    <>
                      {top.map((id) => {
                        const u = getUser(users, id);
                        if (!u) return null;
                        return (
                          <div key={id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar user={u} />
                              <div className="font-medium">{u.name}</div>
                            </div>
                            <div className="text-[11px]" style={{ color: TK.muted }}>
                              {u.role} · {u.projectsCount} projects
                            </div>
                          </div>
                        );
                      })}
                      {more > 0 ? <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>+{more} others</div> : null}
                    </>
                  );
                }}
              />
            </div>
            <div className="mt-3">
              <CTA onClick={() => onDrill("engagement_table", { inactivity: "active" })} label="View Active Users" icon="users" />
            </div>
          </Card>
        </div>

        {/* Card 2 — Idle Users */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <Card>
            <TitleRow icon="idle" title="Idle Users (last period)" info="Users with no login and no tracked action during the period." />
            <div className="flex items-center justify-between gap-3">
              <DonutStack parts={iuParts} ariaLabel="Idle users breakdown" tooltip={iuTooltip} />
              <div className="min-w-[160px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(idleDistinct.length)} / {fmtInt(totalUsers)}
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  idle of total users
                </div>
              </div>
              <BarsTiny
                data={iuBars}
                ariaLabel="Daily idle users"
                color={TK.danger}
                tooltipRender={(d) => {
                  const ids: string[] = d.extra || [];
                  const { top, more } = cap10(ids);
                  return (
                    <>
                      {top.map((id) => {
                        const u = getUser(users, id);
                        if (!u) return null;
                        return (
                          <div key={id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar user={u} />
                              <div className="font-medium">{u.name}</div>
                            </div>
                            <div className="text-[11px]" style={{ color: TK.muted }}>
                              {u.role} · {u.projectsCount} projects · {u.lastSeenAt ? `last ${dtLabel(u.lastSeenAt)}` : "no record"}
                            </div>
                          </div>
                        );
                      })}
                      {more > 0 ? <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>+{more} others</div> : null}
                    </>
                  );
                }}
              />
            </div>
            <div className="mt-3">
              <CTA onClick={() => onDrill("engagement_table", { inactivity: "inactive" })} label="Review Inactive Users" icon="idle" />
            </div>
          </Card>
        </div>

        {/* Card 3 — Most Visited Dashboard */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <Card>
            <TitleRow
              icon="dashboard"
              title="Most Visited Dashboard"
              info="Users’ share of time on the top dashboard; daily bar shows the top user’s total time across dashboards."
            />
            <div className="flex items-center justify-between gap-3">
              <DonutStack parts={mvdParts} ariaLabel="Users’ share on most visited dashboard" tooltip={mvdTooltip} />
              <div className="min-w-[160px]">
                <div className="text-[18px] font-extrabold" style={{ color: TK.text }}>
                  {dashboards.find((d) => d.key === mvdKey)?.label || "—"}
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  Top in last {periodDays} days
                </div>
              </div>
              <BarsTiny
                data={utBars}
                ariaLabel="Daily top user time"
                color={dashColor(dashboards, mvdKey)}
                tooltipRender={(d) => {
                  const row = d.extra as (typeof trends.usersTimeDaily)[number];
                  const u = getUser(users, row.userId);
                  return (
                    <>
                      {u ? (
                        <div className="mb-1 flex items-center gap-2">
                          <Avatar user={u} />
                          <div className="font-semibold">{u.name}</div>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-6">
                        <span style={{ color: TK.muted }}>Total time</span>
                        <span className="font-semibold">{minutesToHM(row.totalMinutes)}</span>
                      </div>
                      <div className="mt-1" style={{ color: TK.muted, fontWeight: 600 }}>
                        Dashboards
                      </div>
                      {row.byDashboard.map((bd) => (
                        <div key={bd.key} className="flex items-center justify-between gap-4">
                          <span>{dashboards.find((x) => x.key === bd.key)?.label || bd.key}</span>
                          <span className="text-[12px]">{minutesToHM(bd.minutes)}</span>
                        </div>
                      ))}
                      {row.topProjectId ? (
                        <div className="mt-1" style={{ color: TK.muted, fontWeight: 600 }}>
                          Top Project
                        </div>
                      ) : null}
                      {row.topProjectId ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Favicon project={projects.find((p) => p.id === row.topProjectId) || { id: "", name: "Project" }} />
                            <span>{projects.find((p) => p.id === row.topProjectId)?.name || row.topProjectId}</span>
                          </div>
                          <div className="text-[11px]" style={{ color: TK.muted }}>
                            most time
                          </div>
                        </div>
                      ) : null}
                    </>
                  );
                }}
              />
            </div>
            <div className="mt-3">
              <CTA onClick={() => onDrill("heatmap", { dashboard: mvdKey })} label="Open Usage Breakdown" icon="dashboard" />
            </div>
          </Card>
        </div>

        {/* Card 4 — Total Completed Tasks */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <Card>
            <TitleRow icon="tasks" title="Total Completed Tasks" info="Donut shows who completed tasks; area shows daily completions." />
            <div className="flex items-center justify-between gap-3">
              <DonutStack parts={tcParts} ariaLabel="Completed tasks by user" tooltip={tcTooltip} />
              <div className="min-w-[160px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {fmtInt(summary.totalTasksCompleted)}
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  in last {periodDays} days
                </div>
              </div>
              <AreaTiny
                data={tcArea}
                color={TK.good}
                ariaLabel="Daily completed tasks"
                tooltipRender={(d) => {
                  const dp = d.extra as (typeof trends.tasksCompletedDaily)[number];
                  const items = [...dp.items].sort((a, b) => b.completed - a.completed);
                  const { top, more } = cap10(items);
                  return (
                    <>
                      {top.map((it) => {
                        const u = getUser(users, it.userId);
                        if (!u) return null;
                        return (
                          <div key={it.userId} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar user={u} />
                              <div className="font-medium">{u.name}</div>
                            </div>
                            <div className="text-[11px]" style={{ color: TK.muted }}>
                              {u.role} · {it.completed} done
                            </div>
                          </div>
                        );
                      })}
                      {more > 0 ? <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>+{more} others</div> : null}
                    </>
                  );
                }}
              />
            </div>
            <div className="mt-3">
              <CTA onClick={() => onDrill("taskboard", { state: "completed" })} label="View in Taskboard" icon="tasks" />
            </div>
          </Card>
        </div>

        {/* Card 5 — Avg. Sessions per User */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <Card>
            <TitleRow
              icon="sessions"
              title="Avg. Sessions per User"
              info="Donut shows total sessions by user; area shows daily total sessions."
            />
            <div className="flex items-center justify-between gap-3">
              <DonutStack parts={sesParts} ariaLabel="Sessions by user" tooltip={sesTooltip} />
              <div className="min-w-[160px]">
                <div className="text-[22px] font-extrabold" style={{ color: TK.text }}>
                  {summary.avgSessionsPerUser.toFixed(1)}
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  average in last {periodDays} days
                </div>
              </div>
              <AreaTiny
                data={sesArea}
                color={TK.brand}
                ariaLabel="Daily sessions"
                tooltipRender={(d) => {
                  const dp = d.extra as (typeof trends.sessionsDaily)[number];
                  const items = [...dp.items].sort((a, b) => b.sessions - a.sessions);
                  const { top, more } = cap10(items);
                  return (
                    <>
                      {top.map((it) => {
                        const u = getUser(users, it.userId);
                        if (!u) return null;
                        const userTotal = summary.sessionsByUser.find((x) => x.userId === it.userId)?.sessions || 0;
                        const shareVsPeriod = userTotal > 0 ? it.sessions / userTotal : 0;
                        return (
                          <div key={it.userId} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Avatar user={u} />
                              <div className="font-medium">{u.name}</div>
                            </div>
                            <div className="text-[11px]" style={{ color: TK.muted }}>
                              {u.role} · {it.sessions} sessions · {pf1.format(shareVsPeriod)} of user’s period
                            </div>
                          </div>
                        );
                      })}
                      {more > 0 ? <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>+{more} others</div> : null}
                    </>
                  );
                }}
              />
            </div>
            <div className="mt-3">
              <CTA onClick={() => onDrill("trends", { metric: "sessions" })} label="See Session Breakdown" icon="trend" />
            </div>
          </Card>
        </div>

        {/* Card 6 — Top Performer (Time & Tasks toggle) */}
        <div className="col-span-12 sm:col-span-6 xl:col-span-4">
          <Card>
            <TitleRow
              icon="trend"
              title="Top Performer (Time & Tasks)"
              info="Donut shows their time split by project; bars show daily time or tasks with a toggle."
            />
            <div className="flex items-center justify-between gap-3">
              <DonutStack parts={tpDonutParts} ariaLabel="Top performer projects by time" tooltip={tpTooltip} />
              <div className="min-w-[160px]">
                <div className="text-[13px]" style={{ color: TK.muted }}>
                  {topUser?.name || "—"}
                </div>
                <div className="text-[16px] font-extrabold" style={{ color: TK.text }}>
                  {minutesToHM(summary.topPerformer.timeMinutes)} · {fmtInt(summary.topPerformer.tasksCompleted)} tasks
                </div>
                <div className="text-xs" style={{ color: TK.muted }}>
                  {summary.topPerformer.tasksAssigned > 0
                    ? `${Math.round((summary.topPerformer.tasksCompleted / summary.topPerformer.tasksAssigned) * 100)}% done`
                    : "—"}
                </div>

                {/* Branded chip toggle (Time / Tasks) */}
                <div className="mt-2 inline-flex rounded-md border p-0.5" style={{ borderColor: TK.borderStrong }}>
                  {(["time", "tasks"] as const).map((k) => {
                    const active = tpMode === k;
                    return (
                      <button
                        key={k}
                        onClick={() => setTpMode(k)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold"
                        style={{
                          background: active ? TK.brandSubtle : "transparent",
                          color: active ? TK.text : TK.muted,
                          border: `1px solid ${active ? TK.borderStrong : "transparent"}`,
                        }}
                        aria-pressed={active}
                      >
                        <Icon name={k === "time" ? "time" : "tasks"} size={13} className="text-[#1090D0]" />
                        {k === "time" ? "Time" : "Tasks"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <BarsTiny
                data={tpBars}
                ariaLabel="Top performer daily"
                color={tpMode === "time" ? TK.brand : TK.good}
                tooltipRender={(d) => {
                  const row = d.extra as (typeof trends.topPerformerDaily.time)[number];
                  const list = row.byProject
                    .map((bp) => {
                      const meta = projects.find((p) => p.id === bp.projectId);
                      return { ...bp, meta };
                    })
                    .sort((a, b) => (tpMode === "time" ? b.minutes - a.minutes : b.tasksCompleted - a.tasksCompleted));
                  const { top, more } = cap10(list);
                  return (
                    <>
                      {top.map((bp) => (
                        <div key={bp.projectId} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Favicon project={bp.meta || { id: "", name: String(bp.projectId) }} />
                            <div className="font-medium">{bp.meta?.name || bp.projectId}</div>
                          </div>
                          <div className="text-[11px]" style={{ color: TK.muted }}>
                            {tpMode === "time" ? minutesToHM(bp.minutes) : `${bp.tasksCompleted} tasks`}
                          </div>
                        </div>
                      ))}
                      {more > 0 ? <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>+{more} other projects</div> : null}
                    </>
                  );
                }}
              />
            </div>
            <div className="mt-3 cursor-pointer">
              <CTA onClick={openDrawer} label="View Full Activity" icon="arrow-right" />
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================================
 * DEMO (drop-in) — remove when wiring your API. Generates realistic mock data for 7 days.
 * ====================================================================================== */
export default function AccessEngagementKPICardsDemo() {
  const model = useMemo(() => makeMockModel(7), []);
  return (
    <>
    <div className="p-4" style={{ background: TK.subtle }}>
      <AccessEngagementKPICards
        model={model}
        onDrill={(dest, payload) => alert(`(demo) Drill → ${dest}\n\n${JSON.stringify(payload, null, 2)}`)}
      />
    </div>
        <TeamActivityTrendsDemo />
            <div className="p-4" style={{ background: TK.subtle }}>
        <DashboardUsageHeatmap /></div>
        <UserEngagementTableDemo />
                    <div className="p-4" style={{ background: TK.subtle }}>
        <RoleUtilizationBreakdown /></div>
       <div className="p-4" style={{ background: TK.subtle }}> <SmartRecommendations /></div>
    </>
  );
}

/* ========================================================================================
 * MOCK BUILDER — deterministic sample (7 or 15 days)
 * ====================================================================================== */
function makeMockModel(days: 7 | 15): KPICardsInput {
  // Users
  const U = (id: number, name: string, role: RoleKey, p: number, lastSeenOffset?: number): UserMeta => ({
    id: `u${id}`,
    name,
    role,
    projectsCount: p,
    lastSeenAt: lastSeenOffset != null ? new Date(Date.now() - lastSeenOffset * 86400000).toISOString() : undefined,
    avatar: "",
  });
  const users: UserMeta[] = [
    U(1, "Sara Mehta", "editor", 3, 2),
    U(2, "Vikash Bharia", "admin", 4, 1),
    U(3, "Ava Patel", "viewer", 2, 6),
    U(4, "Diego Rossi", "editor", 3),
    U(5, "Elena García", "viewer", 1, 8),
    U(6, "Hugo Silva", "viewer", 2, 10),
    U(7, "Ivy Chen", "editor", 3),
    U(8, "Jay Park", "viewer", 1),
    U(9, "Kai Müller", "admin", 5),
    U(10, "Lina Novak", "viewer", 2),
    U(11, "Ben Carter", "editor", 2),
    U(12, "Chloe Nguyen", "viewer", 1),
  ];

  // Dashboards + projects
  const dashboards: DashboardMeta[] = [
    { key: "seo", label: "SEO", color: "#3B82F6" },
    { key: "content", label: "Content", color: "#8B5CF6" },
    { key: "campaign", label: "Campaign", color: "#F59E0B" },
    { key: "reporting", label: "Reporting", color: "#10B981" },
  ];
  const projects: ProjectMeta[] = [
    { id: "p1", name: "wranker.com", favicon: "", domain: "wranker.com", color: "#6E44FF" },
    { id: "p2", name: "docs.wranker", favicon: "", domain: "docs.wranker.com", color: "#00B8D9" },
    { id: "p3", name: "ads-portfolio", favicon: "", domain: "ads.company.com", color: "#F59E0B" },
    { id: "p4", name: "content-hub", favicon: "", domain: "hub.company.com", color: "#8B5CF6" },
  ];

  // Utility rng
  let s = 7;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const recentDays = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().slice(0, 10);
  });

  // Active & Idle per day
  const activeDaily = recentDays.map((t) => {
    const active = users.filter(() => rnd() > 0.25).map((u) => u.id);
    return { t, userIds: [...new Set(active)] };
  });
  const idleDaily = recentDays.map((t, i) => {
    const actIds = new Set(activeDaily[i].userIds);
    const idle = users.filter((u) => !actIds.has(u.id) && rnd() > 0.3).map((u) => u.id);
    return { t, userIds: idle };
  });
  const activeDistinct = [...new Set(activeDaily.flatMap((d) => d.userIds))];
  const idleDistinct = [...new Set(idleDaily.flatMap((d) => d.userIds))];

  // Most visited dashboard + per-user time & visits
  const mostVisitedDashboardKey: DashboardKey = "seo";
  const mostVisitedUsers = users
    .map((u) => ({ userId: u.id, visits: Math.max(1, Math.round(rnd() * 9)), percentTime: 0 }))
    .map((r) => ({ ...r, percentTime: Math.max(0.02, rnd()) }));
  const sumPT = mostVisitedUsers.reduce((s, x) => s + x.percentTime, 0);
  mostVisitedUsers.forEach((x) => (x.percentTime = x.percentTime / sumPT));

  const usersTimeDaily = recentDays.map((t) => {
    const userId = users[Math.floor(rnd() * users.length)].id;
    const totalMinutes = Math.max(15, Math.round(rnd() * 240));
    const byDashboard = dashboards.map((d) => ({ key: d.key, minutes: Math.round(totalMinutes * (0.1 + rnd() * 0.4)) }));
    const sum = byDashboard.reduce((s, x) => s + x.minutes, 0);
    byDashboard[0].minutes += Math.max(0, totalMinutes - sum);
    const topProjectId = projects[Math.floor(rnd() * projects.length)].id;
    return { t, userId, totalMinutes, byDashboard, topProjectId };
  });

  // Tasks completed daily + by user totals
  const tasksCompletedDaily = recentDays.map((t) => {
    const items = users
      .filter(() => rnd() > 0.35)
      .map((u) => ({ userId: u.id, completed: Math.max(0, Math.round(rnd() * 6)) }));
    return { t, items };
  });
  const tasksByUser = users.map((u) => ({
    userId: u.id,
    completed: tasksCompletedDaily.reduce((s, d) => s + (d.items.find((i) => i.userId === u.id)?.completed || 0), 0),
    pending: Math.round(rnd() * 12),
  }));
  const totalTasksCompleted = tasksByUser.reduce((s, r) => s + r.completed, 0);

  // Sessions daily + per user totals
  const sessionsDaily = recentDays.map((t) => {
    const items = users
      .filter(() => rnd() > 0.25)
      .map((u) => ({ userId: u.id, sessions: Math.max(0, Math.round(rnd() * 5)) }));
    return { t, items };
  });
  const sessionsByUser = users.map((u) => ({
    userId: u.id,
    sessions: sessionsDaily.reduce((s, d) => s + (d.items.find((i) => i.userId === u.id)?.sessions || 0), 0),
  }));
  const avgSessionsPerUser = activeDistinct.length > 0 ? sessionsByUser.reduce((s, r) => s + r.sessions, 0) / activeDistinct.length : 0;

  // Top performer
  const topPerformerId = users.sort(
    (a, b) => (sessionsByUser.find((x) => x.userId === b.id)?.sessions || 0) - (sessionsByUser.find((x) => x.userId === a.id)?.sessions || 0)
  )[0].id;
  const tpTimeByDay = recentDays.map((t) => {
    const byProject = projects.map((p) => ({
      projectId: p.id,
      minutes: Math.max(0, Math.round(rnd() * 90)),
      tasksCompleted: Math.max(0, Math.round(rnd() * 4)),
    }));
    return { t, byProject };
  });
  const tpTasksByDay = tpTimeByDay.map((x) => ({
    t: x.t,
    byProject: x.byProject.map((bp) => ({ ...bp })),
  }));
  const tpMinutes = tpTimeByDay.reduce((s, d) => s + d.byProject.reduce((ss, b) => ss + b.minutes, 0), 0);
  const tpTasks = tpTimeByDay.reduce((s, d) => s + d.byProject.reduce((ss, b) => ss + b.tasksCompleted, 0), 0);
  const tpAssigned = tpTasks + Math.round(rnd() * 20);

  return {
    periodDays: days,
    users,
    dashboards,
    projects,
    summary: {
      totalUsers: users.length,
      activeDistinctUserIds: activeDistinct,
      idleDistinctUserIds: idleDistinct,
      mostVisitedDashboardKey: mostVisitedDashboardKey,
      mostVisitedUsers,
      totalTasksCompleted,
      tasksByUser,
      avgSessionsPerUser,
      sessionsByUser,
      topPerformerId,
      topPerformer: {
        timeMinutes: tpMinutes,
        tasksCompleted: tpTasks,
        tasksAssigned: tpAssigned,
        projects: projects.map((p) => ({
          projectId: p.id,
          minutes: Math.max(30, Math.round(rnd() * (tpMinutes / projects.length))),
          tasksCompleted: Math.max(0, Math.round(rnd() * 12)),
          tasksPending: Math.max(0, Math.round(rnd() * 10)),
        })),
      },
    },
    trends: {
      activeDaily,
      idleDaily,
      usersTimeDaily,
      tasksCompletedDaily,
      sessionsDaily,
      topPerformerDaily: {
        time: tpTimeByDay,
        tasks: tpTasksByDay,
      },
    },
  };
}

