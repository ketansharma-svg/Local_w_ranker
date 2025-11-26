import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Standalone demo scaffold
 * - Minimal shadcn/ui stubs so the component runs without external libs
 * - Tailwind-style classes are left as-is but not required
 */
const Card = ({ className = "", style, children }) => (
  <div className={`wr-card ${className}`} style={{ background: "#fff", border: "1px solid var(--wr-border, #EFF0F6)", borderRadius: "var(--wr-radius, 6px)", boxShadow: "var(--wr-shadow-sm, 0 1px 2px rgba(17,24,39,.06))", ...style }}>{children}</div>
);
const CardContent = ({ className = "", children }) => (
  <div className={className}>{children}</div>
);
const Button = ({ children, onClick, variant = "outline", size = "sm", title }) => (
  <button onClick={onClick} title={title}
    style={{
      border: "1px solid var(--wr-border, #EFF0F6)",
      background: variant === "outline" ? "#fff" : "var(--wr-brand, #008CCD)",
      color: variant === "outline" ? "var(--wr-text-strong, #111827)" : "#fff",
      height: size === "sm" ? 32 : 40,
      padding: "0 10px",
      borderRadius: "6px",
      cursor: "pointer"
    }}
  >{children}</button>
);

/* ---------- Tokens ---------- */
const TK = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  blue: "var(--wr-action, #4286F5)",
  blueFill: "var(--wr-pastelBlue, #BDD6FF)",
  red: "var(--wr-critical, #E94134)",
  redFill: "var(--wr-criticalPastel, #FBC4BF)",
  green: "var(--wr-good, #34A853)",
  amber: "var(--wr-warning, #F9BB04)",
  bg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 6px)",
  shadowSm: "var(--wr-shadow-sm, 0 1px 2px rgba(17,24,39,.06))",
};

/* ---------- Types ---------- */
// (kept as JSDoc for plain JS runtime)
/** @typedef {{ device: 'desktop'|'mobile'; locationISO: string; tw: '7d'|'14d'|'30d'|'90d'|{start:string; end:string} }} Scope */
/** @typedef {{ daily: Array<{date:string,count:number,deltaTP:number,flips:number,best:number,worst:number}>; count:number; deltaTPSum:number; flipFlopRatePct:number; avgSpread:{best:number;worst:number}; conflictingPages:number; highImpactCount:number; }} KPIData */


/* ---------- Reusable Helpers ---------- */
const fmtCompact = (n) => new Intl.NumberFormat(undefined, { notation: "compact" }).format(n);

function useBox(dep = []) {
  const ref = useRef(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setW(ref.current.clientWidth));
    ro.observe(ref.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dep);
  return { ref, w };
}

/** Area+line spark with hover tooltip */
function HoverSparkArea({ dates, values, color = TK.blue, fill = TK.blueFill, h = 96, unit }) {
  const { ref, w } = useBox([values.length]);
  const pad = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const len = Math.max(values.length, 2);
  const x = (i) => pad + (i * (w - 2 * pad)) / (len - 1);
  const y = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad);

  let d = `M ${x(0)} ${y(values[0] ?? 0)}`;
  for (let i = 1; i < len; i++) d += ` L ${x(i)} ${y(values[i] ?? 0)}`;
  const area = `${d} L ${x(len - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  const [hover, setHover] = useState(null);
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = e.clientX - rect.left;
    const clamped = Math.max(pad, Math.min(w - pad, rx));
    const i = Math.round(((clamped - pad) / Math.max(1, w - 2 * pad)) * (len - 1));
    setHover({ i, px: x(i), py: y(values[i] ?? 0) });
  };

  return (
    <div ref={ref} className="relative w-full">
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair" }}>
        <path d={area} fill={fill} opacity={0.9} />
        <path d={d} stroke={color} strokeWidth={2} fill="none" />
        {hover && (
          <>
            <line x1={hover.px} x2={hover.px} y1={pad} y2={h - pad} stroke={TK.borderLight} />
            <circle cx={hover.px} cy={hover.py} r="3.5" fill={color} stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover && (
        <div className="pointer-events-none" style={{ position: "absolute", left: hover.px, top: hover.py, transform: "translate(-50%,-120%)", background: "#111827", color: "#fff", fontSize: 12, borderRadius: 6, padding: "6px 8px", boxShadow: "0 1px 2px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
          {new Date(dates[hover.i]).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
          {" — "}
          <b>
            {unit === "%" ? `${Math.round(values[hover.i])}%` : unit === "clicks" ? `${fmtCompact(values[hover.i])} clicks` : fmtCompact(values[hover.i])}
          </b>
        </div>
      )}
    </div>
  );
}

/** Delta chip under value */
function Delta({ delta, betterWhen = "down" }) {
  const isGood = betterWhen === "down" ? delta < 0 : delta > 0;
  const color = isGood ? TK.green : TK.red;
  const sign = delta > 0 ? "▲" : delta < 0 ? "▼" : "◼";
  const label = delta === 0 ? "0" : Math.abs(delta).toString();
  return (
    <div className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color }}>
      <span aria-hidden>{sign}</span>
      <span>{label}</span>
      <span className="text-[11px]" style={{ color: TK.muted }}>vs prev day</span>
    </div>
  );
}

function InfoIcon({ title }) {
  return (
    <span className="inline-block ml-1 align-middle" title={title} aria-label={title}
      style={{ width: 16, height: 16, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", background: TK.muted, fontSize: 11 }}>
      i
    </span>
  );
}

/* ---------- KPI Card ---------- */
function KpiCard({ title, info, value, unit, delta, betterWhen, children, blur }) {
  return (
    <div className="h-full" style={{ background: "#fff", border: `1px solid ${TK.border}` , borderRadius: TK.radius, boxShadow: TK.shadowSm, padding: 12 }}>
      <div className="flex items-center justify-between">
        <div className="text-[13px]" style={{ color: TK.muted }}>{title}</div>
        <InfoIcon title={info} />
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className={`text-2xl font-semibold ${blur ? "blur-sm select-none" : ""}`} style={{ color: TK.text }}>{value}</div>
        {unit && (<div className="text-sm" style={{ color: TK.muted }}>{unit}</div>)}
      </div>
      <Delta delta={delta} betterWhen={betterWhen} />
      <div className={`mt-3 ${blur ? "blur-[2px] select-none" : ""}`}>{children}</div>
    </div>
  );
}

/* ---------- Section (Header + KPIs) ---------- */
export function CannibalKPISection({ scope: initialScope, isPremiumDefault = true, api, onDeepLink, track }) {
  const [scope, setScope] = useState(initialScope);
  const [isPremium, setIsPremium] = useState(isPremiumDefault);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const res = api?.getCannibalKPI && await api.getCannibalKPI(scope);
    setData(res);
    setLoading(false);
  };
useEffect(() => {
  if (!api?.getCannibalKPI) return;
  reload();
}, [JSON.stringify(scope), api]);

  // series
  const dates = useMemo(() => data?.daily.map(d => d.date) ?? [], [data]);
  const counts = useMemo(() => data?.daily.map(d => d.count) ?? [], [data]);
  const dTP = useMemo(() => data?.daily.map(d => d.deltaTP) ?? [], [data]);
  const flips = useMemo(() => data?.daily.map(d => d.flips) ?? [], [data]);
  const spreads = useMemo(() => data?.daily.map(d => d.worst - d.best) ?? [], [data]);

  // deltas vs previous day
  const lastMinusPrev = (arr) => arr.length >= 2 ? (arr[arr.length - 1] - arr[arr.length - 2]) : 0;
  const dCount = lastMinusPrev(counts);
  const dDeltaTP = lastMinusPrev(dTP);
  const dFlip = lastMinusPrev(flips);
  const dSpread = lastMinusPrev(spreads);

  return (
    <Card className="border" style={{ borderColor: TK.border, borderRadius: TK.radius }}>
      {/* Section header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[13px] font-medium" style={{ color: TK.muted }}>Scope</div>
            <select value={scope.device} onChange={(e) => setScope((s) => ({ ...s, device: e.target.value }))} className="h-8 rounded border px-2 text-sm" style={{ borderColor: TK.border }} aria-label="Device">
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
            <select value={typeof scope.tw === "string" ? scope.tw : "30d"} onChange={(e) => setScope((s) => ({ ...s, tw: e.target.value }))} className="h-8 rounded border px-2 text-sm" style={{ borderColor: TK.border }} aria-label="Time window">
              {["7d","14d","30d","90d"].map((t)=> <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <span style={{ color: TK.muted }}>Premium metrics</span>
            <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} aria-label="Premium metrics" className="h-4 w-4" />
          </label>
        </div>
      </div>

      {/* line separator */}
      <div className="w-full" style={{ borderTop: `1px solid ${TK.borderLight}` }} />

      <CardContent className="p-4">
        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {/* 1) Cannibalized Keywords */}
          <KpiCard title="Cannibalized Keywords" info="Count of keywords with ≥2 ranking URLs (≤100) in current scope." value={loading ? "—" : String(data?.count ?? 0)} delta={dCount} betterWhen="down">
            <HoverSparkArea dates={dates} values={counts} h={110} color={TK.blue} fill={TK.blueFill} />
            <div className="mt-1 text-xs" style={{ color: TK.muted }}>Click to scroll to conflicts table</div>
          </KpiCard>

          {/* 2) Affected ΔTraffic (mo) */}
          <KpiCard title="Affected ΔTraffic (mo)" info="Projected clicks regained if conflicts are resolved (CTR model)." value={loading ? "—" : fmtCompact(data?.deltaTPSum ?? 0)} unit="clicks" delta={dDeltaTP} betterWhen="down" blur={!isPremium}>
            <HoverSparkArea dates={dates} values={dTP} h={110} color={TK.red} fill={TK.redFill} unit="clicks" />
            <div className="mt-1 text-xs" style={{ color: TK.muted }}>Click to open Rank Tracker filtered to Cannibalized</div>
          </KpiCard>

          {/* 3) Flip‑Flop Rate */}
          <KpiCard title="Flip‑Flop Rate" info="% of cannibalized keywords where leader URL switched ≥2 times (last 30d)." value={loading ? "—" : `${Math.round(data?.flipFlopRatePct ?? 0)}%`} delta={dFlip} betterWhen="down">
            <HoverSparkArea dates={dates} values={flips} h={110} color={TK.blue} fill={TK.blueFill} unit="%" />
            <div className="mt-1 text-xs" style={{ color: TK.muted }}>Click to filter table to Flip‑Flop only</div>
          </KpiCard>

          {/* 4) Avg Rank Spread */}
          <KpiCard title="Avg Rank Spread" info="Mean spread between best and worst ranked URLs across conflicts; lower is better." value={loading ? "—" : `#${data?.avgSpread.best ?? 0}–#${data?.avgSpread.worst ?? 0}`} delta={dSpread} betterWhen="down">
            <HoverSparkArea dates={dates} values={spreads} h={110} color={TK.blue} fill={TK.blueFill} />
            <div className="mt-1 text-xs" style={{ color: TK.muted }}>Click to sort conflicts by Spread desc</div>
          </KpiCard>

          {/* 5) Conflicting Pages — wide only */}
          <div className="hidden xl:block">
            <KpiCard title="Conflicting Pages" info="Distinct pages participating in conflicts (project scope · TW)." value={loading ? "—" : String(data?.conflictingPages ?? 0)} delta={0}>
              <div className="text-xs" style={{ color: TK.muted }}>TW {typeof scope.tw === "string" ? scope.tw : "custom"}</div>
            </KpiCard>
          </div>

          {/* 6) High‑Impact Conflicts — wide only */}
          <div className="hidden xl:block">
            <KpiCard title="High‑Impact Conflicts" info="Keywords with ΔTP_lost ≥ 50 clicks/mo (threshold configurable)." value={loading ? "—" : String(data?.highImpactCount ?? 0)} delta={0}>
              <div className="text-xs" style={{ color: TK.muted }}>Threshold: 50 clicks/mo</div>
            </KpiCard>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Demo wrapper ---------------- */
export default function CannibalKPISectionDemo({ dtoCannib }) {
  const scope = { device: "desktop", locationISO: "IN", tw: "30d" };

  const api = React.useMemo(() => {
      if (!dtoCannib) return undefined;

      return{
          getCannibalKPI: async (_scope) => {
    const k = dtoCannib?.data?.cannibalization_kpis ?? {};
    const sm = dtoCannib?.data?.summary_metrics ?? {};
    const tl = dtoCannib?.data?.cannibalization_timeline ?? [];

    // --- Series (dates + values) ---
    const total = k?.total_cannibalized ?? {};
    const totalDates = (total.sparkline_data ?? []).map((d) => d.date);
    const totalVals  = (total.sparkline_data ?? []).map((d) => Number(d.value ?? 0));

    const tp = k?.traffic_lost ?? {};
    const tpVals = (tp.sparkline_data ?? []).map((d) => Number(d.value ?? 0));

    // Avg rank spread (compute band from timeline for UI best–worst)
    const spreadSeries = tl.map((d) => Number(d.avg_rank_spread ?? 0)).filter((v) => Number.isFinite(v) && v > 0);
    const spreadMin = spreadSeries.length ? Math.min(...spreadSeries) : 0;
    const spreadMax = spreadSeries.length ? Math.max(...spreadSeries) : 0;

    // Flip-flop: KPI only (no daily series in payload)
    const flipRateStr = (k?.flip_flop_rate?.value ?? "0").toString().replace("%","");
    const flipRatePct = Number(parseFloat(flipRateStr).toFixed(1)) || 0;

    // High-impact conflicts
    const highImpact = Number(k?.impact_conflicts?.value ?? 0);

    // Conflicting pages (summary)
    const conflictingPages = Number(sm?.conflicting_pages ?? 0);

    // Compose section DTO expected by CannibalKPISection
    return {
      daily: totalDates.map((date, i) => ({
        date,
        count: totalVals[i] ?? 0,
        deltaTP: tpVals[i] ?? 0,
        // no per-day flips in API → keep 0 to avoid UI mismatch
        flips: 0,
        // we expose band visuals using min/max across the whole range
        best: spreadMin,
        worst: spreadMax,
      })),
      count: Number(total?.value ?? total?.display_value ?? 0),
      deltaTPSum: Number(sm?.total_traffic_potential_lost ?? 0),
      flipFlopRatePct: flipRatePct,
      avgSpread: { best: spreadMin, worst: spreadMax },
      conflictingPages,
      highImpactCount: highImpact,
    };
  }

      }
  },[dtoCannib])


  return (
      <div className="p-4">
        <h2 style={{ margin: "4px 0 12px", color: TK.text, fontSize: 20, fontWeight: 600 }}>Cannibalization KPI Section </h2>
        <CannibalKPISection scope={scope} isPremiumDefault={true} api={api} />
      </div>
  );
}


