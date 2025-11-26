"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  BadgeCheck,
  BadgePlus,
  Brain,
  ClipboardList,
  Download,
  ExternalLink,
  HelpCircle,
  Info,
  ListChecks,
  ListPlus,
  ScanSearch,
  Search,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ────────────────────────────────────────────────────────────────────────────
   Global tokens + Inter / Inter Fallback (aligned with recent designs)
──────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
:root{
  --wr-brand:#008CCD;
  --wr-brand-hover:#067AAF;
  --wr-text:#111827;
  --wr-muted:#6B7280;
  --wr-surface:#FFFFFF;
  --wr-subtle:#F5F7FA;
  --wr-border:#E5E7EB;
  --wr-borderLight:#EFF0F6;
  --wr-success:#28C76F;
  --wr-warning:#FF9F43;
  --wr-danger:#EA5455;
  --wr-accent:#D9EEF8;
  --wr-radius:12px;
}
.wr-font{font-family:Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;}
`}</style>
);

const TK = {
  brand: "var(--wr-brand)",
  brandHover: "var(--wr-brand-hover)",
  text: "var(--wr-text)",
  muted: "var(--wr-muted)",
  surface: "var(--wr-surface)",
  subtle: "var(--wr-subtle)",
  border: "var(--wr-border)",
  borderLight: "var(--wr-borderLight)",
  success: "var(--wr-success)",
  warning: "var(--wr-warning)",
  danger: "var(--wr-danger)",
  accent: "var(--wr-accent)",
  radius: "var(--wr-radius)",
};

/* ────────────────────────────────────────────────────────────────────────────
   Types + demo data
──────────────────────────────────────────────────────────────────────────── */
type TermRow = {
  id: string;
  term: string;
  yourCount: number;
  yourTF: number;
  topAvgCount: number;
  topAvgTF: number;
  idf: number;
  volume: number;
};
type TermStatus = "missing" | "underused" | "overused" | "balanced";

type EntityType =
  | "ORG"
  | "PERSON"
  | "PRODUCT"
  | "PLACE"
  | "EVENT"
  | "CONCEPT"
  | "PROCESS";
type EntityRow = {
  id: string;
  name: string;
  type: EntityType;
  present: boolean;
  salience: number; // 0..1
  recommendations?: string[];
};

type QuestionRow = {
  id: string;
  q: string;
  source: "PAA" | "Forum" | "PAS";
  volume: number;
  difficulty: number; // 0..100
  matchScore: number; // 0..100
  url?: string;
};

type VariantCluster = {
  id: string;
  label: string;
  primary: string;
  items: { id: string; text: string }[];
  cohesion: number; // 0..1
};

/* Demo helpers */
const fmt = (n: number) => n.toLocaleString();
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const choice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const DEMO_TERMS: TermRow[] = (() => {
  const base = [
    "technical seo audit",
    "site audit",
    "seo checklist",
    "internal links",
    "xml sitemap",
    "canonical tag",
    "meta description",
    "title tag length",
    "core web vitals",
    "page speed",
    "image alt text",
    "structured data",
    "schema markup",
    "breadcrumbs",
    "hreflang",
    "robots.txt",
    "nofollow",
    "backlink profile",
    "keyword cannibalization",
    "duplicate content",
    "content pruning",
    "topical authority",
    "search intent",
    "orphan pages",
  ];
  return base.map((t, i) => {
    const topAvgCount = Math.round(rand(2, 9));
    const yourCount = Math.max(0, Math.round(topAvgCount * rand(0, 1.8) - rand(0, 2)));
    const topAvgTF = +(topAvgCount / 100 + rand(0, 0.02)).toFixed(4);
    const yourTF = +(yourCount / 100 + rand(0, 0.02)).toFixed(4);
    const idf = +(rand(1.2, 4.0)).toFixed(2);
    return {
      id: `t-${i + 1}`,
      term: t,
      yourCount,
      yourTF,
      topAvgCount,
      topAvgTF,
      idf,
      volume: Math.round(rand(90, 5400)),
    };
  });
})();

const DEMO_ENTITIES: EntityRow[] = [
  {
    id: "e-1",
    name: "Google Search Console",
    type: "PRODUCT",
    present: true,
    salience: 0.82,
    recommendations: ["Reference coverage report", "Link to help article"],
  },
  {
    id: "e-2",
    name: "Core Web Vitals",
    type: "CONCEPT",
    present: true,
    salience: 0.76,
    recommendations: ["Add field data reference (CrUX)"],
  },
  { id: "e-3", name: "XML sitemap", type: "PROCESS", present: true, salience: 0.61 },
  {
    id: "e-4",
    name: "PageSpeed Insights",
    type: "PRODUCT",
    present: false,
    salience: 0.52,
    recommendations: ["Include a PSI walkthrough section"],
  },
  {
    id: "e-5",
    name: "Lighthouse",
    type: "PRODUCT",
    present: false,
    salience: 0.46,
    recommendations: ["Add audit steps & screenshots"],
  },
  {
    id: "e-6",
    name: "E‑E‑A‑T",
    type: "CONCEPT",
    present: false,
    salience: 0.39,
    recommendations: ["Add author bio & sources section"],
  },
  {
    id: "e-7",
    name: "Screaming Frog",
    type: "PRODUCT",
    present: false,
    salience: 0.34,
    recommendations: ["Mention crawl limits and setup tips"],
  },
  { id: "e-8", name: "Ahrefs", type: "PRODUCT", present: true, salience: 0.28 },
];

const DEMO_QS: QuestionRow[] = [
  { id: "q1", q: "What is a technical SEO audit?", source: "PAA", volume: 1600, difficulty: 28, matchScore: 89, url: "#" },
  { id: "q2", q: "How often should you run a site audit?", source: "PAA", volume: 700, difficulty: 34, matchScore: 78, url: "#" },
  { id: "q3", q: "How do I fix core web vitals failing?", source: "PAA", volume: 1100, difficulty: 42, matchScore: 73, url: "#" },
  { id: "q4", q: "SEO checklist for new website", source: "PAA", volume: 1900, difficulty: 30, matchScore: 81, url: "#" },
  { id: "q5", q: "Is duplicate content bad for SEO?", source: "PAA", volume: 1000, difficulty: 36, matchScore: 65, url: "#" },
  { id: "q6", q: "How to set canonical tags correctly?", source: "PAA", volume: 600, difficulty: 33, matchScore: 72, url: "#" },
  { id: "q7", q: "What is keyword cannibalization?", source: "PAA", volume: 850, difficulty: 31, matchScore: 70, url: "#" },
  { id: "q8", q: "How long should meta descriptions be?", source: "PAA", volume: 2100, difficulty: 24, matchScore: 76, url: "#" },
];

const DEMO_CLUSTERS: VariantCluster[] = [
  {
    id: "c1",
    label: "audit",
    primary: "technical seo audit",
    cohesion: 0.86,
    items: [
      { id: "c1-1", text: "site audit" },
      { id: "c1-2", text: "website audit" },
      { id: "c1-3", text: "full seo audit" },
      { id: "c1-4", text: "technical website audit" },
      { id: "c1-5", text: "on‑page audit" },
    ],
  },
  {
    id: "c2",
    label: "speed",
    primary: "page speed",
    cohesion: 0.78,
    items: [
      { id: "c2-1", text: "core web vitals" },
      { id: "c2-2", text: "lcp fid cls" },
      { id: "c2-3", text: "pagespeed insights" },
      { id: "c2-4", text: "web performance" },
    ],
  },
  {
    id: "c3",
    label: "markup",
    primary: "structured data",
    cohesion: 0.73,
    items: [
      { id: "c3-1", text: "schema markup" },
      { id: "c3-2", text: "json‑ld" },
      { id: "c3-3", text: "rich results" },
    ],
  },
  {
    id: "c4",
    label: "links",
    primary: "internal links",
    cohesion: 0.69,
    items: [
      { id: "c4-1", text: "orphan pages" },
      { id: "c4-2", text: "anchor text" },
      { id: "c4-3", text: "silo structure" },
    ],
  },
];

/* ────────────────────────────────────────────────────────────────────────────
   Logic helpers
──────────────────────────────────────────────────────────────────────────── */
function classifyTerm(
  r: TermRow,
  thresholds: {
    missingMinTopTF: number;
    underFactor: number;
    overFactor: number;
    minYourTFForOver: number;
    minTopTFForUnder: number;
  }
): TermStatus {
  const { missingMinTopTF, underFactor, overFactor, minYourTFForOver, minTopTFForUnder } = thresholds;
  if (r.yourTF === 0 && r.topAvgTF >= missingMinTopTF) return "missing";
  if (r.topAvgTF >= minTopTFForUnder && r.yourTF > 0 && r.yourTF < r.topAvgTF * underFactor) return "underused";
  if (r.yourTF >= minYourTFForOver && r.yourTF > r.topAvgTF * overFactor) return "overused";
  return "balanced";
}
const tinyBar = (value: number, max = 1) => (
  <div className="relative h-2 w-[96px] rounded bg-gray-200">
    <div
      className="h-2 rounded"
      style={{
        width: `${Math.min(100, Math.round((value / max) * 100))}%`,
        backgroundColor: value > 0.4 ? TK.success : value > 0.15 ? TK.warning : TK.danger,
      }}
    />
  </div>
);
function highlight(text: string, q: string) {
  if (!q) return text;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${safe})`, "ig");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="rounded px-1" style={{ background: TK.accent }}>
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Reusable UI micro pieces
──────────────────────────────────────────────────────────────────────────── */
function IconAction({
  label,
  children,
  onClick,
  href,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <button
      className="inline-grid h-8 w-8 place-items-center rounded-md border bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
      style={{ borderColor: TK.border }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-grid h-8 w-8 place-items-center rounded-md border bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
              style={{ borderColor: TK.border }}
              aria-label={label}
              title={label}
            >
              {children}
            </a>
          ) : (
            content
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TogglePill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-full border inline-flex items-center gap-2 cursor-pointer ${
        active ? "" : "hover:bg-[var(--wr-subtle)]"
      }`}
      style={{
        borderColor: TK.border,
        background: active ? TK.accent : "#fff",
        color: active ? TK.brand : TK.text,
      }}
      aria-pressed={active}
      title={label}
    >
      <span className="inline-grid h-4 w-4 place-items-center" style={{ color: active ? TK.brand : TK.text }}>
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full border text-sm inline-flex items-center gap-2 cursor-pointer ${
        active ? "bg-[rgba(0,140,205,0.08)] text-[#008CCD] border-[#008CCD33]" : "bg-white hover:bg-[var(--wr-subtle)]"
      }`}
      title={title}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Component
──────────────────────────────────────────────────────────────────────────── */
export default function OpportunitiesGapsSection() {
  const [active, setActive] = useState<"terms" | "entities" | "questions" | "variants">("terms");
  const [query, setQuery] = useState("");

  // Filters (chips)
  const [volMin, setVolMin] = useState(0); // terms & questions
  const [statusPick, setStatusPick] = useState<("missing" | "underused" | "overused" | "balanced")[]>([]);
  const [entHighSalience, setEntHighSalience] = useState(false);
  const [qMinMatch, setQMinMatch] = useState(false); // ≥70%
  const [qMaxDiff, setQMaxDiff] = useState(false); // ≤35
  const [vCohesion, setVCohesion] = useState(false); // ≥0.75

  // Thresholds
  const [termThresholds] = useState({
    missingMinTopTF: 0.006,
    underFactor: 0.6,
    overFactor: 1.4,
    minYourTFForOver: 0.01,
    minTopTFForUnder: 0.006,
  });

  // Selections
  const [selTerms, setSelTerms] = useState<Record<string, boolean>>({});
  const [selEntities, setSelEntities] = useState<Record<string, boolean>>({});
  const [selQs, setSelQs] = useState<Record<string, boolean>>({});
  const [selVars, setSelVars] = useState<Record<string, boolean>>({});

  const selectedCount =
    Object.values(selTerms).filter(Boolean).length +
    Object.values(selEntities).filter(Boolean).length +
    Object.values(selQs).filter(Boolean).length +
    Object.values(selVars).filter(Boolean).length;

  /* Derived datasets */
  const enrichedTerms = useMemo(() => {
    return DEMO_TERMS.map((r) => {
      const status = classifyTerm(r, termThresholds);
      const deltaTF = r.yourTF - r.topAvgTF;
      const tfidfYour = +(r.yourTF * r.idf).toFixed(4);
      const tfidfTop = +(r.topAvgTF * r.idf).toFixed(4);
      const deltaPct = r.topAvgTF > 0 ? r.yourTF / r.topAvgTF - 1 : 0;
      return { ...r, status, deltaTF, tfidfYour, tfidfTop, deltaPct };
    });
  }, [termThresholds]);

  const fTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrichedTerms
      .filter((r) => (q ? r.term.toLowerCase().includes(q) : true))
      .filter((r) => (statusPick.length ? statusPick.includes(r.status) : true))
      .filter((r) => r.volume >= volMin)
      .sort((a, b) => {
        const order = { missing: 0, underused: 1, overused: 2, balanced: 3 } as Record<TermStatus, number>;
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return Math.abs(b.deltaTF) - Math.abs(a.deltaTF);
      });
  }, [enrichedTerms, query, statusPick, volMin]);

  const termsVisibleIds = fTerms.map((t) => t.id);
  const termsAllSelected =
    termsVisibleIds.length > 0 && termsVisibleIds.every((id) => selTerms[id]);
  const termsSomeSelected =
    termsVisibleIds.some((id) => selTerms[id]) && !termsAllSelected;

  const fEntities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_ENTITIES
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .filter((e) => (entHighSalience ? e.salience >= 0.5 : true))
      .sort((a, b) => Number(b.present) - Number(a.present) || b.salience - a.salience);
  }, [query, entHighSalience]);

  const fQs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_QS
      .filter((x) => (q ? x.q.toLowerCase().includes(q) : true))
      .filter((x) => x.volume >= volMin)
      .filter((x) => (qMinMatch ? x.matchScore >= 70 : true))
      .filter((x) => (qMaxDiff ? x.difficulty <= 35 : true))
      .sort((a, b) => b.matchScore - a.matchScore || b.volume - a.volume);
  }, [query, volMin, qMinMatch, qMaxDiff]);

  const qsVisibleIds = fQs.map((q) => q.id);
  const qsAllSelected =
    qsVisibleIds.length > 0 && qsVisibleIds.every((id) => selQs[id]);
  const qsSomeSelected =
    qsVisibleIds.some((id) => selQs[id]) && !qsAllSelected;

  const fClusters = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_CLUSTERS
      .filter((c) =>
        q
          ? (c.primary + " " + c.items.map((i) => i.text).join(" ")).toLowerCase().includes(q)
          : true
      )
      .filter((c) => (vCohesion ? c.cohesion >= 0.75 : true))
      .sort((a, b) => b.cohesion - a.cohesion);
  }, [query, vCohesion]);

  const clearSelections = () => {
    setSelTerms({});
    setSelEntities({});
    setSelQs({});
    setSelVars({});
  };

  /* Export */
  const exportCSV = () => {
    let header = "";
    let lines = "";
    if (active === "terms") {
      header =
        "term,yourCount,yourTF,topAvgCount,topAvgTF,idf,volume,status,deltaTF,tfidfYour,tfidfTop,deltaPct";
      lines = fTerms
        .map((r: any) =>
          [
            r.term,
            r.yourCount,
            r.yourTF,
            r.topAvgCount,
            r.topAvgTF,
            r.idf,
            r.volume,
            r.status,
            r.deltaTF,
            r.tfidfYour,
            r.tfidfTop,
            r.deltaPct,
          ]
            .map((v) => JSON.stringify(v))
            .join(",")
        )
        .join("\n");
    } else if (active === "entities") {
      header = "name,type,present,salience,recommendations";
      lines = fEntities
        .map((e) =>
          [
            e.name,
            e.type,
            e.present ? 1 : 0,
            e.salience,
            (e.recommendations || []).join(" | "),
          ]
            .map((v) => JSON.stringify(v))
            .join(",")
        )
        .join("\n");
    } else if (active === "questions") {
      header = "question,source,volume,difficulty,matchScore,url";
      lines = fQs
        .map((q) =>
          [q.q, q.source, q.volume, q.difficulty, q.matchScore, q.url || ""]
            .map((v) => JSON.stringify(v))
            .join(",")
        )
        .join("\n");
    } else {
      header = "cluster,primary,cohesion,variant";
      lines = fClusters
        .flatMap((c) =>
          c.items.map((i) =>
            [c.label, c.primary, c.cohesion, i.text]
              .map((v) => JSON.stringify(v))
              .join(",")
          )
        )
        .join("\n");
    }
    const blob = new Blob([header + "\n" + lines], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `opportunities_${active}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <GlobalTokens />
      <section className="wr-font space-y-3 mt-4">
        <Card className="border w-full" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
          {/* Header */}
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" color="#008CCD" />
              <CardTitle className="text-lg">Opportunities & Gaps</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-pointer" color="#008CCD" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[320px]">
                    Compare your page to top results to find missing/underused terms, entities, PAA questions, and keyword variants.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search terms, entities, questions…"
                  className="w-[260px] pl-7"
                />
              </div>

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" color="#008CCD" /> Export
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Toggles (brand pastel on active) */}
            <div
              className="flex flex-wrap items-center gap-2 border-b px-1 pb-2"
              style={{ borderColor: TK.borderLight }}
            >
              <TogglePill
                active={active === "terms"}
                onClick={() => setActive("terms")}
                icon={<ScanSearch className="h-4 w-4" color="#008CCD" />}
                label="Terms (TF‑IDF)"
              />
              <TogglePill
                active={active === "entities"}
                onClick={() => setActive("entities")}
                icon={<Brain className="h-4 w-4" color="#008CCD" />}
                label="Entities"
              />
              <TogglePill
                active={active === "questions"}
                onClick={() => setActive("questions")}
                icon={<HelpCircle className="h-4 w-4" color="#008CCD" />}
                label="PAA / Questions"
              />
              <TogglePill
                active={active === "variants"}
                onClick={() => setActive("variants")}
                icon={<Wand2 className="h-4 w-4" color="#008CCD" />}
                label="Synonyms & Variants"
              />
            </div>

            {/* Filter chips row (below toggles, above content) */}
            <div className="px-1 py-2">
              {active === "terms" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    active={statusPick.includes("missing")}
                    onClick={() =>
                      setStatusPick((s) =>
                        s.includes("missing") ? s.filter((x) => x !== "missing") : [...s, "missing"]
                      )
                    }
                    title="Show Missing"
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.danger }} />
                    Missing
                  </Chip>
                  <Chip
                    active={statusPick.includes("underused")}
                    onClick={() =>
                      setStatusPick((s) =>
                        s.includes("underused") ? s.filter((x) => x !== "underused") : [...s, "underused"]
                      )
                    }
                    title="Show Underused"
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: TK.warning }} />
                    Underused
                  </Chip>
                  <Chip
                    active={statusPick.includes("overused")}
                    onClick={() =>
                      setStatusPick((s) =>
                        s.includes("overused") ? s.filter((x) => x !== "overused") : [...s, "overused"]
                      )
                    }
                    title="Show Overused"
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#EF4444" }} />
                    Overused
                  </Chip>

                  <span className="mx-1 h-4 w-px bg-[var(--wr-borderLight)]" />

                  {([0, 100, 500, 1000, 3000] as const).map((v) => (
                    <Chip
                      key={v}
                      active={volMin === v}
                      onClick={() => setVolMin(v)}
                      title={`Min volume ${v}`}
                    >
                      Vol ≥ {fmt(v)}
                    </Chip>
                  ))}

                  <Button variant="outline" size="sm" className="ml-1 cursor-pointer" onClick={() => { setStatusPick([]); setVolMin(0); }}>
                    Clear
                  </Button>
                </div>
              )}

              {active === "entities" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    active={entHighSalience}
                    onClick={() => setEntHighSalience((v) => !v)}
                    title="Only salience ≥ 0.5"
                  >
                    High salience
                  </Chip>
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setEntHighSalience(false)}>
                    Clear
                  </Button>
                </div>
              )}

              {active === "questions" && (
                <div className="flex flex-wrap items-center gap-2">
                  {([0, 100, 500, 1000] as const).map((v) => (
                    <Chip
                      key={v}
                      active={volMin === v}
                      onClick={() => setVolMin(v)}
                      title={`Min volume ${v}`}
                    >
                      Vol ≥ {fmt(v)}
                    </Chip>
                  ))}
                  <Chip
                    active={qMinMatch}
                    onClick={() => setQMinMatch((v) => !v)}
                    title="Match score ≥ 70%"
                  >
                    Match ≥ 70%
                  </Chip>
                  <Chip
                    active={qMaxDiff}
                    onClick={() => setQMaxDiff((v) => !v)}
                    title="Difficulty ≤ 35"
                  >
                    Diff ≤ 35
                  </Chip>
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setVolMin(0); setQMinMatch(false); setQMaxDiff(false); }}>
                    Clear
                  </Button>
                </div>
              )}

              {active === "variants" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Chip
                    active={vCohesion}
                    onClick={() => setVCohesion((v) => !v)}
                    title="Cohesion ≥ 0.75"
                  >
                    Cohesion ≥ 0.75
                  </Chip>
                  <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setVCohesion(false)}>
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {/* Content */}
            <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="w-full">
              {/* TERMS */}
              <TabsContent value="terms" className="mt-2">
                <div
                  className="max-h-[560px] overflow-auto border rounded"
                  style={{ borderColor: TK.borderLight }}
                >
                  <Table className="text-sm">
                    <TableHeader className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                      <TableRow>
                        <TableHead className="w-[46px]">
                          <Checkbox
                            checked={(termsSomeSelected ? ("indeterminate" as any) : termsAllSelected) as any}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              termsVisibleIds.forEach((id) => (patch[id] = on));
                              setSelTerms((s) => ({ ...s, ...patch }));
                            }}
                          />
                        </TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Your count</TableHead>
                        <TableHead>Your TF</TableHead>
                        <TableHead>Top‑10 avg</TableHead>
                        <TableHead>Top‑10 TF</TableHead>
                        <TableHead>Δ TF</TableHead>
                        <TableHead>TF‑IDF (you / top)</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fTerms.map((r) => {
                        const delta = r.deltaTF;
                        const deltaTone = delta < 0 ? "text-red-600" : delta > 0 ? "text-green-600" : "text-gray-600";
                        const statusColor =
                          r.status === "missing"
                            ? TK.danger
                            : r.status === "underused"
                            ? TK.warning
                            : r.status === "overused"
                            ? "#EF4444"
                            : "#6B7280";
                        return (
                          <TableRow key={r.id} className="hover:bg-[#F5F7FA]">
                            <TableCell>
                              <Checkbox
                                checked={!!selTerms[r.id]}
                                onCheckedChange={(v) =>
                                  setSelTerms((s) => ({ ...s, [r.id]: Boolean(v) }))
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">{highlight(r.term, query)}</TableCell>
                            <TableCell>{r.yourCount}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {tinyBar(r.yourTF, Math.max(r.yourTF, r.topAvgTF, 0.05))}
                                <span className="text-[12px] text-muted-foreground">{r.yourTF.toFixed(3)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{r.topAvgCount.toFixed(1)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {tinyBar(r.topAvgTF, Math.max(r.yourTF, r.topAvgTF, 0.05))}
                                <span className="text-[12px] text-muted-foreground">{r.topAvgTF.toFixed(3)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={deltaTone}>
                                {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta).toFixed(3)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs">
                                <strong>{r.tfidfYour.toFixed(3)}</strong>
                                <span className="text-muted-foreground"> / {r.tfidfTop.toFixed(3)}</span>
                              </span>
                            </TableCell>
                            <TableCell>{fmt(r.volume)}</TableCell>
                            <TableCell>
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-xs"
                                style={{ background: "#fff", border: `1px solid ${TK.border}`, color: statusColor }}
                              >
                                <span className="h-2 w-2 rounded-full" style={{ background: statusColor }} />
                                {r.status === "missing"
                                  ? "Missing"
                                  : r.status === "underused"
                                  ? "Underused"
                                  : r.status === "overused"
                                  ? "Overused"
                                  : "OK"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="inline-flex items-center gap-1.5">
                                <IconAction label="Add to Targeted" onClick={() => setSelTerms((s) => ({ ...s, [r.id]: true }))}>
                                  <Target className="h-4 w-4" color="#008CCD" />
                                </IconAction>
                                <IconAction label="Create Task" onClick={() => console.log("Task for", r.term)}>
                                  <ClipboardList className="h-4 w-4" color="#008CCD" />
                                </IconAction>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {fTerms.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                            No terms match current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* ENTITIES */}
              <TabsContent value="entities" className="mt-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* Detected */}
                  <Card className="border" style={{ borderColor: TK.border }}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4" color="#008CCD" />
                          <div className="font-medium">Detected</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {fEntities.filter((e) => e.present).length}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-[420px] pr-2">
                        <div className="divide-y" style={{ borderColor: TK.borderLight }}>
                          {fEntities
                            .filter((e) => e.present)
                            .map((e) => (
                              <div key={e.id} className="flex items-start gap-3 py-3">
                                <Checkbox
                                  checked={!!selEntities[e.id]}
                                  onCheckedChange={(v) =>
                                    setSelEntities((s) => ({ ...s, [e.id]: Boolean(v) }))
                                  }
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{highlight(e.name, query)}</span>
                                    <span className="text-xs rounded bg-gray-100 px-1.5 py-[2px]">{e.type}</span>
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      salience {e.salience.toFixed(2)}
                                    </span>
                                  </div>
                                  {!!e.recommendations?.length && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Tips: {e.recommendations.join(" · ")}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <IconAction label="Add to Targeted">
                                    <BadgePlus className="h-4 w-4" color="#008CCD" />
                                  </IconAction>
                                </div>
                              </div>
                            ))}
                          {fEntities.filter((e) => e.present).length === 0 && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              No detected entities in current filters.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Missing */}
                  <Card className="border" style={{ borderColor: TK.border }}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" color="#008CCD" />
                          <div className="font-medium">Missing / Suggested</div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {fEntities.filter((e) => !e.present).length}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ScrollArea className="max-h-[420px] pr-2">
                        <div className="divide-y" style={{ borderColor: TK.borderLight }}>
                          {fEntities
                            .filter((e) => !e.present)
                            .map((e) => (
                              <div key={e.id} className="flex items-start gap-3 py-3">
                                <Checkbox
                                  checked={!!selEntities[e.id]}
                                  onCheckedChange={(v) =>
                                    setSelEntities((s) => ({ ...s, [e.id]: Boolean(v) }))
                                  }
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{highlight(e.name, query)}</span>
                                    <span className="text-xs rounded bg-gray-100 px-1.5 py-[2px]">{e.type}</span>
                                    <span className="ml-1 text-xs text-red-600">missing</span>
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      salience {e.salience.toFixed(2)}
                                    </span>
                                  </div>
                                  {!!e.recommendations?.length && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      Suggest: {e.recommendations.join(" · ")}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <IconAction label="Create Task">
                                    <ClipboardList className="h-4 w-4" color="#008CCD" />
                                  </IconAction>
                                  <IconAction label="Insert into Draft">
                                    <BadgePlus className="h-4 w-4" color="#008CCD" />
                                  </IconAction>
                                </div>
                              </div>
                            ))}
                          {fEntities.filter((e) => !e.present).length === 0 && (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                              No missing entities detected.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* QUESTIONS */}
              <TabsContent value="questions" className="mt-2">
                <div
                  className="max-h-[560px] overflow-auto border rounded"
                  style={{ borderColor: TK.borderLight }}
                >
                  <Table className="text-sm">
                    <TableHeader className="sticky top-0 z-40 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
                      <TableRow>
                        <TableHead className="w-[46px]">
                          <Checkbox
                            checked={(qsSomeSelected ? ("indeterminate" as any) : qsAllSelected) as any}
                            onCheckedChange={(v) => {
                              const on = Boolean(v);
                              const patch: Record<string, boolean> = {};
                              qsVisibleIds.forEach((id) => (patch[id] = on));
                              setSelQs((s) => ({ ...s, ...patch }));
                            }}
                          />
                        </TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Volume</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fQs.map((q) => (
                        <TableRow key={q.id} className="hover:bg-[#F5F7FA]">
                          <TableCell>
                            <Checkbox
                              checked={!!selQs[q.id]}
                              onCheckedChange={(v) =>
                                setSelQs((s) => ({ ...s, [q.id]: Boolean(v) }))
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{highlight(q.q, query)}</TableCell>
                          <TableCell>{q.source}</TableCell>
                          <TableCell>{fmt(q.volume)}</TableCell>
                          <TableCell>{q.difficulty}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              {tinyBar(q.matchScore / 100, 1)}
                              <span className="text-[12px] text-muted-foreground">
                                {q.matchScore}%
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5">
                              <IconAction label="Insert Section">
                                <ListPlus className="h-4 w-4" color="#008CCD" />
                              </IconAction>
                              <IconAction label="Create Task">
                                <ClipboardList className="h-4 w-4" color="#008CCD" />
                              </IconAction>
                              <IconAction
                                label="Open SERP"
                                href={`https://www.google.com/search?q=${encodeURIComponent(q.q)}`}
                              >
                                <ExternalLink className="h-4 w-4" color="#008CCD" />
                              </IconAction>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {fQs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            No questions match current filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* VARIANTS */}
              <TabsContent value="variants" className="mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {fClusters.map((c) => (
                    <Card key={c.id} className="border" style={{ borderColor: TK.border }}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wand2 className="h-4 w-4" color="#008CCD" />
                            <div className="font-medium">{highlight(c.primary, query)}</div>
                            <span className="text-xs rounded bg-gray-100 px-1.5 py-[2px]">
                              cohesion {c.cohesion.toFixed(2)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 cursor-pointer"
                            onClick={() => {
                              const patch: Record<string, boolean> = {};
                              c.items.forEach((i) => (patch[i.id] = true));
                              setSelVars((s) => ({ ...s, ...patch }));
                            }}
                          >
                            <BadgePlus className="h-4 w-4" /> Select all
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {c.items.map((i) => {
                            const on = !!selVars[i.id];
                            return (
                              <button
                                key={i.id}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm cursor-pointer ${
                                  on ? "bg-[rgba(0,140,205,0.08)] text-[#008CCD] border-[#008CCD33]" : "bg-white hover:bg-[var(--wr-subtle)]"
                                }`}
                                onClick={() =>
                                  setSelVars((s) => ({ ...s, [i.id]: !on }))
                                }
                                title={i.text}
                              >
                                <Checkbox checked={on}  />
                                <span>{highlight(i.text, query)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                      <CardFooter className="py-3 px-4 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Variants: {c.items.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <IconAction label="Create Task">
                            <ClipboardList className="h-4 w-4" color="#008CCD" />
                          </IconAction>
                          <IconAction label="Add to Targeted">
                            <BadgePlus className="h-4 w-4" color="#008CCD" />
                          </IconAction>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                  {fClusters.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground">
                      No variant clusters match the current filters.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          {/* Bulk actions */}
          {selectedCount > 0 && (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3"
              style={{ borderColor: TK.borderLight, background: TK.accent }}
            >
              <div className="text-sm" style={{ color: TK.text }}>
                <strong>{selectedCount}</strong> selected
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1 cursor-pointer"
                  style={{ background: TK.brand, color: "#fff" }}
                  onClick={() => {
                    console.log("Add selected to Targeted");
                    clearSelections();
                  }}
                >
                  <Target className="h-4 w-4" /> Add selected to Targeted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 cursor-pointer"
                  onClick={() => {
                    console.log("Create optimization task");
                    clearSelections();
                  }}
                >
                  <ListChecks className="h-4 w-4" /> Create optimization task
                </Button>
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={clearSelections}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Legend */}
        <div className="mx-4 mb-4 mt-1 flex flex-wrap items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: TK.danger }} /> Missing
          </div>
          <div className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: TK.warning }} /> Underused
          </div>
          <div className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "#EF4444" }} /> Overused
          </div>
          <div className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "#9CA3AF" }} /> OK
          </div>
        </div>
      </section>
    </>
  );
}

