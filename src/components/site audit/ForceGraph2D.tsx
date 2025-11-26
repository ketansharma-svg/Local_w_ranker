// --- ForceGraph2D-based crawl map (STATIC: no physics, no movement on hover) ---
import ForceGraph2D from "react-force-graph-2d";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface PageData {
  url: string;
  depth: number;
  inbound_links: Array<{ source: string; text: string }>;
  outbound_links: Array<{ url: string; text: string }>;
}

interface LinksData {
  domain: string;
  metrics: {
    avg_internal_links: number;
    avg_page_depth: number;
    max_page_depth: number;
    orphan_pages: string[];
  };
  pages: PageData[];
}

// \u26a0\ufe0f This variant uses a PRECOMPUTED RADIAL LAYOUT and locks nodes (fx, fy)
// so there is ZERO simulation. Hover only shows an HTML popover. Always zoomToFit.
export default function ForceGraph2DMapStatic({ linksData }: { linksData: LinksData }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [hoverNode, setHoverNode] = useState<any>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => setDims({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    setDims({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const norm = (u: string) => u.replace(/\/$/, "");
  const isInternal = (u: string) => u.startsWith(`https://${linksData.domain}`);

  // Build graph + STATIC RADIAL LAYOUT (fx, fy assigned)
  const graph = useMemo(() => {
    const pageMap = new Map(linksData.pages.map((p) => [norm(p.url), p]));

    const nodes = linksData.pages.map((page) => {
      const internalOutbound = page.outbound_links.filter(
        (l) => isInternal(l.url) && !/\.pdf($|\?)/i.test(l.url) && norm(l.url) !== norm(page.url) && pageMap.has(norm(l.url))
      );
      return {
        id: norm(page.url),
        url: page.url,
        title: page.url === `https://${linksData.domain}`
          ? "Home"
          : page.url.replace(`https://${linksData.domain}/`, "").split("-").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" "),
        depth: page.depth,
        inboundCount: page.inbound_links.length,
        outboundCount: internalOutbound.length,
        isHome: page.url === `https://${linksData.domain}`,
      } as any;
    });

    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const links: Array<{ id: string; source: string; target: string; anchor: string; status: "ok"; weight: number }>=[];
    const seen = new Set<string>();

    for (const page of linksData.pages) {
      const from = norm(page.url);
      for (const l of page.outbound_links) {
        if (!isInternal(l.url) || /\.pdf($|\?)/i.test(l.url)) continue;
        const to = norm(l.url);
        if (to === from || !nodeIds.has(to)) continue;
        const key = `${from}|${to}|${l.text || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ id: key, source: from, target: to, anchor: l.text || "No Text", status: "ok", weight: 1 });
      }
    }

    // ------ STATIC RADIAL LAYOUT BY DEPTH ------
    const byDepth = new Map<number, any[]>();
    for (const n of nodes as any[]) {
      const d = n.depth ?? 0;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(n);
    }
    const maxDepth = Math.max(0, ...Array.from(byDepth.keys()));
    const ringStep = 130; // distance between rings
    const baseR = 40;     // center radius for Home

    for (const [d, arr] of byDepth.entries()) {
      const R = baseR + d * ringStep;
      const L = arr.length || 1;
      for (let i = 0; i < L; i++) {
        const theta = (2 * Math.PI * i) / L;
        const x = R * Math.cos(theta);
        const y = R * Math.sin(theta);
        arr[i].x = x; arr[i].y = y;     // initial (not required, but fine)
        arr[i].fx = x; arr[i].fy = y;   // << LOCK POSITION (no physics)
      }
    }

    return { nodes, links };
  }, [linksData]);

  // Disable ALL forces (engine never runs). We also call zoomToFit on mount/resize.
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;
    // Remove forces entirely
    fg.d3Force("link", null);
    fg.d3Force("charge", null);
    fg.d3Force("center", null);
    fg.d3Force("collide", null);
    fg.d3VelocityDecay?.(1);
    fg.d3AlphaMin?.(1);
    fg.d3AlphaDecay?.(1);

    // Fit after a tick so the canvas knows sizes
    const t = setTimeout(() => fg.zoomToFit?.(600, 110), 0);
    return () => clearTimeout(t);
  }, [graph.nodes.length, graph.links.length, dims.width, dims.height]);

  // Small, tidy node painter (does NOT react to hover for stability)
  const colourFor = useCallback((n: any) => {
    if (n.isHome) return "#008CCD";
    const c = n.outboundCount ?? 0;
    if (c >= 6) return "#16A34A";
    if (c >= 4) return "#F59E0B";
    return "#EF4444";
  }, []);

  const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const R = node.isHome ? 7 : 5.5;
    ctx.beginPath();
    ctx.arc(node.x, node.y, R, 0, 2 * Math.PI, false);
    ctx.fillStyle = colourFor(node);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    const label = (node.title as string) || "";
    const MAX = 16;
    const txt = label.length > MAX ? label.slice(0, MAX - 1) + "…" : label;
    const fs = Math.max(7 / (scale || 1), 5.5);
    ctx.font = `${fs}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#374151";
    ctx.fillText(txt, node.x, node.y + R + 2);
  }, [colourFor]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[70vh] bg-white rounded-lg border"
      onMouseMove={(e) => {
        if (!containerRef.current) return;
        (containerRef.current as any)._mx = e.nativeEvent.offsetX;
        (containerRef.current as any)._my = e.nativeEvent.offsetY;
      }}
    >
      <ForceGraph2D
        ref={fgRef}
        width={dims.width}
        height={dims.height}
        graphData={{ nodes: graph.nodes as any, links: graph.links as any }}
        nodeId="id"
        backgroundColor="#FFFFFF"
        nodeCanvasObject={drawNode}
        nodeLabel={() => ''} // disable built-in tooltip
        linkColor={() => "#cbd5e1"}
        linkWidth={() => 1.2}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={0.58}
        linkLabel={(l: any) => l.anchor}
        onNodeHover={setHoverNode as any} // only for HTML popover, NOT for drawing
        cooldownTicks={0}                // << NO SIMULATION
        enableNodeDrag={false}           // << NO DRAG
        autoPauseRedraw={false}          // drawing stays static
        minZoom={0.2}
        maxZoom={4}
      />

      {/* HTML Popover (stable; does not affect layout) */}
      {hoverNode && containerRef.current && (
        <div
          className="pointer-events-none absolute z-20 rounded-md border bg-white/95 p-2 text-xs shadow whitespace-nowrap"
          style={{
            left: Math.min(((containerRef.current as any)._mx ?? 0) + 14, dims.width - 220),
            top: Math.min(((containerRef.current as any)._my ?? 0) + 14, dims.height - 110)
          }}
        >
          <div className="font-medium text-gray-800">{hoverNode.title}</div>
          <div className="text-gray-600">Depth: <span className="font-medium">{hoverNode.depth}</span></div>
          <div className="text-gray-600">Outbound: <span className="font-medium">{hoverNode.outboundCount}</span></div>
          <div className="text-gray-600">Inbound: <span className="font-medium">{hoverNode.inboundCount}</span></div>
        </div>
      )}
    </div>
  );
}
