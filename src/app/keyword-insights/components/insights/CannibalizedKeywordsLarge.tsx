import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Demo canvas for: Cannibalization Over Time (Trend Card)
 * - Self-contained: includes light shims for Card / Button so it runs without shadcn/ui
 * - Hover crosshair + tooltip
 * - Click on a point logs a deep-link intent (Rank Tracker, cannibalized, date)
 * - Toggle series via legend chips; preference persists in localStorage
 * - Premium toggle (ΔTP series blur + disabled export in freemium)
 * - Scope controls (device, country ISO, window)
 */

/* ------------------------------------------------------
   Local styles & tokens (mirrors your wr-* CSS variables)
------------------------------------------------------- */
const LocalStyles = () => (
  <style>{`
    :root{
      --wr-border:#E5E7EB; --wr-borderLight:#EFF0F6; --wr-text-strong:#111827; --wr-muted:#6B7280;
      --wr-brand:#008CCD; --wr-action:#4286F5; --wr-pastelBlue:#BDD6FF; --wr-critical:#E94134; --wr-criticalPastel:#FBC4BF;
      --wr-bg-app:#F5F7FA; --wr-radius:6px;
    }
    *{box-sizing:border-box}
    body{margin:0; font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial}
    .app{background:var(--wr-bg-app); padding:20px; min-height:100vh}
    .wr-card{background:#fff; border:1px solid var(--wr-border); border-radius:var(--wr-radius); box-shadow:0 1px 2px rgba(17,24,39,.06)}
    .wr-btn{display:inline-flex; align-items:center; gap:8px; height:32px; padding:0 12px; border-radius:6px; border:1px solid var(--wr-border); background:#fff; cursor:pointer}
    .wr-btn[disabled]{opacity:.55; cursor:not-allowed}
    .wr-btn-sm{height:30px; font-size:12px}
    .wr-btn-outline{background:#fff}
    .wr-chip{background:#F5F7FA; border:1px solid var(--wr-border); height:32px; padding:0 12px; border-radius:999px; display:inline-flex; align-items:center; gap:8px; font-size:14px}
    .wr-h{color:var(--wr-text-strong)}
  `}</style>
);

/* ----------------------- Shim components ----------------------- */
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, style, children }) => (
  <div className={`wr-card ${className ?? ''}`} style={style}>{children}</div>
);
const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children }) => (
  <div className={`p-4 ${className ?? ''}`}>{children}</div>
);
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'outline' | 'solid'; size?: 'sm' | 'md' }> = ({ variant='outline', size='sm', className, children, ...rest }) => (
  <button className={`wr-btn wr-btn-${variant} wr-btn-${size} ${className ?? ''}`} {...rest}>{children}</button>
);

/* ---------- Tokens ---------- */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  textStrong: "var(--wr-text-strong, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)",
  valueBlue: "var(--wr-action, #4286F5)",
  pastelBlue: "var(--wr-pastelBlue, #BDD6FF)",
  critical: "var(--wr-critical, #E94134)",
  criticalPastel: "var(--wr-criticalPastel, #FBC4BF)",
  appBg: "var(--wr-bg-app, #F5F7FA)",
  radius: "var(--wr-radius, 6px)",
};

/* ---------- Types ---------- */
 type Scope = {
  device: "desktop" | "mobile";
  locationISO: string;
  tw: "7d" | "14d" | "30d" | "90d" | { start: string; end: string };
};
 type TrendPoint = { date: string; conflicts: number; deltaTP: number };
 type TrendDTO = {
  scope: Pick<Scope, "device" | "locationISO">;
  range: { start: string; end: string };
  points: TrendPoint[];
};


/* ---------- Mini CHIP toggle ---------- */
function ChipToggle({ label, active, onToggle, colorDot, }: { label: string; active: boolean; onToggle: (next: boolean) => void; colorDot?: string; }) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-3 h-8 rounded-full border text-sm ${active ? "bg-white" : "bg-[#F5F7FA]"}`}
      style={{ borderColor: TOKENS.border }}
      onClick={() => onToggle(!active)}
    >
      <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: colorDot ?? TOKENS.valueBlue }} />
      {label}
    </button>
  );
}

/* ---------- Chart helpers ---------- */
function useChartBox() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(860);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setW(ref.current!.clientWidth));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

export function CannibalTrendCard({ scope, api, isPremium = true, onDeepLink, track, }: { scope: Scope; api?: { getCannibalTrend?: (s: Scope) => Promise<TrendDTO> }; isPremium?: boolean; onDeepLink?: (payload: { type: "rank-tracker"; filter: "cannibalized"; scope: Scope; date: string }) => void; track?: (event: string, payload?: any) => void; }) {
  const [data, setData] = useState<TrendDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [showConflicts, setShowConflicts] = useState<boolean>(() => {
    const raw = localStorage.getItem("cann_trend_conflicts");
    return raw ? raw === "1" : true;
  });
  const [showDeltaTP, setShowDeltaTP] = useState<boolean>(() => {
    const raw = localStorage.getItem("cann_trend_deltaTP");
    return raw ? raw === "1" : true;
  });
  useEffect(() => localStorage.setItem("cann_trend_conflicts", showConflicts ? "1" : "0"), [showConflicts]);
  useEffect(() => localStorage.setItem("cann_trend_deltaTP", showDeltaTP ? "1" : "0"), [showDeltaTP]);

useEffect(() => {
  let mounted = true;
  (async () => {
    setLoading(true);
    try {
      if (!api?.getCannibalTrend) return;
      const res:any = await api.getCannibalTrend(scope);
      if (mounted) setData(res);
    } finally {
      if (mounted) setLoading(false);
    }
  })();
  return () => { mounted = false; };
}, [JSON.stringify(scope), api]);


  const points = data?.points ?? [];
  const conflictsArr = points.map((p) => p.conflicts);
  const deltaTPArr = points.map((p) => p.deltaTP);

  const { ref, w } = useChartBox();
  const h = 280;
  const padL = 46, padR = 46, padT = 12, padB = 26;

  const x = (i: number) => padL + (i * (w - padL - padR)) / Math.max(1, points.length - 1);
  const maxConf = Math.max(1, ...conflictsArr);
  const yL = (v: number) => h - padB - (v / maxConf) * (h - padT - padB);
  const maxTP = Math.max(1, ...deltaTPArr);
  const yR = (v: number) => h - padB - (v / maxTP) * (h - padT - padB);
  const areaPath = (vals: number[], y: (v: number) => number) => {
    if (vals.length === 0) return "";
    let d = `M ${x(0)} ${y(vals[0])}`;
    for (let i = 1; i < vals.length; i++) d += ` L ${x(i)} ${y(vals[i])}`;
    d += ` L ${x(vals.length - 1)} ${h - padB} L ${x(0)} ${h - padB} Z`;
    return d;
  };

  const [hover, setHover] = useState<{ i: number; cx: number; cyL: number; cyR: number; } | null>(null);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const relX = Math.min(w - padR, Math.max(padL, e.clientX - rect.left));
    const idx = Math.round(((relX - padL) / Math.max(1, w - padL - padR)) * (points.length - 1));
    setHover({ i: idx, cx: x(idx), cyL: yL(conflictsArr[idx]), cyR: yR(deltaTPArr[idx]) });
  };
  const onPointClick = () => {
    if (!hover || !points[hover.i]) return;
    const date = points[hover.i].date;
    track?.("cann_trend_point_click", { date, scope });
    onDeepLink?.({ type: "rank-tracker", filter: "cannibalized", scope, date });
    console.log("Deep link intent →", { type: "rank-tracker", filter: "cannibalized", scope, date });
  };
  const exportCSV = () => {
    const header = "date,conflicts,deltaTP";
    const body = points.map((p) => [p.date, p.conflicts, p.deltaTP].join(",")).join("\n");
    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cannibalization-trend.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card className="border" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="text-[18px] font-semibold" style={{ color: TOKENS.textStrong }}>Cannibalization Over Time</div>
          <div className="flex items-center gap-2">
            <span className="px-3 h-8 rounded-full border text-sm inline-flex items-center" style={{ borderColor: TOKENS.border }} aria-label={`Device ${scope.device}`}>{scope.device.toUpperCase()}</span>
            <span className="px-3 h-8 rounded-full border text-sm inline-flex items-center" style={{ borderColor: TOKENS.border }} aria-label={`Location ${scope.locationISO}`}>{scope.locationISO}</span>
            <span className="px-3 h-8 rounded-full border text-sm inline-flex items-center" style={{ borderColor: TOKENS.border }} aria-label={`Time window ${typeof scope.tw === "string" ? scope.tw : "custom"}`}>{typeof scope.tw === "string" ? scope.tw : "Custom"}</span>
            <ChipToggle label="Conflicts" active={showConflicts} onToggle={setShowConflicts} colorDot={TOKENS.valueBlue} />
            <ChipToggle label="ΔTP Lost" active={showDeltaTP} onToggle={(v) => setShowDeltaTP(v)} colorDot={TOKENS.critical} />
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!isPremium} title={!isPremium ? "Premium only" : "Export CSV"}>Export CSV</Button>
          </div>
        </div>

        <div ref={ref} className="relative w-full">
          <svg role="img" aria-label="Cannibalization trend chart" width="100%" height={280} viewBox={`0 0 ${w} 280`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={onPointClick} style={{ cursor: points.length ? "crosshair" : "default" }}>
            {[0.25, 0.5, 0.75].map((t) => (
              <line key={t} x1={46} x2={w - 46} y1={12 + (280 - 12 - 26) * t} y2={12 + (280 - 12 - 26) * t} stroke={TOKENS.borderLight} />
            ))}

            {showConflicts && points.length > 0 && (
              <>
                <path d={(() => { const vals = conflictsArr; if (!vals.length) return ""; let d = `M ${46} ${yL(vals[0])}`; for (let i=1;i<vals.length;i++) d += ` L ${46 + (i * (w - 46 - 46)) / Math.max(1, vals.length - 1)} ${yL(vals[i])}`; d += ` L ${46 + ((vals.length - 1) * (w - 46 - 46)) / Math.max(1, vals.length - 1)} ${280 - 26} L ${46} ${280 - 26} Z`; return d; })()} fill={TOKENS.pastelBlue} opacity={0.9} />
                <path d={conflictsArr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${46 + (i * (w - 46 - 46)) / Math.max(1, points.length - 1)} ${yL(v)}`).join(' ')} stroke={TOKENS.valueBlue} strokeWidth={2} fill="none" />
              </>
            )}

            {showDeltaTP && points.length > 0 && (
              <g className={!isPremium ? "blur-[2px]" : undefined}>
                <path d={(() => { const vals = deltaTPArr; if (!vals.length) return ""; let d = `M ${46} ${yR(vals[0])}`; for (let i=1;i<vals.length;i++) d += ` L ${46 + (i * (w - 46 - 46)) / Math.max(1, vals.length - 1)} ${yR(vals[i])}`; d += ` L ${46 + ((vals.length - 1) * (w - 46 - 46)) / Math.max(1, vals.length - 1)} ${280 - 26} L ${46} ${280 - 26} Z`; return d; })()} fill={TOKENS.criticalPastel} opacity={0.9} />
                <path d={deltaTPArr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${46 + (i * (w - 46 - 46)) / Math.max(1, points.length - 1)} ${yR(v)}`).join(' ')} stroke={TOKENS.critical} strokeWidth={2} fill="none" />
              </g>
            )}

            {hover && (
              <>
                <line x1={hover.cx} x2={hover.cx} y1={12} y2={280 - 26} stroke={TOKENS.border} />
                {showConflicts && (<circle cx={hover.cx} cy={hover.cyL} r="3.5" fill={TOKENS.valueBlue} stroke="#fff" strokeWidth={2} />)}
                {showDeltaTP && isPremium && (<circle cx={hover.cx} cy={hover.cyR} r="3.5" fill={TOKENS.critical} stroke="#fff" strokeWidth={2} />)}
              </>
            )}

            {[0, 0.5, 1].map((t) => { const v = Math.round(maxConf * t); const y = yL(v); return (
              <g key={`l-${t}`}><text x={46 - 6} y={y + 4} fontSize={11} textAnchor="end" fill={TOKENS.muted}>{v}</text></g>
            );})}
            {[0, 0.5, 1].map((t) => { const v = Math.round(maxTP * t); const y = yR(v); return (
              <g key={`r-${t}`}><text x={w - 46 + 6} y={y + 4} fontSize={11} textAnchor="start" fill={TOKENS.muted}>{new Intl.NumberFormat(undefined, { notation: 'compact' }).format(v)}</text></g>
            );})}
          </svg>

          {hover && points[hover.i] && (
            <div style={{ position: 'absolute', left: hover.cx, top: Math.min(hover.cyL, hover.cyR ?? hover.cyL), transform: 'translate(-50%,-110%)', background: '#111827', color: '#fff', fontSize: 12, borderRadius: 6, padding: '6px 8px', boxShadow: '0 1px 2px rgba(0,0,0,.2)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              {new Date(points[hover.i].date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
              {" — "}
              {showConflicts && <>Conflicts <b>{points[hover.i].conflicts}</b></>}
              {showConflicts && showDeltaTP && " · "}
              {showDeltaTP && <>ΔTP Lost <b>{new Intl.NumberFormat(undefined, { notation: 'compact' }).format(points[hover.i].deltaTP)}/mo</b></>}
            </div>
          )}

          {!isPremium && showDeltaTP && (
            <div className="pointer-events-none" style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(17,24,39,.72)', color: '#fff', borderRadius: 6, padding: '4px 6px', fontSize: 12 }}>
              ΔTP series blurred — Premium
            </div>
          )}
        </div>

        <div className="mt-2 text-xs" style={{ color: TOKENS.muted }}>
          Hover points to see values · Click a point to open Rank Tracker for that date (Premium).
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Demo App ------------------------------- */
export default function DemoCannibalTrend({ dtoCannib }: { dtoCannib?: any }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [loc, setLoc] = useState("IN");
  const [tw, setTw] = useState<Scope["tw"]>("30d");
  const [isPremium, setIsPremium] = useState(true);

  const scope: Scope = useMemo(() => ({ device, locationISO: loc, tw }), [device, loc, tw]);
const api = React.useMemo(() => {
    if (!dtoCannib) return undefined;
  return {
  getCannibalTrend: async (_scope: Scope) => {
    const tl = dtoCannib?.data?.cannibalization_timeline ?? [];
    const points = tl.map((d: any) => ({
      date: d.date,
      // left axis: conflicts
      conflicts: Number(d.cannibalized_count ?? 0),
      // right axis: ΔTP lost (clicks/mo)
      deltaTP: Number(d.total_tp_lost ?? 0),
    }));
    const start = points[0]?.date ?? "";
    const end   = points[points.length - 1]?.date ?? "";
    return {
      scope: { device: _scope.device, locationISO: _scope.locationISO },
      range: { start, end },
      points,
    };
  }
  }
},[dtoCannib])



  return (
    <div className="p-4">
      <LocalStyles />

      {/* Controls */}
      <div className="wr-card p-3 mb-4" style={{ borderColor: TOKENS.border }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium" style={{ color: TOKENS.textStrong }}>Scope</div>
          <div className="ml-2 flex items-center gap-2">
            <span className="text-sm" style={{ color: TOKENS.muted }}>Device</span>
            <select className="wr-chip" value={device} onChange={(e) => setDevice(e.target.value as any)}>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TOKENS.muted }}>Country</span>
            <select className="wr-chip" value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option>IN</option>
              <option>US</option>
              <option>GB</option>
              <option>AE</option>
              <option>AU</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: TOKENS.muted }}>Window</span>
            <select className="wr-chip" value={typeof tw === 'string' ? tw : 'custom'} onChange={(e) => setTw(e.target.value as any)}>
              <option value="7d">7d</option>
              <option value="14d">14d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm" style={{ color: TOKENS.muted }}>Premium</span>
            <label className="wr-chip" style={{ gap: 10 }}>
              <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
              <span>{isPremium ? 'On' : 'Off'}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Card demo */}
      <CannibalTrendCard
        scope={scope}
             api={api}
        isPremium={isPremium}
        onDeepLink={(payload) => console.log("onDeepLink", payload)}
        track={(event, payload) => console.log("track:", event, payload)}
      />
    </div>
  );
}


