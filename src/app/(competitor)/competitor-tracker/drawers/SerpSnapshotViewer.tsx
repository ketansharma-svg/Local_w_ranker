"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  ArrowUpRight,
  ExternalLink,
  Award,
  Star,
  Info,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*                             TOKENS                                  */
/* ------------------------------------------------------------------ */
const TK = {
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  divider: "#E5E7EB",
  primary: "#0077FF", // brand alt (lines / accents)
  cta: "#1090D0", // primary CTA
  fsBg: "#E8F0FE",
  paaBg: "#F5F7FA",
  imgBg: "#F8FAFC",
  radius: 10,
};

/* ------------------------------------------------------------------ */
/*                             TYPES                                   */
/* ------------------------------------------------------------------ */

type DeviceKey = "desktop" | "mobile";

type SerpBlock =
  | { kind: "FS"; owner: string; title: string; snippet?: string; url: string }
  | { kind: "PAA"; questions: { q: string }[] }
  | {
      kind: "Organic";
      rank: number;
      domain: string;
      title: string;
      url: string;
      snippet?: string;
      sitelinks?: { title: string; url: string }[];
      reviews?: { rating: number; count?: number };
    }
  | {
      kind: "ImagePack";
      items: { thumbUrl?: string; alt: string; targetUrl: string }[];
    }
  | {
      kind: "TopStories";
      items: { title: string; source: string; url: string }[];
    }
  | {
      kind: "Videos";
      items: { title: string; channel: string; url: string }[];
    };

type SerpSnapshot = {
  meta: {
    keyword: string;
    dateCapturedISO: string; // yyyy-mm-dd
    device: DeviceKey;
    locale?: string;
    market?: string;
  };
  summary: {
    yourDomain?: string;
    yourRank?: number | null;
    topCompetitor?: { domain: string; rank: number; ownsFS: boolean };
    features: Array<
      "FS" | "PAA" | "ImagePack" | "Sitelinks" | "Reviews" | "TopStories" | "Videos"
    >;
  };
  blocks: SerpBlock[];
};

export type SerpSnapshotViewerProps = {
  open: boolean;
  onClose: () => void;
  keyword: string;
  dateISO: string;
  device: DeviceKey;
  yourDomain?: string;
  /** Provide your fetcher. If omitted, a mock is used. */
  fetcher?: (args: {
    keyword: string;
    dateISO: string;
    device: DeviceKey;
  }) => Promise<SerpSnapshot>;
  onOpenFullAnalysis?: (args: {
    keyword: string;
    dateISO: string;
    device: DeviceKey;
  }) => void;
  source?:
    | "view-performance"
    | "backlink-tracker"
    | "serp-layout"
    | "alert-log";
  role?: "admin" | "editor" | "viewer";
};

/* ------------------------------------------------------------------ */
/*                           UTILITIES                                 */
/* ------------------------------------------------------------------ */

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function fmtDateLocal(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
function middleTruncate(str: string, max = 56) {
  if (str.length <= max) return str;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}
function focusables(root: HTMLElement | null) {
  if (!root) return [] as HTMLElement[];
  const sel =
    'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
  const list = Array.from(root.querySelectorAll<HTMLElement>(sel));
  return list.filter((el) => !el.hasAttribute("disabled"));
}

/** Simple focus trap without external deps */
function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables(root);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // put focus into dialog
    const els = focusables(root);
    (els[0] ?? root).focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [active, containerRef]);
}

/* ------------------------------------------------------------------ */
/*                     FEATURE & STATUS BADGES                         */
/* ------------------------------------------------------------------ */

function Pill({
  children,
  color,
  title,
  className,
}: React.PropsWithChildren<{
  color: string;
  title?: string;
  className?: string;
}>) {
  return (
    <span
      title={title}
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-xs font-medium",
        className
      )}
      style={{
        background: `${color}24`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}

function FeatureBadge({ kind }: { kind: string }) {
  if (kind === "FS")
    return (
      <Pill color={TK.primary} title="Featured Snippet">
        <Flame className="h-3.5 w-3.5" /> FS
      </Pill>
    );
  if (kind === "PAA")
    return (
      <Pill color={TK.muted} title="People Also Ask">
        <HelpCircle className="h-3.5 w-3.5" /> PAA
      </Pill>
    );
  if (kind === "ImagePack")
    return (
      <Pill color={TK.muted} title="Image Pack">
        <ImageIcon className="h-3.5 w-3.5" /> Images
      </Pill>
    );
  if (kind === "Sitelinks")
    return <Pill color={TK.muted}>Sitelinks</Pill>;
  if (kind === "TopStories")
    return <Pill color={TK.muted}>Top stories</Pill>;
  if (kind === "Videos")
    return <Pill color={TK.muted}>Videos</Pill>;
  if (kind === "Reviews")
    return (
      <Pill color={TK.muted} title="Review snippets">
        <Star className="h-3.5 w-3.5" /> Reviews
      </Pill>
    );
  return null;
}

/* ------------------------------------------------------------------ */
/*                           BLOCKS RENDERERS                          */
/* ------------------------------------------------------------------ */

function FSBlock({
  owner,
  title,
  snippet,
  url,
}: Extract<SerpBlock, { kind: "FS" }>) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: TK.fsBg, border: `1px solid ${TK.divider}` }}
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-700">
        <Flame className="h-4 w-4 text-[#EA4335]" aria-hidden />
        <span className="font-medium">Featured Snippet</span>
        <span className="text-gray-500">•</span>
        <span className="font-mono">{owner}</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {snippet && (
        <div className="mt-1 text-sm leading-snug text-gray-700">{snippet}</div>
      )}
      <div className="mt-1 text-[12px] font-mono text-gray-600" title={url}>
        {middleTruncate(url, 72)}
      </div>
    </div>
  );
}

function PAABlock({ questions }: Extract<SerpBlock, { kind: "PAA" }>) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: TK.paaBg, border: `1px solid ${TK.divider}` }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-700">
        <HelpCircle className="h-4 w-4 text-gray-500" aria-hidden />
        <span className="font-medium">People also ask</span>
      </div>
      <ul className="divide-y" style={{ borderColor: TK.divider }}>
        {questions.slice(0, 4).map((q, i) => (
          <li key={i} className="py-2 text-sm text-gray-800">
            <span className="inline-block rotate-0 select-none pr-2 text-gray-400">
              ▸
            </span>
            {q.q}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrganicBlock({
  rank,
  domain,
  title,
  url,
  snippet,
  sitelinks,
  reviews,
  yourDomain,
  topCompetitor,
}: Extract<SerpBlock, { kind: "Organic" }> & {
  yourDomain?: string;
  topCompetitor?: { domain: string; rank: number; ownsFS: boolean } | null;
}) {
  const isYou = yourDomain && domain.toLowerCase() === yourDomain.toLowerCase();
  const isTop =
    topCompetitor && domain.toLowerCase() === topCompetitor.domain.toLowerCase();

  return (
    <div
      className={classNames(
        "rounded-md border p-3",
        isYou ? "ring-1 ring-offset-0" : ""
      )}
      style={{
        borderColor: TK.divider,
        ...(isYou ? { borderLeft: `4px solid ${TK.primary}` } : {}),
      }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-sm bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
          #{rank}
        </span>
        <span
          className={classNames(
            "text-[12px] font-mono",
            isYou ? "underline underline-offset-2" : "text-gray-600"
          )}
          title={domain}
        >
          {domain}
        </span>
        {isTop && (
          <Pill color={TK.primary} title="Top Competitor (Rank #1)">
            #1
          </Pill>
        )}
      </div>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {snippet && (
        <div className="mt-1 text-sm leading-snug text-gray-700">{snippet}</div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-mono text-gray-600" title={url}>
          {middleTruncate(url, 72)}
        </span>
        {reviews && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-700">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            {reviews.rating}
            {typeof reviews.count === "number" ? ` (${reviews.count})` : null}
          </span>
        )}
      </div>
      {sitelinks && sitelinks.length > 0 && (
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {sitelinks.slice(0, 4).map((s, i) => (
            <div
              key={i}
              className="truncate text-[13px] text-[#1a0dab] underline"
              title={`${s.title} — ${s.url}`}
            >
              {s.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImagePackBlock({
  items,
}: Extract<SerpBlock, { kind: "ImagePack" }>) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: TK.imgBg, border: `1px solid ${TK.divider}` }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-700">
        <ImageIcon className="h-4 w-4 text-gray-500" aria-hidden />
        <span className="font-medium">Image pack</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.slice(0, 6).map((img, i) => (
          <div
            key={i}
            className="aspect-[4/3] w-full overflow-hidden rounded border bg-white"
            style={{ borderColor: TK.divider }}
            title={img.alt}
          >
            {img.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.thumbUrl}
                alt={img.alt}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                             SKELETON                               */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-md bg-gray-100"
          style={{ border: `1px solid ${TK.divider}` }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         MAIN VIEWER COMPONENT                       */
/* ------------------------------------------------------------------ */

export function SerpSnapshotViewer(props: SerpSnapshotViewerProps) {
  const {
    open,
    onClose,
    keyword,
    dateISO,
    device,
    yourDomain,
    fetcher,
    onOpenFullAnalysis,
    role = "editor",
  } = props;

  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    "idle"
  );
  const [snapshot, setSnapshot] = useState<SerpSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
function useFocusTrap(
  isOpen: boolean,
  ref: React.RefObject<HTMLElement | null>,
  onClose?: () => void
) {
  if (!ref.current) return; // safe check

  // focus trap logic
}

  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(open, panelRef);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Fetch snapshot on open / param change
  useEffect(() => {
    if (!open) return;
    setStatus("loading");
    setErr(null);
    const run = async () => {
      try {
        const data =
          (await (fetcher
            ? fetcher({ keyword, dateISO, device })
            : mockFetcher({ keyword, dateISO, device }))) ?? null;
        setSnapshot(data);
        setStatus("ready");
      } catch (e: any) {
        setErr(e?.message || "Failed to load snapshot");
        setStatus("error");
      }
    };
    run();
  }, [open, keyword, dateISO, device, fetcher]);

  const features = snapshot?.summary.features ?? [];

  const canOpenFull = true; // Phase‑1: read‑only for all roles
  const fullAnalysis = () => {
    const args = { keyword, dateISO, device };
    onOpenFullAnalysis
      ? onOpenFullAnalysis(args)
      : (window.location.href = `/intelligence/serp-layout?keyword=${encodeURIComponent(
          keyword
        )}&date=${encodeURIComponent(dateISO)}&device=${device}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Right‑anchored modal */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`SERP Snapshot Viewer — ${keyword}`}
        className="absolute right-0 top-0 flex h-full w-full max-w-[620px] flex-col bg-white shadow-xl outline-none"
        style={{ borderLeft: `1px solid ${TK.border}` }}
        tabIndex={-1}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 border-b bg-white px-4 py-3"
          style={{ borderColor: TK.border }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[16px] font-semibold text-gray-900">
                🔍 SERP Snapshot Viewer —{" "}
                <span className="italic text-gray-800">“{keyword}”</span>
              </div>
              <div className="mt-0.5 text-xs text-gray-600">
                Date Captured: <b>{fmtDateLocal(dateISO)}</b>{" "}
                <span className="text-gray-400">•</span> Device:{" "}
                <b className="capitalize">{device}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {/* Summary */}
          <div
            className="rounded-md border p-3"
            style={{ borderColor: TK.divider }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm text-gray-800">
                  Your Rank:{" "}
                  <b className="tabular-nums">
                    {snapshot?.summary.yourRank ?? "Not in top 100"}
                  </b>
                </div>
                {snapshot?.summary.topCompetitor && (
                  <div className="text-sm text-gray-800">
                    Top Competitor:{" "}
                    <b>{snapshot.summary.topCompetitor.domain}</b>{" "}
                    <span className="text-gray-500">
                      (#{snapshot.summary.topCompetitor.rank}
                      {snapshot.summary.topCompetitor.ownsFS ? ", FS" : ""})
                    </span>
                  </div>
                )}
                {snapshot?.summary.yourDomain && (
                  <div className="text-xs text-gray-500">
                    Your domain:{" "}
                    <span className="font-mono">
                      {snapshot.summary.yourDomain}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {features.length ? (
                  <>
                    <span className="text-xs text-gray-500">SERP features:</span>
                    {features.map((f) => (
                      <FeatureBadge key={f} kind={f} />
                    ))}
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    No special features detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Snapshot viewport */}
          <div>
            <div className="mb-2 flex items-center gap-1 text-xs text-gray-500">
              <Info className="h-3.5 w-3.5" />
              Scroll to preview the SERP layout captured for this keyword.
            </div>
            <div
              className="h-[500px] overflow-auto rounded-md border p-3"
              style={{ borderColor: TK.divider }}
              aria-live="polite"
            >
              {status === "loading" && <Skeleton />}

              {status === "error" && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm">
                  <div className="text-gray-700">Couldn’t load SERP snapshot.</div>
                  <button
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    style={{ borderColor: TK.divider }}
                    onClick={() => {
                      // retry
                      (async () => {
                        setStatus("loading");
                        setErr(null);
                        try {
                          const data =
                            (await (fetcher
                              ? fetcher({ keyword, dateISO, device })
                              : mockFetcher({ keyword, dateISO, device }))) ??
                            null;
                          setSnapshot(data);
                          setStatus("ready");
                        } catch (e: any) {
                          setErr(e?.message || "Failed to load snapshot");
                          setStatus("error");
                        }
                      })();
                    }}
                  >
                    Retry
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  {err && <div className="text-xs text-gray-500">{err}</div>}
                </div>
              )}

              {status === "ready" && snapshot && snapshot.blocks.length === 0 && (
                <div className="flex h-full items-center justify-center text-sm text-gray-600">
                  No snapshot available for this date/device.
                </div>
              )}

              {status === "ready" &&
                snapshot &&
                snapshot.blocks.length > 0 && (
                  <div className="space-y-3">
                    {snapshot.blocks.map((b, i) => {
                      if (b.kind === "FS") return <FSBlock key={i} {...b} />;
                      if (b.kind === "PAA") return <PAABlock key={i} {...b} />;
                      if (b.kind === "ImagePack")
                        return <ImagePackBlock key={i} {...b} />;
                      if (b.kind === "Organic")
                        return (
                          <OrganicBlock
                            key={i}
                            {...b}
                            yourDomain={yourDomain ?? snapshot.summary.yourDomain}
                            topCompetitor={snapshot.summary.topCompetitor ?? null}
                          />
                        );
                      // Optional blocks (TopStories / Videos)
                      if (b.kind === "TopStories") {
                        return (
                          <div
                            key={i}
                            className="rounded-md border p-3"
                            style={{ borderColor: TK.divider }}
                          >
                            <div className="mb-2 text-xs font-medium text-gray-700">
                              Top stories
                            </div>
                            <div className="space-y-1">
                              {b.items.map((it, n) => (
                                <div
                                  key={n}
                                  className="text-sm text-gray-800"
                                  title={`${it.title} — ${it.source}`}
                                >
                                  • {it.title}{" "}
                                  <span className="text-gray-500">({it.source})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (b.kind === "Videos") {
                        return (
                          <div
                            key={i}
                            className="rounded-md border p-3"
                            style={{ borderColor: TK.divider }}
                          >
                            <div className="mb-2 text-xs font-medium text-gray-700">
                              Videos
                            </div>
                            <div className="space-y-1">
                              {b.items.map((it, n) => (
                                <div
                                  key={n}
                                  className="text-sm text-gray-800"
                                  title={`${it.title} — ${it.channel}`}
                                >
                                  • {it.title}{" "}
                                  <span className="text-gray-500">({it.channel})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 z-10 border-t bg-white px-4 py-3"
          style={{ borderColor: TK.border }}
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={fullAnalysis}
              disabled={!canOpenFull}
              className={classNames(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white shadow-sm",
                canOpenFull ? "hover:opacity-95" : "opacity-60 cursor-not-allowed"
              )}
              style={{ background: TK.cta }}
              title="Open full SERP analysis"
            >
              <ArrowUpRight className="h-4 w-4" />
              Open Full SERP Analysis
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         MOCK FETCHER (DEMO)                         */
/* ------------------------------------------------------------------ */

async function mockFetcher({
  keyword,
  dateISO,
  device,
}: {
  keyword: string;
  dateISO: string;
  device: DeviceKey;
}): Promise<SerpSnapshot> {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 500));

  const you = "yourdomain.com";
  return {
    meta: { keyword, dateCapturedISO: dateISO, device, locale: "en-US", market: "us" },
    summary: {
      yourDomain: you,
      yourRank: 12,
      topCompetitor: { domain: "comp1.com", rank: 1, ownsFS: true },
      features: ["FS", "PAA", "ImagePack", "Sitelinks"],
    },
    blocks: [
      {
        kind: "FS",
        owner: "comp1.com",
        title: "Best SEO Tools (2025): What Pros Actually Use",
        snippet:
          "Looking for the best SEO tools? We tested Ahrefs, Semrush, and more to uncover which platforms deliver real results...",
        url: "https://comp1.com/best-seo-tools",
      },
      {
        kind: "PAA",
        questions: [
          { q: "What are the best SEO tools?" },
          { q: "Is there a free SEO tool?" },
          { q: "Which SEO tool is most accurate?" },
        ],
      },
      {
        kind: "Organic",
        rank: 1,
        domain: "comp1.com",
        title: "Best SEO Tools (Full Comparison)",
        url: "https://comp1.com/best-seo-tools",
        snippet:
          "We compare leading SEO platforms across features, pricing, and accuracy so you can choose confidently...",
        sitelinks: [{ title: "Pricing", url: "https://comp1.com/pricing" }],
      },
      {
        kind: "Organic",
        rank: 2,
        domain: "yourdomain.com",
        title: "Top SEO Tools Reviewed",
        url: "https://yourdomain.com/tools",
        snippet:
          "Our hands-on review covers rank tracking, audits, and keyword research to help you pick the right toolset.",
        reviews: { rating: 4.7, count: 128 },
      },
      {
        kind: "Organic",
        rank: 3,
        domain: "other.com",
        title: "SEO Tools List: 43 Options",
        url: "https://other.com/seo-tools",
        snippet:
          "A comprehensive list of SEO tools for research, on-page, and technical workflows.",
      },
      {
        kind: "ImagePack",
        items: [
          { alt: "seo charts", targetUrl: "https://images.google.com/..." },
          { alt: "tools ui", targetUrl: "https://images.google.com/..." },
          { alt: "seo dashboard", targetUrl: "https://images.google.com/..." },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*                           DEMO EXPORT                               */
/* ------------------------------------------------------------------ */

/**
 * Demo wrapper for quick drop‑in testing.
 * Use <SerpSnapshotViewer ... /> directly in your codebase.
 */
export default function SerpSnapshotViewerDemo() {
  const [open, setOpen] = useState(true);
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
<>

      {open && (
        <SerpSnapshotViewer
          open={open}
          onClose={() => setOpen(false)}
          keyword="best seo tools"
          dateISO={todayISO}
          device="desktop"
          yourDomain="yourdomain.com"
          fetcher={mockFetcher}
          onOpenFullAnalysis={() => {
            // Example: route into your SERP Layout tab
            console.info("Open full SERP analysis");
          }}
          role="editor"
        />
      )}
</>
  );
}
