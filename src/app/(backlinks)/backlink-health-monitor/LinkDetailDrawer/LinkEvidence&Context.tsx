"use client";
import * as React from "react";
import {
  Globe2,
  TextCursorInput,
  LayoutPanelLeft,
  Newspaper,
  GitCommit,
  MoveRight,
  AlertTriangle,
  Copy,
  ExternalLink,
  FileText,
} from "lucide-react";

/* ============================================================
   Wranker Tokens (light mode defaults)
   ============================================================ */
const TK = {
  brand: "#1090D0",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  good: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  accent: "#FB923C", // emphasis/change orange
  radius: 10,
};

/* ============================================================
   Types
   ============================================================ */
export type LinkDetail = {
  link_id: string;
  domain: string;
  favicon_url?: string;
  source_url: string;
  target_url: string;
  status:
    | "active"
    | "removed"
    | "broken"
    | "redirected"
    | "not_found"
    | "not_checked";
  status_changed_at?: string;
  health_state: "healthy" | "at_risk" | "toxic";
  link_type: "dofollow" | "nofollow" | "sponsored" | "ugc";
  link_type_prev?: LinkDetail["link_type"];
  link_type_changed_at?: string;
  wr: number;
  wr_prev?: number;
  spam: number;
  spam_prev?: number;
  ip?: string;
  asn?: string;
  host?: string;
  ip_risk: boolean;
  ip_risk_reasons?: string[];
  anchor_current?: string;
  anchor_prev?: string;
  anchor_changed_at?: string;
  location?: "in_content" | "sidebar" | "footer" | "navigation" | "unknown";
  http_chain?: { code: string; url?: string; at?: string }[]; // newest last
  first_seen?: string;
  last_checked?: string;
};

/* ============================================================
   Utilities
   ============================================================ */
const cls = (...a: Array<string | false | undefined>) => a.filter(Boolean).join(" ");

function truncateMiddle(str: string, start = 28, end = 20) {
  if (!str) return "";
  return str.length <= start + end
    ? str
    : `${str.slice(0, start)}…${str.slice(-end)}`;
}

function pathFromUrl(u?: string) {
  try {
    if (!u) return "";
    const { pathname, search, hash } = new URL(u);
    return `${pathname}${search}${hash}` || "/";
  } catch {
    return u || "";
  }
}

function hostLabel(u?: string) {
  try {
    if (!u) return "";
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const statusHueForCode = (code?: string) => {
  if (!code) return { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" };
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300)
    return { text: TK.good, bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)" };
  if (n >= 300 && n < 400)
    return { text: TK.accent, bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.35)" };
  if (n >= 400)
    return { text: TK.danger, bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.35)" };
  return { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" };
};

const locName: Record<NonNullable<LinkDetail["location"]>, string> = {
  in_content: "In‑content paragraph",
  sidebar: "Sidebar",
  footer: "Footer",
  navigation: "Navigation/Header",
  unknown: "Unknown",
};

/* ============================================================
   Mini UI primitives
   ============================================================ */
function Card({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cls(
        "bg-white border",
        `rounded-[${TK.radius}px]`,
        "border-[#E5E7EB] p-4",
        className
      )}
      style={{ borderColor: TK.border, background: TK.card }}
    >
      {children}
    </div>
  );
}

function Label({ icon: Icon, children, id }: { icon: any; children: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-[#6B7280]" id={id}>
      {Icon ? <Icon size={16} className="shrink-0" /> : null}
      <span>{children}</span>
    </div>
  );
}

function Pill({ children, hue }: { children: React.ReactNode; hue: { text: string; bg: string; border: string } }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px]"
      style={{ color: hue.text, background: hue.bg, borderColor: hue.border }}
    >
      {children}
    </span>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open && (
        <div
          role="tooltip"
          className="absolute z-[70] -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-pre rounded-md border bg-white px-2 py-1 text-xs shadow"
          style={{ borderColor: TK.borderLight }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

/* ============================================================
   HTTP Chain Popover
   ============================================================ */
function HttpChain({ hops, lastChecked }: { hops?: LinkDetail["http_chain"]; lastChecked?: string }) {
  const [open, setOpen] = React.useState(false);
  if (!hops || hops.length === 0) {
    return (
      <div className="text-[13px] text-[#6B7280]">No HTTP data available.</div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {hops.map((h, i) => {
          const hue = statusHueForCode(h.code);
          return (
            <React.Fragment key={i}>
              <Tooltip text={`${h.code || "?"}${h.at ? ` • ${h.at}` : ""}`}>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] focus:outline-none focus:ring-2"
                  style={{ color: hue.text, background: hue.bg, borderColor: hue.border }}
                  aria-haspopup="dialog"
                  aria-expanded={open}
                >
                  <GitCommit size={14} />
                  <span className="font-medium">{h.code || "—"}</span>
                  <span className="text-[#6B7280]">{hostLabel(h.url)}</span>
                </button>
              </Tooltip>
              {i < hops.length - 1 && (
                <MoveRight size={16} className="text-[#6B7280]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {open && (
        <div
          className="relative mt-3"
          role="dialog"
          aria-label="Redirect chain details"
        >
          <div className="absolute z-[70] w-full rounded-md border bg-white p-3 shadow-lg" style={{ borderColor: TK.borderLight }}>
            <div className="mb-2 text-[12px] text-[#6B7280]">Last checked: {lastChecked || "—"}</div>
            <ul className="space-y-2 max-h-64 overflow-auto pr-1">
              {hops.map((h, i) => {
                const hue = statusHueForCode(h.code);
                return (
                  <li key={i} className="rounded border p-2" style={{ borderColor: TK.borderLight }}>
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: hue.text }}>
                      <GitCommit size={14} />
                      <span className="font-semibold">{h.code || "?"}</span>
                      <span className="text-[#6B7280]">{h.at || ""}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="truncate text-[13px]" title={h.url}>{h.url || "—"}</div>
                      {h.url && (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded border hover:bg-[#F5F7FA]"
                          style={{ borderColor: TK.borderLight }}
                          onClick={() => navigator.clipboard.writeText(h.url!)}
                          aria-label="Copy URL"
                        >
                          <Copy size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex justify-end">
              <button
                className="rounded border px-3 py-1 text-[13px] hover:bg-[#F5F7FA]"
                style={{ borderColor: TK.borderLight }}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Section C — Link Evidence & Context (exported)
   ============================================================ */
export function SectionC_LinkEvidenceContext({
  detail,
  highlightTarget,
}: {
  detail: LinkDetail;
  highlightTarget?: "anchor" | "type" | "http";
}) {
  const [copied, setCopied] = React.useState<string | null>(null);
  const targetPath = pathFromUrl(detail.target_url);

  const anchorChanged = !!(detail.anchor_prev && detail.anchor_prev !== (detail.anchor_current || ""));
  const anchorRemoved = !detail.anchor_current && !!detail.anchor_prev;

  const locationKey: NonNullable<LinkDetail["location"]> = (detail.location ?? "unknown");
  const locationLabel = locName[locationKey] || "Unknown";
  const locHue =
    locationKey === "in_content"
      ? { text: TK.good, bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)" }
      : locationKey === "unknown"
      ? { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" }
      : { text: TK.warn, bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" };

  const httpFinal = detail.http_chain && detail.http_chain.length > 0 ? detail.http_chain[detail.http_chain.length - 1] : undefined;
  const finalBadgeHue = httpFinal ? statusHueForCode(httpFinal.code) : { text: TK.muted, bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.35)" };
  const finalBadgeLabel = httpFinal
    ? parseInt(httpFinal.code || "", 10) >= 200 && parseInt(httpFinal.code || "", 10) < 300
      ? "Active"
      : parseInt(httpFinal.code || "", 10) >= 300 && parseInt(httpFinal.code || "", 10) < 400
      ? "Redirected"
      : parseInt(httpFinal.code || "", 10) >= 400
      ? "Broken"
      : "Unknown"
    : "Unknown";

  const highlightClass = "ring-2 ring-offset-2 ring-[#FB923C]";

  return (
    <section id="context" className="scroll-mt-20">
      <h3 className="mb-3 text-[16px] font-semibold text-[#111827]">Link Evidence & Context</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[2fr_1fr]">
        {/* Left Column */}
        <div className="space-y-3">
          {/* C1: Target Page */}
          <Card>
            <div className="flex items-center justify-between">
              <Label icon={Globe2}>Target Page (your site)</Label>
              <a
                href={`/analyzer?url=${encodeURIComponent(detail.target_url)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-[#1090D0] hover:underline"
                aria-label={`Open Page Analyzer for ${detail.target_url}`}
              >
                Open Analyzer <ExternalLink size={14} />
              </a>
            </div>
            <div className="mt-2">
              <Tooltip text={detail.target_url}>
                <span className="text-[14px] font-semibold text-[#111827]">
                  {truncateMiddle(targetPath, 32, 24) || "—"}
                </span>
              </Tooltip>
              <div className="mt-1 text-[12px] text-[#6B7280]">Target on your site</div>
            </div>
          </Card>

          {/* C2: Anchor Text (current) */}
          <Card className={cls(highlightTarget === "anchor" && highlightClass)}>
            <div className="flex items-center justify-between">
              <Label icon={TextCursorInput}>Anchor Text (current)</Label>
              {anchorRemoved && (
                <Pill hue={{ text: TK.danger, bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.35)" }}>
                  Removed
                </Pill>
              )}
            </div>
            <div className="mt-2">
              {!anchorRemoved ? (
                <Tooltip text="Exact anchor as last verified">
                  <div className="text-[14px] font-semibold text-[#111827]">{detail.anchor_current || "—"}</div>
                </Tooltip>
              ) : (
                <div className="text-[13px] text-[#6B7280]">Anchor absent on last check.</div>
              )}

              {anchorChanged && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-[#6B7280]">
                  <AlertTriangle size={14} className="text-[#FB923C]" />
                  <Tooltip
                    text={`Old: "${detail.anchor_prev}"\nNew: "${detail.anchor_current || "(removed)"}"\nDetected: ${detail.anchor_changed_at || "—"}`}
                  >
                    <span>
                      Changed: <span className="line-through">"{detail.anchor_prev}"</span> →
                      <span className="ml-1">"{detail.anchor_current || "(removed)"}"</span>
                      {detail.anchor_changed_at ? ` · ${new Date(detail.anchor_changed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                    </span>
                  </Tooltip>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* C3: Link Location */}
          <Card>
            <div className="flex items-center justify-between">
              <Label icon={LayoutPanelLeft}>Link Location</Label>
              <Pill hue={locHue}>{locationLabel}</Pill>
            </div>
            <div className="mt-2 text-[12px] text-[#6B7280]">
              {locationKey === "in_content"
                ? "Detected inside <article> near paragraph text."
                : locationKey === "sidebar"
                ? "Likely inside an <aside>/sidebar region."
                : locationKey === "footer"
                ? "Detected near <footer>."
                : locationKey === "navigation"
                ? "Detected within nav/menu region."
                : "Client‑rendered page or insufficient signals."}
            </div>
          </Card>

          {/* C4: HTTP Status & Redirect Chain */}
          <Card className={cls(highlightTarget === "http" && highlightClass)}>
            <div className="flex items-center justify-between">
              <Label icon={GitCommit}>HTTP Status & Redirect Chain</Label>
              <Pill hue={finalBadgeHue}>{finalBadgeLabel}</Pill>
            </div>
            <div className="mt-3">
              <HttpChain hops={detail.http_chain} lastChecked={detail.last_checked} />
            </div>
          </Card>
        </div>
      </div>

      {/* Phase‑2: Content Snippet (shown with empty state for now) */}
      <div className="mt-3">
        <Card>
          <div className="flex items-center justify-between">
            <Label icon={Newspaper}>Content snippet (last seen)</Label>
            <div className="text-[12px] text-[#6B7280]">Phase‑2</div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="line-clamp-3 text-[13px] text-[#6B7280]">
              No snapshot available. Try Re‑check to capture.
            </p>
            <button
              className="inline-flex items-center gap-2 rounded border px-2 py-1 text-[12px] hover:bg-[#F5F7FA]"
              style={{ borderColor: TK.borderLight }}
              onClick={() => {
                setCopied("snippet");
                setTimeout(() => setCopied(null), 1000);
              }}
            >
              <FileText size={14} /> {copied === "snippet" ? "Copied" : "Copy"}
            </button>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ============================================================
   Demo Canvas (default export)
   ============================================================ */
export default function Demo_LinkEvidenceContext() {
  const [variant, setVariant] = React.useState<"ok" | "lost" | "redirected" | "anchor_removed" | "nohttp">("ok");

  const base: LinkDetail = {
    link_id: "link_123",
    domain: "example.com",
    source_url: "https://example.com/blog/seo-guide/how-to-rank?ref=partners&utm=wr",
    target_url: "https://yoursite.com/blog/seo-guide/how-to-rank",
    status: "active",
    health_state: "at_risk",
    link_type: "nofollow",
    wr: 78,
    spam: 22,
    ip_risk: false,
    anchor_current: "seo tools",
    anchor_prev: "best seo tools",
    anchor_changed_at: "2025-06-29T12:00:00Z",
    location: "in_content",
    http_chain: [
      { code: "200", url: "https://example.com/blog/seo-guide/how-to-rank", at: "2025-08-08T04:15:00Z" },
      { code: "301", url: "https://www.example.com/blog/seo-guide/how-to-rank", at: "2025-08-08T04:15:02Z" },
      { code: "200", url: "https://www.example.com/blog/seo-guide/how-to-rank", at: "2025-08-08T04:15:03Z" },
    ],
    first_seen: "2025-05-12T10:12:00Z",
    last_checked: "2025-08-08T04:15:03Z",
  };

  const detail: LinkDetail = React.useMemo(() => {
    if (variant === "lost") {
      return {
        ...base,
        status: "broken",
        http_chain: [
          { code: "200", url: "https://example.com/blog/seo-guide/how-to-rank", at: "2025-08-18T04:15:00Z" },
          { code: "404", url: "https://example.com/blog/seo-guide/how-to-rank", at: "2025-08-18T04:15:01Z" },
        ],
      };
    }
    if (variant === "redirected") {
      return {
        ...base,
        status: "redirected",
        http_chain: [
          { code: "301", url: "http://example.com/guide", at: "2025-08-20T04:15:00Z" },
          { code: "301", url: "https://example.com/guide", at: "2025-08-20T04:15:01Z" },
          { code: "200", url: "https://www.example.com/guide", at: "2025-08-20T04:15:02Z" },
        ],
      };
    }
    if (variant === "anchor_removed") {
      return {
        ...base,
        anchor_current: undefined,
        anchor_prev: "best seo tools",
        anchor_changed_at: "2025-07-01T10:00:00Z",
      };
    }
    if (variant === "nohttp") {
      return {
        ...base,
        http_chain: [],
      };
    }
    return base;
  }, [variant]);

  const [highlight, setHighlight] = React.useState<"anchor" | "type" | "http" | undefined>(undefined);

  return (
    <div className="w-full mx-auto ">
      <SectionC_LinkEvidenceContext detail={detail} highlightTarget={highlight} />
    </div>
  );
}


