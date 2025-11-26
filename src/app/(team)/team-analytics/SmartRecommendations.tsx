"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";


/* ───────────────────────── Tokens (matches TA) ───────────────────────── */
const TK = {
  brand: "#1090D0",
  text: "#282829",
  muted: "rgba(40,40,41,0.64)",
  panel: "#FFFFFF",
  border: "#EFF0F6",
  borderStrong: "#E5E7EB",
  focus: "#D2EFFF",
  radius: 6,
  shadow: "0 8px 20px rgba(0,0,0,0.06)",
  severity: {
    info: "#9CA3AF",
    advisory: "#1090D0",
    warning: "#F59E0B",
    risk: "#EF4444",
  },
  ai: {
    low: "#A78BFA",
    medium: "#60A5FA",
    high: "#10B981",
  },
};

/* ───────────────────────── Utilities ───────────────────────── */
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "—");
const relDays = (days) =>
  Number.isFinite(days) ? `Based on past ${Math.round(days)} days` : "Based on recent activity";
const colorFromId = (id) => {
  // deterministic pastel for avatars
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 360;
  return `hsl(${h} 70% 88%)`;
};

/* ───────────────────────── Types ───────────────────────── */
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
  actions?: string[]; // internal keys; mapping → labels below
  metrics?: { count?: number; days?: number; active_tasks?: number; top_user_share?: number };
  role_key?: string;
  created_at?: string;
  expires_at?: string;
};

/* ───────────────────────── Action labels (map) ───────────────────────── */
function actionLabelsFor(type: Suggestion["type"]) {
  switch (type) {
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

/* ───────────────────────── Demo API (mock) ───────────────────────── */
async function fetchSuggestions(filters) {
  await sleep(420); // simulate network
  const now = new Date();
  const d = (n) => new Date(now.getTime() - n * 86400000).toISOString();
  const mkUser = (id, name) => ({
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

/* ───────────────────────── Small building blocks ───────────────────────── */
const Chip = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ai" }) => (
  <span className={`wr-chip ${tone === "ai" ? "ai" : ""}`}>{children}</span>
);

const Avatar = ({ user }: { user: { id: string; name: string; email: string; avatar?: string } }) => {
  const letter = user.name?.charAt(0)?.toUpperCase() || "?";
  const bg = colorFromId(user.id);
  return (
    <div className="wr-ava" title={`${user.name} • ${user.email}`} style={{ background: bg }}>
      {letter}
    </div>
  );
};

function SeverityBadge({ level }: { level: Suggestion["severity"] }) {
  const color = TK.severity[level];
  const label = level === "info" ? "Info" : level === "advisory" ? "Advisory" : level === "warning" ? "Warning" : "Risk";
  return (
    <span className="wr-sev" style={{ color }}>
      ● {label}
    </span>
  );
}

function ConfidenceBadge({ c }: { c?: "low" | "medium" | "high" }) {
  if (!c) return null;
  const color = TK.ai[c];
  return (
    <span className="wr-sev" style={{ color }}>
      🤖 {c[0].toUpperCase() + c.slice(1)}
    </span>
  );
}

/* ───────────────────────── Card component ───────────────────────── */
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
  const [selOpen, setSelOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const affected = item.affected || [];
  const first3 = affected.slice(0, 3);
  const more = Math.max(0, affected.length - first3.length);
  const labels = actionLabelsFor(item.type);
  const selectedIds = useMemo(
    () => affected.filter((u) => selected[u.id]).map((u) => u.id),
    [selected, affected]
  );
  const allChecked = affected.length > 0 && affected.every((u) => selected[u.id]);

  useEffect(() => {
    // initialize selection default: all selected (apply to all)
    setSelected((s) => {
      const next = { ...s };
      affected.forEach((u) => {
        if (next[u.id] === undefined) next[u.id] = true;
      });
      return next;
    });
  }, [item.id]); // eslint-disable-line

  return (
    <div className="wr-sg-card" role="group" aria-labelledby={`sg-${item.id}-t`} aria-describedby={`sg-${item.id}-d`}>
      <div className="wr-sg-hdr">
        <div className="wr-sg-titles">
          <div id={`sg-${item.id}-t`} className="wr-sg-title">
            <span aria-hidden>🧠</span> {item.title}
          </div>
          <div className="wr-sg-meta">
            <SeverityBadge level={item.severity} />
            <ConfidenceBadge c={item.confidence} />
            <span className="wr-sg-time">{relDays(item.metrics?.days ?? 30)}</span>
          </div>
        </div>

        {/* overflow menu */}
        <div className="wr-sg-overflow">
          <button className="wr-icon" aria-label="More actions" onClick={() => setMenuOpen((v) => !v)}>
            ⋯
          </button>
          {menuOpen && (
            <div className="wr-menu" role="menu" onMouseLeave={() => setMenuOpen(false)}>
              <button onClick={() => (setMenuOpen(false), onSnooze(item.id, 7))}>Snooze 7d</button>
              <button onClick={() => (setMenuOpen(false), onDismiss(item.id))}>Dismiss</button>
              <button onClick={() => (setMenuOpen(false), onSnooze(item.id, 30))}>Never show for this role</button>
            </div>
          )}
        </div>
      </div>

      <p id={`sg-${item.id}-d`} className="wr-sg-desc">
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

      {/* avatars & selection */}
      <div className="wr-sg-row">
        <div className="wr-avas">
          {first3.map((u) => (
            <Avatar key={u.id} user={u} />
          ))}
          {more > 0 && (
            <button className="wr-more" onClick={() => setSelOpen((v) => !v)} aria-expanded={selOpen}>
              +{more} more
            </button>
          )}
        </div>

        {/* reason tags */}
        <div className="wr-tags">
          {(item.reason_tags || []).map((t, i) => (
            <Chip key={i}>{t}</Chip>
          ))}
          {item.confidence && <Chip tone="ai">AI confidence: {item.confidence}</Chip>}
        </div>
      </div>

      {/* selection tray */}
      {selOpen && affected.length > 0 && (
        <div className="wr-sel">
          <div className="wr-sel-hdr">
            <label>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  const next: Record<string, boolean> = {};
                  affected.forEach((u) => (next[u.id] = on));
                  setSelected(next);
                }}
              />{" "}
              Apply to all ({affected.length})
            </label>
            <button className="wr-icon" onClick={() => setSelOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="wr-sel-body">
            {affected.map((u) => (
              <label key={u.id} className="wr-sel-item">
                <input
                  type="checkbox"
                  checked={!!selected[u.id]}
                  onChange={(e) => setSelected((s) => ({ ...s, [u.id]: e.currentTarget.checked }))}
                />
                <Avatar user={u} />
                <div className="wr-sel-name">
                  <div className="name">{u.name}</div>
                  <div className="email">{u.email}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="wr-sg-div" />

      {/* CTAs & Why */}
      <div className="wr-sg-ctas">
        <button
          className="wr-btn"
          disabled={!isAdmin}
          title={isAdmin ? "" : "Insufficient permission."}
          onClick={() => onAction(item.id, "primary", selectedIds)}
        >
          {labels.primary}
        </button>
        {labels.secondary && (
          <button
            className="wr-btn ghost"
            disabled={!isAdmin}
            title={isAdmin ? "" : "Insufficient permission."}
            onClick={() => onAction(item.id, "secondary", selectedIds)}
          >
            {labels.secondary}
          </button>
        )}
        <button className="wr-link" onClick={() => (setWhyOpen((v) => !v), onWhy(item.id))}>
          Why?
        </button>
      </div>

      {whyOpen && (
        <div className="wr-why" role="dialog" aria-label="Why explanation" onMouseLeave={() => setWhyOpen(false)}>
          <div className="wr-why-title">Why this recommendation?</div>
          <ul className="wr-why-list">
            {item.type === "inactive_admins" && (
              <>
                <li>Rule: role = Admin AND 0 logins AND 0 sessions for ≥ {item.metrics?.days ?? 30} days.</li>
                <li>Evidence: {item.metrics?.count ?? affected.length} admins matched.</li>
              </>
            )}
            {item.type === "no_usage_with_access" && (
              <>
                <li>Rule: has_access = true AND sessions = 0 in range.</li>
                <li>Evidence: {item.metrics?.count ?? affected.length} users matched.</li>
              </>
            )}
            {item.type === "over_concentration" && (
              <li>Rule: top user share &gt; 40%. Observed: {(item.metrics?.top_user_share ?? 0) * 100}%.</li>
            )}
            {item.reason_tags?.length ? <li>Tags: {item.reason_tags.join(" • ")}</li> : null}
            <li>Window: {relDays(item.metrics?.days ?? 30)}</li>
          </ul>
          <div className="wr-why-links">
            <button className="wr-link">Open Engagement Table (filtered)</button>
            <button className="wr-link">Open Heatmap</button>
            <button className="wr-link">Open Trends</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Section wrapper ───────────────────────── */
export function SmartRecommendations({
  filters,
  isAdmin = true,
  maxVisible = 7,
}: {
  filters?: any;
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
      // pass filters to API (mocked)
      const res = await fetchSuggestions(filters);
      setItems((res.items || []).slice(0, maxVisible));
    } catch (e) {
      setErr("Couldn't load recommendations. Retry.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const onAction = async (id: string, which: "primary" | "secondary", selected: string[]) => {
    setToast("Executing…");
    await sleep(420);
    setToast("Done. (mock)");
    setTimeout(() => setToast(null), 1200);
  };

  const onDismiss = async (id: string) => {
    setItems((arr) => (arr || []).filter((x) => x.id !== id));
  };

  const onSnooze = async (id: string, days: number) => {
    setItems((arr) => (arr || []).filter((x) => x.id !== id));
  };

  const onWhy = (id: string) => {
    console.log("ta.suggestions.why_open", { id });
  };

  return (
        <WrSmartRecs>

    <section className="wr-sg-wrap">
      <div className="wr-sg-head">
        <div className="wr-sg-title">Smart Recommendations</div>
        <div className="wr-sg-actions">
          <button className="wr-btn ghost" onClick={load}>
            Refresh
          </button>
          <button className="wr-btn">View all insights</button>
        </div>
      </div>

      {/* Loading */}
      {!items && !err && (
        <div className="wr-sg-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="wr-skel" aria-hidden />
          ))}
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="wr-banner">
          {err}{" "}
          <button className="wr-link" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {items && items.length === 0 && (
        <div className="wr-empty">
          No recommendations for your current filters.{" "}
          <button className="wr-link" onClick={load}>
            Adjust filters / Refresh
          </button>
        </div>
      )}

      {/* Cards */}
      {items && items.length > 0 && (
        <div className="wr-sg-grid" role="list">
          {items.map((it) => (
            <SuggestionCard
              key={it.id}
              item={it}
              isAdmin={isAdmin}
              onAction={onAction}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              onWhy={onWhy}
            />
          ))}
        </div>
      )}

      {toast && <div className="wr-toast">{toast}</div>}
    </section>    </WrSmartRecs>

  );
}

/* ───────────────────────── Demo component ───────────────────────── */
export default function SmartRecommendationsDemo() {
  const [isAdmin, setIsAdmin] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: "2025-07-01", dateTo: "2025-07-30", tz: "UTC" });

  return (
    <div style={{ padding: 16, background: "#FAFAFA" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Team Analytics · Section 7: Smart Recommendations (Demo)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: TK.muted }}>
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.currentTarget.checked)} /> Admin
            mode
          </label>
          <button
            className="wr-btn ghost"
            onClick={() =>
              setFilters((f) => ({ ...f, dateFrom: "2025-07-01", dateTo: "2025-07-30", tz: "UTC", rand: Math.random() }))
            }
          >
            Change filters
          </button>
        </div>
      </header>

      <SmartRecommendations filters={filters} isAdmin={isAdmin} />
    </div>
  );
}



const shimmer = keyframes`
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
`;

export const WrSmartRecs = styled.div`
  /* Section shell */
  .wr-sg-wrap {
    background: transparent;
  }
  .wr-sg-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0 10px;
    position: sticky;
    top: 0;
    background: transparent;
    z-index: 1;
  }
  .wr-sg-title {
    font-weight: 600;
    color: ${TK.text};
    font-size: 16px;
  }
  .wr-sg-actions {
    display: flex;
    gap: 8px;
  }

  /* Grid */
  .wr-sg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 12px;
  }
  @media (max-width: 520px) {
    .wr-sg-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Card */
  .wr-sg-card {
    background: ${TK.panel};
    border: 1px solid ${TK.border};
    border-radius: ${TK.radius}px;
    box-shadow: ${TK.shadow};
    padding: 12px;
    min-height: 160px;
    position: relative;
  }
  .wr-sg-card:focus-within {
    outline: 2px solid ${TK.focus};
    outline-offset: 2px;
  }
  .wr-sg-hdr {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .wr-sg-titles {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .wr-sg-title {
    font-weight: 700;
    color: ${TK.text};
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .wr-sg-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }
  .wr-sev {
    font-weight: 600;
  }
  .wr-sg-time {
    color: ${TK.muted};
  }
  .wr-sg-desc {
    margin: 6px 0 8px;
    color: ${TK.muted};
    font-size: 13px;
  }

  /* Avatars + chips row */
  .wr-sg-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .wr-avas {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .wr-ava {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #111;
  }
  .wr-more {
    border: 1px dashed ${TK.borderStrong};
    background: #fff;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  /* Chips */
  .wr-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border: 1px solid ${TK.border};
    border-radius: 999px;
    font-size: 12px;
    background: #fff;
    color: ${TK.text};
  }
  .wr-chip.ai {
    border-color: ${TK.brand};
    color: ${TK.brand};
  }

  /* Selection tray */
  .wr-sel {
    border: 1px solid ${TK.border};
    border-radius: 8px;
    background: ${TK.panel};
    margin-top: 8px;
  }
  .wr-sel-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    border-bottom: 1px solid ${TK.border};
  }
  .wr-sel-body {
    max-height: 160px;
    overflow: auto;
    padding: 6px 8px;
    display: grid;
    gap: 6px;
  }
  .wr-sel-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  .wr-sel-name .name {
    font-weight: 600;
  }
  .wr-sel-name .email {
    color: ${TK.muted};
    font-size: 12px;
  }
  .wr-icon {
    border: 1px solid ${TK.border};
    background: #fff;
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
  }

  /* Divider */
  .wr-sg-div {
    height: 1px;
    background: ${TK.border};
    margin: 8px 0 10px;
  }

  /* CTAs */
  .wr-sg-ctas {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .wr-btn {
    border: 1px solid ${TK.border};
    background: ${TK.brand};
    color: #fff;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  .wr-btn:hover {
    background: #0a7ab2;
  }
  .wr-btn.ghost {
    background: #fff;
    color: ${TK.brand};
  }
  .wr-link {
    border: none;
    background: transparent;
    color: ${TK.brand};
    cursor: pointer;
    font-weight: 600;
  }

  /* Why popover */
  .wr-why {
    position: absolute;
    right: 10px;
    top: 10px;
    transform: translateY(calc(-100% - 8px));
    width: 320px;
    background: #fff;
    border: 1px solid ${TK.border};
    border-radius: 8px;
    box-shadow: ${TK.shadow};
    padding: 10px;
    z-index: 5;
  }
  .wr-why-title {
    font-weight: 700;
    margin-bottom: 6px;
  }
  .wr-why-list {
    margin: 0 0 6px 16px;
    padding: 0;
    color: ${TK.text};
    font-size: 13px;
  }
  .wr-why-links {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* Overflow menu */
  .wr-sg-overflow {
    position: relative;
  }
  .wr-menu {
    position: absolute;
    right: 0;
    top: 28px;
    background: #fff;
    border: 1px solid ${TK.border};
    border-radius: 8px;
    box-shadow: ${TK.shadow};
    display: flex;
    flex-direction: column;
    min-width: 180px;
    z-index: 6;
  }
  .wr-menu > button {
    background: none;
    border: none;
    text-align: left;
    padding: 8px 10px;
    font-size: 13px;
    cursor: pointer;
  }
  .wr-menu > button:hover {
    background: #f7fafc;
  }

  /* Skeletons / states */
  .wr-skel {
    height: 180px;
    border: 1px solid ${TK.border};
    border-radius: ${TK.radius}px;
    background: linear-gradient(90deg, #f6f7f9 25%, #eef1f5 37%, #f6f7f9 63%);
    background-size: 400% 100%;
    animation: ${shimmer} 1.2s ease-in-out infinite;
  }
  .wr-banner {
    padding: 10px;
    border: 1px solid ${TK.border};
    border-radius: ${TK.radius}px;
    background: #fff7ed;
    color: #7c2d12;
    margin-bottom: 8px;
  }
  .wr-empty {
    padding: 12px;
    color: ${TK.muted};
  }
  .wr-toast {
    position: fixed;
    bottom: 12px;
    left: 12px;
    background: #111827;
    color: #fff;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 10;
  }
`;
