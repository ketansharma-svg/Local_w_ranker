import * as React from "react";
import {
  SlidersHorizontal,
  FileText,
  FileSpreadsheet,
  LineChart,
  ArrowLeftRight,
  Download,
  Copy as CopyIcon,
} from "lucide-react";

/* ───────────────────────── Visual tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // Branded color for icons & accents
  action: "var(--wr-action,#0077FF)",
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

/* ───────────────────────── Inlined config (replaces ./matchScore.config) ───────────────────────── */
export type Intent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "local";

export type Vertical =
  | "generic"
  | "ecommerce"
  | "saas"
  | "news_media"
  | "local_services"
  | "content_publisher";

type WeightKeys = "QT" | "SE" | "IT" | "SF" | "IA" | "FR" | "PF" | "UD";

export type MatchScoreConfig = {
  weights: Record<WeightKeys, number>;
  halfLifeDays?: number;
  anchorOverOptCap?: number;
  cannibalMinDamper?: number;
  cannibalSimThreshold?: number;
};

// Compose raw (not normalized) weights for a given intent/vertical.
// These are tuned to be sensible defaults and get normalized later.
export function composeWeights(intent: Intent, vertical: Vertical): MatchScoreConfig["weights"] {
  // Baseline
  const W: Record<WeightKeys, number> = {
    QT: 0.18, // query‑term fit
    SE: 0.16, // semantic/entity coverage
    IT: 0.18, // intent/type alignment
    SF: 0.10, // SERP feature / schema support
    IA: 0.14, // internal anchors & inlink support
    FR: 0.10, // freshness
    PF: 0.08, // performance (CWV)
    UD: 0.06, // URL depth / slug
  };

  // Intent emphasis
  switch (intent) {
    case "informational":
      W.SE += 0.02; W.QT += 0.01; break;
    case "commercial":
      W.IT += 0.02; W.IA += 0.01; W.SF += 0.01; break;
    case "transactional":
      W.IT += 0.03; W.IA += 0.02; W.SF += 0.01; break;
    case "navigational":
      W.UD += 0.02; W.QT += 0.01; break;
    case "local":
      W.IT += 0.02; W.SF += 0.02; break;
  }

  // Vertical emphasis
  switch (vertical) {
    case "ecommerce":
      W.SF += 0.02; W.PF += 0.02; W.IA += 0.01; break;
    case "saas":
      W.SE += 0.02; W.IA += 0.02; break;
    case "news_media":
      W.FR += 0.04; W.SE += 0.01; break;
    case "local_services":
      W.IT += 0.02; W.SF += 0.02; break;
    case "content_publisher":
      W.SE += 0.02; W.QT += 0.01; break;
    default:
      break;
  }

  return W;
}

// Build the full config for computation
export function getMatchScoreConfig(intent: Intent, vertical: Vertical): MatchScoreConfig {
  const halfLifeByVertical: Record<Vertical, number> = {
    generic: 180,
    ecommerce: 150,
    saas: 180,
    news_media: 45,
    local_services: 120,
    content_publisher: 180,
  };
  return {
    weights: composeWeights(intent, vertical),
    halfLifeDays: halfLifeByVertical[vertical] ?? 180,
    anchorOverOptCap: 0.35,
    cannibalMinDamper: 0.7,
    cannibalSimThreshold: 0.75,
  };
}

/* ───────────────────────── Types specific to this file ───────────────────────── */
type FeatureType =
  | "featured_snippet"
  | "paa"
  | "video"
  | "images"
  | "local_pack"
  | "shopping"
  | "news"
  | "knowledge_panel"
  | "sitelinks"
  | "short_videos"
  | "discussions";

type ContentType =
  | "Guide"
  | "Listicle"
  | "HowTo"
  | "Article"
  | "Category"
  | "PDP"
  | "Comparison"
  | "Review"
  | "Video"
  | "News"
  | "Home"
  | "Brand"
  | "LocalPage";

interface KeywordProfile {
  keyword: string;
  mainIntent: Intent;
  intentDist?: Partial<Record<Intent, number>>;
  tokens?: string[];
  entities?: string[];
  serpFeatures?: FeatureType[];
  tm?: number; // trend momentum
}

interface CandidatePage {
  label: "A" | "B";
  url: string;
  title?: string;
  h1?: string;
  headings?: string[];
  wordCount?: number;
  contentType?: ContentType;
  schemaTypes?: string[];
  updatedAt?: string;
  indexable?: boolean;
  canonicalToSelf?: boolean;
  robotsAllowed?: boolean;
  urlDepth?: number;
  slug?: string;
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  internalLinksCount?: number;
  inlinkScore?: number; // 0..1 proxy
  internalAnchors?: string[];
  competingPages?: Array<{ url: string; sim: number; rank?: number }>;
}

/* ───────────────────────── Utilities ───────────────────────── */
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function safeLower(s?: string) { return (s || "").toLowerCase(); }
function tokenize(s?: string) {
  return safeLower(s)
    .replace(/https?:\/\/|www\./g, "")
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/).filter(Boolean);
}
function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }
function jaccard(a: string[] = [], b: string[] = []) {
  const A = new Set(a), B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function daysSince(iso?: string) {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return Infinity;
  return Math.max(0, (Date.now() - t) / 86400000);
}
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* SERP↔schema mapping for SF subscore */
const SERP_TO_SCHEMA: Partial<Record<FeatureType, string[]>> = {
  featured_snippet: ["FAQ", "HowTo", "Article"],
  paa: ["FAQ", "HowTo", "Article"],
  shopping: ["Product", "Offer", "AggregateOffer"],
  video: ["VideoObject"],
  images: ["ImageObject", "Article"],
  news: ["NewsArticle", "Article"],
  local_pack: ["LocalBusiness", "Organization"],
  knowledge_panel: ["Organization", "Product", "Person", "LocalBusiness"],
  short_videos: ["VideoObject"],
  discussions: ["QAPage", "Article"],
};

function schemaSupportScore(features: FeatureType[] = [], schemaTypes: string[] = []): number {
  if (!features.length) return 0.6;
  const pageSchemas = new Set(schemaTypes || []);
  let hits = 0, need = 0;
  for (const f of features) {
    const want = SERP_TO_SCHEMA[f];
    if (!want) continue;
    need++;
    if (want.some((s) => pageSchemas.has(s))) hits++;
  }
  if (need === 0) return 0.6;
  return clamp01(0.4 + 0.6 * (hits / need));
}

function intentTypeFit(intent: Intent, ct?: ContentType): number {
  if (!ct) return 0.6;
  switch (intent) {
    case "informational":
      return ["Guide", "HowTo", "Article", "Listicle", "Video", "News"].includes(ct) ? 1.0
        : ["Comparison", "Review"].includes(ct) ? 0.7 : 0.4;
    case "commercial":
      return ["Comparison", "Review", "Category", "Guide", "Listicle"].includes(ct) ? 1.0
        : ["PDP"].includes(ct) ? 0.8 : 0.5;
    case "transactional":
      return ["Category", "PDP", "Comparison", "Review"].includes(ct) ? 1.0
        : ["Guide", "Listicle"].includes(ct) ? 0.6 : 0.4;
    case "navigational":
      return ["Home", "Brand", "Category", "LocalPage"].includes(ct) ? 1.0 : 0.5;
    case "local":
      return ["LocalPage", "Category"].includes(ct) ? 1.0
        : ["Guide", "Article"].includes(ct) ? 0.7 : 0.4;
  }
}

function queryTermFit(keywordTokens: string[], page: CandidatePage): number {
  const kw = uniq(keywordTokens);
  if (!kw.length) return 0.5;
  const titleT = tokenize(page.title);
  const h1T = tokenize(page.h1);
  const slugT = tokenize(page.slug);
  const inTitle = jaccard(kw, titleT);
  const inH1 = jaccard(kw, h1T);
  const inSlug = jaccard(kw, slugT);
  let score = 0.5 * inTitle + 0.35 * inH1 + 0.15 * inSlug;
  const phrase = safeLower(page.title).includes(kw.join(" ")) || safeLower(page.h1).includes(kw.join(" "));
  if (phrase) score = Math.min(1, score + 0.15);
  if ((page.wordCount || 0) < 300) score *= 0.85;
  return clamp01(score);
}

function semanticFit(entities: string[] = [], page: CandidatePage): number {
  if (!entities.length) return 0.6;
  const pageText = uniq([
    ...tokenize(page.title),
    ...tokenize(page.h1),
    ...(page.headings || []).flatMap(tokenize),
  ]);
  const entTokens = uniq(entities.flatMap(tokenize));
  const jac = jaccard(entTokens, pageText);
  return clamp01(0.3 + 0.7 * jac);
}

function anchorSupport(keywordTokens: string[], page: CandidatePage, cfg: MatchScoreConfig): number {
  const anchors = page.internalAnchors || [];
  const total = anchors.length;
  if (total === 0) return 0.5 * (page.inlinkScore ?? 0.3);
  const exact = anchors.filter((a) => safeLower(a).includes(keywordTokens.join(" "))).length;
  const near = anchors.filter((a) => {
    const t = tokenize(a);
    const cover = jaccard(uniq(keywordTokens), uniq(t));
    return cover >= 0.5;
  }).length;
  const ratio = (exact + near) / total;
  const cap = cfg.anchorOverOptCap ?? 0.35;
  const ratioPrime = ratio <= cap ? ratio : lerp(cap, 0.5, (ratio - cap) / Math.max(1e-6, 1 - cap));
  const authority = clamp01((page.inlinkScore ?? 0.3) * (1 - Math.exp(-(page.internalLinksCount || 0) / 20)));
  return clamp01(0.6 * ratioPrime + 0.4 * authority);
}

function freshnessScore(k: KeywordProfile, cfg: MatchScoreConfig, page: CandidatePage): number {
  const d = daysSince(page.updatedAt);
  if (!isFinite(d)) return 0.5;
  let hl = cfg.halfLifeDays ?? 180;
  if ((k.tm ?? 0) >= 1) hl = Math.min(hl, 120);
  if ((k.serpFeatures || []).includes("news")) hl = Math.min(hl, 60);
  if (k.mainIntent === "transactional" && (k.serpFeatures || []).includes("shopping")) hl = Math.min(hl, 120);
  return clamp01(1 / (1 + d / Math.max(30, hl)));
}

function performanceScore(page: CandidatePage): number {
  const lcp = page.lcpMs ?? 3500, inp = page.inpMs ?? 250, cls = page.cls ?? 0.12;
  const lcpScore = lcp <= 2500 ? 1 : lcp <= 4000 ? 0.7 : 0.4;
  const inpScore = inp <= 200 ? 1 : inp <= 500 ? 0.7 : 0.4;
  const clsScore = cls <= 0.1 ? 1 : cls <= 0.25 ? 0.7 : 0.4;
  return clamp01(0.5 * lcpScore + 0.3 * inpScore + 0.2 * clsScore);
}

function urlDepthScore(page: CandidatePage, keywordTokens: string[]): number {
  const depth = page.urlDepth ?? safeLower(page.url).split("/").filter(Boolean).length - 1;
  const slug = tokenize(page.slug || page.url.split("/").pop());
  const jac = jaccard(uniq(keywordTokens), uniq(slug));
  const depthScore = depth <= 2 ? 1 : depth === 3 ? 0.8 : depth === 4 ? 0.65 : 0.5;
  return clamp01(0.6 * depthScore + 0.4 * jac);
}

function indexabilityDamper(page: CandidatePage): number {
  const idx = page.indexable !== false && page.robotsAllowed !== false && page.canonicalToSelf !== false;
  return idx ? 1.0 : 0.1;
}
function cannibalDamper(page: CandidatePage, cfg: MatchScoreConfig): number {
  const list = page.competingPages || [];
  if (!list.length) return 1;
  const worst = list.reduce((a, b) => (b.sim > a.sim ? b : a), list[0]);
  if (worst.sim < (cfg.cannibalSimThreshold ?? 0.75)) return 1;
  let d = cfg.cannibalMinDamper ?? 0.7;
  if ((worst.rank ?? 999) <= 20) d = Math.max(0.6, d - 0.05);
  return d;
}
function normalizeWeights(w: any) {
  const sum = w.QT + w.SE + w.IT + w.SF + w.IA + w.FR + w.PF + w.UD;
  const s = sum ? 1 / sum : 1;
  const out = { ...w };
  for (const k of Object.keys(out)) out[k] = +(out[k] * s).toFixed(4);
  return out;
}

function computeMatchScore(k: KeywordProfile, p: CandidatePage, cfg: MatchScoreConfig) {
  const kwTokens = (k.tokens?.length ? k.tokens : tokenize(k.keyword))!;
  const w = normalizeWeights(cfg.weights);
  const QT = queryTermFit(kwTokens, p);
  const SE = semanticFit(k.entities ?? [], p);
  const IT = intentTypeFit(k.mainIntent, p.contentType);
  const SF = schemaSupportScore(k.serpFeatures, p.schemaTypes || []);
  const IA = anchorSupport(kwTokens, p, cfg);
  const FR = freshnessScore(k, cfg, p);
  const PF = performanceScore(p);
  const UD = urlDepthScore(p, kwTokens);
  const baseFit = +(
    w.QT * QT +
    w.SE * SE +
    w.IT * IT +
    w.SF * SF +
    w.IA * IA +
    w.FR * FR +
    w.PF * PF +
    w.UD * UD
  ).toFixed(4);
  const score = Math.round(100 * baseFit * indexabilityDamper(p) * cannibalDamper(p, cfg));
  return { score, baseFit, subs: { QT, SE, IT, SF, IA, FR, PF, UD } };
}

/* ───────────────────────── UI helpers ───────────────────────── */
const Section: React.FC<{ title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }> = ({
  title, children, right,
}) => (
  <div className="rounded-md border" style={{ borderColor: TK.border }}>
    <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
      <div className="flex items-center gap-2">{title}</div>
      {right}
    </div>
    <div className="p-3">{children}</div>
  </div>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="grid grid-cols-[140px_1fr] gap-3 items-center text-sm">
    <span className="text-xs md:text-sm" style={{ color: TK.muted }}>{label}</span>
    {children}
  </label>
);

const ToggleChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; title?: string }> = ({
  active, onClick, children, title,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="h-8 px-3 rounded-full border text-sm cursor-pointer transition-colors"
    style={{
      borderColor: TK.borderLight,
      background: active ? "#E6F7FF" : "#FFF",
      color: active ? TK.text : TK.muted,
    }}
  >
    {children}
  </button>
);

function pct(n: number) { return `${Math.round(n * 100)}%`; }

/* ───────────────────────── Recommendations ───────────────────────── */
function recommendations(
  weak: ReturnType<typeof computeMatchScore>,
  strong: ReturnType<typeof computeMatchScore>,
  k: KeywordProfile,
  pWeak: CandidatePage
) {
  const recs: string[] = [];
  const delta = (a: number, b: number) => a - b;

  if (delta(strong.subs.QT, weak.subs.QT) >= 0.12) {
    recs.push("Improve query‑term fit: include the exact phrase in Title & H1; refine slug.");
  }
  if (delta(strong.subs.SE, weak.subs.SE) >= 0.12) {
    recs.push("Expand topical coverage: add sections addressing missing entities; improve headings.");
  }
  if (delta(strong.subs.IT, weak.subs.IT) >= 0.1) {
    recs.push(`Align content type with intent (${k.mainIntent}); consider switching to a more appropriate template (e.g., Comparison, PDP, Guide).`);
  }
  if (delta(strong.subs.SF, weak.subs.SF) >= 0.1) {
    recs.push("Add structured data to match SERP surfaces (FAQ/HowTo/Product/Video/LocalBusiness).");
  }
  if (delta(strong.subs.IA, weak.subs.IA) >= 0.1) {
    recs.push("Strengthen internal linking & anchors; avoid over‑optimization, diversify anchor phrasing.");
  }
  if (delta(strong.subs.FR, weak.subs.FR) >= 0.08) {
    recs.push("Refresh content (update date & material) — query shows recency bias.");
  }
  if (delta(strong.subs.PF, weak.subs.PF) >= 0.08) {
    recs.push("Improve CWV (LCP/INP/CLS) — speed & UX can lift competitiveness.");
  }
  if (delta(strong.subs.UD, weak.subs.UD) >= 0.08) {
    recs.push("Simplify URL depth and improve slug relevance to the keyword.");
  }
  if (pWeak.indexable === false || pWeak.robotsAllowed === false || pWeak.canonicalToSelf === false) {
    recs.unshift("Fix indexability: allow crawling, use self‑canonical, and ensure the page is indexable.");
  }
  return recs.slice(0, 6);
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function MatchScoreWhatIf() {
  // Global keyword settings
  const [keyword, setKeyword] = React.useState("technical seo checklist");
  const [intent, setIntent] = React.useState<Intent>("informational");
  const [vertical, setVertical] = React.useState<Vertical>("generic");
  const [tm, setTm] = React.useState(1.1);
  const [entities, setEntities] = React.useState<string>("core web vitals, structured data, crawling, indexing");
  const [features, setFeatures] = React.useState<FeatureType[]>(["featured_snippet", "paa", "images"]);

  // Candidates A/B defaults
  const [A, setA] = React.useState<CandidatePage>({
    label: "A",
    url: "https://example.com/guide/technical-seo-checklist",
    title: "The Best Technical SEO Checklist (2025)",
    h1: "Technical SEO Checklist",
    headings: ["Core Web Vitals", "Crawl", "Indexing", "Structured Data"],
    wordCount: 2600, contentType: "Guide",
    schemaTypes: ["Article", "FAQ"], updatedAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    indexable: true, canonicalToSelf: true, robotsAllowed: true,
    urlDepth: 3, slug: "technical-seo-checklist",
    lcpMs: 2300, inpMs: 180, cls: 0.06,
    internalLinksCount: 48, inlinkScore: 0.62,
    internalAnchors: ["technical seo checklist", "seo checklist", "best technical seo"],
    competingPages: [{ url: "/blog/seo-checklist", sim: 0.62 }, { url: "/guide/technical-seo", sim: 0.72, rank: 22 }],
  });

  const [B, setB] = React.useState<CandidatePage>({
    label: "B",
    url: "https://example.com/blog/technical-seo",
    title: "Technical SEO: The Complete Guide",
    h1: "Technical SEO Guide",
    headings: ["Mobile‑first Indexing", "Page Speed", "Sitemaps", "Robots.txt"],
    wordCount: 1400, contentType: "Article",
    schemaTypes: ["Article"], updatedAt: new Date(Date.now() - 280 * 86400000).toISOString(),
    indexable: true, canonicalToSelf: true, robotsAllowed: true,
    urlDepth: 4, slug: "technical-seo",
    lcpMs: 3100, inpMs: 300, cls: 0.11,
    internalLinksCount: 16, inlinkScore: 0.34,
    internalAnchors: ["technical seo guide", "site speed"],
    competingPages: [{ url: "/guide/technical-seo-checklist", sim: 0.76, rank: 18 }],
  });

  const ALL_FEATURES: { key: FeatureType; label: string }[] = [
    { key: "featured_snippet", label: "FS" },
    { key: "paa", label: "PAA" },
    { key: "video", label: "Video" },
    { key: "images", label: "Images" },
    { key: "local_pack", label: "Local" },
    { key: "shopping", label: "Shopping" },
    { key: "news", label: "News" },
    { key: "knowledge_panel", label: "KP" },
    { key: "sitelinks", label: "Sitelinks" },
    { key: "short_videos", label: "Shorts" },
    { key: "discussions", label: "Discussions" },
  ];

  // Compose keyword profile & config
  const k = React.useMemo<KeywordProfile>(() => ({
    keyword,
    mainIntent: intent,
    intentDist: { [intent]: 1 },
    serpFeatures: features,
    tm,
    entities: entities.split(",").map((s) => s.trim()).filter(Boolean),
  }), [keyword, intent, features, tm, entities]);

  const cfg = React.useMemo<MatchScoreConfig>(() => getMatchScoreConfig(intent, vertical), [intent, vertical]);

  // Compute
  const resA = React.useMemo(() => computeMatchScore(k, A, cfg), [k, A, cfg]);
  const resB = React.useMemo(() => computeMatchScore(k, B, cfg), [k, B, cfg]);
  const winner = resA.score === resB.score ? "Tie" : resA.score > resB.score ? "A" : "B";
  const gap = Math.abs(resA.score - resB.score);

  // Delta table (A - B)
  const delta = {
    QT: +(resA.subs.QT - resB.subs.QT).toFixed(3),
    SE: +(resA.subs.SE - resB.subs.SE).toFixed(3),
    IT: +(resA.subs.IT - resB.subs.IT).toFixed(3),
    SF: +(resA.subs.SF - resB.subs.SF).toFixed(3),
    IA: +(resA.subs.IA - resB.subs.IA).toFixed(3),
    FR: +(resA.subs.FR - resB.subs.FR).toFixed(3),
    PF: +(resA.subs.PF - resB.subs.PF).toFixed(3),
    UD: +(resA.subs.UD - resB.subs.UD).toFixed(3),
  };

  const weaker = resA.score >= resB.score ? { page: B, res: resB } : { page: A, res: resA };
  const stronger = resA.score >= resB.score ? { page: A, res: resA } : { page: B, res: resB };
  const recs = React.useMemo(() => recommendations(weaker.res, stronger.res, k, weaker.page), [weaker, stronger, k]);

  function toggleFeature(f: FeatureType) {
    setFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }
  function swapAB() {
    setA(B);
    setB(A);
  }

  return (
    <div className="p-4 space-y-4" style={FONTS}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" style={{ color: TK.brand }} />
          <h1 className="text-lg font-semibold">What‑If: Page Mapping A/B</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-8 px-3 rounded border text-sm cursor-pointer inline-flex items-center gap-2"
            style={{ borderColor: TK.borderLight }}
            onClick={swapAB}
            title="Swap A and B"
            aria-label="Swap A and B"
          >
            <ArrowLeftRight className="h-4 w-4" style={{ color: TK.brand }} />
            Swap A/B
          </button>
        </div>
      </div>

      {/* Keyword & context */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" style={{ color: TK.brand }} />
            <span className="text-sm font-semibold">Keyword & Context</span>
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: TK.muted }}>Weights preset:</span>
            <span className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: TK.borderLight }}>
              {intent} • {vertical}
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Keyword">
            <input
              className="h-9 px-3 rounded border w-full"
              style={{ borderColor: TK.border }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., technical seo checklist"
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Intent">
              <select
                className="h-9 px-2 rounded border w-full cursor-pointer"
                style={{ borderColor: TK.border }}
                value={intent}
                onChange={(e) => setIntent(e.target.value as Intent)}
              >
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
                <option value="navigational">Navigational</option>
                <option value="local">Local</option>
              </select>
            </FieldRow>
            <FieldRow label="Vertical">
              <select
                className="h-9 px-2 rounded border w-full cursor-pointer"
                style={{ borderColor: TK.border }}
                value={vertical}
                onChange={(e) => setVertical(e.target.value as Vertical)}
              >
                <option value="generic">Generic</option>
                <option value="ecommerce">eCommerce</option>
                <option value="saas">SaaS</option>
                <option value="news_media">News/Media</option>
                <option value="local_services">Local/Services</option>
                <option value="content_publisher">Content Publisher</option>
              </select>
            </FieldRow>
          </div>

          <FieldRow label="Entities (comma)">
            <input
              className="h-9 px-3 rounded border w-full"
              style={{ borderColor: TK.border }}
              value={entities}
              onChange={(e) => setEntities(e.target.value)}
              placeholder="core web vitals, structured data, crawling…"
            />
          </FieldRow>
          <FieldRow label="Trend Momentum (TM)">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={tm}
                onChange={(e) => setTm(Number(e.target.value))}
                className="w-full cursor-pointer"
              />
              <span className="text-sm font-medium" style={{ color: TK.action }}>
                {tm > 0 ? `+${tm.toFixed(1)}` : tm.toFixed(1)}
              </span>
            </div>
          </FieldRow>

          <div className="md:col-span-2">
            <div className="text-xs mb-1" style={{ color: TK.muted }}>SERP Features</div>
            <div className="flex flex-wrap gap-2">
              {ALL_FEATURES.map((f) => (
                <ToggleChip
                  key={f.key}
                  active={features.includes(f.key)}
                  onClick={() => toggleFeature(f.key)}
                  title={f.label}
                >
                  {f.label}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: TK.brand }} />
              <span className="text-sm font-semibold">Candidate A</span>
            </span>
          }
        >
          <CandidateForm page={A} onChange={setA} />
        </Section>
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: TK.brand }} />
              <span className="text-sm font-semibold">Candidate B</span>
            </span>
          }
        >
          <CandidateForm page={B} onChange={setB} />
        </Section>
      </div>

      {/* Results */}
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <LineChart className="h-4 w-4" style={{ color: TK.brand }} />
            <span className="text-sm font-semibold">Result & Rationale</span>
          </span>
        }
        right={
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: TK.muted }}>Preset weights:</span>
            <code className="text-[11px] px-2 py-1 rounded border" style={{ borderColor: TK.borderLight, background: "#fff" }}>
              {JSON.stringify(composeWeights(intent, vertical))}
            </code>
          </div>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Summary cards */}
          <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
            <div className="text-xs font-medium mb-1" style={{ color: TK.muted }}>Winner</div>
            <div className="text-2xl font-semibold">
              {winner === "Tie" ? "Tie" : `Candidate ${winner}`}
              {winner !== "Tie" && (
                <span className="ml-2 text-sm px-2 py-1 rounded-full" style={{ background: "#E6F7FF", color: TK.brand }}>
                  +{gap} pts
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs" style={{ color: TK.muted }}>A · Match Score</div>
                <div className="text-lg font-semibold">{resA.score}</div>
                <Bar value={resA.baseFit} />
              </div>
              <div>
                <div className="text-xs" style={{ color: TK.muted }}>B · Match Score</div>
                <div className="text-lg font-semibold">{resB.score}</div>
                <Bar value={resB.baseFit} />
              </div>
            </div>
          </div>

          {/* Delta table */}
          <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
            <div className="text-xs font-medium mb-2" style={{ color: TK.muted }}>Subscore Δ (A−B)</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: TK.muted }}>
                  <th className="text-left py-1">Sub</th>
                  <th className="text-right py-1">A</th>
                  <th className="text-right py-1">B</th>
                  <th className="text-right py-1">Δ</th>
                </tr>
              </thead>
              <tbody>
                {(["QT","SE","IT","SF","IA","FR","PF","UD"] as const).map((k) => (
                  <tr key={k} className="border-t" style={{ borderColor: TK.borderLight }}>
                    <td className="py-1">{k}</td>
                    <td className="py-1 text-right">{pct((resA.subs as any)[k])}</td>
                    <td className="py-1 text-right">{pct((resB.subs as any)[k])}</td>
                    <td
                      className="py-1 text-right font-medium"
                      style={{ color: (delta as any)[k] > 0 ? TK.ok : (delta as any)[k] < 0 ? TK.danger : TK.muted }}
                    >
                      {(delta as any)[k] > 0 ? "+" : ""}{((delta as any)[k] * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendations */}
          <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
            <div className="text-xs font-medium mb-2" style={{ color: TK.muted }}>
              Recommendations for <b>weaker ({weaker.page.label})</b>
            </div>
            {recs.length ? (
              <ul className="list-disc ml-4 text-sm space-y-1">
                {recs.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            ) : (
              <div className="text-sm" style={{ color: TK.muted }}>
                Pages are closely matched; minor on‑page or internal linking tweaks may tip the balance.
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Export actions */}
      <div className="flex items-center gap-2">
        <button
          className="h-9 px-3 rounded border text-sm cursor-pointer inline-flex items-center gap-2"
          style={{ borderColor: TK.borderLight }}
          onClick={() => {
            const payload = {
              keyword: k, config: cfg,
              A: { page: A, result: resA },
              B: { page: B, result: resB },
              winner, gap, features
            };
            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "ms-whatif.json";
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          title="Export JSON"
          aria-label="Export JSON"
        >
          <Download className="h-4 w-4" style={{ color: TK.brand }} />
          Export JSON
        </button>
        <button
          className="h-9 px-3 rounded border text-sm cursor-pointer inline-flex items-center gap-2"
          style={{ borderColor: TK.borderLight }}
          onClick={() => {
            const text = `Winner: ${winner} (+${gap})
A: ${resA.score} (${pct(resA.baseFit)})
B: ${resB.score} (${pct(resB.baseFit)})
Entities: ${k.entities?.join(", ")}
Features: ${features.join(", ")}`;
            navigator.clipboard.writeText(text);
          }}
          title="Copy summary"
          aria-label="Copy summary"
        >
          <CopyIcon className="h-4 w-4" style={{ color: TK.brand }} />
          Copy Summary
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Small UI atoms ───────────────────────── */

const CandidateForm: React.FC<{
  page: CandidatePage;
  onChange: React.Dispatch<React.SetStateAction<CandidatePage>>;
}> = ({ page, onChange }) => {
  const [schemasText, setSchemasText] = React.useState((page.schemaTypes || []).join(", "));
  const [anchorsText, setAnchorsText] = React.useState((page.internalAnchors || []).join(", "));

  React.useEffect(() => { setSchemasText((page.schemaTypes || []).join(", ")); }, [page.schemaTypes]);
  React.useEffect(() => { setAnchorsText((page.internalAnchors || []).join(", ")); }, [page.internalAnchors]);

  const contentTypes: ContentType[] = [
    "Guide","Listicle","HowTo","Article","Category","PDP","Comparison","Review","Video","News","Home","Brand","LocalPage",
  ];

  return (
    <div className="space-y-3">
      <FieldRow label="URL">
        <input
          className="h-9 px-3 rounded border w-full"
          style={{ borderColor: TK.border }}
          value={page.url}
          onChange={(e) => onChange((prev) => ({ ...prev, url: e.target.value }))}
          placeholder="https://example.com/..."
        />
      </FieldRow>
      <FieldRow label="Title">
        <input
          className="h-9 px-3 rounded border w-full"
          style={{ borderColor: TK.border }}
          value={page.title || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
        />
      </FieldRow>
      <FieldRow label="H1">
        <input
          className="h-9 px-3 rounded border w-full"
          style={{ borderColor: TK.border }}
          value={page.h1 || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, h1: e.target.value }))}
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Type">
          <select
            className="h-9 px-2 rounded border w-full cursor-pointer"
            style={{ borderColor: TK.border }}
            value={page.contentType || "Guide"}
            onChange={(e) => onChange((prev) => ({ ...prev, contentType: e.target.value as ContentType }))}
          >
            {contentTypes.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Word count">
          <input
            type="number"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.wordCount ?? 0}
            onChange={(e) => onChange((prev) => ({ ...prev, wordCount: Number(e.target.value || 0) }))}
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Updated at">
          <input
            type="date"
            className="h-9 px-3 rounded border w-full cursor-pointer"
            style={{ borderColor: TK.border }}
            value={page.updatedAt ? new Date(page.updatedAt).toISOString().slice(0, 10) : ""}
            onChange={(e) => onChange((prev) => ({ ...prev, updatedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
          />
        </FieldRow>
        <FieldRow label="URL depth">
          <input
            type="number"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.urlDepth ?? 3}
            onChange={(e) => onChange((prev) => ({ ...prev, urlDepth: Number(e.target.value || 0) }))}
          />
        </FieldRow>
      </div>

      <FieldRow label="Slug (optional)">
        <input
          className="h-9 px-3 rounded border w-full"
          style={{ borderColor: TK.border }}
          value={page.slug || ""}
          onChange={(e) => onChange((prev) => ({ ...prev, slug: e.target.value }))}
        />
      </FieldRow>

      <FieldRow label="Schema types (comma)">
        <input
          className="h-9 px-3 rounded border w-full"
          style={{ borderColor: TK.border }}
          value={schemasText}
          onChange={(e) => setSchemasText(e.target.value)}
          onBlur={() => onChange((prev) => ({ ...prev, schemaTypes: schemasText.split(",").map((s) => s.trim()).filter(Boolean) }))}
          placeholder="Article, FAQ, HowTo, Product…"
        />
      </FieldRow>

      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="LCP (ms)">
          <input
            type="number"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.lcpMs ?? 0}
            onChange={(e) => onChange((prev) => ({ ...prev, lcpMs: Number(e.target.value || 0) }))}
          />
        </FieldRow>
        <FieldRow label="INP (ms)">
          <input
            type="number"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.inpMs ?? 0}
            onChange={(e) => onChange((prev) => ({ ...prev, inpMs: Number(e.target.value || 0) }))}
          />
        </FieldRow>
        <FieldRow label="CLS">
          <input
            type="number"
            step="0.001"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.cls ?? 0}
            onChange={(e) => onChange((prev) => ({ ...prev, cls: Number(e.target.value || 0) }))}
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="Internal links">
          <input
            type="number"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.internalLinksCount ?? 0}
            onChange={(e) => onChange((prev) => ({ ...prev, internalLinksCount: Number(e.target.value || 0) }))}
          />
        </FieldRow>
        <FieldRow label="Inlink score (0..1)">
          <input
            type="number"
            step="0.01"
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={page.inlinkScore ?? 0}
            onChange={(e) => onChange((prev) => ({ ...prev, inlinkScore: Number(e.target.value || 0) }))}
          />
        </FieldRow>
        <FieldRow label="Indexable">
          <select
            className="h-9 px-2 rounded border w-full cursor-pointer"
            style={{ borderColor: TK.border }}
            value={String(page.indexable !== false)}
            onChange={(e) => onChange((prev) => ({ ...prev, indexable: e.target.value === "true" }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </FieldRow>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="Robots allowed">
          <select
            className="h-9 px-2 rounded border w-full cursor-pointer"
            style={{ borderColor: TK.border }}
            value={String(page.robotsAllowed !== false)}
            onChange={(e) => onChange((prev) => ({ ...prev, robotsAllowed: e.target.value === "true" }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </FieldRow>
        <FieldRow label="Canonical self">
          <select
            className="h-9 px-2 rounded border w-full cursor-pointer"
            style={{ borderColor: TK.border }}
            value={String(page.canonicalToSelf !== false)}
            onChange={(e) => onChange((prev) => ({ ...prev, canonicalToSelf: e.target.value === "true" }))}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </FieldRow>
        <FieldRow label="Anchors (comma)">
          <input
            className="h-9 px-3 rounded border w-full"
            style={{ borderColor: TK.border }}
            value={anchorsText}
            onChange={(e) => setAnchorsText(e.target.value)}
            onBlur={() => onChange((prev) => ({ ...prev, internalAnchors: anchorsText.split(",").map((s) => s.trim()).filter(Boolean) }))}
          />
        </FieldRow>
      </div>

      <FieldRow label="Headings (comma)">
        <input
          className="h-9 px-3 rounded border w-full"
          style={{ borderColor: TK.border }}
          value={(page.headings || []).join(", ")}
          onChange={(e) => onChange((prev) => ({ ...prev, headings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
        />
      </FieldRow>
    </div>
  );
};

const Bar: React.FC<{ value: number }> = ({ value }) => (
  <div className="mt-1 h-2 w-full bg-[#E5E7EB] rounded overflow-hidden">
    <div className="h-full" style={{ width: `${Math.round(value * 100)}%`, background: TK.brand }} />
  </div>
);
