"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/**
 * SECTION 3 — Domain Overview (drop‑in React + Tailwind TSX)
 * - Inter / Inter Fallback font
 * - Branded (#008CCD) inline SVG icons
 * - Sub‑section cards are collapsible by clicking the header (pointer cursor)
 * - Hover animations on cards
 * - Top GEO Traffic: stacked bar with SmartPopover (portal) + colored‑dot annotation
 * - No external chart libraries; no emoji
 */

/* ─────────────────────────────────────────────────────────────
   Fonts + Brand tokens
───────────────────────────────────────────────────────────── */
const BrandTokens = () => (
  <style>{`
    :root{
      --wr-brand:#008CCD;
      --wr-muted:#6B7280;
      --wr-border:#E5E7EB;
      --wr-subtle:#F5F7FA;
    }
    .wr-font{
      font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
    }
  `}</style>
);

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/* ─────────────────────────────────────────────────────────────
   Minimal branded inline SVG icons
───────────────────────────────────────────────────────────── */
const IconGlobe = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <circle cx="12" cy="12" r="9" strokeWidth="2" />
    <path strokeWidth="2" d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </svg>
);
const IconInfo = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M9 8h2v6H9V8zM10 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16z"
      clipRule="evenodd"
    />
  </svg>
);
const IconChevron = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
  </svg>
);
const IconTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M20.59 13.41L11 3H3v8l9.59 9.59a2 2 0 0 0 2.82 0l5.18-5.18a2 2 0 0 0 0-2.82z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
const IconShield = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M12 3l7 4v5a9 9 0 0 1-7 9 9 9 0 0 1-7-9V7l7-4z" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Primitive UI: Toggle, Chip, SmartPopover (portal)
───────────────────────────────────────────────────────────── */
const Chip = ({
  children,
  className,
  title,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-[var(--wr-border)] bg-white px-3 py-1 text-xs text-slate-800 hover:bg-[var(--wr-subtle)]",
      className
    )}
  >
    {children}
  </button>
);

const ToggleSwitch = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      "inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-2 py-1 text-xs",
      "hover:bg-[var(--wr-subtle)]"
    )}
    title={label}
  >
    <span
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-[var(--wr-brand)]" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </span>
    {label ? <span className="text-slate-700">{label}</span> : null}
  </button>
);

/** Smart popover that renders to document.body (won't be clipped) */
function SmartPopover({
  content,
  placement = "top",
  children,
}: {
  content: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null
  );
  const ref = React.useRef<HTMLSpanElement>(null);

  const compute = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = r.left + r.width / 2;
    const gap = 8;
    const top =
      placement === "top"
        ? r.top - gap
        : placement === "bottom"
        ? r.bottom + gap
        : r.top + r.height / 2;
    setPos({ top, left });
  }, [placement]);

  const show = () => {
    compute();
    setOpen(true);
  };
  const hide = () => setOpen(false);

  React.useEffect(() => {
    if (!open) return;
    const onScroll = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, compute]);

  return (
    <>
      {/* Make the anchor fill its container so bars get full width/height */}
      <span
        ref={ref}
        className="block h-full w-full"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {open && pos
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed z-[1000] -translate-x-1/2 rounded-md border border-[var(--wr-border)] bg-white px-2.5 py-1.5 text-[12px] text-slate-900 shadow-lg ring-1 ring-black/5"
              )}
              style={{
                top:
                  placement === "top"
                    ? pos.top
                    : placement === "bottom"
                    ? pos.top
                    : pos.top,
                left: pos.left,
                transform:
                  placement === "top"
                    ? "translate(-50%, -100%)"
                    : placement === "bottom"
                    ? "translate(-50%, 0)"
                    : "translate(-50%, -50%)",
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Collapse Card shell
───────────────────────────────────────────────────────────── */
function OVCard({
  icon,
  title,
  tooltip,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  tooltip?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = () => setOpen((v) => !v);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div className="rounded-xl border border-[var(--wr-border)] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Header — clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKey}
        title={tooltip}
        className="flex cursor-pointer items-start justify-between gap-3 p-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--wr-border)] bg-[var(--wr-subtle)] text-[var(--wr-brand)]">
            {icon}
          </span>
          <div className="min-w-0">
            <h4 className="truncate text-[15px] font-semibold text-slate-900">
              {title}
            </h4>
            {tooltip ? (
              <div className="mt-0.5 text-[12px] text-[var(--wr-muted)]">
                {tooltip}
              </div>
            ) : null}
          </div>
        </div>
        <IconChevron
          className={cn(
            "mt-1 h-4 w-4 text-slate-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {/* Body */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className={cn("min-h-0 px-4 pb-4", open ? "overflow-visible" : "overflow-hidden")}>
          {open && <div className="rounded-lg border border-[var(--wr-border)] bg-white p-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub‑section pieces
───────────────────────────────────────────────────────────── */

function GaugeBar({ value, bench }: { value: number; bench: number }) {
  const v = Math.max(0, Math.min(100, value));
  const b = Math.max(0, Math.min(100, bench));
  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--wr-subtle)]">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--wr-brand)]"
          style={{ width: `${v}%` }}
        />
        <div className="absolute top-0 h-full w-0.5 bg-slate-300" style={{ left: `${b}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--wr-muted)]">
        <span>
          Score <b className="text-slate-900">{v}</b>
        </span>
        <span>
          Avg <b className="text-slate-900">{b}</b>
        </span>
      </div>
    </div>
  );
}

/**
 * ✅ FIXED: Top GEO stacked bar now:
 *  - Uses explicit width percentages (not flex-basis) so slices always render
 *  - Container has overflow-hidden + rounded-[6px] for curved ends
 *  - Segment colors match legend palette exactly
 */
function StackedGeoBar({
  data,
  showOther = true,
}: {
  data: { code: string; name: string; pct: number }[];
  showOther?: boolean;
}) {
  // Palette must match legend order
  const palette = ["#008CCD", "#16a34a", "#7C3AED", "#FF9F43", "#64748b"];

  // Clamp and complete to 100%
  const shown = Math.max(
    0,
    Math.min(
      100,
      data.reduce((a, b) => a + (Number.isFinite(b.pct) ? b.pct : 0), 0)
    )
  );
  const extra = showOther ? Math.max(0, Math.round(100 - shown)) : 0;
  const slices = [
    ...data.map((s) => ({ ...s, pct: Math.max(0, Math.min(100, s.pct)) })),
    ...(extra > 0 ? [{ code: "OT", name: "Other", pct: extra }] : []),
  ];

  return (
    <div>
      {/* 6px rounded ends + clip so colored segments inherit the curve */}
      <div className="relative h-9 w-full overflow-hidden rounded-[6px] border border-[var(--wr-border)] bg-white">
        <div className="flex h-full w-full">
          {slices.map((s, i) => {
            const color = palette[i % palette.length];
            const isFirst = i === 0;
            const isLast = i === slices.length - 1;
            const widthPct = `${s.pct}%`;

            return (
              <div
                key={`${s.code}-${i}`}
                className={cn(
                  "relative h-full flex-none",
                  isFirst && "rounded-l-[6px]",
                  isLast && "rounded-r-[6px]"
                )}
                style={{ width: widthPct }}
                aria-label={`${s.name} ${s.pct}%`}
                title={`${s.name} · ${s.pct}%`}
              >
                <SmartPopover
                  content={
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium text-slate-900">
                        {s.code === "OT" ? "Other" : s.name}
                      </span>
                      <span className="text-slate-700">· {s.pct}%</span>
                    </div>
                  }
                >
                  <div
                    className="h-full w-full cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                    style={{ backgroundColor: color }}
                  />
                </SmartPopover>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-3 grid grid-cols-1 gap-1 text-[13px] md:grid-cols-2">
        {data.map((g, idx) => {
          const color = palette[idx % palette.length];
          return (
            <li key={g.code} className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-900">
                  {g.name} ({g.code})
                </span>
              </span>
              <span className="font-medium text-slate-900">{g.pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Types for the section props
───────────────────────────────────────────────────────────── */
export type DomainOverviewData = {
  domain: string;
  categories: string[];
  languages: { code: string; name: string }[];
  topGeo: { code: string; name: string; pct: number }[];
  linkPolicy: {
    dofollowPct: number;
    sponsored: "Not used" | "Used" | "Required";
    ugc: "Not used" | "Used" | "Required";
  };
  editorial: {
    contentLength: string;
    media: string;
    restrictions: string;
    review: string;
  };
  wrTotal: number;
  wrBreakdown: {
    key: string;
    title: string;
    description: string;
    score: number;
    categoryAvg: number;
  }[];
};

type Props = {
  data?: DomainOverviewData;
};

/* ─────────────────────────────────────────────────────────────
   Demo defaults (safe)
───────────────────────────────────────────────────────────── */
const demoData: DomainOverviewData = {
  domain: "techinsiderhub.com",
  categories: ["Technology", "SaaS", "SEO Tools"],
  languages: [
    { code: "US-EN", name: "EN" },
    { code: "ES-ES", name: "ES" },
  ],
  topGeo: [
    { code: "US", name: "United States", pct: 54 },
    { code: "GB", name: "United Kingdom", pct: 18 },
    { code: "CA", name: "Canada", pct: 9 },
  ],
  linkPolicy: {
    dofollowPct: 92,
    sponsored: "Not used",
    ugc: "Not used",
  },
  editorial: {
    contentLength: "800–1200 words",
    media: "1 image minimum",
    restrictions: "No adult/casino/CBD",
    review: "Manual review within 48h",
  },
  wrTotal: 84,
  wrBreakdown: [
    {
      key: "RDAS",
      title: "RDAS – Referring Domain Authority Score",
      description: "Average quality of referring domains",
      score: 88,
      categoryAvg: 81,
    },
    {
      key: "LPDS",
      title: "LPDS – Link Profile Diversity Score",
      description: "Variety of backlink types/sources",
      score: 80,
      categoryAvg: 76,
    },
    {
      key: "AQS",
      title: "AQS – Anchor Text Quality Score",
      description: "Natural vs. spammy anchors",
      score: 82,
      categoryAvg: 78,
    },
    {
      key: "LVS",
      title: "LVS – Link Velocity Score",
      description: "Backlink growth rate",
      score: 78,
      categoryAvg: 74,
    },
    {
      key: "ITDS",
      title: "ITDS – IP & TLD Diversity Score",
      description: "Unique IP/TLD distribution",
      score: 79,
      categoryAvg: 75,
    },
  ],
};

/* ─────────────────────────────────────────────────────────────
   MAIN — Domain Overview Section
───────────────────────────────────────────────────────────── */
export default function DomainOverviewSection({ data = demoData }: Props) {
  const [showOther, setShowOther] = React.useState(true);

  return (
    <section className="wr-font px-5 py-4 mt-4">
      <BrandTokens />

      {/* Section title */}
      <div className="mb-3 flex items-center gap-2">
        <IconGlobe className="h-5 w-5 text-[var(--wr-brand)]" />
        <h3 className="text-[18px] font-semibold text-slate-900">Domain overview</h3>
      </div>

      <div className="space-y-3">
        {/* Category & Language (no changes) */}
        <OVCard
          icon={<IconTag className="h-5 w-5 text-[var(--wr-brand)]" />}
          title="Category & Language"
          tooltip="Primary publishing categories and languages"
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1 text-[13px] font-medium text-slate-900">Category</div>
              <div className="flex flex-wrap gap-2">
                {data.categories.map((c, i) => (
                  <Chip key={c} title={`Filter to ${c}`}>
                    {c}
                    {i < data.categories.length - 1 ? " →" : ""}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[13px] font-medium text-slate-900">Language</div>
              <div className="flex flex-wrap items-center gap-2">
                {data.languages.map((l) => (
                  <Chip key={l.code} title={`Filter to ${l.name}`}>
                    {l.name}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </OVCard>

        {/* Top GEO Traffic — fixed stacked bar */}
        <OVCard
          icon={<IconGlobe className="h-5 w-5 text-[var(--wr-brand)]" />}
          title="Top GEO Traffic"
          tooltip="Visit distribution by country (100% stacked)"
        >
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="inline-flex items-center gap-1 text-[12px] text-[var(--wr-muted)]">
              <IconInfo className="h-4 w-4 text-[var(--wr-brand)]" />
              Hover the bar to see values.
            </div>
            <ToggleSwitch
              checked={showOther}
              onChange={setShowOther}
              label="Show 'Other'"
            />
          </div>
          <StackedGeoBar data={data.topGeo} showOther={showOther} />
        </OVCard>

        {/* Link Attribute Policy (no changes) */}
        <OVCard
          icon={<IconShield className="h-5 w-5 text-[var(--wr-brand)]" />}
          title="Link Attribute Policy"
          tooltip="Derived from listing & recent backlink scans"
        >
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Chip>
              <IconShield className="h-4 w-4 text-[var(--wr-brand)]" />
              {data.linkPolicy.dofollowPct}% dofollow
            </Chip>
            <Chip>
              <IconTag className="h-4 w-4 text-[var(--wr-brand)]" />
              Sponsored: {data.linkPolicy.sponsored}
            </Chip>
            <Chip>
              <IconTag className="h-4 w-4 text-[var(--wr-brand)]" />
              UGC: {data.linkPolicy.ugc}
            </Chip>
          </div>
        </OVCard>

        {/* Editorial Guidelines (no changes) */}
        <OVCard
          icon={<IconInfo className="h-5 w-5 text-[var(--wr-brand)]" />}
          title="Editorial Guidelines"
          tooltip="Publisher’s content requirements"
        >
          <ul className="grid grid-cols-1 gap-2 text-[13px] text-slate-900 md:grid-cols-2">
            <li>
              <b>Content Length:</b> {data.editorial.contentLength}
            </li>
            <li>
              <b>Media:</b> {data.editorial.media}
            </li>
            <li>
              <b>Restrictions:</b> {data.editorial.restrictions}
            </li>
            <li>
              <b>Review:</b> {data.editorial.review}
            </li>
          </ul>
        </OVCard>

        {/* WR Score Breakdown (no changes) */}
        <OVCard
          icon={<IconInfo className="h-5 w-5 text-[var(--wr-brand)]" />}
          title={`WR Score Breakdown (${data.wrTotal})`}
          tooltip="Components of the Wranker reputation score"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left">
              <thead className="sticky top-0 bg-[var(--wr-subtle)] text-[12px] text-[var(--wr-muted)]">
                <tr>
                  <th className="px-2 py-1.5">Component</th>
                  <th className="px-2 py-1.5">Description</th>
                  <th className="px-2 py-1.5 w-[260px]">Your vs Category</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {data.wrBreakdown.map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="px-2 py-2 font-medium text-slate-900">{row.key}</td>
                    <td className="px-2 py-2 text-[var(--wr-muted)]">
                      {row.title.replace(`${row.key} – `, "")}
                    </td>
                    <td className="px-2 py-2">
                      <GaugeBar value={row.score} bench={row.categoryAvg} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OVCard>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   (Optional) tiny demo host
   — remove or ignore if you embed inside an existing drawer
───────────────────────────────────────────────────────────── */
// export function DemoDomainOverview() {
//   return (
//     <div className="min-h-screen bg-[var(--wr-subtle)] p-6">
//       <div className="mx-auto max-w-5xl rounded-xl border border-[var(--wr-border)] bg-white shadow-sm">
//         <DomainOverviewSection />
//         <div className="px-5 pb-8 text-[12px] text-[var(--wr-muted)]">
//           <p>Scroll to verify popovers float above everything.</p>
//           <div className="h-[600px]" />
//         </div>
//       </div>
//     </div>
//   );
// }
