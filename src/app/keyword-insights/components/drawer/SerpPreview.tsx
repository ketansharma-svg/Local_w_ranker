"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  ClipboardList,
  RotateCw,
  X,
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

/* ───────────────────────────────── TOKENS ───────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  surface: "#FFFFFF",
  hover: "#FAFAFA",
  blue: "#4286F5",
  youFill: "#D9EEF8",
  compFill: "#FCEBB8",
  featTint: "#F4E8D5",
  featText: "#7C3A00",
  radius: "10px",
};

/* ────────────────────────────── TYPES ───────────────────────────── */
type Device = "desktop" | "mobile";
type Plan = "free" | "premium";

export type SerpResult = {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  isFeatured?: boolean;
};

export type SerpSnapshot = {
  keyword: string;
  device: Device;
  locationISO: string; // e.g., "US"
  fetchedAt: string; // ISO
  results: SerpResult[]; // ascending by rank
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenChange: (v: boolean) => void;
  plan?: Plan;
  projectDomain: string;
  competitors?: string[];
  snapshot?: SerpSnapshot;
  onRefresh?: () => Promise<SerpSnapshot> | SerpSnapshot;
  onAssignTask?: (payload: {
    keyword: string;
    url: string;
    rank: number;
    domain: string;
  }) => void;
};

/* ───────────────────────────── HELPERS ───────────────────────────── */
const timeAgo = (iso?: string) => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const hashCode = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
};

const DomainAvatar: React.FC<{ domain: string }> = ({ domain }) => {
  const c = domain?.trim()[0]?.toUpperCase() || "?";
  const hue = Math.abs(hashCode(domain)) % 360;
  return (
    <span
      aria-hidden
      className="inline-flex h-5 w-5 items-center justify-center rounded-[4px] text-[11px] font-bold"
      style={{
        background: `hsl(${hue} 70% 92%)`,
        color: `hsl(${hue} 65% 32%)`,
      }}
      title={domain}
    >
      {c}
    </span>
  );
};

const Chip: React.FC<{ children: React.ReactNode; title?: string }> = ({
  children,
  title,
}) => (
  <span
    title={title}
    className="inline-flex h-7 cursor-default items-center gap-2 rounded-full border px-2.5 text-[12px]"
    style={{ borderColor: TK.border, background: "#F5F7FA", color: TK.muted }}
  >
    {children}
  </span>
);

/* ───────────────────────────── MOCK (demo) ───────────────────────────── */
function mockSerpFetch(base?: Partial<SerpSnapshot>): SerpSnapshot {
  const keyword = base?.keyword ?? "best seo audit tools";
  const catalog = [
    {
      domain: "wranker.com",
      title: "SEO Audit Tools — Complete Guide",
      snippet: "Run full audits, find issues, and fix them fast.",
    },
    {
      domain: "ahrefs.com",
      title: "Best SEO Audit Tools (Tested)",
      snippet: "We tested top tools and compared results.",
    },
    {
      domain: "semrush.com",
      title: "Site Audit: Find & Fix SEO Issues",
      snippet: "Automated checks with clear, actionable advice.",
    },
    {
      domain: "moz.com",
      title: "SEO Audits 101",
      snippet: "How to run a technical audit the right way.",
    },
    {
      domain: "searchenginejournal.com",
      title: "Top SEO Audit Tools",
      snippet: "Handpicked tools for 2025.",
    },
    {
      domain: "backlinko.com",
      title: "SEO Site Audit: Step‑by‑Step",
      snippet: "A practical guide to auditing your site.",
    },
    {
      domain: "yoast.com",
      title: "Technical SEO Basics",
      snippet: "Learn the fundamentals of technical SEO.",
    },
    {
      domain: "hubspot.com",
      title: "SEO Audit Checklist",
      snippet: "A comprehensive checklist for marketers.",
    },
    { domain: "neilpatel.com", title: "SEO Analyzer", snippet: "Analyze and improve SEO." },
    {
      domain: "webfx.com",
      title: "Website SEO Audit Services",
      snippet: "Professional audits to boost rankings.",
    },
    {
      domain: "searchengineland.com",
      title: "Why audits matter",
      snippet: "Audits help uncover hidden issues.",
    },
    { domain: "sitebulb.com", title: "Sitebulb 2025", snippet: "Desktop crawler for fast audits." },
  ];

  const items = [...catalog].sort(() => Math.random() - 0.5);
  const results: SerpResult[] = items.slice(0, 20).map((x, i) => ({
    rank: i + 1,
    title: x.title,
    url: `https://${x.domain}/post/${keyword.replace(/\s+/g, "-")}`,
    domain: x.domain,
    snippet: x.snippet,
    isFeatured: i === 0 && Math.random() > 0.6,
  }));

  return {
    keyword,
    device: base?.device ?? "desktop",
    locationISO: base?.locationISO ?? "US",
    fetchedAt: new Date().toISOString(),
    results,
  };
}

/* ───────────────────────────── ROW CARD ───────────────────────────── */
const SerpCard: React.FC<{
  r: SerpResult;
  you: boolean;
  comp: boolean;
  onView: () => void;
  onTask: () => void;
}> = ({ r, you, comp, onView, onTask }) => {
  const highlightBg = you ? TK.youFill : comp ? `${TK.compFill}55` : TK.surface;

  return (
    <div
      className="grid grid-cols-[44px_1fr_auto] items-start gap-3 rounded-md border p-3 shadow-sm"
      style={{
        borderColor: TK.border,
        background: highlightBg,
        borderLeft: you ? `3px solid ${TK.blue}` : undefined,
      }}
    >
      <div className="select-none text-lg font-bold" style={{ color: TK.blue }}>
        #{r.rank}
      </div>

      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <DomainAvatar domain={r.domain} />
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="truncate font-semibold hover:underline"
            style={{ color: TK.blue }}
            title={r.title}
          >
            {r.title}
          </a>
        </div>
        <div className="mb-1 text-[13px]" style={{ color: TK.muted }}>
          {r.domain}
        </div>
        {r.snippet && (
          <div className="line-clamp-3 text-[13px]" style={{ color: TK.text }}>
            {r.snippet}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {you && <Badge variant="outline">You</Badge>}
          {comp && <Badge variant="outline">Competitor</Badge>}
          {r.isFeatured && (
            <Badge
              variant="outline"
              className="border-[1px]"
              style={{ background: TK.featTint, color: TK.featText, borderColor: TK.featText }}
            >
              Featured
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                aria-label="Open page"
                onClick={onView}
                title="Open page"
              >
                <ExternalLink className="h-4 w-4" style={{ color: TK.brand }} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open page</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                aria-label="Assign task"
                onClick={onTask}
                title="Assign task"
              >
                <ClipboardList className="h-4 w-4" style={{ color: TK.brand }} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Assign task</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

/* ───────────────────────────── MODAL ───────────────────────────── */
export function SerpPreviewModal({
  open,
  onOpenChange,
  plan = "free",
  projectDomain,
  competitors = [],
  snapshot,
  onRefresh,
  onAssignTask,
  onClose
}: Props) {
  const [data, setData] = React.useState<SerpSnapshot>(() => snapshot ?? mockSerpFetch());
  const [loading, setLoading] = React.useState(false);
  const [showMore20, setShowMore20] = React.useState(false);

  React.useEffect(() => {
    if (snapshot) setData(snapshot);
  }, [snapshot]);

  const isPremium = plan === "premium";
  const youDomain = projectDomain.replace(/^www\./i, "").toLowerCase();
  const compSet = React.useMemo(
    () => new Set(competitors.map((d) => d.replace(/^www\./i, "").toLowerCase())),
    [competitors]
  );

  const visible = React.useMemo(() => {
    if (!isPremium) return data.results.slice(0, 3);
    return showMore20 ? data.results.slice(0, 20) : data.results.slice(0, 10);
  }, [isPremium, data.results, showMore20]);

  async function handleRefresh() {
    if (!isPremium) return;
    try {
      setLoading(true);
      if (onRefresh) {
        const r = await onRefresh();
        setData(Array.isArray((r as any).results) ? (r as SerpSnapshot) : mockSerpFetch());
      } else {
        setData(
          mockSerpFetch({
            keyword: data.keyword,
            device: data.device,
            locationISO: data.locationISO,
          })
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const handleAssign = (r: SerpResult) => {
    const payload = { keyword: data.keyword, url: r.url, rank: r.rank, domain: r.domain };
    onAssignTask?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[920px] overflow-hidden p-0"
        style={{
          borderRadius: TK.radius,
          fontFamily:
            'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue"',
        }}>              
        {/* Header */}                <div style={{zIndex:"1",backgroundColor:"white",height:"40px"}}>
            <button className="float-right cursor-pointer text-[22px]" onClick={onClose}>✕</button>
            </div>
        <div className="border-b px-4 pb-3 pt-4" style={{ borderColor: TK.border, background: TK.surface }}>
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-[18px]" style={{ color: TK.text }}>
              <Search className="h-5 w-5" style={{ color: TK.brand }} />
              {data.keyword}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                <Chip title="Scope">
                  {data.device === "desktop" ? "Desktop" : "Mobile"} • {data.locationISO}
                </Chip>
                <Chip title="Freshness">Last fetched: {timeAgo(data.fetchedAt)}</Chip>
                {!isPremium && <Chip title="Free plan">Top 3 only</Chip>}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={handleRefresh}
                      disabled={!isPremium || loading}
                      title={isPremium ? "Re-check SERP" : "Premium only"}
                    >
                      <RotateCw
                        className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        style={{ color: TK.brand }}
                      />
                      Re-check SERP
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isPremium && (
                  <TooltipContent className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Premium only
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {isPremium && data.results.length > 10 && (
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setShowMore20((s) => !s)}
              >
                {showMore20 ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" /> Hide ranks 11–20
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" /> Show ranks 11–20
                  </>
                )}
              </Button>
            )}

            <div className="ml-auto">

            </div>
          </div>
        </div>

        {/* Helper bar */}
        <div
          className="sticky top-0 z-10 flex items-center gap-2 border-b px-4 py-2 text-[13px]"
          style={{ borderColor: TK.border, background: TK.surface, color: TK.muted }}
        >
          <Info className="h-4 w-4" style={{ color: TK.brand }} />
          Highlighting <span className="font-semibold" style={{ color: TK.blue }}>
            your domain
          </span>{" "}
          and <span className="font-semibold">competitors</span>. Click a title to open the page.
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[70vh]">
          <div className="grid gap-2 p-4">
            {visible.map((r) => {
              const root = r.domain.toLowerCase();
              const you = root === youDomain || root.endsWith(`.${youDomain}`);
              const comp = compSet.has(root) || [...compSet].some((d) => root.endsWith(`.${d}`));
              return (
                <SerpCard
                  key={r.rank}
                  r={r}
                  you={you}
                  comp={comp}
                  onView={() => window.open(r.url, "_blank", "noopener")}
                  onTask={() => handleAssign(r)}
                />
              );
            })}

            {!isPremium && data.results.length > 3 && (
              <div
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-[13px]"
                style={{ borderColor: TK.border, background: "#F7FAFF", color: TK.muted }}
              >
                <Lock className="h-4 w-4" /> Free plan shows Top 3. Upgrade to see full Top 10 and refresh live SERPs.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      {/* local animation */}
      <style jsx>{`
        .animate-spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Dialog>
  );
}

/* ───────────────────────────── DEMO (optional) ───────────────────────────── */
export default function DemoSerpPreviewModal({onClose}:{onClose: () => void}) {
  const [open, setOpen] = React.useState(true);
  const [plan, setPlan] = React.useState<Plan>("free");
  const [snapshot, setSnapshot] = React.useState<SerpSnapshot>(() =>
    mockSerpFetch({ keyword: "best seo audit tools", device: "desktop", locationISO: "US" })
  );

  return (
  <>
  
  <SerpPreviewModal
        open={open}
        onOpenChange={setOpen}
        plan={plan}
        onClose={onClose}
        projectDomain="wranker.com"
        competitors={["semrush.com", "ahrefs.com", "moz.com"]}
        snapshot={snapshot}
        onRefresh={async () => {
          await new Promise((r) => setTimeout(r, 600)); // demo latency
          return mockSerpFetch({
            keyword: snapshot.keyword,
            device: snapshot.device,
            locationISO: snapshot.locationISO,
          });
        }}
        onAssignTask={(payload) => {
          console.info("Assign Task:", payload);
          alert(`Task payload:\n${JSON.stringify(payload, null, 2)}`);
        }}
      />
  </>
  );
}

