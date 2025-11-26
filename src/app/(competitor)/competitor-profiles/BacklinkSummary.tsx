"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Info as InfoIcon,
  ChevronDown,
  ExternalLink,
  X,
  Link2,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";

/* -------------------------------- TOKENS -------------------------------- */
const TOKENS = {
  brand: "#008CCD", // branded blue
  brandHover: "#007DB3",
  compBlue: "#0077FF", // competitor primary
  pastelBlue: "#D9EEF8",
  surface: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  chipBg: "#F5F7FA",
} as const;

/* ------------------------------- TYPES ---------------------------------- */
type LinkType =
  | "dofollow"
  | "nofollow"
  | "image"
  | "redirect"
  | "ugc"
  | "sponsored"
  | "text";

type TopDomainRow = {
  domain: string;
  url?: string;
  links: number;
  type: LinkType | "mixed";
  wrScore: number; // 0..100
  anchorTop: { text: string; count: number }[];
  category?: string;
  you?: {
    links?: number;
    wrScore?: number;
    anchorTop?: { text: string; count: number }[];
  };
};

type AnchorCloud = {
  comp: Record<string, number>;
  you?: Record<string, number>;
  totalComp: number;
  totalYou?: number;
  classMap?: Record<string, "branded" | "exact" | "partial" | "generic">;
};

type WRBreakdown = {
  comp: {
    authority: number;
    relevancy: number;
    diversity: number;
    freshness: number;
    toxicity: number; // lower is better
  };
  you?: {
    authority: number;
    relevancy: number;
    diversity: number;
    freshness: number;
    toxicity: number;
  };
  notes?: string;
};

type TypeDistribution = {
  comp: Partial<Record<LinkType, number>>;
  you?: Partial<Record<LinkType, number>>;
  totalComp: number;
  totalYou?: number;
};

/* ------------------------------ HELPERS --------------------------------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const pf = (n: number, d = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: d }).format(n)}%`;
const clamp = (n: number, a = 0, b = 100) => Math.min(b, Math.max(a, n));
function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function useOutsideClose<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!open) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}
function shortDomain(d: string) {
  return d.replace(/^https?:\/\/(www\.)?/, "");
}
const faviconUrl = (host?: string, size: 16 | 24 = 16) =>
  host
    ? `https://www.google.com/s2/favicons?sz=${size}&domain_url=${encodeURIComponent(
        host.startsWith("http") ? host : `https://${host}`
      )}`
    : "";

/** Generic info tooltip */
function InfoPopover({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <span className="relative inline-flex items-center group cursor-help align-middle">
      <InfoIcon size={14} className="ml-1 text-[#9CA3AF]" />
      <span
        role="tooltip"
        className={classNames(
          "invisible group-hover:visible absolute z-50 top-full mt-1 w-72 rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow",
          align === "right" ? "right-0" : "left-0"
        )}
        style={{ borderColor: TOKENS.border }}
      >
        {label}
      </span>
    </span>
  );
}

/** Tiny donut used in header and table */
function MiniDonut({
  value,
  color,
  size = 18,
  strokeWidth = 3,
  title,
}: {
  value: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  title?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * C;
  return (
    <span className="inline-flex items-center" title={title ?? `${value}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </span>
  );
}

/* ------------------------------ PRIMITIVES ------------------------------ */
const Chip: React.FC<React.PropsWithChildren<{ title?: string }>> = ({
  children,
  title,
}) => (
  <span
    title={title}
    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-default"
    style={{ background: TOKENS.chipBg, borderColor: TOKENS.border, color: TOKENS.text }}
  >
    {children}
  </span>
);

function ButtonGhost(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={classNames(
        "inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer",
        className
      )}
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
    />
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 h-9 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
      style={{ borderColor: TOKENS.border, color: TOKENS.text }}
      aria-pressed={checked}
    >
      <span
        className={`relative h-5 w-9 rounded-full ${
          checked ? "bg-[color:var(--on)]" : "bg-gray-300"
        }`}
        style={{ ["--on" as any]: TOKENS.brand }}
      >
        <span
          className={`absolute top-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

/* ------------------------------ EXPORT MENU ----------------------------- */
function ExportMenu({
  onCSV,
}: {
  onCSV: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[6px] border px-3 text-sm bg-white hover:bg-gray-50 cursor-pointer"
        style={{ borderColor: TOKENS.border, color: TOKENS.text }}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
      >
        <Download size={16} color={TOKENS.brand} />
        Export
        <ChevronDown size={16} color="#9CA3AF" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-[6px] border bg-white shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
            onClick={() => (setOpen(false), onCSV())}
          >
            Export CSV
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed"
            title="Coming soon"
          >
            Export PNG (Soon)
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-sm text-gray-400 cursor-not-allowed"
            title="Upgrade to Pro"
          >
            Export PDF (Pro)
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ ANCHOR CLOUD ---------------------------- */
type AnchorFilter = "all" | "branded" | "exact" | "partial" | "generic";
const FILTER_LABEL: Record<AnchorFilter, string> = {
  all: "All",
  branded: "Branded",
  exact: "Exact",
  partial: "Partial",
  generic: "Generic",
};
const CLASS_COLOR: Record<Exclude<AnchorFilter, "all">, string> = {
  branded: TOKENS.brand,
  exact: TOKENS.compBlue,
  partial: "#7C3AED",
  generic: TOKENS.muted,
};

function AnchorCloudBlock({
  cloud,
  compareOn,
}: {
  cloud: AnchorCloud;
  compareOn: boolean;
}) {
  const [filter, setFilter] = useState<AnchorFilter>("all");
  const [tab, setTab] = useState<"comp" | "you">("comp");

  const allKeys = useMemo(() => {
    const s = new Set<string>(Object.keys(cloud.comp));
    if (cloud.you) Object.keys(cloud.you).forEach((k) => s.add(k));
    return Array.from(s);
  }, [cloud]);

  const filteredKeys = allKeys.filter((w) => {
    if (filter === "all" || !cloud.classMap) return true;
    return cloud.classMap[w] === filter;
  });

  function fontSize(p: number) {
    const min = 12;
    const max = 26;
    return `${min + Math.round(p * (max - min))}px`;
  }

  function Word({ w, entity }: { w: string; entity: "comp" | "you" }) {
    const c = entity === "comp" ? cloud.comp[w] ?? 0 : cloud.you?.[w] ?? 0;
    const total = entity === "comp" ? cloud.totalComp : cloud.totalYou ?? 0;
    const p = total ? c / total : 0;

    const classTag = cloud.classMap?.[w] ?? ("generic" as Exclude<AnchorFilter, "all">);
    const color =
      classTag === "branded"
        ? CLASS_COLOR.branded
        : classTag === "exact"
        ? CLASS_COLOR.exact
        : classTag === "partial"
        ? CLASS_COLOR.partial
        : CLASS_COLOR.generic;

    return (
      <span className="relative group inline-block">
        <button
          className="mx-1 my-0.5 underline decoration-dotted cursor-pointer"
          style={{ fontSize: fontSize(p), color }}
          title={w}
        >
          {w}
        </button>
        <div
          className="invisible group-hover:visible absolute z-50 mt-1 w-[220px] rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="font-medium truncate" title={w}>
            “{w}”
          </div>
          <div className="mt-1 text-[#6B7280]">
            Competitor: <b>{cloud.comp[w] ?? 0}</b>{" "}
            {cloud.totalComp ? `(${pf(((cloud.comp[w] ?? 0) / cloud.totalComp) * 100, 1)})` : ""}
          </div>
          {compareOn && (
            <div className="text-[#6B7280]">
              You: <b>{cloud.you?.[w] ?? 0}</b>{" "}
              {cloud.totalYou ? `(${pf(((cloud.you?.[w] ?? 0) / cloud.totalYou) * 100, 1)})` : ""}
            </div>
          )}
        </div>
      </span>
    );
  }

  return (
    <div
      className="rounded-[6px] border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            Anchor Text Cloud
          </h4>
          <InfoPopover label="Word size ∝ frequency among backlinks. Based on link count. Use filters to view branded/exact/partial/generic anchors." />
        </div>
        <LegendEntities compareOn={compareOn} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1">
        {(["all", "branded", "exact", "partial", "generic"] as AnchorFilter[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={classNames(
              "h-8 rounded-full border px-2 text-sm cursor-pointer",
              filter === k ? "font-semibold" : ""
            )}
            style={{
              borderColor: TOKENS.border,
              background: filter === k ? TOKENS.pastelBlue : "#fff",
              color: filter === k ? TOKENS.compBlue : TOKENS.text,
            }}
            title={FILTER_LABEL[k]}
          >
            {FILTER_LABEL[k]}
          </button>
        ))}

        {compareOn && (
          <div className="ml-auto flex items-center gap-2 text-sm md:hidden">
            <button
              className={classNames(
                "rounded-full border px-2 py-1 cursor-pointer inline-flex items-center gap-1",
                tab === "comp" ? "font-semibold" : ""
              )}
              style={{
                borderColor: TOKENS.border,
                background: tab === "comp" ? TOKENS.pastelBlue : "#fff",
                color: tab === "comp" ? TOKENS.compBlue : TOKENS.text,
              }}
              onClick={() => setTab("comp")}
              title="Show Competitor"
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} />
              Competitor
            </button>
            <button
              className={classNames(
                "rounded-full border px-2 py-1 cursor-pointer inline-flex items-center gap-1",
                tab === "you" ? "font-semibold" : ""
              )}
              style={{
                borderColor: TOKENS.border,
                background: tab === "you" ? TOKENS.pastelBlue : "#fff",
                color: tab === "you" ? TOKENS.brand : TOKENS.text,
              }}
              onClick={() => setTab("you")}
              title="Show You"
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} />
              You
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={classNames(compareOn ? "hidden md:block" : "block")}>
          <div className="mb-1 text-xs text-[#6B7280]">Competitor</div>
          <div className="min-h-[160px] rounded-[6px] border p-3" style={{ borderColor: TOKENS.border }}>
            {filteredKeys.length ? (
              <div className="select-none">
                {filteredKeys.map((w) => (
                  <Word key={`c-${w}`} w={w} entity="comp" />
                ))}
              </div>
            ) : (
              <div className="grid h-[160px] place-items-center text-sm text-[#6B7280]">
                No anchors for selected filters.
              </div>
            )}
          </div>
        </div>

        {compareOn && (
          <div className={classNames("md:block", tab === "you" ? "block" : "hidden md:block")}>
            <div className="mb-1 text-xs text-[#6B7280]">You</div>
            <div className="min-h-[160px] rounded-[6px] border p-3" style={{ borderColor: TOKENS.border }}>
              {filteredKeys.length ? (
                <div className="select-none">
                  {filteredKeys.map((w) => (
                    <Word key={`y-${w}`} w={w} entity="you" />
                  ))}
                </div>
              ) : (
                <div className="grid h-[160px] place-items-center text-sm text-[#6B7280]">
                  No anchors for selected filters.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------- BACKLINK TYPES DISTRIBUTION --------------------- */
const TYPE_ORDER: LinkType[] = [
  "dofollow",
  "nofollow",
  "image",
  "redirect",
  "ugc",
  "sponsored",
  "text",
];
const TYPE_LABEL: Record<LinkType, string> = {
  dofollow: "Dofollow",
  nofollow: "Nofollow",
  image: "Image",
  redirect: "Redirect",
  ugc: "UGC",
  sponsored: "Sponsored",
  text: "Text",
};
const TYPE_COLOR: Record<LinkType, string> = {
  dofollow: "#16A34A",
  nofollow: "#6B7280",
  image: "#F59E0B",
  redirect: "#EF4444",
  ugc: "#0EA5E9",
  sponsored: "#A855F7",
  text: "#374151",
};

function LegendEntities({ compareOn }: { compareOn: boolean }) {
  return (
    <div className="flex items-center gap-4 text-xs text-[#6B7280]">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} />
        Competitor
      </span>
      {compareOn && (
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} />
          You
        </span>
      )}
    </div>
  );
}

function BacklinkTypesBlock({
  dist,
  compareOn,
}: {
  dist: TypeDistribution;
  compareOn: boolean;
}) {
  const [asPercent, setAsPercent] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const dataGrouped = useMemo(
    () =>
      TYPE_ORDER.map((t) => ({
        type: TYPE_LABEL[t],
        comp: dist.comp[t] ?? 0,
        you: dist.you?.[t] ?? 0,
      })),
    [dist]
  );

  const totalComp = Math.max(1, dist.totalComp || 1);
  const totalYou = Math.max(1, dist.totalYou || 1);

  const segments = useMemo(() => {
    const raw = TYPE_ORDER.map((t) => ({
      key: t,
      label: TYPE_LABEL[t],
      color: TYPE_COLOR[t],
      count: dist.comp[t] ?? 0,
    })).filter((s) => s.count > 0);
    const sum = raw.reduce((a, b) => a + b.count, 0) || 1;
    return raw
      .map((s) => ({ ...s, pct: (s.count / sum) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [dist]);

  return (
    <div
      className="rounded-[6px] border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            Backlink Types Distribution
          </h4>
          <InfoPopover label="Distribution of backlink types. Toggle % to normalize bars by each entity's total links." />
        </div>
        <div className="flex items-center gap-3">
          <LegendEntities compareOn={compareOn} />
          <label className="ml-2 inline-flex items-center gap-2 text-sm text-[#374151] cursor-pointer">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={asPercent}
              onChange={(e) => setAsPercent(e.target.checked)}
            />{" "}
            Show %
          </label>
        </div>
      </div>

      {!compareOn ? (
        <div>
          <div className="mb-2 text-xs text-[#6B7280]">Competitor (segmented)</div>

          {/* NO additional border lines on the stacked bar */}
          <div className="relative group">
            <div className="relative h-6 w-full overflow-hidden rounded-[6px] bg-[#E5E7EB]">
              <div className="absolute inset-0 flex">
                {segments.map((s) => (
                  <div
                    key={s.key}
                    className="h-full"
                    style={{ width: `${s.pct}%`, background: s.color }}
                    title={`${s.label} — ${s.pct.toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>

            {/* Smart popover — list items highlight on hover */}
            <div
              role="tooltip"
              className="invisible group-hover:visible absolute left-0 top-full z-50 mt-2 w-[320px] rounded-[6px] border bg-white p-3 text-xs leading-snug text-[#111827] shadow"
              style={{ borderColor: TOKENS.border }}
            >
              <div className="mb-2 flex items-center gap-4 text-xs text-[#6B7280]">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} />
                  Competitor
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} />
                  You
                </span>
              </div>
              <div className="space-y-1">
                {segments.map((s) => (
                  <div
                    key={s.key}
                    onMouseEnter={() => setHoverKey(s.key)}
                    onMouseLeave={() => setHoverKey(null)}
                    className={classNames(
                      "flex items-center justify-between gap-3 rounded-[4px] px-1 py-1 cursor-pointer",
                      hoverKey === s.key ? "bg-[#F5F7FA]" : ""
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                      {s.label}
                    </span>
                    <span className="tabular-nums text-[#374151]">
                      {nf(s.count)} ({s.pct.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6B7280]">
            {segments.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[260px]" role="img" aria-label="Grouped bars by backlink type">
          <ResponsiveContainer>
            <BarChart
              data={dataGrouped.map((d) => ({
                ...d,
                comp: asPercent ? (d.comp / totalComp) * 100 : d.comp,
                you: asPercent ? (d.you / totalYou) * 100 : d.you,
              }))}
              margin={{ top: 10, left: 6, right: 6, bottom: 0 }}
              barCategoryGap="24%"
              barGap={6}
              maxBarSize={28}
            >
              <CartesianGrid vertical={false} stroke={TOKENS.border} />
              <XAxis dataKey="type" tick={{ fontSize: 12, fill: TOKENS.muted }} />
              <YAxis
                tick={{ fontSize: 12, fill: TOKENS.muted }}
                tickFormatter={(n) => (asPercent ? `${Math.round(+n)}%` : nf(+n))}
              />
              <RTooltip
                content={({ active, label }) => {
                  if (!active) return null;
                  const k = getTypeKey(label);
                  const compCount = dist.comp[k] ?? 0;
                  const youCount = dist.you?.[k] ?? 0;
                  const compPct = (compCount / Math.max(1, dist.totalComp)) * 100;
                  const youPct = (youCount / Math.max(1, dist.totalYou ?? 1)) * 100;
                  return (
                    <div
                      style={{
                        background: "#fff",
                        border: `1px solid ${TOKENS.border}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        fontSize: 12,
                        boxShadow: "0 1px 2px rgba(17,24,39,.06)",
                      }}
                    >
                      <div className="font-medium text-[#111827]">{label}</div>
                      <div className="text-[#374151]">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} />
                          Competitor:
                        </span>{" "}
                        <b>{nf(compCount)}</b> ({compPct.toFixed(1)}%)
                      </div>
                      <div className="text-[#374151]">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} />
                          You:
                        </span>{" "}
                        <b>{nf(youCount)}</b> ({youPct.toFixed(1)}%)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="comp" name="Competitor" fill={TOKENS.compBlue} radius={[6, 6, 0, 0]} />
              <Bar dataKey="you" name="You" fill={TOKENS.brand} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
function getTypeKey(label: string): LinkType {
  const entry = Object.entries(TYPE_LABEL).find(([, v]) => v === label);
  return (entry?.[0] as LinkType) ?? "text";
}

/* --------------------------- WR BREAKDOWN GAUGES ------------------------ */
function calcTotalWR(f: {
  authority: number;
  relevancy: number;
  diversity: number;
  freshness: number;
  toxicity: number;
}) {
  const v =
    (f.authority + f.relevancy + f.diversity + f.freshness + (100 - f.toxicity)) / 5;
  return Math.round(clamp(v));
}
const FACTOR_DEF: Record<string, string> = {
  Authority: "Strength of linking domains/pages that reference you (0–100).",
  Relevancy: "Topical alignment between linking pages and your pages (0–100).",
  Diversity: "Variety of referring domains, subnets, and link types (0–100).",
  Freshness: "Recency/velocity of links and updates on linking pages (0–100).",
  Toxicity: "Risk/spam signals in backlinks (lower is better).",
};

function Gauge({
  label,
  comp,
  you,
  compareOn,
  inverse = false,
}: {
  label: string;
  comp: number;
  you?: number;
  compareOn: boolean;
  inverse?: boolean;
}) {
  const compVal = clamp(comp);
  const youVal = typeof you === "number" ? clamp(you) : undefined;

  return (
    <div className="rounded-[6px] border p-3" style={{ borderColor: TOKENS.border }}>
      {/* Title + definition tooltip */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{label}</div>
        <InfoPopover label={FACTOR_DEF[label] ?? `${label} factor`} align="right" />
      </div>

      {/* Smart popover ABOVE the bars (so it does not overlap the chart) */}
      <div className="mt-2 relative group cursor-help">
        <div
          className="invisible group-hover:visible absolute right-0 bottom-full mb-2 z-50 w-[220px] rounded-[6px] border bg-white p-2 text-xs leading-snug text-[#111827] shadow"
          style={{ borderColor: TOKENS.border }}
        >
          <div className="font-medium">{label}</div>
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2 text-[#374151]">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} />
              Competitor: <b className="tabular-nums">{compVal}</b>
            </div>
            {compareOn && typeof youVal === "number" && (
              <div className="flex items-center gap-2 text-[#374151]">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} />
                You: <b className="tabular-nums">{youVal}</b>
              </div>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#6B7280]">
            {inverse ? "Lower is better." : "Higher is better."}
          </div>
        </div>

        {/* Bars */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.compBlue }} title="Competitor" />
            <div className="flex-1 h-2 rounded bg-[#E5E7EB] overflow-hidden">
              <div className="h-full" style={{ width: `${compVal}%`, background: TOKENS.compBlue }} />
            </div>
            <div className="text-xs tabular-nums">{compVal}</div>
          </div>

          {compareOn && typeof youVal === "number" && (
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOKENS.brand }} title="You" />
              <div className="flex-1 h-2 rounded bg-[#E5E7EB] overflow-hidden">
                <div className="h-full" style={{ width: `${youVal}%`, background: TOKENS.brand }} />
              </div>
              <div className="text-xs tabular-nums">{youVal}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WRBreakdownBlock({ model, compareOn }: { model: WRBreakdown; compareOn: boolean }) {
  const f = model.comp;
  const y = model.you;
  const totalComp = calcTotalWR(f);
  const totalYou = y ? calcTotalWR(y) : undefined;

  return (
    <div
      className="rounded-[6px] border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            WR Score Breakdown
          </h4>
          <InfoPopover label="Sub‑factors that contribute to the overall backlink WR Score." />
        </div>

        {/* Header totals */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#6B7280]">Total WR</span>
            <span className="inline-flex items-center gap-1" title={`Competitor Total WR: ${totalComp}`}>
              <MiniDonut value={totalComp} color={TOKENS.compBlue} />
              <span className="tabular-nums font-semibold" style={{ color: TOKENS.compBlue }}>
                {totalComp}
              </span>
            </span>
            {compareOn && typeof totalYou === "number" && (
              <span className="inline-flex items-center gap-1" title={`Your Total WR: ${totalYou}`}>
                <MiniDonut value={totalYou} color={TOKENS.brand} />
                <span className="tabular-nums font-semibold" style={{ color: TOKENS.brand }}>
                  {totalYou}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Gauge label="Authority" comp={f.authority} you={y?.authority} compareOn={compareOn} />
        <Gauge label="Relevancy" comp={f.relevancy} you={y?.relevancy} compareOn={compareOn} />
        <Gauge label="Diversity" comp={f.diversity} you={y?.diversity} compareOn={compareOn} />
        <Gauge label="Freshness" comp={f.freshness} you={y?.freshness} compareOn={compareOn} />
        <Gauge label="Toxicity" comp={f.toxicity} you={y?.toxicity} compareOn={compareOn} inverse />
      </div>

      {model.notes && <div className="mt-2 text-xs text-[#6B7280]">{model.notes}</div>}
    </div>
  );
}

/* --------------------------- TOP DOMAIN TABLE --------------------------- */
type SortKey = "domain" | "links" | "type" | "wr" | "category";
type SortDir = "asc" | "desc";

const COL_INFO = {
  domain: "Root domain that links to the site. Multiple pages from the same root are deduped.",
  links: "Total inbound backlinks from this root. Click to view backlinks for this domain.",
  type: "Dominant link type from this domain.",
  wr: "Wranker domain authority score (0–100).",
  anchor: "Most common anchor texts from this domain. Counts reflect occurrences across backlinks.",
  category: "Auto‑detected site category (Blog, News, Forum, Tech, etc.).",
};

function TypePill({ t }: { t: LinkType | "mixed" }) {
  const label = t === "mixed" ? "Mixed" : TYPE_LABEL[t as LinkType];
  const color = t === "mixed" ? "#9CA3AF" : TYPE_COLOR[t as LinkType];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
      style={{ borderColor: TOKENS.border }}
      title={label}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function AnchorChips({ anchors }: { anchors: { text: string; count: number }[] }) {
  const shown = anchors.slice(0, 2);
  const more = anchors.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((a) => (
        <span
          key={a.text}
          className="rounded-full bg-[#F5F7FA] px-2 py-1 text-xs"
          title={`"${a.text}" • ${a.count} links`}
        >
          “{a.text}” ({a.count})
        </span>
      ))}
      {more > 0 && (
        <span className="rounded-full bg-[#F5F7FA] px-2 py-1 text-xs text-[#374151]">+{more} more</span>
      )}
    </div>
  );
}

function TopDomainsTable({
  rows,
  compareOn,
  onOpenLinks,
}: {
  rows: TopDomainRow[];
  compareOn: boolean;
  onOpenLinks: (domain: string, entity: "comp" | "you") => void;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("links");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...rows];
    const getter = (r: TopDomainRow) => {
      switch (sortBy) {
        case "domain":
          return r.domain;
        case "links":
          return r.links;
        case "type":
          return r.type;
        case "wr":
          return r.wrScore;
        case "category":
          return r.category ?? "";
        default:
          return 0;
      }
    };
    arr.sort((a, b) => {
      const av = getter(a) as any;
      const bv = getter(b) as any;
      if (av === bv) return sortBy !== "links" ? b.links - a.links : 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return arr.slice(0, 10);
  }, [rows, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy !== k) {
      setSortBy(k);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  }

  return (
    <div
      className="rounded-[6px] border p-4 shadow-sm"
      style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            Top Linking Domains
          </h4>
          <InfoPopover label="Top root domains linking to the target site. Counts deduped by root." />
        </div>
        <LegendEntities compareOn={compareOn} />
      </div>

      {/* Horizontal scrollbar only when needed */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-auto">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="border-b" style={{ borderColor: TOKENS.border }}>
              <Th
                label="Domain"
                info={COL_INFO.domain}
                sortable
                active={sortBy === "domain"}
                dir={sortDir}
                onClick={() => toggleSort("domain")}
                sticky
              />
              <Th
                label="#Links"
                info={COL_INFO.links}
                sortable
                active={sortBy === "links"}
                dir={sortDir}
                onClick={() => toggleSort("links")}
              />
              <Th label="Type" info={COL_INFO.type} sortable={false} />
              <Th
                label="WR Score"
                info={COL_INFO.wr}
                sortable
                active={sortBy === "wr"}
                dir={sortDir}
                onClick={() => toggleSort("wr")}
              />
              <Th label="Anchor Used" info={COL_INFO.anchor} sortable={false} />
              <Th
                label="Category"
                info={COL_INFO.category}
                sortable
                active={sortBy === "category"}
                dir={sortDir}
                onClick={() => toggleSort("category")}
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const you = r.you;
              return (
                <React.Fragment key={r.domain}>
                  {/* Competitor row */}
                  <tr className="border-b hover:bg-[#FAFCFE]" style={{ borderColor: TOKENS.border }}>
                    <Td sticky>
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline decoration-1 cursor-pointer inline-flex items-center gap-1"
                          style={{ color: TOKENS.compBlue }}
                          title={r.url}
                        >
                          {shortDomain(r.domain)}
                          <ExternalLink size={12} className="text-[#9CA3AF]" />
                        </a>
                      ) : (
                        <span className="font-medium">{shortDomain(r.domain)}</span>
                      )}
                    </Td>
                    <Td>
                      <button
                        className="inline-flex items-center gap-1 underline decoration-1 hover:opacity-80 cursor-pointer"
                        style={{ color: TOKENS.compBlue }}
                        onClick={() => onOpenLinks(r.domain, "comp")}
                        title="View backlinks from this domain (Competitor)"
                      >
                        {nf(r.links)} <Link2 size={14} />
                      </button>
                    </Td>
                    <Td>
                      <TypePill t={r.type} />
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1">
                        <MiniDonut value={r.wrScore} color={TOKENS.compBlue} />
                        <span className="tabular-nums font-semibold" style={{ color: TOKENS.compBlue }}>
                          {r.wrScore}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <AnchorChips anchors={r.anchorTop} />
                    </Td>
                    <Td>{r.category ?? "—"}</Td>
                  </tr>

                  {/* Sub‑row for Compare ON */}
                  {compareOn && (
                    <tr className="border-b" style={{ borderColor: TOKENS.border, background: TOKENS.chipBg }}>
                      <td colSpan={6} className="px-3 py-2">
                        {you?.links ? (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="text-[#6B7280]">You:</span>
                            <button
                              className="underline decoration-1 cursor-pointer"
                              style={{ color: TOKENS.brand }}
                              onClick={() => onOpenLinks(r.domain, "you")}
                              title="View backlinks from this domain (You)"
                            >
                              {nf(you.links)} links
                            </button>
                            <span className="text-[#6B7280]">| Anchor:</span>
                            <span className="text-[#111827]">“{you.anchorTop?.[0]?.text ?? "—"}”</span>
                            <span className="text-[#6B7280]">| WR:</span>
                            {typeof you.wrScore === "number" ? (
                              <span className="inline-flex items-center gap-1">
                                <MiniDonut value={you.wrScore} color={TOKENS.brand} />
                                <span className="tabular-nums" style={{ color: TOKENS.brand }}>
                                  {you.wrScore}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[#111827]">—</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-[#6B7280]">You: no links from this domain.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  info,
  sortable,
  active,
  dir,
  onClick,
  sticky,
}: {
  label: string;
  info: string;
  sortable?: boolean;
  active?: boolean;
  dir?: "asc" | "desc";
  onClick?: () => void;
  sticky?: boolean;
}) {
  return (
    <th
      className={classNames(
        "px-3 py-2 text-sm font-medium text-left",
        sticky ? "sticky left-0 bg-white z-10" : ""
      )}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {sortable ? (
          <button
            className="inline-flex items-center gap-1 hover:underline cursor-pointer"
            onClick={onClick}
            title={`Sort by ${label}`}
          >
            <span>{label}</span>
            <span className="text-[#9CA3AF]">{active ? (dir === "asc" ? "▲" : "▼") : "⇅"}</span>
          </button>
        ) : (
          <span>{label}</span>
        )}
        <InfoPopover label={info} />
      </span>
    </th>
  );
}
function Td({
  children,
  sticky,
}: React.PropsWithChildren<{ sticky?: boolean }>) {
  return (
    <td className={classNames("px-3 py-2 text-left", sticky ? "sticky left-0 bg-white z-10" : "")}>
      {children}
    </td>
  );
}

/* ------------------------------ DRAWER (Links) --------------------------- */
type LinkRow = {
  sourceUrl: string;
  targetUrl: string;
  anchor: string;
  type: LinkType;
  firstSeen: string;
  lastSeen: string;
};

function Drawer({
  open,
  onClose,
  title,
  width = 680,
  children,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; title: string; width?: number }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TOKENS.border }}>
          <h4 className="text-[16px] font-semibold">{title}</h4>
          <button
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100 cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function LinksDrawer({
  open,
  onClose,
  domain,
  entity,
}: {
  open: boolean;
  onClose: () => void;
  domain: string | null;
  entity: "comp" | "you";
}) {
  const rows = useMemo(() => (domain ? makeLinkRows(domain) : []), [domain]);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${domain ?? ""} — Backlinks (${entity === "comp" ? "Competitor" : "You"})`}
      width={860}
    >
      <div className="mb-3 text-sm text-[#6B7280]">
        Filtered backlinks for <b>{domain}</b>. Click a URL to open in a new tab.
      </div>
      <div className="overflow-x-auto rounded-[6px] border" style={{ borderColor: TOKENS.border }}>
        <table className="w-full text-sm">
          <thead className="bg-[#F9FAFB]">
            <tr className="text-left">
              <th className="px-3 py-2">Source URL</th>
              <th className="px-3 py-2">Target URL</th>
              <th className="px-3 py-2">Anchor</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">First seen</th>
              <th className="px-3 py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-top border-t hover:bg-[#FAFCFE]" style={{ borderColor: TOKENS.border }}>
                <td className="px-3 py-2">
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-1 cursor-pointer"
                    style={{ color: TOKENS.compBlue }}
                  >
                    {truncate(r.sourceUrl, 68)}
                  </a>
                </td>
                <td className="px-3 py-2">
                  <a
                    href={r.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-1 cursor-pointer"
                    style={{ color: TOKENS.brand }}
                  >
                    {truncate(r.targetUrl, 48)}
                  </a>
                </td>
                <td className="px-3 py-2">“{r.anchor}”</td>
                <td className="px-3 py-2">
                  <TypePill t={r.type as LinkType} />
                </td>
                <td className="px-3 py-2">{r.firstSeen}</td>
                <td className="px-3 py-2">{r.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}

/* ------------------------------- MOCK DATA ------------------------------- */
function rnd(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function pick<T>(arr: T[], n: number) {
  const a = [...arr];
  const out: T[] = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}
function chance(p = 0.5) {
  return Math.random() < p;
}

function mockDomains(): TopDomainRow[] {
  const domains = [
    "bloghub.io",
    "techdigest.net",
    "newsline.co",
    "growthverse.com",
    "opencharts.org",
    "devforum.dev",
    "toolstack.app",
    "linkgrid.net",
    "saasweekly.com",
    "aiinsights.io",
    "webmasters.help",
    "productwatcher.com",
  ];
  const categories = ["Blog", "News", "Tech", "Forum", "SaaS", "Business"];
  const anchors = [
    "best seo tools",
    "seo audit checklist",
    "our brand",
    "click here",
    "learn more",
    "technical seo guide",
    "schema generator",
    "backlink analyzer",
  ];
  const types: (LinkType | "mixed")[] = [
    "dofollow",
    "nofollow",
    "image",
    "redirect",
    "ugc",
    "sponsored",
    "text",
    "mixed",
  ];
  return domains.map((d) => {
    const l = rnd(8, 140);
    const wr = rnd(35, 92);
    const t = types[rnd(0, types.length - 1)];
    const topAnch = pick(anchors, rnd(1, 3)).map((a) => ({
      text: a,
      count: rnd(3, Math.max(3, Math.round(l * 0.35))),
    }));
    const hasYou = chance(0.7);
    const you = hasYou
      ? {
          links: rnd(0, Math.round(l * 0.6)),
          wrScore: rnd(25, 88),
          anchorTop: pick(anchors, rnd(1, 2)).map((a) => ({
            text: a,
            count: rnd(1, 16),
          })),
        }
      : undefined;
    return {
      domain: d,
      url: `https://${d}`,
      links: l,
      type: t,
      wrScore: wr,
      anchorTop: topAnch,
      category: categories[rnd(0, categories.length - 1)],
      you,
    };
  });
}

function mockTypeDistribution(rows: TopDomainRow[]): TypeDistribution {
  const roll = () => TYPE_ORDER[rnd(0, TYPE_ORDER.length - 1)];
  const compCounts: Partial<Record<LinkType, number>> = {};
  const youCounts: Partial<Record<LinkType, number>> = {};
  let totalComp = 0;
  let totalYou = 0;

  rows.forEach((r) => {
    const c = r.links;
    const cType = r.type === "mixed" ? roll() : (r.type as LinkType);
    compCounts[cType] = (compCounts[cType] ?? 0) + c;
    totalComp += c;

    const y = r.you?.links ?? 0;
    if (y > 0) {
      const yType = chance(0.6) ? cType : roll();
      youCounts[yType] = (youCounts[yType] ?? 0) + y;
      totalYou += y;
    }
  });

  return {
    comp: compCounts,
    you: youCounts,
    totalComp,
    totalYou,
  };
}

function mockAnchorCloud(rows: TopDomainRow[]): AnchorCloud {
  const pool = new Map<string, number>();
  const poolYou = new Map<string, number>();
  rows.forEach((r) => {
    r.anchorTop.forEach((a) => {
      pool.set(a.text, (pool.get(a.text) ?? 0) + a.count);
    });
    r.you?.anchorTop?.forEach((a) => {
      poolYou.set(a.text, (poolYou.get(a.text) ?? 0) + a.count);
    });
  });

  const compObj: Record<string, number> = {};
  let totalComp = 0;
  for (const [k, v] of pool) {
    compObj[k] = v;
    totalComp += v;
  }

  const youObj: Record<string, number> = {};
  let totalYou = 0;
  for (const [k, v] of poolYou) {
    youObj[k] = v;
    totalYou += v;
  }

  const classMap: AnchorCloud["classMap"] = {};
  Object.keys({ ...compObj, ...youObj }).forEach((w) => {
    const lw = w.toLowerCase();
    classMap![w] =
      /brand/.test(lw)
        ? "branded"
        : /best|seo|guide|tools|audit|schema|backlink/.test(lw)
        ? /exact|^seo|^best|^link|^schema/.test(lw)
          ? "exact"
          : "partial"
        : /click here|learn more/.test(lw)
        ? "generic"
        : "generic";
  });

  return {
    comp: compObj,
    you: Object.keys(youObj).length ? youObj : undefined,
    totalComp,
    totalYou: totalYou || undefined,
    classMap,
  };
}

function mockWRBreakdown(): WRBreakdown {
  const rnd0 = () => rnd(30, 92);
  const rndTox = () => rnd(6, 48);
  return {
    comp: {
      authority: rnd0(),
      relevancy: rnd0(),
      diversity: rnd0(),
      freshness: rnd0(),
      toxicity: rndTox(),
    },
    you: {
      authority: rnd0(),
      relevancy: rnd0(),
      diversity: rnd0(),
      freshness: rnd0(),
      toxicity: rndTox(),
    },
    notes: "Scores are normalized 0–100. Toxicity is inverse—lower is better.",
  };
}

function makeLinkRows(domain: string) {
  const anchors = [
    "best seo tools",
    "seo audit checklist",
    "click here",
    "our brand",
    "learn more",
  ];
  const types: LinkType[] = [
    "dofollow",
    "nofollow",
    "image",
    "redirect",
    "ugc",
    "sponsored",
    "text",
  ];
  const rows: LinkRow[] = [];
  for (let i = 0; i < 24; i++) {
    const src = `https://${domain}/article-${i + 1}.html`;
    const tgt = `https://target.com/page-${1 + (i % 6)}`;
    rows.push({
      sourceUrl: src,
      targetUrl: tgt,
      anchor: anchors[rnd(0, anchors.length - 1)],
      type: types[rnd(0, types.length - 1)],
      firstSeen: randomDateWithin(420),
      lastSeen: randomDateWithin(30),
    });
  }
  return rows;
}
function randomDateWithin(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - rnd(0, days));
  return d.toISOString().slice(0, 10);
}
function truncate(s: string, n = 64) {
  if (s.length <= n) return s;
  const h = Math.floor((n - 1) / 2);
  return s.slice(0, h) + "…" + s.slice(-h);
}

/* ------------------------------- MAIN VIEW ------------------------------- */
export default function BacklinkSummarySectionMock({
  projectHost = "yoursite.com",
  competitorHost = "comp1.com",
}: {
  projectHost?: string;
  competitorHost?: string;
}) {
  const [compareOn, setCompareOn] = useState(true);
  const [rows] = useState<TopDomainRow[]>(() => mockDomains());
  const typeDist = useMemo(() => mockTypeDistribution(rows), [rows]);
  const cloud = useMemo(() => mockAnchorCloud(rows), [rows]);
  const wr = useMemo(() => mockWRBreakdown(), []);

  const [linksOpen, setLinksOpen] = useState(false);
  const [linksDomain, setLinksDomain] = useState<string | null>(null);
  const [linksEntity, setLinksEntity] = useState<"comp" | "you">("comp");

  function handleOpenLinks(domain: string, entity: "comp" | "you") {
    setLinksDomain(domain);
    setLinksEntity(entity);
    setLinksOpen(true);
  }

  function exportCSV() {
    const hdr = [
      "Domain",
      "Links",
      "Type",
      "WR Score",
      "Anchor Top",
      "Category",
      ...(compareOn ? ["You Links", "You WR", "You Top Anchor"] : []),
    ];
    const lines = rows.slice(0, 10).map((r) => {
      const row = [
        r.domain,
        r.links,
        r.type,
        r.wrScore,
        (r.anchorTop || [])
          .slice(0, 2)
          .map((a) => `${a.text}(${a.count})`)
          .join("; "),
        r.category ?? "",
      ];
      if (compareOn) {
        row.push(
          String(r.you?.links ?? ""),
          String(r.you?.wrScore ?? ""),
          r.you?.anchorTop?.[0]?.text ?? ""
        );
      }
      return row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [hdr.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "top-linking-domains.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div
      className="w-full bg-white mt-4"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      <div className="mx-auto w-full">
        {/* Header */}
        <div
          className="rounded-[6px] border p-4 shadow-sm"
          style={{ borderColor: TOKENS.border, background: TOKENS.surface }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-[6px] border"
                style={{ borderColor: TOKENS.border, background: TOKENS.pastelBlue }}
                aria-hidden
              >
                <Link2 size={16} color={TOKENS.brand} />
              </span>
              <h3 className="text-[18px] font-semibold" style={{ color: TOKENS.text }}>
                Backlink Summary
              </h3>

              {/* Favicons for competitor/project */}
              {competitorHost && (
                <Chip title="Competitor domain">
                  <img
                    src={faviconUrl(competitorHost, 16)}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm"
                  />
                  <span className="text-[11px]">Competitor: {competitorHost}</span>
                </Chip>
              )}
              {projectHost && (
                <Chip title="Project domain">
                  <img
                    src={faviconUrl(projectHost, 16)}
                    alt=""
                    className="h-3.5 w-3.5 rounded-sm"
                  />
                  <span className="text-[11px]">You: {projectHost}</span>
                </Chip>
              )}
            </div>

            <div className="flex items-center gap-2">
              <ButtonGhost
                onClick={() => alert("Open Domain Analysis (Backlinks)")}
                title="View detailed analysis"
              >
                <ExternalLink size={16} color={TOKENS.brand} />
                View detailed Analysis
              </ButtonGhost>
              <ExportMenu onCSV={exportCSV} />
              <ToggleSwitch
                checked={compareOn}
                onChange={setCompareOn}
                label={`Compare: ${compareOn ? "ON" : "OFF"}`}
              />
            </div>
          </div>
        </div>

        {/* Blocks */}
        <div className="mt-4 grid grid-cols-1 gap-4">
          <TopDomainsTable
            rows={rows}
            compareOn={compareOn}
            onOpenLinks={handleOpenLinks}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <AnchorCloudBlock cloud={cloud} compareOn={compareOn} />
            </div>
            <div className="lg:col-span-5">
              <BacklinkTypesBlock dist={typeDist} compareOn={compareOn} />
            </div>
          </div>
          <WRBreakdownBlock model={wr} compareOn={compareOn} />
        </div>
      </div>

      {/* Drawer */}
      <LinksDrawer
        open={linksOpen}
        onClose={() => setLinksOpen(false)}
        domain={linksDomain}
        entity={linksEntity}
      />
    </div>
  );
}

