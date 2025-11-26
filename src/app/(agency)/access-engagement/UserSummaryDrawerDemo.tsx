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
 * BRANDED ICONS (inline SVG, no emoji) — dashboards, roles, actions, fields
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
  | "bell"
  | "trash"
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
  | "perm-assign";

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
    case "bell":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path className={s} fill="none" strokeWidth="1.8" d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <path className={s} fill="none" strokeWidth="1.8" d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6" />
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
      return <svg {...common} width={size} height={size} viewBox="0 0 24 24"><path className={s} fill="none" strokeWidth="1.8" d="M12 5v14M5 12h14" /></svg>;
    case "perm-edit":
      return <svg {...common} width={size} height={size} viewBox="0 0 24 24"><path className={s} fill="none" strokeWidth="1.8" d="M12 20h9" /><path className={s} fill="none" strokeWidth="1.8" d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>;
    case "perm-delete":
      return <WrIcon name="trash" size={size} className={className} title={title} />;
    case "perm-manage":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="12" cy="12" r="3" />
          <path className={s} fill="none" strokeWidth="1.8" d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-1.7 3-.2-.1a1.7 1.7 0 0 0-1.9 0l-.2.1-1.7-1 .1-.2a1.7 1.7 0 0 0 0-1.9l-.1-.2 1-1.7.2.1a1.7 1.7 0 0 0 1.9 0l.2-.1 1.7 1z" />
        </svg>
      );
    case "perm-export":
      return <WrIcon name="download" size={size} className={className} title={title} />;
    case "perm-share":
      return <WrIcon name="external" size={size} className={className} title={title} />;
    case "perm-assign":
      return (
        <svg {...common} width={size} height={size} viewBox="0 0 24 24">
          <circle className={s} fill="none" strokeWidth="1.8" cx="9" cy="7" r="4" />
          <path className={s} fill="none" strokeWidth="1.8" d="M2 21a7 7 0 0 1 14 0" />
          <path className={s} fill="none" strokeWidth="1.8" d="M17 8h5M19.5 5.5v5" />
        </svg>
      );
  }
};

/* ========================================================================================
 * TYPES
 * ====================================================================================== */
type DashboardKey = "seo" | "content" | "reporting" | "taskboard";
type RoleLevel = "viewer" | "editor" | "admin";
type TLPoint = { t: string; v: number; x?: number };

type UserSummary = {
  user: { id: string; name: string; email?: string; avatar?: string; status: "active" | "inactive" | "pending" | "removed"; last_login_at?: string };
  roles: { by_dashboard: Record<string, RoleLevel | null> };
  metrics: {
    logins: { current: number; prev: number };
    sessions: { current: number; prev: number };
    tasks: { assigned_open: number; completed: number; avg_duration_days: number };
    inactivity_days?: number;
  };
  dashboards: Array<{ key: string; sessions: number; last_access_at: string | null; has_access: boolean; role: RoleLevel | null }>;
  projects: Array<{ id: string; name: string; open_tasks: number; completed_in_range: number; role: string; overdue: number }>;
  suggestions: Array<{ type: "reassign" | "change_role" | "upgrade" | "reminder"; rationale?: string }>;
};

/* ========================================================================================
 * HELPERS
 * ====================================================================================== */
const DASHBOARD_LABEL: Record<DashboardKey, string> = {
  seo: "SEO",
  content: "Content",
  taskboard: "TaskBoard",
  reporting: "Reporting",
};
const dashIcon: Record<string, IconName> = {
  seo: "dash-seo",
  content: "dash-content",
  taskboard: "dash-taskboard",
  campaign: "dash-taskboard",
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
function fmtInt(n?: number) {
  return Number.isFinite(n as number) ? Math.round(n as number).toLocaleString() : "—";
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
function relDays(iso?: string) {
  if (!iso) return "—";
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Math.round((now - t) / 86400000));
  return diff === 0 ? "today" : `${diff}d ago`;
}
function deltaPct(cur?: number, prev?: number) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || !prev) return 0;
  return ((cur! - prev!) / Math.abs(prev!)) * 100;
}

/* ========================================================================================
 * PRIMITIVES — Button / Chip / Avatar / ProjectFavicon / Segmented control
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

const Chip: React.FC<{ children: React.ReactNode; className?: string; title?: string; onClick?: () => void; disabled?: boolean }> = ({
  children,
  className,
  title,
  onClick,
  disabled,
}) => (
  <span
    title={title}
    onClick={onClick}
    className={classNames(
      "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
      onClick ? "cursor-pointer" : "",
      disabled ? "opacity-60" : "",
      className
    )}
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

const Avatar: React.FC<{ name?: string; src?: string; size?: number }> = ({ name, src, size = 44 }) => (
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

const ProjectFavicon: React.FC<{ name: string }> = ({ name }) => {
  const host = domainFrom(name);
  return (
    <span className="inline-flex items-center gap-2" title={host}>
      <span className="relative inline-flex h-4 w-4 overflow-hidden rounded">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={faviconFor(host)} className="h-4 w-4" />
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
};

const Segmented: React.FC<{
  value: string;
  options: Array<{ value: string; label: string; icon?: IconName }>;
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => {
  return (
    <div
      className="inline-flex rounded-md border p-0.5"
      style={{ borderColor: TOKENS.borderStrong, background: "#fff", fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            className={classNames(
              "inline-flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer",
              active ? "" : "hover:bg-[#F5F7FA]"
            )}
            style={{
              background: active ? TOKENS.brandPastel : "transparent",
              color: active ? TOKENS.text : TOKENS.muted,
              border: `1px solid ${active ? TOKENS.borderStrong : "transparent"}`,
              marginRight: 4,
            }}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon ? <WrIcon name={opt.icon} className="text-[#1090D0]" size={14} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

/* ========================================================================================
 * MICRO CHARTS — keep pattern; tooltips updated to branded popover
 * ====================================================================================== */
function Spark({
  series = [],
  h = 56,
  w = 560,
  color = TOKENS.brand,
  fill = "rgba(16,144,208,0.12)",
  onHover,
}: {
  series: TLPoint[];
  h?: number;
  w?: number;
  color?: string;
  fill?: string;
  onHover?: (p: (TLPoint & { x?: number }) | null) => void;
}) {
  const max = Math.max(1, ...series.map((d) => d.v || 0));
  const pts = series.map((d, i) => {
    const x = (i / Math.max(1, series.length - 1)) * (w - 2) + 1;
    const y = h - (d.v / max) * (h - 2) - 1;
    return [x, y, d] as const;
  });
  const path = pts.reduce((a, p, i) => a + (i ? " L " : "M ") + p[0] + " " + p[1], "");
  const area = `${path} L ${w - 1} ${h - 1} L 1 ${h - 1} Z`;
  const last = pts.length ? pts[pts.length - 1] : null;
  return (
    <div className="relative">
      <svg
        width={w}
        height={h}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const rx = e.clientX - rect.left;
          const ix = Math.max(0, Math.min(series.length - 1, Math.round((rx / (w - 2)) * (series.length - 1))));
          onHover?.({ ...series[ix], x: rx });
        }}
        onMouseLeave={() => onHover?.(null)}
        aria-hidden
      >
        <path d={area} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {last && <circle cx={last[0]} cy={last[1]} r="3" fill={color} />}
      </svg>
    </div>
  );
}

function Bars({
  series = [],
  h = 28,
  w = 96,
  color = TOKENS.brand,
  onHover,
}: {
  series: TLPoint[];
  h?: number;
  w?: number;
  color?: string;
  onHover?: (p: (TLPoint & { x?: number }) | null) => void;
}) {
  const max = Math.max(1, ...series.map((d) => d.v || 0));
  const bw = Math.max(2, Math.floor((w - 8) / Math.max(1, series.length)));
  return (
    <svg
      width={w}
      height={h}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ix = Math.max(0, Math.min(series.length - 1, Math.floor(((e.clientX - rect.left) - 4) / bw)));
        onHover?.({ ...series[ix], x: e.clientX - rect.left });
      }}
      onMouseLeave={() => onHover?.(null)}
      aria-hidden
    >
      {series.map((d, i) => {
        const v = d.v ?? 0;
        const barH = Math.max(1, Math.round((v / max) * (h - 4)));
        return (
          <rect
            key={i}
            x={4 + i * bw}
            y={h - barH - 2}
            width={Math.max(1, bw - 2)}
            height={barH}
            rx="2"
            ry="2"
            fill={color}
          />
        );
      })}
    </svg>
  );
}

/* ========================================================================================
 * MiniCard (overview metric) with branded smart popover
 * ====================================================================================== */
const MiniCard: React.FC<{
  card: {
    key: string;
    label: string;
    value?: number;
    valueText?: string;
    delta?: number;
    series: TLPoint[];
    kind: "bars" | "spark";
    tooltip?: string;
  };
}> = ({ card }) => {
  const [tip, setTip] = useState<TLPoint | null>(null);
  const tone = card.delta && card.delta > 0 ? TOKENS.good : card.delta && card.delta < 0 ? TOKENS.critical : TOKENS.muted;

  return (
    <div
      className="rounded-lg border bg-white p-3"
      style={{ borderColor: TOKENS.border, fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
      title={card.tooltip}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[12px] font-semibold" style={{ color: TOKENS.muted }}>
          {card.label}
        </div>
        <div className="text-[12px] font-bold" style={{ color: tone }}>
          {card.delta ? `${card.delta > 0 ? "+" : ""}${card.delta.toFixed(1)}%` : "—"}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[18px] font-extrabold" style={{ color: TOKENS.text }}>
          {card.valueText ?? fmtInt(card.value)}
        </div>
        <div className="relative w-[110px]">
          {card.kind === "bars" ? <Bars series={card.series} onHover={setTip} /> : <Spark series={card.series} h={32} w={110} onHover={setTip} />}
          {tip && (
            <div
              className="absolute -top-2 left-0 z-10 -translate-y-full rounded-md border px-2 py-1 text-[11px] text-[#111827] shadow"
              style={{ borderColor: TOKENS.border, background: "#fff" }}
              role="tooltip"
            >
              <div className="font-bold">{fmtInt(tip.v)}</div>
              <div className="opacity-80">{new Date(tip.t).toLocaleDateString()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ========================================================================================
 * USER SUMMARY DRAWER — drop‑in
 * ====================================================================================== */
export function UserSummaryDrawer({
  open,
  onClose,
  scope = { range: "Jul 1 – Jul 30", projects: ["wranker.com"], dashboards: ["SEO", "Reporting"], tz: "UTC" },
  userId = "u123",
  source = "table",
  onRoute = (dest: string, payload: any) => console.log("navigate:", dest, payload),
}: {
  open: boolean;
  onClose: () => void;
  scope?: { range: string; projects?: string[]; dashboards?: string[]; tz?: string };
  userId?: string;
  source?: string;
  onRoute?: (dest: string, payload?: any) => void;
}) {
  // Keep hooks at top-level (no conditional hooks)
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [metric, setMetric] = useState<"logins" | "sessions" | "task_events">("sessions");
  const [timeline, setTimeline] = useState<{ series: TLPoint[]; prev_series: TLPoint[] }>({ series: [], prev_series: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const [tipTl, setTipTl] = useState<TLPoint | null>(null);

  // Focus trap & esc close
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fetch summary + timeline on open / metric change
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErr(null);
    Promise.all([mockFetchSummary(userId), mockFetchTimeline(userId, metric)])
      .then(([sum, tl]) => {
        setSummary(sum as UserSummary);
        setTimeline(tl);
        setLoading(false);
        console.log("user_summary.open", { user_id: userId, source });
      })
      .catch((e) => {
        setErr(e?.message || "Failed to load");
        setLoading(false);
      });
  }, [open, userId, metric, source]);


    const overviewCards = useMemo(() => {
    if (!summary) return [];
    const m = summary.metrics || ({} as any);
    return [
      {
        key: "logins",
        label: "Total Logins",
        value: m.logins?.current,
        delta: deltaPct(m.logins?.current, m.logins?.prev),
        series: timeline.series,
        kind: "bars" as const,
        tooltip: "Total logins in selected range.",
      },
      {
        key: "sessions",
        label: "Sessions",
        value: m.sessions?.current,
        delta: deltaPct(m.sessions?.current, m.sessions?.prev),
        series: timeline.series,
        kind: "spark" as const,
        tooltip: "Sessions started.",
      },
      {
        key: "tasks_assigned",
        label: "Tasks Assigned",
        value: m.tasks?.assigned_open,
        delta: 0,
        series: mkSeriesMini(10, 8),
        kind: "bars" as const,
        tooltip: "Open & in‑progress tasks assigned.",
      },
      {
        key: "tasks_completed",
        label: "Tasks Completed",
        value: m.tasks?.completed,
        delta: 0,
        series: mkSeriesMini(10, 6),
        kind: "bars" as const,
        tooltip: "Tasks completed in range.",
      },
      {
        key: "avg_duration",
        label: "Avg Task Duration",
        valueText: Number.isFinite(m.tasks?.avg_duration_days) ? `${m.tasks.avg_duration_days.toFixed(1)} d` : "—",
        delta: 0,
        series: mkSeriesMini(10, 4),
        kind: "spark" as const,
        tooltip: "Mean completion time for tasks finished in range.",
      },
      {
        key: "dashboards_used",
        label: "Dashboards Used",
        value: (summary.dashboards || []).filter((d) => (d.sessions || 0) > 0).length,
        delta: 0,
        series: mkSeriesMini(10, 5),
        kind: "spark" as const,
        tooltip: "Distinct dashboards with usage.",
      },
      {
        key: "most_project",
        label: "Most Active Project",
        valueText: summary.projects?.[0]?.name || "—",
        delta: 0,
        series: mkSeriesMini(10, 3),
        kind: "spark" as const,
        tooltip: "Project with the highest activity score.",
      },
    ];
  }, [summary, timeline]);
  
  if (!open) return null;

  const s = summary?.user || { id: userId, name: "—", email: "—", status: "active" as const };
  const roles = summary?.roles?.by_dashboard || {};
  const dashboards = summary?.dashboards || [];
  const projects = summary?.projects || [];
  const sugg = summary?.suggestions || [];
  const statusLabel =
    s.status === "active"
      ? "Active"
      : s.status === "inactive"
      ? `Inactive — ${summary?.metrics?.inactivity_days ?? 30}d`
      : s.status === "pending"
      ? "Pending"
      : "Removed";



  return (
    <>
      {/* Backdrop */}
      <div className="fixed" onClick={onClose} />
      {/* Drawer */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wr-user-title"
        className="fixed right-0 top-0 z-[1000] h-screen w-full max-w-[820px] overflow-hidden border-l bg-white"
        style={{
          borderColor: TOKENS.border,
          fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          display: "grid",
          gridTemplateRows: "auto auto 1fr auto",
        }}
        tabIndex={-1}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-white" style={{ borderColor: TOKENS.border }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: TOKENS.borderStrong, background: TOKENS.brandPastel }}>
              <WrIcon name="users" className="text-[#1090D0]" />
            </span>
            <Avatar name={s.name} src={s.avatar} />
            <div className="min-w-0">
              <div id="wr-user-title" className="truncate text-[15px] font-bold" style={{ color: TOKENS.text }}>
                User Summary — {s.name}
              </div>
              <div className="text-xs" style={{ color: TOKENS.muted }}>
                {s.email || "—"}
              </div>
            </div>
            <Chip className="ml-6">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.status === "active" ? TOKENS.good : s.status === "inactive" ? TOKENS.warn : TOKENS.muted }} />
              {statusLabel}
            </Chip>
            {/* <Button variant="outline" size="sm" onClick={onClose} aria-label="Close" className="ml-1">
              <WrIcon name="x" /> Close
            </Button> */}
          </div>
          {/* Role chips per dashboard */}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            {Object.entries(roles).map(([k, v]) => (
              <Chip key={k} title={`Role on ${k.toUpperCase()}`}>
                <WrIcon name={(dashIcon[k] as IconName) || "info"} className="text-[#1090D0]" size={14} />
                <span className="text-[#6B7280]">/</span>
                <WrIcon name={(v ? roleIcon[v] : "role-viewer") as IconName} className="text-[#1090D0]" size={14} />
                <span className="text-[#111827]">{(v || "—").toString().charAt(0).toUpperCase() + (v || "—").toString().slice(1)}</span>
                <span className="text-[#6B7280]">•</span>
                <span className="text-[#111827]">{k.toUpperCase()}</span>
              </Chip>
            ))}
            <span className="ml-auto text-xs" style={{ color: TOKENS.muted }}>
              Last login: {summary?.user?.last_login_at ? new Date(summary.user.last_login_at).toLocaleDateString() : "—"} · {relDays(summary?.user?.last_login_at)}
            </span>
          </div>
        </header>

        {/* Scope row */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" style={{ borderColor: TOKENS.border }}>
          <span className="text-xs" style={{ color: TOKENS.muted }}>
            Scope:
          </span>
          <Chip title="Date range">
            <WrIcon name="calendar" size={14} /> {scope.range}
          </Chip>
          {scope.projects?.length
            ? scope.projects.map((p) => (
                <Chip key={p} title={domainFrom(p)}>
                  <ProjectFavicon name={p} />
                </Chip>
              ))
            : null}
          {scope.dashboards?.length ? (
            <Chip title="Dashboards included">
              <WrIcon name="dash-seo" size={14} /> Dashboards: {scope.dashboards.join(", ")}
            </Chip>
          ) : null}
          <button
            className="ml-auto text-xs font-semibold underline decoration-dotted underline-offset-2 cursor-pointer"
            style={{ color: TOKENS.brand }}
            onClick={() => onRoute("analytics", { ...scope, userId: s.id })}
          >
            View in Analytics
          </button>
        </div>

        {/* Body */}
        <main className="overflow-y-auto px-4 py-4">
          {loading && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-md border p-3" style={{ borderColor: TOKENS.border }}>
                  <div className="h-3 w-24 animate-pulse rounded bg-[#EEF2F7]" />
                  <div className="mt-2 h-5 w-16 animate-pulse rounded bg-[#EEF2F7]" />
                  <div className="mt-3 h-8 w-full animate-pulse rounded bg-[#EEF2F7]" />
                </div>
              ))}
            </div>
          )}

          {err && (
            <div className="rounded-md border p-4 text-sm font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.critical }}>
              Couldn’t load user summary. Please retry.
            </div>
          )}

          {!loading && !err && (
            <>
              {/* Overview */}
              <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
                  <WrIcon name="info" className="text-[#1090D0]" /> Overview
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {overviewCards.map((c) => (
                    <MiniCard key={c.key} card={c} />
                  ))}
                </div>
              </section>

              {/* Activity Timeline */}
              <section className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
                    <WrIcon name="clock" className="text-[#1090D0]" /> Activity Timeline
                  </div>
                  <Segmented
                    value={metric}
                    onChange={(m) => setMetric(m as any)}
                    options={[
                      { value: "logins", label: "Logins", icon: "lock" },
                      { value: "sessions", label: "Sessions", icon: "clock" },
                      { value: "task_events", label: "Task Events", icon: "dash-taskboard" },
                    ]}
                  />
                </div>
                <div className="relative rounded-md border bg-white p-3" style={{ borderColor: TOKENS.border }}>
                  <Spark series={timeline.series} h={56} w={560} onHover={setTipTl} />
                  {tipTl && (
                    <div
                      className="absolute left-3 -top-2 z-10 -translate-y-full rounded-md border bg-white px-3 py-2 text-[11px] text-[#111827] shadow"
                      style={{ borderColor: TOKENS.border }}
                      role="tooltip"
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <WrIcon name={metric === "logins" ? "lock" : metric === "sessions" ? "clock" : "dash-taskboard"} className="text-[#1090D0]" size={14} />
                        {metric === "logins" ? "Logins" : metric === "sessions" ? "Sessions" : "Task Events"}
                      </div>
                      <div className="mt-0.5 opacity-80">{new Date(tipTl.t).toLocaleDateString()}</div>
                      <div className="mt-1 text-sm font-extrabold">{fmtInt(tipTl.v)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
                  Click a point to open the filtered Activity Log.
                  <button
                    className="cursor-pointer font-semibold underline decoration-dotted underline-offset-2"
                    style={{ color: TOKENS.brand }}
                    onClick={() =>
                      onRoute("activity_log", { userId: s.id, date: timeline.series?.[timeline.series.length - 1]?.t, metric })
                    }
                  >
                    Open Activity Log
                  </button>
                </div>
              </section>

              {/* Dashboard Usage */}
              <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
                  <WrIcon name="dash-reporting" className="text-[#1090D0]" /> Dashboard Usage
                </div>
                <div className="flex flex-col gap-2">
                  {dashboards.map((d) => {
                    const access = d.has_access;
                    const last = d.last_access_at ? new Date(d.last_access_at).toLocaleDateString() : "—";
                    const sessions = d.sessions;
                    return (
                      <div
                        key={d.key}
                        className="flex items-center justify-between gap-3 rounded-md border bg-white p-3"
                        style={{ borderColor: TOKENS.border }}
                        title={`Access: ${access ? "On" : "Off"} • Role: ${d.role || "—"} • Last: ${last}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ background: "#F5F7FA" }}>
                            <WrIcon name={(dashIcon[d.key] as IconName) || "info"} className="text-[#1090D0]" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold" style={{ color: TOKENS.text }}>
                              {(DASHBOARD_LABEL[d.key as DashboardKey] || d.key).toString()}
                            </div>
                            <div className="truncate text-xs" style={{ color: TOKENS.muted }}>
                              {fmtInt(sessions)} sessions · {access ? `Last: ${last}` : "No access"}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip title="Access">
                            <WrIcon name={access ? "perm-view" : "lock"} className="text-[#1090D0]" size={14} /> {access ? "Access On" : "Access Off"}
                          </Chip>
                          <Chip title="Role">
                            <WrIcon name={(d.role ? roleIcon[d.role] : "role-viewer") as IconName} className="text-[#1090D0]" size={14} /> {d.role ? d.role[0].toUpperCase() + d.role.slice(1) : "—"}
                          </Chip>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRoute("member_access", { userId: s.id, dashboard: d.key })}
                            leadingIcon={<WrIcon name="perm-manage" />}
                          >
                            Edit Access
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Projects & Assigned Tasks */}
              <section className="mb-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
                  <WrIcon name="globe" className="text-[#1090D0]" /> Projects & Assigned Tasks
                </div>
                {projects.length === 0 ? (
                  <div className="rounded-md border p-3 text-sm" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                    No projects assigned.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-md border" style={{ borderColor: TOKENS.border }}>
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-[#FAFAFB]">
                        <tr>
                          <th className="border-b px-3 py-2 text-left text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                            Project
                          </th>
                          <th className="border-b px-3 py-2 text-right text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                            Open Tasks
                          </th>
                          <th className="border-b px-3 py-2 text-right text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                            Completed (range)
                          </th>
                          <th className="border-b px-3 py-2 text-left text-xs font-semibold" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>
                            Role
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((p) => (
                          <tr
                            key={p.id}
                            className="cursor-pointer align-top hover:bg-[#F9FAFB]"
                            onClick={() => onRoute("taskboard", { userId: s.id, projectId: p.id })}
                            title={`Overdue: ${p.overdue} — click to open TaskBoard`}
                          >
                            <td className="border-t px-3 py-2" style={{ borderColor: TOKENS.border }}>
                              <ProjectFavicon name={p.name} />
                            </td>
                            <td className="border-t px-3 py-2 text-right" style={{ borderColor: TOKENS.border }}>
                              {fmtInt(p.open_tasks)}
                            </td>
                            <td className="border-t px-3 py-2 text-right" style={{ borderColor: TOKENS.border }}>
                              {fmtInt(p.completed_in_range)}
                            </td>
                            <td className="border-t px-3 py-2" style={{ borderColor: TOKENS.border }}>
                              <Chip>
                                <WrIcon name="role-editor" className="text-[#1090D0]" size={14} /> {p.role}
                              </Chip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Suggested Actions */}
              {sugg?.length ? (
                <section className="mb-2">
                  <div className="mb-2 flex items-center gap-2 text-[13px] font-bold" style={{ color: TOKENS.text }}>
                    <WrIcon name="perm-manage" className="text-[#1090D0]" /> Suggested Actions
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {sugg.map((sg, i) => (
                      <Button
                        key={i}
                        variant={sg.type === "upgrade" || sg.type === "reassign" ? "primary" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (sg.type === "reassign") onRoute("reassign_tasks", { userId: s.id });
                          else if (sg.type === "change_role") onRoute("member_access", { userId: s.id });
                          else if (sg.type === "reminder") onRoute("send_reminder", { userId: s.id });
                          else onRoute("member_access", { userId: s.id });
                        }}
                        leadingIcon={
                          sg.type === "reassign" ? (
                            <WrIcon name="perm-assign" />
                          ) : sg.type === "change_role" ? (
                            <WrIcon name="role-editor" />
                          ) : sg.type === "upgrade" ? (
                            <WrIcon name="role-admin" />
                          ) : (
                            <WrIcon name="bell" />
                          )
                        }
                      >
                        {sg.type === "reassign"
                          ? "Reassign Tasks"
                          : sg.type === "change_role"
                          ? "Change Role"
                          : sg.type === "upgrade"
                          ? "Upgrade Role"
                          : "Send Reminder"}
                      </Button>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>

        {/* Footer CTAs */}
        <footer className="flex items-center justify-end gap-2 border-t bg-white px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <Button variant="primary" onClick={() => onRoute("reassign_tasks", { userId: s.id })} leadingIcon={<WrIcon name="perm-assign" />}>
            Reassign Tasks
          </Button>
          <Button variant="outline" onClick={() => onRoute("member_access", { userId: s.id })} leadingIcon={<WrIcon name="perm-manage" />}>
            Edit Role / Access
          </Button>
          <Button variant="outline" onClick={() => onRoute("send_reminder", { userId: s.id })} leadingIcon={<WrIcon name="bell" />}>
            Send Reminder
          </Button>
          <Button variant="danger" onClick={() => onRoute("remove_user", { userId: s.id })} leadingIcon={<WrIcon name="trash" />}>
            Remove User
          </Button>
        </footer>
      </aside>
    </>
  );
}

/* ========================================================================================
 * DEMO (drop‑in)
 * ====================================================================================== */
export default function UserSummaryDrawerDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
   {/* <div
      className="p-6"
      style={{ fontFamily: "intern, Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" }}
    >
      <h2 className="mb-1 flex items-center gap-2 text-lg font-bold" style={{ color: TOKENS.text }}>
        <WrIcon name="shield" className="text-[#1090D0]" />
        User Summary Drawer (Demo)
      </h2>
      <p className="mb-3 text-sm" style={{ color: TOKENS.muted }}>
        Branded icons, Inter font, project favicons, modular chips & buttons. All interactive elements use a pointer cursor.
      </p>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open Drawer
      </Button>

      <UserSummaryDrawer
        open={open}
        onClose={() => setOpen(false)}
        scope={{ range: "Jul 1 – Jul 30", projects: ["wranker.com", "app.w3era.com"], dashboards: ["SEO", "Reporting"], tz: "UTC" }}
        userId="u123"
        source="table"
        onRoute={(dest, payload) => alert(`(demo) Navigate → ${dest}\n\n${JSON.stringify(payload, null, 2)}`)}
      />
    </div>*/}
         <UserSummaryDrawer
        open={open}
        onClose={() => setOpen(false)}
        scope={{ range: "Jul 1 – Jul 30", projects: ["wranker.com", "app.w3era.com"], dashboards: ["SEO", "Reporting"], tz: "UTC" }}
        userId="u123"
        source="table"
        onRoute={(dest, payload) => alert(`(demo) Navigate → ${dest}\n\n${JSON.stringify(payload, null, 2)}`)}
      />
      </>
  );
}

/* ========================================================================================
 * MOCK DATA
 * ====================================================================================== */
function mkSeriesMini(n: number, base = 6): TLPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    t: new Date(Date.now() - (n - 1 - i) * 86400000).toISOString(),
    v: Math.max(0, Math.round(base + Math.sin(i / 2) * (base / 2) + (Math.random() * base) / 2)),
  }));
}
async function mockFetchSummary(id: string): Promise<UserSummary> {
  await delay(140);
  return {
    user: { id, name: "Sara Mehta", email: "sara@agency.com", avatar: "", status: "active", last_login_at: new Date(Date.now() - 6 * 86400000).toISOString() },
    roles: { by_dashboard: { seo: "editor", content: null, campaign: "viewer", reporting: "viewer" } },
    metrics: { logins: { current: 24, prev: 21 }, sessions: { current: 18, prev: 15 }, tasks: { assigned_open: 11, completed: 15, avg_duration_days: 3.2 }, inactivity_days: 6 },
    dashboards: [
      { key: "seo", sessions: 12, last_access_at: new Date(Date.now() - 2 * 86400000).toISOString(), has_access: true, role: "editor" },
      { key: "content", sessions: 0, last_access_at: null, has_access: false, role: null },
      { key: "campaign", sessions: 4, last_access_at: new Date(Date.now() - 5 * 86400000).toISOString(), has_access: true, role: "viewer" },
      { key: "reporting", sessions: 2, last_access_at: new Date(Date.now() - 9 * 86400000).toISOString(), has_access: true, role: "viewer" },
    ],
    projects: [
      { id: "p1", name: "wranker.com", open_tasks: 7, completed_in_range: 11, role: "editor-seo", overdue: 2 },
      { id: "p2", name: "app.w3era.com", open_tasks: 4, completed_in_range: 7, role: "viewer-reporting", overdue: 0 },
    ],
    suggestions: [
      { type: "reassign", rationale: "Inactive 31d with 3 active tasks" },
      { type: "change_role", rationale: "Admin with 0 usage in range" },
      { type: "reminder", rationale: "Long inactivity" },
    ],
  };
}
async function mockFetchTimeline(id: string, metric: string): Promise<{ series: TLPoint[]; prev_series: TLPoint[] }> {
  await delay(120);
  const base = metric === "logins" ? 6 : metric === "sessions" ? 10 : 8;
  const series = mkSeriesMini(28, base);
  return { series, prev_series: mkSeriesMini(28, base - 2) };
}
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

