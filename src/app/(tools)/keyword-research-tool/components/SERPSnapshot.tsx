import * as React from "react";
import {
  Search as SearchIcon,
  FileDown,
  Braces,
  RefreshCw,
  ExternalLink,
  Eye,
  Plus,
  Target as TargetIcon,
  Globe,
  Monitor,
  Smartphone,
  Star,
  Check,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  PanelsTopLeft,
} from "lucide-react";

/* ───────────────────────── Design Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "var(--wr-brand,#008CCD)", // branded
  action: "var(--wr-action,#0077FF)",
  pastel: "var(--wr-bg-pastel,#D9EEF8)",
  ok: "#10B981",
  warn: "#F59E0B",
  critical: "#EF4444",
  radius: "var(--wr-radius,6px)",
  shadowSm: "0 1px 2px rgba(16,24,40,.06)",
  hover: "#F8FAFC",
};

const fontStack =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

// util class join
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ───────────────────────── Telemetry ───────────────────────── */
function krTrack(event: string, props: Record<string, unknown> = {}) {
  const payload = { event, ts: new Date().toISOString(), props };
  window.dispatchEvent(new CustomEvent("kr-analytics", { detail: payload }));
}

/* ───────────────────────── Types ───────────────────────── */
type Device = "desktop" | "mobile";
type FeatureKey = "fs" | "paa" | "video" | "images" | "local" | "shopping" | "news" | "sitelinks";
type ContentType = "Guide" | "Listicle" | "Category" | "PDP" | "Video" | "News";
type CompareMode = "off" | "time" | "competitors";

type Locale = { country: string; language: string; device: Device };

type Block =
  | { type: "ads"; note: string }
  | { type: "fs"; position: number; ownerDomain?: string; snippet: string; url: string; title: string }
  | { type: "news"; items: { title: string; url: string; domain: string }[] }
  | { type: "local"; items: { name: string; url: string; rating: number; reviews: number; address: string }[] }
  | { type: "images" }
  | { type: "video" }
  | { type: "shopping" }
  | { type: "paa"; questions: string[] }
  | {
      type: "organic";
      rank: number;
      title: string;
      url: string;
      domain: string;
      wr: number;
      lr: number;
      schema: string[];
      contentType: ContentType;
      lastUpdated?: string;
      sitelinks?: boolean;
    }
  | { type: "related"; queries: string[] };

type Snapshot = {
  keyword: string;
  locale: Locale;
  capturedAt: string; // ISO
  features: FeatureKey[];
  blocks: Block[];
  occupancy: {
    aboveFoldPct: Partial<Record<FeatureKey | "organic", number>>;
  };
  domainsSummary: { domain: string; avgRank: number; top10Share: number; ownsFs?: boolean; ownsPaa?: boolean; wr: number }[];
};

type TimeDiff = {
  baseline: string; // ISO
  current: string; // ISO
  diff: { domain: string; url: string; rankOld?: number; rankNew?: number; delta?: number; fsGained?: boolean }[];
  featureDiff: Partial<Record<FeatureKey, string>>; // "+1","0","-1"
};

/* ───────────────────────── Utilities ───────────────────────── */
function formatInt(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
function ageLabel(iso: string) {
  const d = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
// seeded PRNG for deterministic mock
function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function seededRandom(seed: number) {
  let x = seed;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x < 0 ? ~x + 1 : x) % 1000) / 1000;
  };
}
function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* ───────────────────────── Mock Snapshot Generator ───────────────────────── */
const DOMAINS = [
  "example.com",
  "brand.io",
  "docs.dev",
  "learn.dev",
  "guide.io",
  "shopmart.com",
  "localbiz.org",
  "webfx.com",
  "moz.com",
  "ahrefs.com",
  "searchpilot.com",
  "surferseo.com",
];

function makeOrganic(seed: number, keyword: string): Block[] {
  const rng = seededRandom(seed);
  const out: Block[] = [];
  const used: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) {
    const domain = pick(rng, DOMAINS);
    used[domain] = (used[domain] || 0) + 1;
    const title = `${keyword.replace(/\b\w/g, (m) => m.toUpperCase())} — ${["Complete Guide", "Checklist", "Best Practices", "Tutorial", "Playbook"][Math.floor(rng() * 5)]}`;
    const url = `https://${domain}/${keyword.replace(/\s+/g, "-")}`;
    const wr = Math.round(60 + rng() * 30);
    const lr = Math.round(40 + rng() * 40);
    const schemaPool = ["Article", "FAQ", "HowTo", "Product", "LocalBusiness"];
    const schema = Array.from(new Set([pick(rng, schemaPool), rng() > 0.6 ? pick(rng, schemaPool) : null].filter(Boolean))) as string[];
    const contentType: ContentType = (["Guide", "Listicle", "Category", "PDP", "Video", "News"] as ContentType[])[Math.floor(rng() * 6)];
    const sitelinks = rng() > 0.7;
    const lastUpdated = new Date(Date.now() - Math.floor(rng() * 240) * 86400000).toISOString().slice(0, 10);
    out.push({ type: "organic", rank: i, title, url, domain, wr, lr, schema, contentType, lastUpdated, sitelinks });
  }
  return out;
}

function computeSummaryTop10(org: Block[]): Snapshot["domainsSummary"] {
  const map = new Map<string, { sum: number; count: number; fs?: boolean; paa?: boolean; wr: number[] }>();
  org.forEach((o) => {
    if (o.type !== "organic") return;
    const e = map.get(o.domain) || { sum: 0, count: 0, wr: [] };
    e.sum += o.rank;
    e.count += 1;
    e.wr.push(o.wr);
    map.set(o.domain, e);
  });
  const list = Array.from(map.entries()).map(([domain, v]) => ({
    domain,
    avgRank: +(v.sum / v.count).toFixed(2),
    top10Share: +(v.count / 10).toFixed(2),
    wr: Math.round(v.wr.reduce((a, b) => a + b, 0) / v.wr.length),
  }));
  list.sort((a, b) => a.avgRank - b.avgRank);
  return list;
}

function computeOccupancy(flags: FeatureKey[]): Snapshot["occupancy"] {
  const out: Record<string, number> = { organic: 60 };
  if (flags.includes("fs")) out.fs = 28;
  if (flags.includes("images")) out.images = 12;
  if (flags.includes("video")) out.video = 10;
  if (flags.includes("local")) out.local = 18;
  if (flags.includes("shopping")) out.shopping = 12;
  if (flags.includes("news")) out.news = 14;
  const used = Object.values(out).reduce((a, b) => a + b, 0);
  if (used > 100) {
    Object.keys(out).forEach((k) => ((out as any)[k] = Math.round(((out as any)[k] / used) * 100)));
  }
  return { aboveFoldPct: out as any };
}

function generateSnapshot(keyword: string, locale: Locale): Snapshot {
  const seed = hashStr(`${keyword}:${locale.country}:${locale.language}:${locale.device}`);
  const rng = seededRandom(seed);
  const feats: FeatureKey[] = [];
  if (rng() > 0.3) feats.push("fs");
  if (rng() > 0.5) feats.push("paa");
  if (rng() > 0.55) feats.push("images");
  if (rng() > 0.65) feats.push("video");
  if (rng() > 0.7) feats.push("local");
  if (rng() > 0.6) feats.push("shopping");
  if (rng() > 0.6) feats.push("news");
  if (rng() > 0.55) feats.push("sitelinks");

  // Build sequence
  const blocks: Block[] = []; 
  if (rng() > 0.5) blocks.push({ type: "ads", note: "Ads detected" });
  if (feats.includes("fs")) {
    const owner = pick(rng, DOMAINS);
    blocks.push({
      type: "fs",
      position: 0,
      ownerDomain: owner,
      title: `${keyword} — quick answer`,
      url: `https://${owner}/${keyword.replace(/\s+/g, "-")}`,
      snippet: `Short quick‑answer for ${keyword}.`,
    });
  }
  blocks.push(...makeOrganic(seed, keyword).slice(0, 3));
  if (feats.includes("paa"))
    blocks.push({
      type: "paa",
      questions: [`What is ${keyword}?`, `How to ${keyword.split(" ").slice(0, -1).join(" ")}?`, `Best tools for ${keyword}?`],
    });
  if (feats.includes("images")) blocks.push({ type: "images" });
  if (feats.includes("video")) blocks.push({ type: "video" });
  if (feats.includes("local"))
    blocks.push({
      type: "local",
      items: [
        { name: `${keyword} Experts NYC`, url: "#", rating: 4.6, reviews: 112, address: "NY, USA" },
        { name: `${keyword} Pros`, url: "#", rating: 4.4, reviews: 88, address: "NY, USA" },
        { name: `${keyword} Studio`, url: "#", rating: 4.2, reviews: 64, address: "NY, USA" },
      ],
    });
  blocks.push(...makeOrganic(seed + 1, keyword).slice(3, 10));
  if (feats.includes("news"))
    blocks.push({
      type: "news",
      items: [
        { title: `Latest ${keyword} updates`, url: "#", domain: "news.site" },
        { title: `${keyword} trend this month`, url: "#", domain: "tech.daily" },
      ],
    });
  if (feats.includes("shopping")) blocks.push({ type: "shopping" });
  blocks.push({ type: "related", queries: [`${keyword} tools`, `${keyword} guide`, `learn ${keyword}`] });

  const organicTop10 = blocks.filter((b) => b.type === "organic").slice(0, 10) as Block[];
  const snapshot: Snapshot = {
    keyword,
    locale,
    capturedAt: new Date().toISOString(),
    features: feats,
    blocks,
    occupancy: computeOccupancy(feats),
    domainsSummary: computeSummaryTop10(organicTop10),
  };
  return snapshot;
}

function generateBaselineTimeDiff(current: Snapshot, daysBack = 30): TimeDiff {
  const seed = hashStr(current.keyword + current.capturedAt) ^ daysBack;
  const rng = seededRandom(seed);
  const currOrg = current.blocks.filter((b) => b.type === "organic").slice(0, 10) as Extract<Block, { type: "organic" }>[];
  const baseline = currOrg.map((o) => ({ ...o }));
  for (let i = 0; i < 3; i++) {
    const a = 1 + Math.floor(rng() * 10);
    const b = 1 + Math.floor(rng() * 10);
    const ra = baseline.find((x) => x.rank === a);
    const rb = baseline.find((x) => x.rank === b);
    if (ra && rb) {
      const tmp = ra.rank;
      ra.rank = rb.rank;
      rb.rank = tmp;
    }
  }
  baseline.sort((a, b) => a.rank - b.rank);
  const diff = baseline.map((oldRow) => {
    const now = currOrg.find((x) => x.domain === oldRow.domain);
    return {
      domain: oldRow.domain,
      url: oldRow.url,
      rankOld: oldRow.rank,
      rankNew: now?.rank,
      delta: (now?.rank ?? 99) - oldRow.rank,
      fsGained:
        current.features.includes("fs") && current.blocks.find((b) => b.type === "fs" && (b as any).ownerDomain === oldRow.domain)
          ? true
          : false,
    };
  });
  const featDiff: TimeDiff["featureDiff"] = {};
  (["fs", "paa", "images", "video", "local", "shopping", "news", "sitelinks"] as FeatureKey[]).forEach((f) => {
    featDiff[f] = ["-1", "0", "+1"][Math.floor(rng() * 3)];
  });
  return {
    baseline: new Date(Date.now() - daysBack * 86400000).toISOString(),
    current: current.capturedAt,
    diff,
    featureDiff: featDiff,
  };
}

/* ───────────────────────── Small UI atoms ───────────────────────── */
const Section: React.FC<{
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
  titleIcon?: React.ReactNode;
}> = ({ title, right, children, id, className, titleIcon }) => (
  <section
    id={id}
    className={cn("rounded-md border bg-white", className)}
    style={{ borderColor: TK.borderLight, boxShadow: TK.shadowSm }}
  >
    <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: TK.borderLight }}>
      <div className="flex items-center gap-2">
        {titleIcon}
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    <div className="p-3">{children}</div>
  </section>
);

const ChipButton: React.FC<{
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  pressedAria?: boolean;
  disabled?: boolean;
}> = ({ active, onClick, children, title, pressedAria, disabled }) => (
  <button
    type="button"
    title={title}
    aria-pressed={pressedAria ?? active}
    disabled={disabled}
    className={cn(
      "h-8 px-3 rounded-[6px] border text-sm cursor-pointer",
      disabled ? "opacity-50 cursor-not-allowed" : active ? "font-semibold" : "hover:bg-[#F7FAFC]"
    )}
    style={{ borderColor: TK.border, background: active ? TK.pastel : "#FFF" }}
    onClick={disabled ? undefined : onClick}
  >
    {children}
  </button>
);

const Pill: React.FC<{ children: React.ReactNode; color?: string; title?: string; className?: string }> = ({
  children,
  color,
  title,
  className,
}) => (
  <span
    title={title}
    className={cn("inline-flex items-center rounded-full text-[12px] px-2 py-0.5", className)}
    style={{ background: "#F9FAFB", border: `1px solid ${TK.borderLight}`, color: color || TK.text }}
  >
    {children}
  </span>
);

/* ───────────────────────── Filter Chip (dropdown) ───────────────────────── */
const FilterChip: React.FC<{
  label: string;
  count?: number;
  children: React.ReactNode;
}> = ({ label, count, children }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        className="h-8 px-3 rounded-[6px] border text-sm inline-flex items-center gap-1 cursor-pointer bg-white"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {typeof count === "number" && count > 0 ? (
          <span className="text-xs text-muted-foreground">({count})</span>
        ) : null}
        <ChevronsUpDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          className="absolute mt-2 w-[280px] rounded-md border bg-white p-2 shadow-lg z-[260]"
          style={{ borderColor: TK.borderLight }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Header Bar (slim) ───────────────────────── */
type HeaderProps = {
  keyword: string;
  setKeyword: (s: string) => void;
  locale: Locale;
  capturedAt: string;
  onRefresh: () => void;
  fetching: boolean;
  onCopyJSON: () => void;
};
const SnapshotHeader: React.FC<HeaderProps> = ({
  keyword,
  setKeyword,
  locale,
  capturedAt,
  onRefresh,
  fetching,
  onCopyJSON,
}) => {
  return (
    <div className="z-40 bg-white border-b" style={{ borderColor: TK.borderLight }}>
      <div className="h-[56px] px-4 flex items-center gap-3">
        {/* Left cluster */}
        <div className="flex items-center gap-2">
          <input
            className="h-9 w-[340px] px-3 rounded border"
            style={{ borderColor: TK.border }}
            placeholder="Search / enter keyword…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") krTrack("kr.serp.opened", { keyword });
            }}
          />
          <Pill title="Country & Language">
            <Globe className="h-3.5 w-3.5 mr-1" /> {locale.country}-{locale.language.toUpperCase()}
          </Pill>
          <Pill title="Device">
            {locale.device === "desktop" ? <Monitor className="h-3.5 w-3.5 mr-1" /> : <Smartphone className="h-3.5 w-3.5 mr-1" />}
            {locale.device === "desktop" ? "Desktop" : "Mobile"}
          </Pill>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="h-9 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.borderLight, background: fetching ? TK.pastel : "#FFF" }}
            onClick={() => {
              if (!fetching) {
                krTrack("kr.serp.refresh_clicked", { keyword });
                onRefresh();
              }
            }}
            aria-busy={fetching}
            title="Capture a fresh snapshot of the SERP."
          >
            <RefreshCw className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">{fetching ? "Refreshing…" : "Refresh"}</span>
          </button>

          <button
            className="h-9 px-3 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.borderLight }}
            onClick={onCopyJSON}
            title="Copy Snapshot JSON"
          >
            <Braces className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Copy JSON</span>
          </button>

          <Pill title="Snapshot age" className="ml-1">
            Snapshot {ageLabel(capturedAt)}
          </Pill>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── SERP Viewer (Left) ───────────────────────── */
const ResultCard: React.FC<{
  rank: number;
  title: string;
  url: string;
  domain: string;
  wr: number;
  lr: number;
  schema: string[];
  contentType: ContentType;
  lastUpdated?: string;
  highlight?: "yours" | "competitor" | null;
  sitelinks?: boolean;
  overlayActive?: boolean;
}> = ({ rank, title, url, domain, wr, lr, schema, contentType, lastUpdated, highlight, sitelinks, overlayActive }) => {
  return (
    <div
      className={cn("rounded border p-3 mb-2", overlayActive && "ring-2")}
      style={{
        borderColor: TK.borderLight,
        background: "#FFF",
        boxShadow: TK.shadowSm,
        ringColor: overlayActive ? TK.pastel : undefined,
      } as React.CSSProperties}
      aria-label={`Rank ${rank} result: ${title}, ${domain}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: "#F3F4F6", color: TK.text }}
            >
              {rank}
            </div>
            {highlight && (
              <div
                className="mt-1 text-[10px] font-semibold px-1 rounded"
                style={{ background: highlight === "yours" ? TK.pastel : "#F3F4F6", color: highlight === "yours" ? TK.action : TK.muted }}
              >
                {highlight === "yours" ? "Yours" : "Competitor"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <a
              href={url}
              onClick={(e) => e.preventDefault()}
              className="text-[15px] font-semibold text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
            >
              {title}
            </a>
            <div className="text-xs mt-0.5" style={{ color: TK.muted }}>
              {domain} • {url.length > 64 ? url.slice(0, 64) + "…" : url}
            </div>
            <div className="text-sm mt-1" style={{ color: TK.text }}>
              A concise snippet for this result explaining content relevance to the query.
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <Pill title="Wranker Rank (WR)">WR {wr}</Pill>
              <Pill title="Link Rank (LR)">LR {lr}</Pill>
              {schema.map((s) => (
                <Pill key={s} title="Schema">
                  {s}
                </Pill>
              ))}
              <Pill title="Content Type">{contentType}</Pill>
              {lastUpdated && <Pill title="Last updated">{lastUpdated}</Pill>}
              {sitelinks && <Pill title="Sitelinks">Sitelinks</Pill>}
            </div>
          </div>
        </div>
        <button className="h-8 px-2 text-sm rounded border cursor-pointer hover:bg-[#F7FAFC]" style={{ borderColor: TK.borderLight }} title="Open in new tab">
          <ExternalLink className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Open</span>
        </button>
      </div>
    </div>
  );
};

const BlockHeader: React.FC<{ label: string; feature?: FeatureKey; overlayOn?: boolean }> = ({ label, feature, overlayOn }) => (
  <div
    className={cn("px-3 py-2 rounded border mb-2 flex items-center gap-2", overlayOn && "ring-2")}
    style={{ borderColor: TK.borderLight, background: "#FAFCFF" }}
  >
    <span className="text-xs font-semibold">{label}</span>
    {feature && (
      <span className="text-[10px] px-1 py-0.5 rounded border" style={{ borderColor: TK.borderLight }}>
        {feature.toUpperCase()}
      </span>
    )}
  </div>
);

const SerpViewer: React.FC<{
  snapshot: Snapshot;
  overlays: Record<FeatureKey, boolean>;
  foldOn: boolean;
  yourDomain?: string;
  highlightedDomains: string[];
  device: Device;
  showFromRank?: number;
  onLoadMore?: () => void;
}> = ({ snapshot, overlays, foldOn, yourDomain, highlightedDomains, device, showFromRank = 1, onLoadMore }) => {
  const foldPx = device === "desktop" ? 700 : 600;

  // Build list: maintain order
  const blocks = React.useMemo(() => {
    const org = snapshot.blocks.filter((b) => b.type === "organic") as Extract<Block, { type: "organic" }>[];
    const rankMax = showFromRank + 9;
    const organicPage = org.filter((o) => o.rank >= showFromRank && o.rank <= rankMax);

    const list: Block[] = [];
    for (const b of snapshot.blocks) {
      if (b.type === "organic") {
        const slot = organicPage.find((x) => x.rank === b.rank);
        if (slot) list.push(slot);
      } else if (
        b.type === "fs" ||
        b.type === "paa" ||
        b.type === "local" ||
        b.type === "images" ||
        b.type === "video" ||
        b.type === "shopping" ||
        b.type === "news"
      ) {
        list.push(b);
      } else if (b.type === "ads" || b.type === "related") {
        list.push(b);
      }
    }
    return list;
  }, [snapshot, showFromRank]);

  return (
    <div className="relative">
      {/* Fold line */}
      {foldOn && (
        <div
          style={{ position: "absolute", top: `${foldPx}px`, left: 0, right: 0, height: "0", borderTop: `1px dashed ${TK.border}`, zIndex: 5 }}
          title="Approximate above‑the‑fold boundary for selected device."
        />
      )}

      {/* Blocks */}
      {blocks.map((b, i) => {
        if (b.type === "ads") {
          return (
            <div key={`ads-${i}`} className="mb-2 rounded border px-3 py-2 text-xs" style={{ borderColor: TK.borderLight, background: "#FEF9C3" }}>
              Ads present (not interactive in this viewer)
            </div>
          );
        }
        if (b.type === "fs") {
          return (
            <div key={`fs-${i}`}>
              <BlockHeader label="Featured Snippet" feature="fs" overlayOn={overlays.fs} />
              <div className={cn("rounded border p-3 mb-3", overlays.fs && "ring-2")} style={{ borderColor: TK.borderLight, background: "#FFF" }}>
                <a
                  href={b.url}
                  onClick={(e) => e.preventDefault()}
                  className="text-[15px] font-semibold text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline cursor-pointer"
                >
                  {b.title}
                </a>
                <div className="text-sm mt-1" style={{ color: TK.text }}>
                  {b.snippet}
                </div>
                <div className="text-xs mt-1" style={{ color: TK.muted }}>
                  {b.ownerDomain ?? "—"}
                </div>
              </div>
            </div>
          );
        }
        if (b.type === "news") {
          return (
            <div key={`news-${i}`}>
              <BlockHeader label="Top Stories" feature="news" overlayOn={overlays.news} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {b.items.map((n, idx) => (
                  <a
                    key={idx}
                    href={n.url}
                    onClick={(e) => e.preventDefault()}
                    className="rounded border p-2 hover:bg-[#F8FAFC] cursor-pointer"
                    style={{ borderColor: TK.borderLight }}
                  >
                    <div className="text-sm font-semibold text-[var(--wr-action,#0077FF)] underline-offset-2 hover:underline">{n.title}</div>
                    <div className="text-xs" style={{ color: TK.muted }}>
                      {n.domain}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        }
        if (b.type === "local") {
          return (
            <div key={`local-${i}`}>
              <BlockHeader label="Local Pack" feature="local" overlayOn={overlays.local} />
              <div className={cn("rounded border p-3 mb-3", overlays.local && "ring-2")} style={{ borderColor: TK.borderLight, background: "#FFF" }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {b.items.map((it, idx) => (
                    <div key={idx} className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
                      <div className="text-sm font-semibold">{it.name}</div>
                      <div className="text-xs" style={{ color: TK.muted }}>
                        {it.address}
                      </div>
                      <div className="text-xs mt-1 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" color={TK.warn} />
                        {it.rating} ({it.reviews} reviews)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        if (b.type === "images") {
          return (
            <div key={`images-${i}`}>
              <BlockHeader label="Images block" feature="images" overlayOn={overlays.images} />
              <div
                className={cn("rounded border p-6 text-center mb-3", overlays.images && "ring-2")}
                style={{ borderColor: TK.borderLight, background: "#FFF", color: TK.muted }}
              >
                [Images strip placeholder]
              </div>
            </div>
          );
        }
        if (b.type === "video") {
          return (
            <div key={`video-${i}`}>
              <BlockHeader label="Video block" feature="video" overlayOn={overlays.video} />
              <div
                className={cn("rounded border p-6 text-center mb-3", overlays.video && "ring-2")}
                style={{ borderColor: TK.borderLight, background: "#FFF", color: TK.muted }}
              >
                [Video carousel placeholder]
              </div>
            </div>
          );
        }
        if (b.type === "shopping") {
          return (
            <div key={`shopping-${i}`}>
              <BlockHeader label="Shopping block" feature="shopping" overlayOn={overlays.shopping} />
              <div
                className={cn("rounded border p-6 text-center mb-3", overlays.shopping && "ring-2")}
                style={{ borderColor: TK.borderLight, background: "#FFF", color: TK.muted }}
              >
                [Shopping listings placeholder]
              </div>
            </div>
          );
        }
        if (b.type === "paa") {
          return (
            <div key={`paa-${i}`}>
              <BlockHeader label="People Also Ask" feature="paa" overlayOn={overlays.paa} />
              <div className={cn("rounded border p-3 mb-3", overlays.paa && "ring-2")} style={{ borderColor: TK.borderLight, background: "#FFF" }}>
                {b.questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-2 rounded hover:bg-[#F8FAFC] cursor-pointer border-b last:border-b-0"
                    style={{ borderColor: TK.borderLight }}
                  >
                    <span className="text-sm">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (b.type === "related") {
          return (
            <div key={`rel-${i}`} className="mt-3 mb-4">
              <div className="text-xs mb-1" style={{ color: TK.muted }}>
                Related searches
              </div>
              <div className="flex flex-wrap gap-2">
                {b.queries.map((q, idx) => (
                  <button
                    key={idx}
                    className="px-2 py-1 rounded border text-xs cursor-pointer hover:bg-[#F7FAFC]"
                    style={{ borderColor: TK.borderLight }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (b.type === "organic") {
          const highlight: "yours" | "competitor" | null =
            yourDomain && b.domain === yourDomain ? "yours" : highlightedDomains.includes(b.domain) ? "competitor" : null;
          const overlaySit = overlays.sitelinks && b.sitelinks;
          return (
            <ResultCard
              key={`org-${b.rank}`}
              rank={b.rank}
              title={b.title}
              url={b.url}
              domain={b.domain}
              wr={b.wr}
              lr={b.lr}
              schema={b.schema}
              contentType={b.contentType}
              lastUpdated={b.lastUpdated}
              sitelinks={b.sitelinks}
              highlight={highlight}
              overlayActive={overlaySit}
            />
          );
        }
        return null;
      })}
      {/* Pager */}
      {showFromRank === 1 && (
        <div className="flex justify-center mt-3">
          <button className="h-9 px-4 rounded border text-sm cursor-pointer hover:bg-[#F7FAFC]" style={{ borderColor: TK.borderLight }} onClick={onLoadMore}>
            Load #11–#20
          </button>
        </div>
      )}
    </div>
  );
};

/* ───────────────────────── Right Panel Analytics ───────────────────────── */
const OccupancyMap: React.FC<{ occ: Snapshot["occupancy"]["aboveFoldPct"] }> = ({ occ }) => {
  const keys: (FeatureKey | "organic")[] = ["fs", "local", "news", "video", "images", "shopping", "organic"];
  const total = keys.reduce((a, k) => a + (occ[k] || 0), 0) || 1;
  return (
    <Section
      title="Occupancy (Above the Fold)"
      titleIcon={<PanelsTopLeft size={16} color={TK.brand} />}
      right={<span className="text-xs" style={{ color: TK.muted }}>Heuristic</span>}
    >
      <div className="h-6 w-full rounded overflow-hidden border" style={{ borderColor: TK.borderLight }}>
        <div className="flex h-full w-full">
          {keys.map((k) => {
            const pct = Math.round(((occ[k] || 0) / total) * 100);
            if (pct === 0) return null;
            return (
              <div
                key={k}
                className="h-full text-[10px] flex items-center justify-center"
                style={{
                  width: `${pct}%`,
                  background: k === "organic" ? "#E5F3FF" : "#EEF2FF",
                  color: TK.text,
                  borderRight: `1px solid ${TK.borderLight}`,
                }}
              >
                {k.toUpperCase()} {pct}%
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-xs mt-2" style={{ color: TK.muted }}>
        Estimated real estate by surface; organic dampening drives lower CP% in Analyze.
      </div>
    </Section>
  );
};

/* Smart hover popover for heatmap cells */
const HoverPopover: React.FC<{ anchor: DOMRect | null; children: React.ReactNode }> = ({ anchor, children }) => {
  if (!anchor) return null;
  const style: React.CSSProperties = {
    position: "fixed",
    top: anchor.bottom + 8,
    left: Math.min(anchor.left, window.innerWidth - 260),
    zIndex: 300,
    background: "#fff",
    border: `1px solid ${TK.borderLight}`,
    borderRadius: 8,
    boxShadow: TK.shadowSm,
    padding: 8,
    width: 240,
    pointerEvents: "none",
  };
  return <div style={style}>{children}</div>;
};

const FeaturesHeatmap: React.FC<{ snapshot: Snapshot }> = ({ snapshot }) => {
  // near-rank mapping
  const orgRanks = (snapshot.blocks.filter((b) => b.type === "organic") as Extract<Block, { type: "organic" }>[]).map((o) => o.rank);
  const nearRank = (index: number) => orgRanks[Math.min(orgRanks.length - 1, Math.max(0, index))] ?? 10;

  const posMap: Record<FeatureKey, number[]> = { fs: [], paa: [], video: [], images: [], local: [], shopping: [], news: [], sitelinks: [] };
  snapshot.blocks.forEach((b, idx) => {
    if (b.type === "fs") posMap.fs.push(1);
    if (b.type === "paa") posMap.paa.push(nearRank(Math.max(0, idx - 1)));
    if (b.type === "images") posMap.images.push(nearRank(Math.max(0, idx - 1)));
    if (b.type === "video") posMap.video.push(nearRank(Math.max(0, idx - 1)));
    if (b.type === "local") posMap.local.push(1);
    if (b.type === "shopping") posMap.shopping.push(1);
    if (b.type === "news") posMap.news.push(nearRank(Math.max(0, idx - 1)));
    if (b.type === "organic") {
      if ((b as any).sitelinks) posMap.sitelinks.push((b as any).rank);
    }
  });

  const rows: { k: FeatureKey; label: string }[] = [
    { k: "fs", label: "FS" },
    { k: "paa", label: "PAA" },
    { k: "video", label: "Video" },
    { k: "images", label: "Images" },
    { k: "local", label: "Local" },
    { k: "shopping", label: "Shopping" },
    { k: "news", label: "News" },
    { k: "sitelinks", label: "Sitelinks" },
  ];

  const [hover, setHover] = React.useState<{
    rect: DOMRect | null;
    feature?: FeatureKey;
    rank?: number;
    present?: boolean;
  }>({ rect: null });

  const occ = snapshot.occupancy.aboveFoldPct;

  return (
    <Section title="Features Heatmap" titleIcon={<SearchIcon size={16} color={TK.brand} />}>
      <div className="overflow-auto relative">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs py-1" style={{ color: TK.muted }}>
                Feature
              </th>
              {Array.from({ length: 10 }).map((_, i) => (
                <th key={i} className="w-[44px] text-center text-xs" style={{ color: TK.muted }}>
                  #{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t" style={{ borderColor: TK.borderLight }}>
                <td className="py-1">{r.label}</td>
                {Array.from({ length: 10 }).map((_, i) => {
                  const cellRank = i + 1;
                  const present = posMap[r.k].includes(cellRank);
                  return (
                    <td key={i} className="text-center">
                      <div
                        className={cn("h-3 w-3 inline-block rounded-sm", present ? "" : "")}
                        style={{ background: present ? TK.brand : "#EEF2FF" }}
                        onMouseEnter={(e) =>
                          setHover({
                            rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                            feature: r.k,
                            rank: cellRank,
                            present,
                          })
                        }
                        onMouseLeave={() => setHover({ rect: null })}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Smart Popover on hover */}
        <HoverPopover anchor={hover.rect}>
          {hover.feature && (
            <div className="text-xs">
              <div className="font-semibold mb-1">Feature: {hover.feature.toUpperCase()}</div>
              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-muted-foreground">Under Rank</span>
                <span>#{hover.rank}</span>
                <span className="text-muted-foreground">Present</span>
                <span>{hover.present ? "Yes" : "No"}</span>
                <span className="text-muted-foreground">Occurrences @ Rank</span>
                <span>{posMap[hover.feature].filter((r) => r === hover.rank).length}</span>
                <span className="text-muted-foreground">Above‑fold share</span>
                <span>{occ[hover.feature] != null ? `${occ[hover.feature]}%` : "0%"}</span>
              </div>
            </div>
          )}
        </HoverPopover>
      </div>
    </Section>
  );
};

const CompetitorPanel: React.FC<{
  snapshot: Snapshot;
  yourDomain?: string;
  competitors?: string[];
  highlighted: string[];
  setHighlighted: (v: string[]) => void;
}> = ({ snapshot, yourDomain, competitors = [], highlighted, setHighlighted }) => {
  const list = [...snapshot.domainsSummary];
  list.sort((a, b) => {
    if (yourDomain && a.domain === yourDomain) return -1;
    if (yourDomain && b.domain === yourDomain) return 1;
    return a.avgRank - b.avgRank;
  });

  function toggle(d: string) {
    const on = highlighted.includes(d);
    setHighlighted(on ? highlighted.filter((x) => x !== d) : [...highlighted, d]);
    krTrack("kr.serp.competitor_highlight", { domain: d, on: !on });
  }

  return (
    <Section title="Competitors" titleIcon={<Globe size={16} color={TK.brand} />}>
      <div className="space-y-2">
        {list.map((d) => (
          <div
            key={d.domain}
            className="flex items-center justify-between rounded border px-2 py-1"
            style={{ borderColor: TK.borderLight, background: highlighted.includes(d.domain) ? TK.pastel : "#FFF" }}
          >
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={highlighted.includes(d.domain)} onChange={() => toggle(d.domain)} />
              <span className={cn("text-sm", yourDomain && d.domain === yourDomain && "font-semibold")}>
                {d.domain}
                {yourDomain && d.domain === yourDomain && " • you"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Pill title="Average rank">Avg #{d.avgRank}</Pill>
              <Pill title="Share of Top‑10">{Math.round(d.top10Share * 100)}%</Pill>
              <Pill title="WR">{d.wr}</Pill>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

const ComparePanel: React.FC<{
  mode: CompareMode;
  current: Snapshot;
  timeDiff30: TimeDiff;
  timeDiff90: TimeDiff;
  competitorOptions: string[];
}> = ({ mode, current, timeDiff30, timeDiff90, competitorOptions }) => {
  const [timeWindow, setTimeWindow] = React.useState<"30d" | "90d">("30d");
  const [chosen, setChosen] = React.useState<string[]>([]);

  if (mode === "off") return null;

  if (mode === "time") {
    const diff = timeWindow === "30d" ? timeDiff30 : timeDiff90;
    return (
      <Section
        title="Compare Over Time"
        titleIcon={<SearchIcon size={16} color={TK.brand} />}
        right={
          <select
            className="h-8 px-2 rounded border text-sm cursor-pointer"
            style={{ borderColor: TK.border }}
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as any)}
          >
            <option value="30d">Now vs 30d</option>
            <option value="90d">Now vs 90d</option>
          </select>
        }
      >
        <div className="text-xs mb-2" style={{ color: TK.muted }}>
          Baseline: {new Date(diff.baseline).toLocaleDateString()} • Current: {new Date(diff.current).toLocaleDateString()}
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs py-1" style={{ color: TK.muted }}>
                  Domain
                </th>
                <th className="text-right text-xs py-1" style={{ color: TK.muted }}>
                  Old
                </th>
                <th className="text-right text-xs py-1" style={{ color: TK.muted }}>
                  Now
                </th>
                <th className="text-right text-xs py-1" style={{ color: TK.muted }}>
                  Δ
                </th>
                <th className="text-center text-xs py-1" style={{ color: TK.muted }}>
                  FS
                </th>
              </tr>
            </thead>
            <tbody>
              {diff.diff.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t" style={{ borderColor: TK.borderLight }}>
                  <td className="py-1">{r.domain}</td>
                  <td className="py-1 text-right">{r.rankOld ?? "—"}</td>
                  <td className="py-1 text-right">{r.rankNew ?? "—"}</td>
                  <td
                    className="py-1 text-right"
                    style={{ color: (r.delta ?? 0) < 0 ? TK.ok : (r.delta ?? 0) > 0 ? TK.critical : TK.muted }}
                  >
                    {(r.delta ?? 0) > 0 ? "+" : ""}
                    {r.delta}
                  </td>
                  <td className="py-1 text-center">{r.fsGained ? <Check className="h-4 w-4 inline" /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    );
  }

  // competitors
  const org = current.blocks.filter((b) => b.type === "organic").slice(0, 10) as Extract<Block, { type: "organic" }>[];
  const byRank = org.map((o) => ({ rank: o.rank, domain: o.domain }));

  function toggleDom(d: string) {
    setChosen((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 3) return prev;
      return [...prev, d];
    });
  }

  const chosenSet = new Set(chosen);
  const present = competitorOptions.filter((d) => chosenSet.has(d));

  return (
    <Section title="Compare Competitors" titleIcon={<Globe size={16} color={TK.brand} />} right={<div className="text-xs" style={{ color: TK.muted }}>Choose up to 3</div>}>
      <div className="flex flex-wrap gap-2 mb-2">
        {competitorOptions.map((d) => (
          <ChipButton key={d} active={chosen.includes(d)} onClick={() => toggleDom(d)}>
            {d}
          </ChipButton>
        ))}
      </div>
      {present.length === 0 ? (
        <div className="text-sm" style={{ color: TK.muted }}>
          Pick competitors to compare rank positions.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs py-1" style={{ color: TK.muted }}>
                  Pos
                </th>
                {present.map((d) => (
                  <th key={d} className="text-left text-xs py-1" style={{ color: TK.muted }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byRank.map((r) => (
                <tr key={r.rank} className="border-t" style={{ borderColor: TK.borderLight }}>
                  <td className="py-1">#{r.rank}</td>
                  {present.map((d) => (
                    <td key={d} className="py-1">
                      <span
                        className="inline-block rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: r.domain === d ? TK.brand : "transparent",
                          border: `1px solid ${TK.borderLight}`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
};

/* ───────────────────────── Filters Bar (dropdown chips) ───────────────────────── */
const FiltersBar: React.FC<{
  locale: Locale;
  setLocale: (v: Locale) => void;
  overlays: Record<FeatureKey, boolean>;
  setOverlays: React.Dispatch<React.SetStateAction<Record<FeatureKey, boolean>>>;
  compareMode: CompareMode;
  setCompareMode: (m: CompareMode) => void;
  foldOn: boolean;
  setFoldOn: (b: boolean) => void;
}> = ({ locale, setLocale, overlays, setOverlays, compareMode, setCompareMode, foldOn, setFoldOn }) => {
  const toggleFeature = (k: FeatureKey) => setOverlays((o) => ({ ...o, [k]: !o[k] }));
  const featCount = (Object.keys(overlays) as FeatureKey[]).filter((k) => overlays[k]).length;

  return (
    <div className="px-4 py-3 border-b bg-white" style={{ borderColor: TK.borderLight }}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Country */}
        <FilterChip label="Country">
          {["US", "GB", "CA", "AU", "DE"].map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
              <input
                type="radio"
                name="country"
                checked={locale.country === c}
                onChange={() => setLocale({ ...locale, country: c })}
              />
              <span>{c}</span>
            </label>
          ))}
        </FilterChip>

        {/* Language */}
        <FilterChip label="Language">
          {["en", "es", "fr", "de"].map((l) => (
            <label key={l} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
              <input
                type="radio"
                name="lang"
                checked={locale.language === l}
                onChange={() => setLocale({ ...locale, language: l })}
              />
              <span className="uppercase">{l}</span>
            </label>
          ))}
        </FilterChip>

        {/* Device */}
        <FilterChip label="Device">
          <label className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
            <input
              type="radio"
              name="device"
              checked={locale.device === "desktop"}
              onChange={() => setLocale({ ...locale, device: "desktop" })}
            />
            <Monitor className="h-4 w-4" /> Desktop
          </label>
          <label className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
            <input
              type="radio"
              name="device"
              checked={locale.device === "mobile"}
              onChange={() => setLocale({ ...locale, device: "mobile" })}
            />
            <Smartphone className="h-4 w-4" /> Mobile
          </label>
        </FilterChip>

        {/* Features (overlay toggles) */}
        <FilterChip label="Features" count={featCount}>
          {(["fs", "paa", "video", "images", "local", "shopping", "news", "sitelinks"] as FeatureKey[]).map((k) => (
            <label key={k} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={overlays[k]} onChange={() => toggleFeature(k)} />
                <span className="uppercase">{k}</span>
              </span>
              {overlays[k] ? <Check className="h-4 w-4" /> : null}
            </label>
          ))}
        </FilterChip>

        {/* Compare */}
        <FilterChip label="Compare">
          {(["off", "time", "competitors"] as CompareMode[]).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
              <input type="radio" name="cmp" checked={compareMode === m} onChange={() => setCompareMode(m)} />
              <span className="capitalize">{m}</span>
            </label>
          ))}
        </FilterChip>

        {/* View options */}
        <FilterChip label="View">
          <label className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-[#F7FAFC] cursor-pointer">
            <input type="checkbox" checked={foldOn} onChange={(e) => setFoldOn(e.target.checked)} />
            Show fold line
          </label>
        </FilterChip>
      </div>
    </div>
  );
};

/* ───────────────────────── Main Tab Component ───────────────────────── */
type SerpSnapshotProps = {
  initialKeyword?: string;
  mode?: "domain" | "no-domain";
  yourDomain?: string;
  competitors?: string[];
  defaultLocale?: Locale;
};

const SerpSnapshot: React.FC<SerpSnapshotProps> = ({
  initialKeyword = "technical seo checklist",
  mode = "domain",
  yourDomain = "example.com",
  competitors = ["brand.io", "moz.com", "ahrefs.com"],
  defaultLocale = { country: "US", language: "en", device: "desktop" },
}) => {
  const [keyword, setKeyword] = React.useState(initialKeyword);
  const [locale, setLocale] = React.useState<Locale>(defaultLocale);
  const [snapshot, setSnapshot] = React.useState<Snapshot>(() => generateSnapshot(initialKeyword, defaultLocale));
  const [overlays, setOverlays] = React.useState<Record<FeatureKey, boolean>>({
    fs: true,
    paa: true,
    video: false,
    images: false,
    local: false,
    shopping: false,
    news: false,
    sitelinks: false,
  });
  const [foldOn, setFoldOn] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [compareMode, setCompareMode] = React.useState<CompareMode>("off");
  const [showFromRank, setShowFromRank] = React.useState(1);
  const [highlightedDomains, setHighlightedDomains] = React.useState<string[]>([]);

  const timeDiff30 = React.useMemo(() => generateBaselineTimeDiff(snapshot, 30), [snapshot.capturedAt]);
  const timeDiff90 = React.useMemo(() => generateBaselineTimeDiff(snapshot, 90), [snapshot.capturedAt]);

  function refresh() {
    if (fetching) return;
    setFetching(true);
    setTimeout(() => {
      const next = generateSnapshot(keyword, locale);
      setSnapshot(next);
      setShowFromRank(1);
      setFetching(false);
    }, 800 + Math.random() * 600);
  }

  React.useEffect(() => {
    const next = generateSnapshot(keyword.trim() || initialKeyword, locale);
    setSnapshot(next);
    setShowFromRank(1);
    krTrack("kr.serp.opened", { keyword: next.keyword, country: locale.country, language: locale.language, device: locale.device, snapshotAgeDays: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, locale.device, locale.country, locale.language]);

  const competitorOptions = Array.from(new Set([...competitors, ...snapshot.domainsSummary.map((d) => d.domain)]));

  function exportCSV() {
    const rows = (snapshot.blocks.filter((b) => b.type === "organic").slice(0, 10) as Extract<Block, { type: "organic" }>[]).map((o) => ({
      rank: o.rank,
      domain: o.domain,
      title: o.title,
      url: o.url,
      wr: o.wr,
      lr: o.lr,
      contentType: o.contentType,
    }));
    const headers = Object.keys(rows[0] || { rank: "", domain: "", title: "", url: "", wr: "", lr: "", contentType: "" });
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${snapshot.keyword.replace(/\s+/g, "-")}-serp-top10.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function copyJSON() {
    const json = JSON.stringify(snapshot, null, 2);
    navigator.clipboard?.writeText(json);
  }

  return (
    <div className="w-full bg-white" style={{ fontFamily: fontStack, color: TK.text }}>
      {/* ── Section header: SERP Snapshot Viewer ── */}
      <div className="px-4 py-3 border-b bg-white flex items-center justify-between" style={{ borderColor: TK.borderLight }}>
        <div className="flex items-center gap-2">
          <SearchIcon size={18} color={TK.brand} />
          <h2 className="text-[15px] font-semibold" style={{ color: TK.text }}>
            SERP Snapshot Viewer
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-[#F7FAFC]" style={{ borderColor: TK.borderLight }} onClick={exportCSV} title="Export CSV">
            <FileDown className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Export</span>
          </button>
        </div>
      </div>

      {/* Filters bar (dropdown chips) */}
      <FiltersBar
        locale={locale}
        setLocale={setLocale}
        overlays={overlays}
        setOverlays={setOverlays}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        foldOn={foldOn}
        setFoldOn={setFoldOn}
      />

      {/* Sticky snapshot header (search, refresh, json, age) */}
      <SnapshotHeader
        keyword={keyword}
        setKeyword={setKeyword}
        locale={locale}
        capturedAt={snapshot.capturedAt}
        onRefresh={refresh}
        fetching={fetching}
        onCopyJSON={copyJSON}
      />

      {/* Body: comfortable 2‑column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 p-4">
        {/* Left: SERP list viewer */}
        <Section
          title="SERP Viewer"
          titleIcon={<SearchIcon size={16} color={TK.brand} />}
          right={
            <div className="inline-flex items-center gap-2">
              <button
                className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderLight }}
                onClick={() => alert("Open Analyzer Drawer")}
                title="Open Analyzer"
              >
                <Eye className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Analyzer</span>
              </button>
              <button
                className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-[#F7FAFC]"
                style={{ borderColor: TK.borderLight }}
                onClick={() => alert("Add to Cluster")}
                title="Add to Cluster"
              >
                <Plus className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Cluster</span>
              </button>
              {mode === "domain" && (
                <button
                  className="h-8 px-3 rounded border text-sm cursor-pointer hover:bg-[#F7FAFC]"
                  style={{ borderColor: TK.borderLight }}
                  onClick={() => alert("Add to Tracking")}
                  title="Add to Tracking"
                >
                  <TargetIcon className="h-4 w-4 inline -mt-0.5" /> <span className="ml-1">Track</span>
                </button>
              )}
            </div>
          }
          className="xl:col-span-1"
        >
          <SerpViewer
            snapshot={snapshot}
            overlays={overlays}
            foldOn={foldOn}
            yourDomain={mode === "domain" ? yourDomain : undefined}
            highlightedDomains={highlightedDomains}
            device={locale.device}
            showFromRank={showFromRank}
            onLoadMore={() => setShowFromRank(11)}
          />
          <div className="mt-2 text-xs" style={{ color: TK.muted }}>
            {snapshot.features.includes("fs") && <span className="mr-2">FS present; clicks dampened for Top‑3.</span>}
            {ageLabel(snapshot.capturedAt).endsWith("d ago") && (
              <span className="px-2 py-0.5 rounded border text-[11px]" style={{ borderColor: TK.borderLight, background: "#FFF3CD", color: "#92400E" }}>
                Stale snapshot
              </span>
            )}
          </div>
        </Section>

        {/* Right: Analytics */}
        <div className="xl:col-span-1 space-y-4">
          <OccupancyMap occ={snapshot.occupancy.aboveFoldPct} />
          <FeaturesHeatmap snapshot={snapshot} />
          <CompetitorPanel
            snapshot={snapshot}
            yourDomain={mode === "domain" ? yourDomain : undefined}
            competitors={competitors}
            highlighted={highlightedDomains}
            setHighlighted={setHighlightedDomains}
          />
          <ComparePanel mode={compareMode} current={snapshot} timeDiff30={timeDiff30} timeDiff90={timeDiff90} competitorOptions={competitorOptions} />
        </div>
      </div>

      {/* Footer meta */}
      <div className="px-4 py-3 border-t text-xs flex items-center justify-between" style={{ borderColor: TK.borderLight, color: TK.muted }}>
        <div>
          Keyword:{" "}
          <strong style={{ color: TK.text }}>
            {snapshot.keyword}
          </strong>{" "}
          • {locale.country}-{locale.language.toUpperCase()} • {locale.device}
        </div>
        <div>Captured: {new Date(snapshot.capturedAt).toLocaleString()}</div>
      </div>
    </div>
  );
};

/* ───────────────────────── Demo Wrapper (drop‑in) ───────────────────────── */
export default function DemoSerpSnapshot() {
  const [mode, setMode] = React.useState<"domain" | "no-domain">("domain");
  const [yourDomain, setYourDomain] = React.useState("example.com");

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: fontStack }}>
      {/* Quick demo controls (kept minimal) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm" style={{ color: TK.muted }}>
          Mode:
        </span>
        <button
          className={cn("h-8 px-3 rounded border text-sm cursor-pointer", mode === "domain" ? "font-semibold" : "hover:bg-[#F7FAFC]")}
          style={{ borderColor: TK.borderLight }}
          onClick={() => setMode("domain")}
        >
          Domain‑Aware
        </button>
        <button
          className={cn("h-8 px-3 rounded border text-sm cursor-pointer", mode === "no-domain" ? "font-semibold" : "hover:bg-[#F7FAFC]")}
          style={{ borderColor: TK.borderLight }}
          onClick={() => setMode("no-domain")}
        >
          No‑Domain
        </button>

        {mode === "domain" && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-sm" style={{ color: TK.muted }}>
              Your domain:
            </span>
            <input className="h-8 px-2 rounded border" style={{ borderColor: TK.border }} value={yourDomain} onChange={(e) => setYourDomain(e.target.value)} />
          </div>
        )}
      </div>

      <SerpSnapshot
        initialKeyword="technical seo checklist"
        mode={mode}
        yourDomain={yourDomain}
        competitors={["brand.io", "moz.com", "ahrefs.com", "webfx.com"]}
        defaultLocale={{ country: "US", language: "en", device: "desktop" }}
      />
    </div>
  );
}

