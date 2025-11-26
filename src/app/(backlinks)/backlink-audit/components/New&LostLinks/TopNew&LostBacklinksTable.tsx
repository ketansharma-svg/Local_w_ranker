"use client";

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Link2,
  Info as InfoIcon,
  Download,
  Eye,
  Send,
  UserCheck,
  RotateCcw,
  ShieldOff,
  Link2Off,
  Megaphone,
  Users,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────────
   Design tokens (aligned with recent designs) + Inter, Inter Fallback
────────────────────────────────────────────────────────────────────────────── */
const GlobalTokens = () => (
  <style>{`
  :root{
    --wr-brand:#008CCD;
    --wr-brand-hover:#067AAF;
    --wr-brand-pastel:#D9EEF8;
    --wr-text:#111827;
    --wr-muted:#6B7280;
    --wr-surface:#FFFFFF;
    --wr-subtle:#F5F7FA;
    --wr-border:#E5E7EB;
    --wr-borderLight:#EFF0F6;
    --wr-success:#28C76F;
    --wr-warning:#FF9F43;
    --wr-danger:#EA5455;
    --wr-radius:12px;
  }
  .wr-font{
    font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
  }
`}</style>
);

/* ----------------------------- Utilities ----------------------------- */

type LinkStatus = "New" | "Lost";
type LinkAttribute = "dofollow" | "nofollow" | "sponsored" | "ugc";
type AnchorType = "Branded" | "Exact Match" | "Partial Match" | "Generic" | "Naked URL";
type AnchorRisk = "Low" | "Medium" | "High";

type Row = {
  id: string;
  status: LinkStatus;
  domain: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  anchorType: AnchorType;
  anchorRisk: AnchorRisk;
  linkAttributes: LinkAttribute[];
  wrScore: number;         // 0–100
  wrImpact: number;        // Lost only (negative), 0 for New
  acquiredDate?: string;   // YYYY-MM-DD (New)
  lostDate?: string;       // YYYY-MM-DD (Lost)
  visits: number;          // GA4 sessions
};

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const formatVisits = (n: number | undefined, gaConnected: boolean) =>
  !gaConnected ? "— Connect GA4" : typeof n !== "number" ? "—" : `${n.toLocaleString()} visits`;

/* -------------------------- Demo Sample Data ------------------------- */

const demoAnchorTypes: AnchorType[] = ["Branded", "Exact Match", "Partial Match", "Generic", "Naked URL"];
const demoRisks: AnchorRisk[] = ["Low", "Medium", "High"];
const demoAttrs: LinkAttribute[][] = [
  ["dofollow"],
  ["nofollow"],
  ["sponsored"],
  ["ugc"],
  ["dofollow", "nofollow"],
];

const SAMPLE_MERGED: Row[] = Array.from({ length: 60 }).map((_, i) => {
  const isNew = i % 2 === 0;
  const wr = [18, 32, 36, 45, 51, 63, 65, 72, 81][i % 9];
  const anchorType = demoAnchorTypes[i % demoAnchorTypes.length];
  const anchorRisk = demoRisks[i % demoRisks.length];
  const linkAttributes = demoAttrs[i % demoAttrs.length];
  const baseDate = new Date(2025, 6, 1); // July 2025
  const date = new Date(baseDate.getTime() + (i % 58) * 86400000);
  const iso = date.toISOString().slice(0, 10);

  return {
    id: `row-${i + 1}`,
    status: isNew ? "New" : "Lost",
    domain: `example${(i % 97) + 3}.com`,
    wrScore: wr,
    wrImpact: isNew ? 0 : [-0.1, -0.2, -0.35, -0.4, -0.15][i % 5],
    sourceUrl: `https://example${(i % 97) + 3}.com/article/${(i % 140) + 10}`,
    targetUrl: `/blog/post-${(i % 28) + 1}`,
    anchorText: ["WRanker", "click here", "seo tools comparison", "best seo tool"][i % 4],
    anchorType,
    anchorRisk,
    linkAttributes,
    acquiredDate: isNew ? iso : undefined,
    lostDate: isNew ? undefined : iso,
    visits: [0, 0, 18, 126, 399, 597, 136][i % 7],
  };
});

/* --------------------------- Portal helper --------------------------- */

function usePortalDropdown() {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const openAtBtn = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 8, left: r.left, width: r.width });
    setOpen(true);
  };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const menu = document.getElementById("portal-dropdown");
      const target = e.target as Node;
      if (menu && !menu.contains(target) && btnRef.current && !btnRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return { open, setOpen, rect, btnRef, openAtBtn };
}

/* ------------------------------ Chips ------------------------------ */

function Chip({
  label,
  active,
  onClick,
  disabled,
  title,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title || label}
      className={cn(
        "h-8 rounded-full border px-3 text-sm transition cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        active
          ? "bg-[var(--wr-brand-pastel)] text-[var(--wr-brand)] border-[#008CCD33]"
          : "bg-white border-[var(--wr-border)] text-[var(--wr-text)] hover:bg-[var(--wr-subtle)]"
      )}
    >
      {label}
    </button>
  );
}

function MultiSelectChip({
  label,
  options,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const { open, rect, btnRef, openAtBtn, setOpen } = usePortalDropdown();

  return (
    <>
      <Chip
        label={`${label}${selected.length ? `: ${selected.join(", ")}` : ""}`}
        active={selected.length > 0}
        onClick={!disabled ? openAtBtn : undefined}
        disabled={disabled}
      />
      <button ref={btnRef} className="hidden" aria-hidden />
      {open &&
        createPortal(
          <div
            id="portal-dropdown"
            style={{ top: rect?.top, left: rect?.left }}
            className="fixed z-[1000] w-72 rounded-md border border-[var(--wr-border)] bg-white shadow-xl"
          >
            <div className="max-h-80 overflow-auto p-2">
              {options.map((opt) => {
                const checked = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-[var(--wr-text)] hover:bg-[var(--wr-subtle)]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--wr-border)]"
                      checked={checked}
                      onChange={() =>
                        checked ? onChange(selected.filter((x) => x !== opt)) : onChange([...selected, opt])
                      }
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--wr-borderLight)] p-2">
              <button
                className="rounded-md border border-[var(--wr-border)] px-3 py-1 text-sm hover:bg-[var(--wr-subtle)] cursor-pointer"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function RangeChip({
  label,
  range,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
}: {
  label: string;
  range: [number, number];
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: [number, number]) => void;
  disabled?: boolean;
}) {
  const { open, rect, btnRef, openAtBtn, setOpen } = usePortalDropdown();
  const text = `${range[0]}–${range[1]}`;
  return (
    <>
      <Chip
        label={`${label}: ${text}`}
        active={!(range[0] === min && range[1] === max)}
        onClick={!disabled ? openAtBtn : undefined}
        disabled={disabled}
      />
      <button ref={btnRef} className="hidden" aria-hidden />
      {open &&
        createPortal(
          <div
            id="portal-dropdown"
            style={{ top: rect?.top, left: rect?.left }}
            className="fixed z-[1000] w-80 rounded-md border border-[var(--wr-border)] bg-white p-3 shadow-xl"
          >
            <div className="mb-2 text-xs font-semibold text-[var(--wr-muted)]">{label}</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="h-8 w-20 rounded border border-[var(--wr-border)] px-2 text-sm"
                min={min}
                max={max}
                step={step}
                value={range[0]}
                onChange={(e) => onChange([Number(e.target.value), range[1]])}
              />
              <span className="text-[var(--wr-muted)]">to</span>
              <input
                type="number"
                className="h-8 w-20 rounded border border-[var(--wr-border)] px-2 text-sm"
                min={min}
                max={max}
                step={step}
                value={range[1]}
                onChange={(e) => onChange([range[0], Number(e.target.value)])}
              />
              <button
                className="ml-auto rounded-md border border-[var(--wr-border)] px-3 py-1 text-sm hover:bg-[var(--wr-subtle)] cursor-pointer"
                onClick={() => onChange([min, max])}
              >
                Reset
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-md border border-[var(--wr-border)] px-3 py-1 text-sm hover:bg-[var(--wr-subtle)] cursor-pointer"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function ToggleChip({
  label,
  active,
  onChange,
  disabled,
}: {
  label: string;
  active?: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Chip
      label={label}
      active={!!active}
      onClick={!disabled ? () => onChange(!active) : undefined}
      disabled={disabled}
      title={label}
    />
  );
}

function SingleSelectChip({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { open, rect, btnRef, openAtBtn, setOpen } = usePortalDropdown();
  return (
    <>
      <Chip
        label={`${label}: ${value}`}
        active={value !== options[0]}
        onClick={!disabled ? openAtBtn : undefined}
        disabled={disabled}
      />
      <button ref={btnRef} className="hidden" aria-hidden />
      {open &&
        createPortal(
          <div
            id="portal-dropdown"
            style={{ top: rect?.top, left: rect?.left }}
            className="fixed z-[1000] w-64 rounded-md border border-[var(--wr-border)] bg-white p-2 shadow-xl"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-[var(--wr-subtle)] cursor-pointer",
                  opt === value ? "bg-[var(--wr-brand-pastel)] text-[var(--wr-brand)]" : "text-[var(--wr-text)]"
                )}
              >
                {opt} {opt === value && <span className="text-xs text-[var(--wr-brand)]">• selected</span>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

/* ------------------------- Columns menu (portal) ------------------------- */

function ColumnsMenu({
  all,
  visible,
  onToggle,
  rect,
  onClose,
}: {
  all: { key: string; label: string }[];
  visible: string[];
  onToggle: (k: string) => void;
  rect: { top: number; left: number; width: number } | null;
  onClose: () => void;
}) {
const [pos, setPos] = useState<{ top: number; left: number } | null>(rect);
const ref = useRef<HTMLDivElement | null>(null); // ✅ moved above

useLayoutEffect(() => {
  if (!rect || !ref.current) return;

  const el = ref.current;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = el.offsetWidth;
  const menuH = el.offsetHeight;

  const safeLeft = Math.max(8, Math.min(rect.left, vw - menuW - 8));
  const safeTop = Math.max(8, Math.min(rect.top, vh - menuH - 8));

  setPos({ top: safeTop, left: safeLeft });
}, [rect?.left, rect?.top]); // ✅ safe optional chaining

if (!rect) return null; // ✅ return after hooks


  return createPortal(
    <div
      id="portal-dropdown"
      ref={ref}
      style={{ top: pos?.top, left: pos?.left, maxHeight: "calc(100vh - 16px)" }}
      className="fixed z-[1000] w-64 overflow-auto rounded-md border border-[var(--wr-border)] bg-white p-2 shadow-xl"
    >
      <div className="px-2 pb-2 text-xs font-semibold text-[var(--wr-muted)]">Show/Hide Columns</div>
      <div className="max-h-72 space-y-1 overflow-auto pr-1">
        {all.map((col) => (
          <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--wr-subtle)]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--wr-border)]"
              checked={visible.includes(col.key)}
              onChange={() => onToggle(col.key)}
            />
            <span className="text-sm text-[var(--wr-text)]">{col.label}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2 border-t border-[var(--wr-borderLight)] pt-2">
        <button
          className="rounded-md border border-[var(--wr-border)] px-3 py-1 text-sm hover:bg-[var(--wr-subtle)] cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------ Small UI ------------------------------ */

// Brand circular gauge for WR score (no background behind value)
function WrGauge({ value }: { value: number }) {
  const size = 18;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, value)) / 100 * C;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none"/>
      <circle
        cx={size/2}
        cy={size/2}
        r={r}
        stroke="var(--wr-brand)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${C - dash}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

// Icon-only action with title on hover
function IconAction({
  label,
  children,
  onClick,
  href,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const base =
    "inline-grid h-8 w-8 place-items-center rounded-md border border-[var(--wr-border)] bg-white hover:bg-[var(--wr-subtle)] cursor-pointer";
  if (href) {
    return (
      <a className={base} href={href} target="_blank" rel="noreferrer" title={label} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <button className={base} onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  );
}

// Info popover next to title
function InfoPopover({ btnRef, text }: { btnRef: any; text: string }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);

  const toggle = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 8, left: r.left });
    setOpen((o) => !o);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const pop = document.getElementById("section-info-pop");
      if (pop && !pop.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--wr-border)] bg-white hover:bg-[var(--wr-subtle)] cursor-pointer"
        aria-label="More info"
        title="More info"
      >
        <InfoIcon className="h-4 w-4" color="#008CCD" />
      </button>
      {open &&
        createPortal(
          <div
            id="section-info-pop"
            style={{ top: rect?.top, left: rect?.left }}
            className="fixed z-[1000] max-w-xs rounded-md border border-[var(--wr-border)] bg-white p-3 text-sm text-[var(--wr-text)] shadow-xl"
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}

/* ---------------------------- Main Component ---------------------------- */

const allColumns = [
  { key: "status", label: "Status" },
  { key: "domain", label: "Source Domain" },
  { key: "sourceUrl", label: "Source Page URL" },
  { key: "targetUrl", label: "Target Page" },
  { key: "anchorText", label: "Anchor Text" },
  { key: "anchorType", label: "Anchor Type" },
  { key: "anchorRisk", label: "Anchor Risk" },
  { key: "linkAttributes", label: "Link Attribute" },
  { key: "date", label: "Date (Acquired/Lost)" },
  { key: "wrScore", label: "WR Score (Domain)" },
  { key: "wrImpact", label: "WR Score Impact (Lost)" },
  { key: "visits", label: "Referral Traffic" },
  { key: "actions", label: "Actions" },
] as const;

type ColumnKey = typeof allColumns[number]["key"];

export default function NewLostBacklinksSection() {
  /* ------------------------------ State ------------------------------ */

  // GA4 integration (demo)
  const [gaConnected, setGaConnected] = useState<boolean>(false);

  // Filters (chips)
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"Lost" | "New" | "Both">("Both");
  const [anchorTypes, setAnchorTypes] = useState<AnchorType[]>([]);
  const [linkAttrs, setLinkAttrs] = useState<LinkAttribute[]>([]);
  const [wrRange, setWrRange] = useState<[number, number]>([0, 100]);
  const [gaOnlyTraffic, setGaOnlyTraffic] = useState(false);
  const [gaTrafficMinMax, setGaTrafficMinMax] = useState<[number, number]>([0, 1000]);
  const [anchorRiskLevel, setAnchorRiskLevel] = useState<AnchorRisk[]>([]);
  const [minWrImpact, setMinWrImpact] = useState<number>(0);
  const [toxicOnly, setToxicOnly] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 days");

  // Columns visibility & menu
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(allColumns.map((c) => c.key as ColumnKey));
  const toggleCol = (k: ColumnKey) =>
    setVisibleCols((v) => (v.includes(k) ? (v as string[]).filter((x) => x !== k) as ColumnKey[] : ([...v, k] as ColumnKey[])));
  const { open: colsOpen, rect: colsRect, btnRef: colsBtnRef, openAtBtn: openCols, setOpen: setColsOpen } = usePortalDropdown();

  // Selection & pagination
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageSize = 10;
  const [page, setPage] = useState<number>(1);

  // Partners tagging (for New rows)
  const [partners, setPartners] = useState<Set<string>>(new Set());

  // Sorting
  const [sortKey, setSortKey] = useState<"wrScore" | "date" | "visits" | null>("wrScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Section info popover ref
  const infoBtnRef = useRef<HTMLButtonElement | null>(null);

  /* ------------------------------ Derived ------------------------------ */

  const filtered = useMemo(() => {
    let rows = SAMPLE_MERGED.slice();

    // Status filter
    rows = rows.filter((r) => (status === "Both" ? true : r.status === status));

    // Search (domain / urls / anchor)
    const needle = q.trim().toLowerCase();
    if (needle) {
      rows = rows.filter(
        (r) =>
          r.domain.toLowerCase().includes(needle) ||
          r.sourceUrl.toLowerCase().includes(needle) ||
          r.targetUrl.toLowerCase().includes(needle) ||
          r.anchorText.toLowerCase().includes(needle)
      );
    }

    // Anchor Type
    if (anchorTypes.length) rows = rows.filter((r) => anchorTypes.includes(r.anchorType));

    // Link Attributes
    if (linkAttrs.length) rows = rows.filter((r) => r.linkAttributes.some((a) => linkAttrs.includes(a)));

    // WR Score range
    rows = rows.filter((r) => r.wrScore >= wrRange[0] && r.wrScore <= wrRange[1]);

    // Anchor Risk
    if (anchorRiskLevel.length) rows = rows.filter((r) => anchorRiskLevel.includes(r.anchorRisk));

    // GA traffic chips (only active if GA4 is connected)
    if (gaConnected) {
      if (gaOnlyTraffic) rows = rows.filter((r) => r.visits > 0);
      rows = rows.filter((r) => r.visits >= gaTrafficMinMax[0] && r.visits <= gaTrafficMinMax[1]);
    }

    // Min WR Impact applies to Lost links only (and to Lost rows when status = Both)
    rows = rows.filter((r) => (r.status === "Lost" ? Math.abs(r.wrImpact) >= (Number(minWrImpact) || 0) : true));

    // Toxic markers (demo: WR < 30 means toxic)
    if (toxicOnly) rows = rows.filter((r) => r.wrScore < 30);

    // Sort
    if (sortKey) {
      rows.sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortKey === "wrScore") return (a.wrScore - b.wrScore) * dir;
        if (sortKey === "visits") return ((a.visits || 0) - (b.visits || 0)) * dir;
        if (sortKey === "date") {
          const da = new Date(a.status === "New" ? a.acquiredDate || "" : a.lostDate || "").getTime();
          const db = new Date(b.status === "New" ? b.acquiredDate || "" : b.lostDate || "").getTime();
          return (da - db) * dir;
        }
        return 0;
      });
    }

    return rows;
  }, [
    q,
    status,
    anchorTypes,
    linkAttrs,
    wrRange,
    anchorRiskLevel,
    gaOnlyTraffic,
    gaTrafficMinMax,
    gaConnected,
    minWrImpact,
    toxicOnly,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [filtered.length]);

  const allOnPageSelected = paged.every((r) => selected.has(r.id)) && paged.length > 0;
  const toggleSelectAllOnPage = () => {
    const next = new Set(selected);
    if (allOnPageSelected) {
      paged.forEach((r) => next.delete(r.id));
    } else {
      paged.forEach((r) => next.add(r.id));
    }
    setSelected(next);
  };

  const toggleRow = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const eventDate = (r: Row) => (r.status === "New" ? r.acquiredDate : r.lostDate) || "—";

  const setSort = (k: "wrScore" | "date" | "visits") => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  /* ------------------------------ Render ------------------------------ */

  // (2) Column header background now matches the filters bar color
  const headerTint = "var(--wr-subtle)";

  const sourceFavicon = (domain: string) =>
    `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;

  const renderAttrChip = (a: LinkAttribute) => {
    const icon =
      a === "dofollow" ? (
        <Link2 className="h-3.5 w-3.5" color="#008CCD" />
      ) : a === "nofollow" ? (
        <Link2Off className="h-3.5 w-3.5" color="#008CCD" />
      ) : a === "ugc" ? (
        <Users className="h-3.5 w-3.5" color="#008CCD" />
      ) : (
        <Megaphone className="h-3.5 w-3.5" color="#008CCD" />
      );
    return (
      <span
        key={a}
        className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs"
        style={{ borderColor: "var(--wr-border)", background: "#fff", color: "var(--wr-text)" }}
        title={a}
      >
        {icon}
        {a}
      </span>
    );
  };

  return (
    <div className="wr-font w-full">
      <GlobalTokens />

      {/* Section Header */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Title + info */}
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" color="#008CCD" aria-hidden />
          <h2 className="text-lg font-semibold text-[var(--wr-text)]">Top New &amp; Lost Backlinks</h2>
          <InfoPopover
            btnRef={infoBtnRef}
            text="Unified view of backlinks gained or lost in the selected date range. Use the chips to filter; WR Score is domain‑level authority. Actions open outreach/recovery flows."
          />
          <button ref={infoBtnRef} className="hidden" aria-hidden />
        </div>

        {/* Right: toggles, Columns, Export (1. Export moved to the right side) */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--wr-border)] bg-white p-1">
            {(["New", "Lost", "Both"] as const).map((opt) => (
              <button
                key={opt}
                className={cn(
                  "h-8 px-3 text-sm rounded cursor-pointer",
                  status === opt
                    ? "text-white"
                    : "text-[var(--wr-text)] hover:bg-[var(--wr-subtle)]"
                )}
                style={status === opt ? { backgroundColor: "var(--wr-brand)" } : {}}
                onClick={() => setStatus(opt)}
                title={`Show ${opt.toLowerCase()} links`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            type="button"
            ref={colsBtnRef}
            onClick={openCols}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 text-sm text-[var(--wr-text)] hover:bg-[var(--wr-subtle)] cursor-pointer"
            title="Columns"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#008CCD">
              <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Columns
          </button>

          {/* Export shifted to the right cluster */}
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--wr-border)] bg-white px-3 text-sm text-[var(--wr-text)] hover:bg-[var(--wr-subtle)] cursor-pointer"
            onClick={() => alert("Export current view (demo)")}
            title="Export"
          >
            <Download className="h-4 w-4" color="#008CCD" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-2 rounded-md border border-[var(--wr-border)] bg-[var(--wr-subtle)] p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search domain, URL, or anchor…"
              className="w-full rounded-md border border-[var(--wr-border)] pl-8 pr-3 leading-8 text-sm placeholder:text-[var(--wr-muted)] focus:border-[var(--wr-brand)] focus:outline-none"
            />
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--wr-muted)]" viewBox="0 0 24 24" stroke="currentColor" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
              <path d="m20 20-3-3" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          {/* GA4 connect state */}
          <button
            type="button"
            className={cn(
              "h-8 rounded-md border px-3 text-sm cursor-pointer",
              gaConnected
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-[var(--wr-brand)] bg-white text-[var(--wr-brand)] hover:bg-[var(--wr-brand-pastel)]"
            )}
            onClick={() => setGaConnected((v) => !v)}
            title={gaConnected ? "Disconnect GA4 (demo)" : "Connect GA4 (demo)"}
          >
            {gaConnected ? "GA4 Connected" : "Connect GA4"}
          </button>
        </div>

        {/* Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
          <SingleSelectChip
            label="Link Status"
            value={status}
            options={["Both", "New", "Lost"]}
            onChange={(v) => setStatus(v as "Both" | "New" | "Lost")}
          />

          {/* Date Range — dropdown chip */}
          <SingleSelectChip
            label="Date Range"
            value={dateRange}
            options={["Last 7 days", "Last 14 days", "Last 30 days", "Last 90 days", "Custom"]}
            onChange={setDateRange}
          />

          <RangeChip
            label="WR Score"
            range={wrRange}
            onChange={(v) => setWrRange([clamp(v[0], 0, 100), clamp(v[1], 0, 100)])}
            min={0}
            max={100}
          />

          <MultiSelectChip
            label="Anchor Type"
            options={["Branded", "Exact Match", "Partial Match", "Generic", "Naked URL"]}
            selected={anchorTypes}
            onChange={(v) => setAnchorTypes(v as AnchorType[])}
          />

          <MultiSelectChip
            label="Attribute"
            options={["dofollow", "nofollow", "sponsored", "ugc"]}
            selected={linkAttrs}
            onChange={(v) => setLinkAttrs(v as LinkAttribute[])}
          />

          <MultiSelectChip
            label="Anchor Risk"
            options={["Low", "Medium", "High"]}
            selected={anchorRiskLevel}
            onChange={(v) => setAnchorRiskLevel(v as AnchorRisk[])}
          />

          {/* GA4-only controls */}
          <ToggleChip label="Only links with traffic" active={gaOnlyTraffic} onChange={setGaOnlyTraffic} disabled={!gaConnected} />
          <RangeChip
            label="GA4 Ref. Traffic"
            range={gaTrafficMinMax}
            onChange={setGaTrafficMinMax}
            min={0}
            max={1000}
            disabled={!gaConnected}
          />

          {/* Min WR Impact (Lost only) */}
          {(status === "Lost" || status === "Both") && (
            <div className="flex items-center gap-2">
              <Chip label={`Min WR Impact: ${minWrImpact}`} active={Number(minWrImpact) > 0} />
              <input
                type="number"
                className="h-8 w-24 rounded-md border border-[var(--wr-border)] px-2 text-sm"
                value={minWrImpact}
                onChange={(e) => setMinWrImpact(Number(e.target.value))}
              />
            </div>
          )}

          {/* Toxic proxy */}
          <ToggleChip label="Show only flagged toxic" active={toxicOnly} onChange={setToxicOnly} />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-2 flex items-center justify-between rounded-md border border-[var(--wr-border)] bg-[var(--wr-brand-pastel)] px-3 py-2">
          <div className="text-sm text-[var(--wr-text)]">
            <strong>{selected.size}</strong> selected
          </div>
          <div className="flex items-center gap-2">
            <button
              className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-3 text-sm text-[var(--wr-text)] hover:bg-[var(--wr-subtle)] cursor-pointer"
              onClick={() => alert("Export selected (demo)")}
            >
              Export Selected
            </button>
            <button
              className="h-8 rounded-md bg-rose-600 px-3 text-sm text-white hover:bg-rose-700 cursor-pointer"
              onClick={() => alert("Disavow selected (demo)")}
            >
              Disavow
            </button>
            <button
              className="h-8 rounded-md border border-[var(--wr-border)] bg-white px-3 text-sm text-[var(--wr-text)] hover:bg-[var(--wr-subtle)] cursor-pointer"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="relative overflow-auto rounded-md border border-[var(--wr-border)]">
        <table className="min-w-[1420px] w-full table-fixed border-collapse">
          {/* (2) Header background uses the filters bar color */}
          <thead className="sticky top-0 z-20" style={{ backgroundColor: headerTint }}>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--wr-muted)]">
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--wr-border)] cursor-pointer"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                />
              </th>

              {visibleCols.includes("status") && <th className="w-24 px-3 py-3">Status</th>}

              {visibleCols.includes("domain") && (
                <th className="sticky left-0 z-10 w-56 px-3 py-3" style={{ backgroundColor: headerTint }}>
                  Source Domain
                </th>
              )}

              {visibleCols.includes("sourceUrl") && <th className="w-[280px] px-3 py-3">Source Page URL</th>}
              {visibleCols.includes("targetUrl") && <th className="w-[220px] px-3 py-3">Target Page</th>}
              {visibleCols.includes("anchorText") && <th className="w-52 px-3 py-3">Anchor Text</th>}
              {visibleCols.includes("anchorType") && <th className="w-36 px-3 py-3">Anchor Type</th>}
              {visibleCols.includes("anchorRisk") && <th className="w-32 px-3 py-3">Anchor Risk</th>}
              {visibleCols.includes("linkAttributes") && <th className="w-44 px-3 py-3">Link Attribute</th>}

              {visibleCols.includes("date") && (
                <th className="w-40 px-3 py-3">
                  <button className="flex items-center gap-1 cursor-pointer" onClick={() => setSort("date")} title="Sort by date">
                    Date (Acq./Lost)
                    <SortIcon active={sortKey === "date"} dir={sortDir} />
                  </button>
                </th>
              )}

              {visibleCols.includes("wrScore") && (
                <th className="w-44 px-3 py-3">
                  <button
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => setSort("wrScore")}
                    title="Sort by WR Score"
                  >
                    WR Score (Domain)
                    <SortIcon active={sortKey === "wrScore"} dir={sortDir} />
                  </button>
                </th>
              )}

              {visibleCols.includes("wrImpact") && <th className="w-40 px-3 py-3">WR Score Impact (Lost)</th>}

              {visibleCols.includes("visits") && (
                <th className="w-44 px-3 py-3">
                  <button
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => setSort("visits")}
                    title="Sort by Referral Traffic"
                  >
                    Referral Traffic
                    <SortIcon active={sortKey === "visits"} dir={sortDir} />
                  </button>
                </th>
              )}

              {visibleCols.includes("actions") && <th className="w-44 px-3 py-3">Actions</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--wr-borderLight)] text-sm">
            {paged.map((r) => {
              const checked = selected.has(r.id);
              const isPartner = partners.has(r.domain);
              return (
                <tr key={r.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--wr-border)] cursor-pointer"
                      checked={checked}
                      onChange={() => toggleRow(r.id)}
                    />
                  </td>

                  {/* Status */}
                  {visibleCols.includes("status") && (
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ring-1",
                          r.status === "New"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-rose-200"
                        )}
                        title={r.status}
                      >
                        {r.status}
                      </span>
                    </td>
                  )}

                  {/* Sticky domain with favicon */}
                  {visibleCols.includes("domain") && (
                    <td className="sticky left-0 z-0 bg-white px-3 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={sourceFavicon(r.domain)}
                          alt=""
                          className="h-5 w-5 rounded"
                          loading="lazy"
                        />
                        <a
                          href={`https://${r.domain}`}
                          className="truncate text-[var(--wr-brand)] hover:underline cursor-pointer"
                          target="_blank"
                          rel="noreferrer"
                          title={r.domain}
                        >
                          {r.domain}
                        </a>
                        {isPartner && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-indigo-50 px-2 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
                            Partner
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {visibleCols.includes("sourceUrl") && (
                    <td className="px-3 py-3">
                      <a
                        className="truncate text-[var(--wr-brand)] hover:underline cursor-pointer"
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={r.sourceUrl}
                      >
                        {r.sourceUrl}
                      </a>
                    </td>
                  )}

                  {visibleCols.includes("targetUrl") && (
                    <td className="px-3 py-3">
                      <a
                        href="#"
                        className="truncate text-[var(--wr-text)] hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Open Target Pages filtered to: ${r.targetUrl} (demo)`);
                        }}
                        title={r.targetUrl}
                      >
                        {r.targetUrl}
                      </a>
                    </td>
                  )}

                  {visibleCols.includes("anchorText") && (
                    <td className="px-3 py-3 text-[var(--wr-text)]" title={`Anchor type: ${r.anchorType}`}>
                      {r.anchorText}
                    </td>
                  )}

                  {visibleCols.includes("anchorType") && <td className="px-3 py-3">{r.anchorType}</td>}

                  {visibleCols.includes("anchorRisk") && (
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ring-1",
                          r.anchorRisk === "High"
                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                            : r.anchorRisk === "Medium"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        )}
                        title={`Anchor Risk: ${r.anchorRisk}`}
                      >
                        {r.anchorRisk}
                      </span>
                    </td>
                  )}

                  {/* Link Attributes with branded icons */}
                  {visibleCols.includes("linkAttributes") && (
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.linkAttributes.map(renderAttrChip)}
                      </div>
                    </td>
                  )}

                  {visibleCols.includes("date") && <td className="px-3 py-3 text-[var(--wr-text)]">{eventDate(r)}</td>}

                  {/* WR Score with circular brand gauge + plain value */}
                  {visibleCols.includes("wrScore") && (
                    <td className="px-3 py-3">
                      <div className="inline-flex items-center gap-2">
                        <WrGauge value={r.wrScore} />
                        <span className="font-medium text-[var(--wr-text)]">{r.wrScore}</span>
                      </div>
                    </td>
                  )}

                  {visibleCols.includes("wrImpact") && (
                    <td className="px-3 py-3">
                      {r.status === "Lost" ? (
                        <span className={cn(r.wrImpact < 0 ? "text-rose-600" : "text-emerald-600", "font-medium")}>
                          {r.wrImpact}
                        </span>
                      ) : (
                        <span className="text-[var(--wr-muted)]">—</span>
                      )}
                    </td>
                  )}

                  {visibleCols.includes("visits") && (
                    <td className="px-3 py-3">
                      <span
                        className={cn(!gaConnected ? "text-[var(--wr-brand)] underline" : "text-[var(--wr-text)]", "cursor-pointer")}
                        onClick={() => {
                          if (!gaConnected) setGaConnected(true);
                        }}
                        title={gaConnected ? "Referral sessions" : "Click to simulate GA4 connect"}
                      >
                        {formatVisits(r.visits, gaConnected)}
                      </span>
                    </td>
                  )}

                  {/* Actions — branded icons, show full name on hover */}
                  {visibleCols.includes("actions") && (
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <IconAction label="View" onClick={() => alert("View (demo)")}>
                          <Eye className="h-4 w-4" color="#008CCD" />
                        </IconAction>

                        {r.status === "New" ? (
                          <>
                            <IconAction label="Create Outreach Task" onClick={() => alert("Create Outreach Task (demo)")}>
                              <Send className="h-4 w-4" color="#008CCD" />
                            </IconAction>
                            <IconAction
                              label={isPartner ? "Unmark Partner" : "Mark as Partner"}
                              onClick={() => {
                                const next = new Set(partners);
                                isPartner ? next.delete(r.domain) : next.add(r.domain);
                                setPartners(next);
                              }}
                            >
                              <UserCheck className="h-4 w-4" color="#008CCD" />
                            </IconAction>
                          </>
                        ) : (
                          <>
                            <IconAction label="Create Recovery Task" onClick={() => alert("Create Recovery Task (demo)")}>
                              <RotateCcw className="h-4 w-4" color="#008CCD" />
                            </IconAction>
                            <IconAction label="Disavow Source" onClick={() => alert("Disavow Source (demo)")}>
                              <ShieldOff className="h-4 w-4" color="#008CCD" />
                            </IconAction>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {paged.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-10 text-center text-sm text-[var(--wr-muted)]">
                  No results match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-[var(--wr-text)]">
          Showing <strong>{(page - 1) * pageSize + 1}</strong>–<strong>{Math.min(filtered.length, page * pageSize)}</strong> of{" "}
          <strong>{filtered.length}</strong>
        </div>
        <nav className="flex items-center gap-1">
          <button
            className="h-8 rounded-md border border-[var(--wr-border)] px-3 text-sm text-[var(--wr-text)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--wr-subtle)] cursor-pointer"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(6, totalPages) }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={cn(
                  "h-8 min-w-[2rem] rounded-md border px-2 text-sm cursor-pointer",
                  page === n
                    ? "border-[var(--wr-brand)] bg-[var(--wr-brand-pastel)] text-[var(--wr-brand)]"
                    : "border-[var(--wr-border)] bg-white text-[var(--wr-text)] hover:bg-[var(--wr-subtle)]"
                )}
                title={`Page ${n}`}
              >
                {n}
              </button>
            );
          })}
          <button
            className="h-8 rounded-md border border-[var(--wr-border)] px-3 text-sm text-[var(--wr-text)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--wr-subtle)] cursor-pointer"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            title="Next page"
          >
            Next
          </button>
        </nav>
      </div>

      {/* Columns menu (3. now clamped to viewport) */}
      {colsOpen && (
        <ColumnsMenu
          all={allColumns as unknown as { key: string; label: string }[]}
          visible={visibleCols}
          rect={colsRect}
          onToggle={(k) => toggleCol(k as ColumnKey)}
          onClose={() => setColsOpen(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------ UI Bits ------------------------------ */

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5", active ? "text-[var(--wr-text)]" : "text-[var(--wr-muted)]")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      {dir === "asc" ? (
        <path d="M7 14l5-5 5 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M7 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

