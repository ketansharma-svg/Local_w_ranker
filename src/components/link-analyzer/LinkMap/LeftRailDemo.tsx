"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  BookmarkPlus,
  MoreHorizontal,
  Star,
  StarOff,
  ListTree,
  MousePointer,
  ZoomIn,
  ExternalLink,
  Info,
  Copy,
  Trash2,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { createPortal } from "react-dom";
import RightInspectorDemo from "./drawers/RightInspectorDemo";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
/**
 * Wranker — Link Map (Tab 7)
 * SECTION 2: Left Rail — Node List & Legend (OPAQUE smart popover via portal)
 *
 * The smart popover is now rendered in a fixed-position portal with an explicit
 * solid background color and extreme z-index to guarantee 100% opacity.
 */

/* -------------------------------- Tokens --------------------------------- */
const TOKENS = {
  brand: "#008CCD",
  coreBlue: "#4286F5",
  good: "#10B981",
  warning: "#F59E0B",
  critical: "#EF4444",
  text: "#111827",
  muted: "#6B7280",
  panel: "#FFFFFF",
  app: "#F5F7FA",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  radius: "6px",
};

const rootVars: React.CSSProperties = {
  ["--wr-action" as any]: TOKENS.brand,
  ["--wr-good" as any]: TOKENS.good,
  ["--wr-warning" as any]: TOKENS.warning,
  ["--wr-critical" as any]: TOKENS.critical,
  ["--wr-text" as any]: TOKENS.text,
  ["--wr-muted" as any]: TOKENS.muted,
  ["--wr-panel" as any]: TOKENS.panel,
  ["--wr-app" as any]: TOKENS.app,
  ["--wr-border" as any]: TOKENS.border,
  ["--wr-borderLight" as any]: TOKENS.borderLight,
  ["--wr-radius" as any]: TOKENS.radius,
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* ------------------------------- Utilities -------------------------------- */
function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function useDebounced<T>(value: T, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}


/* --------------------------- Portal Smart Popover ------------------------- */
type SmartPopoverProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  width?: number;
  children: React.ReactNode;
};

function SmartPopover({ anchorEl, open, width = 280, children }: SmartPopoverProps) {
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const gap = 6;
    const maxLeft = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPos({ top: Math.min(rect.bottom + gap, window.innerHeight - 8), left: maxLeft });
  }, [open, anchorEl, width]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => setPos((p) => ({ ...p })); // trigger re-calc on next layout if needed
    const onScrollOrResize = () => {
      // Close or force a quick reflow could be used; closing is safest for correctness.
      setPos((p) => ({ ...p }));
    };
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true as any);
      onChange();
    };
  }, [open]);

  if (!open || !anchorEl) return null;
  // Ensure we are in a browser env
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 2147483647, // above everything
        pointerEvents: "none",
        isolation: "isolate",
      }}
      className="transition-all duration-100"
    >
      <div
        // Using inline solid background to avoid any Tailwind CSS var opacity interference.
        style={{
          backgroundColor: "#ffffff", // 100% opaque
          border: `1px solid ${TOKENS.borderLight}`,
          borderRadius: 8,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          mixBlendMode: "normal",
        }}
        className="ring-1 ring-black/10 overflow-hidden"
      >
        <div className="p-2 pointer-events-none">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------ Row Component ----------------------------- */
function NodeRow({
  node,
  selected,
  focused,
  top,
  ROW_HEIGHT,
  toggleSelect,
  index,
  onOpenInspector,
  onCenterNode,
  onOpenMenu,
}: {
  node: any;
  selected: boolean;
  focused: boolean;
  top: number;
  ROW_HEIGHT: number;
  toggleSelect: (id: string, relativeIndex: number, e: React.MouseEvent) => void;
  index: number;
  onOpenInspector: (n: any) => void;
  onCenterNode: (n: any) => void;
  onOpenMenu: (n: any, e: React.MouseEvent) => void;
}) {
  const nameBtnRef = useRef<HTMLButtonElement | null>(null);
  const [showPop, setShowPop] = useState(false);

  const statusPill = (s: "orphan" | "redirect" | "broken") => {
    const color =
      s === "orphan" ? TOKENS.warning : s === "redirect" ? TOKENS.good : TOKENS.critical;
    return (
      <span
        key={s}
        className="inline-flex items-center gap-1 mr-1 px-1.5 py-0.5 rounded text-[11px] bg-[#F5F7FA]"
        style={{ borderRadius: TOKENS.radius, color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {s}
      </span>
    );
  };
  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
    localStorage.setItem("Popup","true")
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };
    function Drawer({
      title,
      children,
      onClose,
    }: {
      title: string;
      children: React.ReactNode;
      onClose: () => void;
    }) {
      return (
        <div className="fixed inset-0 ">
          <div className="absolute inset-0 bg-black/20" onClick={onClose} />
          <aside className="absolute right-0 top-0 h-full w-auto overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold"></div>
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-sm hover:bg-gray-50 z-10000 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {children}
          </aside>
        </div>
      );
    }
  return (
    <div
      role="option"
      aria-selected={selected}
      className={cx(
        "relative z-0 group/row px-3 flex items-center gap-2 border-b border-l-2 border-l-transparent transition-all duration-200 ease-out cursor-pointer",
        "hover:bg-[var(--wr-app)] hover:border-l-[var(--wr-action)] hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:translate-x-[2px] group-hover/row:z-50",
        focused && "ring-2 ring-offset-0 ring-[var(--wr-action)]",
        selected && "bg-[#EAF6FF]"
      )}
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        height: ROW_HEIGHT,
        borderColor: "var(--wr-borderLight)",
        outlineColor: "var(--wr-action)",
      }}
      onClick={(e) => toggleSelect(node.id, index, e)}
      onDoubleClick={() => onOpenInspector(node)}
    >
                                            {/* {drawerRow && (
                    <Drawer title="Drawer" onClose={closeDrawer}>
                      <RightInspectorDemo   />
                    </Drawer>
                  )} */}
      {/* Branded page icon (replaces favicon) */}
      <button
        className="h-5 w-5 flex items-center justify-center rounded hover:bg-gray-100"
        title="Center on canvas"
        aria-label="Center on canvas"
        onClick={(e) => {
          e.stopPropagation();
          onCenterNode(node);
        }}
      >
        <FileText className="h-4 w-4" style={{ color: TOKENS.brand }} />
      </button>

      {/* Main text + SMART POPOVER (portal) */}
<div className="flex-1 min-w-0 overflow-hidden">
  <div className="inline-block">
<button
  ref={nameBtnRef}
  className="group text-sm font-medium transition-colors duration-200 hover:text-[var(--wr-action)]
             cursor-pointer flex items-center gap-1 w-full max-w-full overflow-hidden"
  title={node.title || node.path}
  onClick={openDrawer}
  onMouseEnter={() => setShowPop(true)}
  onMouseLeave={() => setShowPop(false)}
>
  {/* Text truncates cleanly */}
  <span className="truncate flex-1 min-w-0 text-left break-all">
    {node.title || node.path}
  </span>

  {/* Icon never shrinks or overlaps */}
  <ExternalLink
    className="h-3.5 w-3.5 flex-shrink-0 text-[color:var(--wr-muted)] ml-0.5"
  />
</button>


    <SmartPopover anchorEl={nameBtnRef.current} open={showPop} width={280}>
      <div className="flex items-start gap-2">
        <LinkIcon className="h-4 w-4" style={{ color: TOKENS.brand }} />
        <div className="min-w-0">
          <div className="truncate text-[13px]" style={{ color: TOKENS.text }}>
            {node.url}
          </div>
          <div
            className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]"
            style={{ color: TOKENS.muted }}
          >
            <div>
              PILS:{" "}
              <span className="font-medium" style={{ color: TOKENS.text }}>
                {node.pils}%
              </span>
            </div>
            <div>
              AQS:{" "}
              <span className="font-medium" style={{ color: TOKENS.text }}>
                {node.aqs}%
              </span>
            </div>
            <div>
              Inlinks:{" "}
              <span className="font-medium" style={{ color: TOKENS.text }}>
                {node.inlinks}
              </span>
            </div>
            <div>
              Outlinks:{" "}
              <span className="font-medium" style={{ color: TOKENS.text }}>
                {node.outlinks}
              </span>
            </div>
            {node.status?.length ? (
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">{node.status.map(statusPill)}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </SmartPopover>
  </div>

  <div className="text-xs text-gray-500 truncate">
    PILS {node.pils ?? "–"}% • in: {node.inlinks} • out: {node.outlinks}
    {node.status?.length ? (
      <>
        {" "}
        • {node.status.map(statusPill)}
      </>
    ) : null}
  </div>
</div>


      {/* Priority star */}
      <div className="mr-1" title={node.priority ? "Priority" : "Mark priority"}>
        {node.priority ? (
          <Star size={16} color={TOKENS.brand} />
        ) : (
          <StarOff size={16} className="text-gray-400" />
        )}
      </div>

      {/* Row actions */}
      <div className="opacity-0 group-hover:opacity-100 md:opacity-100 flex items-center gap-1 transition-opacity duration-200">
        <button
          className="px-1 py-1 rounded hover:bg-gray-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onCenterNode(node);
          }}
          title="Center on map"
          aria-label="Center on map"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="px-1 py-1 rounded hover:bg-gray-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInspector(node);
          }}
          title="Open inspector"
          aria-label="Open inspector"
        >
          <ExternalLink size={16} />
        </button>
        <button
          className="px-1 py-1 rounded hover:bg-gray-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(node, e);
          }}
          title="More actions"
          aria-haspopup="menu"
          aria-expanded={false}
          aria-label="More actions"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

// --- Action policy (single source of truth) ---
const ACTION_POLICY: Record<string, { disabled?: boolean; task?: boolean; }> = {
  // things we don’t do in the API → disabled
  replace: { disabled: true },          // “Replace Link”, “Replace Selected”
  exclude: { disabled: true },          // “Exclude from map”, “Remove from map” (if API truly absent)
  export:  { disabled: true },          // “Export …” (toggle if your export API is live)
  watch:   { disabled: true },          // “Add to Watchlist”
  remove:  { disabled: true },  // no API → disabled
  // things the user should do on their end → create task
  task:    { task: true },              // “Create Task”
  review:  { task: true },              // any “Review …”
  fix:     { task: true },              // any “Fix …”
};
const isDisabled = (key: string) => !!ACTION_POLICY[key]?.disabled;
const isTask     = (key: string) => !!ACTION_POLICY[key]?.task;


/* ------------------------------ Context Menu ------------------------------ */
function ActionsMenu({
  open,
  x,
  y,
  onClose,
  onAction,
  node,
}: {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string, node: any) => void;
  node: any;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const left = Math.min(x - 160, window.innerWidth - 220);
  const top = Math.min(y + 6, window.innerHeight - 200);

const Item = ({ icon, label, action, danger }: { icon: React.ReactNode; label: string; action: string; danger?: boolean; }) => {
  const disabled = isDisabled(action);
  const commonCls =
    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 " +
    (disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[#F5F7FA] cursor-pointer");

  return (
    <button
      role="menuitem"
      className={cx(commonCls, danger && "text-red-600")}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;                 // hard stop
        if (isTask(action)) {
          // Use *button’s own label* as the task title
          onAction("task", { ...node, _taskTitle: label });
          return;
        }
        onAction(action, node);
      }}
    >
      {icon}<span>{label}</span>
    </button>
  );
};


  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Row actions"
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 2000,
        width: 200,
        background: TOKENS.panel,
        border: `1px solid ${TOKENS.borderLight}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      {/* <Item  icon={<ExternalLink size={16} />} label="Open in Page Analyzer" action="open" /> */}
      <Item icon={<ZoomIn size={16} />} label="Center on map" action="center" />
      <Item icon={<Copy size={16} />} label="Copy URL" action="copy" />
      <Item icon={<BookmarkPlus size={16} />} label="Create Task" action="task" />
      <div style={{ height: 1, background: TOKENS.borderLight }} />
      <Item icon={<Trash2 size={16} />} label="Remove from map" action="remove" danger />
    </div>
  );
}

/* ------------------------------ Main Component ---------------------------- */
export default function LeftRailDemo({
  nodes: nodesProp,
  loading,
  error,
  onOpenInspector,
  onCenterNode,
}: {
  nodes?: any[];
  loading?: boolean;
  error?: string;
  onOpenInspector?: (n: any) => void;
  onCenterNode?: (n: any) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 250);
  const [activeTab, setActiveTab] = useState<"all" | "hubs" | "orphans" | "redirects" | "impact">(
    "all"
  );
  const [nodes] = useState(nodesProp);

  // selection + keyboard focus
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);

  const { selectedProject } = useProjectManager();
  const { openTaskDrawer } = useTaskDrawer();
  const projectId = selectedProject?.id ?? null;
  const openTaskForNode = useCallback(
    (node: any) => {
      if (!node) return;
      const label = node.title || node.path || "Link map task";
      openTaskDrawer({
        title: label,
        description: `Review link map node ${label} at ${node.url ?? "unknown URL"}.`,
        projectId,
        type: "createNew",
      });
    },
    [openTaskDrawer, projectId],
  );

  const openTaskForSelection = useCallback(() => {
    const selectedNodes = (nodes ?? []).filter((n: any) => selectedIds.includes(n?.id));
    if (selectedNodes.length === 0) return;
    const primary = selectedNodes[0];
    const label = primary?.title || primary?.path || "Link map task";
    const title =
      selectedNodes.length > 1 ? `Review ${selectedNodes.length} link map nodes` : label;
    const details = selectedNodes
      .slice(0, 5)
      .map((n) => `- ${n?.title || n?.path || n?.id || "Unnamed node"} (${n?.url ?? "unknown URL"})`)
      .join("\n");
    const description =
      selectedNodes.length > 1
        ? `Review the following link map nodes:\n${details}`
        : `Review link map node ${label} at ${primary?.url ?? "unknown URL"}.`;

    openTaskDrawer({
      title,
      description,
      projectId,
      type: "createNew",
    });
  }, [nodes, openTaskDrawer, projectId, selectedIds]);

  // list metrics
  const ROW_HEIGHT = 56;
  const VIEWPORT_H = 520;
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Context menu state
  const [menu, setMenu] = useState<{ open: boolean; node: any; x: number; y: number }>({
    open: false,
    node: null,
    x: 0,
    y: 0,
  });
  const openMenu = (node: any, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ open: true, node, x: rect.right, y: rect.bottom });
  };
  const closeMenu = () => setMenu({ open: false, node: null, x: 0, y: 0 });
const handleMenuAction = (action: string, node: any) => {
  if (action === "task") {
    const title = node?._taskTitle || "Create Task";
    openTaskDrawer({
      title,
      description: `Requested action: ${title}\nNode: ${node?.title || node?.path || node?.url || node?.id}`,
      projectId,
      type: "createNew",
    });
    closeMenu();
    return;
  }
  if (action === "open")  console.info("openInspector", node?.id);
  if (action === "center") console.info("centerOnCanvas", node?.id);
  if (action === "copy")  navigator.clipboard?.writeText(node?.url || "");
  if (action === "remove") alert(`Remove ${node?.title || node?.path} from map (mock)`);
  closeMenu();
};

  // Filter (server-side in production)
  const filtered = useMemo(() => {
    let list:any = nodes;
    if (activeTab === "orphans") list = list.filter((n) => n.inlinks === 0 || n.status?.includes("orphan"));
    if (activeTab === "redirects") list = list.filter((n) => n.status?.includes("redirect"));
    if (activeTab === "hubs") list = list.filter((n) => n.inlinks >= 50);
    if (activeTab === "impact") list = list.filter((n) => n.inlinks >= 80 || (n.pils ?? 0) >= 85);
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter((n) => (n.title || "").toLowerCase().includes(qq) || n.path.toLowerCase().includes(qq));
    }
    return list;
  }, [nodes, activeTab, q]);

  const total = filtered.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8);
  const endIndex = Math.min(total - 1, Math.ceil((scrollTop + VIEWPORT_H) / ROW_HEIGHT) + 8);
  const windowed = filtered.slice(startIndex, endIndex + 1);

  // selection logic
  const lastClicked = useRef<number | null>(null);
  const toggleSelect = (nodeId: string, relativeIndex: number, e: React.MouseEvent) => {
    const absoluteIndex = startIndex + relativeIndex;
    if ((e as any)?.shiftKey && lastClicked.current !== null) {
      const [a, b] =
        absoluteIndex < lastClicked.current
          ? [absoluteIndex, lastClicked.current]
          : [lastClicked.current, absoluteIndex];
      const ids: string[] = [];
      for (let i = a; i <= b; i++) ids.push(filtered[i]?.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids.filter(Boolean)])));
    } else if ((e as any)?.metaKey || (e as any)?.ctrlKey) {
      setSelectedIds((prev) => (prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]));
      lastClicked.current = absoluteIndex;
    } else {
      setSelectedIds((prev) => (prev.length === 1 && prev[0] === nodeId ? [] : [nodeId]));
      lastClicked.current = absoluteIndex;
    }
  };


  const onOpenInspectorLocal = (node: any) => { onOpenInspector?.(node); };
  const onCenterNodeLocal   = (node: any) => { onCenterNode?.(node); };
  // keyboard navigation (listbox)
  const onKeyDownList = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, total - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === " ") {
      e.preventDefault();
      const node = filtered[cursor];
      if (!node) return;
      const idx = cursor - startIndex;
      toggleSelect(node.id, Math.max(0, idx), e as any);
    }
    if (e.key === "Escape") setSelectedIds([]);
  };

  // keep cursor in view
  useEffect(() => {
    const top = cursor * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < scrollTop) setScrollTop(top);
    else if (bottom > scrollTop + VIEWPORT_H) setScrollTop(bottom - VIEWPORT_H);
  }, [cursor]); // eslint-disable-line

  // Scroll helpers
  const scrollByDelta = (delta: number) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ top: delta, behavior: "smooth" });
  };



  return (
    <div
      className="h-full flex"
      style={{
        ...rootVars,
        background: TOKENS.panel,
        borderRight: `1px solid ${TOKENS.borderLight}`,
        width: expanded ? 280 : 72,
        transition: "width 200ms ease",
      }}
      aria-label="Left rail: Node list and legend"
    >
      {/* Collapser */}
      <div className="absolute -right-3 top-3 z-10">
        <button
          className="h-6 w-6 rounded-full border flex items-center justify-center bg-white"
          style={{ borderColor: TOKENS.border }}
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse left rail" : "Expand left rail"}
        >
          {expanded ? (
            <ChevronLeft size={16} color={TOKENS.muted} />
          ) : (
            <ChevronRight size={16} color={TOKENS.muted} />
          )}
        </button>
      </div>

      <div className="flex flex-col w-full h-full relative">
        {/* Inline scrollbar styling */}
        <style>{`
          .wr-scroll::-webkit-scrollbar{ width: 10px; }
          .wr-scroll::-webkit-scrollbar-track{ background: var(--wr-app, #F5F7FA); }
          .wr-scroll::-webkit-scrollbar-thumb{ background: var(--wr-border, #E5E7EB); border-radius: 6px; }
          .wr-scroll:hover::-webkit-scrollbar-thumb{ background: var(--wr-muted, #6B7280); }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 sticky top-0 bg-white"
          style={{ background: TOKENS.panel, borderBottom: `1px solid ${TOKENS.borderLight}` }}
        >
          {expanded ? (
            <>
              <button
                className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2"
                style={{ borderRadius: TOKENS.radius, outlineColor: TOKENS.brand }}
                aria-label="Collapse rail"
                onClick={() => setExpanded(false)}
              >
                <ChevronLeft size={18} />
              </button>

              {/* Title + Search */}
              <div className="text-[13px]" style={{ color: TOKENS.text }}>
                <div className="flex items-center gap-2 pr-1">
                  <ListTree className="h-4 w-4" style={{ color: TOKENS.brand }} />
                  <span className="font-medium">Pages</span>
                </div>
              </div>

              <div className="flex-1 relative">
                <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                <input
                  aria-label="Search pages, urls or anchors"
                  placeholder="Search pages, URL or anchor…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-2 text-sm rounded border focus:outline-none focus:ring-2"
                  style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius, outlineColor: TOKENS.brand }}
                />
              </div>

              <button
                className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                style={{ borderRadius: TOKENS.radius }}
                title="Save current view"
                aria-label="Save current view"
              >
                <BookmarkPlus size={18} color={TOKENS.brand} />
              </button>

              <button
                className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                style={{ borderRadius: TOKENS.radius }}
                title="Legend"
                aria-label="Legend"
              >
                <Info size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                className="p-1 rounded hover:bg-gray-100"
                style={{ borderRadius: TOKENS.radius }}
                onClick={() => setExpanded(true)}
                aria-label="Expand rail"
              >
                <ChevronRight size={18} />
              </button>
              <ListTree className="h-4 w-4" style={{ color: TOKENS.brand }} aria-hidden />
            </>
          )}
        </div>

        {/* Quick Tabs */}
        {expanded && (
          <div className="px-3 py-2 flex gap-2 overflow-x-auto">
            {[
              { key: "all", label: "All" },
              { key: "hubs", label: "Hubs" },
              { key: "orphans", label: "Orphans" },
              { key: "redirects", label: "Redirects" },
              { key: "impact", label: "High-impact" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={cx(
                  "px-2 py-1 text-xs border rounded whitespace-nowrap cursor-pointer",
                  activeTab === t.key ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white"
                )}
                style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}
                aria-pressed={activeTab === (t.key as any)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* List Header (legend) */}
        <div
          className="px-3 py-2 text-xs text-gray-500 sticky top-10 flex items-center bg-white justify-between"
          style={{ background: TOKENS.panel }}
        >
          <span>
            {total.toLocaleString()} pages • Tab:{" "}
            {{
              all: "All",
              hubs: "Hubs",
              orphans: "Orphans",
              redirects: "Redirects",
              impact: "High-impact",
            }[activeTab]}
          </span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ListTree size={14} />
              <span>List</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <MousePointer size={14} />
              <span>Select</span>
            </span>
          </span>
        </div>

        {/* Virtualized List + Scroll Controls */}
        <div className="relative flex-1" style={{ minHeight: 0 }}>
          <div
            ref={listRef}
            role="listbox"
            aria-label="Node list"
            tabIndex={0}
            onKeyDown={onKeyDownList}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            className="wr-scroll overflow-y-auto overflow-x-hidden outline-none h-full"
            // style={{ height: VIEWPORT_H }} 
          >
            <div style={{ height: total * ROW_HEIGHT, position: "relative" }}>
              {windowed.map((node, i) => {
                const absoluteIndex = startIndex + i;
                const top = absoluteIndex * ROW_HEIGHT;
                const selected = selectedIds.includes(node.id);
                const focused = cursor === absoluteIndex;
                return (
                  <NodeRow
                    key={node.id}
                    node={node}
                    selected={selected}
                    focused={focused}
                    top={top}
                    ROW_HEIGHT={ROW_HEIGHT}
                    toggleSelect={toggleSelect}
                    index={i}
                    onOpenInspector={onOpenInspectorLocal}
                    onCenterNode={onCenterNodeLocal}
                    onOpenMenu={openMenu}
                  />
                );
              })}
            </div>
          </div>
 
        </div>

        {/* Rail-local bulk bar */}
        {!!selectedIds.length && (
          <div className="p-2 border-t" style={{ borderColor: TOKENS.borderLight }}>
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                <span className="font-medium">{selectedIds.length}</span> selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 rounded text-white cursor-pointer"
                  style={{ background: TOKENS.brand, borderRadius: TOKENS.radius }}
                  onClick={openTaskForSelection}
                >
                  Create Task
                </button>
<button
  className="px-2 py-1 rounded border"
  style={{ borderColor: TOKENS.brand, color: TOKENS.brand, borderRadius: TOKENS.radius,
           opacity: isDisabled('replace') ? 0.5 : 1, cursor: isDisabled('replace') ? 'not-allowed' : 'pointer' }}
  disabled={isDisabled('replace')}
  onClick={() => { if (!isDisabled('replace')) alert("Open Replace Link Drawer (mock)"); }}
>
  Replace Links
</button>

                <button
                  className="px-2 py-1 rounded border"
                  style={{
                    borderColor: TOKENS.border,
                    borderRadius: TOKENS.radius,
                    opacity: isDisabled('export') ? 0.5 : 1,
                    cursor: isDisabled('export') ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isDisabled('export')}
                  onClick={() => { if (!isDisabled('export')) alert(`Exporting ${selectedIds.length} selected nodes…`); }}
                >
                  Export Selected
                </button>
                <button
                  className="px-2 py-1 rounded border cursor-pointer"
                  style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}
                  onClick={() => alert("Marked priority (mock)")}
                >
                  Mark Priority
                </button>
                <button
                  className="px-2 py-1 text-gray-500 hover:underline cursor-pointer"
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context menu portal */}
      <ActionsMenu open={menu.open} x={menu.x} y={menu.y} onClose={closeMenu} onAction={handleMenuAction} node={menu.node} />
    </div>
  );
}
