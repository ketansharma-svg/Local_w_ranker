import * as React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";
import {
  ChevronDown, Download, Info, RefreshCw, AlertTriangle, Columns2,
  BarChart3, Table as TableIcon, Search, MousePointerClick, Link, DollarSign, Mail, Share2, MoreHorizontal,
  Users, Clock, TrendingDown, Percent
} from "lucide-react";

/* ───────────────────────── Tokens (brand-aligned) ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD",          // <- requested brand blue
  brandPastel: "#D9EEF8",
  card: "#FFFFFF",
};

/* Channel chips → dropdown options */
type Channel =
  | "all"
  | "organic"
  | "direct"
  | "referral"
  | "paid"
  | "email"
  | "social"
  | "other";

/* Consistent color used for table bullet AND chart bar (kept) */
const CHANNEL_COLOR: Record<Exclude<Channel, "all">, string> = {
  organic: "#4286F5",   // blue
  direct: "#6B7280",    // slate
  referral: "#22C55E",  // green
  paid: "#F59E0B",      // amber
  email: "#0EA5E9",     // sky
  social: "#A855F7",    // purple
  other: "#94A3B8",     // gray
};

/* Channel → branded icon (all icons are #008CCD) */
const CHANNEL_ICON: Record<Exclude<Channel, "all">, React.ComponentType<{ size?: number; className?: string }>> = {
  organic: Search,
  direct: MousePointerClick,
  referral: Link,
  paid: DollarSign,
  email: Mail,
  social: Share2,
  other: MoreHorizontal,
};

/* ───────────────────────── Types ───────────────────────── */
type Row = {
  id: string;
  label: string;           // "google / organic"
  channel: Exclude<Channel, "all">;
  sessions: number;
  avgEngagementSec: number;  // seconds
  bounceRate: number;        // 0..1
  pagesPerSession: number;
  convRate?: number;         // 0..1 (optional)
};


/* ───────────────────────── Utils ───────────────────────── */
const nf = (n: number) => n.toLocaleString();
const pct = (p: number, fd = 1) =>
  `${(p * 100).toLocaleString(undefined, { maximumFractionDigits: fd })}%`;
const toTime = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

/* ───────────────────────── Small atoms (chips & toggles) ───────────────────────── */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex overflow-hidden border rounded"
      style={{ borderColor: TK.border, fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif" }}
    >
      {options.map((o, i) => {
        const isActive = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-2.5 h-8 text-sm cursor-pointer ${i > 0 ? "border-l" : ""}`}
            style={{
              borderColor: TK.border,
              color: isActive ? TK.brand : TK.text,
              background: isActive ? TK.brandPastel : "#fff",
              fontWeight: isActive ? 600 : 500,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip<T extends string>({
  label,
  active,
  onClick,
}: {
  label: T;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="h-8 px-3 rounded cursor-pointer"
      style={{
        border: `1px solid ${TK.border}`,
        background: active ? TK.brandPastel : "#fff",
        color: active ? TK.brand : TK.text,
        fontWeight: active ? 600 : 500,
        fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
      }}
    >
      {label}
    </button>
  );
}

/* Tooltip content for the chart (smart popover with branded icons) */
function ChartTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Row;

  const Item = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string;
  }) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="shrink-0 text-#008CCD" />
        <span className="text-[12px]" style={{ color: TK.muted }}>{label}</span>
      </div>
      <b className="text-[12px]" style={{ color: TK.text }}>{value}</b>
    </div>
  );

  return (
    <div
      className="rounded-md shadow text-[12px] p-2"
      style={{
        background: "#fff",
        border: `1px solid ${TK.border}`,
        fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
      }}
    >
      <div className="font-medium mb-1 flex items-center gap-1.5" style={{ color: TK.text }}>
        {/* Channel icon (branded) before label */}
        {(() => {
          const Icon = CHANNEL_ICON[d.channel];
          return <Icon size={14} className="text-#008CCD" />;
        })()}
        {d.label}
      </div>
      <div className="flex flex-col gap-1">
        <Item icon={Users} label="Sessions" value={nf(d.sessions)} />
        <Item icon={Clock} label="Avg. Engagement" value={toTime(d.avgEngagementSec)} />
        <Item icon={TrendingDown} label="Bounce rate" value={pct(d.bounceRate)} />
        {d.convRate != null && <Item icon={Percent} label="CR" value={pct(d.convRate, 1)} />}
      </div>
    </div>
  );
}

/* ───────────────────────── Section shell ───────────────────────── */
function SectionShell({
  title,
  children,
  right,
}: React.PropsWithChildren<{ title: React.ReactNode; right?: React.ReactNode }>) {
  return (
    <section
      className="rounded-md bg-white"
      style={{
        border: `1px solid ${TK.border}`,
        fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${TK.borderLight}` }}
      >
        <h2 className="text-[15px] font-semibold flex items-center gap-2" style={{ color: TK.text }}>
          <BarChart3 size={16} style={{ color: TK.brand }} />
          {title}
        </h2>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Badge({
  tone = "default",
  children,
}: React.PropsWithChildren<{ tone?: "default" | "ok" | "warn" | "danger" }>) {
  const map = {
    default: { bg: "#F3F4F6", fg: "#374151" },
    ok: { bg: "#ECFDF5", fg: "#065F46" },
    warn: { bg: "#FFFBEB", fg: "#92400E" },
    danger: { bg: "#FEF2F2", fg: "#991B1B" },
  } as const;
  const c = map[tone];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium"
      style={{ background: c.bg, color: c.fg, fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif" }}
    >
      {children}
    </span>
  );
}

/* ───────────────────────── Main Component ───────────────────────── */
export default function SessionsBySourceMedium({data}) {
  const [channel, setChannel] = React.useState<Channel>("all"); // chips
  const [topN, setTopN] = React.useState<5 | 10 | 15>(10);
  const [selected, setSelected] = React.useState<string | null>(null); // clicked bar filter
  const [columns, setColumns] = React.useState({
    sessions: true,
    avgTime: true,
    bounce: true,
    pps: true,
    cr: true,
  });

  const rows: Row[] = React.useMemo(() => {
    return (data ?? []).map((r, idx) => {
      // channel detection from label
      const lbl = r.source_medium || "";
      const ch = lbl.includes("organic") ? "organic"
              : lbl.includes("cpc")     ? "paid"
              : lbl.includes("referral")? "referral"
              : lbl.includes("email")   ? "email"
              : lbl.includes("social")  ? "social"
              : lbl.includes("direct")  ? "direct"
              : "other";
      return {
        id: `src_${idx}`,
        label: lbl,
        channel: ch as Exclude<Channel,"all">,
        sessions: Number(r.sessions || 0),
        avgEngagementSec: Number(r.avg_engagement_seconds || 0),
        bounceRate: Number(r.bounce_rate || 0) / 100, // convert to 0..1
        pagesPerSession: Number(r.pages_per_session || 0),
        convRate: r.conv_rate != null ? Number(r.conv_rate)/100 : undefined,
      };
    });
  }, [data]);
  

  const filtered = React.useMemo(() => {
    if (channel !== "all") rows.filter((r) => r.channel === channel);
    if (selected) rows.filter((r) => r.id === selected);
    rows.sort((a, b) => b.sessions - a.sessions);
    return rows.slice(0, topN);
  }, [channel, selected, topN]);

  const totalSourcesLabel =
    channel === "all" ? "10 sources" : `${filtered.length} sources`;

  function resetAll() {
    setChannel("all");
    setTopN(10);
    setSelected(null);
    setColumns({ sessions: true, avgTime: true, bounce: true, pps: true, cr: true });
  }

  function exportCsv() {
    const header = [
      "Source / Medium",
      "Channel",
      "Sessions",
      "Avg Engagement (sec)",
      "Bounce Rate",
      "Pages / Session",
      "Conversion Rate",
    ].join(",");
    const lines = filtered.map((r) =>
      [
        JSON.stringify(r.label),
        r.channel,
        r.sessions,
        r.avgEngagementSec,
        r.bounceRate,
        r.pagesPerSession,
        r.convRate ?? "",
      ].join(",")
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sessions-by-source.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* Custom Y-axis tick with text only (icons handled via legend & tooltip) */

  return (
    <SectionShell
      title={
        <span className="inline-flex items-center gap-2">
          Sessions by Source / Medium
          <span className="text-xs font-medium px-1.5 py-0.5 rounded" title="GA4 dimension"
                style={{ background: "#F3F4F6", fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif" }}>
            sessionSourceMedium · GA4
          </span>
        </span>
      }
      right={
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel chips (modular) */}
          <div className="flex items-center gap-1.5 pr-2 border-r" style={{ borderColor: TK.borderLight }}>
            {(["all","organic","direct","referral","paid","email","social","other"] as Channel[]).map((c) => (
              <Chip
                key={c}
                label={c === "all" ? ("All" as any) : (c[0].toUpperCase() + c.slice(1)) as any}
                active={channel === c}
                onClick={() => setChannel(c)}
              />
            ))}
          </div>

          {/* Top-N segmented */}
          <Segmented
            ariaLabel="Top N"
            value={String(topN) as "5" | "10" | "15"}
            onChange={(v) => setTopN(Number(v) as 5 | 10 | 15)}
            options={[
              { key: "5", label: "Top 5" },
              { key: "10", label: "Top 10" },
              { key: "15", label: "Top 15" },
            ] as any}
          />

          {/* Columns dropdown */}
          <div className="relative">
            <details className="group">
              <summary
                className="list-none inline-flex items-center gap-1 h-8 px-2.5 rounded border text-sm cursor-pointer"
                style={{
                  borderColor: TK.border,
                  color: TK.text,
                  background: "#fff",
                  fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
                }}
              >
                <Columns2 size={16} style={{ color: TK.brand }} /> Columns
                <ChevronDown size={14} className="text-gray-400" />
              </summary>
              <div
                className="absolute right-0 mt-1 bg-white rounded-md shadow p-2 z-40 w-48"
                style={{ border: `1px solid ${TK.border}` }}
              >
                {[
                  ["sessions", "Sessions"],
                  ["avgTime", "Avg. Engagement Time"],
                  ["bounce", "Bounce Rate"],
                  ["pps", "Pages / Session"],
                  ["cr", "Conversion Rate"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm px-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(columns as any)[key]}
                      onChange={(e) =>
                        setColumns((c) => ({ ...c, [key]: e.target.checked }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>

          <button
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded border text-sm cursor-pointer"
            style={{
              borderColor: TK.border,
              color: TK.text,
              background: "#fff",
              fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
            }}
            onClick={exportCsv}
            aria-label="Export CSV"
            title="Export CSV"
          >
            <Download size={16} style={{ color: TK.brand }} /> Export
          </button>

          <button
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded border text-sm cursor-pointer"
            style={{
              borderColor: TK.border,
              color: TK.text,
              background: "#fff",
              fontFamily: "Inter, Inter Fallback, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
            }}
            onClick={resetAll}
            aria-label="Reset"
            title="Reset"
          >
            <RefreshCw size={16} style={{ color: TK.brand }} /> Reset
          </button>
        </div>
      }
    >
      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Horizontal bar chart card */}
        <div
          className="rounded-md"
          style={{ border: `1px dashed ${TK.borderLight}` }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: TK.text }}>
              <BarChart3 size={14} style={{ color: TK.brand }} />
              Source distribution (sessions)
            </div>
            <div className="text-[12px] inline-flex items-center gap-1" style={{ color: TK.muted }}>
              <Info size={14} style={{ color: TK.brand }} /> Click a bar to filter
            </div>
          </div>

          {/* Channel legend with branded icons (chart-side “source type”) */}
          <div className="px-3 pb-1 flex flex-wrap items-center gap-3">
            {(Object.keys(CHANNEL_COLOR) as (keyof typeof CHANNEL_COLOR)[]).map((ch) => {
              const Icon = CHANNEL_ICON[ch];
              return (
                <div key={ch} className="flex items-center gap-1.5 text-[12px]">
                  <Icon size={13} className="text-#008CCD" />
                  <span style={{ color: TK.muted }}>{ch[0].toUpperCase() + ch.slice(1)}</span>
                  <span
                    className="inline-block rounded-full ml-1"
                    style={{ width: 8, height: 8, background: CHANNEL_COLOR[ch] }}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>

          <div className="h-[360px] pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filtered}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 8 }}
                barCategoryGap={8}
              >
                <CartesianGrid stroke={TK.borderLight} horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={190}
                  tick={{ fontSize: 12, fill: "#4B5563" }}
                />
                <RTooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                <Bar
                  dataKey="sessions"
                  /* ⬇︎ Only far end rounded (6px), flat where the bar touches the Y-axis */
                  radius={[0, 6, 6, 0]}
                  onClick={(d: any) => setSelected((prev) => (prev === d.id ? null : d.id))}
                  // ensure pointer on bars
                  style={{ cursor: "pointer" }}
                >
                  {filtered.map((r) => (
                    <Cell
                      key={r.id}
                      fill={
                        CHANNEL_COLOR[
                          r.channel as keyof typeof CHANNEL_COLOR
                        ]
                      }
                      stroke={selected === r.id ? "#111827" : "transparent"}
                      strokeWidth={selected === r.id ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Table card */}
        <div
          className="rounded-md"
          style={{ border: `1px solid ${TK.borderLight}` }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: TK.text }}>
              <TableIcon size={14} style={{ color: TK.brand }} />
              Source Performance
            </div>
            <div className="text-[12px]" style={{ color: TK.muted }}>
              {totalSourcesLabel}
            </div>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-sm">
              <thead
                className="sticky top-0 bg-white"
                style={{ boxShadow: `inset 0 -1px 0 ${TK.borderLight}` }}
              >
                <tr className="text-left">
                  <th className="px-3 py-2 min-w-[220px]" style={{ color: TK.muted }}>
                    Source / Medium
                  </th>
                  {columns.sessions && (
                    <th className="px-3 py-2 text-right" style={{ color: TK.muted }}>
                      Sessions
                    </th>
                  )}
                  {columns.avgTime && (
                    <th className="px-3 py-2 text-center" style={{ color: TK.muted }}>
                      Avg. Engagement Time
                    </th>
                  )}
                  {columns.bounce && (
                    <th className="px-3 py-2 text-center" style={{ color: TK.muted }}>
                      Bounce Rate
                    </th>
                  )}
                  {columns.pps && (
                    <th className="px-3 py-2 text-center" style={{ color: TK.muted }}>
                      Pages / Session
                    </th>
                  )}
                  {columns.cr && (
                    <th className="px-3 py-2 text-center" style={{ color: TK.muted }}>
                      CR
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const color =
                    CHANNEL_COLOR[r.channel as keyof typeof CHANNEL_COLOR];
                  const bounceTone =
                    r.bounceRate >= 0.65
                      ? "danger"
                      : r.bounceRate >= 0.5
                      ? "warn"
                      : "default";
                  const ChIcon = CHANNEL_ICON[r.channel];
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#F8FAFC] cursor-pointer"
                      onClick={() => setSelected((prev) => (prev === r.id ? null : r.id))}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {/* Branded source-type icon + channel color dot */}
                          <ChIcon size={14} className="text-#008CCD" />
                          <span
                            className="inline-block rounded-full"
                            style={{
                              width: 8,
                              height: 8,
                              background: color,
                              boxShadow:
                                selected === r.id
                                  ? "0 0 0 2px rgba(0,0,0,0.08)"
                                  : "none",
                            }}
                          />
                          <span className="font-medium" style={{ color: TK.text }}>
                            {r.label}
                          </span>
                        </div>
                      </td>
                      {columns.sessions && (
                        <td className="px-3 py-2 text-right" style={{ color: TK.text }}>
                          {nf(r.sessions)}
                        </td>
                      )}
                      {columns.avgTime && (
                        <td className="px-3 py-2 text-center" style={{ color: TK.text }}>
                          {toTime(r.avgEngagementSec)}
                        </td>
                      )}
                      {columns.bounce && (
                        <td className="px-3 py-2 text-center">
                          <Badge tone={bounceTone as any}>
                            {pct(r.bounceRate)}
                            {bounceTone !== "default" && (
                              <AlertTriangle size={14} className="ml-1" />
                            )}
                          </Badge>
                        </td>
                      )}
                      {columns.pps && (
                        <td className="px-3 py-2 text-center" style={{ color: TK.text }}>
                          {r.pagesPerSession.toFixed(1)}
                        </td>
                      )}
                      {columns.cr && (
                        <td className="px-3 py-2 text-center" style={{ color: TK.text }}>
                          {r.convRate != null ? pct(r.convRate, 1) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* footer */}
          <div
            className="flex items-center justify-between px-3 py-2 text-[12px]"
            style={{ borderTop: `1px solid ${TK.borderLight}`, color: TK.muted }}
          >
            <div>
              Showing {filtered.length} of {channel === "all" ? rows.length : filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px]">Rows:</span>
              <Segmented
                ariaLabel="Rows per view"
                value={String(topN) as "5" | "10" | "15"}
                onChange={(v) => setTopN(Number(v) as 5 | 10 | 15)}
                options={[
                  { key: "5", label: "5" },
                  { key: "10", label: "10" },
                  { key: "15", label: "15" },
                ] as any}
              />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

