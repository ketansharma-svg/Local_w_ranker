"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Lock,
  ArrowRight,
  DollarSign,
  Percent,
  Trash2,
  Info,
  LineChart,
} from "lucide-react";

/* ───────────────────────── Tokens ───────────────────────── */
const TK = {
  border: "var(--wr-border,#E5E7EB)",
  borderLight: "var(--wr-borderLight,#EFF0F6)",
  text: "var(--wr-text-strong,#111827)",
  muted: "var(--wr-muted,#6B7280)",
  brand: "#008CCD", // branded icon color
  ok: "#10B981",
  warn: "#F59E0B",
  danger: "#EF4444",
  radius: "12px",
};

const FONTS = {
  fontFamily:
    'Inter, "Inter Fallback", system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
};

type Plan = "free" | "pro" | "enterprise";

type TrackedCompetitor = {
  domain: string;
  trafficValue?: number; // e.g. 142000
  overlapPct?: number; // 0..100
  sharedKeywords?: number; // optional
  faviconUrl?: string;
};

type Candidate = {
  domain: string;
  sharedKeywords?: number;
  overlapPct?: number;
  trafficValue?: number;
};

export type AddToTrackerModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
 onClose: () => void 
  /** User plan */
  plan: Plan;

  /** Plan limit for tracked competitors (e.g. 1 free, 3 pro, 20 enterprise) */
  limit: number;

  /** Currently tracked competitors (must be >= limit to show this modal) */
  currentTracked: TrackedCompetitor[] ;

  /** The competitor the user is trying to add */
  newCompetitor: Candidate;

  /** Fired when user confirms replacement (remove → add) */
  onReplace: (removeDomain: string, add: Candidate) => void;

  /** Optional: fired when user clicks Upgrade */
  onUpgrade?: () => void;

  /** Optional: allow removing competitor directly from list */
  onRemoveTracked?: (domain: string) => void;

  /** Optional: custom toast/notify hook. Fallback is window.alert */
  notify?: (msg: string) => void;
};

/* ───────────────────────── Helpers ───────────────────────── */
function fmtCurrency(n?: number) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}
function fmtPct(n?: number) {
  if (n == null) return "—";
  return `${Math.round(n)}%`;
}

const RowStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}> = ({ icon, label, value }) => (
  <div className="inline-flex items-center gap-2 text-xs text-gray-600">
    <span
      className="inline-flex items-center justify-center h-5 w-5 rounded"
      style={{ background: "#E6F6FC", color: TK.brand }}
    >
      {icon}
    </span>
    <span className="text-gray-500">{label}:</span>
    <span className="font-medium text-gray-800">{value}</span>
  </div>
);

const FaviconDot: React.FC<{ src?: string; alt?: string }> = ({ src, alt }) =>
  src ? (
    <img
      src={src}
      alt={alt || ""}
      className="h-4 w-4 rounded"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span className="inline-block h-4 w-4 rounded bg-gray-300" />
  );

/* modern chip */
const Chip: React.FC<
  React.PropsWithChildren<{ tone?: "neutral" | "brand"; title?: string }>
> = ({ tone = "neutral", title, children }) => (
  <span
    title={title}
    className={`inline-flex items-center h-7 rounded-full border px-3 text-xs ${
      tone === "brand"
        ? "bg-[#F0FAFF] border-[#BFE9FF] text-[#0F5CA6]"
        : "bg-white text-gray-700"
    }`}
    style={{ borderColor: TK.border }}
  >
    {children}
  </span>
);

/* favicon helper from domain */
const faviconFromDomain = (domain?: string) =>
  domain ? `https://www.google.com/s2/favicons?sz=32&domain=${domain}` : undefined;

/* ───────────────────────── Component ───────────────────────── */
export function AddToTrackerModal({
  open,
  onOpenChange,
  plan,
  limit,
  currentTracked,
  newCompetitor,
  onReplace,
  onUpgrade,
  onRemoveTracked,
  notify,
  onClose,
}: AddToTrackerModalProps) {
  const [selected, setSelected] = React.useState<string>(
    currentTracked[0]?.domain || ""
  );
  const proLocked = plan === "free";
  const overLimit = currentTracked.length >= limit;

  React.useEffect(() => {
    // Reset selection each open (choose first item)
    if (open) setSelected(currentTracked[0]?.domain || "");
  }, [open, currentTracked]);

  const confirmReplace = () => {
    if (proLocked) return;
    if (!selected && overLimit) return;
    if (overLimit) {
      onReplace(selected, newCompetitor);
      (notify || window.alert)(
        `${newCompetitor.domain} was added, replacing ${selected}.`
      );
    } else {
      // add without replacement → remove nothing
      onReplace("", newCompetitor);
      (notify || window.alert)(`${newCompetitor.domain} was added.`);
    }
    onOpenChange(false);
  };

  /* derived favicons */
  const newFav = faviconFromDomain(newCompetitor.domain);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] p-0 overflow-hidden"
        style={{ borderRadius: TK.radius, borderColor: TK.border, ...FONTS }}
      >
        {/* Header */}
                <div style={{zIndex:"1",backgroundColor:"white",height:"40px"}}>
            <button className="float-right cursor-pointer text-[22px]" onClick={onClose}>✕</button>
            </div>
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {/* Branded icon for modal title */}
                <div className="mt-[2px] rounded-full bg-[#E6F6FC] p-1.5">
                  <LineChart className="h-4 w-4" style={{ color: TK.brand }} />
                </div>
                <div>
                  <DialogTitle className="text-[17px] font-semibold">
                    {overLimit ? "Competitor Limit Reached" : "Add Competitor"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    {overLimit
                      ? `You can track up to ${limit} competitor${
                          limit === 1 ? "" : "s"
                        } on your plan. Choose one to replace.`
                      : `Add ${newCompetitor.domain} to your tracked competitors.`}
                  </DialogDescription>
                </div>
              </div>

              {/* Right side header chips */}
              <div className="hidden sm:flex items-center gap-2">
                <Chip tone="brand" title="Current plan">
                  Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Chip>
                <Chip title="Tracked / Limit">
                  {currentTracked.length} / {limit} tracked
                </Chip>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Separator />

        {/* Optional alert banner for free/limit states */}
        {(proLocked || overLimit) && (
          <div className="px-5 pt-3">
            {proLocked && (
              <div
                className="rounded-md border p-3 flex items-start gap-3"
                style={{ borderColor: TK.borderLight, background: "#F0FAFF" }}
              >
                <Lock className="h-4 w-4 text-gray-500 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-gray-800">
                    Upgrade to track more competitors
                  </div>
                  <div className="text-gray-600">
                    Free plan allows limited tracked competitors. Upgrade to add
                    & manage a larger list.
                  </div>
                </div>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    className="h-8 cursor-pointer"
                    onClick={() =>
                      onUpgrade ? onUpgrade() : window.alert("Upgrade flow")
                    }
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            )}

            {overLimit && !proLocked && (
              <div
                className="mt-2 rounded-md border p-2.5 text-xs flex items-center gap-2"
                style={{
                  borderColor: "#FEE2E2",
                  background: "#FEF2F2",
                  color: "#B91C1C",
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                You’ve reached your competitor limit. Select one to replace.
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* New competitor preview */}
          <div
            className="rounded-md border p-3"
            style={{ borderColor: TK.borderLight, background: "#FBFDFF" }}
          >
            <div className="flex items-start gap-2">
              <FaviconDot src={newFav} alt={newCompetitor.domain} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className="truncate font-medium text-[15px]"
                    style={{ color: TK.text }}
                  >
                    {newCompetitor.domain}
                  </div>
                  <Badge
                    className="h-5 px-2"
                    variant="secondary"
                    style={{
                      background: "#E6F4FF",
                      color: TK.brand,
                      border: `1px solid ${TK.borderLight}`,
                    }}
                  >
                    NEW
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <RowStat
                    icon={<Percent className="h-3.5 w-3.5" />}
                    label="Overlap"
                    value={fmtPct(newCompetitor.overlapPct)}
                  />
                  <RowStat
                    icon={<DollarSign className="h-3.5 w-3.5" />}
                    label="Traffic value"
                    value={fmtCurrency(newCompetitor.trafficValue)}
                  />
                  {typeof newCompetitor.sharedKeywords === "number" && (
                    <div className="text-xs text-gray-600">
                      {newCompetitor.sharedKeywords.toLocaleString()} shared
                      keywords
                    </div>
                  )}
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Preview of the domain you’re adding.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Tracked list (radio to replace) */}
          {overLimit && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                Currently Tracked
              </div>
              <div
                className="rounded-md border"
                style={{ borderColor: TK.border }}
              >
                <ScrollArea className="max-h-[260px]">
                  <RadioGroup value={selected} onValueChange={setSelected}>
                    {currentTracked.map((c) => (
                      <label
                        key={c.domain}
                        className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-[#F7FAFC]"
                        style={{ borderColor: TK.borderLight }}
                        title={`Replace ${c.domain}`}
                      >
                        <RadioGroupItem value={c.domain} />
                        <FaviconDot
                          src={
                            c.faviconUrl || faviconFromDomain(c.domain)
                          }
                          alt={c.domain}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="truncate text-[14px] underline decoration-transparent hover:decoration-inherit cursor-pointer"
                              style={{ color: TK.brand }}
                            >
                              {c.domain}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            <RowStat
                              icon={<DollarSign className="h-3.5 w-3.5" />}
                              label="Traffic value"
                              value={fmtCurrency(c.trafficValue)}
                            />
                            <RowStat
                              icon={<Percent className="h-3.5 w-3.5" />}
                              label="Overlap"
                              value={fmtPct(c.overlapPct)}
                            />
                            {typeof c.sharedKeywords === "number" && (
                              <div className="text-xs text-gray-600">
                                {c.sharedKeywords.toLocaleString()} shared KW
                              </div>
                            )}
                          </div>
                        </div>

                        {onRemoveTracked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="rounded p-1 hover:bg-rose-50 cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onRemoveTracked(c.domain);
                                  }}
                                  aria-label={`Remove ${c.domain}`}
                                  title={`Remove ${c.domain}`}
                                >
                                  <Trash2 className="h-4 w-4 text-rose-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Remove from tracker
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </label>
                    ))}
                  </RadioGroup>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Optional: small note / import helper */}
          {!overLimit && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Info className="h-3.5 w-3.5" />
              You have a free slot. Confirm to add this competitor.
            </div>
          )}

          {/* Optional: quick add note */}
          <div className="hidden">
            <Input placeholder="(Reserved spot for future tags input)" />
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-5 py-3 gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="h-9 cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>

          {proLocked ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled className="h-9">
                    {overLimit ? "Replace Selected Competitor" : "Confirm Add"}
                    <Lock className="ml-2 h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Upgrade required to add more competitors.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              className="h-9 cursor-pointer"
              onClick={confirmReplace}
              disabled={overLimit && !selected}
            >
              {overLimit ? "Replace Selected Competitor" : "Confirm Add"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Demo Harness (optional) ───────────────────────── */
export default function Demo_AddToTrackerModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = React.useState(true);
  const [plan, setPlan] = React.useState<Plan>("pro");
  const [tracked, setTracked] = React.useState<TrackedCompetitor[]>([
    {
      domain: "ahrefs.com",
      trafficValue: 420000,
      overlapPct: 38,
      sharedKeywords: 1240,
      faviconUrl:
        "https://www.google.com/s2/favicons?sz=32&domain=ahrefs.com",
    },
    {
      domain: "semrush.com",
      trafficValue: 510000,
      overlapPct: 42,
      sharedKeywords: 1560,
      faviconUrl:
        "https://www.google.com/s2/favicons?sz=32&domain=semrush.com",
    },
    {
      domain: "moz.com",
      trafficValue: 210000,
      overlapPct: 29,
      sharedKeywords: 820,
      faviconUrl: "https://www.google.com/s2/favicons?sz=32&domain=moz.com",
    },
  ]);

  const limitByPlan: Record<Plan, number> = {
    free: 1,
    pro: 3,
    enterprise: 20,
  };
  const limit = limitByPlan[plan];

  const candidate: Candidate = {
    domain: "seranking.com",
    overlapPct: 35,
    trafficValue: 160000,
    sharedKeywords: 930,
  };

  const notify = (msg: string) => {
    // Replace with your toast() implementation
    alert(msg);
  };

  const onReplace = (removeDomain: string, add: Candidate) => {
    if (!removeDomain) {
      // Add (if space available)
      setTracked((prev) => [
        ...prev,
        {
          domain: add.domain,
          overlapPct: add.overlapPct,
          trafficValue: add.trafficValue,
          sharedKeywords: add.sharedKeywords,
          faviconUrl: faviconFromDomain(add.domain),
        },
      ]);
      return;
    }
    setTracked((prev) => {
      const filtered = prev.filter((t) => t.domain !== removeDomain);
      return [
        ...filtered,
        {
          domain: add.domain,
          overlapPct: add.overlapPct,
          trafficValue: add.trafficValue,
          sharedKeywords: add.sharedKeywords,
          faviconUrl: faviconFromDomain(add.domain),
        },
      ];
    });
  };

  const onRemoveTracked = (domain: string) => {
    setTracked((prev) => prev.filter((t) => t.domain !== domain));
  };

  return (
<>
 <AddToTrackerModal
        open={open}
        onOpenChange={setOpen}
        plan={plan}
        limit={limit}
        currentTracked={tracked}
        newCompetitor={candidate}
        onReplace={onReplace}
        onUpgrade={() => alert("Upgrade flow")}
        onRemoveTracked={onRemoveTracked}
        notify={notify}
        onClose={onClose}
      />
</>
  );
}
