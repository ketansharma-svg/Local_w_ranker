"use client";

import * as React from "react";
import {
  PieChart as RPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend as RLegend,
  Sector,
} from "recharts";
import {
  PieChart as PieIcon,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
  Tablet as TabletIcon,
  Info,
  Download,
  ExternalLink,
  MapPin,
  MousePointerClick,
  TrendingDown,
  Sparkles,
  Clock3,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Tokens / Font (Inter, Inter Fallback)
   ───────────────────────────────────────────────────────────── */
const TK = {
  brand: "#008CCD",
  valueBlue: "#4286F5",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  card: "#FFFFFF",
} as const;

const FONT_STACK =
  'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

const DEVICE_COLORS: Record<string, string> = {
  Mobile: "#1090D0", // blue
  Desktop: "#10B981", // green
  Tablet: "#F59E0B", // amber
};

/* Metric palette (bars & legends) */
const METRIC_COLORS = {
  Sessions: TK.valueBlue,
  "Engagement %": "#0EA5E9",
  "Bounce %": "#F59E0B",
  Clicks: "#16A34A",
};

/* Metric → branded icon (all in brand color) */
const METRIC_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Sessions: BarChart3,
  "Engagement %": Sparkles,
  "Bounce %": TrendingDown,
  Clicks: MousePointerClick,
};

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */
export type DeviceDatum = {
  device: "Mobile" | "Desktop" | "Tablet" | (string & {});
  sessions: number; // absolute (#)
  engagementRate: number; // 0..100
  bounceRate: number; // 0..100
  avgSessionDurationSec: number; // in seconds
};

export type GeoDatum = {
  country: string; // "United States"
  countryCode: string; // "US"
  sessions: number; // GA4
  clicks?: number; // GSC (optional)
  engagementRate: number; // %
  bounceRate: number; // %
};

type SectionProps = {
  className?: string;
  deviceData?: DeviceDatum[];
  geoData?: GeoDatum[];
  gscConnected?: boolean;
  onDeepLink?: (dest: "search-performance" | "traffic") => void;
};

/* ─────────────────────────────────────────────────────────────
   Utils
   ───────────────────────────────────────────────────────────── */
const nf = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const pct = (n: number, maxFrac = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFrac }).format(
    Math.max(0, Math.min(100, n))
  )}%`;
const dur = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};
const flagEmoji = (code: string) => {
  if (!code || code.length !== 2) return "🏳️";
  const A = 127397;
  const cc = code.toUpperCase();
  const norm = cc === "UK" ? "GB" : cc; // unicode expects GB
  return String.fromCodePoint(norm.charCodeAt(0) + A) + String.fromCodePoint(norm.charCodeAt(1) + A);
};
function exportCSV(filename: string, rows: Array<Record<string, any>>) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","));
  const blob = new Blob([headers.join(",") + "\n" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
async function exportPNGFrom(el: HTMLElement | null, filename = "chart.png") {
  if (!el) return;
  const wrapper = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${el.clientWidth}" height="${el.clientHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${FONT_STACK};">
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
    ctx?.drawImage(img, 0, 0);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* ─────────────────────────────────────────────────────────────
   Demo Data (if none passed)
   ───────────────────────────────────────────────────────────── */
function makeDemoDevice(): DeviceDatum[] {
  return [
    { device: "Mobile", sessions: 18420, engagementRate: 63.2, bounceRate: 36.8, avgSessionDurationSec: 123 },
    { device: "Desktop", sessions: 9460, engagementRate: 58.7, bounceRate: 41.3, avgSessionDurationSec: 152 },
    { device: "Tablet", sessions: 1840, engagementRate: 55.3, bounceRate: 44.7, avgSessionDurationSec: 111 },
  ];
}
function makeDemoGeo(): GeoDatum[] {
  return [
    { country: "United States", countryCode: "US", sessions: 12450, clicks: 4210, engagementRate: 61.3, bounceRate: 38.0 },
    { country: "India", countryCode: "IN", sessions: 9180, clicks: 3820, engagementRate: 68.4, bounceRate: 34.0 },
    { country: "United Kingdom", countryCode: "GB", sessions: 3700, clicks: 1240, engagementRate: 72.1, bounceRate: 29.0 },
    { country: "Australia", countryCode: "AU", sessions: 2680, clicks: 920, engagementRate: 66.8, bounceRate: 32.0 },
    { country: "United Arab Emirates", countryCode: "AE", sessions: 1980, clicks: 610, engagementRate: 64.2, bounceRate: 35.0 },
    { country: "Canada", countryCode: "CA", sessions: 1890, clicks: 540, engagementRate: 62.3, bounceRate: 36.5 },
    { country: "Germany", countryCode: "DE", sessions: 1620, clicks: 470, engagementRate: 58.9, bounceRate: 39.2 },
    { country: "France", countryCode: "FR", sessions: 1410, clicks: 390, engagementRate: 57.2, bounceRate: 40.4 },
    { country: "Brazil", countryCode: "BR", sessions: 1160, clicks: 330, engagementRate: 59.4, bounceRate: 38.7 },
    { country: "Spain", countryCode: "ES", sessions: 980, clicks: 280, engagementRate: 63.0, bounceRate: 36.9 },
  ];
}

/* ─────────────────────────────────────────────────────────────
   Small atoms (segmented toggle with icon+text)
   ───────────────────────────────────────────────────────────── */
const SegSwitch: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string; icon?: React.ComponentType<{ size?: number }>; disabled?: boolean }[];
  ariaLabel?: string;
}> = ({ value, onChange, options, ariaLabel }) => {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden"
      style={{ borderRadius: 10, border: `1px solid ${TK.border}`, fontFamily: FONT_STACK }}
    >
      {options.map((o, idx) => {
        const isActive = value === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            disabled={o.disabled}
            onClick={() => !o.disabled && onChange(o.key)}
            className={`px-3 h-9 flex items-center gap-1.5 text-[13px] ${idx > 0 ? "border-l" : ""} ${
              o.disabled ? "opacity-60" : ""
            }`}
            style={{
              borderColor: TK.border,
              background: isActive ? TK.pastelBlue : "#FFF",
              color: isActive ? TK.brand : TK.text,
              cursor: o.disabled ? "not-allowed" : "pointer",
            }}
          >
            {Icon && <Icon size={16} />}
            <span className={isActive ? "font-semibold" : "font-medium"}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const IconBtn: React.FC<React.PropsWithChildren<{ title: string; onClick?: () => void }>> = ({
  title,
  onClick,
  children,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white"
    style={{ border: `1px solid ${TK.border}`, color: TK.text, cursor: "pointer", fontFamily: FONT_STACK }}
  >
    {children}
  </button>
);

/* ─────────────────────────────────────────────────────────────
   SectionCard (branded icon in title)
   ───────────────────────────────────────────────────────────── */
const SectionCard: React.FC<
  React.PropsWithChildren<{ title: string; right?: React.ReactNode; Icon?: React.ComponentType<{ size?: number; color?: string }> }>
> = ({ title, right, children, Icon }) => (
  <section
    className="rounded-md bg-white"
    style={{ border: `1px solid ${TK.border}`, boxShadow: "0 1px 2px rgba(17,24,39,.06)", fontFamily: FONT_STACK }}
    aria-label={title}
  >
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${TK.borderLight}` }}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={18} color={TK.brand} /> : null}
        <h3 className="text-[15px] font-semibold" style={{ color: TK.text }}>
          {title}
        </h3>
        <Info size={16} color={TK.muted}  />
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    <div className="p-4">{children}</div>
  </section>
);

/* ─────────────────────────────────────────────────────────────
   Smart tooltips
   ───────────────────────────────────────────────────────────── */

/** Device donut tooltip (title with device icon, rows with branded icons + colored dot on value) */
const DeviceDonutTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as any;
  const name = p.name as string;
  const Icon = name === "Mobile" ? Smartphone : name === "Desktop" ? Monitor : TabletIcon;

  const Row: React.FC<{ icon: React.ComponentType<any>; label: string; value: string; dotColor?: string }> = ({
    icon: RIcon,
    label,
    value,
    dotColor,
  }) => (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-2">
        <RIcon size={14} color={TK.brand} />
        <span className="text-xs" style={{ color: TK.muted }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dotColor ?? TK.border }} />
        <span className="text-xs font-semibold" style={{ color: TK.text }}>
          {value}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="rounded-md shadow-sm p-2"
      style={{
        background: "#fff",
        border: `1px solid ${TK.border}`,
        minWidth: 200,
        pointerEvents: "none",
        fontFamily: FONT_STACK,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} color={TK.brand} />
        <div className="text-xs font-semibold" style={{ color: TK.text }}>
          {name}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Row icon={BarChart3} label="Sessions" value={`${nf(p.raw)} (${pct(p.value, 1)})`} dotColor={p.fill} />
        <Row icon={Sparkles} label="Engagement" value={pct(p.engagementRate, 1)} dotColor={METRIC_COLORS["Engagement %"]} />
        <Row icon={TrendingDown} label="Bounce" value={pct(p.bounceRate, 1)} dotColor={METRIC_COLORS["Bounce %"]} />
        <Row icon={Clock3} label="Avg Time" value={dur(p.avgSec)} dotColor={TK.brand} />
      </div>
    </div>
  );
};

/** Geo bars tooltip (metric icon + country) */
// const GeoBarsTooltip: React.FC<{ metricKey: string }> = ({ metricKey }) => {
//   return ({ active, payload, label }: any) => {
//     if (!active || !payload?.length) return null;
//     const row = payload[0];
//     const value = row?.value as number;
//     const name = row?.payload?.name as string; // "🇺🇸 United States"
//     const Icon = METRIC_ICONS[metricKey === "Clicks" ? "Clicks" : metricKey] ?? BarChart3;

//     return (
//       <div
//         className="rounded-md shadow-sm p-2"
//         style={{
//           background: "#fff",
//           border: `1px solid ${TK.border}`,
//           minWidth: 220,
//           pointerEvents: "none",
//           fontFamily: FONT_STACK,
//         }}
//       >
//         <div className="flex items-center justify-between mb-1">
//           <div className="flex items-center gap-2">
//             <Icon size={14} color={TK.brand} />
//             <div className="text-xs font-semibold" style={{ color: TK.text }}>
//               {metricKey}
//             </div>
//           </div>
//           <div className="flex items-center gap-1 text-xs" style={{ color: TK.muted }}>
//             <MapPin size={12} />
//             <span>{name}</span>
//           </div>
//         </div>
//         <div className="mt-1 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: row?.color || TK.valueBlue }} />
//             <span className="text-xs" style={{ color: TK.muted }}>
//               Value
//             </span>
//           </div>
//           <div className="text-xs font-semibold" style={{ color: TK.text }}>
//             {metricKey.endsWith("%") ? pct(value, 1) : nf(value)}
//           </div>
//         </div>
//       </div>
//     );
//   };
// };

// This is a factory function that returns the tooltip renderer
// const GeoBarsTooltip = (metricKey: string) => {
//   return ({ active, payload, label }: any) => {
//     if (!active || !payload?.length) return null;

//     const row = payload[0];
//     const value = row?.value as number;
//     const name = row?.payload?.name as string;
//     const Icon = METRIC_ICONS[metricKey === "Clicks" ? "Clicks" : metricKey] ?? BarChart3;

//     return (
//       <div
//         className="rounded-md shadow-sm p-2"
//         style={{
//           background: "#fff",
//           border: `1px solid ${TK.border}`,
//           minWidth: 220,
//           pointerEvents: "none",
//           fontFamily: FONT_STACK,
//         }}
//       >
//         <div className="flex items-center justify-between mb-1">
//           <div className="flex items-center gap-2">
//             <Icon size={14} color={TK.brand} />
//             <div className="text-xs font-semibold" style={{ color: TK.text }}>
//               {metricKey}
//             </div>
//           </div>
//           <div className="flex items-center gap-1 text-xs" style={{ color: TK.muted }}>
//             <MapPin size={12} />
//             <span>{name}</span>
//           </div>
//         </div>
//         <div className="mt-1 flex items-center justify-between">
//           <div className="flex items-center gap-2">
//             <span
//               className="inline-block h-2.5 w-2.5 rounded-[3px]"
//               style={{ background: row?.color || TK.valueBlue }}
//             />
//             <span className="text-xs" style={{ color: TK.muted }}>
//               Value
//             </span>
//           </div>
//           <div className="text-xs font-semibold" style={{ color: TK.text }}>
//             {metricKey.endsWith("%") ? pct(value, 1) : nf(value)}
//           </div>
//         </div>
//       </div>
//     );
//   };
// };


const GeoBarsTooltip = (metricKey: string) =>
  Object.assign(
    ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;

      const row = payload[0];
      const value = row?.value as number;
      const name = row?.payload?.name as string;
      const Icon = METRIC_ICONS[metricKey === "Clicks" ? "Clicks" : metricKey] ?? BarChart3;

      return (
        <div
          className="rounded-md shadow-sm p-2"
          style={{
            background: "#fff",
            border: `1px solid ${TK.border}`,
            minWidth: 220,
            pointerEvents: "none",
            fontFamily: FONT_STACK,
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Icon size={14} color={TK.brand} />
              <div className="text-xs font-semibold" style={{ color: TK.text }}>
                {metricKey}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: TK.muted }}>
              <MapPin size={12} />
              <span>{name}</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px]"
                style={{ background: row?.color || TK.valueBlue }}
              />
              <span className="text-xs" style={{ color: TK.muted }}>
                Value
              </span>
            </div>
            <div className="text-xs font-semibold" style={{ color: TK.text }}>
              {metricKey.endsWith("%") ? pct(value, 1) : nf(value)}
            </div>
          </div>
        </div>
      );
    },
    { displayName: `GeoBarsTooltip(${metricKey})` }
  );


/* ─────────────────────────────────────────────────────────────
   Device Distribution (Pie ↔ Bar)
   ───────────────────────────────────────────────────────────── */
const DeviceDistribution: React.FC<{
  data: DeviceDatum[];
  activeDevice: string | "All";
  onFilterDevice: (d: string | "All") => void;
}> = ({ data, activeDevice, onFilterDevice }) => {
  const [mode, setMode] = React.useState<"pie" | "bar">("pie");
  const [activeSlice, setActiveSlice] = React.useState<number | null>(null);

  const totalSessions = React.useMemo(() => data.reduce((a, b) => a + b.sessions, 0), [data]);

  const pieData = data.map((d) => ({
    name: d.device,
    value: d.sessions > 0 ? (d.sessions / Math.max(1, totalSessions)) * 100 : 0,
    raw: d.sessions,
    engagementRate: d.engagementRate,
    bounceRate: d.bounceRate,
    avgSec: d.avgSessionDurationSec,
    fill: DEVICE_COLORS[d.device] ?? TK.valueBlue,
  }));

  const barData = data.map((d) => ({
    device: d.device,
    Sessions: d.sessions,
    "Engagement %": d.engagementRate,
    "Bounce %": d.bounceRate,
  }));

  const ref = React.useRef<HTMLDivElement>(null);

  // Active slice renderer — "pressed below" effect (slight inset + tiny y-translate)
  const renderActiveSlice = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g transform="translate(0,1.5)">
        {/* main sector slightly inset to look pressed */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius + 2}
          outerRadius={outerRadius - 2}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        {/* thin highlight rim to enhance pressed illusion */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius - 2}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          fillOpacity={0.12}
        />
      </g>
    );
  };

  return (
    <SectionCard
      title="Device Distribution (GA4)"
      Icon={PieIcon}
      right={
        <div className="flex items-center gap-2">
          <SegSwitch
            ariaLabel="Device chart mode"
            value={mode}
            onChange={(v) => setMode(v as "pie" | "bar")}
            options={[
              { key: "pie", label: "Pie", icon: PieIcon },
              { key: "bar", label: "Bar", icon: BarChart3 },
            ]}
          />
          <div className="ml-1">
            <IconBtn title="Export PNG" onClick={() => exportPNGFrom(ref.current, "device-distribution.png")}>
              <Download className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>
      }
    >
      {/* Legend / device filter chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2" style={{ fontFamily: FONT_STACK }}>
        {(["All", ...data.map((d) => d.device)] as const).map((label) => (
          <button
            key={label}
            onClick={() => onFilterDevice(label)}
            className={`h-8 px-3 rounded-[6px] text-sm border ${
              activeDevice === label ? "bg-[var(--wr-pastel-blue,#D9EEF8)]" : "bg-white"
            }`}
            style={{ borderColor: TK.border, color: TK.text, cursor: "pointer" }}
          >
            <span
              className="inline-block rounded-full mr-2"
              style={{
                width: 10,
                height: 10,
                background: label === "All" ? TK.valueBlue : DEVICE_COLORS[label as string] ?? TK.valueBlue,
              }}
            />
            {label}
            {label !== "All" && (
              <span className="ml-2 text-xs text-[color:var(--wr-muted,#6B7280)]">
                {pct(((data.find((d) => d.device === label)?.sessions ?? 0) / Math.max(1, totalSessions)) * 100, 1)}
              </span>
            )}
          </button>
        ))}
      </div>

<div className="flex justify-between w-full">

      {/* Chart */}
      <div ref={ref} className="w-full">
        {mode === "pie" ? (
          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer>
              <RPieChart onMouseLeave={() => setActiveSlice(null)}>
                <RTooltip
                  content={<DeviceDonutTooltip />}
                  allowEscapeViewBox={{ x: true, y: true }}
                  wrapperStyle={{ zIndex: 2147483647 }} // always above
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={100}
                  paddingAngle={2}
                  activeIndex={activeSlice ?? undefined}
                  activeShape={renderActiveSlice}
                  onMouseEnter={(_, idx) => setActiveSlice(idx)}
                  onMouseLeave={() => setActiveSlice(null)}
                  onClick={(p) => onFilterDevice((p?.name as string) ?? "All")}
                  isAnimationActive
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.fill} cursor="pointer" />
                  ))}
                </Pie>
              </RPieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-full" style={{ height: 280 }}>
            <ResponsiveContainer>
              <RBarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 6 }}>
                <CartesianGrid vertical={false} stroke={TK.borderLight} />
                <XAxis dataKey="device" tick={{ fontSize: 12, fill: TK.muted, fontFamily: FONT_STACK }} />
                <YAxis tick={{ fontSize: 12, fill: TK.muted, fontFamily: FONT_STACK }} />
                <RTooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  wrapperStyle={{ zIndex: 2147483647 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0];
                    const color = p?.color ?? TK.valueBlue;
                    const Icon = METRIC_ICONS[p?.name as string] ?? BarChart3;
                    const TitleIcon = label === "Mobile" ? Smartphone : label === "Desktop" ? Monitor : TabletIcon;
                    return (
                      <div
                        className="rounded-md shadow-sm p-2"
                        style={{
                          background: "#fff",
                          border: `1px solid ${TK.border}`,
                          minWidth: 220,
                          fontFamily: FONT_STACK,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon size={14} color={TK.brand} />
                            <div className="text-xs font-semibold" style={{ color: TK.text }}>
                              {p.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs" style={{ color: TK.muted }}>
                            <TitleIcon size={12} color={TK.brand} />
                            <span>{label}</span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
                            <span className="text-xs" style={{ color: TK.muted }}>
                              Value
                            </span>
                          </div>
                          <div className="text-xs font-semibold" style={{ color: TK.text }}>
                     {typeof p.name === "string" && p.name.endsWith("%") ? pct(p.value as number, 1) : nf(p.value as number)}

                          </div>
                        </div>
                      </div>
                    );
                  }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
                {/* Bottom flat, top curved (6px) */}
                <Bar dataKey="Sessions" fill={METRIC_COLORS.Sessions} radius={[6, 6, 0, 0]} />
              </RBarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Device KRIs */}
      <div className="flex gap-3 flex-col justify-end" style={{ fontFamily: FONT_STACK }}>
        {data.map((d) => (
          <div
            key={d.device}
            className="rounded-md p-3 flex items-center gap-3 border"
          >
            <div className="h-9 w-9 grid place-items-center rounded-full" style={{ background: `${(DEVICE_COLORS[d.device] ?? TK.valueBlue)}15` }} aria-hidden>
              {d.device === "Mobile" && <Smartphone size={18} color={TK.brand} />}
              {d.device === "Desktop" && <Monitor size={18} color={TK.brand} />}
              {d.device === "Tablet" && <TabletIcon size={18} color={TK.brand} />}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold" style={{ color: TK.text }}>
                {d.device} • {nf(d.sessions)} sessions
              </div>
              <div className="text-[12px]" style={{ color: TK.muted }}>
                Eng. {pct(d.engagementRate, 1)} • Bounce {pct(d.bounceRate, 1)} • Avg {dur(d.avgSessionDurationSec)}
              </div>
            </div>
          </div>
        ))}
      </div>
</div>

    </SectionCard>
  );
};

/* ─────────────────────────────────────────────────────────────
   Geo Distribution (Bars ↔ Table)
   ───────────────────────────────────────────────────────────── */
const GeoDistribution: React.FC<{
  data: GeoDatum[];
  gscConnected: boolean;
  activeDevice: string | "All";
  onDeepLink?: (dest: "search-performance" | "traffic") => void;
}> = ({ data, gscConnected, activeDevice, onDeepLink }) => {
  const [view, setView] = React.useState<"bars" | "table">("bars");
  const [metric, setMetric] = React.useState<"sessions" | "clicks" | "engagement" | "bounce">("sessions");

  React.useEffect(() => {
    if (!gscConnected && metric === "clicks") setMetric("sessions");
  }, [gscConnected, metric]);

  const top = React.useMemo(() => {
    const arr = [...data];
    if (metric === "sessions") arr.sort((a, b) => b.sessions - a.sessions);
    else if (metric === "clicks") arr.sort((a, b) => (b.clicks ?? -1) - (a.clicks ?? -1));
    else if (metric === "engagement") arr.sort((a, b) => b.engagementRate - a.engagementRate);
    else arr.sort((a, b) => b.bounceRate - a.bounceRate);
    return arr.slice(0, 10);
  }, [data, metric]);

  const barsData = top.map((d) => ({
    name: `${flagEmoji(d.countryCode)} ${d.country}`,
    Sessions: d.sessions,
    Clicks: d.clicks ?? 0,
    "Engagement %": d.engagementRate,
    "Bounce %": d.bounceRate,
  }));

  const metricKey =
    metric === "sessions" ? "Sessions" : metric === "clicks" ? "Clicks" : metric === "engagement" ? "Engagement %" : "Bounce %";

  const metricIcon = METRIC_ICONS[metricKey] ?? BarChart3;
  const barColor = (METRIC_COLORS as any)[metricKey] ?? TK.valueBlue;

  const refBars = React.useRef<HTMLDivElement>(null);
  const refTable = React.useRef<HTMLDivElement>(null);

  return (
    <SectionCard
      title="Geo Distribution (GA4 + GSC)"
      Icon={Globe}
      right={
        <div className="flex items-center gap-2">
          {/* Metric switch (segmented, with branded icons) */}
          <SegSwitch
            ariaLabel="Metric"
            value={metric}
            onChange={(k) => setMetric(k as any)}
            options={[
              { key: "sessions", label: "Sessions", icon: BarChart3 },
              { key: "engagement", label: "Engagement", icon: Sparkles },
              { key: "bounce", label: "Bounce", icon: TrendingDown },
              { key: "clicks", label: "Organic Clicks", icon: MousePointerClick, disabled: !gscConnected },
            ]}
          />

          <SegSwitch
            ariaLabel="View"
            value={view}
            onChange={(k) => setView(k as "bars" | "table")}
            options={[
              { key: "bars", label: "Bars", icon: BarChart3 },
              { key: "table", label: "Table", icon: Globe },
            ]}
          />

          {view === "bars" ? (
            <IconBtn title="Export PNG" onClick={() => exportPNGFrom(refBars.current, "geo-bars.png")}>
              <Download className="h-4 w-4" />
            </IconBtn>
          ) : (
            <IconBtn title="Export CSV" onClick={() => exportCSV("geo-table.csv", data as any)}>
              <Download className="h-4 w-4" />
            </IconBtn>
          )}
        </div>
      }
    >
      {/* Metric / device note */}
      <div className="mb-3 flex flex-wrap items-center gap-2" style={{ fontFamily: FONT_STACK }}>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[12px]" style={{ borderColor: TK.border }}>
          {React.createElement(metricIcon, { size: 14, color: TK.brand })}
          <span style={{ color: TK.text }}>{metricKey}</span>
        </div>
        <div className="ml-auto text-[12px]" style={{ color: TK.muted }}>
          Device filter: <strong>{activeDevice}</strong>
        </div>
      </div>

      {/* Bars or Table */}
      {view === "bars" ? (
        <div ref={refBars} className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer>
            {/* layout="vertical" → horizontal bars; curve the far (right) edge only */}
            <RBarChart data={barsData} layout="vertical" margin={{ top: 10, left: 10, right: 10, bottom: 10 }}>
              <CartesianGrid stroke={TK.borderLight} />
              <XAxis type="number" tick={{ fontSize: 12, fill: TK.muted, fontFamily: FONT_STACK }} />
              <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12, fill: TK.muted, fontFamily: FONT_STACK }} />
              <RTooltip
                content={GeoBarsTooltip(metricKey)}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 2147483647 }}
              />
              <RLegend />
              {/* For horizontal bars: [top-left, top-right, bottom-right, bottom-left] → left edge flat, right edge curved */}
              <Bar dataKey={metricKey} fill={barColor} radius={[0, 6, 6, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          ref={refTable}
          className="rounded-md border overflow-auto"
          style={{ borderColor: TK.borderLight, fontFamily: FONT_STACK }}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: TK.borderLight }}>
              <tr>
                <th className="text-left p-2 pl-3 w-[40%]" style={{ color: TK.muted, fontWeight: 600 }}>
                  Country
                </th>
                <th className="text-right p-2" style={{ color: TK.muted, fontWeight: 600 }}>
                  Sessions
                </th>
                {gscConnected && (
                  <th className="text-right p-2" style={{ color: TK.muted, fontWeight: 600 }}>
                    Org. Clicks{" "}
                    <button
                      className="inline-flex items-center text-[12px] ml-1 underline"
                      onClick={() => onDeepLink?.("search-performance")}
                      title="Open Search Performance"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </th>
                )}
                <th className="text-right p-2" style={{ color: TK.muted, fontWeight: 600 }}>
                  Engagement %
                </th>
                <th className="text-right p-2 pr-3" style={{ color: TK.muted, fontWeight: 600 }}>
                  Bounce %
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={r.countryCode + i} className="hover:bg-[#FBFDFF]">
                  <td className="p-2 pl-3">
                    <span className="mr-2">{flagEmoji(r.countryCode)}</span>
                    <span className="font-medium" style={{ color: TK.text }}>
                      {r.country}
                    </span>
                  </td>
                  <td className="p-2 text-right" style={{ color: TK.text }}>
                    {nf(r.sessions)}
                  </td>
                  {gscConnected && (
                    <td className="p-2 text-right" style={{ color: TK.text }}>
                      {r.clicks == null ? "—" : nf(r.clicks)}
                    </td>
                  )}
                  <td className="p-2 text-right" style={{ color: TK.text }}>
                    {pct(r.engagementRate, 1)}
                  </td>
                  <td className="p-2 pr-3 text-right" style={{ color: TK.text }}>
                    {pct(r.bounceRate, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main Section: Device & Geo Distribution (single-file drop‑in)
   ───────────────────────────────────────────────────────────── */
export default function AnalyticsDeviceGeoSection({
  className,
  deviceData,
  geoData,
  gscConnected = true,
  onDeepLink,
}: SectionProps) {
  const [activeDevice, setActiveDevice] = React.useState<"All" | string>("All");

  const devices = React.useMemo(() => deviceData ?? makeDemoDevice(), [deviceData]);
  const geo = React.useMemo(() => geoData ?? makeDemoGeo(), [geoData]);

  return (
    <div className={className} style={{ fontFamily: FONT_STACK }}>
      {/* Section title with branded icon */}
      <div className="mb-3 flex items-center gap-2 mt-4">
        <Globe size={18} color={TK.brand} />
        <h2 className="text-[16px] font-semibold" style={{ color: TK.text }}>
          Device & Geo Distribution
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="col-span-2">
        <DeviceDistribution data={devices} activeDevice={activeDevice} onFilterDevice={(d) => setActiveDevice(d)} />
        </div>
        <div className="col-span-3">
        <GeoDistribution data={geo} gscConnected={gscConnected} activeDevice={activeDevice} onDeepLink={onDeepLink} />
        </div>
      </div>
    </div>
  );
}
