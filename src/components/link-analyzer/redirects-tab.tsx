// components/link-analyzer/redirects-tab/index.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import RedirectsSummary from "./Redirecttab/RedirectsSummary"
import RedirectTableSection from "./Redirecttab/RedirectTableSection"
import RedirectChainVisualizerDemo from "./Redirecttab/RedirectChainVisualizer"
import RedirectSourcePageImpactDemo from "./Redirecttab/RedirectSourcePageImpactDemo"
import SmartSuggestionsSection from "./Redirecttab/SmartSuggestionsSection"
import Cookies from "js-cookie";
import { useProjectManager } from "@/src/hooks/use-project-manager"
import TabLoadingState from "./TabLoadingState"

type RedirectApi = {
  status: boolean
  message: string
  summary: {
    total_redirects: number
    by_hop_depth: { one_hop: number; two_hop: number; three_plus: number }
    types: { "301": number; "302_307": number; js: number; meta: number }
    internal_vs_external: { internal: number; external: number }
    chains: { chains: number; loops: number }
    invalid: { count: number }
  }
  rows: Array<{
    anchor_text: string
    source_page: string
    original_target_url: string
    redirect_chain?: Array<{
      url: string
      status_code: number
    }>
    final_destination_url: string
    redirect_type: "301" | "302/307" | "JS" | "Meta" | string
    chain_depth: number
    last_verified: string
    scope: "Internal" | "External" | string
  }>
  source_page_impact?: {
    items: Array<{
      source_page: string
      broken: number
      internal: number
      external: number
      c404: number
      c410: number
      timeout: number
      error: number
      s5xx: number
      severity: "Low" | "Moderate" | "High" | string
      last_crawled: string
      traffic_est: number | null
    }>
    thresholds?: { low: string; moderate: string; high: string }
  }
  trends?: {
    last_audits: Array<{
      t: string
      summary: {
        total_redirects: number
        by_hop_depth: { one_hop: number; two_hop: number; three_plus: number }
        types: { "301": number; "302_307": number; js: number; meta: number }
        internal_vs_external: { internal: number; external: number }
        chains: { chains: number; loops: number }
        invalid: { count: number } // server-side only has a single "count"
      }
    }>
  }
}
type ApiTrends = {
  hop1: number[]
  hop2: number[]
  hop3: number[]
  hop4p: number[]       // keep for forward-compat; fill with zeros if not present
  internal: number[]
  external: number[]
  chains: number[]
  loops: number[]
  invalidTo4xx: number[]  // map server "invalid.count" → to4xx (others stay 0)
  invalidTo5xx: number[]
  invalidNonHtml: number[]
  invalidOther: number[]
}

export default function RedirectsTab({ isActive }: { isActive: boolean }) {
  const { selectedProject } = useProjectManager()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RedirectApi | null>(null)

  useEffect(() => {
    if (!isActive || !selectedProject?.id) return;
  const token = Cookies.get("login_access_token_wrank");

    const ctrl = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(null); // important: clear previous project's snapshot

        const res = await fetch(
          `https://dashboard.wranker.com/api/redirect-info/${selectedProject.id}/`,
          { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: RedirectApi = await res.json();
        if (!ctrl.signal.aborted) setData(json);
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setError(e?.message || "Failed to load redirects.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => ctrl.abort();
  }, [isActive, selectedProject?.id]);

  // Normalize for child sections (using your section shapes)
  const summaryForCard = useMemo(() => {
    if (!data?.summary) return null
    const s = data.summary
    return {
      // map to RedirectsSummary expected props
      totalRedirects: s.total_redirects,
      hops: {
        hop1: s.by_hop_depth.one_hop,
        hop2: s.by_hop_depth.two_hop,
        hop3: s.by_hop_depth.three_plus, // treating 3+ as hop3 bucket in summary card
        hop4p: 0,                         // keep 0 unless backend adds explicit 4+ bucket
      },
      types: {
        http301: s.types["301"] ?? 0,
        http302: s.types["302_307"] ?? 0,
        js: s.types.js ?? 0,
        meta: s.types.meta ?? 0,
      },
      intExt: {
        internal: s.internal_vs_external.internal ?? 0,
        external: s.internal_vs_external.external ?? 0,
      },
      chains: s.chains.chains ?? 0,
      loops: s.chains.loops ?? 0,
      invalid: {
        to4xx: s.invalid.count ?? 0,
        to5xx: 0,
        nonHtml: 0,
        other: 0,
      },
    }
  }, [data])

  const trendsForCards: ApiTrends | null = useMemo(() => {
    const pts = data?.trends?.last_audits
    if (!pts || pts.length === 0) return null
    const hop1: number[] = []
    const hop2: number[] = []
    const hop3: number[] = []
    const hop4p: number[] = [] // server has only three_plus; keep 0 for 4+
    const internal: number[] = []
    const external: number[] = []
    const chains: number[] = []
    const loops: number[] = []
    const invalidTo4xx: number[] = []
    const invalidTo5xx: number[] = []
    const invalidNonHtml: number[] = []
    const invalidOther: number[] = []

    for (const p of pts) {
      hop1.push(p.summary.by_hop_depth.one_hop ?? 0)
      hop2.push(p.summary.by_hop_depth.two_hop ?? 0)
      hop3.push(p.summary.by_hop_depth.three_plus ?? 0)
      hop4p.push(0) // placeholder until backend provides a 4+ bucket
      internal.push(p.summary.internal_vs_external.internal ?? 0)
      external.push(p.summary.internal_vs_external.external ?? 0)
      chains.push(p.summary.chains.chains ?? 0)
      loops.push(p.summary.chains.loops ?? 0)
      // Map server "invalid.count" to to4xx trend; rest zero for now
      invalidTo4xx.push(p.summary.invalid.count ?? 0)
      invalidTo5xx.push(0)
      invalidNonHtml.push(0)
      invalidOther.push(0)
    }
    return {
      hop1, hop2, hop3, hop4p,
      internal, external,
      chains, loops,
      invalidTo4xx, invalidTo5xx, invalidNonHtml, invalidOther,
    }
  }, [data?.trends])

  const rowsForTable = useMemo(() => {
    if (!data?.rows) return []
    return data.rows.map((r, i) => ({
      id: `api-${i}`,
      anchor: r.anchor_text || "",
      anchorType: r.anchor_text ? "text" : "image",
      sourcePath: safePath(r.source_page),
      sourceUrl: r.source_page,
      originalTarget: r.original_target_url,
      finalUrl: r.final_destination_url,
      redirectType: (r.redirect_type),
      chainDepth: Math.min(3, Number(r.chain_depth || 1)),
      chain: buildChain(r),
      linkType: r.scope?.toLowerCase() === "internal" ? "internal" : "external",
      lastVerified: r.last_verified,
    }))
  }, [data])

  const impactItems = data?.source_page_impact?.items ?? []

  if (!isActive) return null

  if (loading && !data) {
    return <TabLoadingState />
  }

  return (
    <div className="space-y-4">
      {loading && <div className="p-4 border rounded">Loading redirects…</div>}
      {error && <div className="p-4 border rounded text-red-600">Error: {error}</div>}
      {!loading && !error && !data && (
        <div className="p-4 border rounded">No data yet for this project.</div>
      )}

      {summaryForCard && 
              <RedirectsSummary
          apiSummary={summaryForCard}
          apiTrends={trendsForCards ?? undefined}
        />}

      {rowsForTable && <RedirectTableSection apiRows={rowsForTable} />}

      {/* <RedirectChainVisualizerDemo /> */}

      {impactItems.length > 0 ? (
        <RedirectSourcePageImpactDemo apiItems={impactItems} />
      ) : null}

      {/* <SmartSuggestionsSection /> */}
    </div>
  )
}

/* helpers */
function safePath(url: string) {
  try {
    const u = new URL(url)
    return u.pathname || "/"
  } catch {
    return url
  }
}

function buildChain(r: RedirectApi["rows"][number]) {
  if (Array.isArray(r.redirect_chain) && r.redirect_chain.length > 0) {
    const normalized = r.redirect_chain
      .map((hop) => {
        if (!hop?.url) return null
        const status =
          typeof hop.status_code === "number"
            ? hop.status_code
            : Number.parseInt(String(hop.status_code), 10)
        if (!Number.isFinite(status)) return null
        return { url: hop.url, status }
      })
      .filter((hop): hop is { url: string; status: number } => Boolean(hop))

    if (normalized.length > 0) {
      return normalized
    }
  }

  const fallbackChain = [
    r.original_target_url
      ? {
          url: r.original_target_url,
          status: r.redirect_type?.includes("301") ? 301 : 302,
        }
      : null,
    r.final_destination_url ? { url: r.final_destination_url, status: 200 } : null,
  ].filter((hop): hop is { url: string; status: number } => Boolean(hop))

  return fallbackChain
}
