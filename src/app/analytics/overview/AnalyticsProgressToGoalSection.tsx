import * as React from "react";
import {
  Target,
  TrendingUp,
  Clock,
  Percent,
  BarChart3,
  Plus,
  X,
  Settings2,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
} from "recharts";

/* ============================================================
   TOKENS
   ============================================================ */
const TOKENS = {
  brand: "#008CCD",
  brandHover: "#007DB3",
  valueBlue: "#4286F5",
  chartBlue: "#4286F5",
  chartBlueFill: "#BDD6FF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  pastelBrand: "#D9EEF8",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  text: "#111827",
  textMuted: "#6B7280",
  radius: 8,
  shadowSm: "0 1px 2px rgba(17,24,39,.06)",
  shadowMd: "0 2px 6px rgba(17,24,39,.08)",
  card: "#FFFFFF",
};

const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

/* ============================================================
   Types & helpers
   ============================================================ */
type GoalType =
  | "sessions"
  | "organic_clicks"
  | "conversions"
  | "engagement_time"
  | "ctr";
type GoalSource = "ga4" | "gsc";
type GoalPeriod = "current_month" | "last_30d" | "last_7d" | "custom";
type Unit = "count" | "percent" | "seconds";

type Goal = {
  id: string;
  title: string;
  type: GoalType;
  source: GoalSource;
  target: number;
  current: number;
  previous?: number;
  unit: Unit;
  period: GoalPeriod;
  pinned?: boolean;
  startAt?: string;
  dueAt?: string;
  showOnOverview?: boolean;
  notifyOnReach?: boolean;
  warnUnderPct?: number | null;
  updatedAt?: string;
};

type Store = {
  goals: Goal[];
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const fmtInt = (n: number) => new Intl.NumberFormat().format(Math.round(n));
const fmtPct = (n: number, fd = 1) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: fd }).format(
    n
  )}%`;
const fmtMmSs = (s: number) => {
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};
const parseMmSs = (str: string) => {
  const m = str.trim().match(/^(\d+):([0-5]?\d)$/);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
};

const goalIconFor = (t: GoalType) =>
  t === "sessions" ? (
    <BarChart3 className="w-4 h-4" />
  ) : t === "organic_clicks" ? (
    <TrendingUp className="w-4 h-4" />
  ) : t === "conversions" ? (
    <Target className="w-4 h-4" />
  ) : t === "engagement_time" ? (
    <Clock className="w-4 h-4" />
  ) : (
    <Percent className="w-4 h-4" />
  );

const sourceChip = (s: GoalSource) => (
  <span
    className="inline-flex items-center gap-1 text-[11px] px-2 py-[2px] rounded border"
    style={{
      borderColor: TOKENS.borderLight,
      color: s === "ga4" ? TOKENS.brand : "#10A37F",
      background: s === "ga4" ? "#F0FAFF" : "#ECFDF5",
    }}
  >
    {s.toUpperCase()}
  </span>
);

const progressTone = (pct: number) => {
  if (pct >= 90) return TOKENS.success;
  if (pct >= 60) return TOKENS.warning;
  return TOKENS.danger;
};

const deltaBadge = (delta: number | null | undefined, goodWhenUp = true) => {
  if (delta == null || !isFinite(delta)) return null;
  const up = delta >= 0;
  const isGood = goodWhenUp ? up : !up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const tone = isGood ? TOKENS.success : TOKENS.danger;
  return (
    <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: tone }}>
      <Icon className="w-3.5 h-3.5" />
      {fmtPct(Math.abs(delta) * 100, 1)}
    </span>
  );
};

const formatValue = (unit: Unit, n: number) => {
  if (unit === "percent") return fmtPct(n, 1);
  if (unit === "seconds") return fmtMmSs(n);
  return fmtInt(n);
};

/* ============================================================
   Mock Store (localStorage) + Seed
   ============================================================ */
const KEY = "wr:progress-goals";

function seedGoals(): Goal[] {
  return [  ];
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { goals: seedGoals() };
    const parsed = JSON.parse(raw) as Store;
    if (!parsed?.goals?.length) return { goals: seedGoals() };
    return parsed;
  } catch {
    return { goals: seedGoals() };
  }
}

function saveStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

function useGoalsStore() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  React.useEffect(() => {
    setGoals(loadStore().goals);
  }, []);
  React.useEffect(() => {
    saveStore({ goals });
  }, [goals]);

  const addGoal = (g: Goal) => setGoals((prev) => [...prev, g]);
  const updateGoal = (id: string, patch: Partial<Goal>) =>
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g))
    );
  const removeGoal = (id: string) => setGoals((prev) => prev.filter((g) => g.id !== id));
  const reorder = (ids: string[]) =>
    setGoals((prev) => ids.map((id) => prev.find((g) => g.id === id)!).filter(Boolean));

  return { goals, addGoal, updateGoal, removeGoal, reorder };
}

/* ============================================================
   Micro components
   ============================================================ */
function SectionShell({
  title,
  children,
  right,
}: React.PropsWithChildren<{ title: string; right?: React.ReactNode }>) {
  return (
    <section
      className="mt-4 rounded-md bg-white"
      style={{
        border: `1px solid ${TOKENS.borderLight}`,
        boxShadow: TOKENS.shadowSm,
        fontFamily: FONT_STACK, // Inter, Inter fallback
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: TOKENS.borderLight }}
      >
        <div className="flex items-center gap-2">
          {/* Branded icon for section title */}
          <Target size={16} className="text-[#008CCD]" />
          <h2 className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ViewToggle({
  mode,
  onChange,
}: {
  mode: "bars" | "dials";
  onChange: (m: "bars" | "dials") => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md overflow-hidden border"
      style={{ borderColor: TOKENS.borderLight }}
    >
      <button
        className="px-2.5 py-1.5 text-sm cursor-pointer"
        style={{
          background: mode === "bars" ? TOKENS.pastelBrand : "#fff",
          color: mode === "bars" ? TOKENS.brand : TOKENS.text,
        }}
        onClick={() => onChange("bars")}
      >
        Bars
      </button>
      <button
        className="px-2.5 py-1.5 text-sm cursor-pointer"
        style={{
          background: mode === "dials" ? TOKENS.pastelBrand : "#fff",
          color: mode === "dials" ? TOKENS.brand : TOKENS.text,
        }}
        onClick={() => onChange("dials")}
      >
        Dials
      </button>
    </div>
  );
}

function ProgressBar({ pct, tone }: { pct: number; tone: string }) {
  const val = clamp(pct, 0, 160); // allow over-achievement
  return (
    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
      <div
        className="h-full"
        style={{
          width: `${val}%`,
          background: `linear-gradient(90deg, ${tone}, ${TOKENS.chartBlue})`,
        }}
      />
    </div>
  );
}

/** DIALS VIEW — fixed so only the achieved portion is colored,
 *  remainder uses the same gray as Bars view (#F3F4F6). */
function Dial({ pct, tone }: { pct: number; tone: string }) {
  const achieved = clamp(pct, 0, 100); // ring never over 100%
  const data = [
    { name: "Achieved", value: achieved },
    { name: "Remaining", value: Math.max(0, 100 - achieved) },
  ];
  return (
    <div className="w-[120px] h-[120px]">
      <ResponsiveContainer>
        <PieChart>
          <RTooltip
            content={({ active, payload }: any) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.name === "Achieved" ? payload[0].value : achieved;
              return (
                <div
                  className="text-xs rounded-md px-2 py-1"
                  style={{
                    background: "#fff",
                    border: `1px solid ${TOKENS.border}`,
                    color: TOKENS.text,
                  }}
                >
                  Progress: {fmtPct(p, 1)}
                </div>
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            innerRadius="55%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="transparent"
            cornerRadius={6}
          >
            <Cell fill={tone} />           {/* Achieved (colored) */}
            <Cell fill="#F3F4F6" />       {/* Remaining (gray, same as Bars bg) */}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   Modal — Set New Goals
   ============================================================ */
type ModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (g: Goal) => void;
  edit?: Goal | null;
};

function SetNewGoalsModal({ open, onClose, onSave, edit }: ModalProps) {
  const isEdit = !!edit;
  const [type, setType] = React.useState<GoalType>(edit?.type || "sessions");
  const [source, setSource] = React.useState<GoalSource>(edit?.source || "ga4");
  const [title, setTitle] = React.useState<string>(edit?.title || "New Goal");
  const [period, setPeriod] = React.useState<GoalPeriod>(edit?.period || "current_month");

  const defaultUnit: Unit =
    type === "ctr" ? "percent" : type === "engagement_time" ? "seconds" : "count";

  const [unit, setUnit] = React.useState<Unit>(edit?.unit || defaultUnit);
  const [targetInput, setTargetInput] = React.useState<string>(() => {
    if (!edit) return unit === "seconds" ? "02:00" : "10000";
    return unit === "seconds" ? fmtMmSs(edit.target) : String(edit.target);
  });
  const [baseline, setBaseline] = React.useState<string>(() => {
    if (!edit?.previous) return unit === "seconds" ? "00:00" : "0";
    return unit === "seconds" ? fmtMmSs(edit.previous) : String(edit.previous);
  });
  const [notify, setNotify] = React.useState<boolean>(edit?.notifyOnReach ?? true);
  const [showOnOverview, setShowOnOverview] = React.useState<boolean>(edit?.showOnOverview ?? true);
  const [warnPct, setWarnPct] = React.useState<string>(
    edit?.warnUnderPct != null ? String(edit.warnUnderPct) : ""
  );

  React.useEffect(() => {
    if (type === "organic_clicks" || type === "ctr") setSource("gsc");
    if (type === "sessions" || type === "engagement_time" || type === "conversions") setSource("ga4");
    const u = type === "ctr" ? "percent" : type === "engagement_time" ? "seconds" : "count";
    setUnit(u);
    if (!isEdit) setTargetInput(u === "seconds" ? "02:30" : type === "ctr" ? "5.0" : "10000");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  if (!open) return null;

  function toNumber(val: string, as: Unit): number {
    if (as === "seconds") {
      const s = parseMmSs(val);
      return isNaN(s) ? 0 : s;
      }
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  function save() {
    const now = new Date().toISOString();
    const target = toNumber(targetInput, unit);
    const previous = toNumber(baseline, unit);
    const g: Goal = {
      id: edit?.id ?? `g_${Date.now()}`,
      title: title || defaultTitle(type),
      type,
      source,
      target,
      previous,
      current: previous,
      unit,
      period,
      showOnOverview,
      notifyOnReach: notify,
      warnUnderPct: warnPct ? Number(warnPct) : null,
      updatedAt: now,
    };
    onSave(g);
    onClose();
  }

  function defaultTitle(t: GoalType) {
    return t === "sessions"
      ? "Sessions Goal"
      : t === "organic_clicks"
      ? "Organic Clicks Goal"
      : t === "conversions"
      ? "Conversions Goal"
      : t === "engagement_time"
      ? "Avg. Engagement Time Goal"
      : "CTR Goal";
  }

  return (
    <div className="fixed inset-0 z-50" style={{ fontFamily: FONT_STACK }}>
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[94vw] rounded-md bg-white shadow-lg"
        style={{ border: `1px solid ${TOKENS.borderLight}` }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: TOKENS.borderLight }}
        >
          <div className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
            {isEdit ? "Edit Goal" : "Set New Goals"}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Goal Type
              </span>
              <div className="relative">
                <select
                  className="w-full h-9 rounded-md border px-2 cursor-pointer"
                  style={{ borderColor: TOKENS.borderLight }}
                  value={type}
                  onChange={(e) => setType(e.target.value as GoalType)}
                >
                  <option value="sessions">Total Sessions (GA4)</option>
                  <option value="organic_clicks">Organic Clicks (GSC)</option>
                  <option value="conversions">Conversions (GA4)</option>
                  <option value="engagement_time">Avg. Engagement Time (GA4)</option>
                  <option value="ctr">CTR (GSC)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Source
              </span>
              <div className="relative">
                <select
                  className="w-full h-9 rounded-md border px-2 cursor-pointer"
                  style={{ borderColor: TOKENS.borderLight }}
                  value={source}
                  onChange={(e) => setSource(e.target.value as GoalSource)}
                >
                  <option value="ga4">GA4</option>
                  <option value="gsc">GSC</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Title
              </span>
              <input
                className="h-9 rounded-md border px-2"
                style={{ borderColor: TOKENS.borderLight }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Traffic Goal"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Period
              </span>
              <div className="relative">
                <select
                  className="w-full h-9 rounded-md border px-2 cursor-pointer"
                  style={{ borderColor: TOKENS.borderLight }}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
                >
                  <option value="current_month">Current Month</option>
                  <option value="last_30d">Last 30 Days</option>
                  <option value="last_7d">Last 7 Days</option>
                  <option value="custom">Custom</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Target {unit === "seconds" ? "(mm:ss)" : unit === "percent" ? "(%)" : ""}
              </span>
              <input
                className="h-9 rounded-md border px-2"
                style={{ borderColor: TOKENS.borderLight }}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder={
                  unit === "seconds"
                    ? "02:30"
                    : unit === "percent"
                    ? "5.0"
                    : "50000"
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Baseline / Previous {unit === "seconds" ? "(mm:ss)" : unit === "percent" ? "(%)" : ""}
              </span>
              <input
                className="h-9 rounded-md border px-2"
                style={{ borderColor: TOKENS.borderLight }}
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                placeholder={
                  unit === "seconds"
                    ? "01:30"
                    : unit === "percent"
                    ? "4.2"
                    : "32000"
                }
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnOverview}
                onChange={(e) => setShowOnOverview(e.target.checked)}
                className="cursor-pointer"
              />
              Show on Overview
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="cursor-pointer"
              />
              Alert me when reached
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[12px] font-medium" style={{ color: TOKENS.textMuted }}>
                Warn if progress below (%)
              </span>
              <input
                className="h-9 rounded-md border px-2"
                style={{ borderColor: TOKENS.borderLight }}
                value={warnPct}
                onChange={(e) => setWarnPct(e.target.value)}
                placeholder="e.g., 60"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              className="h-9 px-3 rounded-md border text-sm cursor-pointer"
              style={{ borderColor: TOKENS.borderLight }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="h-9 px-3 rounded-md text-sm text-white cursor-pointer"
              style={{ background: TOKENS.brand }}
              onClick={save}
            >
              Save Goal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Goal Card
   ============================================================ */
function GoalCard({
  goal,
  mode,
  onEdit,
  onRemove,
  onBreakdown,
}: {
  goal: Goal;
  mode: "bars" | "dials";
  onEdit: () => void;
  onRemove: () => void;
  onBreakdown: () => void;
}) {
  const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  const tone = progressTone(pct);
  const isLowerBetter = goal.type === "engagement_time" ? false : true;
  const delta =
    goal.previous != null && goal.previous > 0
      ? (goal.current - goal.previous) / goal.previous
      : null;

  return (
    <div
      className="rounded-md border bg-white p-3 transition-[box-shadow,transform]"
      style={{ borderColor: TOKENS.borderLight, boxShadow: TOKENS.shadowSm }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow = TOKENS.shadowMd)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow = TOKENS.shadowSm)
      }
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md"
            style={{ background: TOKENS.pastelBrand, color: TOKENS.brand }}
          >
            {goalIconFor(goal.type)}
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: TOKENS.text }}>
              {goal.title}
            </div>
            <div
              className="text-[12px] flex items-center gap-2"
              style={{ color: TOKENS.textMuted }}
            >
              {sourceChip(goal.source)}
              <span>
                Target:{" "}
                <strong className="text-gray-700">
                  {formatValue(goal.unit, goal.target)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1">
          <button
            className="h-8 px-2 rounded-md border text-sm cursor-pointer"
            style={{ borderColor: TOKENS.borderLight, color: TOKENS.text }}
            onClick={onEdit}
            title="Edit Goal"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            className="h-8 px-2 rounded-md border text-sm cursor-pointer"
            style={{ borderColor: TOKENS.borderLight, color: "#991B1B" }}
            onClick={onRemove}
            title="Remove Goal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* body */}
      <div className="mt-3 grid" style={{ gridTemplateColumns: "auto 1fr", columnGap: 12 }}>
        <div className="min-w-[140px]">
          <div className="text-[22px] font-bold leading-tight" style={{ color: TOKENS.valueBlue }}>
            {formatValue(goal.unit, goal.current)}
          </div>
          <div className="text-[12px] mt-1" style={{ color: TOKENS.textMuted }}>
            {goal.previous != null && (
              <span className="inline-flex items-center gap-2">
                {deltaBadge(delta, isLowerBetter)}
                <span>vs prev.</span>
              </span>
            )}
          </div>
          <div className="text-[12px] mt-1" style={{ color: TOKENS.textMuted }}>
            Progress: <span style={{ color: tone, fontWeight: 600 }}>{fmtPct(pct, 1)}</span>
          </div>

          <div className="mt-2">
            <button
              className="h-8 px-3 rounded-md text-sm text-white cursor-pointer"
              style={{ background: TOKENS.brand }}
              onClick={onBreakdown}
            >
              View Breakdown
            </button>
          </div>
        </div>

        <div className="min-w-0">
          {mode === "bars" ? (
            <div className="pt-1">
              <ProgressBar pct={pct} tone={tone} />
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                  <div>Current</div>
                  <div className="font-semibold text-gray-700">
                    {formatValue(goal.unit, goal.current)}
                  </div>
                </div>
                <div className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                  <div>Target</div>
                  <div className="font-semibold text-gray-700">
                    {formatValue(goal.unit, goal.target)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Dial pct={pct} tone={tone} />
              <div className="text-[12px]" style={{ color: TOKENS.textMuted }}>
                <div>Progress to Goal</div>
                <div className="text-[20px] font-bold" style={{ color: TOKENS.text }}>
                  {fmtPct(pct, 1)}
                </div>
                <div className="mt-1">
                  Target:{" "}
                  <span className="font-semibold text-gray-700">
                    {formatValue(goal.unit, goal.target)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Empty State
   ============================================================ */
function EmptyGoals({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="rounded-md border p-6 bg-white text-center"
      style={{ borderColor: TOKENS.borderLight, fontFamily: FONT_STACK }}
    >
      <div className="text-[15px] font-semibold" style={{ color: TOKENS.text }}>
        Set Project Goals to Track Progress
      </div>
      <div className="mt-1 text-sm" style={{ color: TOKENS.textMuted }}>
        Add up to three goals (e.g., Sessions, Organic Clicks, CTR) and monitor progress over time.
      </div>
      <div className="mt-3">
        <button
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white cursor-pointer"
          style={{ background: TOKENS.brand }}
          onClick={onCreate}
        >
          <Plus className="w-4 h-4" /> Set New Goals
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Section — Progress to Goal
   ============================================================ */
export default function AnalyticsProgressToGoalSection() {
  const { goals, addGoal, updateGoal, removeGoal } = useGoalsStore();
  const visible = goals.filter((g) => g.showOnOverview !== false).slice(0, 6);
  const [mode, setMode] = React.useState<"bars" | "dials">("bars");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editGoal, setEditGoal] = React.useState<Goal | null>(null);

  const totalTarget = visible.reduce(
    (a, g) => a + (g.unit === "percent" || g.unit === "seconds" ? 0 : g.target),
    0
  );
  const totalCurrent = visible.reduce(
    (a, g) => a + (g.unit === "percent" || g.unit === "seconds" ? 0 : g.current),
    0
  );
  const aggregatePct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  function openCreate() {
    setEditGoal(null);
    setModalOpen(true);
  }
  function openEdit(g: Goal) {
    setEditGoal(g);
    setModalOpen(true);
  }
  function saveGoal(g: Goal) {
    if (editGoal) updateGoal(editGoal.id, g);
    else addGoal(g);
  }

  return (
    <SectionShell
      title="Progress to Goal"
      right={
        <div className="flex items-center gap-2">
          <ViewToggle mode={mode} onChange={setMode} />
          <button
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-white cursor-pointer"
            style={{ background: TOKENS.brand }}
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" /> Set New Goals
          </button>
        </div>
      }
    >
      {/* Insight strip */}
      {visible.length > 0 && (
        <div
          className="rounded-md px-3 py-2 border mb-3 flex items-center justify-between gap-3"
          style={{ borderColor: TOKENS.borderLight, background: "#F8FAFC" }}
        >
          <div className="text-sm" style={{ color: TOKENS.text }}>
            <span className="font-semibold">Overall progress</span> across visible goals
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm" style={{ color: TOKENS.textMuted }}>
              Aggregate:{" "}
              <span className="font-semibold text-gray-800">{fmtPct(aggregatePct, 1)}</span>
            </div>
            <div className="hidden sm:block w-[220px]">
              <ProgressBar pct={aggregatePct} tone={progressTone(aggregatePct)} />
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      {visible.length === 0 ? (
        <EmptyGoals onCreate={openCreate} />
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {visible.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              mode={mode}
              onEdit={() => openEdit(g)}
              onRemove={() => removeGoal(g.id)}
              onBreakdown={() =>
                alert(
                  `[Demo] Deep-link to ${g.source.toUpperCase()} breakdown for “${g.title}”`
                )
              }
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <SetNewGoalsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(g) => {
          if (editGoal) {
            saveGoal({ ...g, id: editGoal.id });
          } else {
            saveGoal(g);
          }
        }}
        edit={editGoal}
      />
    </SectionShell>
  );
}
