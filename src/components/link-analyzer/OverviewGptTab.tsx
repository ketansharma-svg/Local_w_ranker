
import React, { useEffect, useMemo, useState } from "react";
import OverviewKpiSummary from "./overviewgpt/OverviewKpiSummary";
import InternalLinkDistributionSection from "./overviewgpt/InternalLinkDistributionSection";
import LinkAnalyzerFilterRowAndTable from "./overviewgpt/LinkAnalyzerFilterRowAndTable";
import AnchorTextInsightsDemo from "./overviewgpt/AnchorTextInsightsDemo";
import InterlinkScoreDistribution from "./overviewgpt/InterlinkScoreDistribution";
import Cookies from "js-cookie";
import TabLoadingState from "./TabLoadingState";

type ApiShape = {
  status: boolean;
  message: string;
  kpis: {
    dils: { score: number; components: Record<string, number> };
    totals: {
      pages: number;
      anchor_types_unique: number;
      orphans: number;
      broken_links: number;
    };
  };
  distribution: {
    bars: Array<{ depth: number; pages: number; avg_pils: number; orphans?: number; sample_pages?: string[] }>;
    notes?: { interlinked_pct?: number };
    orphans_total?: number;
    pages_total?: number;
  };
  interlink_score_distribution: any
  top_linked_pages: { total: number; rows: any[] };
  anchor_text_insights?: {
    distribution?: { total: number; buckets: Array<{ key: string; count: number; percent: number }> };
    top_repeated?: Array<{ anchor: string; count: number }>;
  };
    trends?: {
    overview?: Array<{
      t: string;
      kpis: {
        pages: number;
        orphans: number;
        broken_links: number;
        anchor_types_unique?: number;
        dils: {
          score: number;
          components: {
            PILS: number;
            AQS: number;
            AnchorBonus?: number;
            OrphanPenalty?: number;
            RedirectPenalty?: number;
          };
        };
      };
    }>;
    total_pages?: Array<{ t: string; v: number }>;
    orphans?: Array<{ t: string; v: number }>;
    broken_links?: Array<{ t: string; v: number }>;
    dils?: Array<{ t: string; v: number }>;
  };
  meta?: { latest_audit_at?: string; trend_points?: number };
};

function toSummaryDTO(json: ApiShape) {
  const dils = json?.kpis?.dils?.score ?? 0;
  const comps = json?.kpis?.dils?.components || {};

  // ---- trends wiring (safe defaults) ----
  const totalPages = (json.trends?.total_pages ?? []).map(p => Number(p.v));
  const orphans = (json.trends?.orphans ?? []).map(p => Number(p.v));
  const broken = (json.trends?.broken_links ?? []).map(p => Number(p.v));
  const dilsSeries = (json.trends?.dils ?? []).map(p => Number(p.v));

  // For anchors + component-level series, use the richer 'overview' array
  const ov = json.trends?.overview ?? [];
  const labels = ov.map(x => x.t);
  const anchorsUnique = ov.map(x => Number(x.kpis?.anchor_types_unique ?? 0));
  const pilsSeries = ov.map(x => Number(x.kpis?.dils?.components?.PILS ?? 0));
  const aqsSeries = ov.map(x => Number(x.kpis?.dils?.components?.AQS ?? 0));
  const orphanPenaltySeries = ov.map(x => Number(x.kpis?.dils?.components?.OrphanPenalty ?? 0));
  const redirectPenaltySeries = ov.map(x => Number(x.kpis?.dils?.components?.RedirectPenalty ?? 0));

  return {
    dils,
    dilsDelta: 0,

    avgPageScore: Number(comps.PILS ?? 0),
    aqsScore: Number(comps.AQS ?? 0),
    anchorBonus: Number(comps.AnchorBonus ?? 0),
    orphanPenalty: -Math.abs(Number(comps.OrphanPenalty ?? 0)),
    redirectPenalty: -Math.abs(Number(comps.RedirectPenalty ?? 0)),

    totalPages: Number(json?.kpis?.totals?.pages ?? 0),
    orphanPages: Number(json?.kpis?.totals?.orphans ?? 0),
    orphanPct:
      json?.distribution?.pages_total
        ? (Number(json?.distribution?.orphans_total ?? json?.kpis?.totals?.orphans ?? 0) /
           Number(json?.distribution?.pages_total)) || 0
        : 0,
    uniqueAnchorTypes: Number(json?.kpis?.totals?.anchor_types_unique ?? 0),
    brokenLinks: Number(json?.kpis?.totals?.broken_links ?? 0),

    depthBuckets: undefined,
    anchorTypes: undefined,
    danglingPages: undefined,
    brokenBreakdown: undefined,

    // NEW: pass trend arrays + time labels to KPI Summary
    trends: {
      labels,                 // ISO strings; KPI comp will pretty-format
      pages: totalPages.length ? totalPages : ov.map(x => Number(x.kpis?.pages ?? 0)),
      anchorsUnique,
      orphans: orphans.length ? orphans : ov.map(x => Number(x.kpis?.orphans ?? 0)),
      broken: broken.length ? broken : ov.map(x => Number(x.kpis?.broken_links ?? 0)),
      dils: dilsSeries.length ? dilsSeries : ov.map(x => Number(x.kpis?.dils?.score ?? 0)),
      pils: pilsSeries,
      aqs: aqsSeries,
      orphanPenalty: orphanPenaltySeries,
      redirectPenalty: redirectPenaltySeries,
    },

    lastUpdated: json?.meta?.latest_audit_at ?? new Date().toISOString(),
  };
}


function toDistributionProps(json: ApiShape) {
  const bars = (json?.distribution?.bars ?? []).map(b => ({
    depth: Number(b.depth),
    pages: Number(b.pages) || 0,
    avgPils: Number(b.avg_pils ?? 0),
    orphans: Number(b.orphans ?? 0),
    samplePages: b.sample_pages
  }));
  return {
    data: bars,
    lastCrawled: new Date() // or json.distribution.last_crawled if provided later
  };
}

function toTopLinkedRows(json: ApiShape) {
  const rows = (json?.top_linked_pages?.rows ?? []).map((r: any, i: number) => {
    const pils = Number(r?.pils ?? 0);
    const sparkBase = isFinite(pils) ? pils : 0;

    return {
      id: r?.url ?? String(i),
      pageId: r?.url ?? String(i),
      url: r?.url ?? "",
      title: r?.path ?? "",
      pageType: r?.page_type ?? "Page",
      depth: Number(r?.depth ?? 0),
      inlinks: Number(r?.inlinks ?? 0),
      outlinks: Number(r?.outlinks ?? 0),
      pils: Number(r?.pils ?? 0),
      aqs: Number(r?.aqs ?? 0),
      status: r?.status ?? "healthy",
      anchorTypes: [],               // API doesn’t provide; UI tolerates empty
      orphan: (r?.status ?? "") === "orphan",
      trendSparkline: [sparkBase - 2, sparkBase - 1, sparkBase, sparkBase + 1].map(n =>
        Number.isFinite(n) ? n : 0
      ),
    };
  });
  return rows;
}

function toInterlinkDistribution(json: ApiShape | null) {
  const dist = json?.interlink_score_distribution;
  if (!dist) return null;

  // brand colours per band (matches existing visual language)
  const COLORS: Record<string, string> = {
    poor: "#FF4C4C",
    fair: "#FFA500",      // “Average/Fair”
    good: "#008CCD",
    excellent: "#0077FF",
  };

  return {
    totalPages: Number(dist.total_pages ?? 0),
    lastUpdated: new Date().toISOString(),
    buckets: (dist.bands || []).map(b => ({
      range: b.range,                  // "0–59"
      label: b.label,                  // Poor | Fair | Good | Excellent
      color: COLORS[b.key] || "#0077FF",
      pages: Number(b.count || 0),
      avgAqs: Number(b.avg_aqs || 0),
      samplePages: Array.isArray(b.sample_pages) ? b.sample_pages : [], // <— NEW
    })),
  };
}


export default function OverviewGptTab({ projectId }: { projectId?: string | number }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiShape | null>(null);

useEffect(() => {
  if (!projectId) return;

  const ctrl = new AbortController();

  (async () => {
    try {
      setLoading(true);
      setErr(null);
      setData(null);               
  const token = Cookies.get("login_access_token_wrank");
      const res = await fetch(
        `https://dashboard.wranker.com/api/inlink-overview/${projectId}/`, // ← ensure trailing slash if your API expects it
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
          signal: ctrl.signal,        // ← abort support
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiShape;
      if (!ctrl.signal.aborted) setData(json);
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      setErr(e?.message || "Failed to load overview.");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  })();

  return () => ctrl.abort();          // ← abort on id change/unmount
}, [projectId]);


  const summaryDTO = useMemo(() => (data ? toSummaryDTO(data) : null), [data]);
  const tableRows = useMemo(() => (data ? toTopLinkedRows(data) : []), [data]);
  const distProps = useMemo(() => (data ? toDistributionProps(data) : null), [data]);


  // Anchors mapping for AnchorTextInsightsDemo
  const anchorDistribution = useMemo(() => {
    const d = data?.anchor_text_insights?.distribution;
    if (!d?.total || !Array.isArray(d?.buckets)) return null;
    return {
      totalAnchors: Number(d.total),
      segments: d.buckets.map(b => ({
        type: String(b.key),
        count: Number(b.count),
        pct: Number(b.percent),
        avgAqs: undefined
      }))
    };
  }, [data]);

  const topAnchors = useMemo(() => {
    const t = data?.anchor_text_insights?.top_repeated || [];
    return t.map(x => ({
      anchor: x.anchor,
      uses: Number(x.count),
      linkedPages: undefined,
      avgAqs: undefined,
      usagePct: undefined
    }));
  }, [data]);

  if (loading && !data) {
    return <TabLoadingState />;
  }

  return (
    <div className="space-y-6">
      {summaryDTO && <OverviewKpiSummary projectId={String(projectId ?? "")} initialData={summaryDTO} />
      }
      {/* Depth distribution (Bars + dotted line) */}
      {distProps && (
        <InternalLinkDistributionSection
          projectId={String(projectId ?? "")}
          data={distProps.data}
          lastCrawled={distProps.lastCrawled}
        />
      )}


      {/* Top linked pages table */}
      <LinkAnalyzerFilterRowAndTable
        projectId={String(projectId ?? "")}
        data={tableRows}
        loading={!data}

      />

      {/* Anchors: pass data if present; component keeps demo fallback when null */}
      {anchorDistribution && (
        <AnchorTextInsightsDemo
          distribution={anchorDistribution}
          topAnchors={topAnchors || []}
        />
      )}


      {/* Keep these as-is (demo visuals) */}
      {data?.interlink_score_distribution && (
        <InterlinkScoreDistribution payload={toInterlinkDistribution(data)} />
      )}
    </div>
  );
}
