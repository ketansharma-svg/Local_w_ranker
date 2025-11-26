"use client";

/**
 * Wranker — Link Map (Tab 7)
 * Section 4 — Right Inspector Drawer (Node / Edge Details)
 *
 * Refinements applied (per spec):
 * - Inter font stack
 * - Branded minimal icons in header, section titles, KPI cards, table type/status
 * - Pointer cursor on all clickable controls
 * - "More" dropdown layering fix (always above KPI/table sticky headers)
 * - KPI area rewritten to **three cards only**: PILS, AQS, Inlinks/Outlinks
 *   (logic & visuals aligned with the shared KPI reference)
 * - Table page-URL cells show an info tooltip with the full URL (no emojis)
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Star,
  ArrowRightLeft as ReplaceIcon,
  ClipboardList,
  EllipsisVertical,
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  History,
  Filter,
  Search,
  Eye,
  Ban,
  Download,
  Info,
  CheckSquare,
  // Branded minimal icons for titles/sections/types/status
  Gauge,
  LineChart,
  PieChart as PieChartIcon,
  Link2,
  Tag,
  Image as ImageIcon,
  Quote,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

// KPI cards (reference pattern)
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  CartesianGrid,
  Sector,
} from "recharts";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";

/* ───────────────────────── Tokens / Fonts ───────────────────────── */
const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

const BRAND = "#008CCD";
const VALUE_BLUE = "#0077FF";

const applyTokens = () => {
  const r = document.documentElement;
  r.style.setProperty("--wr-action", VALUE_BLUE);
  r.style.setProperty("--wr-good", "#10B981");
  r.style.setProperty("--wr-warning", "#F59E0B");
  r.style.setProperty("--wr-critical", "#EF4444");
  r.style.setProperty("--wr-text", "#111827");
  r.style.setProperty("--wr-muted", "#6B7280");
  r.style.setProperty("--wr-panel", "#FFFFFF");
  r.style.setProperty("--wr-app", "#F5F7FA");
  r.style.setProperty("--wr-border", "#E5E7EB");
  r.style.setProperty("--wr-borderLight", "#EFF0F6");
  r.style.setProperty("--wr-radius", "6px");
};

/* ───────────────────────── Utilities ───────────────────────── */
const classNames = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");
const fmtPct = (n: number) => `${Number(n).toFixed(1)}%`;
const fmtNum = (n: number) => new Intl.NumberFormat().format(n);
const stripTags = (html?: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html ?? "";
  return tmp.textContent || tmp.innerText || "";
};
const statusColor = (status: "ok" | "redirect" | "broken") =>
  status === "ok"
    ? "var(--wr-good)"
    : status === "redirect"
    ? "var(--wr-warning)"
    : status === "broken"
    ? "var(--wr-critical)"
    : "var(--wr-muted)";
const toneColor = (n: number) =>
  n >= 80 ? "var(--wr-good)" : n >= 60 ? "var(--wr-warning)" : "var(--wr-critical)";
const caret = (v: number) => (v === 0 ? "±" : v > 0 ? "▲" : "▼");

/* ───────────────────────── Mock API Types & Data ───────────────────────── */
/** @typedef {{ id:string; url:string; title:string; pils:number; aqs:number; inlinks:number; outlinks:number; status:("orphan"|"redirect"|"broken")[]; lastCrawled:string; topAnchors: AnchorRow[]; incomingInstances: IncomingInst[]; outgoingInstances?: OutgoingInst[]; history: HistoryItem[]; metricHistory: MetricHistory }} NodeDetail */
/** @typedef {{ anchor:string; count:number; aqs:number; type:"Text"|"Image"|"Generic" }} AnchorRow */
/** @typedef {{ id:string; sourceNodeId:string; sourceUrl:string; anchor:string; context:string; status:"ok"|"broken"|"redirect"; lastChecked:string; location?:string }} IncomingInst */
/** @typedef {{ id:string; targetNodeId:string; targetUrl:string; anchor:string; status:"ok"|"broken"|"redirect"; lastChecked?:string }} OutgoingInst */
/** @typedef {{ type:string; actor:string; ts:string; details:string }} HistoryItem */
/** @typedef {{ pils:Point[]; aqs:Point[]; inlinks:Point[]; outlinks:Point[] }} MetricHistory */
/** @typedef {{ date:string; value:number }} Point */

const NOW = new Date("2025-08-22T12:23:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

const MOCK_DETAIL = {
  id: "node-123",
  url: "/blog/seo-tools",
  title: "SEO Tools — Complete Guide",
  pils: 72.4,
  aqs: 68,
  inlinks: 12,
  outlinks: 4,
  status: ["redirect"] as Array<"orphan" | "redirect" | "broken">,
  lastCrawled: NOW.toISOString(),
  topAnchors: [
    { anchor: "read more", count: 6, aqs: 64, type: "Generic" },
    { anchor: "seo tools", count: 4, aqs: 80, type: "Text" },
    { anchor: "image", count: 2, aqs: 55, type: "Image" },
  ],
  incomingInstances: Array.from({ length: 26 }).map((_, i) => ({
    id: `inst-${i + 1}`,
    sourceNodeId: `n${i + 10}`,
    sourceUrl: i % 5 ? `/blog/post-${i + 1}` : `/guides/guide-${i + 1}`,
    anchor: i % 3 === 0 ? "read more" : i % 3 === 1 ? "seo tools" : "image",
    context: `... some HTML with <a href="/blog/seo-tools">${
      i % 3 === 2 ? "image" : i % 3 === 1 ? "seo tools" : "read more"
    }</a> ...`,
    status: (i % 7 === 0 ? "broken" : i % 6 === 0 ? "redirect" : "ok") as
      | "ok"
      | "broken"
      | "redirect",
    lastChecked: daysAgo(3),
    location: ["Main content", "Sidebar", "Footer"][i % 3],
  })),
  outgoingInstances: [
    { id: "out-1", targetNodeId: "n22", targetUrl: "/tools", anchor: "tools", status: "ok" },
    {
      id: "out-2",
      targetNodeId: "n88",
      targetUrl: "/seo-guide",
      anchor: "learn more",
      status: "redirect",
    },
  ],
  history: [
    {
      type: "task_created",
      actor: "bob@w3era.co.uk",
      ts: daysAgo(4),
      details: "Task #123 created for 4 broken links",
    },
    {
      type: "redirect_added",
      actor: "alice@w3era.co.uk",
      ts: daysAgo(5),
      details: "301 from /old to /new",
    },
  ],
  metricHistory: {
    pils: [
      { date: daysAgo(60), value: 69.2 },
      { date: daysAgo(45), value: 70.1 },
      { date: daysAgo(30), value: 71.2 },
      { date: daysAgo(15), value: 72.0 },
      { date: daysAgo(0), value: 72.4 },
    ],
    aqs: [
      { date: daysAgo(60), value: 65 },
      { date: daysAgo(45), value: 66 },
      { date: daysAgo(30), value: 66.5 },
      { date: daysAgo(15), value: 67.2 },
      { date: daysAgo(0), value: 68 },
    ],
    inlinks: [
      { date: daysAgo(60), value: 9 },
      { date: daysAgo(45), value: 10 },
      { date: daysAgo(30), value: 11 },
      { date: daysAgo(15), value: 12 },
      { date: daysAgo(0), value: 12 },
    ],
    outlinks: [
      { date: daysAgo(60), value: 3 },
      { date: daysAgo(45), value: 3 },
      { date: daysAgo(30), value: 3 },
      { date: daysAgo(15), value: 4 },
      { date: daysAgo(0), value: 4 },
    ],
  },
} as const;

/* ───────────────────────── Root Demo ───────────────────────── */
export default function RightInspectorDemo() {
  useEffect(() => {
    applyTokens();
    runSelfTests();
  }, []);
  const [open, setOpen] = useState(true);
  const [detail] = useState(MOCK_DETAIL);
  const [priority, setPriority] = useState(false);
  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();

  return (



      <RightInspectorDrawer
        open={open}
        onClose={() => setOpen(false)}
        data={detail}
        priority={priority}
        onTogglePriority={() => setPriority((p) => !p)}
        onReplaceLink={(context) =>
          alert(
            `Replace Link drawer → anchor: ${context?.anchor || "-"} • instances: ${
              context?.count || 0
            }`
          )
        }
        onCreateTask={(context) => alert(`Task Drawer → ${context?.summary || "Fix links"}`)}
      />

  );
}

/* ───────────────────────── Drawer ───────────────────────── */
function RightInspectorDrawer({
  open,
  onClose,
  data,
  priority,
  onTogglePriority,
  onReplaceLink,
  onCreateTask,
}: {
  open: boolean;
  onClose: () => void;
  data: typeof MOCK_DETAIL;
  priority: boolean;
  onTogglePriority: () => void;
  onReplaceLink: (ctx?: { anchor?: string; count?: number }) => void;
  onCreateTask: (ctx?: { summary?: string }) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Focus & ESC
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", handleKey);
    const to = setTimeout(() => {
      const closeBtn = ref.current?.querySelector("button[data-close]") as HTMLButtonElement | null;
      closeBtn?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", handleKey);
      clearTimeout(to);
      prev && prev.focus?.();
    };
  }, [open, onClose]);

  // Local table state
  const [anchorType, setAnchorType] =
    useState<"All" | "Text" | "Image" | "Generic">("All");
  const [anchorSearch, setAnchorSearch] = useState("");
  const [selAnchors, setSelAnchors] = useState<Set<string>>(() => new Set());

  const [inStatus, setInStatus] =
    useState<"All" | "ok" | "redirect" | "broken">("All");
  const [inSearch, setInSearch] = useState("");
  const [selIncoming, setSelIncoming] = useState<Set<string>>(() => new Set());

  const [outStatus, setOutStatus] =
    useState<"All" | "ok" | "redirect" | "broken">("All");
  const [outSearch, setOutSearch] = useState("");
  const [selOutgoing, setSelOutgoing] = useState<Set<string>>(() => new Set());

  const anchorsFiltered = useMemo(
    () =>
      data.topAnchors.filter(
        (a) =>
          (anchorType === "All" || a.type === anchorType) &&
          (anchorSearch.trim() === "" ||
            a.anchor.toLowerCase().includes(anchorSearch.toLowerCase()))
      ),
    [data.topAnchors, anchorType, anchorSearch]
  );

  const incomingFiltered = useMemo(
    () =>
      data.incomingInstances.filter(
        (r) =>
          (inStatus === "All" || r.status === inStatus) &&
          (inSearch.trim() === "" ||
            r.sourceUrl.toLowerCase().includes(inSearch.toLowerCase()) ||
            r.anchor.toLowerCase().includes(inSearch.toLowerCase()))
      ),
    [data.incomingInstances, inStatus, inSearch]
  );

  const outgoingFiltered = useMemo(() => {
    const list = data.outgoingInstances || [];
    return list.filter(
      (r) =>
        (outStatus === "All" || r.status === outStatus) &&
        (outSearch.trim() === "" ||
          r.targetUrl.toLowerCase().includes(outSearch.toLowerCase()) ||
          r.anchor.toLowerCase().includes(outSearch.toLowerCase()))
    );
  }, [data.outgoingInstances, outStatus, outSearch]);

  // KPI helpers
  const deltaOf = (series: { value: number }[]) => {
    if (!series || series.length < 2) return 0;
    const last = series[series.length - 1].value;
    const prev = series[series.length - 2].value;
    return Number((last - prev).toFixed(1));
  };

  // Selection helpers
  const toggleSet = (set: Set<string>, key: string) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  };
  const setAll = (set: Set<string>, keys: string[], checked: boolean) => {
    const next = new Set(set);
    if (checked) keys.forEach((k) => next.add(k));
    else keys.forEach((k) => next.delete(k));
    return next;
  };

  // KPI series (reference logic)
  const pilsSeries = useMemo(() => data.metricHistory.pils.map((p) => ({ date: p.date, value: Math.round(p.value) })), [data.metricHistory.pils]);
  const aqsSeries = useMemo(() => data.metricHistory.aqs.map((p) => ({ date: p.date, value: Math.round(p.value) })), [data.metricHistory.aqs]);

  // Convert In/Out to % share per date (so the trend tooltips follow reference)
  const inOutShareSeries = useMemo(() => {
    const ins = data.metricHistory.inlinks;
    const outs = data.metricHistory.outlinks;
    const n = Math.min(ins.length, outs.length);
    const inS: { date: string; value: number }[] = [];
    const outS: { date: string; value: number }[] = [];
    for (let i = 0; i < n; i++) {
      const total = Math.max(1, ins[i].value + outs[i].value);
      inS.push({ date: ins[i].date, value: Math.round((ins[i].value / total) * 100) });
      outS.push({ date: outs[i].date, value: Math.round((outs[i].value / total) * 100) });
    }
    return { inS, outS };
  }, [data.metricHistory.inlinks, data.metricHistory.outlinks]);

  const lastIn = data.metricHistory.inlinks.at(-1)?.value ?? 0;
  const lastOut = data.metricHistory.outlinks.at(-1)?.value ?? 0;
  const totalLinks = Math.max(1, lastIn + lastOut);
  const inShare = Math.round((lastIn / totalLinks) * 100);
  const outShare = Math.round((lastOut / totalLinks) * 100);

  const pilsDelta = deltaOf(pilsSeries);
  const aqsDelta = deltaOf(aqsSeries);
  const inDeltaShare = (inOutShareSeries.inS.at(-1)?.value ?? 0) - (inOutShareSeries.inS.at(-2)?.value ?? 0);
  const outDeltaShare = (inOutShareSeries.outS.at(-1)?.value ?? 0) - (inOutShareSeries.outS.at(-2)?.value ?? 0);

  return (
    <div
      aria-hidden={!open}
      className={classNames("fixed inset-0 z-[1200] pointer-events-none", open ? "" : "hidden")}
    >
      {/* Scrim */}
      {/* <div className="absolute inset-0 bg-black/30 transition-opacity pointer-events-auto" onClick={onClose} /> */}

      {/* Panel — FULL WIDTH */}
      <aside
        ref={ref}
        role="dialog"
        aria-modal="false"
        aria-labelledby="inspector-title"
        className={classNames(
          "absolute right-0 top-0 h-full w-[64vw] bg-[var(--wr-panel)] border-l border-[var(--wr-borderLight)] shadow-xl pointer-events-auto",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ fontFamily: FONT_STACK }}
      >
        {/* Header (sticky) */}
        <header className="sticky top-0 bg-[var(--wr-panel)] border-b border-[var(--wr-borderLight)] px-4 py-3 flex items-start gap-3 z-[60]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Branded minimal icon */}
              <Link2 size={20} className="text-[#008CCD]" aria-hidden />
              <h2 id="inspector-title" className="text-[16px] font-semibold truncate">
                {data.title}
              </h2>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-[var(--wr-muted)] truncate">
              <a
                className="underline decoration-dotted underline-offset-2 truncate hover:underline cursor-pointer"
                href={data.url}
                target="_blank"
                rel="noreferrer"
                title={data.url}
              >
                {data.url}
              </a>
              <button
                className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer"
                aria-label="Copy URL"
                onClick={() => navigator.clipboard?.writeText?.(data.url)}
                title="Copy URL"
              >
                <Copy size={14} />
              </button>
              <a
                className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer"
                href={data.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in new tab"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="neutral">PILS {fmtPct(data.pils)}</Badge>
              <Badge tone="neutral">AQS {fmtPct(data.aqs)}</Badge>
              {data.status.includes("orphan") && <Badge tone="critical">Orphan</Badge>}
              {data.status.includes("redirect") && <Badge tone="warning">Redirect</Badge>}
              {data.status.includes("broken") && <Badge tone="critical">Broken</Badge>}
            </div>
          </div>

          {/* Header CTAs (right) */}
          <div className="flex items-start gap-2 relative z-[65] mr-16">
            <PrimaryButton
              onClick={() =>
                onReplaceLink?.({
                  anchor: data.topAnchors?.[0]?.anchor,
                  count: data.incomingInstances?.length,
                })
              }
              title="Replace Link"
            >
              <ReplaceIcon size={16} className="mr-2" /> Replace Link
            </PrimaryButton>

            <OutlineButton onClick={() => onCreateTask?.({ summary: `Fix anchors for ${data.title}` })}>
              <ClipboardList size={16} className="mr-2" /> Create Task
            </OutlineButton>

            <ToggleButton
              pressed={priority}
              onClick={onTogglePriority}
              labelOn="Unmark Priority"
              labelOff="Mark Priority"
            >
              <Star
                size={16}
                className={classNames(
                  "mr-2",
                  priority ? "fill-[var(--wr-action)] text-[var(--wr-action)]" : ""
                )}
              />
              {priority ? "Priority" : "Mark Priority"}
            </ToggleButton>

            {/* More — dropdown layering FIX (z above sticky heads) */}
            <div className="relative">
              <OutlineButton onClick={() => setShowMore((s) => !s)}>
                <EllipsisVertical size={16} className="mr-2" /> More
              </OutlineButton>
              {showMore && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white border border-[var(--wr-borderLight)] rounded-md shadow-md z-[80]"
                  role="menu"
                >
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-[var(--wr-app)] text-[13px] flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setShowMore(false);
                      alert("View in Page Analyzer");
                    }}
                  >
                    <Info size={14} /> View in Page Analyzer
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-[var(--wr-app)] text-[13px] flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setShowMore(false);
                      alert("Export node data (JSON)");
                    }}
                  >
                    <Download size={14} /> Export node data
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-[var(--wr-app)] text-[13px] flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setShowMore(false);
                      alert("Added to Watchlist");
                    }}
                  >
                    <Star size={14} /> Add to Watchlist
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-[var(--wr-app)] text-[13px] flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setShowMore(false);
                      alert("Excluded from map");
                    }}
                  >
                    <Ban size={14} /> Exclude from map
                  </button>
                </div>
              )}
            </div>

            {/* <button
              data-close
              onClick={onClose}
              className="p-2 rounded-md border border-[var(--wr-borderLight)] hover:bg-[var(--wr-app)] cursor-pointer"
              aria-label="Close inspector"
              title="Close"
            >
              <X size={18} />
            </button> */}
          </div>
        </header>

        {/* Body */}
        <div
          className="h-[calc(100%-56px)] overflow-y-auto p-4 space-y-6"
          aria-describedby="inspector-desc"
        >
          <p id="inspector-desc" className="sr-only">
            Inspector shows page metrics, anchors, incoming and outgoing link instances, and recent
            history.
          </p>

          {/* KPI SECTION — EXACTLY THREE CARDS (reference pattern) */}
          <section
            aria-label="Overview KPIs"
            className="rounded-md border border-[var(--wr-borderLight)] bg-white"
          >
            <div
              className="px-4 py-3 flex items-center justify-between border-b"
              style={{ borderColor: "var(--wr-borderLight)" }}
            >
              <div className="flex items-center gap-2">
                <PieChartIcon size={16} className="text-[#008CCD]" />
                <h3 className="text-[14px] font-semibold">Overview</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiDonutBarCard
                  kpi="PILS"
                  valuePct={Math.round(data.pils)}
                  deltaPct={pilsDelta}
                  series={pilsSeries}
                  useSeverity
                />
                <KpiDonutBarCard
                  kpi="AQS"
                  valuePct={Math.round(data.aqs)}
                  deltaPct={aqsDelta}
                  series={aqsSeries}
                  useSeverity
                />
                <InOutCard
                  inlinksPct={inShare}
                  outlinksPct={outShare}
                  inDeltaPct={inDeltaShare}
                  outDeltaPct={outDeltaShare}
                  seriesIn={inOutShareSeries.inS}
                  seriesOut={inOutShareSeries.outS}
                />
              </div>
            </div>
          </section>

          {/* Incoming Anchors */}
          <SectionBlock
            title="Incoming anchors"
            icon={<Tag size={16} className="text-[#008CCD]" />}
          >
            <FilterBar>
              <ChipToggle label="All" active={anchorType === "All"} onClick={() => setAnchorType("All")} />
              <ChipToggle label="Text" active={anchorType === "Text"} onClick={() => setAnchorType("Text")} />
              <ChipToggle label="Image" active={anchorType === "Image"} onClick={() => setAnchorType("Image")} />
              <ChipToggle label="Generic" active={anchorType === "Generic"} onClick={() => setAnchorType("Generic")} />
              <SearchBox value={anchorSearch} onChange={setAnchorSearch} placeholder="Search anchor…" />
            </FilterBar>

            {selAnchors.size > 0 && (
              <BulkActionBar
                count={selAnchors.size}
                scopeLabel="anchors"
                onClear={() => setSelAnchors(new Set())}
                onCreateTask={() => onCreateTask?.({ summary: `Improve ${selAnchors.size} anchor(s)` })}
                onReplace={() => onReplaceLink?.({ anchor: "(multiple)", count: selAnchors.size })}
              />
            )}

            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <HeaderCheckbox
                      checked={selAnchors.size > 0 && anchorsFiltered.every((a) => selAnchors.has(a.anchor))}
                      indeterminate={selAnchors.size > 0 && !anchorsFiltered.every((a) => selAnchors.has(a.anchor))}
                      onChange={(ck) =>
                        setSelAnchors(setAll(selAnchors, anchorsFiltered.map((a) => a.anchor), ck))
                      }
                    />
                  </TH>
                  <TH>Anchor</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Count</TH>
                  <TH className="text-right">AQS</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {anchorsFiltered.map((row) => (
                  <TR key={row.anchor} hover>
                    <TD className="w-10">
                      <RowCheckbox
                        checked={selAnchors.has(row.anchor)}
                        onChange={(ck) =>
                          setSelAnchors(
                            ck
                              ? new Set(selAnchors).add(row.anchor)
                              : (() => {
                                  const n = new Set(selAnchors);
                                  n.delete(row.anchor);
                                  return n;
                                })()
                          )
                        }
                      />
                    </TD>
                    <TD className="max-w-[520px]">
                      <span className="font-medium">{row.anchor}</span>
                    </TD>
                    <TD>
                      <TypeBadge type={row.type} />
                    </TD>
                    <TD className="text-right">{fmtNum(row.count)}</TD>
                    <TD>
                      <ProgressBar percent={row.aqs} />
                    </TD>
                    <TD>
                      <IconActions
                        onView={() => alert(`View instances for "${row.anchor}"`)}
                        onReplace={() => onReplaceLink?.({ anchor: row.anchor, count: 0 })}
                        onTask={() => onCreateTask?.({ summary: `Improve anchor "${row.anchor}"` })}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </SectionBlock>

          {/* Incoming Instances */}
          <SectionBlock
            title="Incoming instances"
            icon={<Link2 size={16} className="text-[#008CCD]" />}
          >
            <FilterBar>
              <ChipToggle label="All" active={inStatus === "All"} onClick={() => setInStatus("All")} />
              <ChipToggle label="OK" active={inStatus === "ok"} onClick={() => setInStatus("ok")} />
              <ChipToggle label="Redirect" active={inStatus === "redirect"} onClick={() => setInStatus("redirect")} />
              <ChipToggle label="Broken" active={inStatus === "broken"} onClick={() => setInStatus("broken")} />
              <SearchBox value={inSearch} onChange={setInSearch} placeholder="Search source / anchor…" />
            </FilterBar>

            {selIncoming.size > 0 && (
              <BulkActionBar
                count={selIncoming.size}
                scopeLabel="incoming link(s)"
                onClear={() => setSelIncoming(new Set())}
                onCreateTask={() => onCreateTask?.({ summary: `Fix ${selIncoming.size} incoming link(s)` })}
                onReplace={() => onReplaceLink?.({ anchor: "(instances)", count: selIncoming.size })}
              />
            )}

            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <HeaderCheckbox
                      checked={selIncoming.size > 0 && incomingFiltered.every((r) => selIncoming.has(r.id))}
                      indeterminate={selIncoming.size > 0 && !incomingFiltered.every((r) => selIncoming.has(r.id))}
                      onChange={(ck) =>
                        setSelIncoming(setAll(selIncoming, incomingFiltered.map((r) => r.id), ck))
                      }
                    />
                  </TH>
                  <TH>Source Page</TH>
                  <TH>Anchor</TH>
                  <TH>Context</TH>
                  <TH>Status</TH>
                  <TH>Last Checked</TH>
                  <TH>Actions</TH>
                </TR>
              </THead>
              <TBody>
                {incomingFiltered.slice(0, 12).map((row) => (
                  <TR key={row.id} hover>
                    <TD className="w-10">
                      <RowCheckbox
                        checked={selIncoming.has(row.id)}
                        onChange={(ck) =>
                          setSelIncoming(
                            ck
                              ? new Set(selIncoming).add(row.id)
                              : (() => {
                                  const n = new Set(selIncoming);
                                  n.delete(row.id);
                                  return n;
                                })()
                          )
                        }
                      />
                    </TD>
                    <TD>
                      <UrlWithTooltip url={row.sourceUrl} maxW="max-w-[360px]" />
                    </TD>
                    <TD className="text-[13px] font-medium">{row.anchor}</TD>
                    <TD className="text-[13px] text-[var(--wr-muted)] truncate max-w-[520px]">
                      {stripTags(row.context)}
                    </TD>
                    <TD>
                      <StatusBadge status={row.status} />
                    </TD>
                    <TD className="text-[12px] text-[var(--wr-muted)] whitespace-nowrap">
                      {new Date(row.lastChecked).toLocaleString()}
                    </TD>
                    <TD>
                      <IconActions
                        onView={() => alert(`Open source ${row.sourceUrl}`)}
                        onReplace={() => onReplaceLink?.({ anchor: row.anchor, count: 1 })}
                        onTask={() => onCreateTask?.({ summary: `Fix link from ${row.sourceUrl}` })}
                        onIgnore={() => alert("Ignored this instance")}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination total={incomingFiltered.length} pageSize={12} />
          </SectionBlock>

          {/* Outgoing Instances */}
          {!!data.outgoingInstances?.length && (
            <SectionBlock
              title="Outgoing instances"
              icon={<ExternalLink size={16} className="text-[#008CCD]" />}
            >
              <FilterBar>
                <ChipToggle label="All" active={outStatus === "All"} onClick={() => setOutStatus("All")} />
                <ChipToggle label="OK" active={outStatus === "ok"} onClick={() => setOutStatus("ok")} />
                <ChipToggle label="Redirect" active={outStatus === "redirect"} onClick={() => setOutStatus("redirect")} />
                <ChipToggle label="Broken" active={outStatus === "broken"} onClick={() => setOutStatus("broken")} />
                <SearchBox value={outSearch} onChange={setOutSearch} placeholder="Search target / anchor…" />
              </FilterBar>

              {selOutgoing.size > 0 && (
                <BulkActionBar
                  count={selOutgoing.size}
                  scopeLabel="outgoing link(s)"
                  onClear={() => setSelOutgoing(new Set())}
                  onCreateTask={() => onCreateTask?.({ summary: `Review ${selOutgoing.size} outgoing link(s)` })}
                  onReplace={() => onReplaceLink?.({ anchor: "(outgoing)", count: selOutgoing.size })}
                />
              )}

              <Table>
                <THead>
                  <TR>
                    <TH className="w-10">
                      <HeaderCheckbox
                        checked={selOutgoing.size > 0 && outgoingFiltered.every((r) => selOutgoing.has(r.id))}
                        indeterminate={selOutgoing.size > 0 && !outgoingFiltered.every((r) => selOutgoing.has(r.id))}
                        onChange={(ck) =>
                          setSelOutgoing(setAll(selOutgoing, outgoingFiltered.map((r) => r.id), ck))
                        }
                      />
                    </TH>
                    <TH>Target Page</TH>
                    <TH>Anchor</TH>
                    <TH>Status</TH>
                    <TH>Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {outgoingFiltered.map((row) => (
                    <TR key={row.id} hover>
                      <TD className="w-10">
                        <RowCheckbox
                          checked={selOutgoing.has(row.id)}
                          onChange={(ck) =>
                            setSelOutgoing(
                              ck
                                ? new Set(selOutgoing).add(row.id)
                                : (() => {
                                    const n = new Set(selOutgoing);
                                    n.delete(row.id);
                                    return n;
                                  })()
                            )
                          }
                        />
                      </TD>
                      <TD>
                        <UrlWithTooltip url={row.targetUrl} maxW="max-w-[420px]" />
                      </TD>
                      <TD className="text-[13px] font-medium">{row.anchor}</TD>
                      <TD>
                        <StatusBadge status={row.status} />
                      </TD>
                      <TD>
                        <IconActions
                          onView={() => alert(`Open target ${row.targetUrl}`)}
                          onReplace={() => onReplaceLink?.({ anchor: row.anchor, count: 1 })}
                          onTask={() => onCreateTask?.({ summary: `Review outgoing link to ${row.targetUrl}` })}
                        />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </SectionBlock>
          )}

          {/* History */}
          <section aria-label="Recent history" className="space-y-2">
            <SectionHeader
              title="Recent history"
              icon={<History size={16} className="text-[#008CCD]" />}
            />
            <ul className="divide-y divide-[var(--wr-borderLight)] border border-[var(--wr-borderLight)] rounded-md">
              {data.history.map((h, i) => (
                <li key={i} className="p-3 text-[13px] flex items-center gap-2">
                  <History size={14} className="text-[var(--wr-muted)]" />
                  <span className="font-medium mr-1">{h.type.replaceAll("_", " ")}</span>
                  <span className="text-[var(--wr-muted)]">by {h.actor}</span>
                  <span className="text-[var(--wr-muted)] ml-auto">
                    {new Date(h.ts).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── Small UI Primitives ───────────────────────── */
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "critical" | "warning" | "good";
}) {
  const toneCls =
    tone === "critical"
      ? "text-[var(--wr-critical)] border-[var(--wr-critical)]/30 bg-[var(--wr-critical)]/5"
      : tone === "warning"
      ? "text-[var(--wr-warning)] border-[var(--wr-warning)]/30 bg-[var(--wr-warning)]/5"
      : tone === "good"
      ? "text-[var(--wr-good)] border-[var(--wr-good)]/30 bg-[var(--wr-good)]/5"
      : "text-[var(--wr-text)] border-[var(--wr-borderLight)] bg-white";
  return (
    <span className={classNames("inline-flex items-center px-2 py-0.5 rounded-md border text-[12px]", toneCls)}>
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      className="inline-flex items-center px-3 py-2 rounded-md text-white bg-[var(--wr-action)] hover:bg-[#005FCC] focus:outline-none focus:ring-2 focus:ring-[var(--wr-action)] cursor-pointer"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      className="inline-flex items-center px-3 py-2 rounded-md border border-[var(--wr-action)] text-[var(--wr-action)] bg-white hover:bg-[var(--wr-app)] focus:outline-none focus:ring-2 focus:ring-[var(--wr-action)]/50 cursor-pointer"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToggleButton({
  children,
  pressed,
  onClick,
  labelOn,
  labelOff,
}: {
  children: React.ReactNode;
  pressed: boolean;
  onClick?: () => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      aria-pressed={pressed}
      aria-label={pressed ? labelOn : labelOff}
      className={classNames(
        "inline-flex items-center px-3 py-2 rounded-md border cursor-pointer",
        pressed
          ? "border-[var(--wr-action)] text-[var(--wr-action)] bg-[var(--wr-app)]"
          : "border-[var(--wr-borderLight)] text-[var(--wr-text)] bg-white hover:bg-[var(--wr-app)]"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "px-2 py-1 rounded-md border text-[12px] cursor-pointer",
        active
          ? "border-[var(--wr-action)] text-[var(--wr-action)] bg-[var(--wr-app)]"
          : "border-[var(--wr-borderLight)] text-[var(--wr-text)] bg-white hover:bg-[var(--wr-app)]"
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--wr-muted)]" />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-7 pr-2 py-1.5 text-[13px] rounded-md border border-[var(--wr-borderLight)] outline-none focus:ring-2 focus:ring-[var(--wr-action)]"
      />
    </div>
  );
}

function SectionHeader({
  title,
  icon,
  right,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
        <h3 className="text-[14px] font-semibold">{title}</h3>
      </div>
      <div>{right}</div>
    </div>
  );
}

function SectionBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <SectionHeader title={title} icon={icon} />
      {children}
    </section>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-[var(--wr-borderLight)] bg-white">
      <span className="flex items-center gap-1 text-[12px] text-[var(--wr-muted)]">
        <Filter size={14} /> Filters
      </span>
      <div className="h-4 w-px bg-[var(--wr-borderLight)]" />
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-auto border border-[var(--wr-borderLight)] rounded-md">
      <table className="w-full text-left">{children}</table>
    </div>
  );
}
function THead({ children }: { children: React.ReactNode }) {
  // Lower z than header menu, so "More" dropdown overlays
  return (
    <thead className="bg-[var(--wr-app)] border-b border-[var(--wr-borderLight)] text-[13px] sticky top-0 z-[20]">
      {children}
    </thead>
  );
}
function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-[var(--wr-borderLight)]">{children}</tbody>;
}
function TR({ children, hover = false }: { children: React.ReactNode; hover?: boolean }) {
  return <tr className={classNames("align-top", hover && "hover:bg-[var(--wr-app)]")}>{children}</tr>;
}
function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={classNames("px-3 py-2 font-medium text-[12px] text-[var(--wr-muted)]", className)}>
      {children}
    </th>
  );
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={classNames("px-3 py-2", className)}>{children}</td>;
}

function StatusBadge({ status }: { status: "ok" | "redirect" | "broken" }) {
  const color = statusColor(status);
  const Icon =
    status === "ok" ? CheckCircle : status === "redirect" ? ArrowRight : AlertTriangle;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] capitalize" style={{ color }}>
      <Icon size={14} />
      <span className="text-[var(--wr-text)]">{status}</span>
    </span>
  );
}

function TypeBadge({ type }: { type: "Text" | "Image" | "Generic" }) {
  const ico =
    type === "Text" ? (
      <Quote size={14} className="text-[#008CCD]" />
    ) : type === "Image" ? (
      <ImageIcon size={14} className="text-[#008CCD]" />
    ) : (
      <Tag size={14} className="text-[#008CCD]" />
    );
  return <span className="inline-flex items-center gap-1 text-[13px]">{ico} {type}</span>;
}

function IconActions({
  onView,
  onReplace,
  onTask,
  onIgnore,
}: {
  onView?: () => void;
  onReplace?: () => void;
  onTask?: () => void;
  onIgnore?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {onView && (
        <button className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer" title="View">
          <Eye size={16} onClick={onView} />
        </button>
      )}
      {onReplace && (
        <button className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer" title="Replace">
          <ReplaceIcon size={16} onClick={onReplace} />
        </button>
      )}
      {onTask && (
        <button className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer" title="Create task">
          <ClipboardList size={16} onClick={onTask} />
        </button>
      )}
      {onIgnore && (
        <button className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer" title="Ignore">
          <Ban size={16} onClick={onIgnore} />
        </button>
      )}
      {!onView && !onReplace && !onTask && !onIgnore && (
        <button className="p-1 rounded hover:bg-[var(--wr-app)] cursor-pointer" title="More">
          <EllipsisVertical size={16} />
        </button>
      )}
    </div>
  );
}

function Pagination({ total, pageSize = 10 }: { total: number; pageSize?: number }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-end gap-2 text-[13px]">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="px-2 py-1 rounded-md border border-[var(--wr-borderLight)] bg-white hover:bg-[var(--wr-app)] cursor-pointer"
        aria-label="Prev"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="px-2">
        Page {page} / {pages}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
        className="px-2 py-1 rounded-md border border-[var(--wr-borderLight)] bg-white hover:bg-[var(--wr-app)] cursor-pointer"
        aria-label="Next"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const color = toneColor(percent);
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="relative w-full h-2 rounded bg-[var(--wr-app)] border border-[var(--wr-borderLight)]">
        <div
          className="h-full rounded"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[12px] font-medium" style={{ color }}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}

function BulkActionBar({
  count,
  scopeLabel,
  onClear,
  onCreateTask,
  onReplace,
}: {
  count: number;
  scopeLabel: string;
  onClear: () => void;
  onCreateTask: () => void;
  onReplace: () => void;
}) {
  return (
    <div className="mt-2 mb-2 flex items-center justify-between px-3 py-2 rounded-md border border-[var(--wr-borderLight)] bg-white shadow-sm">
      <div className="flex items-center gap-2 text-[13px]">
        <CheckSquare size={16} /> <span className="font-medium">{count}</span> {scopeLabel} selected
      </div>
      <div className="flex items-center gap-2">
        <OutlineButton onClick={onCreateTask}>
          <ClipboardList size={16} className="mr-2" /> Create Task
        </OutlineButton>
        <PrimaryButton onClick={onReplace}>
          <ReplaceIcon size={16} className="mr-2" /> Replace Selected
        </PrimaryButton>
        <button
          className="ml-1 px-2 py-1 text-[12px] rounded-md border border-[var(--wr-borderLight)] hover:bg-[var(--wr-app)] cursor-pointer"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function HeaderCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (ck: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 cursor-pointer"
      checked={!!checked}
      onChange={(e) => onChange?.(e.target.checked)}
      aria-label="Select all"
    />
  );
}
function RowCheckbox({ checked, onChange }: { checked?: boolean; onChange?: (ck: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer"
      checked={!!checked}
      onChange={(e) => onChange?.(e.target.checked)}
      aria-label="Select row"
    />
  );
}

/* ───────────────────────── URL Tooltip (full URL) ───────────────────────── */
function UrlWithTooltip({ url, maxW = "max-w-[360px]" }: { url: string; maxW?: string }) {
  return (
    <div className={classNames("relative group flex items-center gap-1", maxW)}>
      <div className={classNames("truncate text-[13px] underline decoration-dotted")} title={url}>
        {url}
      </div>
      <span className="inline-flex items-center justify-center">
        <Info
          size={14}
          className="text-[#008CCD] cursor-pointer"
          aria-label="Show full URL"
        />
      </span>
      {/* Tooltip */}
      <div
        role="tooltip"
        className="invisible group-hover:visible absolute left-0 top-full mt-1 z-[50] px-2 py-1 rounded border bg-white text-[11px] shadow"
        style={{ borderColor: "var(--wr-borderLight)", maxWidth: "min(640px, 80vw)" }}
      >
        <code className="whitespace-pre-wrap break-words">{url}</code>
      </div>
    </div>
  );
}

/* ───────────────────────── KPI Cards (reference pattern) ───────────────────────── */
function SmartTrendTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: "var(--wr-borderLight)", color: "var(--wr-text)" }}
    >
      <div className="mb-1 font-medium" style={{ color: "var(--wr-muted)" }}>
        {new Date(String(label)).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
      </div>
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
              <span style={{ color: "var(--wr-muted)" }}>{p.name ?? "Value"}</span>
            </div>
            <div className="font-semibold">{`${Math.round(Number(p.value))}%`}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartDonutTooltip({
  active,
  payload,
  title,
}: {
  active?: boolean;
  payload?: any[];
  title?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const color = p.color;
  const name = p.name || p.payload?.name || "Value";
  const value = p.value;
  return (
    <div
      role="tooltip"
      className="rounded-md border bg-white p-2 text-xs shadow"
      style={{ borderColor: "var(--wr-borderLight)", color: "var(--wr-text)" }}
    >
      {title && (
        <div className="mb-1 font-medium" style={{ color: "var(--wr-muted)" }}>
          {title}
        </div>
      )}
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
          <span style={{ color: "var(--wr-muted)" }}>{name}</span>
        </div>
        <div className="font-semibold">{`${Math.round(value * 100)}%`}</div>
      </div>
    </div>
  );
}

function Donut({
  valuePct,
  color,
  title,
}: {
  valuePct: number; // 0..100
  color: string;
  title?: string;
}) {
  const v01 = Math.max(0, Math.min(100, valuePct)) / 100;
  const data = [
    { name: "Value", value: v01 },
    { name: "Remaining", value: 1 - v01 },
  ];
  return (
    <div className="h-20 w-20 cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.04]">
      <ResponsiveContainer>
        <PieChart>
          <RTooltip content={<SmartDonutTooltip title={title} />} />
          <Pie
            data={data}
            dataKey="value"
            innerRadius={28}
            outerRadius={36}
            startAngle={90}
            endAngle={-270}
            stroke="transparent"
            isAnimationActive
          >
            <Cell fill={color} />
            <Cell fill="#D9EEF8" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiDonutBarCard({
  kpi,
  valuePct,
  deltaPct,
  series,
  useSeverity = false,
}: {
  kpi: "PILS" | "AQS";
  valuePct: number;
  deltaPct: number;
  series: { date: string; value: number }[];
  useSeverity?: boolean;
}) {
  const ringColor = useSeverity
    ? valuePct >= 80
      ? "var(--wr-good)"
      : valuePct >= 60
      ? "var(--wr-warning)"
      : "var(--wr-critical)"
    : VALUE_BLUE;

  return (
    <div className="rounded-[8px] border bg-white overflow-hidden" style={{ borderColor: "var(--wr-borderLight)" }}>
      <div className="px-3 py-2 flex items-center gap-2">
        <Gauge size={16} className="text-[#008CCD]" />
        <div className="text-sm font-semibold">{kpi}</div>
      </div>
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Donut + value/delta */}
          <div className="flex items-center gap-3">
            <Donut valuePct={valuePct} color={ringColor} title={`${kpi} Snapshot`} />
            <div className="flex flex-col cursor-pointer">
              <output className="text-[22px] font-bold leading-none">{fmtPct(valuePct)}</output>
              <div
                className={classNames(
                  "mt-1 text-xs",
                  deltaPct > 0 ? "text-[var(--wr-good)]" : deltaPct < 0 ? "text-[var(--wr-critical)]" : "text-[var(--wr-muted)]"
                )}
              >
                {caret(deltaPct)} {Math.abs(deltaPct).toFixed(1)}%
                <span className="ml-1 text-[var(--wr-muted)]">vs prev</span>
              </div>
            </div>
          </div>

          {/* Right: narrow bar trend */}
          <div className="h-[76px] w-[46%] cursor-pointer" role="img" aria-label={`${kpi} recent trend`}>
            <ResponsiveContainer>
              <BarChart data={series} margin={{ top: 6, left: 0, right: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, 100]} />
                <RTooltip content={<SmartTrendTooltip />} />
                <Bar dataKey="value" name={kpi} fill={VALUE_BLUE} radius={[5, 5, 0, 0]} barSize={7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function merge2Series(
  a: { date: string; value: number }[],
  b: { date: string; value: number }[],
  aKey = "Inlinks",
  bKey = "Outlinks"
) {
  const n = Math.min(a.length, b.length);
  return Array.from({ length: n }, (_, i) => ({
    date: a[i].date,
    [aKey]: a[i].value,
    [bKey]: b[i].value,
  })) as Array<{ date: string; Inlinks: number; Outlinks: number }>;
}

function InOutCard({
  inlinksPct,
  outlinksPct,
  inDeltaPct,
  outDeltaPct,
  seriesIn,
  seriesOut,
}: {
  inlinksPct: number;
  outlinksPct: number;
  inDeltaPct: number;
  outDeltaPct: number;
  seriesIn: { date: string; value: number }[];
  seriesOut: { date: string; value: number }[];
}) {
  const inColor = VALUE_BLUE;
  const outColor = "var(--wr-good)";

  const total = Math.max(0.0001, inlinksPct + outlinksPct);
  const parts = [
    { name: "Inlinks", value: Math.max(0, inlinksPct / total), color: inColor },
    { name: "Outlinks", value: Math.max(0, outlinksPct / total), color: outColor },
  ];

  const data = useMemo(
    () => merge2Series(seriesIn, seriesOut, "Inlinks", "Outlinks"),
    [seriesIn, seriesOut]
  );

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const renderActiveSlice = (props: any) => <Sector {...props} innerRadius={28} outerRadius={40} />;

  return (
    <div className="rounded-[8px] border bg-white overflow-hidden" style={{ borderColor: "var(--wr-borderLight)" }}>
      <div className="px-3 py-2 flex items-center gap-2">
        <Link2 size={16} className="text-[#008CCD]" />
        <div className="text-sm font-semibold">Inlinks / Outlinks</div>
      </div>
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between gap-3">
          {/* Left: donut */}
          <div className="flex items-center gap-3">
            <div className="h-20 w-20 cursor-pointer">
              <ResponsiveContainer>
                <PieChart>
                  <RTooltip content={<SmartDonutTooltip title="Link Breakdown" />} />
                  <Pie
                    data={parts}
                    dataKey="value"
                    innerRadius={28}
                    outerRadius={36}
                    startAngle={90}
                    endAngle={-270}
                    stroke="transparent"
                    isAnimationActive
                    activeIndex={activeIndex}
                    activeShape={renderActiveSlice}
                    onMouseEnter={(_, idx) => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                  >
                    {parts.map((p, i) => (
                      <Cell key={i} fill={p.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center values */}
            <div className="flex flex-col cursor-pointer">
              <output className="text-[18px] font-bold leading-none">
                {fmtPct(inlinksPct)} <span className="text-[var(--wr-muted)]">/</span> {fmtPct(outlinksPct)}
              </output>
              <div className="mt-1 text-xs">
                <span className={classNames(inDeltaPct >= 0 ? "text-[var(--wr-good)]" : "text-[var(--wr-critical)]")}>
                  {caret(inDeltaPct)} {Math.abs(inDeltaPct).toFixed(1)}%
                </span>
                <span className="mx-1 text-[var(--wr-muted)]">/</span>
                <span className={classNames(outDeltaPct >= 0 ? "text-[var(--wr-good)]" : "text-[var(--wr-critical)]")}>
                  {caret(outDeltaPct)} {Math.abs(outDeltaPct).toFixed(1)}%
                </span>
                <span className="ml-1 text-[var(--wr-muted)]">vs prev</span>
              </div>
            </div>
          </div>

          {/* Right: dual-area trend */}
          <div className="h-[76px] w-[56%] cursor-pointer" role="img" aria-label="Inlinks vs Outlinks trend">
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={inColor} stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#D9EEF8" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="grad-out" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={outColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={outColor} stopOpacity={0.12} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--wr-borderLight)" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <RTooltip content={<SmartTrendTooltip />} />
                <Area type="monotone" dataKey="Inlinks" stroke={inColor} fill="url(#grad-in)" strokeWidth={2} dot={false} name="Inlinks" isAnimationActive={false} />
                <Area type="monotone" dataKey="Outlinks" stroke={outColor} fill="url(#grad-out)" strokeWidth={2} dot={false} name="Outlinks" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Self-tests ───────────────────────── */
function runSelfTests() {
  try {
    console.group("RightInspectorDrawer self-tests");
    console.assert(classNames("a", false && "b", "c") === "a c", "classNames join");
    console.assert(stripTags("<b>hi</b>") === "hi", "stripTags");
    console.assert(statusColor("ok") === "var(--wr-good)", "statusColor ok");
    console.groupEnd();
  } catch (e) {
    console.error("Self-tests failed", e);
  }
}
