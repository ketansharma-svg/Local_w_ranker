import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Download,
  ChevronDown,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import ForceGraph2D from "react-force-graph-2d";
import { jsPDF } from "jspdf";
import { Drawer } from "antd";



 // --------------------- Build "raw" graph from passed instances ---------------------
 type InstanceRec = {
   source_page: string;
   snippet?: string;
   target_url: string;
   rel_type?: "dofollow" | "nofollow";
   last_found?: string;
 };

 const getHost = (u?: string) => {
   try { return new URL(u as string).hostname; } catch { return ""; }
 };

 function buildRawFromInstances(
   instances: InstanceRec[] = [],
   anchorText: string,
   edgeAqs?: number
 ) {
   const srcMap = new Map<string, { id: string; url: string; count: number; lastUsed?: string }>();
   const tgtMap = new Map<string, { id: string; url: string; aqs?: number; status?: "healthy" | "broken"; rel?: string }>();
   const edgeMap = new Map<string, { source: string; target: string; count: number; aqs?: number; rel?: string; linkType: "internal" | "external" }>();

   const aqsVal = typeof edgeAqs === "number" ? edgeAqs : 0;

   for (const inst of instances) {
     if (!inst?.source_page || !inst?.target_url) continue;

     // source node
     if (!srcMap.has(inst.source_page)) {
       srcMap.set(inst.source_page, {
         id: `s:${inst.source_page}`,
         url: inst.source_page,
         count: 0,
         lastUsed: inst.last_found,
       });
     }
     const s = srcMap.get(inst.source_page)!;
     s.count += 1;
     if (!s.lastUsed || (inst.last_found && new Date(inst.last_found) > new Date(s.lastUsed))) {
       s.lastUsed = inst.last_found;
     }

     // target node
     if (!tgtMap.has(inst.target_url)) {
       tgtMap.set(inst.target_url, {
         id: `t:${inst.target_url}`,
         url: inst.target_url,
         aqs: aqsVal,
         status: aqsVal < 40 ? "broken" : "healthy",
         rel: inst.rel_type || "dofollow",
       });
     }

     // edge
     const key = `${inst.source_page}→${inst.target_url}`;
     const linkType: "internal" | "external" =
       getHost(inst.source_page) && getHost(inst.target_url) && getHost(inst.source_page) !== getHost(inst.target_url)
         ? "external"
         : "internal";
     if (!edgeMap.has(key)) {
       edgeMap.set(key, {
         source: `s:${inst.source_page}`,
         target: `t:${inst.target_url}`,
         count: 1,
         aqs: aqsVal,
         rel: inst.rel_type || "dofollow",
         linkType,
       });
     } else {
       const e = edgeMap.get(key)!;
       e.count += 1;
       if (inst.rel_type === "nofollow") e.rel = "nofollow"; // any nofollow wins
     }
   }

   return {
     anchorText,
     sources: Array.from(srcMap.values()),
     targets: Array.from(tgtMap.values()),
     edges: Array.from(edgeMap.values()),
   };
 }


// --------------------- Helpers ---------------------
const fmt = (n) => (typeof n === "number" ? new Intl.NumberFormat().format(n) : n);
const clip = (s, n = 28) => (s?.length > n ? s.slice(0, n - 1) + "…" : s ?? "");
const ts = () => new Date().toISOString().replace(/[:.]/g, "-");

function buildGraph(raw, filters) {
  if (!raw) return { nodes: [], links: [] };
  const { linkType, rel, aqsMin, aqsMax } = filters;

  const links = raw.edges.filter((e) => {
    const typeOk = linkType === "all" || e.linkType === linkType;
    const relOk = rel === "all" || e.rel === rel;
    const aqsOk = (e.aqs ?? 0) >= aqsMin && (e.aqs ?? 100) <= aqsMax;
    return typeOk && relOk && aqsOk;
  });

  const srcIds = new Set(links.map((l) => l.source));
  const tgtIds = new Set(links.map((l) => l.target));
  const sources = raw.sources.filter((s) => srcIds.has(s.id));
  const targets = raw.targets.filter((t) => tgtIds.has(t.id));

  const srcNodes = sources.map((s) => ({
    id: s.id,
    url: s.url,
    type: "source",
    count: s.count,
    lastUsed: s.lastUsed,
    size: 9 + Math.min(10, s.count * 1.0),
  }));
  const tgtNodes = targets.map((t) => ({
    id: t.id,
    url: t.url,
    type: "target",
    aqs: t.aqs,
    status: t.status,
    rel: t.rel,
    size: 9 + Math.min(10, (t.aqs ?? 40) / 14),
  }));

  const nodes = [...srcNodes, ...tgtNodes];
  const links2 = links.map((e) => ({
    source: e.source,
    target: e.target,
    count: e.count,
    aqs: e.aqs,
    rel: e.rel,
    linkType: e.linkType,
    width: 0.75 + Math.min(3, e.count * 0.35),
  }));

  return { nodes, links: links2 };
}

function buildNodeLabel(n) {
  const header = `${n.type === "source" ? "Source" : "Target"}: ${n.url}`;
  const lines = [header, `Links: ${n.count ?? "—"}`];
  if (n.aqs != null) lines.push(`AQS: ${n.aqs}`);
  return lines.join("\n");
}

function layoutBipartite(graph, filters) {
  const g = { nodes: graph.nodes.map((n) => ({ ...n })), links: graph.links.map((l) => ({ ...l })) };

  const targetCounts = g.links.reduce((acc, l) => {
    acc[l.target] = (acc[l.target] || 0) + (l.count || 0);
    return acc;
  }, {});

  const left = g.nodes.filter((n) => n.type === "source");
  const right = g.nodes.filter((n) => n.type === "target");

  const sortBy = filters.sortBy || "frequency";
 const byDate = (a: { lastUsed?: string | number }, b: { lastUsed?: string | number }) =>
  (new Date(b.lastUsed || 0)).getTime() - (new Date(a.lastUsed || 0)).getTime();


  if (sortBy === "frequency") {
    left.sort((a, b) => (b.count || 0) - (a.count || 0));
    right.sort((a, b) => (targetCounts[b.id] || 0) - (targetCounts[a.id] || 0));
  } else if (sortBy === "aqs") {
    left.sort((a, b) => (b.count || 0) - (a.count || 0));
    right.sort((a, b) => (b.aqs || 0) - (a.aqs || 0));
  } else if (sortBy === "lastUsed") {
    left.sort(byDate);
  }

  const gap = 64;
  const leftX = -200;
  const rightX = 200;

  const placeColumn = (arr, x) => {
    const startY = -((arr.length - 1) * gap) / 2;
    arr.forEach((n, i) => {
      n.fx = x;
      n.fy = startY + i * gap;
      n.x = n.fx;
      n.y = n.fy;
    });
  };

  placeColumn(left, leftX);
  placeColumn(right, rightX);

  const all = [...left, ...right];
  const nodeById = new Map(all.map((n) => [n.id, n]));
  g.nodes = all;
  g.links = g.links.map((l) => ({
    ...l,
    source: nodeById.get(l.source)?.id || l.source,
    target: nodeById.get(l.target)?.id || l.target,
  }));

  return g;
}

// --------------------- Exporters ---------------------
function exportPNG(canvas, meta) {
  const url = canvas.toDataURL("image/png", 1.0);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anchor-usage-map_${meta.anchor}_${ts()}.png`;
  a.click();
}

async function exportPDF(canvas, meta) {
  const img = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height / canvas.width) * imgW;
  const y = (pageH - imgH) / 2;
  pdf.addImage(img, "PNG", margin, y, imgW, imgH);
  pdf.setFontSize(10);
  pdf.text(
    `Anchor: "${meta.anchor}"  •  Project: ${meta.projectId ?? "demo"}  •  Generated: ${new Date().toLocaleString()}`,
    margin,
    pageH - 16
  );
  pdf.save(`anchor-usage-map_${meta.anchor}_${ts()}.pdf`);
}

function exportSVG(canvas, meta) {
  const pngUrl = canvas.toDataURL("image/png", 1.0);
  const w = canvas.width,
    h = canvas.height;
  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<desc>Anchor: ${meta.anchor}; Project: ${meta.projectId ?? "demo"}; Created: ${new Date().toISOString()}</desc>` +
    `<image href="${pngUrl}" x="0" y="0" width="${w}" height="${h}"/>` +
    `</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anchor-usage-map_${meta.anchor}_${ts()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// --------------------- Runtime Tests ---------------------
function runLayoutTests(graph) {
  const leftX = -200,
    rightX = 200,
    epsilon = 0.001;
  const sources = graph.nodes.filter((n) => n.type === "source");
  const targets = graph.nodes.filter((n) => n.type === "target");
  const srcOk = sources.every((n) => Math.abs((n.fx ?? n.x) - leftX) < epsilon);
  const tgtOk = targets.every((n) => Math.abs((n.fx ?? n.x) - rightX) < epsilon);
  const posPinned = [...sources, ...targets].every((n) => typeof n.x === "number" && typeof n.y === "number");
  // eslint-disable-next-line no-console
  console.table([
    { name: "sources_pinned_left", pass: srcOk },
    { name: "targets_pinned_right", pass: tgtOk },
    { name: "positions_set_xy", pass: posPinned },
  ]);
}

function runDataTests(raw) {
const results: { name: string; pass: boolean }[] = [];
results.push({ name: "test", pass: true });
  results.push({
    name: "mock_non_empty",
    pass: !!raw && raw.sources.length > 0 && raw.targets.length > 0 && raw.edges.length > 0,
  });
  const gAll = buildGraph(raw, { linkType: "all", rel: "all", aqsMin: 0, aqsMax: 100 });
  const gAQS = buildGraph(raw, { linkType: "all", rel: "all", aqsMin: 60, aqsMax: 100 });
  results.push({ name: "filter_by_aqs_subsets", pass: gAQS.links.length <= gAll.links.length });

  const sampleSrc = { type: "source", url: "/x", count: 2 };
  const sampleTgt = { type: "target", url: "/y", count: 1, aqs: 70 };
  const lbl1 = buildNodeLabel(sampleSrc);
  const lbl2 = buildNodeLabel(sampleTgt);
  results.push({ name: "label_src_is_string", pass: typeof lbl1 === "string" && lbl1.includes("Links:") });
  results.push({ name: "label_tgt_has_aqs", pass: typeof lbl2 === "string" && lbl2.includes("AQS: 70") });

  const sampleQuote = { type: "source", url: '/path/with"quote', count: 0 };
  const sampleLong = { type: "target", url: "/".padEnd(120, "a"), count: 3, aqs: 55 };
  const lbl3 = buildNodeLabel(sampleQuote);
  const lbl4 = buildNodeLabel(sampleLong);
  results.push({ name: "label_handles_quotes", pass: typeof lbl3 === "string" && lbl3.includes("Source:") });
  results.push({ name: "label_handles_long", pass: typeof lbl4 === "string" && lbl4.length > 20 });

  // eslint-disable-next-line no-console
  console.table(results);
}

// --------------------- Filter Chip Primitives (modular) ---------------------
function FilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[16px] border px-3 h-8 text-sm ${
        active ? "border-[#0077FF] bg-[#D9EEF8]" : "border-[#EFF0F6] bg-[#F5F7FA] hover:bg-[#E5E7EB]"
      }`}
    >
      {children}
    </button>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#6B7280]">{label}</span>
      {options.map((o) => (
        <FilterChip key={String(o.key)} active={o.key === value} onClick={() => onChange(o.key)}>
          {o.label}
        </FilterChip>
      ))}
    </div>
  );
}

// --------------------- Drawer Component ---------------------
 function UsageGraphDrawer({
   open,
   onClose,
   projectId = "demo",
   anchorId = "a-123",
   anchor,
   instances = [],
 }: {
   open: boolean;
   onClose: () => void;
   projectId?: string;
   anchorId?: string;
   anchor?: { id: string; text: string; aqs?: number };
   instances?: InstanceRec[];
 }) {
  const fgRef = useRef<any>(null);
  const graphWrapRef = useRef<HTMLDivElement>(null); // used for fit-to-screen padding calc

  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<any>(null);
  const [filters, setFilters] = useState({
    linkType: "all",
    rel: "all",
    aqsMin: 0,
    aqsMax: 100,
    showLabels: true,
    sortBy: "frequency",
  });
  const [hoverNode, setHoverNode] = useState<any>(null);

 useEffect(() => {
   if (!open) return;
   setLoading(true);
   const built = buildRawFromInstances(
     instances,
     anchor?.text || anchorId || "",
     typeof anchor?.aqs === "number" ? anchor.aqs : undefined
   );
   setRaw(built);
   setLoading(false);
   setTimeout(() => fgRef.current?.zoomToFit(400, 120), 0);
   runDataTests(built);
 }, [open, instances, anchor?.text, anchor?.aqs, anchorId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filteredGraph = useMemo(() => buildGraph(raw, filters), [raw, filters]);
  const graph = useMemo(() => layoutBipartite(filteredGraph, filters), [filteredGraph, filters]);

  useEffect(() => {
    if (graph.nodes?.length) {
      runLayoutTests(graph);
      fgRef.current?.zoomToFit(400, 120);
    }
  }, [graph]);

  const stats = useMemo(() => {
    if (!raw) return null;
    const totalSources = graph.nodes.filter((n) => n.type === "source").length;
    const totalTargets = graph.nodes.filter((n) => n.type === "target").length;
    const avgAqs = Math.round(
      graph.links.reduce((s, l) => s + (l.aqs ?? 0), 0) / Math.max(1, graph.links.length)
    );
    const diversity = graph.links.length
      ? new Set(graph.links.map((l) => `${l.source}-${l.target}`)).size / graph.links.length
      : 0;
    return { totalSources, totalTargets, avgAqs, diversity };
  }, [graph, raw]);

 const anchorText = raw?.anchorText ?? (anchor?.text ?? "");

  const linkColor = (link) => {
    const tgt = graph.nodes.find((n) => n.id === link.target);
    if (tgt?.status === "broken") return "#EF4444";
    if ((link.aqs ?? 0) < 50) return "#F59E0B";
    return "#4286F5";
  };

  const handleExport = (fmtType: "png" | "pdf" | "svg") => {
    const canvas = fgRef.current?.canvas();
    if (!canvas) return;
    const meta = { anchor: anchorText || anchorId, projectId };
    if (fmtType === "png") exportPNG(canvas, meta);
    if (fmtType === "pdf") exportPDF(canvas, meta);
    if (fmtType === "svg") exportSVG(canvas, meta);
  };

  const drawNode = (node, ctx, globalScale) => {
    const label = clip(node.url?.replace(/^https?:\/\//, ""));
    const size = node.size || 10;

    if (hoverNode && hoverNode.id === node.id) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 14;
    }

    if (node.type === "source") {
      ctx.fillStyle = "#0077FF";
      const w = size * 1.6,
        h = size * 0.9;
      ctx.beginPath();
      ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, 3);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.75;
      ctx.stroke();
    } else {
      ctx.fillStyle = node.status === "broken" ? "#EF4444" : "#10B981";
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 0.5, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }

    if (hoverNode && hoverNode.id === node.id) ctx.restore();

    if (filters.showLabels) {
      const fontSize = Math.max(10, 12 / globalScale);
      ctx.font = `${fontSize}px Inter, "Inter Fallback", system-ui, -apple-system, Segoe UI, Roboto`;
      ctx.fillStyle = "#111827";
      ctx.textBaseline = "middle";
      if (node.type === "source") {
        ctx.textAlign = "left";
        ctx.fillText(label, node.x + size * 1.1, node.y);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(label, node.x - size * 1.1, node.y);
      }
    }
  };

  const drawNodePointerArea = (node, color, ctx) => {
    ctx.fillStyle = color;
    const size = node.size || 10;
    if (node.type === "source") {
      const w = size * 1.6,
        h = size * 0.9;
      ctx.beginPath();
      ctx.rect(node.x - w / 2, node.y - h / 2, w, h);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 0.5, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  };

  if (!open) return null;

  const zoomIn = () => {
    const k = fgRef.current?.zoom();
    fgRef.current?.zoom(k * 1.2, 200);
  };
  const zoomOut = () => {
    const k = fgRef.current?.zoom();
    fgRef.current?.zoom(k / 1.2, 200);
  };
  // Updated: ensures the whole chart (incl. labels) is visible within the drawer
  const zoomFit = () => {
    const w = graphWrapRef.current?.offsetWidth || window.innerWidth || 800;
    // use ~10% of available width as padding (bounded) to account for labels on both sides
    const pad = Math.max(24, Math.min(240, Math.floor(w * 0.1)));
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, pad);
      // run a second pass on next frame to ensure final fit after animation settles
      requestAnimationFrame(() => fgRef.current?.zoomToFit(0, pad));
    }
  };

  const empty = !loading && graph.links.length === 0;

  return (
   <Drawer
     open={open}
     onClose={onClose}
     placement="right"
     width={880}
     destroyOnClose
     maskClosable
     keyboard
     closable={false}
     styles={{ body: { padding: 0 } }}
     rootClassName="wr-usage-graph-drawer"
   >
    <div
className="flex h-full flex-col"

      style={{ fontFamily: 'Inter, "Inter Fallback", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg[rgba(0,0,0,0.55)]" onClick={onClose} />

      {/* Drawer (right) */}
      <aside
        className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col z-[1000]"
        aria-label="Usage graph drawer"
      >
        {/* Header (wraps within drawer width) */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EFF0F6] px-5 py-3">
          <div className="min-w-0">
            {/* Title size corrected to 18px */}
            <h2 id="usage-map-title" className="text-[18px] font-semibold text-[#111827] truncate">
              Anchor Usage Map: “{anchorText || anchorId}”
            </h2>
            <p className="text-sm text-[#6B7280] -mt-0.5">
              Visualizing source → target relationships for this anchor
            </p>

            {/* KPI chips moved into header; values in #0077FF */}
            {stats && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-[#F5F7FA] px-3 py-1 text-sm text-[#111827] border border-[#EFF0F6]">
                  Sources: <span className="font-semibold ml-1 text-[#0077FF]">{fmt(stats.totalSources)}</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-[#F5F7FA] px-3 py-1 text-sm text-[#111827] border border-[#EFF0F6]">
                  Targets: <span className="font-semibold ml-1 text-[#0077FF]">{fmt(stats.totalTargets)}</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-[#F5F7FA] px-3 py-1 text-sm text-[#111827] border border-[#EFF0F6]">
                  Avg. AQS: <span className="font-semibold ml-1 text-[#0077FF]">{fmt(stats.avgAqs)}</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-[#F5F7FA] px-3 py-1 text-sm text-[#111827] border border-[#EFF0F6]">
                  Div. Score:{" "}
                  <span className="font-semibold ml-1 text-[#0077FF]">{(stats.diversity * 100).toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="inline-flex items-center gap-1 rounded-[6px] border border-[#EFF0F6] px-3 h-9 text-sm hover:bg-[#F5F7FA]">
                <Download size={16} /> Export Graph <ChevronDown size={14} />
              </button>
              {/* Keep dropdown above content; chips are no longer overlay */}
              <div className="absolute right-0 mt-1 hidden min-w-[160px] flex-col rounded-[6px] border border-[#EFF0F6] bg-white p-1 shadow-md group-hover:flex z-[1002]">
                <button className="px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]" onClick={() => handleExport("png")}>
                  PNG
                </button>
                <button className="px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]" onClick={() => handleExport("svg")}>
                  SVG
                </button>
                <button className="px-3 py-2 text-left text-sm hover:bg-[#F5F7FA]" onClick={() => handleExport("pdf")}>
                  PDF
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#EFF0F6] hover:bg-[#F5F7FA]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* FILTERS TOOLBAR (modular ChipGroup, consistent design) */}
        <div className="border-b border-[#EFF0F6] bg-white px-5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <ChipGroup
              label="Link Type"
              value={filters.linkType}
              onChange={(v) => setFilters((f) => ({ ...f, linkType: v }))}
              options={[
                { key: "all", label: "All" },
                { key: "internal", label: "Internal" },
                { key: "external", label: "External" },
              ]}
            />
            <ChipGroup
              label="Rel"
              value={filters.rel}
              onChange={(v) => setFilters((f) => ({ ...f, rel: v }))}
              options={[
                { key: "all", label: "All" },
                { key: "dofollow", label: "Dofollow" },
                { key: "nofollow", label: "Nofollow" },
              ]}
            />
            {/* AQS Range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">AQS</span>
              <input
                type="range"
                min={0}
                max={100}
                value={filters.aqsMin}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, aqsMin: Math.min(Number(e.target.value), f.aqsMax) }))
                }
              />
              <input
                type="range"
                min={0}
                max={100}
                value={filters.aqsMax}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, aqsMax: Math.max(Number(e.target.value), f.aqsMin) }))
                }
              />
              <span className="text-xs text-[#6B7280] w-14 text-right">
                {filters.aqsMin}–{filters.aqsMax}
              </span>
            </div>
            {/* Labels */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">Labels</span>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <span
                  className={`w-10 h-5 rounded-full border border-[#EFF0F6] p-0.5 ${
                    filters.showLabels ? "bg-[#008CCD]" : "bg-white"
                  }`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      filters.showLabels ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={filters.showLabels}
                  onChange={(e) => setFilters((f) => ({ ...f, showLabels: e.target.checked }))}
                />
              </label>
            </div>
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280]">Sort</span>
              <select
                className="rounded-[6px] border border-[#EFF0F6] h-8 text-sm px-2"
                value={filters.sortBy}
                onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              >
                <option value="frequency">Frequency</option>
                <option value="aqs">AQS</option>
                <option value="lastUsed">Last Used</option>
              </select>
            </div>
            {/* Reset */}
            <button
              className="ml-auto inline-flex items-center gap-1 rounded-[6px] border border-[#EFF0F6] px-2.5 h-8 text-xs hover:bg-[#F5F7FA]"
              onClick={() =>
                setFilters({
                  linkType: "all",
                  rel: "all",
                  aqsMin: 0,
                  aqsMax: 100,
                  showLabels: true,
                  sortBy: "frequency",
                })
              }
            >
              Reset
            </button>
          </div>
        </div>

        {/* Graph Panel */}
        <div className="relative flex-1" ref={graphWrapRef}>
          {loading && <div className="absolute inset-0 grid place-items-center text-[#6B7280]">Loading graph…</div>}

          {!loading && (
            <>
              {/* Lane backgrounds + headers */}
              <div className="pointer-events-none absolute inset-0 z-[0] flex">
                <div className="w-1/2 bg-[#F5F7FA]" />
                <div className="w-1/2 bg-[#ECFDF5]" />
              </div>
              <div className="pointer-events-none absolute z-[3] left-5 top-3 text-xs font-medium text-[#111827] opacity-70">
                Sources
              </div>
              <div className="pointer-events-none absolute z-[3] right-5 top-3 text-xs font-medium text-[#111827] opacity-70">
                Targets
              </div>

              {/* Legend */}
              <div className="pointer-events-none absolute z-[3] left-5 bottom-5 flex gap-3 text-xs text-[#111827]">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-4 bg-[#4286F5]"></span> Normal
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-4 bg-[#F59E0B]"></span> Low AQS
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-4 bg-[#EF4444]"></span> Broken
                </span>
              </div>

              {/* Graph Canvas */}
              <div className="absolute inset-0 z-[2]">
                <ForceGraph2D
                  ref={fgRef}
                  graphData={graph}
                  enableZoomInteraction
                  enablePanInteraction
                  enableNodeDrag={false}
                  backgroundColor="#ffffff"
                  nodeRelSize={1}
                  nodeLabel={buildNodeLabel}
                  linkLabel={(l) =>
                    `Anchor: "${anchorText}" — ${l.count} uses — Avg AQS: ${l.aqs ?? "—"}`
                  }
                  linkColor={linkColor}
                  linkWidth={(l) => l.width}
                  linkDirectionalArrowLength={8}
                  linkDirectionalArrowRelPos={0.99}
                  cooldownTicks={0}
                  linkCurvature={(l) => 0.18 + Math.min(0.22, (l.count || 1) * 0.01)}
                  onNodeHover={(n) => setHoverNode(n)}
                  nodeCanvasObject={drawNode}
                  nodePointerAreaPaint={drawNodePointerArea}
                />
              </div>
            </>
          )}

          {/* Zoom Controls */}
          <div className="absolute right-4 bottom-4 z-[1002] flex flex-col gap-2">
            <button
              onClick={zoomIn}
              title="Zoom in"
              className="h-9 w-9 rounded-[6px] border border-[#EFF0F6] bg-white hover:bg-[#F5F7FA] grid place-items-center"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={zoomOut}
              title="Zoom out"
              className="h-9 w-9 rounded-[6px] border border-[#EFF0F6] bg-white hover:bg-[#F5F7FA] grid place-items-center"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={zoomFit}
              title="Fit to screen"
              className="h-9 w-9 rounded-[6px] border border-[#EFF0F6] bg-white hover:bg-[#F5F7FA] grid place-items-center"
            >
              <Maximize2 size={18} />
            </button>
          </div>

          {/* Empty state */}
          {empty && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="rounded-[8px] border border-[#EFF0F6] p-6 text-center max-w-lg bg-white shadow-sm">
                <h3 className="text-lg font-semibold text-[#111827] mb-1">
                  No source → target data found for this anchor.
                </h3>
                <p className="text-[#6B7280] text-sm">Try refreshing your crawl or adjust filters.</p>
                <button
                  className="mt-3 inline-flex items-center gap-2 rounded-[6px] border border-[#EFF0F6] px-3 h-9 text-sm hover:bg-[#F5F7FA]"
                  // onClick={() => onRefresh?.()}
                >
                   <RefreshCw size={16} /> Refresh Crawl
                 </button>
              </div>
            </div>
          )}
        </div>

        {/* SR summary */}
        <div className="sr-only" aria-live="polite">
          Anchor “{anchorText}” links {stats?.totalSources ?? 0} source pages to{" "}
          {stats?.totalTargets ?? 0} targets. Avg AQS: {stats?.avgAqs ?? 0}. Diversity:{" "}
          {(stats?.diversity ?? 0) * 100}%.
        </div>
      </aside>
    </div>
</Drawer>
  );
}

export default function DemoUsageGraphPopup(props: any) {
  return <UsageGraphDrawer {...props} />;
}