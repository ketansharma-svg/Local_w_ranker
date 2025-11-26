import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  CreditCard,
  Download,
  Info,
  Lock,
  Navigation,
  Search as SearchIcon,
  ShoppingCart,
} from "lucide-react";

/** =========================================================
 * Wranker • OVI — Section 5: Top Position Changes (Organic)
 * Refinements applied:
 * - Inter, Inter Fallback font stack
 * - No emoji anywhere
 * - Branded (#008CCD) icons for section title + intent badges
 * - Pointer cursor on clickable elements
 * - Modular chips and toggle switches (consistent with recent designs)
 * ========================================================= */

type ChangeType = "new" | "lost" | "improved" | "declined";
type Intent = "Informational" | "Navigational" | "Commercial" | "Transactional";

type SerpBadge =
  | "FS" // Featured Snippet
  | "PAA" // People Also Ask
  | "Video"
  | "Image"
  | "Local"
  | "TopStories"
  | "KP"
  | "Discussions";

export interface MovementRow {
  keyword: string;
  intent?: Intent;
  previous_rank: number | null; // null for New
  current_rank: number | null; // null for Lost
  rank_delta?: number; // signed; positive = improvement (lower number rank)
  traffic_delta_abs?: number; // estimated visits delta
  traffic_delta_pct?: number; // percent vs previous
  volume?: number; // monthly SV
  serp_features?: SerpBadge[];
  target_url?: string;
  change_type: ChangeType;
  source?: "SE Ranking";
  branded?: boolean;
}

export interface TopPositionChangesPayload {
  summary: { new: number; lost: number; improved: number; declined: number };
  rows: MovementRow[]; // preview uses top 5 by traffic impact
  computed_at: string; // ISO timestamp
}

type Props = {
  payload?: TopPositionChangesPayload; // pass real data; demo used if omitted
  freemium?: boolean; // gates PDF export
  onViewAll?: (active: ChangeType, filterState: Record<string, boolean>, q: string) => void;
  onKeywordClick?: (row: MovementRow) => void;
  onUrlClick?: (row: MovementRow) => void;
};

const TOKENS = {
  brand: "var(--wr-brand, #008CCD)", // branded icons
  action: "var(--wr-action, #0077FF)",
  surface: "var(--wr-surface, #FFFFFF)",
  bgSubtle: "var(--wr-bg-subtle, #F5F7FA)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  success: "var(--wr-success, #2ECC71)",
  danger: "var(--wr-danger, #FF6B6B)",
  neutral: "var(--wr-neutral, #9CA3AF)",
  radius: "var(--wr-radius-lg, 16px)",
  shadow: "var(--wr-shadow-sm, 0 2px 6px rgba(0,0,0,.05))",
};

// -------------------- Utilities
const fmt = (n?: number | null) => (typeof n === "number" ? n.toLocaleString() : "—");
const pct = (v?: number | null, dp = 1) => (typeof v === "number" ? `${(v * 100).toFixed(dp)}%` : "—");

function ctrAt(pos: number | null): number {
  if (!pos || pos < 1 || pos > 100) return 0;
  if (pos === 1) return 0.265;
  if (pos === 2) return 0.154;
  if (pos === 3) return 0.11;
  if (pos <= 5) return 0.07;
  if (pos <= 10) return 0.035;
  if (pos <= 20) return 0.015;
  if (pos <= 50) return 0.006;
  return 0.002;
}

function computeImpact(row: MovementRow) {
  const vol = row.volume ?? 0;
  const prevCtr = ctrAt(row.previous_rank);
  const currCtr = ctrAt(row.current_rank);

  let abs = 0;
  let base = prevCtr * vol;

  if (row.change_type === "new") {
    abs = currCtr * vol;
    base = Math.max(1, base);
  } else if (row.change_type === "lost") {
    abs = -(prevCtr * vol);
    base = Math.max(1, prevCtr * vol);
  } else {
    abs = (currCtr - prevCtr) * vol;
    base = Math.max(1, prevCtr * vol);
  }

  const pctChange = abs / base; // signed
  return { abs, pct: pctChange };
}

// simple glyphs (not emoji)
const ICON = {
  up: "▲",
  down: "▼",
  flat: "—",
};
function deltaArrow(delta?: number | null) {
  if (typeof delta !== "number" || delta === 0) return ICON.flat;
  return delta > 0 ? ICON.up : ICON.down;
}
function deltaColor(delta?: number | null) {
  if (typeof delta !== "number" || delta === 0) return TOKENS.neutral;
  return delta > 0 ? TOKENS.success : TOKENS.danger;
}
function changeChipColor(type: ChangeType) {
  if (type === "improved") return TOKENS.success;
  if (type === "declined" || type === "lost") return TOKENS.danger;
  return TOKENS.brand;
}
function truncateMiddle(str = "", max = 36) {
  if (str.length <= max) return str;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

// -------------------- Demo payload (safe to replace with real data)
const DEMO: TopPositionChangesPayload = {
  summary: { new: 4, lost: 3, improved: 6, declined: 5 },
  computed_at: new Date().toISOString(),
  rows: [
    {
      keyword: "seo checklist",
      intent: "Informational",
      previous_rank: 18,
      current_rank: 7,
      rank_delta: 11,
      volume: 5400,
      serp_features: ["PAA"],
      target_url: "/blog/seo-checklist",
      change_type: "improved",
      branded: false,
    },
    {
      keyword: "best seo tool",
      intent: "Commercial",
      previous_rank: 12,
      current_rank: 4,
      rank_delta: 8,
      volume: 4400,
      serp_features: ["FS"],
      target_url: "/comparison",
      change_type: "improved",
      branded: false,
    },
    {
      keyword: "wranker pricing",
      intent: "Navigational",
      previous_rank: 22,
      current_rank: 10,
      rank_delta: 12,
      volume: 1600,
      serp_features: [],
      target_url: "/pricing",
      change_type: "improved",
      branded: true,
    },
    {
      keyword: "seo audit service price",
      intent: "Transactional",
      previous_rank: 8,
      current_rank: 19,
      rank_delta: -11,
      volume: 800,
      serp_features: ["PAA"],
      target_url: "/services/audit",
      change_type: "declined",
      branded: false,
    },
    {
      keyword: "subscribe wranker",
      intent: "Transactional",
      previous_rank: null,
      current_rank: 4,
      rank_delta: 0,
      volume: 1200,
      serp_features: [],
      target_url: "/checkout",
      change_type: "new",
      branded: true,
    },
    {
      keyword: "internal linking tips",
      intent: "Informational",
      previous_rank: 7,
      current_rank: null,
      rank_delta: 0,
      volume: 2200,
      serp_features: ["PAA"],
      target_url: "/blog/internal-linking",
      change_type: "lost",
      branded: false,
    },
    {
      keyword: "page speed guide",
      intent: "Informational",
      previous_rank: 14,
      current_rank: 9,
      rank_delta: 5,
      volume: 1700,
      serp_features: [],
      target_url: "/blog/page-speed",
      change_type: "improved",
      branded: false,
    },
    {
      keyword: "semrush vs wranker",
      intent: "Commercial",
      previous_rank: 9,
      current_rank: 17,
      rank_delta: -8,
      volume: 600,
      serp_features: [],
      target_url: "/compare/semrush",
      change_type: "declined",
      branded: true,
    },
    {
      keyword: "wranker login",
      intent: "Navigational",
      previous_rank: 1,
      current_rank: null,
      volume: 2900,
      serp_features: [],
      target_url: "/login",
      change_type: "lost",
      branded: true,
    },
    {
      keyword: "content optimizer software",
      intent: "Commercial",
      previous_rank: 16,
      current_rank: 9,
      rank_delta: 7,
      volume: 1200,
      serp_features: ["PAA"],
      target_url: "/features/content-optimizer",
      change_type: "improved",
      branded: false,
    },
  ],
};

/* ===================== UI PRIMITIVES (modular chips & switches) ===================== */

function Chip({
  active,
  label,
  count,
  dotColor,
  onClick,
  title,
}: {
  active?: boolean;
  label: React.ReactNode;
  count?: number;
  dotColor?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition ${
        active ? "bg-[#D2EFFF] text-[#0C69B2]" : "bg-white text-[var(--wr-text,#111827)]"
      } cursor-pointer`}
      style={{ borderColor: TOKENS.border }}
    >
      {dotColor ? (
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
      ) : null}
      <span className={active ? "font-medium" : "font-normal"}>{label}</span>
      {typeof count === "number" ? (
        <span className="rounded bg-[var(--wr-bg-subtle,#F5F7FA)] px-1.5 py-[2px] text-[12px]">{count}</span>
      ) : null}
    </button>
  );
}

function ToggleSwitch({
  label,
  active,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title || label}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer"
      style={{ borderColor: TOKENS.border, color: active ? TOKENS.text : TOKENS.muted }}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full border`}
        style={{
          borderColor: active ? TOKENS.brand : TOKENS.border,
          background: active ? "rgba(0,140,205,0.15)" : "var(--wr-bg-subtle,#F5F7FA)",
        }}
      >
        <span
          className={`absolute h-4 w-4 rounded-full transition-transform`}
          style={{
            background: active ? TOKENS.brand : "#CBD5E1",
            transform: active ? "translateX(20px)" : "translateX(2px)",
          }}
        />
      </span>
      <span className={active ? "font-medium text-[13px]" : "text-[13px]"}>{label}</span>
    </button>
  );
}

function IntentBadge({ intent }: { intent?: Intent }) {
  if (!intent) return <span className="text-[12px] text-gray-400">—</span>;
  const map: Record<Intent, React.ReactNode> = {
    Informational: <Info className="h-3.5 w-3.5" color={TOKENS.brand} />,
    Navigational: <Navigation className="h-3.5 w-3.5" color={TOKENS.brand} />,
    Commercial: <ShoppingCart className="h-3.5 w-3.5" color={TOKENS.brand} />,
    Transactional: <CreditCard className="h-3.5 w-3.5" color={TOKENS.brand} />,
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-xs"
      style={{ borderColor: TOKENS.border }}
      title={intent}
    >
      {map[intent]}
      <span>{intent}</span>
    </span>
  );
}

/* =================================== Component =================================== */

export default function OVI_TopPositionChanges({
  payload = DEMO,
  freemium = true,
  onViewAll,
  onKeywordClick,
  onUrlClick,
}: Props) {
  const [active, setActive] = useState<ChangeType>("improved");
  const [q, setQ] = useState("");
  const [mods, setMods] = useState({
    top3: false,
    top10: false,
    serp: false,
    branded: false,
    nonbranded: false,
  });
  const [exportOpen, setExportOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Compute counts per bucket after applying modifiers + search (for chips)
  const filteredByModsAndSearch = useMemo(() => {
    return payload.rows.filter((r) => {
      if (q && !r.keyword.toLowerCase().includes(q.toLowerCase())) return false;

      if (mods.serp && !(r.serp_features && r.serp_features.length)) return false;
      if (mods.branded && !r.branded) return false;
      if (mods.nonbranded && r.branded) return false;

      if (mods.top3) {
        const within =
          (r.current_rank && r.current_rank <= 3) ||
          (r.change_type === "lost" && r.previous_rank && r.previous_rank <= 3);
        if (!within) return false;
      }
      if (mods.top10) {
        const within =
          (r.current_rank && r.current_rank <= 10) ||
          (r.change_type === "lost" && r.previous_rank && r.previous_rank <= 10);
        if (!within) return false;
      }
      return true;
    });
  }, [payload.rows, mods, q]);

  const counts = useMemo(() => {
    const out = { new: 0, lost: 0, improved: 0, declined: 0 } as Record<ChangeType, number>;
    for (const r of filteredByModsAndSearch) out[r.change_type]++;
    return out;
  }, [filteredByModsAndSearch]);

  // Default/fallback active bucket (spec)
  useEffect(() => {
    if (counts[active] > 0) return;
    const order: ChangeType[] = ["improved", "declined", "new", "lost"];
    for (const k of order) {
      if (counts[k] > 0) {
        setActive(k);
        break;
      }
    }
  }, [counts, active]);

  // Rows for the active bucket → compute impact, sort, slice(5)
  const rows = useMemo(() => {
    const subset = filteredByModsAndSearch.filter((r) => r.change_type === active);

    for (const r of subset) {
      if (typeof r.rank_delta !== "number" && r.previous_rank && r.current_rank) {
        r.rank_delta = r.previous_rank - r.current_rank; // positive = improvement
      }
    }

    const withImpact = subset.map((r) => {
      if (typeof r.traffic_delta_abs !== "number" || typeof r.traffic_delta_pct !== "number") {
        const { abs, pct } = computeImpact(r);
        return { ...r, traffic_delta_abs: abs, traffic_delta_pct: pct };
      }
      return r;
    });

    withImpact.sort((a, b) => (b.traffic_delta_abs ?? 0) - (a.traffic_delta_abs ?? 0));

    return withImpact.slice(0, 5);
  }, [filteredByModsAndSearch, active]);

  // Export — CSV (visible rows) + PNG snapshot (canvas)
  function exportCSV() {
    const head = [
      "Keyword",
      "Change Type",
      "Prev Rank",
      "Current Rank",
      "Rank Δ",
      "Traffic Δ (abs)",
      "Traffic Δ (%)",
      "Volume",
      "SERP",
      "URL",
    ];
    const data = rows.map((r) => [
      `"${r.keyword.replace(/"/g, '""')}"`,
      r.change_type,
      r.previous_rank ?? "",
      r.current_rank ?? "",
      r.rank_delta ?? "",
      (r.traffic_delta_abs ?? 0).toFixed(0),
      (r.traffic_delta_pct ?? 0).toFixed(4),
      r.volume ?? "",
      (r.serp_features || []).join("|"),
      r.target_url || "",
    ]);
    const csv = [head, ...data].map((a) => a.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top-position-changes-${active}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function exportPNG() {
    // Render a crisp canvas snapshot (title + 5 rows summary)
    const W = 1100,
      ROWH = 40,
      PADDING = 24,
      H = PADDING * 2 + 38 + ROWH * (rows.length + 1);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // bg
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    // fonts — Inter, Inter Fallback
    ctx.fillStyle = "#111827";
    ctx.font = '600 18px Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system';

    // title
    ctx.fillText("Top Position Changes (Organic)", PADDING, PADDING + 18);

    // subtitle
    ctx.fillStyle = "#6B7280";
    ctx.font = '500 12px Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system';
    ctx.fillText(
      `Active: ${active.toUpperCase()} • ${new Date(payload.computed_at).toLocaleString()}`,
      PADDING,
      PADDING + 36
    );

    // header
    const cols = ["Keyword", "Pos Δ", "Traffic Δ", "Volume", "SERP", "Page"];
    const colX = [PADDING, 520, 630, 740, 820, 900];
    ctx.fillStyle = "#374151";
    ctx.font = '600 13px Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system';
    for (let i = 0; i < cols.length; i++) ctx.fillText(cols[i], colX[i], PADDING + 60);

    // rows
    ctx.font = '400 13px Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system';
    let y = PADDING + 60 + 16;
    for (const r of rows) {
      // keyword
      ctx.fillStyle = "#111827";
      const kw = r.keyword.length > 36 ? r.keyword.slice(0, 34) + "…" : r.keyword;
      ctx.fillText(kw, colX[0], y);

      // pos change
      ctx.fillStyle = String(deltaColor(r.rank_delta));
      const delta =
        r.previous_rank == null
          ? "— → " + (r.current_rank ?? "—")
          : r.current_rank == null
          ? (r.previous_rank ?? "—") + " → —"
          : `${r.previous_rank} → ${r.current_rank}`;
      const arrow = deltaArrow(r.rank_delta);
      ctx.fillText(`${delta} ${arrow}`, colX[1], y);

      // traffic Δ
      const tAbs = r.traffic_delta_abs ?? 0;
      const sign = tAbs >= 0 ? "+" : "";
      ctx.fillStyle = String(deltaColor(tAbs));
      ctx.fillText(`${sign}${Math.round(tAbs)} (${pct(r.traffic_delta_pct, 1)})`, colX[2], y);

      // volume
      ctx.fillStyle = "#111827";
      ctx.fillText(fmt(r.volume), colX[3], y);

      // SERP
      ctx.fillStyle = "#374151";
      ctx.fillText((r.serp_features || []).slice(0, 3).join(" "), colX[4], y);

      // URL
      ctx.fillStyle = "#008CCD";
      ctx.fillText((r.target_url || "").slice(0, 18), colX[5], y);

      y += ROWH;
    }

    // download
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `top-position-changes-${active}.png`;
    a.click();
    setExportOpen(false);
  }

  return (
    <section
      ref={cardRef}
      className="w-full rounded-xl border bg-white p-5 mt-4"
      style={{
        borderColor: TOKENS.border,
        boxShadow: TOKENS.shadow,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ArrowUpDown className="h-5 w-5" color={TOKENS.brand} aria-hidden="true" />
          <h3 className="text-[16px] font-semibold" style={{ color: TOKENS.text }} aria-label="Top Position Changes (Organic)">
            Top Position Changes (Organic)
          </h3>
          <span
            className="rounded-full border px-2 py-[2px] text-[12px]"
            style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
            title="Compares current vs previous period from the global date range"
          >
            vs previous period
          </span>
        </div>

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setExportOpen((s) => !s)}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
            style={{ borderColor: TOKENS.border, color: TOKENS.text }}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
          >
            <Download className="h-4 w-4" color={TOKENS.brand} />
            Export
            <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
          </button>
          {exportOpen && (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white shadow-md"
              style={{ borderColor: TOKENS.border }}
            >
              <button
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={exportPNG}
              >
                PNG (Snapshot)
              </button>
              <button
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                onClick={exportCSV}
              >
                CSV (Table)
              </button>
              <button
                role="menuitem"
                disabled={freemium}
                title={freemium ? "Upgrade to export PDF" : "Export PDF"}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  freemium ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                }`}
                onClick={() => !freemium && alert("PDF export not wired in demo")}
              >
                <Lock className="h-4 w-4" color={freemium ? "#9CA3AF" : String(TOKENS.brand)} />
                PDF
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Divider */}
      <div className="my-3 border-t" style={{ borderColor: TOKENS.borderLight }} />

      {/* Summary chips (counts) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["new", "lost", "improved", "declined"] as ChangeType[]).map((k) => (
          <Chip
            key={k}
            label={<span className="capitalize">{k}</span>}
            count={counts[k]}
            dotColor={changeChipColor(k)}
            onClick={() => setActive(k)}
            title={`Go to ${k}`}
          />
        ))}
      </div>

      {/* Primary group (single-select) + modifiers + search */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Primary (single-select) */}
        <Chip active={active === "new"} onClick={() => setActive("new")} label="New" />
        <Chip active={active === "lost"} onClick={() => setActive("lost")} label="Lost" />
        <Chip active={active === "improved"} onClick={() => setActive("improved")} label="Improved" />
        <Chip active={active === "declined"} onClick={() => setActive("declined")} label="Declined" />

        {/* Spacer */}
        <span className="mx-1 h-5 w-px bg-[var(--wr-borderLight,#EFF0F6)]" />

        {/* Modifiers (multi-select) */}
        <ToggleSwitch
          active={mods.top3}
          onClick={() => setMods((m) => ({ ...m, top3: !m.top3, top10: m.top10 && !m.top3 ? false : m.top10 }))}
          label="Top3 only"
        />
        <ToggleSwitch
          active={mods.top10}
          onClick={() => setMods((m) => ({ ...m, top10: !m.top10, top3: m.top3 && !m.top10 ? false : m.top3 }))}
          label="Top10 only"
        />
        <ToggleSwitch active={mods.serp} onClick={() => setMods((m) => ({ ...m, serp: !m.serp }))} label="With SERP Feature" />
        <ToggleSwitch
          active={mods.branded}
          onClick={() =>
            setMods((m) => ({ ...m, branded: !m.branded, nonbranded: m.nonbranded && !m.branded ? false : m.nonbranded }))
          }
          label="Branded"
        />
        <ToggleSwitch
          active={mods.nonbranded}
          onClick={() =>
            setMods((m) => ({ ...m, nonbranded: !m.nonbranded, branded: m.branded && !m.nonbranded ? false : m.branded }))
          }
          label="Non‑Branded"
        />

        {/* Search */}
        <div
          className="ml-auto flex items-center gap-1 rounded-md border px-2"
          style={{ borderColor: TOKENS.border, color: TOKENS.muted }}
          title="Search keyword"
        >
          <SearchIcon className="h-4 w-4" color={TOKENS.brand} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search keyword…"
            className="h-8 w-48 outline-none placeholder:text-[var(--wr-muted,#6B7280)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: TOKENS.border }}>
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-[var(--wr-bg-subtle,#F5F7FA)]">
            <tr className="text-[12px] text-[var(--wr-muted,#6B7280)]">
              <th className="px-3 py-2 font-medium">Keyword</th>
              <th className="px-3 py-2 font-medium">Intent</th>
              <th className="px-3 py-2 font-medium">Position Change</th>
              <th className="px-3 py-2 font-medium">Traffic Δ</th>
              <th className="px-3 py-2 font-medium">Volume</th>
              <th className="px-3 py-2 font-medium">SERP</th>
              <th className="px-3 py-2 font-medium">Page</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const arrow = deltaArrow(r.rank_delta);
              const deltaC = deltaColor(r.rank_delta);
              const tAbs = r.traffic_delta_abs ?? 0;
              const tPct = r.traffic_delta_pct ?? 0;
              const tColor = deltaColor(tAbs);

              const posText =
                r.previous_rank == null
                  ? `— → ${r.current_rank ?? "—"}`
                  : r.current_rank == null
                  ? `${r.previous_rank} → —`
                  : `${r.previous_rank} → ${r.current_rank}`;

              return (
                <tr key={r.keyword + i} className="border-t hover:bg-gray-50" style={{ borderColor: TOKENS.borderLight }}>
                  <td className="px-3 py-2 font-medium">
                    <button
                      onClick={() => onKeywordClick?.(r)}
                      className="cursor-pointer text-left text-[var(--wr-text,#111827)] hover:underline"
                      title="Open Keyword Analyzer"
                    >
                      {r.keyword}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <IntentBadge intent={r.intent} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2" title={`Rank delta: ${r.rank_delta ?? 0}`}>
                      <span>{posText}</span>
                      <span style={{ color: deltaC }}>{arrow}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-2"
                      title={`${tAbs >= 0 ? "+" : ""}${Math.round(tAbs)} est. visits (${pct(tPct, 1)})`}
                    >
                      <span style={{ color: tColor }}>
                        {tAbs >= 0 ? "+" : ""}
                        {Math.round(tAbs)}
                      </span>
                      <span className="rounded bg-[var(--wr-bg-subtle,#F5F7FA)] px-1.5 py-[2px] text-[12px]">{pct(tPct, 1)}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2">{fmt(r.volume)}</td>
                  <td className="px-3 py-2">
                    {r.serp_features?.length ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {r.serp_features.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700"
                            title={s === "FS" ? "Featured Snippet" : s}
                          >
                            {s}
                          </span>
                        ))}
                        {r.serp_features.length > 3 && (
                          <span className="rounded bg-gray-100 px-1.5 py-[2px] text-[11px] text-gray-700">
                            +{r.serp_features.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px] text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.target_url ? (
                      <a
                        href={r.target_url}
                        onClick={(e) => {
                          e.preventDefault();
                          onUrlClick?.(r);
                        }}
                        className="cursor-pointer text-[var(--wr-brand,#008CCD)] hover:underline"
                        title={r.target_url}
                      >
                        {truncateMiddle(r.target_url, 28)}
                      </a>
                    ) : (
                      <span className="text-[12px] text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-[var(--wr-muted,#6B7280)]">
                  Nothing to show for <b className="capitalize">{active}</b> with current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer CTA */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[12px] text-[var(--wr-muted,#6B7280)]">Showing top 5 by <b>Traffic Impact</b>.</div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm transition hover:bg-[var(--wr-bg-subtle,#F5F7FA)] cursor-pointer"
          style={{ borderColor: TOKENS.border, color: TOKENS.text }}
          onClick={() => onViewAll?.(active, mods, q)}
          aria-label="View All Changes"
          title="View all changes"
        >
          View All Changes →
        </button>
      </div>
    </section>
  );
}
