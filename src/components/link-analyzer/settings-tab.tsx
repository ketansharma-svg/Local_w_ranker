"use client";

import React, { useMemo, useState } from "react";
import {
  Settings2,
  Link2,
  Repeat2,
  Type,
  Shield,
  Gauge,
  Bell,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";

/**
 * Panel: Internal Link Analyzer → External Links
 * Section: Settings
 * - Matches recent design patterns (Inter font, brand tokens, modular buttons/toggles)
 * - Branded icons for panel + section titles
 * - No emojis used
 * - Drop‑in, self‑contained (no external UI lib dependencies)
 */

/* ----------------------------- Design Tokens ----------------------------- */
const TOKENS = {
  brand: "#008CCD",
  coreBlue: "#4286F5",
  text: "#111827",
  muted: "#6B7280",
  border: "#EFF0F6",
  panelBg: "#F5F7FA",
};

const rootVars: React.CSSProperties = {
  ["--wr-brand" as any]: TOKENS.brand,
  ["--wr-core" as any]: TOKENS.coreBlue,
  ["--wr-text" as any]: TOKENS.text,
  ["--wr-muted" as any]: TOKENS.muted,
  ["--wr-border" as any]: TOKENS.border,
  fontFamily:
    'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* ----------------------------- Defaults / State -------------------------- */
const DEFAULTS = {
  tracking: {
    trackExternal: true,
    trackNoFollow: false,
    ignoreEmpty: true,
    anchorLenMin: 1,
    anchorLenMax: 10,
  },
  redirects: {
    maxDepth: 2,
    treat302Permanent: false,
    autoFlagLoops: true,
  },
  scoring: {
    redirectPenaltyPct: 20,
    enabled: true,
  },
};

/* ----------------------------- Primitives -------------------------------- */
const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

const Button = ({
  variant = "brand",
  size = "sm",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "brand" | "outline" | "ghost";
  size?: "sm" | "xs";
}) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center gap-2 rounded-[6px] transition cursor-pointer",
      size === "sm" && "h-9 px-3 text-sm",
      size === "xs" && "h-8 px-2 text-xs",
      variant === "brand" && "bg-[color:var(--wr-brand)] text-white hover:opacity-95",
      variant === "outline" &&
        "border border-[color:var(--wr-border)] bg-white text-[color:var(--wr-text)] hover:bg-[#F5F7FA]",
      variant === "ghost" && "bg-transparent text-[color:var(--wr-text)] hover:bg-[#F5F7FA]",
      className
    )}
  />
);

const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      "h-9 w-full rounded-[6px] border border-[color:var(--wr-border)] px-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--wr-core)]",
      className
    )}
  />
);

const Switch = ({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  label?: React.ReactNode;
  onChange: (v: boolean) => void;
}) => (
  <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer">
    <span
      className={cn(
        "w-10 h-6 rounded-full transition inline-flex items-center p-1",
        checked ? "bg-[color:var(--wr-brand)]" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "w-4 h-4 rounded-full bg-white shadow transition",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </span>
    {label && <span className="text-sm text-[color:var(--wr-text)]">{label}</span>}
    <input
      id={id}
      type="checkbox"
      className="hidden"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  </label>
);

const Checkbox = ({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) => (
  <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer">
    <input
      id={id}
      type="checkbox"
      className="h-4 w-4 rounded border border-[color:var(--wr-border)]"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="text-sm text-[color:var(--wr-muted)]">{label}</span>
  </label>
);

const SectionCard = ({
  icon: Icon,
  title,
  modified,
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  modified?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-md border border-[color:var(--wr-border)]">
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[color:var(--wr-brand)]" />
          <h3 className="text-[16px] font-semibold text-[color:var(--wr-text)]">{title}</h3>
          {modified && (
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-label="Modified" />
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[color:var(--wr-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[color:var(--wr-muted)]" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

const ActionsRow = ({
  onSave,
  onReset,
  applyAll,
  onToggleApplyAll,
}: {
  onSave: () => void;
  onReset: () => void;
  applyAll: boolean;
  onToggleApplyAll: (v: boolean) => void;
}) => (
  <div className="flex flex-wrap items-center gap-3 mt-4">
    <Button onClick={onSave}>
      <Save className="h-4 w-4" /> Save
    </Button>
    <Button variant="outline" onClick={onReset}>
      <RotateCcw className="h-4 w-4" /> Reset
    </Button>
    <div className="ml-auto">
      <Checkbox
        id="apply-all"
        checked={applyAll}
        onChange={onToggleApplyAll}
        label="Apply to all projects"
      />
    </div>
  </div>
);

/* ----------------------------- Sections ---------------------------------- */
function SectionTracking() {
  const [external, setExternal] = useState(DEFAULTS.tracking.trackExternal);
  const [nofollow, setNofollow] = useState(DEFAULTS.tracking.trackNoFollow);
  const [ignoreEmpty, setIgnoreEmpty] = useState(DEFAULTS.tracking.ignoreEmpty);
  const [minLen, setMinLen] = useState(DEFAULTS.tracking.anchorLenMin);
  const [maxLen, setMaxLen] = useState(DEFAULTS.tracking.anchorLenMax);
  const [applyAll, setApplyAll] = useState(false);

  const modified = useMemo(
    () =>
      external !== DEFAULTS.tracking.trackExternal ||
      nofollow !== DEFAULTS.tracking.trackNoFollow ||
      ignoreEmpty !== DEFAULTS.tracking.ignoreEmpty ||
      minLen !== DEFAULTS.tracking.anchorLenMin ||
      maxLen !== DEFAULTS.tracking.anchorLenMax,
    [external, nofollow, ignoreEmpty, minLen, maxLen]
  );

  return (
    <SectionCard icon={Link2} title="Link Tracking Preferences" modified={modified} defaultOpen>
      <div className="space-y-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Track External Links</span>
          <Switch id="trackExternal" checked={external} onChange={setExternal} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Include NoFollow Links</span>
          <Switch id="trackNofollow" checked={nofollow} onChange={setNofollow} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Ignore Empty / Image‑only Anchors</span>
          <Switch id="ignoreEmpty" checked={ignoreEmpty} onChange={setIgnoreEmpty} />
        </div>

        {/* Anchor length (min/max) */}
        <div>
          <div className="mb-2 text-[color:var(--wr-text)]">Anchor Text Length Limit</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--wr-muted)]">Min</span>
              <Input
                type="number"
                min={1}
                max={15}
                value={minLen}
                onChange={(e) => setMinLen(Math.min(Number(e.target.value) || 1, maxLen))}
                className="w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--wr-muted)]">Max</span>
              <Input
                type="number"
                min={minLen}
                max={30}
                value={maxLen}
                onChange={(e) => setMaxLen(Math.max(Number(e.target.value) || minLen, minLen))}
                className="w-20"
              />
            </div>
            <div className="text-sm text-[color:var(--wr-muted)]">
              {minLen} – {maxLen} words
            </div>
          </div>
        </div>
      </div>

      <ActionsRow
        onSave={() => {}}
        onReset={() => {
          setExternal(DEFAULTS.tracking.trackExternal);
          setNofollow(DEFAULTS.tracking.trackNoFollow);
          setIgnoreEmpty(DEFAULTS.tracking.ignoreEmpty);
          setMinLen(DEFAULTS.tracking.anchorLenMin);
          setMaxLen(DEFAULTS.tracking.anchorLenMax);
          setApplyAll(false);
        }}
        applyAll={applyAll}
        onToggleApplyAll={setApplyAll}
      />
    </SectionCard>
  );
}

function SectionRedirects() {
  const [maxDepth, setMaxDepth] = useState(DEFAULTS.redirects.maxDepth);
  const [treat302, setTreat302] = useState(DEFAULTS.redirects.treat302Permanent);
  const [flagLoops, setFlagLoops] = useState(DEFAULTS.redirects.autoFlagLoops);
  const [whitelist, setWhitelist] = useState("");
  const [applyAll, setApplyAll] = useState(false);

  const modified = useMemo(
    () =>
      maxDepth !== DEFAULTS.redirects.maxDepth ||
      treat302 !== DEFAULTS.redirects.treat302Permanent ||
      flagLoops !== DEFAULTS.redirects.autoFlagLoops ||
      whitelist.trim().length > 0,
    [maxDepth, treat302, flagLoops, whitelist]
  );

  return (
    <SectionCard icon={Repeat2} title="Redirect Behavior Rules" modified={modified} defaultOpen>
      <div className="space-y-4 mt-2">
        <div>
          <div className="mb-1 text-[color:var(--wr-text)]">Max Redirect Chain Depth</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-64 accent-[color:var(--wr-core)]"
            />
            <span className="text-sm text-[color:var(--wr-text)] font-medium">{maxDepth}</span>
          </div>
          {maxDepth > 4 && (
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              May create crawl delays
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Treat 302 as Permanent</span>
          <Switch id="treat302" checked={treat302} onChange={setTreat302} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Auto‑Flag Loops</span>
          <Switch id="flagLoops" checked={flagLoops} onChange={setFlagLoops} />
        </div>

        <div>
          <Input
            placeholder="Whitelist destinations (comma separated)"
            value={whitelist}
            onChange={(e) => setWhitelist(e.target.value)}
          />
        </div>
      </div>

      <ActionsRow
        onSave={() => {}}
        onReset={() => {
          setMaxDepth(DEFAULTS.redirects.maxDepth);
          setTreat302(DEFAULTS.redirects.treat302Permanent);
          setFlagLoops(DEFAULTS.redirects.autoFlagLoops);
          setWhitelist("");
          setApplyAll(false);
        }}
        applyAll={applyAll}
        onToggleApplyAll={setApplyAll}
      />
    </SectionCard>
  );
}

function SectionAnchors() {
  const [aqsEnabled, setAqsEnabled] = useState(true);
  const [threshold, setThreshold] = useState(50);
  const [genericAnchors, setGenericAnchors] = useState("");
  const [applyAll, setApplyAll] = useState(false);

  const modified = aqsEnabled !== true || threshold !== 50 || genericAnchors.trim().length > 0;

  return (
    <SectionCard icon={Type} title="Anchor Evaluation Settings" modified={modified} defaultOpen>
      <div className="space-y-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Enable AQS</span>
          <Switch id="aqs" checked={aqsEnabled} onChange={setAqsEnabled} />
        </div>

        <div>
          <div className="mb-1 text-[color:var(--wr-text)]">Threshold</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-64 accent-[color:var(--wr-core)]"
            />
            <span className="text-sm text-[color:var(--wr-text)] font-medium">{threshold}</span>
          </div>
        </div>

        <Input
          placeholder="Generic Anchors (comma separated)"
          value={genericAnchors}
          onChange={(e) => setGenericAnchors(e.target.value)}
        />
      </div>

      <ActionsRow
        onSave={() => {}}
        onReset={() => {
          setAqsEnabled(true);
          setThreshold(50);
          setGenericAnchors("");
          setApplyAll(false);
        }}
        applyAll={applyAll}
        onToggleApplyAll={setApplyAll}
      />
    </SectionCard>
  );
}

function SectionExclusions() {
  const [subdomains, setSubdomains] = useState("");
  const [fileTypes, setFileTypes] = useState("");
  const [regex, setRegex] = useState("");
  const [applyAll, setApplyAll] = useState(false);

  const modified = !!(subdomains.trim() || fileTypes.trim() || regex.trim());

  return (
    <SectionCard icon={Shield} title="Link Type Inclusion & Exclusion" modified={modified}>
      <div className="space-y-4 mt-2">
        <Input
          placeholder="Exclude Subdomains (cdn.domain.com)"
          value={subdomains}
          onChange={(e) => setSubdomains(e.target.value)}
        />
        <Input
          placeholder="File Type Exclusions (.pdf, .jpg)"
          value={fileTypes}
          onChange={(e) => setFileTypes(e.target.value)}
        />
        <Input
          placeholder="Custom Regex Patterns"
          value={regex}
          onChange={(e) => setRegex(e.target.value)}
        />
      </div>

      <ActionsRow
        onSave={() => {}}
        onReset={() => {
          setSubdomains("");
          setFileTypes("");
          setRegex("");
          setApplyAll(false);
        }}
        applyAll={applyAll}
        onToggleApplyAll={setApplyAll}
      />
    </SectionCard>
  );
}

function SectionScoring() {
  const [enabled, setEnabled] = useState(DEFAULTS.scoring.enabled);
  const [penalty, setPenalty] = useState(DEFAULTS.scoring.redirectPenaltyPct);
  const [applyAll, setApplyAll] = useState(false);

  const modified = enabled !== DEFAULTS.scoring.enabled || penalty !== DEFAULTS.scoring.redirectPenaltyPct;

  return (
    <SectionCard icon={Gauge} title="Scoring System Configurations" modified={modified}>
      <div className="space-y-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Enable Scoring</span>
          <Switch id="scoreEnabled" checked={enabled} onChange={setEnabled} />
        </div>
        <div>
          <div className="mb-1 text-[color:var(--wr-text)]">Redirect Chain Penalty</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={penalty}
              onChange={(e) => setPenalty(Number(e.target.value))}
              className="w-64 accent-[color:var(--wr-core)]"
            />
            <span className="text-sm text-[color:var(--wr-text)] font-medium">{penalty}%</span>
          </div>
        </div>
      </div>

      <ActionsRow
        onSave={() => {}}
        onReset={() => {
          setEnabled(DEFAULTS.scoring.enabled);
          setPenalty(DEFAULTS.scoring.redirectPenaltyPct);
          setApplyAll(false);
        }}
        applyAll={applyAll}
        onToggleApplyAll={setApplyAll}
      />
    </SectionCard>
  );
}

function SectionAutomation() {
  const [over50, setOver50] = useState(true);
  const [loops, setLoops] = useState(true);
  const [recipients, setRecipients] = useState("");
  const [applyAll, setApplyAll] = useState(false);

  const modified = over50 !== true || loops !== true || recipients.trim().length > 0;

  return (
    <SectionCard icon={Bell} title="Automation & Notifications" modified={modified} defaultOpen>
      <div className="space-y-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Broken Links &gt; 50</span>
          <Switch id="alert50" checked={over50} onChange={setOver50} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--wr-text)]">Redirect Loops</span>
          <Switch id="alertLoops" checked={loops} onChange={setLoops} />
        </div>
        <Input
          placeholder="Recipients (emails)"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />
      </div>

      <ActionsRow
        onSave={() => {}}
        onReset={() => {
          setOver50(true);
          setLoops(true);
          setRecipients("");
          setApplyAll(false);
        }}
        applyAll={applyAll}
        onToggleApplyAll={setApplyAll}
      />
    </SectionCard>
  );
}

/* ----------------------------- Smoke Tests (visual) ---------------------- */
function runSmokeTests() {
  return [
    { name: "Default: Track External ON", pass: DEFAULTS.tracking.trackExternal === true },
    { name: "Default: NoFollow OFF", pass: DEFAULTS.tracking.trackNoFollow === false },
    { name: "Default: Ignore Empty ON", pass: DEFAULTS.tracking.ignoreEmpty === true },
    { name: "Default: Redirect depth = 2", pass: DEFAULTS.redirects.maxDepth === 2 },
    { name: "Default: 302 Permanent OFF", pass: DEFAULTS.redirects.treat302Permanent === false },
    { name: "Default: Flag Loops ON", pass: DEFAULTS.redirects.autoFlagLoops === true },
    { name: "Default: Scoring enabled", pass: DEFAULTS.scoring.enabled === true },
    { name: "Default: Redirect penalty 20%", pass: DEFAULTS.scoring.redirectPenaltyPct === 20 },
  ];
}

const StatusPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
      ok ? "bg-[#ECFDF5] text-[#047857] border-[#D1FAE5]" : "bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]"
    )}
  >
    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} {label}
  </span>
);

/* ----------------------------- Main Export -------------------------------- */
export default function LinkAnalyzerSettingsTab() {
  const tests = runSmokeTests();
  const allPass = tests.every((t) => t.pass);

  return (
    <div className="p-6 space-y-6" style={{ ...rootVars, backgroundColor: TOKENS.panelBg }}>
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[color:var(--wr-brand)]" />
            <h2 className="text-lg font-semibold text-[color:var(--wr-text)]">
              External Links — Settings
            </h2>
          </div>
          <p className="text-sm text-[color:var(--wr-muted)]">
            Configure tracking rules, redirect handling, scoring, exclusions and alerts.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        <SectionTracking />
        <SectionRedirects />
        <SectionAnchors />
        <SectionExclusions />
        <SectionScoring />
        <SectionAutomation />
      </div>

      {/* Smoke tests (visual confidence only) */}
      <div className="rounded-md border border-[color:var(--wr-border)] bg-white p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[color:var(--wr-text)]">Smoke Tests</div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs border",
              allPass
                ? "bg-[#ECFDF5] text-[#047857] border-[#D1FAE5]"
                : "bg-[#FFF7ED] text-[#92400E] border-[#FFEDD5]"
            )}
          >
            {allPass ? "All passing" : "Some failing"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tests.map((t) => (
            <StatusPill key={t.name} ok={t.pass} label={t.name} />
          ))}
        </div>
      </div>
    </div>
  );
}
