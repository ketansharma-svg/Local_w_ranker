"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  ReferenceArea,
  LabelList,
} from "recharts";
import {
  BarChart3,
  Download,
  Laptop,
  Smartphone,
  Tablet as TabletIcon,
  Layers,
  ChevronDown,
  Globe,
} from "lucide-react";
import PageAnalyzer from "./page-drawer/PageAnalyzer";

/* =============================================================================
 * TOKENS / FONTS
 * ========================================================================== */
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  valueBlueSoft: "#5CA8FF",
  pastel: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#10B981",
  violet: "#7C3AED",
};
const FONT_STACK =
  'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif';

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

type Device = "mobile" | "desktop";
type SizeBy = "clicks28d" | "estTraffic28d" | "backlinks";

export interface MatrixPoint {
  pageUrl: string;
  seoScore: number; // 0–100 (color band)
  healthScore: number; // 0–100 (Y)
  visibility: number; // 0–100 (X)
  clicks28d?: number; // primary size metric
  estTraffic28d?: number; // fallback size
  backlinks?: number;
  section?: string; // e.g. "/blog/"
  lastAuditedAt?: string; // ISO
  device: Device;
}

/* =============================================================================
 * HELPERS
 * ========================================================================== */
const bandColor = (seo: number) =>
  seo < 50 ? TK.red : seo < 75 ? TK.amber : TK.green;

const pointSize = (p: MatrixPoint, by: SizeBy) => {
  const val =
    by === "backlinks"
      ? p.backlinks ?? 0
      : by === "estTraffic28d"
      ? p.estTraffic28d ?? 0
      : p.clicks28d ?? p.estTraffic28d ?? 0;
  return Math.max(8, Math.sqrt(val + 1) * 1.8);
};

const wrScore = (p: MatrixPoint) =>
  Math.round((p.healthScore + p.visibility) / 2); // simple, transparent score

const fmtInt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(n);

/* =============================================================================
 * DEMO DATA
 * ========================================================================== */
const DEMO: MatrixPoint[] = [
  { pageUrl: "/blog/seo-checklist", seoScore: 82, healthScore: 86, visibility: 42, clicks28d: 960, backlinks: 28, section: "/blog/", lastAuditedAt: "2025-08-17T09:14:00Z", device: "mobile" },
  { pageUrl: "/services/seo", seoScore: 76, healthScore: 92, visibility: 71, clicks28d: 2100, backlinks: 83, section: "/services/", lastAuditedAt: "2025-08-28T12:00:00Z", device: "mobile" },
  { pageUrl: "/pricing", seoScore: 63, healthScore: 58, visibility: 18, clicks28d: 340, backlinks: 10, section: "/", lastAuditedAt: "2025-07-30T12:00:00Z", device: "mobile" },
  { pageUrl: "/blog/rank-tracker-guide", seoScore: 88, healthScore: 78, visibility: 33, clicks28d: 540, backlinks: 19, section: "/blog/", lastAuditedAt: "2025-08-25T12:00:00Z", device: "mobile" },
  { pageUrl: "/contact", seoScore: 54, healthScore: 44, visibility: 11, estTraffic28d: 120, backlinks: 4, section: "/", lastAuditedAt: "2025-08-02T12:00:00Z", device: "mobile" },
  { pageUrl: "/academy/seo-course", seoScore: 79, healthScore: 88, visibility: 64, clicks28d: 1320, backlinks: 41, section: "/academy/", lastAuditedAt: "2025-08-20T12:00:00Z", device: "mobile" },
  { pageUrl: "/blog/cwv-guide", seoScore: 48, healthScore: 69, visibility: 56, clicks28d: 720, backlinks: 9, section: "/blog/", lastAuditedAt: "2025-08-22T12:00:00Z", device: "mobile" },
  { pageUrl: "/product/wranker", seoScore: 91, healthScore: 94, visibility: 85, clicks28d: 3300, backlinks: 145, section: "/product/", lastAuditedAt: "2025-09-01T12:00:00Z", device: "mobile" },
  { pageUrl: "/blog/structured-data", seoScore: 72, healthScore: 49, visibility: 67, clicks28d: 880, backlinks: 18, section: "/blog/", lastAuditedAt: "2025-08-15T12:00:00Z", device: "mobile" },
  { pageUrl: "/blog/local-seo", seoScore: 57, healthScore: 81, visibility: 29, clicks28d: 620, backlinks: 13, section: "/blog/", lastAuditedAt: "2025-08-10T12:00:00Z", device: "mobile" },
  // desktop variants
  { pageUrl: "/services/seo", seoScore: 76, healthScore: 95, visibility: 74, clicks28d: 1280, backlinks: 83, section: "/services/", lastAuditedAt: "2025-08-28T12:00:00Z", device: "desktop" },
  { pageUrl: "/product/wranker", seoScore: 91, healthScore: 96, visibility: 87, clicks28d: 2100, backlinks: 145, section: "/product/", lastAuditedAt: "2025-09-01T12:00:00Z", device: "desktop" },
];

/* =============================================================================
 * MICRO UI — Chips / Dropdown / Toggle / Export
 * ========================================================================== */
function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
      style={{
        borderColor: TK.border,
        background: active ? "rgba(0,140,205,0.08)" : "#FFF",
        boxShadow: active ? "inset 0 0 0 1px rgba(0,140,205,.28)" : "none",
      }}
      aria-pressed={active}
      type="button"
    >
      {children}
    </button>
  );
}

function DropdownChip({
  icon,
  label,
  valueLabel,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  valueLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm cursor-pointer"
        style={{ borderColor: TK.border, background: "#FFF" }}
        aria-expanded={open}
      >
        {icon}
        <span className="font-medium">{label}</span>
        {valueLabel && <span className="text-gray-600">• {valueLabel}</span>}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 min-w-[220px] rounded-md border bg-white p-1 shadow-lg"
          style={{ borderColor: TK.border }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-2 text-sm hover:bg-gray-50"
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
      {active && (
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#10B981" }} />
      )}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 cursor-pointer"
      title={label}
    >
      <span
        className={cx(
          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        )}
      >
        <span
          className={cx(
            "absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0"
          )}
        />
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

function ExportDropdown({
  onCSV,
  onPNG,
}: {
  onCSV: () => void;
  onPNG: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 cursor-pointer"
        style={{ borderColor: TK.border, color: TK.text }}
        title="Export"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" style={{ color: TK.brand }} />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>
      {open && (
        <div
          className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-md border bg-white text-xs shadow-lg"
          style={{ borderColor: TK.border }}
          role="menu"
        >
          <button onClick={onCSV} className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer">
            CSV (points)
          </button>
          <button onClick={onPNG} className="block w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer">
            PNG (chart)
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 * PORTALED SMART POPOVER (ensures on-top visibility)
 * ========================================================================== */
function PortalTooltipShell({
  x,
  y,
  children,
  width = 280,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  width?: number;
}) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 2147483647,
        pointerEvents: "none",
        isolation: "isolate",
      }}
    >
      <div
        className="rounded-md p-2 text-xs shadow ring-1 ring-black/10"
        style={{
          backgroundColor: "#ffffff",
          border: `1px solid ${TK.border}`,
          color: TK.text,
          borderRadius: 8,
          width,
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{ width: 10, height: 10, background: color }}
    />
  );
}

/* Small circular gauge for WR score (0–100) */
function MiniGauge({ value, size = 28, stroke = TK.valueBlue }: { value: number; size?: number; stroke?: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`WR ${pct}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill={TK.text}
      >
        {Math.round(pct)}
      </text>
    </svg>
  );
}

function MatrixTooltip({
  active,
  payload,
  coordinate,
  containerRect,
  domainHost,
}: any & { containerRect?: DOMRect | null; domainHost?: string }) {
  if (!active || !payload?.length || !containerRect || !coordinate) return null;
  const p = payload[0]?.payload as MatrixPoint | undefined;
  if (!p) return null;

  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;
  const traffic = p.clicks28d ?? p.estTraffic28d ?? 0;
  const wr = wrScore(p);

  return (
    <PortalTooltipShell x={x} y={y} width={300}>
      <div className="flex items-center gap-2 mb-1">
        <img
          src="/favicon.ico"
          alt="favicon"
          className="h-3.5 w-3.5 rounded-sm"
          style={{ objectFit: "cover" }}
        />
        <span className="font-medium truncate" title={`${domainHost ?? "domain"}${p.pageUrl}`}>
          {(domainHost ?? "") + p.pageUrl}
        </span>
        <span className="ml-auto">
          <MiniGauge value={wr} />
        </span>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: TK.muted }}>
        <Dot color={bandColor(p.seoScore)} />
        <span>SEO Score</span>
        <span className="font-semibold" style={{ color: TK.text }}>{p.seoScore}</span>

        <Dot color={TK.valueBlue} />
        <span>Health</span>
        <span className="font-semibold" style={{ color: TK.text }}>{p.healthScore}</span>

        <Dot color={TK.valueBlueSoft} />
        <span>Visibility</span>
        <span className="font-semibold" style={{ color: TK.text }}>{p.visibility}</span>

        <Dot color={TK.green} />
        <span>{p.clicks28d ? "Clicks (28d)" : "Est. Traffic (28d)"}</span>
        <span className="font-semibold" style={{ color: TK.text }}>{fmtInt(traffic)}</span>

        {typeof p.backlinks === "number" && (
          <>
            <Dot color={TK.violet} />
            <span>Backlinks</span>
            <span className="font-semibold" style={{ color: TK.text }}>{fmtInt(p.backlinks)}</span>
          </>
        )}
      </div>

      {p.lastAuditedAt && (
        <div className="mt-1 text-[11px]" style={{ color: TK.muted }}>
          Last audit: {new Date(p.lastAuditedAt).toLocaleString()}
        </div>
      )}
    </PortalTooltipShell>
  );
}

/* =============================================================================
 * LASSO SELECTION
 * ========================================================================== */
function useRectSelect() {
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number; done?: 1 } | null>(null);
  const start = (e: React.MouseEvent) => {
    if (!e.shiftKey) return;
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setDrag({ x0: e.clientX - r.left, y0: e.clientY - r.top, x1: e.clientX - r.left, y1: e.clientY - r.top });
  };
  const move = (e: React.MouseEvent) => {
    if (!drag) return;
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setDrag({ ...drag, x1: e.clientX - r.left, y1: e.clientY - r.top });
  };
  const end = () => setDrag((d) => (d ? { ...d, done: 1 } : d));
  const clear = () => setDrag(null);
  return { drag, start, move, end, clear };
}
function useShiftPressed() {
  const [isDown, setIsDown] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsDown(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsDown(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
  return isDown;
}
function withinRectDomain(
  p: MatrixPoint,
  rect: { x0: number; y0: number; x1: number; y1: number },
  plot: { left: number; top: number; width: number; height: number }
) {
  const xMinPx = Math.min(rect.x0, rect.x1);
  const xMaxPx = Math.max(rect.x0, rect.x1);
  const yMinPx = Math.min(rect.y0, rect.y1);
  const yMaxPx = Math.max(rect.y0, rect.y1);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const pxToX = (px: number) => ((clamp(px, plot.left, plot.left + plot.width) - plot.left) / plot.width) * 100;
  const pxToY = (py: number) => (1 - (clamp(py, plot.top, plot.top + plot.height) - plot.top) / plot.height) * 100;

  const x0d = pxToX(xMinPx);
  const x1d = pxToX(xMaxPx);
  const y0d = pxToY(yMaxPx);
  const y1d = pxToY(yMinPx);
  return p.visibility >= x0d && p.visibility <= x1d && p.healthScore >= y0d && p.healthScore <= y1d;
}

/* =============================================================================
 * MAIN — Opportunity Matrix (Charts)
 * ========================================================================== */
export default function OpportunityMatrixSection({
  domainHost = "wranker.com",
}: {
  domainHost?: string;
}) {
  // Controls
  const [device, setDevice] = useState<Device>("mobile");
  const [section, setSection] = useState<string>("all");
  const [sizeBy, setSizeBy] = useState<SizeBy>("clicks28d");
  const [labelTopN, setLabelTopN] = useState<number>(5);
  const [showQuadrants, setShowQuadrants] = useState<boolean>(true);

  // Data
  const data = useMemo(() => {
    const raw = DEMO.filter((d) => d.device === device && (section === "all" || d.section === section));
    return raw.map((d) => ({ ...d, size: pointSize(d, sizeBy) }));
  }, [device, section, sizeBy]);

  const labelSet = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => (b.clicks28d ?? b.estTraffic28d ?? 0) - (a.clicks28d ?? a.estTraffic28d ?? 0)
    );
    return new Set(sorted.slice(0, Math.max(0, labelTopN)).map((d) => d.pageUrl));
  }, [data, labelTopN]);

  // Lasso
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { drag, start, move, end, clear } = useRectSelect();
  const isShiftDown = useShiftPressed();

  const selected = useMemo(() => {
    if (!drag || !drag.done || !containerRef.current) return [];
    const M = { top: 18, right: 16, bottom: 40, left: 58 };
    const plot = {
      left: M.left,
      top: M.top,
      width: containerRef.current.clientWidth - M.left - M.right,
      height: containerRef.current.clientHeight - M.top - M.bottom,
    };
    return data.filter((p) => withinRectDomain(p, drag, plot));
  }, [drag, data]);

  // Export helpers
  async function exportPNG() {
    try {
      const root = containerRef.current;
      if (!root) return;
      const svg = root.querySelector("svg");
      if (!svg) return;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });
      const bbox = root.getBoundingClientRect();
      const width = Math.max(900, Math.ceil(bbox.width));
      const height = Math.max(460, Math.ceil(bbox.height));
      const canvas = document.createElement("canvas");
      const scale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `opportunity-matrix-${device}-${section}.png`;
      a.click();
    } catch {
      // no-op
    }
  }
  function exportCSV() {
    const header = [
      "url",
      "device",
      "section",
      "seoScore",
      "healthScore",
      "visibility",
      "clicks28d",
      "estTraffic28d",
      "backlinks",
      "wrScore",
      "lastAuditedAt",
    ];
    const lines = [header.join(",")];
    data.forEach((p) => {
      lines.push(
        [
          `${domainHost}${p.pageUrl}`,
          p.device,
          p.section ?? "",
          p.seoScore,
          p.healthScore,
          p.visibility,
          p.clicks28d ?? "",
          p.estTraffic28d ?? "",
          p.backlinks ?? "",
          wrScore(p),
          p.lastAuditedAt ?? "",
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opportunity-matrix-${device}-${section}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Legend bands
  const bandLegend = (
    <div className="text-[12px] flex items-center gap-3" style={{ color: TK.muted }}>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: TK.green }} />
        SEO ≥ 75
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: TK.amber }} />
        50–74
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: TK.red }} />
        &lt; 50
      </span>
    </div>
  );

  const [drawerRow, setDrawerRow] = useState(false);
  const openDrawer = () => {
    setDrawerRow(true); // You can set the data here if needed
  };

  // This function will handle closing the drawer
  const closeDrawer = () => {
    setDrawerRow(false);
  };

  return (
    <section
      className="w-full py-4 px-4"
      style={{ fontFamily: FONT_STACK }}
      aria-label="Opportunity Matrix — Visibility × Health"
    >
           {drawerRow && (
          <PageAnalyzer          
          open={drawerRow}
            onClose={closeDrawer} />
      )}
      {/* Header */}
      <div
        className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-md border bg-white p-3"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" color={TK.brand} />
          <h3 className="text-[16px] font-semibold" style={{ color: TK.text }}>
            Opportunity Matrix — Visibility × Health
          </h3>
          {/* Domain chip with favicon */}
          <span
            className="ml-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            style={{ borderColor: TK.border, background: "#FFF" }}
            title={domainHost}
          >
            <img
              src="/favicon.ico"
              alt="domain favicon"
              className="h-3.5 w-3.5 rounded-sm"
              style={{ objectFit: "cover" }}
            />
            <span style={{ color: TK.muted }}>{domainHost}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Device chip */}
          <DropdownChip
            icon={<Smartphone className="h-4 w-4" color={TK.brand} />}
            label="Device"
            valueLabel={device}
          >
            <MenuItem
              active={device === "mobile"}
              onClick={() => setDevice("mobile")}
              icon={<Smartphone className="h-4 w-4" />}
            >
              Mobile
            </MenuItem>
            <MenuItem
              active={device === "desktop"}
              onClick={() => setDevice("desktop")}
              icon={<Laptop className="h-4 w-4" />}
            >
              Desktop
            </MenuItem>
          </DropdownChip>

          {/* Section chip */}
          <DropdownChip
            icon={<Layers className="h-4 w-4" color={TK.brand} />}
            label="Section"
            valueLabel={section}
          >
            {["all", "/blog/", "/services/", "/product/", "/", "/academy/"].map((s) => (
              <MenuItem key={s} active={section === s} onClick={() => setSection(s)} icon={<Globe className="h-4 w-4" />}>
                {s}
              </MenuItem>
            ))}
          </DropdownChip>

          {/* Size by */}
          <DropdownChip
            icon={<BarChart3 className="h-4 w-4" color={TK.brand} />}
            label="Size by"
            valueLabel={
              sizeBy === "clicks28d"
                ? "Clicks (28d)"
                : sizeBy === "estTraffic28d"
                ? "Est. Traffic"
                : "Backlinks"
            }
          >
            <MenuItem active={sizeBy === "clicks28d"} onClick={() => setSizeBy("clicks28d")}>
              Clicks (28d)
            </MenuItem>
            <MenuItem active={sizeBy === "estTraffic28d"} onClick={() => setSizeBy("estTraffic28d")}>
              Est. Traffic (28d)
            </MenuItem>
            <MenuItem active={sizeBy === "backlinks"} onClick={() => setSizeBy("backlinks")}>
              Backlinks
            </MenuItem>
          </DropdownChip>

          {/* Labels top N */}
          <DropdownChip
            icon={<BarChart3 className="h-4 w-4" color={TK.brand} />}
            label="Labels"
            valueLabel={`Top ${labelTopN}`}
          >
            <div className="px-2 py-1">
              <div className="text-[12px] mb-2" style={{ color: TK.muted }}>
                Show labels for top N pages by traffic
              </div>
              {[0, 3, 5, 8, 10, 15, 20].map((n) => (
                <MenuItem key={n} active={labelTopN === n} onClick={() => setLabelTopN(n)}>
                  Top {n}
                </MenuItem>
              ))}
            </div>
          </DropdownChip>

          {/* Quadrants toggle */}
          <ToggleSwitch checked={showQuadrants} onChange={setShowQuadrants} label="Quadrants" />

          {/* Export */}
          <ExportDropdown onCSV={exportCSV} onPNG={exportPNG} />
        </div>
      </div>

      {/* Chart Card */}
      <div
        className="relative w-full"
        ref={containerRef}
        style={{
          height: 460,
          background: TK.card,
          border: `1px solid ${TK.border}`,
          borderRadius: 10,
        }}
      >
        <div className="absolute z-10 left-3 top-2 text-[12px]" style={{ color: TK.muted }}>
          <span className="font-medium">Hint:</span> Hold{" "}
          <kbd className="px-1 border rounded" style={{ borderColor: TK.border }}>
            Shift
          </kbd>{" "}
          and drag to lasso. Click a bubble to open the page drawer.
        </div>

        {/* Selection rectangle */}
        {drag && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: Math.min(drag.x0, drag.x1),
              top: Math.min(drag.y0, drag.y1),
              width: Math.abs(drag.x1 - drag.x0),
              height: Math.abs(drag.y1 - drag.y0),
              border: `1px dashed ${TK.valueBlue}`,
              background: TK.pastel,
              opacity: 0.35,
              borderRadius: 4,
              zIndex: 3,
            }}
          />
        )}

        {/* Lasso overlay */}
        <div
          className="absolute inset-0"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          style={{
            pointerEvents: isShiftDown ? "auto" : "none",
            cursor: isShiftDown ? "crosshair" : "default",
            zIndex: isShiftDown ? 2 : 0,
          }}
        />

        <ResponsiveContainer>
          <ScatterChart margin={{ top: 18, right: 16, bottom: 44, left: 58 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="visibility"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 12, fill: "#475569" }}
              stroke="#cbd5e1"
              label={{
                value: "Visibility (0–100)",
                position: "bottom",
                offset: 26,
                style: { fill: "#475569", fontSize: 12, fontFamily: FONT_STACK },
              }}
            />
            <YAxis
              type="number"
              dataKey="healthScore"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 12, fill: "#475569" }}
              stroke="#cbd5e1"
              label={{
                value: "Page Health (0–100)",
                angle: -90,
                position: "insideLeft",
                offset: -4,
                style: { fill: "#475569", fontSize: 12, fontFamily: FONT_STACK },
              }}
            />
            <ZAxis type="number" dataKey="size" range={[60, 360]} />

            {/* Quadrants */}
            {showQuadrants && (
              <>
                <ReferenceLine x={50} stroke="#CBD5E1" />
                <ReferenceLine y={75} stroke="#CBD5E1" />
                <ReferenceArea x1={50} y1={100} x2={100} y2={75} fill={TK.green} fillOpacity={0.06} />
                <ReferenceArea x1={0} y1={100} x2={50} y2={75} fill={TK.valueBlue} fillOpacity={0.05} />
                <ReferenceArea x1={0} y1={75} x2={50} y2={0} fill={TK.amber} fillOpacity={0.06} />
                <ReferenceArea x1={50} y1={75} x2={100} y2={0} fill={TK.red} fillOpacity={0.05} />
              </>
            )}

            <RTooltip
              cursor={{ stroke: TK.pastel, strokeWidth: 1 }}
              content={(tp: any) => (
                <MatrixTooltip
                  {...tp}
                  containerRect={containerRef.current?.getBoundingClientRect() ?? null}
                  domainHost={domainHost}
                />
              )}
              wrapperStyle={{ visibility: "hidden" }}
              allowEscapeViewBox={{ x: true, y: true }}
            />

            <Scatter
              data={data}
              shape={(props: any) => {
                const { cx, cy, payload, size } = props || {};
                    if (!payload) {
      return <g />; // empty valid React element
    }
                const r = Math.sqrt(size ?? 64) / 2;
                const c = bandColor(payload.seoScore);
                return (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={openDrawer}
                  >
                    <circle cx={cx} cy={cy} r={r} fill={c} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
                    <circle cx={cx} cy={cy} r={r + 2} fill="transparent" stroke="rgba(0,0,0,0.06)" />
                  </g>
                );
              }}
            >
              <LabelList
                dataKey="pageUrl"
                formatter={(v: string, entry?: any) => {
                  const url = entry?.payload?.pageUrl as string | undefined;
                  if (!url || !labelSet.has(url)) return "";
                  return (v || "").toString().replace(/^\/|\/$/g, "");
                }}
                position="top"
                style={{ fontSize: 11, fill: "#475569", fontFamily: FONT_STACK }}
              />
            </Scatter>

            {/* SEO band legend (clean, outside grid via absolute header) */}
          </ScatterChart>
        </ResponsiveContainer>

        {/* Inline legend (top-right) */}
        <div className="absolute right-3 top-2">{bandLegend}</div>
      </div>

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[13px]" style={{ color: TK.muted }}>
          Selected: <b>{selected.length}</b>{" "}
          {selected.length
            ? "• " +
              selected
                .slice(0, 3)
                .map((s) => s.pageUrl)
                .join(", ") + (selected.length > 3 ? "…" : "")
            : ""}
        </div>
        <div className="flex items-center gap-6">
          <div className="inline-flex items-center gap-2 text-[12px]" style={{ color: TK.muted }}>
            WR (avg):{" "}
            <MiniGauge
              value={
                selected.length
                  ? Math.round(
                      selected.reduce((s, p) => s + wrScore(p), 0) / Math.max(1, selected.length)
                    )
                  : Math.round(
                      data.reduce((s, p) => s + wrScore(p), 0) / Math.max(1, data.length)
                    )
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
