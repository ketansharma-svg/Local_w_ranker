"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell,
} from "recharts";
import {
  CalendarDays,
  ChevronDown,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe2,
  Filter,
  BarChart3 as SectionIcon,
  Wrench,
  SquareArrowOutUpRight,
  ShoppingCart,
  FileText,
  CalendarClock,
  Mail,
  Search,
  MousePointer,
  Share2,
  BadgeDollarSign,
  Link2,
  Smartphone,
  Monitor,
  Tablet as TabletIcon,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   Design Tokens (Wranker theme-aligned)
   ────────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  card: "#FFFFFF",
  radius: 10,

  // Palettes
  devices: {
    desktop: "#3B82F6", // blue
    mobile: "#F97316", // orange
    tablet: "#A78BFA", // violet
  },
  // Source/Medium colors (used for single conversion type mode + table dots)
  sources: {
    "google / organic": "#4286F5",
    "direct / (none)": "#10B981",
    "facebook / referral": "#EF4444",
    "google / cpc": "#F59E0B",
    "bing / organic": "#8B5CF6",
    "linkedin / referral": "#06B6D4",
  } as Record<SourceKey, string>,
  // Conversion type colors (used when multiple conv types are selected)
  conv: {
    Purchase: "#7C3AED", // purple
    "Form Submit": "#06B6D4", // cyan
    "Demo Request": "#F59E0B", // amber
    Newsletter: "#10B981", // emerald
  } as Record<ConvType, string>,
};

const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ──────────────────────────────────────────────────────────────
   Utilities
   ────────────────────────────────────────────────────────────── */
const fmt = {
  num: (n: number) => new Intl.NumberFormat().format(Math.round(n)),
  one: (n: number, d = 1) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(n),
  pct: (v: number) =>
    `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v)}%`,
  time: (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${String(s).padStart(2, "0")}s`;
  },
};

type Device = "all" | "desktop" | "mobile" | "tablet";
type DeviceOnly = Exclude<Device, "all">;

type SourceKey =
  | "google / organic"
  | "direct / (none)"
  | "facebook / referral"
  | "google / cpc"
  | "bing / organic"
  | "linkedin / referral";

type ConvType = "Purchase" | "Form Submit" | "Demo Request" | "Newsletter";

type SourceRow = {
  source: SourceKey;
  sessions: number;
  conversions: number;
  convRate: number; // %
  bounceRate: number; // %
  avgEngagementSec: number;
  trendCvrDelta: number; // %pt delta vs previous period
  byDevice: Record<DeviceOnly, number>;
  byType: Record<ConvType, number>;
  prev: {
    conversions: number;
    convRate: number; // %
    byDevice: Record<DeviceOnly, number>;
    byType: Record<ConvType, number>;
  };
};

/* ──────────────────────────────────────────────────────────────
   Mock data
   ────────────────────────────────────────────────────────────── */
function seeded(seed: number) {
  let t = seed;
  return () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}

function genMock(rangeDays: number, device: Device): SourceRow[] {
  const seed = seeded(42 + rangeDays + (device === "all" ? 0 : device.length));
  const base: SourceKey[] = [
    "google / organic",
    "direct / (none)",
    "facebook / referral",
    "google / cpc",
    "bing / organic",
    "linkedin / referral",
  ];

  const deviceShare: Record<DeviceOnly, number> =
    device === "all"
      ? { desktop: 0.44, mobile: 0.47, tablet: 0.09 }
      : device === "desktop"
      ? { desktop: 1, mobile: 0, tablet: 0 }
      : device === "mobile"
      ? { desktop: 0, mobile: 1, tablet: 0 }
      : { desktop: 0, mobile: 0, tablet: 1 };

  return base.map((src, i) => {
    const sessions = Math.max(200, Math.round([9200, 5200, 1500, 2100, 900, 800][i] * (0.7 + seed() * 0.6)));
    const bounceRate = Math.min(85, Math.max(10, 40 + (seed() - 0.5) * 30));
    const avgEngagementSec = Math.max(30, 70 + seed() * 120);

    const typeWeights: Record<ConvType, number> = {
      Purchase: [0.6, 0.28, 0.15, 0.18, 0.25, 0.12][i] ?? 0.2,
      "Form Submit": [0.22, 0.42, 0.35, 0.38, 0.34, 0.41][i] ?? 0.33,
      "Demo Request": [0.1, 0.18, 0.24, 0.19, 0.18, 0.22][i] ?? 0.2,
      Newsletter: [0.08, 0.12, 0.26, 0.25, 0.23, 0.25][i] ?? 0.2,
    };

    const qualAdj = [1.12, 0.8, 0.55, 0.75, 0.95, 0.7][i];
    const baseCvr = 0.8 + seed() * 3.2; // 0.8% - 4.0%
    const convRate = baseCvr * qualAdj;
    const conversions = Math.max(2, Math.round((sessions * convRate) / 100));

    const byDevice = {
      desktop: Math.round(conversions * deviceShare.desktop),
      mobile: Math.round(conversions * deviceShare.mobile),
      tablet: Math.round(conversions * deviceShare.tablet),
    };
    const devSum = byDevice.desktop + byDevice.mobile + byDevice.tablet;
    const devDiff = conversions - devSum;
    if (devDiff !== 0) byDevice.desktop += devDiff;

    const totalWeight = Object.values(typeWeights).reduce((a, b) => a + b, 0);
    const byType: Record<ConvType, number> = {
      Purchase: 0,
      "Form Submit": 0,
      "Demo Request": 0,
      Newsletter: 0,
    };
    (Object.keys(typeWeights) as ConvType[]).forEach((t) => {
      const w = typeWeights[t] / totalWeight;
      byType[t] = Math.round(conversions * w);
    });
    const typeSum = byType.Purchase + byType["Form Submit"] + byType["Demo Request"] + byType.Newsletter;
    const typeDiff = conversions - typeSum;
    if (typeDiff !== 0) byType.Purchase += typeDiff;

    const prevFactor = 0.86 + seed() * 0.2;
    const prevConv = Math.max(1, Math.round(conversions * prevFactor));
    const prevCvr = (prevConv / Math.max(1, sessions)) * 100;

    const prevByDevice = {
      desktop: Math.round(prevConv * deviceShare.desktop),
      mobile: Math.round(prevConv * deviceShare.mobile),
      tablet: Math.round(prevConv * deviceShare.tablet),
    };
    const pDevSum = prevByDevice.desktop + prevByDevice.mobile + prevByDevice.tablet;
    const pDevDiff = prevConv - pDevSum;
    if (pDevDiff !== 0) prevByDevice.desktop += pDevDiff;

    const prevByType: Record<ConvType, number> = {
      Purchase: Math.round(byType.Purchase * prevFactor),
      "Form Submit": Math.round(byType["Form Submit"] * prevFactor),
      "Demo Request": Math.round(byType["Demo Request"] * prevFactor),
      Newsletter: Math.round(byType.Newsletter * prevFactor),
    };
    const pTypeSum =
      prevByType.Purchase +
      prevByType["Form Submit"] +
      prevByType["Demo Request"] +
      prevByType.Newsletter;
    const pTypeDiff = prevConv - pTypeSum;
    if (pTypeDiff !== 0) prevByType.Purchase += pTypeDiff;

    return {
      source: src,
      sessions,
      conversions,
      convRate: (conversions / sessions) * 100,
      bounceRate,
      avgEngagementSec,
      trendCvrDelta: (conversions / sessions) * 100 - prevCvr,
      byDevice,
      byType,
      prev: {
        conversions: prevConv,
        convRate: prevCvr,
        byDevice: prevByDevice,
        byType: prevByType,
      },
    };
  });
}

/* ──────────────────────────────────────────────────────────────
   Controls & helpers
   ────────────────────────────────────────────────────────────── */
type GroupMode = "none" | "device" | "type";

/* ──────────────────────────────────────────────────────────────
   Export helpers (single Export button)
   ────────────────────────────────────────────────────────────── */
function exportCSV(rows: SourceRow[], filename = "conversion_by_source.csv") {
  const cols = [
    "Source/Medium",
    "Sessions",
    "Conversions",
    "Conversion Rate (%)",
    "Bounce Rate (%)",
    "Avg Engagement (sec)",
  ];
  const body = rows
    .map((r) =>
      [
        r.source,
        r.sessions,
        r.conversions,
        r.convRate.toFixed(2),
        r.bounceRate.toFixed(1),
        Math.round(r.avgEngagementSec),
      ].join(","),
    )
    .join("\n");
  const blob = new Blob([cols.join(",") + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportPNG(el: HTMLElement | null, filename = "conversion_by_source.png") {
  if (!el) return;
  const wrapper = `
<svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK}">
      ${el.outerHTML}
    </div>
  </foreignObject>
</svg>`;
  const blob = new Blob([wrapper], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ──────────────────────────────────────────────────────────────
   Modular chips & toggle switch (shared pattern)
   ────────────────────────────────────────────────────────────── */
function Chip({
  children,
  onClear,
  title,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  title?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
      style={{ borderColor: TK.borderLight, color: TK.text }}
      title={title}
    >
      {children}
      {onClear && (
        <button
          className="ml-0.5 rounded border px-1.5 py-0.5 text-[11px] cursor-pointer"
          style={{ borderColor: TK.borderLight, color: TK.muted }}
          onClick={onClear}
          aria-label="Clear"
        >
          ×
        </button>
      )}
    </span>
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
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[#008CCD]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Small UI bits
   ────────────────────────────────────────────────────────────── */
function Dot({
  color,
  size = 10,
  pattern = false,
}: {
  color: string;
  size?: number;
  pattern?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-block",
    width: size,
    height: size,
    borderRadius: "50%",
  };
  if (!pattern) {
    return <span aria-hidden style={{ ...base, background: color }} />;
  }
  return (
    <span
      aria-hidden
      style={{
        ...base,
        backgroundImage: `repeating-linear-gradient(45deg, ${color}, ${color} 1px, transparent 1px, transparent 3px),
                          repeating-linear-gradient(-45deg, ${color}, ${color} 1px, transparent 1px, transparent 3px)`,
        backgroundColor: "transparent",
        border: `1px solid ${color}`,
      }}
    />
  );
}

function DeltaBadge({
  delta,
  inverse = false,
}: {
  delta: number; // percentage points
  inverse?: boolean; // true if lower is better
}) {
  const isZero = Math.abs(delta) < 0.001;
  const positiveGood = !inverse;
  const good = (delta > 0 && positiveGood) || (delta < 0 && !positiveGood);
  const tone = isZero ? TK.muted : good ? "#10B981" : "#EF4444";
  const Icon = isZero ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: tone }}>
      <Icon size={14} />
      {fmt.one(Math.abs(delta), 2)}pp
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   Branded icon helpers
   ────────────────────────────────────────────────────────────── */
function ConvTypeIcon({ t }: { t: ConvType }) {
  const common = { className: "h-3.5 w-3.5", style: { color: TK.brand } as React.CSSProperties };
  switch (t) {
    case "Purchase":
      return <ShoppingCart {...common} />;
    case "Form Submit":
      return <FileText {...common} />;
    case "Demo Request":
      return <CalendarClock {...common} />;
    case "Newsletter":
      return <Mail {...common} />;
  }
}
function DeviceIconMini({ k }: { k: "desktop" | "mobile" | "tablet" }) {
  const common = { className: "h-3.5 w-3.5", style: { color: TK.brand } as React.CSSProperties };
  if (k === "desktop") return <Monitor {...common} />;
  if (k === "mobile") return <Smartphone {...common} />;
  return <TabletIcon {...common} />;
}
function SourceIcon({ src }: { src: SourceKey }) {
  const common = { className: "h-3.5 w-3.5", style: { color: TK.brand } as React.CSSProperties };
  if (src.startsWith("google / cpc")) return <BadgeDollarSign {...common} />;
  if (src.startsWith("google / organic")) return <Search {...common} />;
  if (src.startsWith("bing / organic")) return <Search {...common} />;
  if (src.startsWith("facebook / referral")) return <Share2 {...common} />;
  if (src.startsWith("linkedin / referral")) return <Link2 {...common} />;
  return <MousePointer {...common} />;
}

/* ──────────────────────────────────────────────────────────────
   Smart tooltip (colored dot + branded icons)
   ────────────────────────────────────────────────────────────── */
const getDeviceColor = (k: string) => (TK.devices as any)[k] as string | undefined;
const getConvColor = (t: string) => (TK.conv as any)[t] as string | undefined;

function SmartTooltip({
  active,
  payload,
  label,
  groupMode,
  convSelection,
  rows,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  groupMode: GroupMode;
  convSelection: ConvType[];
  rows: SourceRow[];
}) {
  if (!active || !payload || !payload.length) return null;

  const row = rows.find((r) => r.source === label);
  const total = row?.conversions ?? 0;

  const entries = payload.filter((p) => typeof p.value === "number");

  function resolveEntryMeta(e: any): {
    color: string;
    isPrev: boolean;
    labelText: string;
    icon?: React.ReactNode;
  } {
    const dataKey: string = e.dataKey || "";
    const isPrev = dataKey.startsWith("prev_") || dataKey === "prev_value";

    if (groupMode === "device") {
      const key = dataKey.replace(/^prev_/, "") as "desktop" | "mobile" | "tablet";
      const color = getDeviceColor(key) ?? "#999";
      return { color, isPrev, labelText: e.name, icon: <DeviceIconMini k={key} /> };
    }

    if (groupMode === "type" || (groupMode === "none" && convSelection.length > 1)) {
      const t = dataKey.replace(/^prev_/, "") as ConvType;
      const color = getConvColor(t) ?? "#999";
      return { color, isPrev, labelText: e.name, icon: <ConvTypeIcon t={t} /> };
    }

    // single type → color by source
    const srcColor = row ? TK.sources[row.source] : "#999";
    return { color: srcColor, isPrev, labelText: e.name, icon: <SourceIcon src={row?.source as SourceKey} /> };
  }

  const sorted = entries.sort((a, b) => {
    const ap = String(a.dataKey || "").startsWith("prev_") || a.dataKey === "prev_value";
    const bp = String(b.dataKey || "").startsWith("prev_") || b.dataKey === "prev_value";
    return Number(ap) - Number(bp);
  });

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${TK.border}`,
        borderRadius: 8,
        padding: 10,
        boxShadow: "0 6px 22px rgba(0,0,0,.08)",
        minWidth: 240,
      }}
    >
      <div style={{ fontSize: 12, color: TK.muted, marginBottom: 6 }}>Source</div>
      <div className="inline-flex items-center gap-2" style={{ marginBottom: 6 }}>
        {row && <SourceIcon src={row.source} />}
        <div style={{ fontWeight: 600, color: TK.text }}>{label}</div>
      </div>

      <div style={{ fontSize: 12, color: TK.muted, marginBottom: 6 }}>
        Sessions: <strong style={{ color: TK.text }}>{fmt.num(row?.sessions ?? 0)}</strong>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        {sorted.map((e, i) => {
          const meta = resolveEntryMeta(e);
          const v = Number(e.value || 0);
          const share = total > 0 ? (v / total) * 100 : 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {meta.icon}
              <Dot color={meta.color} size={8} pattern={meta.isPrev} />
              <div style={{ fontSize: 13, color: TK.text, flex: 1 }}>
                {meta.labelText}: <strong>{fmt.num(v)}</strong>{" "}
                <span style={{ color: TK.muted }}>({fmt.pct(share)})</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: `1px dashed ${TK.border}`, marginTop: 8, paddingTop: 6 }}>
        <div style={{ fontSize: 12, color: TK.muted }}>
          Conv. Rate: <strong style={{ color: TK.text }}>{fmt.pct(row?.convRate ?? 0)}</strong>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Custom animated bar (hover)
   ────────────────────────────────────────────────────────────── */
function roundedTopRectPath(x: number, y: number, w: number, h: number, rTop = 4) {
  const r = Math.max(0, Math.min(rTop, Math.min(w / 2, h / 2)));
  return [
    `M ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `H ${x + w - r}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `V ${y + h}`,
    `H ${x}`,
    `Z`,
  ].join(" ");
}
function AnimatedBar({
  x,
  y,
  width,
  height,
  fill,
  isHovered,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  isHovered?: boolean;
}) {
  const dy = isHovered ? 2 : 0;
  return (
    <g transform={`translate(0, ${dy})`}>
      <path
        d={roundedTopRectPath(x, y, Math.max(1, width), Math.max(0, height - dy), 4)}
        fill={fill}
        style={{
          transition: "transform .18s ease, filter .18s ease",
          filter: isHovered ? "drop-shadow(0 3px 6px rgba(0,0,0,.12))" : "none",
          cursor: "pointer",
        }}
      />
    </g>
  );
}

/* ──────────────────────────────────────────────────────────────
   Legend chips (with optional branded icons)
   ────────────────────────────────────────────────────────────── */
function LegendChips({
  items,
  hidden,
  onToggle,
  title,
  renderIcon,
}: {
  title?: string;
  items: { key: string; label: string; color: string }[];
  hidden: Record<string, boolean>;
  onToggle: (key: string) => void;
  renderIcon?: (key: string) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {title ? (
        <span className="text-xs uppercase tracking-wide text-gray-500 mr-1">{title}</span>
      ) : null}
      {items.map((it) => {
        const off = !!hidden[it.key];
        return (
          <button
            key={it.key}
            onClick={() => onToggle(it.key)}
            className={`h-7 px-2.5 rounded-full text-xs border inline-flex items-center gap-1 cursor-pointer ${
              off ? "opacity-60" : "font-semibold"
            }`}
            style={{
              borderColor: off ? TK.border : it.color,
              color: off ? TK.muted : it.color,
              background: off ? "transparent" : "rgba(0,0,0,.02)",
            }}
            title={it.label}
          >
            {renderIcon?.(it.key)}
            <Dot color={it.color} size={8} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
export default function ConversionBySourceMediumSection() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Controls
  const [range, setRange] = React.useState<7 | 14 | 30 | 60 | 90>(30);
  const [device, setDevice] = React.useState<Device>("all");
  const [comparePrev, setComparePrev] = React.useState<boolean>(false);

  const [groupMode, setGroupMode] = React.useState<GroupMode>("none");
  const [convTypes, setConvTypes] = React.useState<ConvType[]>([
    "Purchase",
    "Form Submit",
    "Demo Request",
    "Newsletter",
  ]);
  const [convOpen, setConvOpen] = React.useState(false);

  // Hidden toggles for legend items
  const [hiddenSeries, setHiddenSeries] = React.useState<Record<string, boolean>>({});
  const toggleHidden = (key: string) => setHiddenSeries((h) => ({ ...h, [key]: !h[key] }));

  // Data
  const data = React.useMemo(() => genMock(range, device), [range, device]);

  // Row selection
  const [selectedSource, setSelectedSource] = React.useState<SourceKey | null>(null);

  // Hover
  const [hover, setHover] = React.useState<{ index: number | null; key: string | null }>({
    index: null,
    key: null,
  });

  // Build chart dataset per group mode
  type ChartRow = { source: SourceKey } & Record<string, number>;
  const chartData: ChartRow[] = React.useMemo(() => {
    const oneType = convTypes.length === 1;

    if (groupMode === "device") {
      return data.map((r) => ({
        source: r.source,
        desktop: r.byDevice.desktop,
        mobile: r.byDevice.mobile,
        tablet: r.byDevice.tablet,
        ...(comparePrev
          ? {
              prev_desktop: r.prev.byDevice.desktop,
              prev_mobile: r.prev.byDevice.mobile,
              prev_tablet: r.prev.byDevice.tablet,
            }
          : {}),
      }));
    }

    if (groupMode === "type" || (!oneType && groupMode === "none")) {
      return data.map((r) => {
        const row: any = { source: r.source };
        convTypes.forEach((t) => {
          row[t] = r.byType[t];
          if (comparePrev) row[`prev_${t}`] = r.prev.byType[t];
        });
        return row;
      });
    }

    const ct = convTypes[0];
    return data.map((r) => ({
      source: r.source,
      value: ct ? r.byType[ct] : r.conversions,
      ...(comparePrev ? { prev_value: ct ? r.prev.byType[ct] : r.prev.conversions } : {}),
    }));
  }, [data, groupMode, convTypes, comparePrev]);

  // Legend items depending on mode
  const legendItems = React.useMemo(() => {
    if (groupMode === "device") {
      return (["desktop", "mobile", "tablet"] as const).map((k) => ({
        key: k,
        label: k[0].toUpperCase() + k.slice(1),
        color: TK.devices[k],
      }));
    }
    if (groupMode === "type" || convTypes.length > 1) {
      return convTypes.map((t) => ({ key: t, label: t, color: TK.conv[t] }));
    }
    return data.map((r) => ({ key: r.source, label: r.source, color: TK.sources[r.source] }));
  }, [groupMode, convTypes, data]);

  const hatchColors = React.useMemo(() => {
    const s = new Set<string>();
    legendItems.forEach((it) => s.add(it.color));
    return Array.from(s);
  }, [legendItems]);

  const isHidden = (key: string) => !!hiddenSeries[key];

  const chartRef = React.useRef<HTMLDivElement | null>(null);

  // Sorting (table)
  type SortKey = "sessions" | "conversions" | "convRate" | "bounceRate" | "avgEngagementSec";
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "desc" | "asc" }>({
    key: "conversions",
    dir: "desc",
  });
  const sortedRows = React.useMemo(() => {
    const rows = [...data];
    rows.sort((a, b) => {
      const dir = sort.dir === "desc" ? -1 : 1;
      const av = a[sort.key];
      const bv = b[sort.key];
      return av === bv ? 0 : av > bv ? dir : -dir;
    });
    return rows;
  }, [data, sort]);

  const singleTypeSelected = convTypes.length === 1;

  // Export dropdown
  const [exportOpen, setExportOpen] = React.useState(false);
  const exportRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!mounted) {
    return (
      <section
        className="rounded-md bg-white p-4"
        style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
      >
        <div className="h-8 w-64 rounded bg-gray-100" />
        <div className="mt-4 h-[360px] rounded bg-gray-50" />
      </section>
    );
  }

  const hatchId = (color: string) => `hatch_${color.replace("#", "")}`;

  return (
    <section
      className="rounded-md bg-white p-4 mt-4"
      style={{ border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
      aria-label="Conversion by Source / Medium"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SectionIcon className="h-4 w-4" style={{ color: TK.brand }} />
          <div className="text-[15px] font-semibold" style={{ color: TK.text }}>
            Conversion by Source / Medium
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date range */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2">
              <CalendarDays className="h-4 w-4" style={{ color: TK.brand }} />
            </span>
            <select
              aria-label="Date range"
              className="h-8 pl-7 pr-2.5 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as any)}
            >
              {[7, 14, 30, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n}d
                </option>
              ))}
            </select>
          </div>

          {/* Device */}
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2">
              <Globe2 className="h-4 w-4" style={{ color: TK.brand }} />
            </span>
            <select
              aria-label="Device"
              className="h-8 pl-7 pr-2.5 rounded border text-sm cursor-pointer"
              style={{ borderColor: TK.border }}
              value={device}
              onChange={(e) => setDevice(e.target.value as Device)}
            >
              {(["all", "desktop", "mobile", "tablet"] as Device[]).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Conversion Type popover (with branded icons) */}
          <div className="relative">
            <button
              onClick={() => setConvOpen((v) => !v)}
              className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
              style={{ borderColor: TK.border }}
              aria-haspopup="listbox"
              aria-expanded={convOpen}
              title="Conversion Type"
            >
              <Filter className="h-4 w-4" style={{ color: TK.brand }} />
              <span>Conversion Type</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            {convOpen && (
              <div
                className="absolute z-20 mt-1 w-60 rounded-md bg-white p-2 shadow"
                style={{ border: `1px solid ${TK.border}` }}
                role="listbox"
              >
                {(Object.keys(TK.conv) as ConvType[]).map((t) => {
                  const checked = convTypes.includes(t);
                  return (
                    <label
                      key={t}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setConvTypes((curr) => {
                            if (on) return [...curr, t];
                            return curr.filter((c) => c !== t);
                          });
                        }}
                      />
                      <ConvTypeIcon t={t} />
                      <Dot color={TK.conv[t]} size={10} />
                      <span className="text-sm">{t}</span>
                    </label>
                  );
                })}
                <div className="mt-1 border-t pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setConvTypes(Object.keys(TK.conv) as ConvType[])}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setConvTypes(["Purchase"])}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Only Purchase
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Group mode (modular chip‑like toggle buttons) */}
          <div
            className="inline-flex rounded border overflow-hidden"
            style={{ borderColor: TK.border }}
            role="group"
            aria-label="Group mode"
          >
            {(["none", "device", "type"] as GroupMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setGroupMode(m)}
                className={`h-8 px-2.5 text-sm cursor-pointer ${
                  groupMode === m ? "bg-[#F5F7FA] font-medium" : "bg-white"
                }`}
                title={m === "none" ? "No grouping" : m === "device" ? "Group by device" : "Group by conversion type"}
              >
                {m === "none" ? "No Group" : m === "device" ? "Device" : "Conv. Type"}
              </button>
            ))}
          </div>

          {/* Compare previous (toggle switch) */}
          <ToggleSwitch checked={comparePrev} onChange={setComparePrev} label="Compare previous" />

          {/* Export (single button with dropdown) */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="h-8 px-3 rounded border text-sm inline-flex items-center gap-2 cursor-pointer"
              style={{ borderColor: TK.border }}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              title="Export"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </button>
            {exportOpen && (
              <div
                className="absolute right-0 z-20 mt-2 w-56 rounded-md border bg-white p-1 shadow"
                style={{ borderColor: TK.border }}
                role="menu"
              >
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportPNG(chartRef.current, "conversion_by_source.png");
                    setExportOpen(false);
                  }}
                >
                  PNG — Chart
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#F5F7FA] cursor-pointer"
                  onClick={() => {
                    exportCSV(sortedRows);
                    setExportOpen(false);
                  }}
                >
                  CSV — Table
                </button>
              </div>
            )}
          </div>

          {/* Refresh demo data (kept separate from export) */}
          <button
            className="h-8 px-2.5 rounded border text-sm inline-flex items-center gap-1 cursor-pointer"
            style={{ borderColor: TK.border }}
            onClick={() => {
              // visual re-seed
              setRange((r) => (r === 30 ? 31 : 30) as any);
              setTimeout(() => setRange((r) => (r === 14 ? 30 : r) as any), 0);
            }}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Chips row (modular) */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Chip
          onClear={() => setDevice("all")}
          title="Device scope"
        >
          <Globe2 size={12} style={{ color: TK.brand }} />
          Device: <strong>{device}</strong>
        </Chip>
        <Chip
          onClear={() => setConvTypes(Object.keys(TK.conv) as ConvType[])}
          title="Selected conversion types"
        >
          <Filter size={12} style={{ color: TK.brand }} />
          Types: <strong>{convTypes.length}</strong>
        </Chip>
        <Chip title="Grouping mode">
          <BarChart className="hidden" />
          <SectionIcon size={12} style={{ color: TK.brand }} />
          Group: <strong>{groupMode}</strong>
        </Chip>
      </div>

      {/* Legend chips */}
      <div className="mt-3">
        <LegendChips
          title={
            groupMode === "none" && singleTypeSelected
              ? "Sources"
              : groupMode === "device"
              ? "Devices"
              : "Conversion Types"
          }
          items={legendItems}
          hidden={hiddenSeries}
          onToggle={toggleHidden}
          renderIcon={(key) => {
            if (groupMode === "device") return <DeviceIconMini k={key as any} />;
            if (groupMode === "type" || (!singleTypeSelected && groupMode === "none"))
              return <ConvTypeIcon t={key as ConvType} />;
            // sources legend (single type)
            return <SourceIcon src={key as SourceKey} />;
          }}
        />
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="mt-3 h-[360px] w-full rounded-md bg-white"
        style={{ border: `1px solid ${TK.borderLight}` }}
        aria-describedby="chart-desc"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
            onMouseLeave={() => setHover({ index: null, key: null })}
          >
            <defs>
              {hatchColors.map((c) => (
                <pattern
                  id={hatchId(c)}
                  key={c}
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                >
                  <path d="M0,0 l6,6 M-1,1 l2,-2 M5,7 l2,-2" stroke={c} strokeWidth="1" />
                  <path d="M6,0 l-6,6 M7,-1 l-2,2 M-1,7 l2,-2" stroke={c} strokeWidth="1" />
                </pattern>
              ))}
            </defs>

            <CartesianGrid vertical={false} stroke={TK.borderLight} />
            <XAxis dataKey="source" tick={{ fontSize: 12 }} tickMargin={8} height={36} interval={0} />
            <YAxis
              tick={{ fontSize: 12 }}
              width={40}
              label={{ value: "Conversions", angle: -90, position: "insideLeft", offset: 8 }}
            />

            <RTooltip
              cursor={{ fill: "rgba(0,0,0,.04)" }}
              content={({ active, payload, label }) => (
                <SmartTooltip
                  active={active}
                  payload={payload || []}
                  label={label}
                  groupMode={groupMode === "none" && !singleTypeSelected ? "type" : groupMode}
                  convSelection={convTypes}
                  rows={data}
                />
              )}
            />

            {/* SERIES */}
            {groupMode === "device" &&
              (["desktop", "mobile", "tablet"] as const).map((key) => {
                const seriesKey = key as string;
                if (isHidden(seriesKey)) return null;
                const color = TK.devices[key];
                return (
                  <Bar
                    key={seriesKey}
                    dataKey={seriesKey}
                    name={key[0].toUpperCase() + key.slice(1)}
                    fill={color}
                    barSize={28}
                    radius={[4, 4, 0, 0]}
                    shape={(props: any) => (
                      <AnimatedBar
                        {...props}
                        isHovered={hover.key === seriesKey && hover.index === props.index}
                        fill={color}
                      />
                    )}
                    onMouseMove={(_, index) => setHover({ index, key: seriesKey })}
                  />
                );
              })}

            {groupMode === "device" &&
              (["desktop", "mobile", "tablet"] as const).map((key) => {
                const k = `prev_${key}`;
                if (!comparePrev || isHidden(key)) return null;
                const color = TK.devices[key];
                return (
                  <Bar
                    key={k}
                    dataKey={k}
                    name={`${key[0].toUpperCase() + key.slice(1)} (prev)`}
                    fill={`url(#${hatchId(color)})`}
                    barSize={14}
                    radius={[4, 4, 0, 0]}
                    onMouseMove={(_, index) => setHover({ index, key: k })}
                  />
                );
              })}

            {(groupMode === "type" || (!singleTypeSelected && groupMode === "none")) &&
              convTypes.map((t) => {
                if (isHidden(t)) return null;
                const color = TK.conv[t];
                return (
                  <Bar
                    key={t}
                    dataKey={t}
                    name={t}
                    fill={color}
                    barSize={28}
                    radius={[4, 4, 0, 0]}
                    shape={(props: any) => (
                      <AnimatedBar
                        {...props}
                        isHovered={hover.key === t && hover.index === props.index}
                        fill={color}
                      />
                    )}
                    onMouseMove={(_, index) => setHover({ index, key: t })}
                  />
                );
              })}

            {(groupMode === "type" || (!singleTypeSelected && groupMode === "none")) &&
              convTypes.map((t) => {
                if (!comparePrev || isHidden(t)) return null;
                const color = TK.conv[t];
                return (
                  <Bar
                    key={`prev_${t}`}
                    dataKey={`prev_${t}`}
                    name={`${t} (prev)`}
                    fill={`url(#${hatchId(color)})`}
                    barSize={14}
                    radius={[4, 4, 0, 0]}
                    onMouseMove={(_, index) => setHover({ index, key: `prev_${t}` })}
                  />
                );
              })}

            {groupMode === "none" && singleTypeSelected && (
              <>
                <Bar
                  dataKey="value"
                  name={convTypes[0] ?? "Conversions"}
                  barSize={28}
                  radius={[4, 4, 0, 0]}
                  onMouseMove={(_, index) => setHover({ index, key: "value" })}
                  shape={(props: any) => (
                    <AnimatedBar
                      {...props}
                      isHovered={hover.key === "value" && hover.index === props.index}
                      fill={props.fill}
                    />
                  )}
                >
                  {chartData.map((row, idx) => {
                    const src = row.source as SourceKey;
                    const hidden = isHidden(src);
                    return (
                      <Cell
                        key={idx}
                        fill={hidden ? "transparent" : TK.sources[src]}
                        cursor="pointer"
                      />
                    );
                  })}
                </Bar>

                {comparePrev && (
                  <Bar
                    dataKey="prev_value"
                    name="Previous"
                    barSize={14}
                    radius={[4, 4, 0, 0]}
                    onMouseMove={(_, index) => setHover({ index, key: "prev_value" })}
                  >
                    {chartData.map((row, idx) => {
                      const src = row.source as SourceKey;
                      const hidden = isHidden(src);
                      const color = TK.sources[src];
                      return (
                        <Cell
                          key={idx}
                          fill={hidden ? "transparent" : `url(#${hatchId(color)})`}
                          cursor="pointer"
                        />
                      );
                    })}
                  </Bar>
                )}
              </>
            )}
          </BarChart>
        </ResponsiveContainer>
        <p id="chart-desc" className="sr-only">
          Bar chart comparing conversions by Source/Medium. Interactive chips let you group by
          device or conversion type, and toggle comparison with the previous period.
        </p>
      </div>

      {/* Table */}
      <div className="mt-4">
        <div
          className="rounded-md overflow-hidden"
          style={{ border: `1px solid ${TK.border}` }}
        >
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {[
                  { k: "source", label: "Source / Medium" },
                  { k: "sessions", label: "Sessions", sortable: true },
                  { k: "conversions", label: "Conversions", sortable: true },
                  { k: "convRate", label: "Conv. Rate", sortable: true },
                  { k: "bounceRate", label: "Bounce Rate", sortable: true },
                  { k: "avgEngagementSec", label: "Avg. Engagement Time", sortable: true },
                  { k: "trend", label: "Δ Trend" },
                  { k: "actions", label: "", sortable: false },
                ].map((c) => (
                  <th key={c.k} className="text-left font-medium text-gray-600 px-3 py-2" scope="col">
                    {c.k !== "actions" ? (
                      <button
                        disabled={!c.sortable}
                        onClick={() => {
                          if (!c.sortable) return;
                          setSort((s) => ({
                            key: c.k as any,
                            dir: s.key === c.k && s.dir === "desc" ? "asc" : "desc",
                          }));
                        }}
                        aria-sort={
                          sort.key === c.k ? (sort.dir === "desc" ? "descending" : "ascending") : "none"
                        }
                        className={`inline-flex items-center gap-1 ${c.sortable ? "cursor-pointer" : "cursor-default"}`}
                        title={c.sortable ? "Sort" : undefined}
                      >
                        <span>{c.label}</span>
                        {c.sortable && (
                          <span className="text-gray-400" aria-hidden>
                            {sort.key === c.k ? (sort.dir === "desc" ? "▼" : "▲") : "↕"}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Wrench className="h-4 w-4" style={{ color: TK.brand }} />
                        Actions
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const isSel = selectedSource === r.source;
                const srcColor = TK.sources[r.source];
                return (
                  <tr
                    key={r.source}
                    className={`border-t hover:bg-gray-50 transition-colors ${isSel ? "bg-[#F9FAFB]" : ""} cursor-pointer`}
                    style={{ borderColor: TK.borderLight }}
                    onClick={() => setSelectedSource((s) => (s === r.source ? null : r.source))}
                    title="Select row"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <SourceIcon src={r.source} />
                        <Dot color={srcColor} />
                        <span style={{ color: TK.text }}>{r.source}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{fmt.num(r.sessions)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt.num(r.conversions)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {fmt.pct(r.convRate)}{" "}
                      <span className="ml-1">
                        <DeltaBadge delta={r.trendCvrDelta} />
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{fmt.pct(r.bounceRate)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt.time(r.avgEngagementSec)}</td>
                    <td className="px-3 py-2">
                      <DeltaBadge delta={r.trendCvrDelta} />
                    </td>
                    <td className="px-3 py-2">
                      {/* action icon only (branded) */}
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-50 transition-colors cursor-pointer"
                        title="See pages from source"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.alert(`Navigate to pages for: ${r.source}`);
                        }}
                      >
                        <SquareArrowOutUpRight className="h-4 w-4" style={{ color: TK.brand }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={8}>
                    No conversions in this range. Check GA4 goals or broaden your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
