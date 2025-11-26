"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  X,
  PlusCircle,
  ClipboardList,
  Search,
  Download,
  Lock,
  Monitor,
  Smartphone,
  Globe2,
  ChevronDown,
} from "lucide-react";
import DemoRankTimeline from "./RankTimeline";
import DemoSerpSnapshot from "./SerpSnapshot";
import DemoKeywordAttributes from "./KeywordAttributes";
import DemoLandingPageInsightsSection from "./LandingPageInsights";
import DemoKeywordOpportunitiesGaps from "./KeywordOpportunities";
/* ───────────────────────────────── TOKENS ───────────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  bg: "#FFFFFF",
  appBg: "#F5F7FA",
  danger: "#EF4444",
};

/* ─────────────────────────────── UTILITIES ─────────────────────────────── */
type Device = "desktop" | "mobile";

export interface KeywordDrilldownHeaderProps {
  isOpen: boolean;
  keyword: string;
  device: Device;
  locationISO: string;
  domain: string;
  rank: number | null; // null => Not Ranked
  lastCheckedISO?: string;
  isTracked?: boolean;
  plan?: "free" | "premium";
  onClose: () => void;
  onTrack?: () => void;
  onTask?: () => void;
  onOpenSERP?: () => void;
  onExportCSV?: () => void; // premium
  onExportPDF?: () => void; // premium
  children?: React.ReactNode;
}

const timeAgo = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return `${s}s ago`;
};

const bucketText = (r: number | null) => {
  if (r == null || r > 100) return "Not Ranked";
  if (r <= 3) return "Top 3";
  if (r <= 10) return "Top 10";
  if (r <= 20) return "Top 20";
  if (r <= 50) return "Top 50";
  return "Top 100";
};

/* ─────────────────────────── Atoms: Chips / Buttons ─────────────────────────── */
const Chip = ({
  children,
  muted,
  title,
}: {
  children: React.ReactNode;
  muted?: boolean;
  title?: string;
}) => (
  <span
    title={title}
    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-[5px] text-xs ${
      muted ? "text-gray-600" : "text-gray-800"
    }`}
    style={{ background: TK.appBg, borderColor: TK.border }}
  >
    {children}
  </span>
);

const IconBtn = ({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ borderColor: TK.border, color: TK.text }}
  >
    {children}
  </button>
);

const Btn = ({
  children,
  onClick,
  disabled,
  variant = "outline",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
  title?: string;
}) => {
  const base =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const style =
    variant === "primary"
      ? "text-white"
      : "bg-white border hover:bg-gray-50 text-gray-900";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${style}`}
      style={{
        borderColor: variant === "primary" ? TK.brand : TK.border,
        background: variant === "primary" ? TK.brand : undefined,
      }}
    >
      {children}
    </button>
  );
};

/* Toggle (modern, modular) */
const ToggleSwitch = ({
  active,
  labelOn,
  labelOff,
  onToggle,
  title,
}: {
  active: boolean;
  labelOn: string;
  labelOff: string;
  onToggle: () => void;
  title?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    onClick={onToggle}
    title={title || (active ? labelOn : labelOff)}
    className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs cursor-pointer"
    style={{ borderColor: TK.border, color: TK.text }}
  >
    <span
      className="relative inline-flex h-5 w-9 items-center rounded-full border"
      style={{
        borderColor: active ? TK.brand : TK.border,
        background: active ? "rgba(0,140,205,0.15)" : TK.appBg,
      }}
    >
      <span
        className="absolute h-4 w-4 rounded-full transition-transform"
        style={{
          background: active ? TK.brand : "#CBD5E1",
          transform: active ? "translateX(20px)" : "translateX(2px)",
        }}
      />
    </span>
    <span className="text-[13px]">{active ? labelOn : labelOff}</span>
  </button>
);

/* Favicon with graceful fallback to letter avatar */
const Favicon = ({ domain }: { domain: string }) => {
  const [err, setErr] = useState(false);
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=32`;
  if (err)
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-bold"
        style={{ background: "hsl(200 80% 92%)", color: "hsl(200 60% 32%)" }}
        aria-hidden
      >
        {domain.charAt(0).toUpperCase()}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-4 w-4 rounded-sm"
      onError={() => setErr(true)}
      aria-hidden
    />
  );
};

/* Click outside hook for the export menu */
function useClickOutside(ref: React.RefObject<HTMLElement |null>, onAway: () => void) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current) return;
      if (ref.current.contains(t)) return;
      onAway();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onAway]);
}

/* ───────────────────────────────── COMPONENT ─────────────────────────────── */
export function KeywordDrilldownHeader({
  isOpen,
  keyword,
  device,
  locationISO,
  domain,
  rank,
  lastCheckedISO,
  isTracked = false,
  plan = "premium",
  onClose,
  onTrack,
  onTask,
  onOpenSERP,
  onExportCSV,
  onExportPDF,
  children,
}: KeywordDrilldownHeaderProps) {
  const [open, setOpen] = useState(isOpen);
  useEffect(() => setOpen(isOpen), [isOpen]);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  useClickOutside(exportRef, () => setExportOpen(false));

  const DeviceIcon = device === "desktop" ? Monitor : Smartphone;

  const rankBadge = useMemo(() => {
    const label = bucketText(rank);
    const isNR = label === "Not Ranked";
    return (
      <div className="flex flex-col items-center">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
            isNR ? "text-white" : "text-white"
          }`}
          style={{
            background: isNR ? TK.danger : TK.brand,
          }}
          title={isNR ? "Not Ranked" : `Rank #${rank}`}
        >
          {isNR ? "Not Ranked" : `#${rank}`}
        </span>
        <span className="mt-1 text-[11px] text-gray-600">{label}</span>
      </div>
    );
  }, [rank]);

  if (!open) return null;

  return (
    <section
      className="inset-0 w-full"
      style={{
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label={`Keyword drilldown for ${keyword}`}
    >
      {/* Backdrop */}

      {/* Panel */}
    
        {/* Header */}
        <header
          className="sticky top-0 z-10 border-b bg-white"
          style={{ borderColor: TK.border }}
        >
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
            {/* LEFT: keyword + tags */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5" style={{ color: TK.brand }} />
                <h2
                  className="truncate text-[18px] font-semibold"
                  style={{ color: TK.text }}
                  title={keyword}
                >
                  {keyword}
                </h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Chip title={`Device: ${device}`}>
                  <DeviceIcon className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                  <span className="capitalize">{device}</span>
                </Chip>
                <Chip title={`Country / Location`}>
                  <Globe2 className="h-3.5 w-3.5" style={{ color: TK.brand }} />
                  <span>{locationISO}</span>
                </Chip>
                <Chip title={`Project domain: ${domain}`}>
                  <Favicon domain={domain} />
                  <span className="truncate">{domain}</span>
                </Chip>
                {/* Rank bucket as a tag chip */}
                <Chip muted title="Rank bucket">
                  {bucketText(rank)}
                </Chip>
              </div>
            </div>

            {/* CENTER: rank + last updated */}
            <div className="hidden sm:flex flex-col items-center justify-center">
              {rankBadge}
              <div
                className="mt-1 text-[12px]"
                style={{ color: TK.muted }}
                title={lastCheckedISO ? new Date(lastCheckedISO).toUTCString() : "—"}
              >
                Last checked: {timeAgo(lastCheckedISO)}
              </div>
            </div>

            {/* RIGHT: actions */}
            <div className="flex items-center justify-end gap-2">
              {/* Tracked toggle (modern) */}
              <ToggleSwitch
                active={isTracked}
                labelOn="Tracked"
                labelOff="Track"
                title="Toggle tracking"
                onToggle={() => onTrack?.()}
              />

              {!isTracked && (
                <IconBtn title="Add to Rank Tracker" onClick={() => onTrack?.()}>
                  <PlusCircle className="h-5 w-5" style={{ color: TK.brand }} />
                </IconBtn>
              )}

              <IconBtn title="Assign Task" onClick={() => onTask?.()}>
                <ClipboardList className="h-5 w-5" style={{ color: TK.brand }} />
              </IconBtn>

              <IconBtn title="Open SERP Preview" onClick={() => onOpenSERP?.()}>
                <Search className="h-5 w-5" style={{ color: TK.brand }} />
              </IconBtn>

              {/* Export */}
              <div className="relative" ref={exportRef}>
                <Btn
                  variant="outline"
                  title={plan === "free" ? "Export (Premium)" : "Export"}
                  onClick={() => setExportOpen((v) => !v)}
                  disabled={plan === "free"}
                >
                  <Download
                    className="h-4 w-4"
                    style={{ color: plan === "free" ? "#9CA3AF" : TK.brand }}
                  />
                  Export
                  {plan === "free" && <Lock className="h-4 w-4 text-gray-400" />}
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Btn>

                {exportOpen && (
                  <div
                    className="absolute right-0 mt-1 w-44 rounded-md border bg-white p-1 shadow-xl"
                    style={{ borderColor: TK.border }}
                    role="menu"
                    aria-label="Export options"
                  >
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        onExportCSV?.();
                        setExportOpen(false);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        onExportPDF?.();
                        setExportOpen(false);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                )}
              </div>

              {/* <IconBtn title="Close" onClick={onClose}>
                <X className="h-5 w-5" />
              </IconBtn> */}
            </div>
          </div>
        </header>

        {/* Body (slot for drilldown sections) */}
       {/* <DemoRankTimeline />
            <DemoSerpSnapshot />
            <DemoKeywordAttributes />
            <DemoLandingPageInsightsSection />
            <DemoKeywordOpportunitiesGaps /> */}

    </section>
  );
}

/* ───────────────────────────── DEMO (optional) ───────────────────────────── */
export default function DemoKeywordDrilldownHeader() {
  const nowISO = new Date(Date.now() - 1000 * 60 * 47).toISOString(); // 47m ago
  return (
    <>
        <KeywordDrilldownHeader
      isOpen
      keyword="keyword research tools"
      device="desktop"
      locationISO="IN"
      domain="wranker.com"
      rank={7}
      lastCheckedISO={nowISO}
      isTracked={false}
      plan="premium"
      onClose={() => alert("Close drawer")}
      onTrack={() => alert("Toggle tracking")}
      onTask={() => alert("Assign task")}
      onOpenSERP={() => alert("Open SERP")}
      onExportCSV={() => alert("CSV")}
      onExportPDF={() => alert("PDF")}
    />
    </>
  );
}
