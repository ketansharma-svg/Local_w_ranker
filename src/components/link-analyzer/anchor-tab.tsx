

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mapDistribution,
  mapSummary,
  mapUsage,
  buildTrendsFromInstances,
  generateSuggestionsFromLive,
  type AnchorInsightsAPI,
  type TableRow,
  fetchAnchorInsights
} from "./AnchorTab/anchors-data";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import AnchorTextInsightsSummary from "./AnchorTab/AnchorTextInsights";
import AnchorTypesDistribution from "./AnchorTab/AnchorTypesDistribution";
import AnchorsTrendsTab from "./AnchorTab/AnchorsTrendsTab";
import AnchorsUsageTable from "./AnchorTab/AnchorsUsageTable";
import AnchorsSmartSuggestionsSection from "./AnchorTab/SmartSuggestions";
import { BASE_URL_WR } from "@/src/util/api";
import Cookies from "js-cookie";
import TabLoadingState from "./TabLoadingState";



async function fetchAnchorTrendsAPI(projectId: any, days: number) {
    const token = Cookies.get("login_access_token_wrank");

  const res = await fetch(`${BASE_URL_WR}anchor-trends/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ project_id: projectId, days }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anchor trends failed (${res.status}) ${txt}`);
  }
  const json = await res.json();
  const series = Array.isArray(json?.points)
    ? json.points.map((p: any) => ({
      date: p?.t,                                // component expects "date"
      exact: Number(p?.counts?.exact ?? 0),
      phrase: Number(p?.counts?.phrase ?? 0),
      partial: Number(p?.counts?.partial ?? 0),
      branded: Number(p?.counts?.branded ?? 0),
      generic: Number(p?.counts?.generic ?? 0),
      empty: Number(p?.counts?.empty_image ?? 0), // map empty_image → empty
      total:
        Number(p?.counts?.total ??
          (Number(p?.counts?.exact ?? 0) +
            Number(p?.counts?.phrase ?? 0) +
            Number(p?.counts?.partial ?? 0) +
            Number(p?.counts?.branded ?? 0) +
            Number(p?.counts?.generic ?? 0) +
            Number(p?.counts?.empty_image ?? 0))),
    }))
    : [];

  return {
    series,
    totals: { totalAnchors: series.reduce((a: number, r: any) => a + (r.total || 0), 0) },
  };
}

export default function AnchorTab() {
  const { selectedProject } = useProjectManager();
  const [insights, setInsights] = useState<AnchorInsightsAPI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!selectedProject?.id) return;
    setLoading(true);
    fetchAnchorInsights({ projectId: selectedProject.id })
      .then((data) => { if (alive) { setInsights(data); setError(null); } })
      .catch((e) => { if (alive) setError(e.message || "Failed to load"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [selectedProject?.id]);

  const summary = useMemo(() => insights ? mapSummary(insights) : null, [insights]);
  const distribution = useMemo(() => insights ? mapDistribution(insights) : null, [insights]);
  const tableRows: TableRow[] = useMemo(() => insights ? mapUsage(insights) : [], [insights]);
  const trends = useMemo(() => insights ? buildTrendsFromInstances(insights, 30) : null, [insights]);
  const suggestions = useMemo(() => insights ? generateSuggestionsFromLive(insights) : [], [insights]);

  const summaryTrend = useMemo(() => {
    const pts = (insights as any)?.summary_trend?.points ?? [];
    if (!Array.isArray(pts) || pts.length === 0) return undefined;

    return {
      labels: pts.map((p: any) => p?.t ?? ""),
      aqs: pts.map((p: any) => Number(p?.summary?.aqs ?? 0)),
      adi: pts.map((p: any) => Number(p?.summary?.adi ?? 0)),
      overusedCount: pts.map((p: any) => Number(p?.summary?.overused_anchors ?? 0)),
      spamRiskPct: pts.map((p: any) => Number(p?.summary?.spam_risk?.risk_pct ?? 0)),
    };
  }, [insights]);

    const fetchTrends = useCallback(
    async (days: number) => {
      if (!selectedProject?.id) return { series: [], totals: { totalAnchors: 0 } };
      return fetchAnchorTrendsAPI(selectedProject.id, days);
    },
    [selectedProject?.id]
  );

  // ---------- Build KPI donut breakdowns from API ----------
const breakdowns = useMemo(() => {
  const s = (insights as any)?.summary ?? {};

  // AQS: show components as positive magnitudes; colouring hints
  const aqsParts = (() => {
    const base = Number(s?.aqs_breakdown?.weighted_type_average ?? 0);
    const penalty = Number(s?.aqs_breakdown?.penalties?.overuse_penalty ?? 0);
    const bonus = Number(s?.aqs_breakdown?.bonus?.diversification_bonus ?? 0);
    return [
      { label: "Type Avg", value: Math.max(0, base), color: "#3B82F6" },   // info blue
      { label: "Penalty", value: Math.max(0, penalty), color: "#EF4444" }, // danger red
      { label: "Bonus", value: Math.max(0, bonus), color: "#10B981" },     // success green
    ];
  })();

  // ADI: shares (%) across anchor types
  const adiShares = s?.adi_breakdown?.shares_pct ?? {};
  const adiParts = [
    { label: "Phrase",  value: Number(adiShares?.phrase ?? 0),  color: "#0077FF" },
    { label: "Branded", value: Number(adiShares?.branded ?? 0), color: "#10B981" },
    { label: "Generic", value: Number(adiShares?.generic ?? 0), color: "#F59E0B" },
    { label: "Image",   value: Number(adiShares?.image ?? 0),   color: "#8B5CF6" },
    { label: "Exact",   value: Number(adiShares?.exact ?? 0),   color: "#111827" },
    { label: "Partial", value: Number(adiShares?.partial ?? 0), color: "#06B6D4" },
    { label: "Empty",   value: Number(adiShares?.empty ?? 0),   color: "#9CA3AF" },
    { label: "Unknown", value: Number(adiShares?.unknown ?? 0), color: "#4B5563" },
  ];

  // Overused: breakdown by triggered rule (count of anchors triggering each)
  const overTop = Array.isArray(s?.overused_breakdown?.top) ? s.overused_breakdown.top : [];
  const triggerCounts: Record<string, number> = {};
  for (const row of overTop) {
    (row?.triggers ?? []).forEach((t: string) => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; });
  }
  const overParts = [
    { label: "Multi-target ≥3", value: Number(triggerCounts["multi_target_≥3"] || 0), color: "#F59E0B" },
    { label: "Repetition >10",  value: Number(triggerCounts["repetition_>10_same_target"] || 0), color: "#EF4444" },
    { label: "Share >40%",      value: Number(triggerCounts["share_>40%"] || 0), color: "#111827" },
  ];

  // Spam Risk mix (%)
  const mix = s?.spam_risk?.mix ?? {};
  const spamParts = [
    { label: "Toxic",      value: Number(mix?.toxic ?? 0),      color: "#EF4444" },
    { label: "Suspicious", value: Number(mix?.suspicious ?? 0), color: "#F59E0B" },
    { label: "Safe",       value: Number(mix?.safe ?? 0),       color: "#10B981" },
  ];

  return { aqs: aqsParts, adi: adiParts, overused: overParts, spam: spamParts };
}, [insights]);


  if (error) return <div className="p-4 text-red-600">Anchors failed: {error}</div>;
  if (loading || !insights) return <div className="p-4"><TabLoadingState /></div>;

  return (
    <div className="space-y-6">
      {/* Summary KPI cards */}
      <AnchorTextInsightsSummary
        summaryOverride={{
          aqs: summary!.aqs,
          adi: summary!.adi,
          overusedCount: summary!.overusedCount,
          spamRiskPct: summary!.spamRiskPct,
        }}
        historyOverride={summaryTrend}
          breakdownsOverride={breakdowns}

      />
      {/* Distribution stacked bars */}
      <AnchorTypesDistribution
        distributionOverride={{
          total: distribution!.total,
          rows: distribution!.rows.map(r => ({ type: r.type, label: r.label, pct: r.pct, count: r.count })),
        }}
      />
      {/* Trends from instances.last_found (last 30 days) */}
      <AnchorsTrendsTab fetchTrends={fetchTrends}  />

      {/* Usage table (+ instances included) */}
      <AnchorsUsageTable rowsOverride={tableRows} />

      {/* Smart suggestions generated heuristically from live data */}
      {/* <AnchorsSmartSuggestionsSection suggestionsOverride={suggestions} /> */}
    </div>
  );
}
