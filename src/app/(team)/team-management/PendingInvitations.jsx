// src/components/team/PendingInvitations.jsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import { useDispatch, useSelector } from "react-redux";
import {
  cancelInvite,
  fetchTeamDetails,
  resendInvite,
  selectPendingInvites,
} from "@/src/redux/reducer/teamReducer";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

/* -------------------------
   Small helpers & metadata
   ------------------------- */
const DASH_META = {
  seo: { label: "SEO", color: "#2563EB", emoji: "🟦" },
  content: { label: "Content", color: "#10B981", emoji: "🟩" },
  reporting: { label: "Reporting", color: "#F59E0B", emoji: "🟨" },
  taskboard: { label: "TaskBoard", color: "#EF4444", emoji: "🟥" },
};

function roleColor(role) {
  return role === "admin" ? "#0077FF" : role === "editor" ? "#10B981" : "#6B7280";
}
function mmss(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(1, "0")}:${String(s).padStart(2, "0")}`;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSVFromRows(rows) {
  const header = [
    "Email",
    "Invited By",
    "Projects",
    "Dashboards",
    "Roles",
    "Created At",
    "Last Sent At",
    "Expires At",
    "Status",
  ].join(",");
  const lines = rows.map((r) => {
    const projs = (r.projects || []).map((p) => p.name).join("; ");
    const dashes = (r.dashboards || [])
      .filter((d) => d.enabled)
      .map((d) => DASH_META[d.dashboard].label)
      .join("; ");
    const roles = (r.dashboards || [])
      .filter((d) => d.enabled)
      .map((d) => `${d.role} — ${DASH_META[d.dashboard].label}`)
      .join("; ");
    return [
      `"${r.email}"`,
      `"${(r.invited_by && r.invited_by.name) || ""}"`,
      `"${projs}"`,
      `"${dashes}"`,
      `"${roles}"`,
      `"${r.created_at || ""}"`,
      `"${r.last_sent_at || ""}"`,
      `"${r.expires_at || ""}"`,
      `"${r.status}"`,
    ].join(",");
  });
  return new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
}

/* Compute age / tone badge */
function computeAgeChip(row) {
  const last = row.last_sent_at || row.created_at;
  if (!last) return { tone: "neutral", text: "", days: 0 };
  const days = Math.floor(dayjs().diff(dayjs(last), "day"));
  const expired = row.status === "expired" || (!!row.expires_at && dayjs(row.expires_at).isBefore(dayjs()));
  if (expired) return { tone: "critical", text: "⏳ Expired", days };
  if (days >= 3) return { tone: "warning", text: `Pending ${days}d`, days };
  return { tone: "neutral", text: "", days };
}

/* -------------------------
   Debounce hook
   ------------------------- */
function useDebounce(v, ms) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

/* -------------------------
   Main exported component
   ------------------------- */
export function PendingInvitesSection({
  projects = [],
  inviters = [],
  enableSentByFilter = false,
  pageSize = 25,
  onInviteMoreClick,
}) {
  const dispatch = useDispatch();
  const baseRows = useSelector(selectPendingInvites) || [];

  // ensure members loaded so pending can be derived
  useEffect(() => {
    dispatch(fetchTeamDetails({ force: false }));
  }, [dispatch]);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState([]); // e.g. ['admin','editor','viewer']
  const [projectIds, setProjectIds] = useState([]); // ids as strings
  const [invitedByIds, setInvitedByIds] = useState([]); // currently unused unless backend provides invited_by
  const [sort, setSort] = useState("sent_on_desc");

  const [cooldowns, setCooldowns] = useState({}); // invite_id -> seconds
  const cooldownTimerRef = useRef(null);

  const debouncedQuery = useDebounce(query, 300);

  // derive rows client-side from baseRows
  const rows = useMemo(() => {
    let r = [...baseRows];
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      r = r.filter((x) => (x.email || "").toLowerCase().includes(q));
    }
    if (roleFilter.length) {
      r = r.filter((x) => (x.dashboards || []).some((d) => d.enabled && roleFilter.includes(d.role)));
    }
    if (projectIds.length) {
      r = r.filter((x) => (x.projects || []).some((p) => projectIds.includes(p.id)));
    }
    // invitedBy filter (if data contains invited_by)
    if (invitedByIds.length) {
      r = r.filter((x) => invitedByIds.includes((x.invited_by && x.invited_by.user_id) || ""));
    }

    switch (sort) {
      case "email_asc":
        r.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
        break;
      case "expires_on_asc":
        r.sort((a, b) => (a.expires_at || "2100").localeCompare(b.expires_at || "2100"));
        break;
      case "expires_on_desc":
        r.sort((a, b) => (b.expires_at || "1900").localeCompare(a.expires_at || "1900"));
        break;
      case "sent_on_asc":
        r.sort((a, b) => (a.last_sent_at || "").localeCompare(b.last_sent_at || ""));
        break;
      case "sent_on_desc":
      default:
        r.sort((a, b) => (b.last_sent_at || "").localeCompare(a.last_sent_at || ""));
        break;
    }
    return r;
  }, [baseRows, debouncedQuery, roleFilter, projectIds, invitedByIds, sort]);

  // Pagination
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [debouncedQuery, roleFilter.join(","), projectIds.join(","), invitedByIds.join(","), sort]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));

  // cooldown ticking
  useEffect(() => {
    if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    if (!Object.values(cooldowns).some((v) => v > 0)) return;
    cooldownTimerRef.current = window.setInterval(() => {
      setCooldowns((prev) => {
        const next = {};
        let any = false;
        Object.entries(prev).forEach(([id, sec]) => {
          const ns = Math.max(sec - 1, 0);
          next[id] = ns;
          if (ns > 0) any = true;
        });
        if (!any && cooldownTimerRef.current) {
          window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (cooldownTimerRef.current) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldowns]);

  function resetFilters() {
    setQuery("");
    setRoleFilter([]);
    setProjectIds([]);
    setInvitedByIds([]);
    setSort("sent_on_desc");
  }

  async function onExport() {
    const blob = exportCSVFromRows(rows);
    downloadBlob(blob, "pending-invitations.csv");
  }

  async function handleResend(row) {
    const id = row.invite_id;
    const cd = cooldowns[id] ?? row.resend_cooldown_seconds ?? 0;
    if (cd > 0) return;
    try {
      const res = await dispatch(resendInvite({ invite_id: row.invite_id, email: row.email })).unwrap();
      // expect backend to return cooldown; try common keys
      const seconds = res?.cooldown ?? res?.resend_cooldown_seconds ?? res?.cooldown_seconds ?? 120;
      setCooldowns((prev) => ({ ...prev, [id]: seconds }));
      // optimistic UI: update row last_sent_at if present
    } catch (e) {
      // swallow - UI can show toast if/apply later
      // fallback: set a short cooldown to prevent spam
      setCooldowns((prev) => ({ ...prev, [id]: 60 }));
    }
  }

  async function handleCancel(row) {
    if (!confirm(`Cancel invite for ${row.email}?`)) return;
    try {
      await dispatch(cancelInvite({ invite_id: row.invite_id })).unwrap();
      // after cancellation, refetch to update derived pending (keeps single-source)
      dispatch(fetchTeamDetails({ force: true }));
    } catch (e) {
      // ignore for now
    }
  }

  /* -------------------------
     Minimal presentational components (kept simple)
     ------------------------- */
  function AgePill({ row }) {
    const info = computeAgeChip(row);
    const style = { padding: "6px 8px", borderRadius: 999, fontSize: 12, display: "inline-block" };
    if (info.tone === "critical") style.background = "#FEF2F2", style.color = "#B91C1C";
    else if (info.tone === "warning") style.background = "#FFFBEB", style.color = "#92400E";
    else style.background = "#F5F7FA", style.color = "#374151";
    return <span style={style}>{info.text || "Pending"}</span>;
  }

  function InviteRow({ r }) {
    const cd = cooldowns[r.invite_id] ?? 0;
    const canResend = (r.reason || "") === "already_invited" || (r.status === "pending");
    return (
      <tr key={r.invite_id}>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6" }}>{r.email}</td>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{(r.invited_by && r.invited_by.name) || "—"}</div>
            <div style={{ color: "#6B7280", fontSize: 12 }}>{(r.invited_by && r.invited_by.email) || ""}</div>
          </div>
        </td>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6", minWidth: 220 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(r.projects || []).map((p) => <div key={p.id} style={{ fontSize: 13 }}>{p.name}</div>)}
          </div>
        </td>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(r.dashboards || []).map((d, i) => (
              <div key={i} style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #EEF2F6", fontSize: 12 }}>
                <strong style={{ marginRight: 6 }}>{DASH_META[d.dashboard]?.emoji || "•"}</strong>
                <span>{DASH_META[d.dashboard]?.label || d.dashboard}</span>
              </div>
            ))}
          </div>
        </td>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13 }}>{r.created_at ? dayjs(r.created_at).format("D MMM YYYY") : "—"}</div>
            <div style={{ color: "#6B7280", fontSize: 12 }}>{r.last_sent_at ? dayjs(r.last_sent_at).fromNow() : ""}</div>
            {r.expires_at && <div style={{ color: "#92400E", fontSize: 12 }}>Expires {dayjs(r.expires_at).format("D MMM YYYY")}</div>}
          </div>
        </td>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6" }}>
          <AgePill row={r} />
        </td>
        <td style={{ padding: 12, borderBottom: "1px solid #EEF2F6", textAlign: "right" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            <button className="wr-btn wr-btn--outline" disabled={!canResend || cd > 0} onClick={() => handleResend(r)}>
              {cd > 0 ? `Resend (${mmss(cd)})` : "Resend"}
            </button>
            <button className="wr-btn wr-btn--outline" onClick={() => handleCancel(r)}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <section aria-labelledby="pending-invites-heading" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h3 id="pending-invites-heading" style={{ margin: 0 }} className="font-bold">Pending Invitations</h3>
          <p style={{ margin: "6px 0 0", color: "#6B7280" }}>Manage outstanding invitations and resend or cancel as required.</p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email"
            className="wr-input"
            style={{ width: 260 }}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="wr-select" aria-label="Sort invites">
            <option value="sent_on_desc">Last sent (new→old)</option>
            <option value="sent_on_asc">Last sent (old→new)</option>
            <option value="email_asc">Email (A → Z)</option>
            <option value="expires_on_asc">Expires (soonest)</option>
            <option value="expires_on_desc">Expires (latest)</option>
          </select>
          <button className="wr-btn wr-btn--outline" onClick={resetFilters}>Reset</button>
          <button className="wr-btn wr-btn--primary" onClick={() => onInviteMoreClick?.()}>Invite more</button>
          <button className="wr-btn wr-btn--outline" onClick={onExport}>Export CSV</button>
        </div>
      </div>

      {/* Filters row (project & role selectors) */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {/* <div>
          <label style={{ fontSize: 12, display: "block", color: "#6B7280" }}>Project</label>
          <select multiple value={projectIds} onChange={(e) => {
            const options = Array.from(e.target.selectedOptions).map(o => o.value);
            setProjectIds(options);
          }} className="wr-select" style={{ minWidth: 200 }}>
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12, display: "block", color: "#6B7280" }}>Role</label>
          <select multiple value={roleFilter} onChange={(e) => {
            const opts = Array.from(e.target.selectedOptions).map(o => o.value);
            setRoleFilter(opts);
          }} className="wr-select" style={{ minWidth: 160 }}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div> */}

        {enableSentByFilter && (
          <div>
            <label style={{ fontSize: 12, display: "block", color: "#6B7280" }}>Invited by</label>
            <select multiple value={invitedByIds} onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              setInvitedByIds(opts);
            }} className="wr-select" style={{ minWidth: 180 }}>
              {inviters.map((inv) => <option key={inv.user_id} value={inv.user_id}>{inv.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", border: "1px solid #EEF2F6", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#FAFAFB", textTransform: "uppercase", fontSize: 12, color: "#6B7280" }}>
            <tr>
              <th style={{ textAlign: "left", padding: 12 }}>Email</th>
              <th style={{ textAlign: "left", padding: 12 }}>Invited By</th>
              <th style={{ textAlign: "left", padding: 12 }}>Projects</th>
              <th style={{ textAlign: "left", padding: 12 }}>Dashboards</th>
              <th style={{ textAlign: "left", padding: 12 }}>Sent / Expires</th>
              <th style={{ textAlign: "left", padding: 12 }}>State</th>
              <th style={{ textAlign: "center", padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#6B7280" }}>
                  No pending invitations found.
                </td>
              </tr>
            )}
            {pageRows.map((r) => (
              <InviteRow r={r} key={r.invite_id} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination & summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ color: "#6B7280" }}>
          Showing {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, rows.length)} of {rows.length}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="wr-btn wr-btn--outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Page {page} / {pageCount}
          </div>
          <button className="wr-btn wr-btn--outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}
