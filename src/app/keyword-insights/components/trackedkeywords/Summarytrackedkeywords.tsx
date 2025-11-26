"use client"

import type React from "react"
import { useId, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Cell,
} from "recharts"
import { Info, Sparkles, Loader2 } from "lucide-react"
import InfoTooltip from "@/src/components/common/InfoTooltip"

const GlobalStyles = () => (
  <style>{`
  :root{
    --wr-brand:#008CCD; --wr-value-blue:#0077FF; --wr-pastel-brand:#D9EEF8;
    --wr-text:#111827; --wr-muted:#6B7280;
    --wr-borderLight:#EFF0F6; --wr-chip-bg:#F5F7FA; --wr-chip-hover:#E5E7EB;
    --wr-success:#10B981; --wr-warning:#F59E0B; --wr-danger:#EF4444; --wr-info:#3B82F6; --wr-indigo:#8B5CF6;
    --wr-panel:#FFFFFF; --wr-radius:6px; --wr-shadow-sm:0 1px 2px rgba(17,24,39,.06); --wr-shadow-md:0 2px 6px rgba(17,24,39,.08);
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:var(--wr-text);background:#fff}
  .wr-section{padding:16px;background:var(--wr-panel);border:1px solid var(--wr-borderLight);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm)}
  .wr-title{font-weight:600;color:var(--wr-text)}
  .wr-muted{color:var(--wr-muted)}
  .wr-toolbar{display:flex;align-items:center;gap:8px}
  .wr-card{background:#fff;border:1px solid var(--wr-borderLight);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm)}
  .wr-card:hover{transform:translateY(-1px);box-shadow:var(--wr-shadow-md)}
  .wr-link{color:var(--wr-value-blue);text-decoration:none}
  /* Grid */
  .wr-grid{display:grid;gap:12px}
  @media (min-width:1200px){.wr-grid-A{grid-template-columns:repeat(4,1fr)} .wr-grid-B{grid-template-columns:repeat(2,1fr)}}
  @media (min-width:768px) and (max-width:1199px){.wr-grid-A{grid-template-columns:repeat(2,1fr)} .wr-grid-B{grid-template-columns:1fr}}
  @media (max-width:767px){.wr-grid-A,.wr-grid-B{grid-template-columns:1fr}}

  /* Segmented (modern chips) */
  .seg{display:inline-flex;gap:2px;background:var(--wr-chip-bg);border:1px solid var(--wr-borderLight);border-radius:999px;padding:2px}
  .seg button{
    height:28px; padding:0 12px; border:0; border-radius:999px; background:transparent; cursor:pointer;
    font-size:12px; color:var(--wr-text); transition:all .15s ease;
  }
  .seg button[data-active="true"]{background:var(--wr-pastel-brand); box-shadow:inset 0 0 0 1px var(--wr-value-blue)}
  .seg button:focus-visible{outline:2px solid var(--wr-value-blue); outline-offset:1px}

  /* Switch (tiny) */
  .switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none}
  .switch .track{width:36px;height:20px;border-radius:999px;background:var(--wr-chip-bg);border:1px solid var(--wr-borderLight);position:relative;transition:all .15s}
  .switch .thumb{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;border:1px solid var(--wr-borderLight);transition:all .15s}
  .switch[data-on="true"] .track{background:var(--wr-pastel-brand); box-shadow:inset 0 0 0 1px var(--wr-value-blue)}
  .switch[data-on="true"] .thumb{left:18px}

  /* Legend pills */
  .legend{display:flex;gap:6px;flex-wrap:wrap}
  .legend button{
    display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--wr-borderLight);
    background:var(--wr-chip-bg); font-size:12px; cursor:pointer; transition:all .15s ease;
  }
  .legend button[data-active="true"]{background:#fff; box-shadow:inset 0 0 0 1px var(--wr-value-blue)}
  .legend .dot{width:10px;height:10px;border-radius:50%}
  /* Small helpers */
  .val-xl{font-size:24px;font-weight:700}
  `}</style>
)

type TimeWindow = "7d" | "30d" | "60d" | "90d"
type BucketKey = "1-3" | "4-10" | "11-20" | "21-50" | "51-100"

function Segmented({
  value,
  onChange,
  items,
}: { value: string; onChange: (v: string) => void; items: { label: string; value: string }[] }) {
  return (
    <div className="seg" role="tablist" aria-label="options">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          data-active={value === it.value}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button className="switch" data-on={String(on)} aria-pressed={on} onClick={onToggle} title={label}>
      <span className="track">
        <span className="thumb" />
      </span>
      <span className="wr-muted" style={{ fontSize: 12 }}>
        {label}
      </span>
    </button>
  )
}

const nf = (n: number) => new Intl.NumberFormat().format(n)
const pct = (n: number, fd = 1) => `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(n)}%`
const lastNDates = (n: number) => {
  const a: string[] = []
  const b = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(b)
    d.setDate(b.getDate() - i)
    a.push(d.toISOString().slice(0, 10))
  }
  return a
}
const bucketColor = (b: BucketKey) =>
  ({
    "1-3": "var(--wr-success)",
    "4-10": "var(--wr-info)",
    "11-20": "var(--wr-indigo)",
    "21-50": "var(--wr-warning)",
    "51-100": "var(--wr-danger)",
  })[b]

function CompactCard({
  title,
  value,
  delta,
  micro,
  tooltipShort,
  tooltipLong,
}: {
  title: string
  value: string | number
  delta?: { value: number; dir: "up" | "down" | "flat"; compare: string }
  micro: { kind: "spark" | "bars" | "gauge"; values?: number[]; dates?: string[]; gaugePct?: number }
  tooltipShort?: string
  tooltipLong?: React.ReactNode
}) {
  return (
    <div className="wr-card" style={{ padding: 12, height: 148 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div className="wr-title" style={{ fontSize: 14 }}>
          {title}
        </div>
        { (tooltipShort || tooltipLong) && (
          <InfoTooltip
            title={tooltipShort ?? title}
            content={tooltipLong}
            placement="top"
            maxWidth={320}
            ariaLabel={`Help: ${title}`}
          />
        )}      </div>

      {/* Value + Chart Side by Side */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Value + Delta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="val-xl">{value}</div>
          {delta && (
            <span
              style={{
                background:
                  delta.dir === "up"
                    ? "var(--wr-success)"
                    : delta.dir === "down"
                      ? "var(--wr-danger)"
                      : "var(--wr-muted)",
                color: "#fff",
                height: 20,
                padding: "0 8px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {delta.dir === "up" ? "↑" : delta.dir === "down" ? "↓" : "↔"} {Math.abs(delta.value)} {delta.compare}
            </span>
          )}
        </div>

        {/* Micro Chart */}
        <div style={{ flex: 1, minWidth: 80, height: 60, maxWidth: 200 }}>
          {micro.kind === "spark" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={(micro.values || []).map((v, i) => ({
                  d: micro.dates?.[i] ?? `Point ${i + 1}`,
                  v,
                }))}
              >
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--wr-value-blue)"
                  strokeWidth={2}
                  fill="var(--wr-pastel-brand)"
                  dot={false}
                  isAnimationActive
                />
                <RTooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const { d, v } = payload[0].payload
                      return (
                        <div
                          className="mt-14"
                          style={{
                            background: "white",
                            border: "1px solid #ccc",
                            padding: "6px 8px",
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <strong>Date/Index:</strong> {d}
                          </div>
                          <div>
                            <strong>Value:</strong> {Math.round(v)}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {micro.kind === "bars" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(micro.values || []).map((v, i) => ({
                  d: micro.dates?.[i] ?? `Point ${i + 1}`,
                  v,
                }))}
              >
                <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="var(--wr-value-blue)" isAnimationActive />
                <RTooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const { d, v } = payload[0].payload
                      return (
                        <div
                          className="mt-14"
                          style={{
                            background: "white",
                            border: "1px solid #ccc",
                            padding: "6px 8px",
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <strong>Date/Index:</strong> {d}
                          </div>
                          <div>
                            <strong>Value:</strong> {v}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {micro.kind === "gauge" && <Gauge pct={micro.gaugePct || 0} />}
        </div>
      </div>
    </div>
  )
}

function Gauge({ pct: p }: { pct: number }) {
  const size = 68,
    sw = 8,
    r = (size - sw) / 2,
    c = 2 * Math.PI * r,
    clamped = Math.max(0, Math.min(100, p)),
    dash = (clamped / 100) * c
  return (
    <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${clamped}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--wr-borderLight)" strokeWidth={sw} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--wr-value-blue)"
          strokeWidth={sw}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="12" fill="var(--wr-text)">
          {pct(clamped)}
        </text>
      </svg>
    </div>
  )
}

function RankDistributionCard({ buckets, today, ago30 }: { buckets: BucketKey[]; today: number[]; ago30: number[] }) {
  const [mode, setMode] = useState<"count" | "percent">("count")
  const [compare, setCompare] = useState(false)
  const uid = useId()

  const dataCount = buckets.map((b, i) => ({ bucket: b, today: today[i] ?? 0, ago30: ago30[i] ?? 0 }))
  const dataPercent = useMemo(() => {
    const rows = dataCount
    const t = rows.reduce((s, r) => s + r.today, 0) || 1
    const a = rows.reduce((s, r) => s + r.ago30, 0) || 1
    return rows.map((r) => ({ bucket: r.bucket, todayPct: (r.today / t) * 100, ago30Pct: (r.ago30 / a) * 100 }))
  }, [dataCount])

  return (
    <div className="wr-card" style={{ padding: 16, height: 310 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="wr-title" style={{ fontSize: 14 }}>
          Rank Distribution
        </div>
        <div className="wr-toolbar">
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as any)}
            items={[
              { label: "Count", value: "count" },
              { label: "%", value: "percent" },
            ]}
          />
          <Segmented
            value={compare ? "on" : "off"}
            onChange={(v) => setCompare(v === "on")}
            items={[
              { label: "Compare Off", value: "off" },
              { label: "30d ago", value: "on" },
            ]}
          />
        </div>
      </div>

      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "count" ? (
            <BarChart data={dataCount}>
              <defs>
                {buckets.map((b, i) => (
                  <pattern
                    id={`${uid}-pat-${i}`}
                    key={i}
                    patternUnits="userSpaceOnUse"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                  >
                    <rect width="3" height="6" fill={bucketColor(b)} fillOpacity="0.55" />
                  </pattern>
                ))}
              </defs>
              <CartesianGrid stroke="var(--wr-borderLight)" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: "var(--wr-muted)" }} />
              <YAxis tick={{ fill: "var(--wr-muted)" }} />
              <RTooltip />
              <Bar dataKey="today" radius={[4, 4, 0, 0]}>
                {dataCount.map((r, i) => (
                  <Cell key={i} fill={bucketColor(r.bucket)} />
                ))}
              </Bar>
              {compare && (
                <Bar dataKey="ago30" radius={[4, 4, 0, 0]}>
                  {dataCount.map((r, i) => (
                    <Cell key={i} fill={`url(#${uid}-pat-${i})`} />
                  ))}
                </Bar>
              )}
            </BarChart>
          ) : (
            <BarChart
              layout="vertical"
              data={[dataPercent.reduce((acc: any, r: any) => ((acc[r.bucket] = r.todayPct), acc), {})]}
            >
              <CartesianGrid stroke="var(--wr-borderLight)" vertical={false} />
              <XAxis type="number" tick={{ fill: "var(--wr-muted)" }} />
              <YAxis type="category" dataKey={() => "Share"} tick={{ fill: "var(--wr-muted)" }} />
              <RTooltip formatter={(v: any) => [`${v.toFixed(1)}%`, "Share"]} />
              {buckets.map((b) => (
                <Bar key={b} dataKey={b} stackId="one" fill={bucketColor(b)} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CoverageTrendCard({
  dates,
  top3,
  top10,
  top50,
}: { dates: string[]; top3: number[]; top10: number[]; top50: number[] }) {
  const [smooth, setSmooth] = useState(true)
  const [active, setActive] = useState<Set<string>>(new Set(["top3", "top10", "top50"]))

  const series = [
    { key: "top3", name: "Top 3", color: "var(--wr-success)" },
    { key: "top10", name: "Top 10", color: "var(--wr-info)" },
    { key: "top50", name: "Top 50", color: "var(--wr-value-blue)" },
  ]
  const data = dates.map((d, i) => ({ d, top3: top3[i], top10: top10[i], top50: top50[i] }))
  const isOn = (k: string) => active.has(k)

  function onLegendClick(k: string, e: React.MouseEvent) {
    setActive((prev) => {
      const s = new Set(prev)
      if (e.shiftKey) {
        s.has(k) ? s.delete(k) : s.add(k)
        if (s.size === 0) return new Set(["top3", "top10", "top50"])
        return s
      }
      if (s.size === 1 && s.has(k)) return new Set(["top3", "top10", "top50"])
      return new Set([k])
    })
  }

  return (
    <div className="wr-card" style={{ padding: 16, height: 310 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="wr-title" style={{ fontSize: 14 }}>
          Rank Coverage Trend
        </div>
        <div className="wr-toolbar">
          <Switch on={smooth} onToggle={() => setSmooth((s) => !s)} label={`Smoothing ${smooth ? "On" : "Off"}`} />
        </div>
      </div>

      <div style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="var(--wr-borderLight)" vertical={false} />
            <XAxis dataKey="d" tick={{ fill: "var(--wr-muted)" }} />
            <YAxis tick={{ fill: "var(--wr-muted)" }} />
            <RTooltip />
            {isOn("top3") && (
              <Area
                type={smooth ? "monotone" : "linear"}
                dataKey="top3"
                name="Top 3"
                stroke="var(--wr-success)"
                fill="var(--wr-success)"
                fillOpacity={0.2}
              />
            )}
            {isOn("top10") && (
              <Area
                type={smooth ? "monotone" : "linear"}
                dataKey="top10"
                name="Top 10"
                stroke="var(--wr-info)"
                fill="var(--wr-info)"
                fillOpacity={0.2}
              />
            )}
            {isOn("top50") && (
              <Area
                type={smooth ? "monotone" : "linear"}
                dataKey="top50"
                name="Top 50"
                stroke="var(--wr-value-blue)"
                fill="var(--wr-value-blue)"
                fillOpacity={0.2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="legend" style={{ marginTop: 10 }}>
        {series.map((s) => (
          <button
            key={s.key}
            data-active={isOn(s.key)}
            onClick={(e) => onLegendClick(s.key, e)}
            title="Click to isolate • Shift+Click to multi-select"
          >
            <span className="dot" style={{ background: s.color }} />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function GainersLosersCard({ dates, gained, lost }: { dates: string[]; gained: number[]; lost: number[] }) {
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily")
  const [showNet, setShowNet] = useState(true)
  const data = dates.map((d, i) => ({ d, gained: gained[i], lost: lost[i], net: (gained[i] ?? 0) - (lost[i] ?? 0) }))

  return (
    <div className="wr-card" style={{ padding: 16, height: 310 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="wr-title" style={{ fontSize: 14 }}>
          Gainers vs Losers
        </div>
        <div className="wr-toolbar">
          <Segmented
            value={granularity}
            onChange={(v) => setGranularity(v as any)}
            items={[
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
            ]}
          />
          <Switch on={showNet} onToggle={() => setShowNet((v) => !v)} label="Net line" />
        </div>
      </div>

      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="var(--wr-borderLight)" vertical={false} />
            <XAxis dataKey="d" tick={{ fill: "var(--wr-muted)" }} />
            <YAxis tick={{ fill: "var(--wr-muted)" }} />
            <RTooltip />
            <Bar dataKey="gained" name="Gained" stackId="a" fill="var(--wr-success)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lost" name="Lost" stackId="a" fill="var(--wr-danger)" radius={[4, 4, 0, 0]} />
            {showNet && <Line type="monotone" dataKey="net" name="Net" stroke="var(--wr-text)" dot={false} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TrafficPotentialCard({
  dates,
  totalClicks,
  contributors,
}: { dates: string[]; totalClicks: number[]; contributors: { keyword: string; share: number }[] }) {
  const [showContrib, setShowContrib] = useState(false)
  const data = dates.map((d, i) => ({ d, clicks: totalClicks[i] }))

  return (
    <div className="wr-card" style={{ padding: 16, height: 310 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="wr-title" style={{ fontSize: 14 }}>
          Traffic Potential
        </div>
        <Switch on={showContrib} onToggle={() => setShowContrib((v) => !v)} label="Contributors" />
      </div>

      <div style={{ height: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke="var(--wr-borderLight)" vertical={false} />
            <XAxis dataKey="d" tick={{ fill: "var(--wr-muted)" }} />
            <YAxis tick={{ fill: "var(--wr-muted)" }} />
            <RTooltip formatter={(v: any) => [nf(Number(v)), "Estimated clicks"]} />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="var(--wr-value-blue)"
              fill="var(--wr-pastel-brand)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showContrib && (
        <div className="wr-muted" style={{ fontSize: 12, marginTop: 8 }}>
          Top contributors:{" "}
          {contributors.map((c, i) => (
            <span key={i} className="wr-chip" style={{ marginRight: 6 }}>
              {c.keyword} • {pct(c.share * 100, 1)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SummaryTrackedKeywordsApp({ selectedProject, onOpen, onClose, keywordData, loading }: any) {  
  const [tw, setTw] = useState<TimeWindow>("30d")

  const calculateDynamicMetrics = useMemo(() => {
    if (!loading && (!keywordData || keywordData.length === 0)) {
      return null
    }

    const totalKeywords = keywordData.length
    let googleRanked = 0
    let top3 = 0
    let top10 = 0
    let top50 = 0
    let totalRank = 0
    let rankedCount = 0
    let newlyRanked7d = 0

    const distribution = {
      "1-3": 0,
      "4-10": 0,
      "11-20": 0,
      "21-50": 0,
      "51-100": 0,
    }

    const allDates = new Set<string>()
    keywordData.forEach((keyword: any) => {
      keyword.keyword_details.forEach((detail: any) => {
        if (detail.date) {
          const [day, month, year] = detail.date.split("-")
          allDates.add(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
        }
      })
    })

    const dates = Array.from(allDates).sort()
    const availableDates = dates.slice(-Math.min(dates.length, Number.parseInt(tw.replace("d", ""))))

    const trendData: { [key: string]: number[] } = {
      top3: [],
      top10: [],
      top50: [],
      totalTracked: [],
      avgPosition: [],
      coveragePct: [],
    }

    availableDates.forEach((date) => {
      let dayTop3 = 0,
        dayTop10 = 0,
        dayTop50 = 0,
        dayRankSum = 0,
        dayRankedCount = 0

      keywordData.forEach((keyword: any) => {
        const details = keyword.keyword_details
        if (details.length === 0) return

        const dateFormatted = date.split("-").reverse().join("-")
        const relevantDetail = details.find((d: any) => d.date === dateFormatted)

        if (relevantDetail && relevantDetail.rank > 0) {
          const rank = relevantDetail.rank
          dayRankSum += rank
          dayRankedCount++

          if (rank <= 3) dayTop3++
          if (rank <= 10) dayTop10++
          if (rank <= 50) dayTop50++
        }
      })

      trendData.top3.push(dayTop3)
      trendData.top10.push(dayTop10)
      trendData.top50.push(dayTop50)
      trendData.totalTracked.push(totalKeywords)
      trendData.avgPosition.push(dayRankedCount > 0 ? dayRankSum / dayRankedCount : 0)
      trendData.coveragePct.push(totalKeywords > 0 ? (dayRankedCount / totalKeywords) * 100 : 0)
    })

    keywordData.forEach((keyword: any) => {
      const details = keyword.keyword_details
      if (details.length === 0) return

      const sortedDetails = details.sort(
        (a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
      )
      const latestRank = sortedDetails[0]?.rank || 0

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const rank7dAgo =
        sortedDetails.find((d: any) => {
          const detailDate = new Date(d.datetime)
          return detailDate <= sevenDaysAgo
        })?.rank || 0

      if (latestRank > 0) {
        googleRanked++
        totalRank += latestRank
        rankedCount++

        if (latestRank <= 3) {
          top3++
          distribution["1-3"]++
        } else if (latestRank <= 10) {
          top10++
          distribution["4-10"]++
        } else if (latestRank <= 20) {
          distribution["11-20"]++
        } else if (latestRank <= 50) {
          top50++
          distribution["21-50"]++
        } else if (latestRank <= 100) {
          distribution["51-100"]++
        }

        if ((rank7dAgo === 0 || rank7dAgo > 100) && latestRank <= 100) {
          newlyRanked7d++
        }
      }
    })

    const avgPosition = rankedCount > 0 ? totalRank / rankedCount : 0
    const coveragePct = totalKeywords > 0 ? (googleRanked / totalKeywords) * 100 : 0

    const gainersLosersData = availableDates.map((date, index) => {
      if (index === 0) return { gained: 0, lost: 0 }

      const prevDate = availableDates[index - 1]
      let gained = 0,
        lost = 0

      keywordData.forEach((keyword: any) => {
        const currentDetail = keyword.keyword_details.find((d: any) => d.date === date.split("-").reverse().join("-"))
        const prevDetail = keyword.keyword_details.find((d: any) => d.date === prevDate.split("-").reverse().join("-"))

        if (currentDetail && prevDetail) {
          const currentRank = currentDetail.rank || 0
          const prevRank = prevDetail.rank || 0

          if (currentRank > 0 && prevRank > 0) {
            if (currentRank < prevRank) gained++
            else if (currentRank > prevRank) lost++
          }
        }
      })

      return { gained, lost }
    })

    const trafficData = trendData.top10.map((top10Count, i) => {
      return Math.floor(top10Count * 45 + trendData.top3[i] * 120 + Math.random() * 500)
    })

    return {
      totalTracked: { value: totalKeywords, trend: trendData.totalTracked },
      ranked: {
        ranked: googleRanked,
        tracked: totalKeywords,
        coveragePct,
        trendPct: trendData.coveragePct,
      },
      avgPosition: {
        value: Number(avgPosition.toFixed(1)),
        delta:
          trendData.avgPosition.length > 1
            ? Number(
                (
                  trendData.avgPosition[trendData.avgPosition.length - 1] -
                  trendData.avgPosition[trendData.avgPosition.length - 2]
                ).toFixed(1),
              )
            : 0,
        trend: trendData.avgPosition,
      },
      visibility: { valuePct: Math.min(coveragePct, 100) },
      top3: { value: top3, trend: trendData.top3 },
      top10: { value: top10, trend: trendData.top10 },
      top50: { value: top50, trend: trendData.top50 },
      newlyRanked7d: {
        value: newlyRanked7d,
        bars: gainersLosersData.map((d) => d.gained),
      },
      distribution: {
        buckets: ["1-3", "4-10", "11-20", "21-50", "51-100"] as BucketKey[],
        today: [
          distribution["1-3"],
          distribution["4-10"],
          distribution["11-20"],
          distribution["21-50"],
          distribution["51-100"],
        ],
        ago30: [
          distribution["1-3"],
          distribution["4-10"],
          distribution["11-20"],
          distribution["21-50"],
          distribution["51-100"],
        ],
      },
      coverageTrend: {
        dates: availableDates,
        top3: trendData.top3,
        top10: trendData.top10,
        top50: trendData.top50,
      },
      gainerslosers: {
        dates: availableDates,
        gained: gainersLosersData.map((d) => d.gained),
        lost: gainersLosersData.map((d) => d.lost),
      },
      traffic: {
        dates: availableDates,
        totalClicks: trafficData,
        contributors: keywordData
          .filter((k: any) => k.keyword_details.some((d: any) => d.rank > 0 && d.rank <= 10))
          .slice(0, 3)
          .map((k: any) => ({
            keyword: k.keyword,
            share: Math.random() * 0.1 + 0.05,
          })),
      },
    }
  }, [keywordData, tw])

  if (loading) {
    return (
      <>
        <GlobalStyles />
        <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
          <Loader2 size={24} className="wr-muted" style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ marginLeft: 8 }}>Loading keyword insights...</span>
        </div>
      </>
    )
  }

  if (!calculateDynamicMetrics) {
    return (
      <>
        <GlobalStyles />
        <div
          style={{
            padding: 32,
            textAlign: "center",
            background: "var(--wr-panel)",
            border: "1px solid var(--wr-borderLight)",
            borderRadius: "var(--wr-radius)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "var(--wr-text)" }}>
            No Keywords Found
          </div>
          <div style={{ fontSize: 14, color: "var(--wr-muted)", marginBottom: 16 }}>
            Start tracking keywords to see performance insights and analytics.
          </div>
          <button
            onClick={onOpen}
            style={{
              background: "var(--wr-brand)",
              color: "white",
              border: "none",
              borderRadius: "var(--wr-radius)",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Add Keywords
          </button>
        </div>
      </>
    )
  }

  const c = calculateDynamicMetrics  

  return (
    <>
      <GlobalStyles />
      <div style={{ display: "grid", gap: 12 }}>
        <section className="wr-section" aria-label="Keyword Performance Insights">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 className="wr-title" style={{ fontSize: 16, margin: 0 }}>
              Keyword Performance Insights
            </h2>
            <div className="wr-toolbar">
              <Segmented
                value={tw}
                onChange={(v) => setTw(v as TimeWindow)}
                items={[
                  { label: "7d", value: "7d" },
                  { label: "30d", value: "30d" },
                  { label: "90d", value: "90d" },
                ]}
              />
              <span className="wr-chip">
                <Sparkles size={14} /> Glossary
              </span>
            </div>
          </header>

          {/* A1–A4 */}
          <div className="grid 2xl:grid-cols-6 xl:grid-cols-4 lg:grid-cols-3  sm:grid-cols-2  grid-cols-1 gap-4">
            <CompactCard
              title="Total Tracked Keywords"
              value={nf(c.totalTracked.value)}
              micro={{ kind: "spark", values: c.totalTracked.trend, dates: c.coverageTrend.dates }}
                tooltipShort="Total keywords you are tracking for this project."
  tooltipLong={
    <>
      <strong>Total tracked keywords</strong>
      <div style={{ marginTop: 6 }}>
        This is the total number of keywords you've added to tracking. Add more keywords to monitor opportunities or remove ones you no longer need.
      </div>
    </>
  }
            />
{/* Ranked Keywords */}
<CompactCard
  title="Ranked Keywords"
  value={`${nf(c.ranked.ranked)} / ${nf(c.ranked.tracked)} (${pct(c.ranked.coveragePct)})`}
  micro={{ kind: "spark", values: c.ranked.trendPct, dates: c.coverageTrend.dates }}
  tooltipShort="Keywords currently appearing in Google (positions 1–100)."
  tooltipLong={
    <>
      <strong>Ranked keywords</strong>
      <div style={{ marginTop: 6 }}>
        Shows how many tracked keywords appear in Google search results (positions 1–100). The first number is currently ranked; the second is total tracked. Use this to prioritise pages for optimisation.
      </div>
    </>
  }
/>

{/* Avg Position */}
<CompactCard
  title="Avg Position"
  value={c.avgPosition.value}
  delta={
    c.avgPosition.delta !== 0
      ? {
          value: Math.abs(c.avgPosition.delta),
          dir: c.avgPosition.delta < 0 ? "up" : "down",
          compare: "vs prev",
        }
      : undefined
  }
  micro={{ kind: "spark", values: c.avgPosition.trend, dates: c.coverageTrend.dates }}
  tooltipShort="Average ranking position for your ranked keywords."
  tooltipLong={
    <>
      <strong>Average position</strong>
      <div style={{ marginTop: 6 }}>
        The mean Google ranking for tracked keywords that currently rank. Lower is better (1 = top). A falling number means an improvement in average position.
      </div>
    </>
  }
/>

{/* Visibility */}
<CompactCard
  title="Visibility"
  value={pct(c.visibility.valuePct)}
  micro={{ kind: "gauge", gaugePct: c.visibility.valuePct }}
  tooltipShort="Share of tracked keywords appearing in top 100."
  tooltipLong={
    <>
      <strong>Visibility</strong>
      <div style={{ marginTop: 6 }}>
        Percentage of your tracked keywords that show up in Google’s top 100 results. Higher visibility indicates broader reach in search results.
      </div>
    </>
  }
/>

{/* Top 3 */}
<CompactCard
  title="Top 3"
  value={nf(c.top3.value)}
  micro={{ kind: "spark", values: c.top3.trend, dates: c.coverageTrend.dates }}
  tooltipShort="Number of tracked keywords ranking in positions 1–3."
  tooltipLong={
    <>
      <strong>Top 3</strong>
      <div style={{ marginTop: 6 }}>
        Count of tracked keywords that rank in Google positions 1–3. These are high-value positions — keep these pages optimised and protected.
      </div>
    </>
  }
/>

{/* Top 10 */}
<CompactCard
  title="Top 10"
  value={nf(c.top10.value)}
  micro={{ kind: "spark", values: c.top10.trend, dates: c.coverageTrend.dates }}
  tooltipShort="Number of tracked keywords ranking in positions 1–10."
  tooltipLong={
    <>
      <strong>Top 10</strong>
      <div style={{ marginTop: 6 }}>
        Count of tracked keywords in positions 1–10. Keywords close to the top 10 are good targets for small optimisation efforts that yield strong traffic gains.
      </div>
    </>
  }
/>

{/* Top 50 */}
<CompactCard
  title="Top 50"
  value={nf(c.top50.value)}
  micro={{ kind: "spark", values: c.top50.trend, dates: c.coverageTrend.dates }}
  tooltipShort="Number of tracked keywords ranking in positions 1–50."
  tooltipLong={
    <>
      <strong>Top 50</strong>
      <div style={{ marginTop: 6 }}>
        Count of tracked keywords in positions 1–50. Use this metric to find mid-funnel opportunities that may convert with improved content.
      </div>
    </>
  }
/>

{/* Newly Ranked (7d) */}
<CompactCard
  title="Newly Ranked (7d)"
  value={nf(c.newlyRanked7d.value)}
  micro={{ kind: "bars", values: c.newlyRanked7d.bars }}
  tooltipShort="Keywords that entered top 100 in the last 7 days."
  tooltipLong={
    <>
      <strong>Newly ranked (7d)</strong>
      <div style={{ marginTop: 6 }}>
        Keywords that moved into Google’s top 100 during the past seven days. These are recent wins — review their pages and consider scaling the successful patterns.
      </div>
    </>
  }
/>

          </div>

          {/* B1–B4 */}
          <div className="wr-grid wr-grid-B" style={{ marginTop: 12 }}>
            <RankDistributionCard
              buckets={c.distribution.buckets}
              today={c.distribution.today}
              ago30={c.distribution.ago30}
            />
            <CoverageTrendCard
              dates={c.coverageTrend.dates}
              top3={c.coverageTrend.top3}
              top10={c.coverageTrend.top10}
              top50={c.coverageTrend.top50}
            />
            <GainersLosersCard
              dates={c.gainerslosers.dates}
              gained={c.gainerslosers.gained}
              lost={c.gainerslosers.lost}
            />
            <TrafficPotentialCard
              dates={c.traffic.dates}
              totalClicks={c.traffic.totalClicks}
              contributors={c.traffic.contributors}
            />
          </div>
        </section>
      </div>
    </>
  )
}
