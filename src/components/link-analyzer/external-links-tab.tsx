"use client";

import React, { useEffect, useMemo, useState } from "react";
import ExternalLinksSummary from "./ExternalLinkTab/ExternalLinksSummary";
import ExternalLinksTable from "./ExternalLinkTab/ExternalLinksTable";
import ExternalLinksSmartSuggestionsSection from "./ExternalLinkTab/ExternalLinksSmartSuggestionsSection";
import TabLoadingState from "./TabLoadingState";

// ⬇️ Adjust this import if your hook lives elsewhere
// ⬇️ Uses the shared auth token (as used in other tabs)
import Cookies from "js-cookie";
import { useProjectManager } from "@/src/hooks/use-project-manager";

/** ---- API contracts (per your sample) ---- */
type ApiBucket = { key: string; count: number; percent?: number; label?: string };
type ApiSummary = {
  totals: { external_links: number };
  link_types_mix: { headline?: any; buckets: ApiBucket[] };
  anchor_text_mix: { headline?: any; buckets: ApiBucket[] };
  destination_status_codes: { errors_pct?: number; buckets: ApiBucket[] };
  link_risk_mix: { headline?: any; buckets: ApiBucket[] };
};
type ApiRow = {
  anchor_text: string;
  target_domain: string;
  target_url: string;
  link_type: "dofollow" | "nofollow" | "sponsored" | "ugc";
  source_pages: number;
  last_found: string; // ISO
};

// add below ApiRow
type ApiTrends = {
  last_audits: Array<{
    t: string;                 // ISO
    summary: ApiSummary;       // same shape as top-level "summary"
  }>;
};
type ApiMeta = {
  trend_points?: number;
  latest_audit_asof?: string;
};

type ApiResponse = {
  status: boolean;
  message: string;
  summary: ApiSummary;
  rows: ApiRow[];
  trends?: ApiTrends;
  meta?: ApiMeta;
};


function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function mapSummary(summary: ApiSummary, trends?: ApiTrends, meta?: ApiMeta) {
  // helpers to pull counts from bucket arrays
  const countsFrom = (b?: ApiBucket[]) =>
    Object.fromEntries((b ?? []).map(x => [x.key, Number(x.count ?? 0)]));

  const linkBuckets   = countsFrom(summary?.link_types_mix?.buckets);
  const anchorBuckets = countsFrom(summary?.anchor_text_mix?.buckets);
  const scBuckets     = countsFrom(summary?.destination_status_codes?.buckets);
  const riskBuckets   = countsFrom(summary?.link_risk_mix?.buckets);

  const total = Number(summary?.totals?.external_links ?? 0);

  // ---- Current snapshots (absolute counts) ----
  const linkTypesSnapshot = {
    dofollow: linkBuckets.dofollow ?? 0,
    nofollow: linkBuckets.nofollow ?? 0,
    sponsored: linkBuckets.sponsored ?? 0,
    ugc: linkBuckets.ugc ?? 0,
  };

  const anchorMixSnapshot = {
    brand: anchorBuckets.branded ?? 0,
    exact: anchorBuckets.exact ?? 0,          // not in sample, stays 0
    partial: anchorBuckets.phrase ?? 0,       // map "phrase" → partial
    generic: (anchorBuckets.generic ?? 0) + (anchorBuckets.unknown ?? 0),
    url: 0,                                   // not provided by API
    image: anchorBuckets.image ?? 0,
  };

    // ---- Anchor Mix (dynamic, use API keys verbatim) ----
  const anchorBucketsRaw = summary?.anchor_text_mix?.buckets ?? [];
  // snapshot counts by key
  const anchorSnapshotDynamic: Record<string, number> = Object.fromEntries(
    anchorBucketsRaw.map(b => [String(b.key), Number(b.count ?? 0)])
  );

  // build a stable key set across history + current
  const trendAudits = trends?.last_audits ?? [];
  const anchorKeySet = new Set<string>(anchorBucketsRaw.map(b => String(b.key)));
  for (const a of trendAudits) {
    for (const b of (a?.summary?.anchor_text_mix?.buckets ?? [])) {
      anchorKeySet.add(String(b.key));
    }
  }
  const anchorKeys = Array.from(anchorKeySet);

  // helper to convert one audit to a row with *all* keys present
  function auditAnchorRow(tISO: string, s: ApiSummary) {
    const counts = Object.fromEntries(
      (s?.anchor_text_mix?.buckets ?? []).map(b => [String(b.key), Number(b.count ?? 0)])
    );
    const row: any = { t: tISO };
    anchorKeys.forEach(k => { row[k] = counts[k] ?? 0; });
    return row;
  }

  const anchorHistory = (trends?.last_audits ?? [])
    .map(a => auditAnchorRow(a.t, a.summary))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());




  const statusSnapshot = {
    s2xx: scBuckets["2xx"] ?? 0,
    s3xx: scBuckets["3xx"] ?? 0,
    s4xx: scBuckets["4xx"] ?? 0,
    s5xx: scBuckets["5xx"] ?? 0,
    other: (scBuckets.timeout ?? 0) + (scBuckets.error ?? 0),
  };

  const riskSnapshot = {
    clean: riskBuckets.C ?? 0,
    suspicious: riskBuckets.S ?? 0,
    toxic: riskBuckets.T ?? 0,
  };

  // ---- Convert one audit summary → trend point (absolute counts) ----
  function auditToPoint(tISO: string, s: ApiSummary) {
    const LB = countsFrom(s?.link_types_mix?.buckets);
    const AB = countsFrom(s?.anchor_text_mix?.buckets);
    const SB = countsFrom(s?.destination_status_codes?.buckets);
    const RB = countsFrom(s?.link_risk_mix?.buckets);
    return {
      t: tISO,
      link: {
        dofollow: LB.dofollow ?? 0,
        nofollow: LB.nofollow ?? 0,
        sponsored: LB.sponsored ?? 0,
        ugc: LB.ugc ?? 0,
      },
      anchor: {
        brand: AB.branded ?? 0,
        exact: AB.exact ?? 0,
        partial: AB.phrase ?? 0,
        generic: (AB.generic ?? 0) + (AB.unknown ?? 0),
        url: 0,
        image: AB.image ?? 0,
      },
      status: {
        s2xx: SB["2xx"] ?? 0,
        s3xx: SB["3xx"] ?? 0,
        s4xx: SB["4xx"] ?? 0,
        s5xx: SB["5xx"] ?? 0,
        other: (SB.timeout ?? 0) + (SB.error ?? 0),
      },
      risk: {
        clean: RB.C ?? 0,
        suspicious: RB.S ?? 0,
        toxic: RB.T ?? 0,
      },
    };
  }

  // ---- Build history from API and append the current snapshot as the last point ----
  const history = (trends?.last_audits ?? [])
    .map(a => auditToPoint(a.t, a.summary))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  const latestT =
    meta?.latest_audit_asof ??
    (history.length ? history[history.length - 1].t : new Date().toISOString());

      const latestAnchorRow: any = { t: latestT };
  
  anchorKeys.forEach(k => { latestAnchorRow[k] = anchorSnapshotDynamic[k] ?? 0; });
  anchorHistory.push(latestAnchorRow);

  // Push "now" snapshot so cards compare prev vs current correctly
  history.push({
    t: latestT,
    link: linkTypesSnapshot,
    anchor: anchorMixSnapshot,
    status: statusSnapshot,
    risk: riskSnapshot,
  });

  // ---- Split into the shapes expected by ExternalLinksSummary ----
  const linkTypesTrend = history.map(h => ({ t: h.t, ...h.link }));
  const anchorMixTrend = history.map(h => ({ t: h.t, ...h.anchor }));
  const statusTrend    = history.map(h => ({ t: h.t, ...h.status }));
  const riskTrend      = history.map(h => ({ t: h.t, ...h.risk }));

  return {
    total,
    linkTypesSnapshot,
    linkTypesTrend,
    anchorKeys,
    anchorSnapshotDynamic,
    anchorHistory,
    statusSnapshot,
    statusTrend,
    riskSnapshot,
    riskTrend,
  };
}


/** Small classifier to match ExternalLinksTable “anchorType” */
function classifyAnchorType(a: string | null | undefined): "exact" | "branded" | "generic" | "image" {
  if (!a || a.trim().toLowerCase() === "no text") return "image";
  const s = a.trim().toLowerCase();
  if (/(click here|learn more|read more|here|more|this|source)/.test(s)) return "generic";
  if (/(w3era|wranker|upwork|whatsapp|x\.com|twitter|facebook|instagram|linkedin)/.test(s)) return "branded";
  // naive rule: single token keyword → “exact”; else treat as branded/generic above
  if (s.split(/\s+/).length === 1) return "exact";
  return "branded";
}

/** Map API rows → ExternalLinksTable Row[] */
function mapRows(rows: ApiRow[]) {
  return rows.map((r, i) => ({
    id: `el-${i + 1}`,
    anchor: r.anchor_text?.trim() || "[Image]",
    anchorType: classifyAnchorType(r.anchor_text),
    targetDomain: r.target_domain,
    targetUrl: r.target_url,
    linkType: r.link_type,
    sourceCount: r.source_pages,
    lastFound: r.last_found,
    flags: {
      // naive “overlinked” if many pages point to same domain
      overlinked: r.source_pages >= 20,
      disavowRecommended: false,
    },
  }));
}

const ExternalLinksTab = ({ isActive }: { isActive: boolean }) => {
  const { selectedProject } = useProjectManager()
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof mapSummary> | null>(null);
  const [tableRows, setTableRows] = useState<ReturnType<typeof mapRows> | null>(null);

  useEffect(() => {
    if (!isActive || !selectedProject) return;
  const token = Cookies.get("login_access_token_wrank");

    let aborted = false;
    async function run() {
      if (!selectedProject) return;
      setLoading(true);
      setErr(null);
      try {
        const url = `https://dashboard.wranker.com/api/external-links/${selectedProject.id}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (aborted) return;
        if (!json?.status) throw new Error(json?.message || "API error");
setSummary(mapSummary(json.summary, json.trends, json.meta));
setTableRows(mapRows(json.rows || []));
      } catch (e: any) {
        setErr(e?.message || "Failed to fetch external links.");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    run();
    return () => {
      aborted = true;
    };
  }, [isActive, selectedProject?.id]);

  if (loading && !summary && !tableRows) {
    return <TabLoadingState />;
  }

  return (
    <>
      <ExternalLinksSummary
        total={summary?.total}
        linkTypesSnapshot={summary?.linkTypesSnapshot ?? { dofollow: 0, nofollow: 0, sponsored: 0, ugc: 0 }}
        linkTypesTrend={summary?.linkTypesTrend ?? [{ t: todayISO(), dofollow: 0, nofollow: 0, sponsored: 0, ugc: 0 }]}
  anchorKeys={summary?.anchorKeys ?? []}
  anchorSnapshot={summary?.anchorSnapshotDynamic ?? {}}
  anchorTrend={summary?.anchorHistory ?? [{ t: todayISO() }]}
        statusSnapshot={summary?.statusSnapshot ?? { s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0, other: 0 }}
        statusTrend={summary?.statusTrend ?? [{ t: todayISO(), s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0, other: 0 }]}
        riskSnapshot={summary?.riskSnapshot ?? { clean: 0, suspicious: 0, toxic: 0 }}
        riskTrend={summary?.riskTrend ?? [{ t: todayISO(), clean: 0, suspicious: 0, toxic: 0 }]}
      />

      <ExternalLinksTable
        rows={tableRows ?? []}
        loading={loading}
        error={err}
      />

      {/* <ExternalLinksSmartSuggestionsSection /> */}
    </>
  );
};

export default ExternalLinksTab;
