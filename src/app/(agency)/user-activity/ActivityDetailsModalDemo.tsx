"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========================================================================================
 * TOKENS — aligned with Team & Roles panel (Inter font, brand, borders, chips)
 * ====================================================================================== */
const TOKENS = {
  brand: "#1090D0",
  brandPastel: "#E7F4FB",
  text: "#1F2937",
  muted: "#6B7280",
  surface: "#FFFFFF",
  panel: "#FAFAFB",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  good: "#28C76F",
  warn: "#FF9F43",
  critical: "#EA5455",
} as const;

/* ========================================================================================
 * BRANDED ICONS (inline SVG, no emojis) — dashboards, roles, actions, fields
 * ====================================================================================== */
type IconName =
  | "shield"
  | "info"
  | "lock"
  | "dots"
  | "x"
  | "arrow-left"
  | "arrow-right"
  | "chevron-down"
  | "external"
  | "download"
  | "copy"
  | "filter"
  | "calendar"
  | "clock"
  | "user"
  | "users"
  | "globe"
  | "doc"
  | "role-admin"
  | "role-editor"
  | "role-viewer"
  | "dash-seo"
  | "dash-content"
  | "dash-taskboard"
  | "dash-reporting"
  | "perm-view"
  | "perm-create"
  | "perm-edit"
  | "perm-delete"
  | "perm-manage"
  | "perm-export"
  | "perm-share"
  | "perm-assign"
  | "perm-comment";

const WrIcon: React.FC<{ name: IconName; size?: number; className?: string; title?: string }> = ({
  name,
  size = 18,
  className,
  title,
}) => {
  const s = "stroke-current";
  const common = { className, "aria-label": title } as any;
  switch (name) {
    case "shield":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "info":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="10" />
          <path className={s} fill="none" strokeWidth="1.8" d="M12 8h.01M11 12h1v4h1" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <rect className={s} fill="none" strokeWidth="1.8" x="5" y="11" width="14" height="10" rx="2" />
          <path className={s} fill="none" strokeWidth="1.8" d="M7 11V8a5 5 0 1 1 10 0v3" />
        </svg>
      );
    case "dots":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle cx="6" cy="12" r="1.75" className={s} fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.75" className={s} fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.75" className={s} fill="currentColor" stroke="none" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M15 18 9 12l6-6" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="m9 6 6 6-6 6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="m6 9 6 6 6-6" />
        </svg>
      );
    case "external":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M14 3h7v7" />
          <path className={s} fill="none" strokeWidth="1.8" d="M10 14 21 3" />
          <path className={s} fill="none" strokeWidth="1.8" d="M21 14v6a1 1 0 0 1-1 1h-16a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
        </svg>
      );
    case "download":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M12 3v12" />
          <path className={s} fill="none" strokeWidth="1.8" d="m7 10 5 5 5-5" />
          <path className={s} fill="none" strokeWidth="1.8" d="M5 21h14" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <rect className={s} fill="none" strokeWidth="1.8" x="9" y="9" width="11" height="11" rx="2" />
          <rect className={s} fill="none" strokeWidth="1.8" x="4" y="4" width="11" height="11" rx="2" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <rect className={s} fill="none" strokeWidth="1.8" x="3" y="4" width="18" height="18" rx="2" />
          <path className={s} fill="none" strokeWidth="1.8" d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="10" />
          <path className={s} fill="none" strokeWidth="1.8" d="M12 6v6l4 2" />
        </svg>
      );
    case "user":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="7" r="4" />
          <path className={s} fill="none" strokeWidth="1.8" d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "users":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="8" cy="8" r="3.5" />
          <path className={s} fill="none" strokeWidth="1.8" d="M2.5 20a5.5 5.5 0 0 1 11 0" />
          <circle className={s} fill="none" strokeWidth="1.8" cx="17" cy="8" r="3" />
          <path className={s} fill="none" strokeWidth="1.8" d="M14 20a5 5 0 0 1 8 0" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="10" />
          <path className={s} fill="none" strokeWidth="1.8" d="M2 12h20M12 2c3.5 3.5 3.5 16.5 0 20M12 2C8.5 5.5 8.5 18.5 12 22" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path className={s} fill="none" strokeWidth="1.8" d="M14 3v6h6" />
        </svg>
      );
    case "role-admin":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M12 21s8-4 8-10V6l-8-3-8 3v5c0 6 8 10 8 10z" />
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="11" r="2" />
        </svg>
      );
    case "role-editor":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M12 19l-3 1 1-3 7-7 2 2-7 7zM18 7l2-2 1 1-2 2-1-1z" />
        </svg>
      );
    case "role-viewer":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M2 12s4.5-6 10-6 10 6 10 6-4.5 6-10 6-10-6-10-6z" />
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="2.8" />
        </svg>
      );
    case "dash-seo":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="11" cy="11" r="5" />
          <path className={s} fill="none" strokeWidth="1.8" d="M21 21l-4.2-4.2M11 6v2M11 14v2M6 11h2M14 11h2" />
        </svg>
      );
    case "dash-content":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M6 3h9l3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
          <path className={s} fill="none" strokeWidth="1.8" d="M9 9h6M9 13h6M9 17h4" />
        </svg>
      );
    case "dash-taskboard":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <rect className={s} fill="none" strokeWidth="1.8" x="4" y="5" width="4" height="14" rx="1" />
          <rect className={s} fill="none" strokeWidth="1.8" x="10" y="5" width="4" height="10" rx="1" />
          <rect className={s} fill="none" strokeWidth="1.8" x="16" y="5" width="4" height="6" rx="1" />
        </svg>
      );
    case "dash-reporting":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M3 20h18M4 20V10M10 20V6M16 20v-8M4 12l6-4 6 3 5-4" />
        </svg>
      );
    case "perm-view":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="3" />
        </svg>
      );
    case "perm-create":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24"><path className={s} fill="none" strokeWidth="1.8" d="M12 5v14M5 12h14" /></svg>
      );
    case "perm-edit":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24"><path className={s} fill="none" strokeWidth="1.8" d="M12 20h9" /><path className={s} fill="none" strokeWidth="1.8" d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
      );
    case "perm-delete":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24"><path className={s} fill="none" strokeWidth="1.8" d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6" /></svg>
      );
    case "perm-manage":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24"><circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="3" /><path className={s} fill="none" strokeWidth="1.8" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-1.7 3- .2-.1a1.7 1.7 0 0 0-1.9 0l-.2.1-1.7-1 .1-.2a1.7 1.7 0 0 0 0-1.9l-.1-.2 1-1.7.2.1a1.7 1.7 0 0 0 1.9 0l.2-.1 1.7 1z" /></svg>
      );
    case "perm-export":
      return <WrIcon name="download" size={size} className={className} title={title} />;
    case "perm-share":
      return <WrIcon name="external" size={size} className={className} title={title} />;
    case "perm-assign":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24"><circle className={s} fill="none" strokeWidth="1.8" cx="9" cy="7" r="4" /><path className={s} fill="none" strokeWidth="1.8" d="M2 21a7 7 0 0 1 14 0" /><path className={s} fill="none" strokeWidth="1.8" d="M17 8h5M19.5 5.5v5" /></svg>
      );
    case "perm-comment":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24"><path className={s} fill="none" strokeWidth="1.8" d="M21 15a4 4 0 0 1-4 4H8l-5 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
      );
  }
};

/* ========================================================================================
 * TYPES
 * ====================================================================================== */
type DashboardKey = "seo" | "content" | "reporting" | "taskboard";
type RoleLevel = "viewer" | "editor" | "admin";

type PreviewLikeFeature = {
  key: string;
  label: string;
  allowed: boolean;
  locked?: boolean;
  reason?: string;
};

type Actor = { id: string; name: string; email?: string; avatar?: string; role?: RoleLevel };
type Obj = { type: string; id: string; name?: string; url?: string; deleted?: boolean };
type ProjectT = { id: string; name: string } | null;

type Tech = {
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  referrer?: string;
  device?: { label?: string; model?: string };
  os?: string;
  browser?: string;
  viewport?: string;
  clientTz?: string;
  locale?: string;
  asn?: string;
  isp?: string;
  networkType?: string;
  authContext?: string;
  impersonatedBy?: string;
  sessionStartedAt?: string;
  isFirstEvent?: boolean;
  risk?: { score?: "Low" | "Medium" | "High" };
  idp?: string;
  permsHash?: string;
};

type Pii = { ip?: string; xff?: string[]; ua?: string; geo?: string; session_id?: string };

type EventT = {
  id: string;
  ts: string;
  actor: Actor | null;
  action: string;
  category: "auth" | "team" | "tasks" | "content" | "reporting" | "settings" | "access" | "project" | "global";
  project: ProjectT;
  module?: DashboardKey | string;
  object?: Obj | null;
  severity: "info" | "advisory" | "warning" | "risk";
  source?: "ui" | "api" | "automation" | "system";
  summary: string;
  metadata?: any;
  tech?: Tech;
  pii?: Pii;
};

type PiiPolicy = {
  show_ip?: boolean;
  show_geo?: boolean;
  show_ua?: boolean;
  show_session?: boolean;
  mask_level?: "strict" | "standard";
};

type ScopeChips = { users?: string[]; projects?: string[]; date?: string; tz: string };

/* ========================================================================================
 * HELPERS
 * ====================================================================================== */
const DASHBOARD_LABEL: Record<DashboardKey, string> = {
  seo: "SEO",
  content: "Content",
  taskboard: "TaskBoard",
  reporting: "Reporting",
};
const dashIcon: Record<DashboardKey, IconName> = {
  seo: "dash-seo",
  content: "dash-content",
  taskboard: "dash-taskboard",
  reporting: "dash-reporting",
};
const roleIcon: Record<RoleLevel, IconName> = {
  viewer: "role-viewer",
  editor: "role-editor",
  admin: "role-admin",
};

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function toInitials(name?: string) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}
function fmtDate(iso: string, tz?: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}
function relTime(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const dys = Math.round(h / 24);
  return `${dys}d ago`;
}
function maskIP(ip?: string, level: "strict" | "standard" = "standard") {
  if (!ip) return "—";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return level === "strict"
      ? `${parts[0] || ""}:${parts[1] || ""}:****:****:****:****:****:****`
      : `${parts[0] || ""}:${parts[1] || ""}:${parts[2] || ""}:${parts[3] || ""}:****:****:****:****`;
  }
  const a = ip.split(".");
  if (a.length !== 4) return ip;
  return level === "strict" ? `${a[0]}.**.**.**` : `${a[0]}.${a[1]}.**.**`;
}
function domainFrom(input?: string) {
  if (!input) return "";
  const s = input.trim();
  if (s.includes("://")) {
    try {
      return new URL(s).hostname;
    } catch {
      return s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    }
  }
  return s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}
function faviconFor(domainLike: string) {
  const host = domainFrom(domainLike);
  return `https://icons.duckduckgo.com/ip3/${host}.ico`;
}
function actionFromPermissionKey(key: string): IconName {
  const last = key.split(".").pop() || "";
  if (last.includes("view")) return "perm-view";
  if (last.includes("create")) return "perm-create";
  if (last.includes("edit")) return "perm-edit";
  if (last.includes("delete")) return "perm-delete";
  if (last.includes("manage")) return "perm-manage";
  if (last.includes("export") || last.includes("pdf") || last.includes("xlsx")) return "perm-export";
  if (last.includes("share") || last.includes("link")) return "perm-share";
  if (last.includes("assign")) return "perm-assign";
  if (last.includes("comment")) return "perm-comment";
  return "perm-view";
}

const CATEGORY_ICON: Record<EventT["category"], IconName> = {
  auth: "lock",
  team: "users",
  tasks: "dash-taskboard",
  content: "dash-content",
  reporting: "dash-reporting",
  settings: "shield",
  access: "lock",
  project: "globe",
  global: "shield",
};

const SEVERITY_TONE: Record<EventT["severity"], { color: string; label: string }> = {
  info: { color: TOKENS.muted, label: "Info" },
  advisory: { color: "#3B82F6", label: "Advisory" },
  warning: { color: TOKENS.warn, label: "Warning" },
  risk: { color: TOKENS.critical, label: "Risk" },
};

function humanAction(key?: string) {
  if (!key) return "Event";
  const map: Record<string, string> = {
    "role.changed": "Role Change",
    "tasks.reassigned": "Tasks Reassigned",
    "task.status_changed": "Task Status Changed",
    "content.edited": "Content Edited",
    "report.exported": "Report Exported",
    "invite.sent": "Invite Sent",
    "invite.cancelled": "Invite Cancelled",
    "permission.updated": "Permission Updated",
    "dashboard.entered": "Dashboard Entered",
  };
  return map[key] || key.replace(/\./g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/* ========================================================================================
 * PRIMITIVES — Button / Chip / Avatar / ProjectChip
 * ====================================================================================== */
type BtnVariant = "primary" | "outline" | "subtle" | "ghost" | "danger";
const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md"; leadingIcon?: React.ReactNode }
> = ({ variant = "primary", size = "md", leadingIcon, className, children, style, ...rest }) => {
  const base =
    "inline-flex items-center gap-2 rounded-md border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 disabled:opacity-60 cursor-pointer";
  const sizes = size === "sm" ? "h-8 px-2.5" : "h-9 px-3";
  let sx: React.CSSProperties = {};
  if (variant === "primary") sx = { background: TOKENS.brand, color: "#fff", borderColor: "transparent" };
  if (variant === "outline") sx = { background: "#fff", color: TOKENS.text, borderColor: TOKENS.borderStrong };
  if (variant === "subtle") sx = { background: TOKENS.brandPastel, color: TOKENS.text, borderColor: TOKENS.borderStrong };
  if (variant === "ghost") sx = { background: "transparent", color: TOKENS.text, borderColor: "transparent" };
  if (variant === "danger") sx = { background: TOKENS.critical, color: "#fff", borderColor: "transparent" };
  return (
    <button
      {...rest}
      className={classNames(base, sizes, className)}
      style={{ ...sx, ...style, fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      {leadingIcon ? <span aria-hidden>{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  );
};

const Chip: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className, title }) => (
  <span
    title={title}
    className={classNames("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold", className)}
    style={{
      borderColor: TOKENS.borderStrong,
      background: TOKENS.surface,
      color: TOKENS.text,
      fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    }}
  >
    {children}
  </span>
);

const Avatar: React.FC<{ name?: string; src?: string; size?: number }> = ({ name, src, size = 40 }) => (
  <span
    className="inline-flex items-center justify-center overflow-hidden rounded-full border"
    style={{ width: size, height: size, borderColor: TOKENS.borderStrong }}
    title={name}
  >
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name || "avatar"} className="h-full w-full object-cover" />
    ) : (
      <span className="text-[12px] font-bold" style={{ color: TOKENS.brand }}>
        {toInitials(name)}
      </span>
    )}
  </span>
);

const ProjectChip: React.FC<{ name: string }> = ({ name }) => {
  const host = domainFrom(name);
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{ borderColor: TOKENS.borderStrong, background: "#fff", color: TOKENS.text }}
      title={host}
    >
      <span className="relative inline-flex h-4 w-4 overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={faviconFor(host)} className="h-4 w-4" />
      </span>
      <span className="truncate max-w-[200px]">{name}</span>
    </span>
  );
};

/* ========================================================================================
 * FIELD ICONS for Event Details table
 * ====================================================================================== */
function fieldIcon(field: string): IconName {
  const f = field.toLowerCase();
  if (f.includes("role")) return "role-editor";
  if (f.includes("permission")) return "perm-manage";
  if (f.includes("dashboard")) return "dash-seo";
  return "info";
}
function valueIconFor(field: string, value?: string): IconName | null {
  if (!value) return null;
  const f = field.toLowerCase();
  if (f.includes("role")) {
    const v = value.toLowerCase() as RoleLevel;
    if (v in roleIcon) return roleIcon[v as RoleLevel];
    return "role-viewer";
  }
  if (f.includes("dashboard")) {
    const d = value.toLowerCase() as DashboardKey;
    if (d in dashIcon) return dashIcon[d];
    return "globe";
  }
  if (f.includes("permission")) {
    return actionFromPermissionKey(value);
  }
  return null;
}

/* ========================================================================================
 * MODAL: Activity Details
 * ====================================================================================== */
export interface ActivityDetailsModalProps {
  open: boolean;
  event: EventT | null;
  tz: string;
  scope: ScopeChips;
  piiPolicy: PiiPolicy;
  onClose: () => void;
  onViewSimilar?: (by: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  open,
  event: e,
  tz,
  scope,
  piiPolicy,
  onClose,
  onViewSimilar = () => {},
  onPrev,
  onNext,
}) => {
  // always call hooks before conditional return
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
      if (ev.key === "ArrowLeft") onPrev?.();
      if (ev.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext]);

  if (!open || !e) return null;

  const sev = SEVERITY_TONE[e.severity];
  const severityChip = (
    <Chip>
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: sev.color }} />
      {sev.label}
    </Chip>
  );

  const isSystem = e.source === "system" || e.actor?.email === "system@wranker";
  const catIcon = CATEGORY_ICON[e.category];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[999] bg-black/50 cursor-pointer" onClick={onClose} />

      {/* Modal Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-[1000] w-[min(900px,96vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-white shadow-xl"
        style={{
          borderColor: TOKENS.border,
          fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: TOKENS.borderStrong, background: TOKENS.brandPastel }}>
              <WrIcon name={catIcon} className="text-[#1090D0]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[15px] font-bold" style={{ color: TOKENS.text }}>
                <span className="truncate">Activity — {humanAction(e.action)}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: TOKENS.muted }}>
                <span className="inline-flex items-center gap-1">
                  <WrIcon name="calendar" size={14} /> {fmtDate(e.ts, tz)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <WrIcon name="clock" size={14} /> {relTime(e.ts)}
                </span>
                {severityChip}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onPrev && (
              <Button variant="ghost" size="sm" onClick={onPrev} aria-label="Previous">
                <WrIcon name="arrow-left" />
              </Button>
            )}
            {onNext && (
              <Button variant="ghost" size="sm" onClick={onNext} aria-label="Next">
                <WrIcon name="arrow-right" />
              </Button>
            )}
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)} aria-label="More">
                <WrIcon name="dots" />
              </Button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg border bg-white p-2 shadow-xl"
                  style={{ borderColor: TOKENS.border }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <button
                    className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(e.id);
                      setToast("Event ID copied");
                      setMenuOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <WrIcon name="copy" /> Copy Event ID
                    </span>
                  </button>
                  <button
                    className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${location.origin}${location.pathname}?logId=${e.id}`);
                      setToast("Share link copied");
                      setMenuOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <WrIcon name="external" /> Copy Share Link
                    </span>
                  </button>
                  <button
                    className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]"
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify(e, null, 2));
                      setToast("JSON copied");
                      setMenuOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <WrIcon name="doc" /> Copy JSON
                    </span>
                  </button>
                </div>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={onClose} aria-label="Close">
              <WrIcon name="x" /> Close
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          {/* Summary Card */}
          <section className="rounded-lg border bg-white p-4" style={{ borderColor: TOKENS.border }}>
            <div className="mb-3 flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
              <WrIcon name="info" className="text-[#1090D0]" /> Event Summary
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Performed By */}
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-xs font-semibold" style={{ color: TOKENS.muted }}>
                  Performed By
                </div>
                <div className="mt-2 flex items-center gap-3">
                  {isSystem ? (
                    <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: TOKENS.borderStrong }}>
                      <WrIcon name="shield" /> System
                    </span>
                  ) : (
                    <>
                      <Avatar name={e.actor?.name} src={e.actor?.avatar} />
                      <div className="min-w-0">
                        <div className="truncate text-sm" style={{ color: TOKENS.text }}>
                          {e.actor?.name || "—"}
                        </div>
                        <div className="truncate text-xs" style={{ color: TOKENS.muted }}>
                          {e.actor?.email || "—"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Project */}
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-xs font-semibold" style={{ color: TOKENS.muted }}>
                  Project
                </div>
                <div className="mt-2">
                  {e.project?.name ? <ProjectChip name={e.project.name} /> : <span className="text-sm" style={{ color: TOKENS.muted }}>—</span>}
                </div>
              </div>

              {/* Module */}
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-xs font-semibold" style={{ color: TOKENS.muted }}>
                  Module / Area
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Chip>
                    <WrIcon
                      name={dashIcon[(e.module as DashboardKey) || "seo"] || "info"}
                      className="text-[#1090D0]"
                      size={14}
                    />
                    {(e.module || "General").toString().toUpperCase()}
                  </Chip>
                </div>
              </div>

              {/* Object */}
              <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                <div className="text-xs font-semibold" style={{ color: TOKENS.muted }}>
                  Object
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" style={{ color: TOKENS.text }}>
                  <WrIcon name="doc" />
                  {e.object?.name ? (
                    e.object.url && !e.object.deleted ? (
                      <button
                        className="underline decoration-dotted underline-offset-2 text-left cursor-pointer"
                        style={{ color: TOKENS.brand }}
                        onClick={() => window.open(e.object!.url!, "_blank")}
                      >
                        {e.object.name}
                      </button>
                    ) : (
                      <span>
                        {e.object.name}
                        {e.object?.deleted ? " (no longer available)" : ""}
                      </span>
                    )
                  ) : (
                    <span className="text-sm" style={{ color: TOKENS.muted }}>
                      —
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs" style={{ color: TOKENS.muted }}>
                  ID: {e.object?.id || "—"}
                </div>
              </div>
            </div>

            {/* Scope Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {scope.users?.length ? (
                <Chip>
                  <WrIcon name="user" size={14} /> {scope.users.slice(0, 3).join(", ")}
                  {scope.users.length > 3 ? ` +${scope.users.length - 3} more` : ""}
                </Chip>
              ) : null}
              {scope.projects?.length ? (
                <Chip>
                  <WrIcon name="globe" size={14} /> {scope.projects.slice(0, 3).join(", ")}
                  {scope.projects.length > 3 ? ` +${scope.projects.length - 3} more` : ""}
                </Chip>
              ) : null}
              {scope.date ? (
                <Chip>
                  <WrIcon name="calendar" size={14} /> {scope.date}
                </Chip>
              ) : null}
              <Chip>
                <WrIcon name="clock" size={14} /> TZ: {scope.tz}
              </Chip>
              <Chip title="Event source">
                <WrIcon name="info" size={14} /> {(e.source || "ui").toUpperCase()}
              </Chip>
              <Chip title="Event ID">
                <WrIcon name="doc" size={14} /> {e.id}
                <button
                  className="ml-1 cursor-pointer underline decoration-dotted underline-offset-2 text-[11px]"
                  style={{ color: TOKENS.muted }}
                  onClick={async () => {
                    await navigator.clipboard.writeText(e.id);
                    setToast("Event ID copied");
                  }}
                >
                  Copy
                </button>
              </Chip>
            </div>
          </section>

          {/* Event Details */}
          <DetailsSection e={e} />
          {/* Technical Metadata */}
          <TechSection e={e} policy={piiPolicy} onCopy={(t) => (navigator.clipboard.writeText(t), setToast("JSON copied"))} />
        </div>

        {/* Footer */}
        <FooterBar e={e} policy={piiPolicy} onClose={onClose} onViewSimilar={onViewSimilar} setToast={setToast} />
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed left-1/2 bottom-4 z-[1001] -translate-x-1/2 rounded-md bg-[#111827] px-3 py-2 text-xs text-white shadow">
          {toast}
        </div>
      ) : null}
    </>
  );
};

/* ========================================================================================
 * Details (diffs, facts) — with branded icons for Field / Before / After
 * ====================================================================================== */
type DiffRow = { field: string; before?: string | string[]; after?: string | string[]; type: "added" | "removed" | "changed" };

const DetailsSection: React.FC<{ e: EventT }> = ({ e }) => {
  const headline = useMemo(() => {
    const m = e.metadata || {};
    switch (e.action) {
      case "role.changed":
        return `Changed role for ${m?.targetUser?.name || "user"} from ${titleRole(m.from)} → ${titleRole(m.to)} on ${(m.dashboard || e.module || "Dashboard").toString().toUpperCase()}.`;
      case "report.exported":
        return `Exported ${m.reportName || "report"} (${m.format || "file"}) from Reporting.`;
      case "tasks.reassigned":
        return `Reassigned ${m.count} tasks from ${m.fromUser} to ${m.toUser}${m.projects ? ` in ${m.projects.join(", ")}` : ""}.`;
      default:
        return e.summary || "Activity";
    }
  }, [e]);

  const rows = useMemo<DiffRow[]>(() => {
    const m = e.metadata || {};
    switch (e.action) {
      case "role.changed":
        return [
          { field: "Role", before: titleRole(m.from), after: titleRole(m.to), type: "changed" },
          (m.permissionsAdded?.length || m.permissionsRemoved?.length) && {
            field: "Permissions",
            before: (m.permissionsRemoved || []) as string[],
            after: (m.permissionsAdded || []) as string[],
            type: "changed",
          },
          m.dashboard && { field: "Dashboard", before: "—", after: String(m.dashboard).toLowerCase(), type: "added" },
        ].filter(Boolean) as DiffRow[];
      case "report.exported":
        return [{ field: "Export", before: "—", after: `${m.format || "file"} (${m.range || "current"})`, type: "added" }];
      default:
        return [];
    }
  }, [e]);

  const addedCnt = rows.filter((r) => r.type === "added").length;
  const removedCnt = rows.filter((r) => r.type === "removed").length;
  const changedCnt = rows.filter((r) => r.type === "changed").length;

  return (
    <section className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: TOKENS.border }}>
      <div className="mb-3 flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
        <WrIcon name="doc" className="text-[#1090D0]" /> Event Details
      </div>

      <div className="mb-2 text-sm font-medium" style={{ color: TOKENS.text }}>
        {headline}
      </div>

      {rows.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          <Chip className="text-[11px]" title="Added">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.good }} /> Added {addedCnt}
          </Chip>
          <Chip className="text-[11px]" title="Removed">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.critical }} /> Removed {removedCnt}
          </Chip>
          <Chip className="text-[11px]" title="Changed">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.warn }} /> Changed {changedCnt}
          </Chip>
        </div>
      ) : (
        <div className="text-sm" style={{ color: TOKENS.muted }}>
          No field‑level differences reported.
        </div>
      )}

      {rows.length ? (
        <div className="mt-2 overflow-x-auto rounded-md border" style={{ borderColor: TOKENS.border }}>
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#FAFAFB]">
              <tr>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                  Field
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                  Before
                </th>
                <th className="border-b px-3 py-2 text-left text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="align-top">
                  {/* Field */}
                  <td className="border-b px-3 py-2 font-medium" style={{ borderColor: TOKENS.border, color: TOKENS.text }}>
                    <span className="inline-flex items-center gap-2">
                      <WrIcon name={fieldIcon(r.field)} className="text-[#1090D0]" size={16} />
                      {r.field}
                    </span>
                  </td>
                  {/* Before */}
                  <td className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                    <ValueCell field={r.field} value={r.before} tone={r.type === "removed" ? "danger" : "muted"} />
                  </td>
                  {/* After */}
                  <td className="border-b px-3 py-2" style={{ borderColor: TOKENS.border }}>
                    <ValueCell field={r.field} value={r.after} tone={r.type === "added" ? "good" : "default"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Facts */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Fact label="Affected User">
          {e.metadata?.targetUser?.name ? (
            <span className="inline-flex items-center gap-2">
              <WrIcon name="user" /> {e.metadata.targetUser.name} <span className="text-xs" style={{ color: TOKENS.muted }}>
                ({e.metadata.targetUser.email || "—"})
              </span>
            </span>
          ) : (
            <span style={{ color: TOKENS.muted }}>—</span>
          )}
        </Fact>
        <Fact label="Path">{e.metadata?.affectedPath || <span style={{ color: TOKENS.muted }}>—</span>}</Fact>
        {e.metadata?.message ? (
          <div className="sm:col-span-2 rounded-md border bg-[#F5F7FA] p-3 text-sm" style={{ borderColor: TOKENS.border }}>
            <span className="inline-flex items-center gap-2">
              <WrIcon name="info" /> {e.metadata.message}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
    <div className="text-xs font-semibold" style={{ color: TOKENS.muted }}>
      {label}
    </div>
    <div className="mt-1 text-sm" style={{ color: TOKENS.text }}>
      {children}
    </div>
  </div>
);

const ValueCell: React.FC<{ field: string; value?: string | string[]; tone?: "default" | "good" | "danger" | "muted" }> = ({
  field,
  value,
  tone = "default",
}) => {
  const base =
    tone === "good" ? { color: TOKENS.good, fontWeight: 600 } : tone === "danger" ? { color: TOKENS.critical } : tone === "muted" ? { color: TOKENS.muted } : { color: TOKENS.text };
  if (!value || (Array.isArray(value) && value.length === 0)) return <span style={base}>—</span>;

  if (Array.isArray(value)) {
    // Show permission chips
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((k) => (
          <Chip key={k} title={k}>
            <WrIcon name={actionFromPermissionKey(k)} className="text-[#1090D0]" size={12} /> {k.split(".")[1] || k}
          </Chip>
        ))}
      </div>
    );
  }

  const icon = valueIconFor(field, value);
  return (
    <span className="inline-flex items-center gap-2" style={base}>
      {icon ? <WrIcon name={icon} className="text-[#1090D0]" size={14} /> : null}
      {value}
    </span>
  );
};

function titleRole(s?: string) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ========================================================================================
 * Technical Metadata
 * ====================================================================================== */
const TechSection: React.FC<{ e: EventT; policy: PiiPolicy; onCopy: (s: string) => void }> = ({ e, policy, onCopy }) => {
  const [open, setOpen] = useState(false);
  const can = {
    ip: !!policy.show_ip,
    geo: !!policy.show_geo,
    ua: !!policy.show_ua,
    sess: !!policy.show_session,
  };
  const level = policy.mask_level || "standard";
  const tech = e.tech || {};
  const pii = e.pii || {};
  const visibleJSON = JSON.stringify(
    {
      tech,
      pii: {
        ...(can.ip ? { ip: maskIP(pii.ip, level) } : {}),
        ...(can.geo && pii.geo ? { geo: pii.geo } : {}),
        ...(can.ua && pii.ua ? { ua: pii.ua } : {}),
        ...(can.sess && pii.session_id ? { session_id: pii.session_id } : {}),
        ...(pii.xff ? { xff: pii.xff.map((x) => maskIP(x, level)) } : {}),
      },
    },
    null,
    2
  );

  return (
    <section className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: TOKENS.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
          <WrIcon name="info" className="text-[#1090D0]" /> Technical Metadata
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onCopy(visibleJSON)} leadingIcon={<WrIcon name="copy" />}>
            Copy JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} leadingIcon={<WrIcon name="chevron-down" />}>
            {open ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="grid gap-3 md:grid-cols-2">
          <TechCard title="Request">
            <KV k="Source" v={(e.source || "—").toUpperCase()} />
            <KV k="Route" v={tech.route || "—"} />
            <KV k="Method" v={tech.method || "—"} />
            <KV k="Status / Duration" v={tech.status ? `${tech.status} · ${tech.durationMs ?? "—"}ms` : "—"} />
            <KV k="Request ID" v={tech.requestId || "—"} copy />
            {(tech.traceId || tech.spanId) && <KV k="Trace / Span" v={`${tech.traceId || "—"} · ${tech.spanId || "—"}`} copy />}
          </TechCard>

          <TechCard title="Client">
            <KV k="Device" v={[tech.device?.label, tech.device?.model].filter(Boolean).join(" ") || "—"} />
            <KV k="OS" v={tech.os || "—"} />
            <KV k="Browser" v={tech.browser || "—"} />
            <KV k="Viewport" v={tech.viewport || "—"} />
            <KV k="Client TZ" v={tech.clientTz || "—"} />
            <KV k="Locale" v={tech.locale || "—"} />
            <KV k="User Agent" v={can.ua ? e.pii?.ua || "—" : "Hidden by policy"} />
          </TechCard>

          <TechCard title="Network">
            <KV k="IP" v={can.ip ? maskIP(pii.ip, level) : "Hidden by policy"} copy={!!(can.ip && pii.ip)} />
            <KV
              k="Forwarded For"
              v={
                pii.xff && pii.xff.length > 0
                  ? `${maskIP(pii.xff[0], level)} → ${maskIP(pii.xff[pii.xff.length - 1], level)}${
                      pii.xff.length > 2 ? ` (+${pii.xff.length - 2})` : ""
                    }`
                  : "—"
              }
            />
            <KV k="ASN / ISP" v={tech.asn && tech.isp ? `${tech.asn} · ${tech.isp}` : "—"} />
            <KV k="Geo" v={can.geo ? pii.geo || "—" : "Hidden by policy"} />
            <KV k="Network" v={tech.networkType || "—"} />
          </TechCard>

          <TechCard title="Session">
            <KV k="Session ID" v={can.sess ? pii.session_id || "—" : "Hidden by policy"} copy={!!(can.sess && pii.session_id)} />
            <KV k="Auth" v={tech.authContext || "—"} />
            {tech.sessionStartedAt && <KV k="Login Time" v={fmtDate(tech.sessionStartedAt, e.tech?.clientTz)} />}
            <KV k="First Event" v={typeof tech.isFirstEvent === "boolean" ? (tech.isFirstEvent ? "Yes" : "No") : "—"} />
          </TechCard>
        </div>
      )}
    </section>
  );
};

const TechCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-md border" style={{ borderColor: TOKENS.border }}>
    <div className="border-b px-3 py-2 text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
      {title}
    </div>
    <div className="grid grid-cols-[160px,1fr] items-start gap-x-3 gap-y-2 p-3">{children}</div>
  </div>
);

const KV: React.FC<{ k: string; v: string; copy?: boolean }> = ({ k, v, copy }) => (
  <>
    <div className="text-xs" style={{ color: TOKENS.muted }}>
      {k}
    </div>
    <div className="flex items-center gap-2 text-sm" style={{ color: TOKENS.text }}>
      <span className="truncate">{v}</span>
      {copy ? (
        <button
          className="cursor-pointer rounded border px-2 py-0.5 text-[11px]"
          style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
          onClick={async () => {
            await navigator.clipboard.writeText(v);
          }}
        >
          Copy
        </button>
      ) : null}
    </div>
  </>
);

/* ========================================================================================
 * Footer Actions — modular buttons, icons, toggle, pointer cursors
 * ====================================================================================== */
const FooterBar: React.FC<{
  e: EventT;
  policy: PiiPolicy;
  onClose: () => void;
  onViewSimilar: (by: string) => void;
  setToast: (m: string) => void;
}> = ({ e, policy, onClose, onViewSimilar, setToast }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [includeTech, setIncludeTech] = useState(false);

  const items = [
    { k: "type", label: "By Event Type", show: true },
    { k: "actor", label: "By Actor", show: !!e.actor?.id },
    { k: "target", label: "By Affected User", show: !!e.metadata?.targetUser?.id },
    { k: "project", label: "By Project", show: !!e.project?.id },
    { k: "object", label: "By Object", show: !!e.object?.id },
    { k: "session", label: "By Session", show: !!policy.show_session && !!e.pii?.session_id },
    { k: "ip", label: "By IP", show: !!policy.show_ip && !!e.pii?.ip },
  ].filter((x) => x.show);

  const exportCSV = () => {
    const head = [
      "id",
      "timestamp",
      "actor",
      "action",
      "category",
      "project",
      "module",
      "objectType",
      "objectId",
      "objectName",
      "severity",
      "source",
      "summary",
    ];
    const row = [
      e.id,
      e.ts,
      e.actor?.email || e.actor?.name || "system",
      e.action,
      e.category,
      e.project?.name || "",
      e.module || "",
      e.object?.type || "",
      e.object?.id || "",
      e.object?.name || "",
      e.severity,
      e.source || "",
      e.summary || "",
    ];
    let csv = head.join(",") + "\n" + row.map((x) => JSON.stringify(String(x ?? ""))).join(",") + "\n";
    if (includeTech) {
      csv += "\nTECH/PII\n" + JSON.stringify({ tech: e.tech || {}, pii: e.pii || {} }, null, 2);
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `audit-event-${e.id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setToast("Exported");
  };

  return (
    <div className="flex items-center gap-2 border-t bg-white px-4 py-3" style={{ borderColor: TOKENS.border }}>
      {/* View Similar */}
      <div className="relative">
        <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)} leadingIcon={<WrIcon name="filter" />}>
          View Similar
        </Button>
        {menuOpen && (
          <div className="absolute left-0 top-10 z-10 w-56 rounded-lg border bg-white p-2 shadow-xl" style={{ borderColor: TOKENS.border }}>
            <div className="px-2 pb-1 text-xs" style={{ color: TOKENS.muted }}>
              Find more like this
            </div>
            {items.map((it) => (
              <button
                key={it.k}
                className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]"
                onClick={() => {
                  setMenuOpen(false);
                  onViewSimilar(it.k);
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={exportCSV} leadingIcon={<WrIcon name="download" />}>
          Export Entry
        </Button>
        <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
          <input
            type="checkbox"
            className="cursor-pointer"
            checked={includeTech}
            onChange={(e) => setIncludeTech(e.currentTarget.checked)}
          />
          Include technical metadata
        </label>
      </div>

      {/* Open Object */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => e.object?.url && window.open(e.object.url, "_blank")}
        disabled={!e.object?.url || !!e.object?.deleted}
        leadingIcon={<WrIcon name="external" />}
      >
        Open {e.object?.type ? e.object.type[0].toUpperCase() + e.object.type.slice(1) : "Object"}
      </Button>

      <div className="ml-auto">
        <Button variant="primary" size="sm" onClick={onClose} leadingIcon={<WrIcon name="x" />}>
          Close
        </Button>
      </div>
    </div>
  );
};

/* ========================================================================================
 * DEMO (drop‑in)
 * ====================================================================================== */
const DEMO_EVENT: EventT = {
  id: "evt_0189XY",
  ts: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  actor: { id: "u_12", name: "John Smith", email: "john@agency.com", role: "admin", avatar: "" },
  action: "role.changed",
  category: "team",
  project: { id: "p2", name: "app.w3era.com" },
  module: "seo",
  object: { type: "role", id: "r_77", name: "Editor – Content", url: "#" },
  severity: "advisory",
  source: "ui",
  summary: "Changed role for Sara from Viewer → Editor on SEO Dashboard",
  metadata: {
    targetUser: { id: "u_77", name: "Sara Mehta", email: "sara@agency.com" },
    from: "viewer",
    to: "editor",
    dashboard: "seo",
    permissionsAdded: ["seo.rank_tracker.manage", "seo.link_analyzer.view"],
    permissionsRemoved: ["seo.site_audit.tasks.create"],
    affectedPath: "Team & Roles → SEO Dashboard Access",
    message: "This change was part of a bulk action affecting 3 users.",
  },
  tech: {
    route: "/settings/team/activity-log",
    method: "GET",
    status: 200,
    durationMs: 184,
    requestId: "req_8Gx7aK",
    traceId: "tr_3fa9",
    spanId: "sp_1cd2",
    referrer: "https://app.wranker.com/dashboard",
    device: { label: "Desktop", model: "MacBookPro" },
    os: "macOS 14.5",
    browser: "Chrome 125",
    viewport: "1440×900 @2x",
    clientTz: "Asia/Kolkata",
    locale: "en-IN",
    asn: "AS13335",
    isp: "Cloudflare, Inc.",
    networkType: "Corp",
    authContext: "Password + 2FA",
    sessionStartedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    isFirstEvent: false,
    risk: { score: "Low" },
    idp: "Okta",
    permsHash: "7c2a…",
  },
  pii: {
    ip: "106.75.12.132",
    xff: ["10.12.3.4", "106.75.12.132"],
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    geo: "India · Rajasthan · Jaipur",
    session_id: "S123-9afc",
  },
};

export default function ActivityDetailsModalDemo({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);
  const events: EventT[] = [
    DEMO_EVENT,
    {
      ...DEMO_EVENT,
      id: "evt_0190AB",
      action: "report.exported",
      category: "reporting",
      severity: "info",
      summary: "Exported Monthly Audit Report (PDF) from Reporting",
      module: "reporting",
      metadata: { reportName: "Monthly Audit Report", format: "PDF", range: "last 30 days" },
    },
  ];

  return (
    <>
{ /*   <div
      className="p-6"
      style={{ fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold" style={{ color: TOKENS.text }}>
        <WrIcon name="shield" className="text-[#1090D0]" />
        Team & Roles — Activity Details Modal (Demo)
      </h2>
      <p className="mb-3 text-sm" style={{ color: TOKENS.muted }}>
        Branded icons, Inter font, project favicons, modular chips & buttons, and pointer cursors for all interactive elements.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => (setIdx(0), setOpen(true))}>
          Open Example A
        </Button>
        <Button variant="outline" onClick={() => (setIdx(1), setOpen(true))}>
          Open Example B
        </Button>
      </div>

      <ActivityDetailsModal
        open={open}
        event={events[idx]}
        tz="Asia/Kolkata"
        scope={{ users: ["John Smith"], projects: ["app.w3era.com"], date: "Jul 1–30", tz: "IST" }}
        piiPolicy={{ show_ip: true, show_geo: true, show_ua: true, show_session: true, mask_level: "standard" }}
        onClose={() => setOpen(false)}
        onPrev={() => setIdx((i) => (i === 0 ? events.length - 1 : i - 1))}
        onNext={() => setIdx((i) => (i === events.length - 1 ? 0 : i + 1))}
        onViewSimilar={(by) => console.log("Filter by:", by)}
      />
    </div>*/}
    
      <ActivityDetailsModal
        open={open}
        event={events[idx]}
        tz="Asia/Kolkata"
        scope={{ users: ["John Smith"], projects: ["app.w3era.com"], date: "Jul 1–30", tz: "IST" }}
        piiPolicy={{ show_ip: true, show_geo: true, show_ua: true, show_session: true, mask_level: "standard" }}
        onClose={onClose}
        onPrev={() => setIdx((i) => (i === 0 ? events.length - 1 : i - 1))}
        onNext={() => setIdx((i) => (i === events.length - 1 ? 0 : i + 1))}
        onViewSimilar={(by) => console.log("Filter by:", by)}
      />
    </>
  );
}
