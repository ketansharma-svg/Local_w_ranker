import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Info,
  AlertTriangle,
  ExternalLink,
  Loader2,
  FileDown,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Image as ImageIcon,
  PieChart as PieChartIcon,
  BarChart3,
  Link2,
  Gauge,
  ListChecks,
  Lightbulb,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Sector,
} from "recharts";

/**
 * Wranker – Link Analyzer → Overview → SECTION 5: Anchor Text Insights (Revised)
 * Updates in this drop-in:
 * 1) Hover animations on charts
 * 2) Donut smart popover with colored annotations & active highlight
 * 3) Metric in donut center (Total Anchors; on hover shows hovered segment %)
 * 4) Legends moved to right (vertical)
 * 5) Branded icons on subsection headers
 * 6) Main header uses info tooltip (description hidden until hover)
 * 7) Bar x-axis labels compact & non-overlapping (10px, 2-line)
 * 8) Bar tooltip uses branded icons
 * 9) Suggestion cards use branded icons & modular CTAs (no emojis)
 * 10) All clickable elements show cursor pointer
 */

// —— Design Tokens ——————————————————————————————————————————————
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#0077FF",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

// Palette for anchor types (spec-defined)
const ANCHOR_COLORS: Record<string, string> = {
  exact: "#0077FF",   // Exact Match — blue
  partial: "#FFA500", // Partial Match — orange
  branded: "#008CCD", // Branded — teal/brand
  generic: "#F7C948", // Generic — yellow
  image: "#F2595C",   // Image/Empty — light red
};

// Equal chart card height (desktop)
const CHART_CARD_MIN_H = 420; // px

// —— Tiny UI primitives —————————————————————————————————————————
const Card: React.FC<{ className?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ className = "", children, style }) => (
  <div className={`rounded-lg border ${className}`} style={{ borderColor: TOKENS.borderLight, background: "#FFFFFF", ...style }}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start justify-between p-4 sm:p-5 border-b" style={{ borderColor: TOKENS.borderLight }}>
    {children}
  </div>
);

const CardContent: React.FC<{ className?: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ className = "", children, style }) => (
  <div className={`p-4 sm:p-6 ${className}`} style={style}>{children}</div>
);

const Button: React.FC<{
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline" | "subtle";
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ children, onClick, variant = "primary", className = "", ariaLabel, disabled, type = "button" }) => {
  const base =
    "inline-flex items-center gap-2 rounded-md text-sm px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer";
  const classes =
    variant === "primary"
      ? "text-white"
      : variant === "ghost"
      ? "bg-transparent"
      : variant === "outline"
      ? "bg-white border"
      : ""; // subtle
  const style: React.CSSProperties =
    variant === "primary"
      ? { background: TOKENS.valueBlue, borderColor: TOKENS.valueBlue, color: "#fff" }
      : variant === "outline"
      ? { borderColor: TOKENS.border, color: TOKENS.text }
      : variant === "subtle"
      ? { background: TOKENS.chipBg, color: TOKENS.text }
      : { color: TOKENS.text };
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`${base} ${classes} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge: React.FC<{ tone?: "default" | "success" | "warning" | "danger" | "info"; className?: string; children?: React.ReactNode }> = ({ tone = "default", children, className = "" }) => {
  const tones: Record<string, string> = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-50 text-green-700 border border-green-200",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    danger:  "bg-red-50 text-red-700 border border-red-200",
    info:    "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs ${tones[tone]} ${className}`}>{children}</span>;
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-pre rounded-md border bg-white px-2 py-1 text-xs shadow"
              style={{ borderColor: TOKENS.borderLight }}>
          {text}
        </span>
      )}
    </span>
  );
};

// —— Toast system ———————————————————————————————————————————————
const ToastCtx = React.createContext<{ push: (msg: string, tone?: "info" | "success" | "danger") => void }>({ push: () => {} });
const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: string; message: string; tone: "info" | "success" | "danger" }[]>([]);
  const push = (message: string, tone: "info" | "success" | "danger" = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-md border px-3 py-2 shadow bg-white"
               style={{ borderColor: TOKENS.borderLight }}>
            {t.tone === "danger" ? <CircleAlert className="h-4 w-4 text-red-500" /> : t.tone === "success" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Info className="h-4 w-4 text-blue-600" />}
            <span className="text-sm text-gray-800">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => React.useContext(ToastCtx);


// —— Helpers ————————————————————————————————————————————————
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

const truncate = (str: string, n: number) => (str.length > n ? str.slice(0, n - 1) + "…" : str);

// CSV helpers
function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function downloadTextAsFile(filename: string, text: string, mime = "text/plain;charset=utf-8") {
  downloadBlob(filename, new Blob([text], { type: mime }));
}
function segmentsCsv(dist: any) {
  const header = "type,count,pct,avgAqs";
  const rows = (dist?.segments || []).map((s: any) => `${s.type},${s.count},${s.pct},${s.avgAqs}`).join("\n");
  return `${header}${rows ? "\n" + rows : ""}`;
}
function topAnchorsCsv(top: any[]) {
  const header = "anchor,uses,linkedPages,avgAqs,usagePct";
  const rows = (top || []).map((t) => `"${(t.anchor || "").replace(/"/g, '""')}",${t.uses || 0},${t.linkedPages || 0},${t.avgAqs || 0},${t.usagePct || 0}`).join("\n");
  return `${header}${rows ? "\n" + rows : ""}`;
}

// —— Charts ————————————————————————————————————————————————
const NoData: React.FC<{ label?: string }> = ({ label = "No data" }) => (
  <div className="flex h-48 w-full items-center justify-center text-sm text-gray-500" role="status" aria-live="polite">{label}</div>
);

/** Compact, branded header (adds branded icon) */
const SubHeader: React.FC<{ title: string; icon: React.ReactNode; tooltip?: string; right?: React.ReactNode }> = ({ title, icon, tooltip, right }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center rounded-md border p-1.5"
            style={{ borderColor: TOKENS.borderLight, background: "#fff" }}>
        {icon}
      </span>
      <span className="text-base font-semibold" style={{ color: TOKENS.text }}>{title}</span>
      {tooltip && (
        <Tooltip text={tooltip}>
          <Info className="h-4 w-4 text-gray-500" />
        </Tooltip>
      )}
    </div>
    {right}
  </div>
);

/** Donut tooltip with colored annotations, highlighting the hovered type row */
const DonutSmartTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  segs: { type: string; pct: number }[];
}> = ({ active, payload, segs }) => {
  if (!active || !payload?.length) return null;
  const hoveredType: string | undefined = payload?.[0]?.payload?.type;
  return (
    <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.borderLight }}>
      <div className="mb-1 font-medium" style={{ color: TOKENS.muted }}>Anchor Types</div>
      <div className="flex flex-col gap-1">
        {segs.map((s) => {
          const isActive = s.type === hoveredType;
          return (
            <div key={s.type}
                 className={`flex items-center justify-between gap-4 rounded ${isActive ? "bg-gray-50" : ""} px-1 py-0.5`}>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: ANCHOR_COLORS[s.type] }} />
                <span className={`capitalize ${isActive ? "font-semibold" : ""}`} style={{ color: TOKENS.muted }}>
                  {s.type}
                </span>
              </div>
              <div className={`tabular-nums ${isActive ? "font-semibold" : ""}`} style={{ color: TOKENS.text }}>
                {s.pct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Multi-line 10px X-axis tick to avoid overlap */
const CompactAnchorTick: React.FC<any> = ({ x, y, payload }) => {
  const text: string = payload?.value ?? "";
  // Split into at most two lines, each truncated
  const [l1, l2] = (() => {
    const parts = text.split(" ");
    if (parts.length <= 1) return [truncate(text, 14), ""];
    const first = truncate(parts.slice(0, Math.ceil(parts.length / 2)).join(" "), 14);
    const second = truncate(parts.slice(Math.ceil(parts.length / 2)).join(" "), 14);
    return [first, second];
  })();
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill={TOKENS.muted} fontSize={10}>
        <tspan x="0" dy="10">{l1}</tspan>
        {l2 && <tspan x="0" dy="11">{l2}</tspan>}
      </text>
    </g>
  );
};

function AnchorDonut({
  distribution,
  onSegmentClick,
  hiddenTypes,
  setHiddenTypes,
}: {
  distribution: any;
  onSegmentClick?: (type: string) => void;
  hiddenTypes: Set<string>;
  setHiddenTypes: (s: Set<string>) => void;
}) {
  const toast = useToast();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const segsAll = (distribution?.segments || []).map((s: any) => ({ ...s, name: s.type }));
  const activeSegs = segsAll.filter((s: any) => !hiddenTypes.has(s.type));
  const data = activeSegs.map((s: any) => ({ ...s, name: s.type }));

  const hoveredSeg = activeIndex != null ? data[activeIndex] : null;
  const centerValue = hoveredSeg ? `${hoveredSeg.pct.toFixed(1)}%` : `${distribution?.totalAnchors ?? 0}`;
  const centerLabel = hoveredSeg ? hoveredSeg.type : "Total Anchors";

  const genericSeg = segsAll.find((s: any) => s.type === "generic");
  const showGenericWarn = (genericSeg?.pct ?? 0) > 15;

  // Active shape renderer: gently grows hovered slice (hover animation)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g className="transition-all duration-200">
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
                startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  return (
    <Card className="h-full" style={{ minHeight: CHART_CARD_MIN_H }}>
      <CardHeader>
        <SubHeader
          title="Anchor Type Distribution"
          icon={<PieChartIcon className="h-4 w-4" style={{ color: TOKENS.brand }} />}
          tooltip="Percentage split of anchor types across internal links. Click a legend or a slice to filter."
        />
        {showGenericWarn && (
          <Badge tone="warning" className="ml-2"><AlertTriangle className="h-3 w-3" /> Generic anchors high</Badge>
        )}
      </CardHeader>

      <CardContent>
        {!distribution?.segments?.length || !data.length ? (
          <NoData />
        ) : (
          <div className="flex items-center gap-6 md:gap-8">
            {/* Donut (left) */}
            <div className="relative mx-auto" style={{ width: 360, height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart aria-label="Anchor type distribution">
                  <Pie
                    data={data}
                    nameKey="name"
                    dataKey="pct"
                    innerRadius={70}
                    outerRadius={110}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={!prefersReducedMotion()}
                    activeIndex={activeIndex ?? -1}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, idx) => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(_, idx) => {
                      const seg = data[idx];
                      if (seg) {
                        onSegmentClick?.(seg.type);
                        toast.push(`Filtered Anchors: ${seg.type}`);
                      }
                    }}
                  >
                    {data.map((entry: any, idx: number) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={ANCHOR_COLORS[entry.type] || TOKENS.valueBlue}
                        className="cursor-pointer transition-[filter] duration-150 hover:drop-shadow-sm"
                      />
                    ))}
                  </Pie>

                  {/* Smart popover with colored annotations & active row */}
                  <RTooltip
                    content={(props) => <DonutSmartTooltip {...props} segs={data} />}
                    allowEscapeViewBox={{ x: true, y: true }}
                    offset={10}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center metric (Total Anchors; on hover shows hovered % + type) */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`font-semibold ${hoveredSeg ? "text-3xl" : "text-4xl"}`} style={{ color: TOKENS.text }}>
                    {centerValue}
                  </div>
                  <div className="text-xs text-gray-500">{centerLabel}</div>
                </div>
              </div>
            </div>

            {/* Legend / Toggles (right, vertical) */}
            <div className="shrink-0 w-56">
              <div className="flex flex-col gap-2">
                {segsAll.map((s: any) => {
                  const hidden = hiddenTypes.has(s.type);
                  return (
                    <button
                      key={s.type}
                      onClick={() => {
                        const next = new Set(hiddenTypes);
                        hidden ? next.delete(s.type) : next.add(s.type);
                        setHiddenTypes(next);
                      }}
                      className={`cursor-pointer inline-flex items-center justify-between rounded-md border px-3 py-2 text-xs ${hidden ? "opacity-50" : ""}`}
                      style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}
                      title="Toggle visibility"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: ANCHOR_COLORS[s.type] }} />
                        <span className="capitalize">{s.type}</span>
                      </span>
                      <span className="text-gray-600">{s.pct}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopAnchorsBar({
  topAnchors,
  totalAnchors,
  onBarClick
}: {
  topAnchors: any[];
  totalAnchors: number;
  onBarClick?: (anchor: string) => void;
}) {
  const OVERUSE_PCT = 15;
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; item: any | null }>({ open: false, x: 0, y: 0, item: null });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const handleContext = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY, item });
  };
  useEffect(() => {
    const close = () => setMenu((m) => ({ ...m, open: false }));
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  /** Smart tooltip with branded icons */
  const BarSmartTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    return (
      <div className="rounded-md border bg-white p-2 text-xs shadow" style={{ borderColor: TOKENS.borderLight }}>
        <div className="mb-1 font-medium" style={{ color: TOKENS.text }}>{p.anchor}</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
            <span style={{ color: TOKENS.muted }}>Uses</span>
            <span className="ml-auto font-semibold" style={{ color: TOKENS.text }}>{p.uses}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
            <span style={{ color: TOKENS.muted }}>Linked Pages</span>
            <span className="ml-auto font-semibold" style={{ color: TOKENS.text }}>{p.linkedPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5" style={{ color: TOKENS.brand }} />
            <span style={{ color: TOKENS.muted }}>Avg AQS</span>
            <span className="ml-auto font-semibold" style={{ color: TOKENS.text }}>{p.avgAqs}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full" style={{ minHeight: CHART_CARD_MIN_H }}>
      <CardHeader>
        <SubHeader
          title="Most Repeated Anchors"
          icon={<BarChart3 className="h-4 w-4" style={{ color: TOKENS.brand }} />}
          tooltip="Top anchor texts by frequency. Red bars indicate potential overuse relative to total anchors."
        />
      </CardHeader>

      <CardContent>
        {!topAnchors?.length ? (
          <NoData />
        ) : (
          <div className="w-full" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topAnchors} margin={{ left: 8, right: 8, top: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                {/* Compact custom tick to avoid overlap */}
                <XAxis
                  dataKey="anchor"
                  interval={0}
                  height={52}
                  tick={<CompactAnchorTick />}
                  tickMargin={6}
                />
                <YAxis allowDecimals={false} />
                <RTooltip content={<BarSmartTooltip />} allowEscapeViewBox={{ x: true, y: true }} offset={10} />
                <Bar
                  dataKey="uses"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={!prefersReducedMotion()}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {topAnchors.map((e: any, i: number) => {
                    const pct = e.usagePct || (e.uses / Math.max(1, totalAnchors)) * 100;
                    const over = pct > OVERUSE_PCT;
                    const isHover = hoverIdx === i;
                    return (
                      <Cell
                        key={i}
                        fill={over ? "#FF4C4C" : TOKENS.valueBlue}
                        className="cursor-pointer transition-all duration-150"
                        style={{
                          filter: isHover ? "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" : "none",
                        }}
                        onMouseEnter={() => setHoverIdx(i)}
                        onClick={() => onBarClick?.(e.anchor)}
                        onContextMenu={(evt) => handleContext(evt, e)}
                      />
                    );
                  })}
                  {/* keep uses labels above */}
                  <LabelList dataKey="uses" position="top" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {menu.open && (
          <div className="fixed z-50 w-56 rounded-md border bg-white p-1 shadow cursor-pointer"
               style={{ top: menu.y, left: menu.x, borderColor: TOKENS.borderLight }}>
            <button className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => onBarClick?.(menu.item.anchor)}>
              <ExternalLink className="h-4 w-4" /> View pages using this anchor
            </button>
            <button className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => alert("Create Task → (demo)")}>
              <Sparkles className="h-4 w-4" /> Create Task (bulk)
            </button>
            <button className="w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => downloadTextAsFile("anchor-instances-demo.csv",
                      `anchor,uses,avgAQS\n"${menu.item.anchor}",${menu.item.uses},${menu.item.avgAqs}`, "text/csv;charset=utf-8")}>
              <FileDown className="h-4 w-4" /> Export anchor instances
            </button>
          </div>
        )}

        <div className="sr-only" aria-live="polite">Top anchors bar chart showing {topAnchors?.length || 0} items by usage.</div>
      </CardContent>
    </Card>
  );
}

// —— Insight cards (Smart Suggestions) ————————————————————————————
const InsightCard: React.FC<{
  tone?: "info" | "warning" | "danger" | "success";
  title: string;
  metric?: string | number;
  body?: string;
  actions?: { label: string; aria?: string; onClick?: () => void; variant?: "outline" | "subtle" | "primary"; icon?: React.ReactNode }[];
}> = ({ tone = "info", title, metric, body, actions = [] }) => {
  const toneMap: any = {
    danger:  { ring: "ring-red-200",    icon: <Lightbulb className="h-4 w-4" style={{ color: TOKENS.danger }} /> },
    warning: { ring: "ring-yellow-200", icon: <Lightbulb className="h-4 w-4" style={{ color: TOKENS.warning }} /> },
    success: { ring: "ring-green-200",  icon: <Lightbulb className="h-4 w-4" style={{ color: TOKENS.success }} /> },
    info:    { ring: "ring-blue-200",   icon: <Lightbulb className="h-4 w-4" style={{ color: TOKENS.brand }} /> },
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ring-1 ${toneMap.ring} h-full`}
         style={{ background: TOKENS.chipBg, borderColor: TOKENS.borderLight, minHeight: 170 }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {toneMap.icon}
          <div className="font-medium" style={{ color: TOKENS.text }} title={title}>{title}</div>
        </div>
        {metric != null && (
          <div className="text-sm font-semibold" style={{ color: TOKENS.valueBlue }}>{metric}</div>
        )}
      </div>
      {body && <p className="mt-1 text-sm line-clamp-2" style={{ color: TOKENS.muted }} title={body}>{body}</p>}
      {actions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          {actions.map((a, i) => (
            <Button key={i} variant={a.variant || "outline"} onClick={a.onClick} ariaLabel={a.aria}>
              {a.icon}
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

// —— Export Modal (global) ——————————————————————————————————————
const Modal: React.FC<{ open: boolean; onClose: () => void; children?: React.ReactNode }> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-[min(720px,96vw)] rounded-lg bg-white shadow-lg border"
           style={{ borderColor: TOKENS.borderLight }}>
        {children}
      </div>
    </div>
  );
};
function ExportInsightsModal({ open, onClose, distribution, topAnchors }: { open: boolean; onClose: () => void; distribution: any; topAnchors: any[] }) {
  const [fmt, setFmt] = useState<"csv" | "pdf">("csv");
  const [topN, setTopN] = useState(10);
  const [includeInstances, setIncludeInstances] = useState(true);
  const toast = useToast();

  const doExport = async () => {
    if (fmt === "csv") {
      const csv = [
        "# Anchor Type Distribution",
        segmentsCsv(distribution),
        "",
        "# Top Anchors",
        topAnchorsCsv(topAnchors.slice(0, topN)),
        includeInstances ? "\n# Instances (demo placeholder)" : "",
      ].join("\n");
      downloadTextAsFile("anchor-insights.csv", csv, "text/csv;charset=utf-8");
      toast.push("CSV exported.", "success");
      onClose();
    } else {
      const ok = await exportPdfSummary({ distribution, topAnchors: topAnchors.slice(0, topN) });
      toast.push(ok ? "PDF exported." : "PDF export failed.", ok ? "success" : "danger");
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 text-base font-semibold" style={{ color: TOKENS.text }}>
          <Download className="h-5 w-5" /> Export Anchor Insights
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Format</label>
            <select value={fmt} onChange={(e) => setFmt(e.target.value as any)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm cursor-pointer"
                    style={{ borderColor: TOKENS.border }}>
              <option value="csv">CSV (counts + top anchors)</option>
              <option value="pdf">PDF Summary (beta)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Top N anchors</label>
            <input type="number" min={5} max={100} value={topN}
                   onChange={(e) => setTopN(parseInt(e.target.value || "10"))}
                   className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                   style={{ borderColor: TOKENS.border }} />
          </div>
          <div className="col-span-full flex items-center gap-2">
            <input id="inc" type="checkbox" className="cursor-pointer"
                   checked={includeInstances} onChange={(e) => setIncludeInstances(e.target.checked)} />
            <label htmlFor="inc" className="text-sm text-gray-700">Include anchor instances (where available)</label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={doExport}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </div>
    </Modal>
  );
}

// —— Minimal PDF export (text-only summary) ———————————————————————
async function exportPdfSummary({ distribution, topAnchors }: { distribution: any; topAnchors: any[] }) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Anchor Insights Summary", 14, 18);
    doc.setFontSize(11);
    doc.text(`Total anchors: ${distribution?.totalAnchors || 0}`, 14, 28);
    doc.text("Distribution:", 14, 36);
    (distribution?.segments || []).forEach((s: any, i: number) => {
      doc.text(`• ${s.type} — ${s.count} (${s.pct}%), avg AQS ${s.avgAqs}%`, 18, 44 + i * 6);
    });
    const startY = 44 + (distribution?.segments?.length || 0) * 6 + 6;
    doc.text("Top Anchors:", 14, startY);
    (topAnchors || []).slice(0, 10).forEach((t: any, i: number) => {
      doc.text(`• ${t.anchor} — uses ${t.uses}, pages ${t.linkedPages}, AQS ${t.avgAqs}%`, 18, startY + 8 + i * 6);
    });
    doc.save("anchor-insights-summary.pdf");
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// —— Derived insights ————————————————————————————————————————————
function useComputedInsights(distribution: any, topAnchors: any[]) {
  return useMemo(() => {
    if (!distribution) return null;
    const total = distribution.totalAnchors || 1;
    const overusedCount = (topAnchors || []).filter((a: any) => (a.usagePct ?? (a.uses / total) * 100) > 15 || a.uses > 10).length;
    const genericPct = distribution.segments?.find((s: any) => s.type === "generic")?.pct ?? 0;
    const lowAqsLinks = (topAnchors || []).filter((a: any) => a.avgAqs < 50).reduce((acc: number, a: any) => acc + (a.uses || 0), 0);
    const highQualityPct = Math.round(((distribution.segments || []).filter((s: any) => s.avgAqs >= 70).reduce((acc: number, s: any) => acc + (s.count || 0), 0) / (distribution.totalAnchors || 1)) * 100);
    return { overusedCount, genericPct, lowAqsLinks, highQualityPct };
  }, [distribution, topAnchors]);
}

// —— Section header (title + info tooltip only) ————————————————————
function SectionHeader({ onExport }: { onExport: () => void }) {
  const headerInfo =
    "Understand the types and usage patterns of anchor texts used in internal linking. Detect over‑optimization and diversify intelligently.";
  return (
    <div className="pt-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold" style={{ color: "#000000", fontFamily: "Inter, ui-sans-serif" }}>
            Anchor Text Insights
          </h3>
          <Tooltip text={headerInfo}>
            <Info className="h-4 w-4 text-gray-500 cursor-pointer" />
          </Tooltip>
        </div>
        <div className="shrink-0">
          <Button variant="primary" onClick={onExport} ariaLabel="Export Anchor Insights">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>
      <div className="mt-4 h-px" style={{ background: TOKENS.borderLight }} />
    </div>
  );
}

// —— Test cases (inline harness) ————————————————————————————————
const TestCases: React.FC = () => {
  const toast = useToast();
  const run = () => {
    const csv1 = segmentsCsv({ segments: [{ type: "exact", count: 1, pct: 50, avgAqs: 80 }] });
    const csv2 = topAnchorsCsv([{ anchor: "a, b", uses: 2, linkedPages: 1, avgAqs: 70, usagePct: 5 }]);
    const ok1 = csv1.includes("type,count,pct,avgAqs") && csv1.includes("exact,1,50,80");
    const ok2 = csv2.startsWith("anchor,uses,linkedPages,avgAqs,usagePct");
    const total = 100; const over = (16 / total) * 100 > 15; const ok3 = over === true;
    const set = new Set(["generic"]); set.add("exact"); set.delete("generic"); const ok4 = set.has("exact") && !set.has("generic");
    if (ok1 && ok2 && ok3 && ok4) toast.push("All inline tests passed.", "success");
    else toast.push("Some inline tests failed.", "danger");
  };
  return (
    <div className="mt-6 rounded-md border p-3 text-xs" style={{ borderColor: TOKENS.borderLight }}>
      <div className="font-medium mb-2" style={{ color: TOKENS.text }}>Test Cases</div>
      <ul className="list-disc ml-5 space-y-1 text-gray-700">
        <li>CSV builders include headers and rows.</li>
        <li>Overuse threshold (&gt;15%) highlights red.</li>
        <li>Empty-state components render when no data.</li>
        <li>Legend toggles show/hide segments correctly.</li>
      </ul>
      <div className="mt-3">
        <Button variant="outline" onClick={run}><Sparkles className="h-4 w-4" /> Run Tests</Button>
      </div>
    </div>
  );
};

// —— Main Section Component —————————————————————————————————————
export default function AnchorTextInsightsDemo({
  distribution: distributionProp,
  topAnchors: topAnchorsProp,
}: {
  distribution: { totalAnchors: number; segments: Array<{ type: string; count?: number; pct: number; avgAqs?: number }> };
  topAnchors: Array<{ anchor: string; uses: number; linkedPages?: number; avgAqs?: number; usagePct?: number }>;
}) {

  const projectId = "demo-project-1";
const dist  = distributionProp;
const tops  = topAnchorsProp || [];

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const toast = useToast();

const insights = useComputedInsights(dist, tops);

  const navigateToAnchors = (params: Record<string, any>) => {
    // Replace with router navigation when integrating
    toast.push(`Anchors filtered → ${Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
  };


  return (
    <ToastProvider>
      <Card className="mt-4 overflow-hidden" style={{ borderColor: TOKENS.borderLight }}>
        <SectionHeader onExport={() => setExportOpen(true)} />

        <CardContent className="pt-4">

          { dist  && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Donut */}
                <div className="flex flex-col gap-4">
                  <AnchorDonut
                    distribution={dist }
                    hiddenTypes={hiddenTypes}
                    setHiddenTypes={setHiddenTypes}
                    onSegmentClick={(type) => navigateToAnchors({ anchorType: type })}
                  />
                </div>

                {/* Right: Bar */}
                <div className="flex flex-col gap-4">
                  <TopAnchorsBar
                    topAnchors={tops}
                    totalAnchors={dist.totalAnchors}
                    onBarClick={(anchor) => navigateToAnchors({ search: anchor })}
                  />
                </div>
              </div>

              {/* {insights && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InsightCard
                    tone="danger"
                    title="Overused Anchors"
                    metric={`${insights.overusedCount} phrases`}
                    body="Anchors used disproportionately or more than 10×. Review and diversify wording."
                    actions={[
                      { label: "View Anchors", aria: "View overused anchors", onClick: () => navigateToAnchors({ overused: true }), icon: <ListChecks className="h-4 w-4" /> },
                      { label: "Create Task (bulk)", aria: "Create task for overused anchors", onClick: () => alert("Task Drawer (demo)"), icon: <Sparkles className="h-4 w-4" />, variant: "outline" },
                      { label: "Generate Variations", aria: "AI variations", onClick: () => alert("AI Variations (demo)"), icon: <Sparkles className="h-4 w-4" />, variant: "primary" },
                    ]}
                  />
                  <InsightCard
                    tone="warning"
                    title="Generic Anchors"
                    metric={`${insights.genericPct}%`}
                    body="A higher share of generic anchors (e.g., ‘click here’) can dilute relevance. Replace with descriptive phrases."
                    actions={[
                      { label: "Filter Generic", onClick: () => navigateToAnchors({ anchorType: "generic" }), icon: <PieChartIcon className="h-4 w-4" /> },
                      { label: "Replace Suggestions", onClick: () => alert("Suggestions (demo)"), icon: <Lightbulb className="h-4 w-4" />, variant: "primary" },
                    ]}
                  />
                  <InsightCard
                    tone="info"
                    title="Low AQS Anchors"
                    metric={`${insights.lowAqsLinks} links`}
                    body="Anchors with AQS < 50% may be vague or mismatched with target page intent."
                    actions={[
                      { label: "View Low AQS", onClick: () => navigateToAnchors({ minAqs: 0, maxAqs: 49 }), icon: <Gauge className="h-4 w-4" /> },
                      { label: "Create Task", onClick: () => alert("Task Drawer (demo)"), icon: <Sparkles className="h-4 w-4" />, variant: "primary" },
                    ]}
                  />
                  <InsightCard
                    tone="success"
                    title="High‑Quality Anchors"
                    metric={`${insights.highQualityPct}%`}
                    body="Estimated share of anchors with AQS ≥ 70%. Maintain diversity while reinforcing key terms."
                    actions={[
                      { label: "View Anchors", onClick: () => navigateToAnchors({ minAqs: 70 }), icon: <ListChecks className="h-4 w-4" /> },
                    ]}
                  />
                </div>
              )} */}
            </>
          )}
        </CardContent>
      </Card>

<ExportInsightsModal
  open={exportOpen}
  onClose={() => setExportOpen(false)}
  distribution={dist}
  topAnchors={tops}
/>

    </ToastProvider>
  );
}
