import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Network, Palette, ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";
/***************************************
 * Wranker – Link Map (Section 3 / Demo)
 * - Aggregated link per page-pair for visibility
 * - Width scales with number of links; color by status (broken/red, redirect/orange, ok/blue)
 * - Layouts: force, hierarchical (top→bottom equal rows), radial, grid
 * - Directional link counts on hover (→ / ← pills)
 * - Draggable zoom pane (no external deps)
 ***************************************/

/************ Tokens ************/
const TOKENS = {
  action: "#0077FF",
  good: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
  text: "#111827",
  muted: "#6B7280",
  panel: "#FFFFFF",
  app: "#F5F7FA",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
};

/************ Utils ************/
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;
const colorForScore = (score) => {
  const s = clamp(Number(score) || 0, 0, 100);
  if (s < 40) return TOKENS.critical;
  if (s < 60) return TOKENS.warning;
  if (s < 80) return TOKENS.good;
  return TOKENS.action;
};



/************ Layout helpers ************/
function applyLayout(layout, graph, container) {
  const nodes = graph?.nodes || [];
  if (!nodes.length || !container) return;
  const W = container.clientWidth || 800;
  const H = container.clientHeight || 600;
  const centerX = W / 2;
  const centerY = H / 2;

  nodes.forEach((n) => { n.fx = undefined; n.fy = undefined; });

  if (layout === "radial") {
    const R = Math.min(W, H) * 0.38;
    const N = nodes.length;
    nodes.forEach((n, i) => {
      const t = (i / N) * Math.PI * 2;
      n.fx = centerX + R * Math.cos(t);
      n.fy = centerY + R * Math.sin(t);
    });
    return;
  }
  if (layout === "grid") {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const cellW = W / (cols + 1);
    const cellH = H / (rows + 1);
    nodes.forEach((n, i) => {
      const c = i % cols; const r = Math.floor(i / cols);
      n.fx = cellW * (c + 1);
      n.fy = cellH * (r + 1);
    });
    return;
  }
  if (layout === "hierarchical") {
    // TOP→BOTTOM rows by depth; equal row heights
    const layers = new Map();
    nodes.forEach((n) => { const d = Number.isFinite(n.depth) ? n.depth : 0; if (!layers.has(d)) layers.set(d, []); layers.get(d).push(n); });
    const depths = [...layers.keys()].sort((a, b) => a - b);
    const rowH = H / Math.max(depths.length + 1, 2);
    depths.forEach((d, idx) => {
      const row = layers.get(d);
      const spacingX = W / (row.length + 1);
      row.forEach((n, j) => { n.fx = spacingX * (j + 1); n.fy = rowH * (idx + 1); });
    });
    return;
  }
  if (layout === "force") {
    nodes.forEach((n) => { n.fx = undefined; n.fy = undefined; });
  }
}

export default function LinkMapCanvasDemo({ graph: graphProp, focusNodeId, onSelectNode }) {
  const fgRef = useRef(null);
  const containerRef = useRef(null);
  const toolbarRef = useRef(null);

  const [graph] = useState(graphProp);
  const [layout, setLayout] = useState("force");
  const [colorMode, setColorMode] = useState("PILS");
  const [hoverLink, setHoverLink] = useState(null);
  const [toolbarPos, setToolbarPos] = useState({ x: null, y: null });
  const [dragState, setDragState] = useState(null); // {startX,startY,origX,origY}

  /************ Colors ************/
  const getNodeColor = useCallback((node) => {
    if (colorMode === "PILS") return colorForScore(node.pils ?? 0);
    if (colorMode === "AQS") return colorForScore(node.aqs ?? 0);
    if (colorMode === "Depth") return ["#D9EEF8", "#E6F7EE", "#FFF6E5", "#FEE2E2", "#EDE9FE"][node.depth % 5];
    return TOKENS.action;
  }, [colorMode]);

  /************ Aggregations for link styling ************/
  const pairMeta = useMemo(() => {
    // key: undirected pair "a~b" → { firstId, total, hasBroken, hasRedirect }
    const map = new Map();
    const keyUnd = (a, b) => (a < b ? `${a}~${b}` : `${b}~${a}`);
    for (const e of graph.edges) {
      const s = typeof e.source === "string" ? e.source : e.source?.id;
      const t = typeof e.target === "string" ? e.target : e.target?.id;
      if (!s || !t) continue;
      const k = keyUnd(s, t);
      const m = map.get(k) || { firstId: e.id, total: 0, hasBroken: false, hasRedirect: false };
      if (!map.has(k)) m.firstId = e.id;
      m.total += 1;
      if (e.status === "broken") m.hasBroken = true; else if (e.status === "redirect") m.hasRedirect = true;
      map.set(k, m);
    }
    return map;
  }, [graph.edges]);

  const getLinkColor = useCallback((link) => {
    const sid = typeof link?.source === 'string' ? link.source : link?.source?.id;
    const tid = typeof link?.target === 'string' ? link.target : link?.target?.id;
    if (!sid || !tid) return TOKENS.action;
    const k = sid < tid ? `${sid}~${tid}` : `${tid}~${sid}`;
    const m = pairMeta.get(k);
    if (m?.hasBroken) return TOKENS.critical;    // red if any broken
    if (m?.hasRedirect) return TOKENS.warning;   // orange if any redirect
    return TOKENS.action;                         // blue otherwise
  }, [pairMeta]);

  const linkWidth = useCallback((link) => {
    const sid = typeof link?.source === 'string' ? link.source : link?.source?.id;
    const tid = typeof link?.target === 'string' ? link.target : link?.target?.id;
    if (!sid || !tid) return 1;
    const k = sid < tid ? `${sid}~${tid}` : `${tid}~${sid}`;
    const m = pairMeta.get(k);
    return Math.min(1 + (m?.total || 1) * 1.1, 12);
  }, [pairMeta]);

  /************ Nodes ************/
  const drawNode = useCallback((node, ctx, globalScale) => {
    if (!ctx || typeof ctx.beginPath !== "function") return;
    const size = 10;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();
    ctx.strokeStyle = TOKENS.borderLight;
    ctx.stroke();
    const fontSize = 11 / (globalScale || 1);
    if (fontSize > 3) {
      ctx.font = `${fontSize}px Inter`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = TOKENS.text;
      ctx.fillText(node.title, node.x, node.y + size + 2);
    }
  }, [getNodeColor]);
  const nodeLabel = useCallback((n) => `${n.title || n.url}`, []);

  /************ Directional counts for hover ************/
  const linkCounts = useMemo(() => {
    const bi = new Map(); const keyUnd = (a, b) => (a < b ? `${a}~${b}` : `${b}~${a}`);
    for (const e of graph.edges) {
      const s = typeof e.source === "string" ? e.source : e.source?.id;
      const t = typeof e.target === "string" ? e.target : e.target?.id;
      if (!s || !t) continue; const k = keyUnd(s, t);
      const v = bi.get(k) || { [s]: 0, [t]: 0 }; v[s] = (v[s] || 0) + 1; bi.set(k, v);
    }
    return { bi };
  }, [graph.edges]);

  const getPairCounts = useCallback((a, b) => {
    const k = a < b ? `${a}~${b}` : `${b}~${a}`; const und = linkCounts.bi.get(k);
    return { ab: und?.[a] || 0, ba: und?.[b] || 0 };
  }, [linkCounts]);

  /************ Custom link drawing + hover overlay ************/
  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const sid = typeof link.source === "string" ? link.source : link.source?.id;
    const tid = typeof link.target === "string" ? link.target : link.target?.id;
    if (!sid || !tid) return;

    // Draw aggregated line ONCE per pair
    const k = sid < tid ? `${sid}~${tid}` : `${tid}~${sid}`;
    const meta = pairMeta.get(k);
    if (meta && link.id === meta.firstId) {
      const color = meta.hasBroken ? TOKENS.critical : meta.hasRedirect ? TOKENS.warning : TOKENS.action;
      const w = Math.min(1 + (meta.total || 1) * 1.1, 12);
      ctx.beginPath(); ctx.moveTo(link.source.x, link.source.y); ctx.lineTo(link.target.x, link.target.y);
      ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
    }

    // Hover pills for this pair
    if (!hoverLink) return;
    const hs = typeof hoverLink.source === "string" ? hoverLink.source : hoverLink.source?.id;
    const ht = typeof hoverLink.target === "string" ? hoverLink.target : hoverLink.target?.id;
    const same = (sid === hs && tid === ht) || (sid === ht && tid === hs);
    if (!same) return;

    const sx = link.source.x, sy = link.source.y, tx = link.target.x, ty = link.target.y;
    const mx = (sx + tx) / 2, my = (sy + ty) / 2; const dx = tx - sx, dy = ty - sy; const len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len;
    const { ab, ba } = getPairCounts(sid, tid);

    const drawPill = (x, y, txt) => {
      const padX = 4 / (globalScale || 1), padY = 2 / (globalScale || 1), fs = Math.max(10 / (globalScale || 1), 8);
      ctx.font = `${fs}px Roboto`;
      const w2 = ctx.measureText(txt).width + padX * 2; const h2 = fs + padY * 2; const r = 4 / (globalScale || 1);
      ctx.beginPath(); ctx.fillStyle = "#ffffff"; ctx.strokeStyle = TOKENS.borderLight; ctx.lineWidth = 1 / (globalScale || 1);
      ctx.moveTo(x - w2 / 2 + r, y - h2 / 2);
      ctx.arcTo(x + w2 / 2, y - h2 / 2, x + w2 / 2, y + h2 / 2, r);
      ctx.arcTo(x + w2 / 2, y + h2 / 2, x - w2 / 2, y + h2 / 2, r);
      ctx.arcTo(x - w2 / 2, y + h2 / 2, x - w2 / 2, y - h2 / 2, r);
      ctx.arcTo(x - w2 / 2, y - h2 / 2, x + w2 / 2, y - h2 / 2, r);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = TOKENS.text; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, x, y);
    };

    const off = 14; if (ab > 0) drawPill(mx + nx * off, my + ny * off, `→ ${ab}`); if (ba > 0) drawPill(mx - nx * off, my - ny * off, `← ${ba}`);
  }, [hoverLink, pairMeta, getPairCounts]);

  const handleLinkHover = useCallback((l) => setHoverLink(l || null), []);

  /************ Layout effect ************/
  useEffect(() => {
    const fg = fgRef.current; const c = containerRef.current; if (!fg) return;
    // refresh() is not a ForceGraph2D API — use d3ReheatSimulation / zoomToFit only.
    applyLayout(layout, graph, c);
    if (layout === "force") {
      fg.d3ReheatSimulation();
    } else {
      fg.zoomToFit(400, 40);
    }
  }, [layout, graph]);

  /************ Draggable zoom pane ************/
  useEffect(() => {
    const c = containerRef.current; const t = toolbarRef.current; if (!c || !t) return;
    setToolbarPos((pos) => {
      if (pos.x !== null && pos.y !== null) return pos;
      const pad = 12;
      return { x: c.clientWidth - t.clientWidth - pad, y: c.clientHeight - t.clientHeight - pad };
    });
  }, []);

  const onToolbarMouseDown = useCallback((e) => {
    e.preventDefault(); const c = containerRef.current; if (!c) return;
    setDragState({ startX: e.clientX, startY: e.clientY, origX: toolbarPos.x ?? 12, origY: toolbarPos.y ?? 12 });
  }, [toolbarPos]);

  useEffect(() => {
    if (!dragState) return; const c = containerRef.current;
    const onMove = (e) => {
      if (!c) return; const dx = e.clientX - dragState.startX; const dy = e.clientY - dragState.startY;
      const nx = clamp(dragState.origX + dx, 0, c.clientWidth - (toolbarRef.current?.clientWidth || 0));
      const ny = clamp(dragState.origY + dy, 0, c.clientHeight - (toolbarRef.current?.clientHeight || 0));
      setToolbarPos({ x: nx, y: ny });
    };
    const onUp = () => setDragState(null);
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp, { once: true });
    return () => { window.removeEventListener('mousemove', onMove); };
  }, [dragState]);

  useEffect(() => {
    if (!focusNodeId) return;
    const fg = fgRef.current;
    const n = (graph?.nodes || []).find((x) => String(x.id) === String(focusNodeId));
    if (!n || !fg) return;
    try {
      fg.centerAt(n.x, n.y, 600);
      const k = fg.zoom();
      fg.zoom(k < 1.6 ? 1.6 : k, 600);
    } catch {}
  }, [focusNodeId, graph]);


  /************ Render ************/
  return (
    <div className="w-full h-[78vh] min-h-[420px]" style={{ background: TOKENS.app, color: TOKENS.text }}>
      <div ref={containerRef} className="relative h-full rounded-md border" style={{ borderColor: TOKENS.borderLight, background: TOKENS.panel }}>
        {/* Top-left controls */}
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-md border px-2 py-1 bg-white" style={{ borderColor: TOKENS.borderLight }}>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--wr-muted,#6B7280)]"><Network size={14}/> Layout</span>
          <select value={layout} onChange={(e) => setLayout(e.target.value)} className="text-sm border rounded px-2 py-1" style={{ borderColor: TOKENS.borderLight }}>
            <option value="force">Force</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="radial">Radial</option>
            <option value="grid">Grid</option>
          </select>
          <span className="ml-3 inline-flex items-center gap-1 text-xs text-[var(--wr-muted,#6B7280)]"><Palette size={14}/> Color</span>
          <select value={colorMode} onChange={(e) => setColorMode(e.target.value)} className="text-sm border rounded px-2 py-1" style={{ borderColor: TOKENS.borderLight }}>
            <option>PILS</option>
            <option>AQS</option>
            <option>Depth</option>
          </select>
        </div>

        {/* Graph */}
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes: graph.nodes, links: graph.edges }}
          backgroundColor={TOKENS.panel}
          nodeCanvasObject={drawNode}
          nodeLabel={nodeLabel}
          linkColor={getLinkColor}
          linkOpacity={1}
          linkWidth={linkWidth}
          linkCurvature={0}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={0.9}
          linkDirectionalArrowColor={(l) => getLinkColor(l)}
          linkCanvasObject={linkCanvasObject}
          onLinkHover={handleLinkHover}
          onNodeClick={(n) => { onSelectNode && onSelectNode(n); }}
        />

        {/* Draggable Zoom Pane */}
        <div
          ref={toolbarRef}
          className="pointer-events-auto absolute z-20 rounded-full border bg-white/90 backdrop-blur px-3 py-2 shadow cursor-move select-none"
          style={{ borderColor: TOKENS.borderLight, left: toolbarPos.x ?? 12, top: toolbarPos.y ?? 12 }}
          onMouseDown={onToolbarMouseDown}
          title="Drag to reposition"
        >
          <div className="flex items-center gap-2">
            <button onClick={() => { const fg = fgRef.current; if (!fg) return; const k = fg.zoom(); fg.zoom(k / 1.2, 300); }} className="rounded-full border p-2" title="Zoom out" aria-label="Zoom out"><ZoomOut size={16}/></button>
            <button onClick={() => { const fg = fgRef.current; if (!fg) return; const k = fg.zoom(); fg.zoom(k * 1.2, 300); }} className="rounded-full border p-2" title="Zoom in" aria-label="Zoom in"><ZoomIn size={16}/></button>
            <button onClick={() => fgRef.current?.zoomToFit(400, 40)} className="rounded-full border px-3 py-2 text-sm flex items-center gap-1" title="Fit to screen" aria-label="Fit to screen"><Maximize2 size={16}/> Fit</button>
            <button onClick={() => { const url = fgRef.current?.toDataURL?.('image/png'); if (!url) return; const a = document.createElement('a'); a.href = url; a.download = 'wranker-link-map.png'; a.click(); }} className="rounded-full border px-3 py-2 text-sm flex items-center gap-1" title="Export PNG" aria-label="Export PNG"><Download size={16}/> PNG</button>
          </div>
        </div>
      </div>
    </div>
  );
}
