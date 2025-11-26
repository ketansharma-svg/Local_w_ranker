"use client";

import React, { useEffect, useRef, useState } from "react";
import LeftRailDemo from "./LinkMap/LeftRailDemo";
import LinkMapKpiSection from "./LinkMap/LinkMapKpiSection";
import LinkMapCanvasDemo from "./LinkMap/LinkMapCanvasDemo";
// import RightInspectorDemo from "./LinkMap/drawers/RightInspectorDemo";
import Cookies from "js-cookie";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import TabLoadingState from "./TabLoadingState";
import RightInspectorDemo from "./LinkMap/drawers/RightInspectorDemo";

type ApiKpis = {
  node_coverage: { active: number; redirect: number; error: number; total: number };
  link_health: { ok: number; redirected: number; broken: number; total: number };
  orphans: { orphan: number; dangling: number; connected: number; total: number };
  pils_quality: { high: number; mid: number; low: number; avg: number };
};
type ApiNode = {
  id: string;
  url: string;
  label: string;
  pils: number;
  aqs: number;
  inlinks: number;
  outlinks: number;
  depth: number;
  status: "active" | "redirect" | "error";
  conn: "connected" | "dangling" | "orphan";
  is_hub: boolean;
  traffic: number | null;
};
type ApiEdge = {
  source: string;
  target: string;
  rel: "dofollow" | "nofollow" | "sponsored" | "ugc";
  weight: number;
  anchors: string[];
};
type ApiAudit = {
  t: string;
  kpis: ApiKpis;
};

type ApiTrends = {
  last_audits: ApiAudit[];
};
type ApiResponse = {
  status: boolean;
  message: string;
  kpis: ApiKpis;
  nodes: ApiNode[];
  edges: ApiEdge[];
  trends?: ApiTrends; 
};

function mapNodesForRail(apiNodes: ApiNode[]) {
  return apiNodes.map((n) => ({
    id: n.id,
    url: n.url,
    path: `/${n.label}`.replace("//", "/"),
    title: n.label || n.url,
    pils: Number(n.pils?.toFixed(1)),
    aqs: Number(n.aqs?.toFixed(0)),
    inlinks: n.inlinks ?? 0,
    outlinks: n.outlinks ?? 0,
    status: [
      ...(n.conn === "orphan" ? ["orphan"] : []),
      ...(n.status === "redirect" ? ["redirect"] : []),
      ...(n.status === "error" ? ["broken"] : []),
    ] as Array<"orphan" | "redirect" | "broken">,
    priority: false,
  }));
}

function mapGraph(apiNodes: ApiNode[], apiEdges: ApiEdge[]) {
  const nodes = apiNodes.map((n) => ({
    id: n.id,
    url: n.url,
    title: n.label,
    pils: n.pils,
    aqs: n.aqs,
    inlinks: n.inlinks ?? 0,
    outlinks: n.outlinks ?? 0,
    depth: n.depth ?? 0,
    status: [], // canvas colours use scores/depth; edge status drives link colour
  }));
  let i = 0;
  const links = apiEdges.map((e) => ({
    id: `e${++i}`,
    source: e.source,
    target: e.target,
    weight: e.weight ?? 1,
    status: "ok" as "ok" | "redirect" | "broken", // per-edge status not provided → default ok
  }));
  return { nodes, edges: links };
}

function mapKpisForCards(k: ApiKpis) {
  const today = new Date().toISOString();
  const nodesTotal = k.node_coverage.total;
  const edgesTotal = k.link_health.total;

  return {
    snapshot: {
      nodes: {
        active: k.node_coverage.active,
        redirects: k.node_coverage.redirect,
        errors: k.node_coverage.error,
        total: nodesTotal,
      },
      edges: {
        ok: k.link_health.ok,
        redirected: k.link_health.redirected,
        broken: k.link_health.broken,
        total: edgesTotal,
      },
      orphans: {
        orphan: k.orphans.orphan,
        dangling: k.orphans.dangling,
        connected: k.orphans.connected,
        total: k.orphans.total,
      },
      pils: {
        avg: k.pils_quality.avg,
        buckets: {
          high: k.pils_quality.high,
          mid: k.pils_quality.mid,
          low: k.pils_quality.low,
        },
      },
    },
    trends: {
      historyDates: [today],
      nodesTotal: [nodesTotal],
      edgesTotal: [edgesTotal],
      avgPils: [k.pils_quality.avg],
      orphanPct: [k.orphans.orphan / Math.max(1, k.orphans.total)],
      brokenPct: [k.link_health.broken / Math.max(1, edgesTotal)],
      redirectPct: [k.link_health.redirected / Math.max(1, edgesTotal)],
    },
  };
}
function mapSnapshotForCards(k: ApiKpis) {
  const nodesTotal = k.node_coverage.total;
  const edgesTotal = k.link_health.total;

  return {
    nodes: {
      active: k.node_coverage.active,
      redirects: k.node_coverage.redirect,
      errors: k.node_coverage.error,
      total: nodesTotal,
    },
    edges: {
      ok: k.link_health.ok,
      redirected: k.link_health.redirected,
      broken: k.link_health.broken,
      total: edgesTotal,
    },
    orphans: {
      orphan: k.orphans.orphan,
      dangling: k.orphans.dangling,
      connected: k.orphans.connected,
      total: k.orphans.total,
    },
    pils: {
      avg: k.pils_quality.avg,
      buckets: {
        high: k.pils_quality.high,
        mid: k.pils_quality.mid,
        low: k.pils_quality.low,
      },
    },
  };
}

function buildTrendsFromAudits(trends: ApiTrends | undefined, fallback: ApiKpis) {
  const audits = (trends?.last_audits ?? []).slice().sort((a, b) => {
    return new Date(a.t).getTime() - new Date(b.t).getTime();
  });

  if (audits.length === 0) {
    const nodesTotal = fallback.node_coverage.total;
    const edgesTotal = fallback.link_health.total;
    return {
      historyDates: [new Date().toISOString()],
      nodesTotal: [nodesTotal],
      edgesTotal: [edgesTotal],
      avgPils: [fallback.pils_quality.avg],
      orphanPct: [fallback.orphans.orphan / Math.max(1, fallback.orphans.total)],
      brokenPct: [fallback.link_health.broken / Math.max(1, edgesTotal)],
      redirectPct: [fallback.link_health.redirected / Math.max(1, edgesTotal)],
    };
  }

  const historyDates: string[] = [];
  const nodesTotal: number[] = [];
  const edgesTotal: number[] = [];
  const avgPils: number[] = [];
  const orphanPct: number[] = [];
  const brokenPct: number[] = [];
  const redirectPct: number[] = [];

  for (const a of audits) {
    const k = a.kpis;
    const nTot = k.node_coverage.total;
    const eTot = k.link_health.total;

    historyDates.push(a.t);
    nodesTotal.push(nTot);
    edgesTotal.push(eTot);
    avgPils.push(k.pils_quality.avg);
    orphanPct.push(k.orphans.orphan / Math.max(1, k.orphans.total));
    brokenPct.push(k.link_health.broken / Math.max(1, eTot));
    redirectPct.push(k.link_health.redirected / Math.max(1, eTot));
  }

  return { historyDates, nodesTotal, edgesTotal, avgPils, orphanPct, brokenPct, redirectPct };
}


const LinkMapTab = ({ isActive }: { isActive: boolean }) => {
  const { selectedProject } = useProjectManager();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [railNodes, setRailNodes] = useState<any[] | null>(null);
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [cards, setCards] = useState<any | null>(null);
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);


  // Sequence guard to ensure only the latest request updates state
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!isActive || !selectedProject?.id) return;

    // Start a fresh request cycle
    requestSeq.current += 1;
    const seq = requestSeq.current;
    const controller = new AbortController();

    // Reset view so we never show the previous project's data
    setLoading(true);
    setError(null);
    setRailNodes(null);
    setGraph(null);
    setCards(null);

    const projectId = selectedProject.id; // capture primitive for the closure
  const token = Cookies.get("login_access_token_wrank");

    (async () => {
      try {
        const url = `https://dashboard.wranker.com/api/linkmap-analysis/${projectId}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!json?.status) throw new Error(json?.message || "API error");

        // Only the latest in-flight request may set state
        if (seq === requestSeq.current) {
          setRailNodes(mapNodesForRail(json.nodes));
          setGraph(mapGraph(json.nodes, json.edges)); // no stale closures; pure mapping
const snapshot = mapSnapshotForCards(json.kpis);
const trendSeries = buildTrendsFromAudits(json.trends, json.kpis);
setCards({ snapshot, trends: trendSeries });
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (seq === requestSeq.current) {
          setError(e?.message || "Failed to load link map.");
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    })();

    // Cancel the request if the tab deactivates or project changes again
    return () => controller.abort();
  }, [isActive, selectedProject?.id]);

  const projectKey = String(selectedProject?.id ?? "none");

  if (!isActive) {
    return null;
  }

  if (loading && !railNodes && !graph && !cards) {
    return <TabLoadingState />;
  }

  return (
    <div className="w-full h-screen flex">
      {/* Left Rail — re-mount on project change to clear internal state */}
      {railNodes && (
        <LeftRailDemo
          key={`rail-${projectKey}`}
          nodes={railNodes}
          loading={loading}
          error={error ?? undefined}
                    onOpenInspector={(n:any) => setFocusNodeId(n?.id)}
          onCenterNode={(n:any) => setFocusNodeId(n?.id)}
        />
      )}

      <main className="flex-1 min-w-0">
        {/* KPI cards — re-mount on project change */}
        {cards && (
          <LinkMapKpiSection
            key={`kpi-${projectKey}`}
            kpis={cards.snapshot}
            trends={cards.trends}
            loading={loading}
            error={error ?? undefined}
          />
        )}

        {/* Canvas — force full re-init on project change */}
        {graph && (
          <LinkMapCanvasDemo
            key={`canvas-${projectKey}`}
            graph={graph}
            focusNodeId={focusNodeId}
            onSelectNode={(n:any) => setFocusNodeId(n?.id)}
          />
        )}      </main>

      {/* <RightInspectorDemo /> */}
    </div>
  );
};

export default LinkMapTab;
