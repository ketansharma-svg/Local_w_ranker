import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Copy,
  Link2,
  Workflow,
  Eye,
  FileText,
  ListTree,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** -----------------------------------------------------------------------
 * Wranker — Redirects Tab (Tab 5)
 * Section 3: Redirect Chain Visualizer (Drawer) — React Demo
 *
 * - Right-side drawer (responsive, up to main panel width)
 * - SVG horizontal flow graph (source → hops → final)
 * - Controls: zoom -, fit, zoom +, show headers, export (mock), copy chain,
 *             replace link (mock)
 * - A11y: role="dialog", aria-modal, focusable nodes/edges
 * ---------------------------------------------------------------------- */

/** Utility */
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Tokens (map exactly from spec) */
const TOKENS = {
  brand: "#008CCD",
  coreBlue: "#4286F5",
  success: "#34A853",
  warning: "#F9BB04",
  critical: "#E94134",
  text: "#111827",
  muted: "#6B7280",
  radius: 6,
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
};

/** Mock API response (one chain) */
const mockChain = {
  chainId: "chain-123",
  sourceUrl: "https://example.com/blog/tools",
  nodes: [
    { url: "https://example.com/blog/tools", type: "source", status: 200, last: "2025-08-20T10:00:00Z" },
    { url: "http://old.example.com/a", type: "301", status: 301, last: "2025-08-20T10:00:01Z" },
    { url: "https://redirector.net/x", type: "302", status: 302, last: "2025-08-20T10:00:02Z" },
    { url: "https://example.com/resources", type: "final", status: 200, last: "2025-08-20T10:00:03Z" },
  ],
  chainDepth: 3,
  affectedPagesCount: 5,
  linkType: "external",
  healthScore: 43,
  lastChecked: "2025-08-20T10:00:03Z",
  loopDetected: false,
};

/** Edge color by redirect type */
function edgeColor(t: string | number) {
  if (t === "301" || t === 301) return TOKENS.success;
  if (t === "302" || t === 302 || t === "307" || t === 307) return TOKENS.warning;
  if (t === "js" || t === "meta") return "#FB923C";
  return TOKENS.coreBlue;
}

/** Node style by node kind */
function nodeStyle(kind: string) {
  if (kind === "source") return { fill: TOKENS.coreBlue, fg: "#fff", stroke: TOKENS.coreBlue };
  if (kind === "final") return { fill: TOKENS.success, fg: "#fff", stroke: TOKENS.success };
  if (kind === "error" || kind === "loop") return { fill: TOKENS.critical, fg: "#fff", stroke: TOKENS.critical };
  // intermediate hop
  return { fill: "#FFFFFF", fg: TOKENS.text, stroke: TOKENS.borderLight };
}

/** Badge color map */
const badgeColors = {
  good: TOKENS.success,
  warn: TOKENS.warning,
  crit: TOKENS.critical,
  info: TOKENS.coreBlue,
};

/** Pill */
function Pill({ color = TOKENS.coreBlue, children, title }: React.PropsWithChildren<{ color?: string; title?: string }>) {
  return (
    <span
      title={title}
      style={{
        background: TOKENS.chipBg,
        border: `1px solid ${TOKENS.borderLight}`,
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: TOKENS.text,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {children}
    </span>
  );
}

/** Node card rendered inside SVG as foreignObject (for crisp text) */
function SvgNode({
  x,
  y,
  width,
  height,
  url,
  type,
  status,
  last,
  tabIndex,
  onFocus,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  type: string;
  status: number;
  last: string;
  tabIndex?: number;
  onFocus?: () => void;
}) {
  const style = nodeStyle(type);
  const short = useMemo(() => {
    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname.length > 22 ? u.pathname.slice(0, 22) + "…" : u.pathname}`;
    } catch {
      return url.length > 26 ? url.slice(0, 26) + "…" : url;
    }
  }, [url]);

  return (
    <g>
      <rect x={x} y={y} rx={TOKENS.radius} ry={TOKENS.radius} width={width} height={height} fill={style.fill} stroke={style.stroke} />
      {/* Title */}
      <foreignObject x={x} y={y} width={width} height={height} pointerEvents="none">
        <div style={{ display: "flex", height: "100%", width: "100%", padding: 10, alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: style.fg }}>{short}</div>
            <div style={{ fontSize: 11, marginTop: 4, color: type === "source" || type === "final" ? style.fg : TOKENS.muted }}>
              {type === "source" ? "Source" : type === "final" ? "Final" : `${status} → ${type}`}
            </div>
          </div>
        </div>
      </foreignObject>
      {/* Hit area for a11y focus */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={TOKENS.radius}
        ry={TOKENS.radius}
        fill="transparent"
        tabIndex={tabIndex}
        aria-label={`${type === "source" ? "Source" : type === "final" ? "Final" : `Hop ${type}`} node ${url}`}
        onFocus={onFocus}
        style={{ outline: "none" }}
      />
    </g>
  );
}

/** Edge with arrow */
function SvgEdge({ x1, y1, x2, y2, label }: { x1: number; y1: number; x2: number; y2: number; label: string }) {
  const color = edgeColor(label);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <defs>
        <marker id={`arrow-${label}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} markerEnd={`url(#arrow-${label})`} />
      <rect x={midX - 24} y={midY - 10} width={48} height={20} rx={10} ry={10} fill="#ffffff" stroke={TOKENS.borderLight} />
      <text x={midX} y={midY + 4} fontSize={11} textAnchor="middle" fill={TOKENS.text}>
        {label}
      </text>
    </g>
  );
}

/** Drawer Component */
function ChainDrawer({ open, onClose, data }: { open: boolean; onClose: () => void; data: typeof mockChain }) {
  const [zoom, setZoom] = useState(1);
  const [showHeaders, setShowHeaders] = useState(false);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!open) setZoom(1);
  }, [open]);

  // Layout positions
  const NODE_W = 220,
    NODE_H = 66,
    GAP_X = 120,
    PADDING = 32;
  const positions = useMemo(
    () => data.nodes.map((_, i) => ({ x: PADDING + i * (NODE_W + GAP_X), y: 60 })),
    [data.nodes]
  );
  const width = PADDING * 2 + (data.nodes.length - 1) * (NODE_W + GAP_X) + NODE_W;
  const height = 220;

  const chainTypes = data.nodes
    .map((n) => (n.type === "source" || n.type === "final" ? null : String(n.type)))
    .filter(Boolean) as string[];

  const chainBreadcrumb = chainTypes.join(" → ");

  function handleExportSVG() {
    try {
      const svg = svgRef.current!;
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `redirect-chain-${data.chainId}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("SVG export not supported in this preview.");
    }
  }

  function handleCopyChain() {
    const text = data.nodes
      .map((n) => `${n.url} ${n.type === "source" ? "(source)" : n.type === "final" ? "(final)" : `(${n.type})`}`)
      .join("\n→ ");
    navigator.clipboard?.writeText(text);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30"
            aria-hidden
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Redirect Chain Viewer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: prefersReduced ? "tween" : "spring",
              stiffness: 320,
              damping: 30,
              mass: 0.6,
            }}
            className={cn(
              "fixed right-0 top-0 h-screen bg-white shadow-xl border-l",
              // Tailwind fallback width (if CSS var unused):
              "w-[min(1280px,calc(100vw-32px))] sm:w-[min(1280px,calc(100vw-40px))] md:w-[min(1280px,calc(100vw-48px))]"
            )}
            // Width is capped to main panel size via CSS var; adjust globally if your main panel differs.
            style={{
              // If --wr-main-panel-max is provided on :root (e.g., 1280px or your panel width),
              // the drawer will not exceed it. Otherwise it defaults to 1280px.
              width: "min(var(--wr-main-panel-max, 1280px), calc(100vw - 32px))",
              borderColor: TOKENS.borderLight,
              fontFamily:
                "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
            }}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 p-4"
              style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Workflow size={18} color={TOKENS.coreBlue} />
                  <h2 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
                    Redirect Chain Viewer
                  </h2>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Pill color={TOKENS.coreBlue} title="Chain types breadcrumb">
                    {chainBreadcrumb || "Direct"}
                  </Pill>
                  <Pill color={TOKENS.coreBlue} title="Total hops">
                    {data.chainDepth} hop{data.chainDepth !== 1 ? "s" : ""}
                  </Pill>
                  <Pill color={TOKENS.coreBlue} title="Link type">
                    {data.linkType}
                  </Pill>
                  <Pill color={badgeColors.warn} title="Health score lower is riskier">
                    Health {data.healthScore}
                  </Pill>
                  {data.loopDetected && (
                    <Pill color={badgeColors.crit} title="Redirect loop detected">
                      Loop detected
                    </Pill>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close Redirect Chain Viewer"
                className="rounded-md p-2 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Controls bar */}
            <div
              className="flex items-center justify-between gap-2 px-4 py-2"
              style={{ borderBottom: `1px solid ${TOKENS.borderLight}` }}
            >
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md px-2 py-1 hover:bg-gray-100"
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  className="rounded-md px-2 py-1 hover:bg-gray-100"
                  aria-label="Fit to width"
                  onClick={() => setZoom(1)}
                >
                  <Maximize size={16} />
                </button>
                <button
                  className="rounded-md px-2 py-1 hover:bg-gray-100"
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                >
                  <ZoomIn size={16} />
                </button>
                <div className="mx-1 h-5 w-px bg-gray-200" />
                <label className="inline-flex items-center gap-2 text-sm" style={{ color: TOKENS.text }}>
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={showHeaders}
                    onChange={(e) => setShowHeaders(e.target.checked)}
                  />
                  Show HTTP headers
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md px-2 py-1 hover:bg-gray-100"
                  aria-label="Copy chain"
                  onClick={handleCopyChain}
                >
                  <Copy size={16} />
                </button>
                <button
                  className="rounded-md px-2 py-1 hover:bg-gray-100"
                  aria-label="Export SVG"
                  onClick={handleExportSVG}
                >
                  <Download size={16} />
                </button>
                <button
                  className="rounded-md px-2 py-1 text-white"
                  style={{ background: TOKENS.brand }}
                  onClick={() => alert("Replace Link Drawer would open (prefilled source → final).")}
                  aria-label="Replace source link with final"
                >
                  Replace with Final
                </button>
              </div>
            </div>

            {/* Graph area */}
            <div className="relative overflow-auto" style={{ height: "calc(100vh - 170px)" }}>
              <div className="min-w-full">
                <svg
                  ref={svgRef}
                  width={width * zoom}
                  height={height * zoom + (showHeaders ? 120 : 0)}
                  viewBox={`0 0 ${width} ${height + (showHeaders ? 120 : 0)}`}
                  style={{ display: "block", background: "#fff" }}
                >
                  {/* Edges */}
                  {data.nodes.map((n, i) => {
                    if (i === 0) return null;
                    const prev = data.nodes[i - 1];
                    const from = positions[i - 1];
                    const to = positions[i];
                    const x1 = from.x + NODE_W;
                    const y1 = from.y + NODE_H / 2;
                    const x2 = to.x;
                    const y2 = to.y + NODE_H / 2;
                    const label = n.type === "final" ? String(prev.type) : String(n.type);
                    return <SvgEdge key={`e-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} label={label} />;
                  })}

                  {/* Nodes */}
                  {data.nodes.map((n, i) => (
                    <SvgNode
                      key={`n-${i}`}
                      x={positions[i].x}
                      y={positions[i].y}
                      width={220}
                      height={66}
                      url={n.url}
                      type={n.type}
                      status={n.status}
                      last={n.last}
                      tabIndex={0}
                      onFocus={() => {}}
                    />
                  ))}

                  {/* Optional headers panel under nodes */}
                  {showHeaders && (
                    <g>
                      {data.nodes.map((n, i) => (
                        <g key={`hdr-${i}`}>
                          <rect
                            x={positions[i].x}
                            y={positions[i].y + 66 + 16}
                            width={220}
                            height={80}
                            rx={8}
                            ry={8}
                            fill={TOKENS.chipBg}
                            stroke={TOKENS.borderLight}
                          />
                          <foreignObject x={positions[i].x} y={positions[i].y + 66 + 16} width={220} height={80}>
                            <div style={{ padding: 8, fontSize: 11, color: TOKENS.muted }}>
                              <div>
                                <b>Status:</b> {n.status}
                              </div>
                              <div>
                                <b>Last-Checked:</b> {new Date(n.last).toLocaleString()}
                              </div>
                              <div>
                                <b>Headers:</b> Location, Cache-Control, Server…
                              </div>
                            </div>
                          </foreignObject>
                        </g>
                      ))}
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Sidebar summary (collapsible mimic) */}
            <div className="px-4 py-3" style={{ borderTop: `1px solid ${TOKENS.borderLight}` }}>
              <div className="text-sm" style={{ color: TOKENS.muted }}>
                Summary
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <ListTree size={14} color={TOKENS.coreBlue} /> Hops: <b className="ml-1">{data.chainDepth}</b>
                </div>
                <div className="flex items-center gap-2">
                  <Link2 size={14} color={TOKENS.coreBlue} /> Link type:{" "}
                  <b className="ml-1 capitalize">{data.linkType}</b>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={14} color={TOKENS.coreBlue} /> Affected pages:{" "}
                  <b className="ml-1">{data.affectedPagesCount}</b>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={14} color={TOKENS.coreBlue} /> Checked:{" "}
                  <b className="ml-1">{new Date(data.lastChecked).toLocaleString()}</b>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md px-3 py-1.5 text-white"
                  style={{ background: TOKENS.brand }}
                  onClick={() => alert("Would open Replace Link Drawer (prefilled)")}
                >
                  Replace source with final
                </button>
                <button
                  className="rounded-md px-3 py-1.5 border hover:bg-gray-50"
                  style={{ borderColor: TOKENS.borderLight }}
                  onClick={() => alert("Would open Task Creation Drawer")}
                >
                  Create Fix Task
                </button>
                <button
                  className="rounded-md px-3 py-1.5 border hover:bg-gray-50"
                  style={{ borderColor: TOKENS.borderLight }}
                  onClick={() => alert("Scroll to Redirect Table with chain filter applied")}
                >
                  View in Table
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Demo shell — includes a trigger and renders the drawer */
export default function RedirectChainVisualizerDemo() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(mockChain);

  return (
    <div
      className="p-6"
      style={{
        fontFamily:
          "Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial",
      }}
    >
      <h1 className="text-xl font-semibold mb-2" style={{ color: TOKENS.text }}>
        Redirects — Chain Visualizer (Demo)
      </h1>
      <p className="text-sm mb-4" style={{ color: TOKENS.muted }}>
        Section 3 demo with interactive drawer, SVG graph, zoom, headers toggle, export (SVG), copy chain, and action
        CTAs.
      </p>

      <div className="flex items-center gap-3">
        <button
          className="rounded-md px-3 py-2 text-white"
          style={{ background: TOKENS.brand }}
          onClick={() => setOpen(true)}
        >
          Open Chain Visualizer
        </button>
        <button
          className="rounded-md px-3 py-2 border hover:bg-gray-50"
          style={{ borderColor: TOKENS.borderLight }}
          onClick={() => setData((d) => ({ ...d, loopDetected: !d.loopDetected }))}
        >
          Toggle Loop Badge
        </button>
      </div>

      <ChainDrawer open={open} onClose={() => setOpen(false)} data={data} />
    </div>
  );
}
