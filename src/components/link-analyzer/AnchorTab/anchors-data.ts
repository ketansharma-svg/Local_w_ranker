import Cookies from "js-cookie";

export type AnchorBucketKey =
  | "exact" | "phrase" | "partial" | "branded" | "generic" | "image" | "empty" | "unknown";

export type AnchorBucket = { key: AnchorBucketKey; count: number; percent: number };

export type AnchorInstanceAPI = {
  source_page: string;
  snippet: string;
  target_url: string;
  rel_type: "dofollow" | "nofollow";
  last_found: string; // "YYYY-MM-DD" or "—"
};

export type AnchorUsageRowAPI = {
  anchor: string;
  type: [AnchorBucketKey | "image", boolean]; // e.g. ["phrase", false]
  total_links: number;
  internal: number;
  external: number;
  pages_using: number;
  target_pages: number;
  aqs: number | null;
  last_found: string; // "—" or ISO-ish
  instances?: { total: number; rows: AnchorInstanceAPI[] };
};

export type AnchorInsightsAPI = {
  status: boolean;
  message: string;
  distribution: { total: number; buckets: AnchorBucket[] };
  summary: {
    aqs: number;          // Anchor Quality Score
    adi: number;          // Anchor Diversity Index
    overused_anchors: number;
    spam_risk: { risk_pct: number; mix: { safe: number; suspicious: number; toxic: number } };
  };
  usage: {
    total: number;
    page: number;
    page_size: number;
    rows: AnchorUsageRowAPI[];
  };
};

export async function fetchAnchorInsights(opts: {
  projectId: string | number;
  baseUrl?: string;
  signal?: AbortSignal;
}): Promise<AnchorInsightsAPI> {
  const token = Cookies.get("login_access_token_wrank") || "";
  const { projectId, baseUrl = "https://dashboard.wranker.com", signal } = opts;
  const res = await fetch(`${baseUrl}/api/anchor-insights/${projectId}/`, {
    method: "GET",
    credentials: "include",
        headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal
  });

  if (!res.ok) throw new Error(`Anchor insights failed: ${res.status} ${res.statusText}`);
  return res.json();
}

/* ------------------------------ MAPPERS ------------------------------ */

export type SectionDistributionRow = { type: string; label: string; pct: number; count: number };
const LABELS: Record<string, string> = {
  exact: "Exact Match",
  phrase: "Phrase Match",
  partial: "Partial Match",
  branded: "Branded",
  generic: "Generic",
  image_only: "Image Only",
};

export function mapDistribution(api: AnchorInsightsAPI): { total: number; rows: SectionDistributionRow[] } {
  const { total, buckets } = api.distribution ?? { total: 0, buckets: [] };
  // Merge image + empty under a single "Image Only" band used in your UI.
  const grouped: Record<string, { count: number; percent: number }> = {};
  for (const b of buckets || []) {
    const key = b.key === "image" || b.key === "empty" ? "image_only" : b.key;
    if (!grouped[key]) grouped[key] = { count: 0, percent: 0 };
    grouped[key].count += Number(b.count || 0);
    grouped[key].percent += Number(b.percent || 0);
  }
  return {
    total,
    rows: Object.entries(grouped).map(([k, v]) => ({
      type: k,
      label: LABELS[k] ?? k,
      pct: v.percent,
      count: v.count || Math.round((v.percent / 100) * (total || 0)),
    })),
  };
}

/** Table rows expected by AnchorsUsageTable */
export type TableRow = {
  anchorId: string;
  anchorText: string;
  anchorType: "exact" | "phrase" | "partial" | "branded" | "generic" | "empty";
  totalLinks: number;
  internal: number;
  external: number;
  pagesUsing: number;
  targetPages: number;
  aqs: number;
  lastFound: string; // ISO
  nofollow?: boolean;
  instances?: {
    sourcePage: string;
    snippet: string;
    targetUrl: string;
    linkType: "follow" | "nofollow";
    lastFound: string;
  }[];
};

const toISO = (d: string) => (d && d !== "—" ? `${d}T00:00:00Z` : new Date(0).toISOString());

export function mapUsage(api: AnchorInsightsAPI): TableRow[] {
  const rows:any = api.usage?.rows ?? [];
  return rows.map((r, i) => {
    const t = r.type?.[0] ?? "generic";
    const typeNorm = (t === "image" || t === "empty" ? "empty" : t) as TableRow["anchorType"];
    const id = `${t}:${r.anchor}:${i}`;
    const instances = r.instances?.rows?.map((x) => ({
      sourcePage: x.source_page,
      snippet: x.snippet,
      targetUrl: x.target_url,
      linkType: x.rel_type === "dofollow" ? "follow" : "nofollow",
      lastFound: toISO(x.last_found),
    }));
    return {
      anchorId: id,
      anchorText: r.anchor || "(No Text)",
      anchorType: typeNorm,
      totalLinks: r.total_links ?? 0,
      internal: r.internal ?? 0,
      external: r.external ?? 0,
      pagesUsing: r.pages_using ?? 0,
      targetPages: r.target_pages ?? 0,
      aqs: r.aqs ?? 0,
      lastFound: toISO(r.last_found),
      nofollow: false,
      instances,
    };
  });
}

/** Summary props for the KPI cards */
export function mapSummary(api: AnchorInsightsAPI) {
  const s = api.summary;
  return {
    aqs: s?.aqs ?? 0,
    adi: s?.adi ?? 0,
    overusedCount: s?.overused_anchors ?? 0,
    spamRiskPct: s?.spam_risk?.risk_pct ?? 0,
  };
}

/** Build a simple daily time‑series (# anchors by type) from instance last_found dates */
export function buildTrendsFromInstances(api: AnchorInsightsAPI, days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  // Seed all days
  const byDay: Record<string, Record<"exact"|"phrase"|"partial"|"branded"|"generic"|"empty", number>> = {};
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    byDay[key] = { exact: 0, phrase: 0, partial: 0, branded: 0, generic: 0, empty: 0 };
  }

  for (const row of api.usage?.rows ?? []) {
    const t0 = (row.type?.[0] ?? "generic") as AnchorBucketKey;
    const type = (t0 === "image" || t0 === "empty" ? "empty" : t0) as keyof (typeof byDay)[string];
    for (const inst of row.instances?.rows ?? []) {
      if (!inst.last_found || inst.last_found === "—") continue;
      const iso = inst.last_found; // "YYYY-MM-DD"
      const inRange = iso >= start.toISOString().slice(0, 10) && iso <= end.toISOString().slice(0, 10);
      if (!inRange) continue;
      const k = iso;
      if (!byDay[k]) continue;
      byDay[k][type] += 1;
    }
  }

  const series = Object.keys(byDay).sort().map((date) => {
    const r = byDay[date];
    const total = r.exact + r.phrase + r.partial + r.branded + r.generic + r.empty;
    return { date, ...r, total };
  });

  return { series, totals: { totalAnchors: series.reduce((a, r) => a + r.total, 0) } };
}

/** Simple heuristics → Smart Suggestions from live data */
export function generateSuggestionsFromLive(api: AnchorInsightsAPI) {
  const dist = mapDistribution(api).rows;
  const genericPct = dist.find((d) => d.type === "generic")?.pct ?? 0;
  const imagePct = dist.find((d) => d.type === "image_only")?.pct ?? 0;
  const brandedPct = dist.find((d) => d.type === "branded")?.pct ?? 0;
  const exactPct = dist.find((d) => d.type === "exact")?.pct ?? 0;

  const suggestions: any[] = [];

  if (genericPct >= 15) {
    suggestions.push({
      id: "s-generic",
      title: "Too many generic anchors (e.g. “click here”)",
      desc: `Generic anchors at ${genericPct.toFixed(1)}%. Replace with descriptive, intent‑rich phrases.`,
      impact: "high", confidence: "high",
      metrics: { genericPct },
      examples: (api.usage.rows || [])
        .filter(r => r.type?.[0] === "generic")
        .slice(0, 2).map(r => ({ anchor: r.anchor, page: r.instances?.rows?.[0]?.source_page })),
      actions: { canCreateTask: true, canSuggestRewrites: true, canReplace: true },
      provenance: { crawlId: "live" }, generatedAt: new Date().toISOString(), category: "Anchor-related" as const,
    });
  }
  if (exactPct >= 30) {
    suggestions.push({
      id: "s-exact",
      title: "High exact‑match ratio — risk of over‑optimisation",
      desc: `Exact‑match anchors at ${exactPct.toFixed(1)}%. Diversify to phrase/partial.`,
      impact: "moderate", confidence: "medium",
      metrics: { exactMatchRate: exactPct / 100 },
      examples: (api.usage.rows || [])
        .filter(r => r.type?.[0] === "exact")
        .slice(0, 2).map(r => ({ anchor: r.anchor, page: r.instances?.rows?.[0]?.source_page })),
      actions: { canCreateTask: true, canSuggestRewrites: true },
      provenance: { crawlId: "live" }, generatedAt: new Date().toISOString(), category: "Anchor-related" as const,
    });
  }
  if (brandedPct <= 5) {
    suggestions.push({
      id: "s-brand",
      title: "Branded anchors are under‑used",
      desc: `Branded anchors only ${brandedPct.toFixed(1)}%. Add branded links to key pages.`,
      impact: "quickwin", confidence: "medium",
      metrics: { brandedPct },
      examples: (api.usage.rows || []).slice(0, 2).map(r => ({ anchor: r.anchor, page: r.instances?.rows?.[0]?.source_page })),
      actions: { canCreateTask: true },
      provenance: { crawlId: "live" }, generatedAt: new Date().toISOString(), category: "Page-focused" as const,
    });
  }
  if (imagePct >= 8) {
    suggestions.push({
      id: "s-image",
      title: "Image‑only anchors detected — add descriptive text",
      desc: `~${imagePct.toFixed(1)}% of anchors are images without text/alt. Improve accessibility & context.`,
      impact: "moderate", confidence: "high",
      metrics: { instances: dist.find(d => d.type === "image_only")?.count ?? 0 },
      examples: (api.usage.rows || [])
        .filter(r => r.type?.[0] === "image" || r.type?.[0] === "empty")
        .slice(0, 2).map(r => ({ anchor: r.anchor, page: r.instances?.rows?.[0]?.source_page })),
      actions: { canCreateTask: true, canReplace: true },
      provenance: { crawlId: "live" }, generatedAt: new Date().toISOString(), category: "Replacement-ready" as const,
    });
  }
  return suggestions;
}
