"use client";

/* =============================================================================
   Section 3 — On‑Page Coverage (Redesigned)
   -----------------------------------------------------------------------------
   • Inter / Inter Fallback fonts; no emoji
   • Latest tokens (aligned with other recent designs)
   • Branded #008CCD icons for section title & factor rows
   • Modern chips + Filters + Export in header
   • Hover‑animated DONUT with value in the center
   • Smart popover (portaled): shows factor breakdown with icons + scores
   • Pointer cursor on all interactive controls
   • Drop‑in React + Tailwind + Recharts (no external UI deps)
   ============================================================================ */

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip as RTooltip,
} from "recharts";
import {
  BarChart3,
  Download,
  Info,
  SlidersHorizontal,
  Gauge,
  Type as TitleIcon,
  Heading1 as H1Icon,
  Heading2 as H2Icon,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

/* -----------------------------------------------------------------------------
 * TOKENS (latest)
 * ---------------------------------------------------------------------------*/
const TK = {
  brand: "#008CCD",
  valueBlue: "#0077FF",
  pastelBlue: "#D9EEF8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  subtle: "#F5F7FA",
  surface: "#FFFFFF",
  success: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  gray: "#9CA3AF",
} as const;

const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");
const intFmt = new Intl.NumberFormat();

/* -----------------------------------------------------------------------------
 * Color utils (for stable tints per slice)
 * ---------------------------------------------------------------------------*/
function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  const v = parseInt(n.length === 3 ? n.split("").map((c) => c + c).join("") : n, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const h = x.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("")
  );
}
function mixWithWhite(hex: string, w01: number) {
  const { r, g, b } = hexToRgb(hex);
  const W = 255;
  const w = Math.max(0, Math.min(1, w01));
  return rgbToHex(
    Math.round(r * (1 - w) + W * w),
    Math.round(g * (1 - w) + W * w),
    Math.round(b * (1 - w) + W * w)
  );
}

/* -----------------------------------------------------------------------------
 * TYPES
 * ---------------------------------------------------------------------------*/
type CoverageInput = {
  target: { primary: string; variants?: string[] };
  page: {
    url?: string;
    title?: string;
    meta?: string;
    h1?: string[];
    h2?: string[];
    h3?: string[];
    bodyText?: string;
    imageAlts?: string[];
  };
  peers?: {
    bodyWordCountMedian?: number;
    bodyDensityMean?: number;
    bodyDensityStd?: number;
  };
};

type SignalScore = { score: number; issues: string[]; meta?: Record<string, any> };
type CoverageResult = {
  title: SignalScore;
  h1: SignalScore;
  h2h3: SignalScore;
  body: SignalScore & { densityPct?: number };
  alt: SignalScore;
  metaDesc: SignalScore;
  densityPct: number;
  stuffingPenalty: number; // %
  scoreRaw: number;
  scoreFinal: number;
  readability: { score: number; band: string };
  lengthVsMedian: { words: number; median: number; deltaPct: number };
};

/* -----------------------------------------------------------------------------
 * Scoring helpers (condensed; from your previous version)
 * ---------------------------------------------------------------------------*/
const DEFAULT_PEERS = { bodyWordCountMedian: 1200, bodyDensityMean: 1.2, bodyDensityStd: 0.5 };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const norm = (s?: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const tokenize = (s?: string) => norm(s).split(" ").filter(Boolean);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const containsToken = (text: string, token: string) => {
  const re = new RegExp(`(^|\\s)${escapeRegExp(token)}(\\s|$)`, "i");
  return re.test(text);
};
function countOccurrences(text: string, tokens: string[]) {
  const words = tokenize(text);
  const set = new Set(tokens.map(norm));
  return words.reduce((acc, w) => acc + (set.has(w) ? 1 : 0), 0);
}
const TITLE_LEN_IDEAL: [number, number] = [55, 62];
const TITLE_LEN_OK: [number, number] = [30, 70];
const META_LEN_IDEAL: [number, number] = [140, 160];
const BODY_DENSITY_IDEAL: [number, number] = [0.5, 2.5];
const BODY_DENSITY_ZERO: [number, number] = [0.0, 4.0];

function scoreTitle(title: string | undefined, KW: string, VAR: string[]): SignalScore {
  const issues: string[] = [];
  if (!title?.trim()) {
    issues.push("Add a Title (55–62 chars, include primary term).");
    return { score: 0, issues, meta: { length: 0, repeats: 0 } };
  }
  const t = title.trim();
  const len = t.length;
  const tNorm = ` ${norm(t)} `;
  const hasKW = containsToken(tNorm, norm(KW));
  const hasVAR = VAR.some((v) => containsToken(tNorm, norm(v)));
  const repeats = countOccurrences(tNorm, [norm(KW), ...VAR]);

  let s = 50;
  s += hasKW ? 30 : hasVAR ? 15 : 0;
  if (!hasKW && !hasVAR) issues.push(`Include “${KW}” in Title.`);
  const pos = Math.min(...[KW, ...VAR].map((v) => tNorm.indexOf(` ${norm(v)} `)));
  if (pos >= 0 && pos <= Math.floor(tNorm.length * 0.6)) s += 10;
  else if (hasKW || hasVAR) issues.push("Place the term earlier in Title (first 60%).");
  if (len >= TITLE_LEN_IDEAL[0] && len <= TITLE_LEN_IDEAL[1]) s += 10;
  else if (len >= TITLE_LEN_OK[0] && len <= TITLE_LEN_OK[1]) s += 5;
  else {
    if (len < TITLE_LEN_OK[0]) issues.push("Lengthen Title to ~55–62 chars.");
    if (len > TITLE_LEN_OK[1]) issues.push("Shorten Title to ~55–62 chars.");
  }
  if (repeats >= 3) {
    s -= 20;
    issues.push("Avoid repeating the term ≥3× in Title.");
  } else if (repeats >= 2) {
    s -= 10;
    issues.push("Avoid repeating the term in Title.");
  }
  return { score: clamp(s, 0, 100), issues, meta: { length: len, repeats } };
}
function scoreMeta(meta: string | undefined, KW: string, VAR: string[]): SignalScore {
  const issues: string[] = [];
  if (!meta?.trim()) {
    issues.push("Add a Meta Description (140–160 chars, include primary/variant).");
    return { score: 0, issues, meta: { length: 0 } };
  }
  const m = meta.trim();
  const len = m.length;
  const mNorm = ` ${norm(m)} `;
  const has = containsToken(mNorm, norm(KW)) || VAR.some((v) => containsToken(mNorm, norm(v)));
  if (!has) issues.push("Include primary/variant term in Meta Description.");
  if (len < META_LEN_IDEAL[0]) issues.push("Lengthen Meta to ~140–160 chars.");
  if (len > META_LEN_IDEAL[1]) issues.push("Shorten Meta to ~140–160 chars.");
  return { score: has ? 80 : 50, issues, meta: { length: len } };
}
function scoreH1(h1s: string[] | undefined, KW: string, VAR: string[], title?: string): SignalScore {
  const list = (h1s || []).map((h) => h.trim()).filter(Boolean);
  if (!list.length) return { score: 0, issues: ["Add a single H1 containing the primary term."], meta: { count: 0 } };
  const anyKW = list.some((h) => containsToken(` ${norm(h)} `, norm(KW)));
  const anyVAR = list.some((h) => VAR.some((v) => containsToken(` ${norm(h)} `, norm(v))));
  const dup = list.length === 1 && title && norm(title) === norm(list[0]);
  let s = 50 + (anyKW ? 30 : anyVAR ? 20 : 0);
  const issues: string[] = [];
  if (!anyKW && !anyVAR) issues.push(`Include “${KW}” in H1.`);
  if (list.length > 1) {
    s -= 15;
    issues.push(`Use a single H1 (found ${list.length}).`);
  }
  if (dup) {
    s -= 10;
    issues.push("Differentiate H1 from Title (avoid identical text).");
  }
  return { score: clamp(s, 0, 100), issues, meta: { count: list.length } };
}
function scoreH2H3(h2: string[] | undefined, h3: string[] | undefined, KW: string, VAR: string[]): SignalScore {
  const H = [...(h2 || []), ...(h3 || [])].map((h) => h.trim()).filter(Boolean);
  if (!H.length) return { score: 20, issues: ["Add H2/H3 sections; include the primary term in at least one."], meta: { n: 0, p: 0 } };
  const k = H.filter((h) => containsToken(` ${norm(h)} `, norm(KW))).length;
  const v = H.filter((h) => VAR.some((x) => containsToken(` ${norm(h)} `, norm(x)))).length;
  const p = (k + v) / H.length;
  const issues: string[] = [];
  if (k === 0) issues.push("Include the primary term in at least one H2/H3.");
  if (p > 0.7) issues.push("Avoid overusing the term in headings (>70%).");
  let s = 20 + (k > 0 ? 40 : v > 0 ? 20 : 0) + (p >= 0.2 && p <= 0.7 ? 20 : p > 0 ? 10 : 0);
  return { score: clamp(s, 0, 100), issues, meta: { n: H.length, p } };
}
function scoreBody(body: string | undefined, KW: string, VAR: string[], peers: Required<typeof DEFAULT_PEERS>) {
  const text = (body || "").trim();
  const words = tokenize(text).length;
  const occKW = countOccurrences(` ${norm(text)} `, [norm(KW)]);
  const occVAR = countOccurrences(` ${norm(text)} `, VAR.map(norm));
  const density = words > 0 ? (occKW / words) * 100 : 0;

  let densityComponent = 0;
  if (density >= BODY_DENSITY_IDEAL[0] && density <= BODY_DENSITY_IDEAL[1]) {
    densityComponent = 90;
  } else if (density < BODY_DENSITY_IDEAL[0]) {
    const t = clamp(density / Math.max(0.0001, BODY_DENSITY_IDEAL[0] - 0.0), 0, 1);
    densityComponent = Math.round(60 * t);
  } else {
    const over = clamp((density - BODY_DENSITY_IDEAL[1]) / (BODY_DENSITY_ZERO[1] - BODY_DENSITY_IDEAL[1]), 0, 1);
    densityComponent = Math.round(90 * (1 - over));
  }
  const semanticBonus = occVAR >= 2 ? 10 : 0;

  const mean = peers.bodyDensityMean;
  const std = Math.max(0.01, peers.bodyDensityStd);
  const z = (density - mean) / std;
  let penalty = 0;
  if (z > 1.5 && z <= 3.0) penalty = ((z - 1.5) / 1.5) * 0.2;
  else if (z > 3.0) penalty = 0.2 + Math.min(0.15, ((z - 3.0) / 2.0) * 0.15);

  const issues: string[] = [];
  if (occKW === 0) issues.push("Use the primary term at least once in body.");
  if (density > BODY_DENSITY_IDEAL[1]) issues.push("Reduce keyword density toward 0.5–2.5%.");
  if (occVAR < 2) issues.push("Add variants/synonyms to broaden topical coverage.");
  if (words < 150) issues.push("Body appears short (<150 words); expand with relevant detail.");

  const score = clamp(densityComponent + semanticBonus, 0, 100);
  return { score, issues, densityPct: +density.toFixed(2), penalty };
}
function fleschReadingEase(text: string) {
  const tokens = tokenize(text);
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const words = Math.max(1, tokens.length);
  const syllables = tokens.reduce((acc, w) => {
    const m = w
      .toLowerCase()
      .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, "")
      .replace(/^y/i, "")
      .match(/[aeiouy]{1,2}/g);
    return acc + Math.max(1, m ? m.length : 0);
  }, 0);
  const ASL = words / sentences;
  const ASW = syllables / words;
  const FRE = 206.835 - 1.015 * ASL - 84.6 * ASW;
  return clamp(FRE, 0, 100);
}
function readabilityBand(score: number) {
  if (score >= 90) return "Very easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult";
  return "Very confusing";
}

/* Orchestrator */
function computeCoverage(input: CoverageInput): CoverageResult {
  const KW = input.target.primary.trim();
  const VAR = (input.target.variants || []).filter(Boolean);
  const peers = {
    bodyWordCountMedian: input.peers?.bodyWordCountMedian ?? DEFAULT_PEERS.bodyWordCountMedian,
    bodyDensityMean: input.peers?.bodyDensityMean ?? DEFAULT_PEERS.bodyDensityMean,
    bodyDensityStd: input.peers?.bodyDensityStd ?? DEFAULT_PEERS.bodyDensityStd,
  };

  const title = scoreTitle(input.page.title, KW, VAR);
  const metaDesc = scoreMeta(input.page.meta, KW, VAR);
  const h1 = scoreH1(input.page.h1, KW, VAR, input.page.title);
  const h2h3 = scoreH2H3(input.page.h2, input.page.h3, KW, VAR);
  const body = scoreBody(input.page.bodyText, KW, VAR, peers);
  const alt = scoreAlt(input.page.imageAlts, KW, VAR);

  // penalties
  let stuffing = body.penalty;
  if ((title.meta?.repeats ?? 0) >= 3) stuffing += 0.03;
  if ((h2h3.meta?.p ?? 0) > 0.7) stuffing += 0.03;
  stuffing = clamp(stuffing, 0, 0.35);

  const weights = { title: 35, h1: 25, h2h3: 20, body: 15, alt: 5 }; // meta advisory only
  const scoreRaw =
    (weights.title * title.score +
      weights.h1 * h1.score +
      weights.h2h3 * h2h3.score +
      weights.body * body.score +
      weights.alt * alt.score) /
    100;

  const scoreFinal = +(clamp(scoreRaw * (1 - stuffing), 0, 100)).toFixed(1);

  const bodyText = input.page.bodyText || "";
  const words = tokenize(bodyText).length;
  const fre = Math.round(fleschReadingEase(bodyText));
  const band = readabilityBand(fre);
  const median = peers.bodyWordCountMedian;
  const deltaPct = median > 0 ? +(((words - median) / median) * 100).toFixed(1) : 0;

  return {
    title,
    h1,
    h2h3,
    body,
    alt,
    metaDesc,
    densityPct: body.densityPct!,
    stuffingPenalty: +(stuffing * 100).toFixed(1),
    scoreRaw: +scoreRaw.toFixed(1),
    scoreFinal,
    readability: { score: fre, band },
    lengthVsMedian: { words, median, deltaPct },
  };
}
function scoreAlt(alts: string[] | undefined, KW: string, VAR: string[]): SignalScore {
  const list = (alts || []).map((a) => a.trim()).filter(Boolean);
  if (!list.length) return { score: 0, issues: ["Add descriptive image alt; include primary term where relevant."], meta: { count: 0 } };
  const k = list.filter((a) => containsToken(` ${norm(a)} `, norm(KW))).length;
  const v = list.filter((a) => VAR.some((x) => containsToken(` ${norm(a)} `, norm(x)))).length;
  const s = k >= 1 ? 100 : v >= 1 ? 70 : 40;
  const issues: string[] = [];
  if (k === 0 && v === 0) issues.push("Use the primary/variant term in at least one image alt.");
  return { score: s, issues, meta: { count: list.length, k, v } };
}

/* -----------------------------------------------------------------------------
 * SMART POPOVER (portal)
 * ---------------------------------------------------------------------------*/
function PortalTooltipShell({
  x,
  y,
  width = 280,
  children,
}: {
  x: number;
  y: number;
  width?: number;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;
  const left = Math.min(Math.max(8, x), window.innerWidth - width - 8);
  const top = Math.min(Math.max(8, y), window.innerHeight - 8);
  return createPortal(
    <div style={{ position: "fixed", top, left, zIndex: 2147483647, pointerEvents: "none" }}>
      <div
        className="rounded-md border bg-white p-2 text-xs shadow"
        style={{ borderColor: TK.border, color: TK.text, width }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/* -----------------------------------------------------------------------------
 * DONUT (hover‑animated) + Center value + Smart Popover
 * ---------------------------------------------------------------------------*/
type FactorKey = "title" | "h1" | "h2h3" | "body" | "alt";
const FACTOR_META: Record<
  FactorKey,
  { label: string; icon: React.ReactNode; weight: number }
> = {
  title: { label: "Title", icon: <TitleIcon size={14} color={TK.brand} />, weight: 35 },
  h1: { label: "H1", icon: <H1Icon size={14} color={TK.brand} />, weight: 25 },
  h2h3: { label: "H2/H3", icon: <H2Icon size={14} color={TK.brand} />, weight: 20 },
  body: { label: "Body", icon: <FileText size={14} color={TK.brand} />, weight: 15 },
  alt: { label: "Image Alt", icon: <ImageIcon size={14} color={TK.brand} />, weight: 5 },
};

function DonutPopover({
  active,
  payload,
  coordinate,
  containerRect,
  parts,
  scoreRaw,
  penaltyPct,
  scoreFinal,
}: any & {
  containerRect?: DOMRect | null;
  parts: {
    key: FactorKey;
    name: string;
    color: string;
    score: number; // 0-100
    weight: number; // %
    points: number; // weighted contribution
  }[];
  scoreRaw: number;
  penaltyPct: number;
  scoreFinal: number;
}) {
  if (!active || !containerRect || !coordinate) return null;
  const hoveredName: string | undefined = payload?.[0]?.name;
  const x = containerRect.left + (coordinate?.x ?? 0) + 12;
  const y = containerRect.top + (coordinate?.y ?? 0) + 12;

  return (
    <PortalTooltipShell x={x} y={y} width={300}>
      <div className="mb-1 font-medium" style={{ color: TK.muted }}>
        Score Breakdown
      </div>
      <div className="mb-1 grid grid-cols-2 gap-2 rounded bg-[#FAFAFA] p-1" style={{ border: `1px solid ${TK.borderLight}` }}>
        <div className="text-[11px]">
          <div className="text-[11px]" style={{ color: TK.muted }}>
            Raw
          </div>
          <div className="font-semibold">{scoreRaw.toFixed(1)}</div>
        </div>
        <div className="text-right text-[11px]">
          <div className="text-[11px]" style={{ color: TK.muted }}>
            Penalty
          </div>
          <div className="font-semibold">-{penaltyPct.toFixed(1)}%</div>
        </div>
        <div className="col-span-2 -mt-1 flex items-center justify-between border-t pt-1" style={{ borderColor: TK.borderLight }}>
          <div className="text-[11px]" style={{ color: TK.muted }}>
            Final
          </div>
          <div className="font-semibold">{scoreFinal.toFixed(1)}</div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {parts.map((p, i) => {
          const activeRow = p.name === hoveredName;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-3 rounded px-1 py-0.5",
                activeRow && "bg-[rgba(0,0,0,0.04)]"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
                <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: TK.muted }}>
                  {/* branded icon + label */}
                  {FACTOR_META[p.key].icon}
                  {FACTOR_META[p.key].label}
                </span>
              </div>
              <div className="text-[12px]">
                <span className="font-semibold">{p.points.toFixed(1)} pts</span>{" "}
                <span style={{ color: TK.muted }}>
                  · {Math.round(p.score)}/100 × {p.weight}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </PortalTooltipShell>
  );
}

function DonutScore({
  result,
  size = 132,
}: {
  result: CoverageResult;
  size?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [active, setActive] = React.useState<number | undefined>(undefined);

  // Build weighted parts (points sum = raw score)
  const parts = React.useMemo(() => {
    const COLS = [
      mixWithWhite(TK.brand, 0.20),
      mixWithWhite(TK.brand, 0.35),
      mixWithWhite(TK.brand, 0.50),
      mixWithWhite(TK.brand, 0.65),
      mixWithWhite(TK.brand, 0.80),
    ];
    const list: { key: FactorKey; score: number; weight: number; color: string }[] = [
      { key: "title", score: result.title.score, weight: FACTOR_META.title.weight, color: COLS[0] },
      { key: "h1", score: result.h1.score, weight: FACTOR_META.h1.weight, color: COLS[1] },
      { key: "h2h3", score: result.h2h3.score, weight: FACTOR_META.h2h3.weight, color: COLS[2] },
      { key: "body", score: result.body.score, weight: FACTOR_META.body.weight, color: COLS[3] },
      { key: "alt", score: result.alt.score, weight: FACTOR_META.alt.weight, color: COLS[4] },
    ];
    return list.map((p) => ({
      ...p,
      name: p.key,
      points: (p.weight * p.score) / 100,
    }));
  }, [result]);

  const totalRaw = parts.reduce((s, p) => s + p.points, 0);

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: size, height: size, overflow: "visible" }}
      role="img"
      aria-label="On-Page Coverage score breakdown"
    >
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            wrapperStyle={{ visibility: "hidden" }}
            allowEscapeViewBox={{ x: true, y: true }}
            content={(tp: any) => (
              <DonutPopover
                {...tp}
                containerRect={ref.current?.getBoundingClientRect() ?? null}
                parts={parts}
                scoreRaw={result.scoreRaw}
                penaltyPct={result.stuffingPenalty}
                scoreFinal={result.scoreFinal}
              />
            )}
            cursor={false}
          />
          <Pie
            data={parts}
            dataKey="points"
            nameKey="name"
            startAngle={90}
            endAngle={-270}
            innerRadius={Math.round(size / 2) - 26}
            outerRadius={Math.round(size / 2) - 10}
            paddingAngle={1}
            activeIndex={active}
            activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: any) => (
              <g
                style={{
                  transform: `translate(${cx}px,${cy}px) scale(1.06) translate(${-cx}px,${-cy}px)`,
                  transition: "transform 160ms ease",
                  filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.25))",
                }}
              >
                <Sector
                  cx={cx}
                  cy={cy}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius + 4}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill={fill}
                  stroke="none"
                  strokeWidth={0}
                />
              </g>
            )}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            isAnimationActive
          >
            {parts.map((p, i) => (
              <Cell key={i} fill={p.color} stroke="none" strokeWidth={0} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center value */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center leading-tight">
        <div className="text-[22px] font-semibold" style={{ color: TK.valueBlue }}>
          {result.scoreFinal.toFixed(1)}
        </div>
        <div className="text-[11px]" style={{ color: TK.muted }}>
          Coverage
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Small UI atoms
 * ---------------------------------------------------------------------------*/
function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "neutral" | "brand";
  children: React.ReactNode;
}) {
  const map = {
    success: { bg: "#ECFDF3", fg: "#166534", bd: "#BBF7D0" },
    warning: { bg: "#FFFBEB", fg: "#92400E", bd: "#FDE68A" },
    danger: { bg: "#FEF2F2", fg: "#991B1B", bd: "#FECACA" },
    brand: { bg: TK.pastelBlue, fg: TK.brand, bd: "#B6E3FF" },
    neutral: { bg: "#F3F4F6", fg: "#374151", bd: "#E5E7EB" },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-xs"
      style={{ backgroundColor: map.bg, color: map.fg, borderColor: map.bd }}
    >
      {children}
    </span>
  );
}

function Row({
  icon,
  label,
  score,
  issues,
  meta,
}: {
  icon: React.ReactNode;
  label: string;
  score: number | null;
  issues: string[];
  meta?: React.ReactNode;
}) {
  const hasIssues = issues.length > 0;
  const tone =
    score === null
      ? "neutral"
      : score >= 80
      ? "success"
      : score >= 60
      ? "brand"
      : score >= 40
      ? "warning"
      : "danger";

  const stateIcon =
    score === null ? (
      <XCircle className="h-4 w-4" style={{ color: TK.danger }} />
    ) : score >= 80 ? (
      <CheckCircle2 className="h-4 w-4" style={{ color: TK.success }} />
    ) : hasIssues ? (
      <AlertTriangle className="h-4 w-4" style={{ color: TK.warn }} />
    ) : (
      <CheckCircle2 className="h-4 w-4" style={{ color: TK.brand }} />
    );

  return (
    <div
      className="grid grid-cols-[20px_1fr_auto] items-start gap-3 rounded-md px-2 py-2 hover:bg-[#F7FAFC]"
      role="listitem"
    >
      <div className="pt-[2px]">{stateIcon}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {icon}
          <div className="font-medium" style={{ color: TK.text }}>
            {label}
          </div>
          {typeof score === "number" && (
            <Chip tone={tone as any}>{Math.round(score)} / 100</Chip>
          )}
          {meta}
        </div>
        {hasIssues && (
          <ul className="list-disc pl-5 text-[12px]" style={{ color: TK.muted }}>
            {issues.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </div>
      <div />
    </div>
  );
}

/* -----------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------*/
export default function OnPageCoverage({
  data,
}: {
  data?: CoverageInput;
}) {
  // Fallback demo
  const fallback: CoverageInput = {
    target: {
      primary: "best seo tool",
      variants: ["seo software", "keyword tool", "site audit"],
    },
    page: {
      url: "/example",
      title: "Best SEO Tool for 2025 — Features, Pricing, and Alternatives",
      meta: "Discover the best SEO tool for 2025. Compare features, pricing, pros & cons, and find the right SEO software for your site.",
      h1: ["Best SEO Tool: 2025 Buyer’s Guide"],
      h2: ["Key Features", "Pricing & Plans", "SEO Software Alternatives"],
      h3: ["Keyword Research", "Site Audit", "Rank Tracking"],
      bodyText:
        "Choosing the best SEO tool depends on your goals and budget. This guide compares leading SEO software across keyword research, site audit capabilities, and rank tracking. The best SEO tool balances data accuracy with workflow speed. We also cover alternatives and how to evaluate pricing.",
      imageAlts: ["keyword research dashboard", "site audit issues chart"],
    },
    peers: { bodyWordCountMedian: 1400, bodyDensityMean: 1.1, bodyDensityStd: 0.4 },
  };

  const input = data || fallback;
  const result = React.useMemo(() => computeCoverage(input), [JSON.stringify(input)]);

  const exportCSV = () => {
    const rows = [
      ["metric", "value", "notes"],
      ["Final Score", result.scoreFinal, "after penalty"],
      ["Raw Score", result.scoreRaw, ""],
      ["Penalty %", `-${result.stuffingPenalty.toFixed(1)}%`, ""],
      ["Title", result.title.score, `len=${result.title.meta?.length}`],
      ["H1", result.h1.score, `count=${result.h1.meta?.count}`],
      ["H2/H3", result.h2h3.score, `p=${Math.round((result.h2h3.meta?.p || 0) * 100)}%`],
      ["Body", result.body.score, `density=${result.densityPct.toFixed(2)}%`],
      ["Image Alt", result.alt.score, `images=${result.alt.meta?.count}`],
      ["Readability", result.readability.score, result.readability.band],
      [
        "Words vs Median",
        result.lengthVsMedian.words,
        `${result.lengthVsMedian.deltaPct >= 0 ? "+" : ""}${result.lengthVsMedian.deltaPct}% vs ${result.lengthVsMedian.median}`,
      ],
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "onpage_coverage.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toneBy = (n: number) =>
    (n >= 80 ? "success" : n >= 60 ? "brand" : n >= 40 ? "warning" : "danger") as
      | "success"
      | "brand"
      | "warning"
      | "danger";

  return (
    <section
      className="rounded-[12px] border bg-white p-4 mt-4"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="On-Page Coverage"
    >
      {/* Header */}
      <header
        className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-2"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={20} color={TK.brand} />
          <h2 className="text-[18px] font-semibold" style={{ color: TK.text }}>
            On‑Page Coverage
          </h2>
          <button
            type="button"
            className="rounded p-1 text-[#9CA3AF] hover:bg-gray-50"
            title="Score combines Title, H1, H2/H3, Body, and Image Alt. Hover the donut for breakdown."
            aria-label="About"
            style={{ cursor: "pointer" }}
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Modern chips */}
          <Chip tone="brand">{input.target.primary}</Chip>
          {input.target.variants?.slice(0, 2).map((v, i) => (
            <Chip key={i} tone="neutral">
              {v}
            </Chip>
          ))}

          {/* Filters + Export */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.text }}
            aria-label="Filters"
          >
            <SlidersHorizontal size={16} color={TK.brand} />
            Filters
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-gray-50"
            style={{ borderColor: TK.border, cursor: "pointer", color: TK.valueBlue }}
            aria-label="Export"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
        {/* Left: Donut + quick KPIs */}
        <div className="flex flex-col items-center gap-3">
          <DonutScore result={result} />
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <Chip tone="brand">
              <Gauge size={14} color={TK.brand} />
              Raw {result.scoreRaw.toFixed(1)}
            </Chip>
            <Chip tone={result.stuffingPenalty > 0 ? "warning" : "neutral"}>
              Penalty −{result.stuffingPenalty.toFixed(1)}%
            </Chip>
            <Chip tone="neutral">
              Density {result.densityPct.toFixed(2)}%
            </Chip>
            <Chip tone={toneBy(result.readability.score)}>
              Readability {result.readability.score} — {result.readability.band}
            </Chip>
            <Chip tone="neutral">
              {result.lengthVsMedian.words} words (
              {result.lengthVsMedian.deltaPct >= 0 ? "+" : ""}
              {result.lengthVsMedian.deltaPct}% vs {result.lengthVsMedian.median})
            </Chip>
          </div>
        </div>

        {/* Right: Checklist */}
        <div role="list" className="space-y-2">
          <Row
            icon={<TitleIcon className="h-4 w-4" color={TK.brand} />}
            label="Title"
            score={result.title.score}
            issues={result.title.issues}
            meta={<Chip tone="neutral">{result.title.meta?.length ?? 0} chars</Chip>}
          />
          <Row
            icon={<H1Icon className="h-4 w-4" color={TK.brand} />}
            label="H1"
            score={result.h1.score}
            issues={result.h1.issues}
            meta={<Chip tone="neutral">{result.h1.meta?.count ?? 0} found</Chip>}
          />
          <Row
            icon={<H2Icon className="h-4 w-4" color={TK.brand} />}
            label="H2/H3"
            score={result.h2h3.score}
            issues={result.h2h3.issues}
            meta={
              <Chip tone="neutral">
                {result.h2h3.meta?.n ?? 0} headings, {Math.round((result.h2h3.meta?.p || 0) * 100)}% with term
              </Chip>
            }
          />
          <Row
            icon={<FileText className="h-4 w-4" color={TK.brand} />}
            label="Body"
            score={result.body.score}
            issues={result.body.issues}
            meta={<Chip tone="neutral">{result.lengthVsMedian.words} words</Chip>}
          />
          <Row
            icon={<ImageIcon className="h-4 w-4" color={TK.brand} />}
            label="Image Alt"
            score={result.alt.score}
            issues={result.alt.issues}
            meta={<Chip tone="neutral">{result.alt.meta?.count ?? 0} images</Chip>}
          />
          {/* Advisory (Meta, not scored) */}
          <div className="mt-2 rounded-md border p-2" style={{ borderColor: TK.borderLight }}>
            <div className="mb-1 flex items-center gap-2">
              <Info size={14} color={TK.gray} />
              <div className="text-sm font-medium" style={{ color: TK.text }}>
                Meta Description (advisory)
              </div>
              <Chip tone="neutral">{result.metaDesc.meta?.length ?? 0} chars</Chip>
            </div>
            <ul className="list-disc pl-5 text-[12px]" style={{ color: TK.muted }}>
              {(result.metaDesc.issues.length ? result.metaDesc.issues : ["Looks good."]).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
