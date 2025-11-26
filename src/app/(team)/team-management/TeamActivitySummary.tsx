"use client"
import React from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { BASE_URL_WR } from "@/src/util/api";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeamDetails, selectTeamSummary } from "@/src/redux/reducer/teamReducer";


/**************************************
 * src/services/summaryApi.ts (inlined)
 **************************************/
export type ProjectScope = 'all' | 'mine' | 'shared';

export type SummaryCounts = {
  total_active_members: number;
  pending_invites: number;
  expired_invites?: number;
  members_with_admin_role: number;
  owner_count: number;
  active_projects_assigned: number;
  multi_dashboard_users: number;
  inactive_users_30d: number;
};

export type SummaryBreakdown = {
  stale_invites_3to6d?: number;
  admin_without_recent_usage?: number;
};

export type TeamActivitySummary = {
  counts: SummaryCounts;
  breakdown?: SummaryBreakdown;
  last_generated_at: string; // ISO
};

function sleep(ms = 450) {
  return new Promise((r) => setTimeout(r, ms));
}


export async function fetchTeamActivitySummary(scope: ProjectScope) {
  const token = Cookies.get("login_access_token_wrank");
  if (!token) throw new Error("Missing auth token");

  const res = await axios.get(
    `${BASE_URL_WR}backend-auth/team-details/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const members:any = res.data;
  
  // Build counts based on members
  return {
    counts: {
      total_active_members: members.filter(m =>
        m.projects.some(p => p.invitation_status === "Accepted")
      ).length,
      pending_invites: members.filter(m =>
        m.projects.some(p => p.invitation_status === "Pending")
      ).length,
      members_with_admin_role: members.filter(m =>
        m.projects.some(p =>
          p.dashboards.some(d => d.access.toLowerCase() === "admin")
        )
      ).length,
      owner_count: members.filter(m =>
        m.projects.some(p =>
          p.dashboards.some(d => d.access.toLowerCase() === "owner")
        )
      ).length,
      active_projects_assigned: new Set(
        members.flatMap(m =>
          m.projects
            .filter(p => p.invitation_status === "Accepted")
            .map(p => p.project_id)
        )
      ).size,
      multi_dashboard_users: members.filter(
        m => m.projects.flatMap(p => p.dashboards).length > 1
      ).length,
      inactive_users_30d: 0 // backend doesn't expose inactivity yet
    },
    last_generated_at: new Date().toISOString()
  };
}

/**
 * Mock export. Replace with:
 * GET /users/export?projects=...&status=active&format=csv
 */
export async function exportActiveMembersCsv(scope: ProjectScope): Promise<Blob> {
  await sleep(300);
  const header = ['user_id', 'name', 'email', 'status'].join(',');
  // Tiny sample; in real app, stream or backend export
  const rows = [
    'u_1,Sara Mehta,sara@agency.com,active',
    'u_2,John Patel,john@agency.com,active',
  ];
  const csv = [header, ...rows].join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

/****************************************
 * src/components/ui/KpiCard.tsx (inline)
 ****************************************/

type Tone = 'neutral' | 'brand' | 'warning' | 'danger';

export type KpiCardProps = {
  title: string;
  value: string | number;
  subtext?: string;
  tone?: Tone;
  onClick?: () => void;
  tooltip?: string;
  rightTag?: { text: string; tone?: Tone } | null;
  'aria-label'?: string;
};

const toneStyles: Record<Tone, React.CSSProperties> = {
  neutral: { background: '#F8FAFC', borderColor: '#EFF0F6' },
  brand: { background: '#F2FBFF', borderColor: '#CDEAF6' },
  warning: { background: '#FFF8E6', borderColor: '#FDE6B5' },
  danger: { background: '#FFF1F1', borderColor: '#FAD2D2' },
};

const tagTones: Record<Tone, React.CSSProperties> = {
  neutral: { color: '#374151', background: '#E5E7EB' },
  brand: { color: '#0C4A6E', background: '#CDEAF6' },
  warning: { color: '#92400E', background: '#FDE68A' },
  danger: { color: '#991B1B', background: '#FCA5A5' },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  tone = 'neutral',
  onClick,
  tooltip,
  rightTag,
  ...rest
}) => {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={(rest as any)['aria-label'] ?? title}
      style={{
        ...toneStyles[tone],
        border: '1px solid',
        borderRadius: 6,
        padding: 16,
        width: '100%',
        textAlign: 'left',
        cursor: clickable ? 'pointer' : 'default',
        display: 'grid',
        gridTemplateRows: 'auto auto',
        gap: 8,
        transition: 'box-shadow 120ms ease, transform 120ms ease',
      }}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        (e.currentTarget.style.boxShadow =
          '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)');
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.boxShadow = 'none');
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#111827',
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            flex: 1,
          }}
        >
          {title}
        </div>
        {rightTag ? (
          <span
            aria-hidden
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 999,
              ...tagTones[rightTag.tone ?? 'neutral'],
            }}
          >
            {rightTag.text}
          </span>
        ) : null}
      </div>
      <div>
        <div style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 800, color: '#0B1220' }}>
          {value}
        </div>
        {subtext ? (
          <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{subtext}</div>
        ) : null}
      </div>
    </button>
  );
};

/***********************************************************
 * src/sections/TeamActivitySummary/TeamActivitySummarySection
 ***********************************************************/

export type SummaryDrilldown =
  | 'members_active'
  | 'pending_invites'
  | 'admin_role'
  | 'projects_active'
  | 'multi_dash'
  | 'inactive_30d';

type SectionProps = {
  scope: ProjectScope; // 'all' | 'mine' | 'shared'
  onDrilldown?: (action: SummaryDrilldown) => void; // wire this to open other sections w/ filters
  className?: string;
};

export const TeamActivitySummarySection: React.FC<SectionProps> = ({
  scope,
  onDrilldown,
  className,
}) => {

  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const dispatch = useDispatch<any>();
  React.useEffect(() => { dispatch(fetchTeamDetails({ force:false })); }, [dispatch]);

  const data:any = useSelector(selectTeamSummary);
  const counts = data?.counts;
  const loading = !counts;

  function handleExport(){ const header=['user_id','name','email','status'].join(','); const rows=['u_1,Sara Mehta,sara@agency.com,active','u_2,John Patel,john@agency.com,active']; const csv=[header,...rows].join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`wranker-members-${scope}.csv`; a.click(); URL.revokeObjectURL(url); }



  const br = data?.breakdown;

  function handleDrill(a: SummaryDrilldown) {
    onDrilldown?.(a);
    // Optionally fire analytics here
  }

  return (
    <section className={className} aria-labelledby="team-activity-summary-title">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h2
            id="team-activity-summary-title"
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0B1220' }}
          >
            Team Activity Summary
          </h2>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Quick metrics for managing users and access
          </div>
        </div>

        <button
          type="button"
          aria-label="Refresh summary"
          title="Refresh"
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{
            border: '1px solid #EFF0F6',
            background: '#FFFFFF',
            color: '#374151',
            padding: '8px 10px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          ⟳
        </button>
        <button
          type="button"
          onClick={handleExport}
          style={{
            border: '1px solid #EFF0F6',
            background: '#FFFFFF',
            color: '#0B1220',
            padding: '8px 12px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Export Member List (CSV)
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 100,
                borderRadius: 6,
                border: '1px solid #EFF0F6',
                background:
                  'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 37%, #F3F4F6 63%)',
                backgroundSize: '400% 100%',
                animation: 'shimmerTeamSummary 1.2s ease-in-out infinite',
              }}
            />
          ))}
          <style>
            {`@keyframes shimmerTeamSummary {
                0% { background-position: 100% 0; }
                100% { background-position: 0 0; }
              }`}
          </style>
        </div>
      ) : error ? (
        <div
          role="alert"
          style={{
            border: '1px solid #FCA5A5',
            background: '#FFF1F1',
            color: '#991B1B',
            padding: 12,
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      ) : counts ? (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {/* Total Members */}
            <KpiCard
              title="Total Team Members"
              value={counts.total_active_members}
              subtext="Active users in scope"
              tone="brand"
              onClick={() => handleDrill('members_active')}
              aria-label="Total Team Members; opens Active Members with Status filter"
            />

            {/* Pending Invitations */}
            <KpiCard
              title="Pending Invitations"
              value={counts.pending_invites}
              subtext={
                counts.expired_invites && counts.expired_invites > 0
                  ? `${counts.expired_invites} expired`
                  : br?.stale_invites_3to6d && br.stale_invites_3to6d > 0
                  ? `${br.stale_invites_3to6d} stale`
                  : 'Awaiting acceptance'
              }
              tone={
                (counts.expired_invites ?? 0) > 0
                  ? 'danger'
                  : (br?.stale_invites_3to6d ?? 0) > 0
                  ? 'warning'
                  : 'neutral'
              }
              onClick={() => handleDrill('pending_invites')}
              rightTag={
                counts.expired_invites && counts.expired_invites > 0
                  ? { text: 'Expired', tone: 'danger' }
                  : undefined
              }
              aria-label="Pending Invitations; opens Pending Invitations section"
            />

            {/* Admins Assigned */}
            <KpiCard
              title="Members with Admin Role"
              value={counts.members_with_admin_role}
              subtext={
                counts.owner_count > 0
                  ? `${counts.owner_count} Owner(s) (not included)` +
                    ((br?.admin_without_recent_usage ?? 0) > 0
                      ? ` • ${br?.admin_without_recent_usage} inactive 30d`
                      : '')
                  : (br?.admin_without_recent_usage ?? 0) > 0
                  ? `${br?.admin_without_recent_usage} inactive 30d`
                  : undefined
              }
              tone="brand"
              rightTag={
                (br?.admin_without_recent_usage ?? 0) > 0
                  ? { text: 'Inactive admins', tone: 'warning' }
                  : null
              }
              onClick={() => handleDrill('admin_role')}
              aria-label="Members with Admin Role; filters Members table to Admin role"
            />

            {/* Active Projects */}
            <KpiCard
              title="Active Projects Assigned"
              value={counts.active_projects_assigned}
              subtext="Projects with active users"
              onClick={() => handleDrill('projects_active')}
              tone="neutral"
              aria-label="Active Projects Assigned; filters Members by contributing projects"
            />

            {/* Multi-Dashboard Users */}
            <KpiCard
              title="Users with Multi‑Dashboard Access"
              value={counts.multi_dashboard_users}
              subtext="Access to 2+ dashboards"
              onClick={() => handleDrill('multi_dash')}
              tone="neutral"
              aria-label="Multi-Dashboard users; filters Members by dashboards >= 2"
            />

            {/* Inactive Users 30+ */}
            <KpiCard
              title="Inactive Users (30+ days)"
              value={counts.inactive_users_30d}
              subtext="No login or activity in 30 days"
              tone={
                counts.inactive_users_30d >= 3
                  ? 'danger'
                  : counts.inactive_users_30d > 0
                  ? 'warning'
                  : 'neutral'
              }
              onClick={() => handleDrill('inactive_30d')}
              aria-label="Inactive users; filters Members to inactive 30+ days"
            />
          </div>

          {/* Optional Actions (right-aligned) */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                console.info('Open Activity Log (Phase 2)');
              }}
              style={{
                border: '1px solid #EFF0F6',
                background: '#FFFFFF',
                color: '#0B1220',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              View Full Activity Log
            </button>
            <button
              type="button"
              onClick={handleExport}
              style={{
                border: '1px solid #EFF0F6',
                background: '#FFFFFF',
                color: '#0B1220',
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Export Member List (CSV)
            </button>
          </div>

          {/* Generated At */}
          <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>Updated {new Date(data!.last_generated_at).toLocaleString()}</div>

        </>
      ) : null}
    </section>
  );
};

export const TeamActivitySummaryDemo: React.FC = () => {
  const [scope, setScope] = React.useState<ProjectScope>('all');
  const [lastAction, setLastAction] = React.useState<string>('');

  return (
    <div style={{ padding: 16, background: '#FFFFFF' }}>

      <TeamActivitySummarySection
        scope={scope}
        onDrilldown={(action) => {
          setLastAction(action);
          console.info('[DEMO] Drilldown:', action);
        }}
      />

      {lastAction ? (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: '#6B7280',
          }}
        >
          Last drilldown: <b>{lastAction}</b>
        </div>
      ) : null}
    </div>
  );
};

