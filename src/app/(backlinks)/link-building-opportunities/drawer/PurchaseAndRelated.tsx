"use client";

import * as React from "react";

/**
 * SECTION 4 & 5 — DROP‑IN COMPONENT (Refined)
 * -------------------------------------------------------------
 * - Section 4: Purchase & Workflow Actions
 * - Section 5: Related Opportunities
 * - Inter / Inter Fallback fonts
 * - No emoji; branded (#008CCD) inline SVG icons
 * - All clickable elements use pointer cursor
 * - Modular Chips (price, delivery, link type) + Toggle switches in task form
 * - TailwindCSS-only, accessible, ARIA-friendly
 * - SmartPopover tooltips open ONLY on hovering/focusing their triggers
 * - Related cards: responsive grid + mobile carousel, hover lift anim
 *
 * Usage:
 *   <PurchaseAndRelated
 *      domain="techinsiderhub.com"
 *      linkType="Guest Post"
 *      price={60}
 *      deliveryDays={4}
 *      vefogixUrl="https://vefogix.com/listing/techinsiderhub.com?prefill=true"
 *      projectName="Acme SEO"
 *      projectMembers={[{id:'u1', name:'Alex'}, {id:'u2', name:'Priya'}]}
 *      related={[ ...opportunities ]}
 *      onSelectRelated={(opp) => ...}
 *      onViewAllRelated={() => ...}
 *   />
 */

const BRAND = "#008CCD";

/* -------------------------------- Fonts -------------------------------- */

const FontStyles = () => (
  <style>{`
    .font-inter { 
      font-family: Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
    }
  `}</style>
);

/* -------------------------------- Utilities -------------------------------- */

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function currency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function wrTone(score: number) {
  if (score >= 81) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 61) return "bg-sky-50 text-sky-700 border-sky-200";
  if (score >= 41) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function linkTypeTone(type: string) {
  if (type === "PR") return "bg-amber-50 text-amber-700 border-amber-200";
  if (type === "Link Insertion")
    return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-sky-50 text-sky-700 border-sky-200"; // Guest Post (default)
}

/* -------------------------------- Icons (brand via currentColor) -------------------------------- */

const IconSectionCart = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l1 6h13l-1.2 6H7.2M10 21a1 1 0 100-2m8 2a1 1 0 100-2" />
  </svg>
);
const IconSectionLink = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10 14a5 5 0 007.07 0l2.83-2.83a5 5 0 10-7.07-7.07L11 5" />
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 10a5 5 0 00-7.07 0L4.1 12.83a5 5 0 007.07 7.07L13 19" />
  </svg>
);
const IconCart = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l1 6h13l-1.2 6H7.2M10 21a1 1 0 100-2m8 2a1 1 0 100-2" />
  </svg>
);
const IconClipboard = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <rect x="7" y="5" width="10" height="14" rx="2" strokeWidth="2" />
    <path d="M9 3h6v4H9z" strokeWidth="2" />
  </svg>
);
const IconHeart = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path d="M12 22s-7-4.35-9.5-8.21C.83 9.8 2.62 6 6 6c1.9 0 3.09 1.23 4 2 .91-.77 2.1-2 4-2 3.38 0 5.17 3.8 3.5 6.79C19 16.65 12 22 12 22z" />
  </svg>
);
const IconHeartLine = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 000-7.8z"/>
  </svg>
);
const IconTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M20.59 13.41L11 3H3v8l9.59 9.59a2 2 0 002.82 0l5.18-5.18a2 2 0 000-2.82z"/>
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
const IconPriceTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M3 7l7-4 11 6v6l-7 4L3 13V7z"/>
    <path strokeWidth="2" d="M14 7l-5 3 5 3 5-3-5-3z"/>
  </svg>
);
const IconTruck = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M3 7h10v7H3zM13 9h4l4 3v2h-8z"/>
    <circle cx="7.5" cy="17.5" r="1.5"/>
    <circle cx="17.5" cy="17.5" r="1.5"/>
  </svg>
);
const IconChevronRight = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>
);

/* ------------------------------ Smart Popover ------------------------------ */

function SmartPopover({
  label,
  placement = "top",
  className,
  children,
}: {
  label: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const pos =
    placement === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -translate-y-2"
      : placement === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 translate-y-2"
      : placement === "left"
      ? "right-full top-1/2 -translate-y-1/2 -translate-x-2"
      : "left-full top-1/2 -translate-y-1/2 translate-x-2";

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-pre-wrap rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-lg ring-1 ring-black/5 transition-all duration-150",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95",
          pos
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* --------------------------------- Toasts --------------------------------- */

type Toast = { id: string; text: string; tone?: "default" | "success" | "error" };
function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((text: string, tone: Toast["tone"] = "default") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return { toasts, push };
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-md bg-white",
            t.tone === "success" && "border-emerald-200 text-emerald-800",
            t.tone === "error" && "border-rose-200 text-rose-800",
            (!t.tone || t.tone === "default") && "border-slate-200 text-slate-800"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Types & Props ----------------------------- */

type Member = { id: string; name: string };
export type OpportunityCard = {
  domain: string;
  wrScore: number; // 0–100
  oppScore: number; // 0–100 (Opportunity Score)
  linkType: "Guest Post" | "Link Insertion" | "PR";
  price: number;
  deliveryDays: number;
  matchReason: "Competitor Match" | "Niche Match" | "Trending" | "Best Value";
  faviconUrl?: string;
  vefogixUrl?: string;
};

export type PurchaseAndRelatedProps = {
  /* Section 4 — Primary context (current opportunity) */
  domain: string;
  linkType: "Guest Post" | "Link Insertion" | "PR";
  price: number;
  deliveryDays: number;
  vefogixUrl?: string;

  /* Project context for inline task form */
  projectName?: string;
  projectMembers?: Member[];
  defaultAssigneeId?: string;

  /* Plan/permission gates */
  permissions?: {
    canBuy?: boolean;
    canCreateTask?: boolean;
    canFavorite?: boolean;
    overPlanLimit?: boolean;
  };

  /* Section 5 — Related opportunities */
  related?: OpportunityCard[];

  /* Callbacks / routing */
  onCreateTask?: (task: TaskPayload) => Promise<void> | void;
  onFavoriteChange?: (fav: boolean) => void;
  onSelectRelated?: (opp: OpportunityCard) => void;
  onViewAllRelated?: () => void;
};

type TaskPayload = {
  title: string;
  project: string;
  assigneeId?: string;
  dueDate?: string;
  priority: "Low" | "Medium" | "High";
  details: {
    domain: string;
    linkType: string;
    price: number;
    deliveryDays: number;
  };
  notes?: string;
  notifyAssignee?: boolean;
  followTask?: boolean;
};

/* ------------------------------ Modular Chip ------------------------------ */

function Chip({
  children,
  tone = "slate",
  className,
  leading,
  onClick,
  title,
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "sky" | "violet" | "blue";
  className?: string;
  leading?: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        onClick && "cursor-pointer hover:brightness-[1.03]",
        map[tone],
        className
      )}
    >
      {leading ? <span className="inline-flex h-4 w-4 items-center justify-center" style={{ color: BRAND }}>{leading}</span> : null}
      {children}
    </Comp>
  );
}

/* ------------------------------ Toggle Switch ----------------------------- */

function Toggle({
  checked,
  onChange,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  hint?: string;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-800 cursor-pointer">
          {label}
        </label>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 items-center rounded-full border transition-colors cursor-pointer",
          checked ? "bg-[var(--brand)] border-sky-600" : "bg-slate-200 border-slate-300"
        )}
        style={{ ["--brand" as any]: BRAND }}
      >
        <span
          className={cn(
            "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

/* -------------------------- Section 4: Purchase CTA ----------------------- */

function BuyWorkflow({
  domain,
  linkType,
  price,
  deliveryDays,
  vefogixUrl,
  projectName = "Current Project",
  projectMembers = [],
  defaultAssigneeId,
  permissions,
  onCreateTask,
  onFavoriteChange,
}: PurchaseAndRelatedProps & { onFavoriteChange?: (fav: boolean) => void }) {
  const { toasts, push } = useToasts();
  const [fav, setFav] = React.useState(false);
  const [buying, setBuying] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const canBuy = permissions?.canBuy !== false && !permissions?.overPlanLimit;
  const canTask = permissions?.canCreateTask !== false && !permissions?.overPlanLimit;
  const canFav = permissions?.canFavorite !== false;

  const defaultDue = addDays(new Date(), Math.max(1, deliveryDays || 3));
  const [task, setTask] = React.useState<TaskPayload>({
    title: `Acquire link from ${domain}`,
    project: projectName,
    assigneeId: defaultAssigneeId ?? projectMembers[0]?.id,
    dueDate: defaultDue,
    priority: "Medium",
    details: { domain, linkType, price, deliveryDays },
    notes: "",
    notifyAssignee: true,
    followTask: true,
  });

  function handleBuy() {
    if (!canBuy) {
      push("Action unavailable on your plan. Upgrade to continue.", "error");
      return;
    }
    setBuying(true);
    setTimeout(() => {
      setBuying(false);
      const href =
        vefogixUrl ||
        `https://vefogix.com/marketplace?domain=${encodeURIComponent(
          domain
        )}&type=${encodeURIComponent(linkType)}&price=${price}`;
      window.open(href, "_blank", "noopener,noreferrer");
    }, 600);
  }

  async function saveTask() {
    if (!canTask) {
      push("Task creation is unavailable on your plan.", "error");
      return;
    }
    try {
      await onCreateTask?.(task);
      push("Task created successfully", "success");
      setShowForm(false);
    } catch {
      push("Unable to create task right now.", "error");
    }
  }

  function toggleFav() {
    if (!canFav) return;
    const next = !fav;
    setFav(next);
    onFavoriteChange?.(next);
    push(next ? "Added to Favorites" : "Removed from Favorites", "success");
  }

  return (
    <section
      aria-labelledby="purchase-actions"
      className="w-full border-t border-slate-200 pt-4 mt-4"
    >
      {/* Section title with branded icon */}
      <div className="mb-2 flex items-center gap-2 font-inter">
        <FontStyles />
        <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: BRAND }}>
          <IconSectionCart className="h-5 w-5" />
        </span>
        <h3 id="purchase-actions" className="text-[16px] font-semibold text-slate-900">
          Purchase & Workflow Actions
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {/* Action row */}
        <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Buy Now (Primary) */}
            <SmartPopover label="Purchase this opportunity from the marketplace.">
              <button
                onClick={handleBuy}
                disabled={!canBuy || buying}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2",
                  "bg-[var(--brand)] hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60",
                )}
                style={{ ["--brand" as any]: BRAND }}
              >
                <IconCart className="h-5 w-5" />
                {buying ? "Processing…" : "Buy Now"}
              </button>
            </SmartPopover>

            {/* Create Task (Secondary) */}
            <SmartPopover label="Assign this opportunity to your team.">
              <button
                onClick={() => setShowForm((v) => !v)}
                disabled={!canTask}
                aria-expanded={showForm}
                className={cn(
                  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                  !canTask && "opacity-60 cursor-not-allowed"
                )}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: BRAND }}>
                  <IconClipboard className="h-5 w-5" />
                </span>
                Create Task
              </button>
            </SmartPopover>
          </div>

          {/* Favorite (Tertiary) */}
          <SmartPopover label={fav ? "Remove from Favorites" : "Save to Favorites"}>
            <button
              onClick={toggleFav}
              aria-pressed={fav}
              className={cn(
                "inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              )}
              title={fav ? "Unfavorite" : "Favorite"}
            >
              {fav ? (
                <IconHeart className="h-5 w-5 fill-rose-500" />
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: BRAND }}>
                  <IconHeartLine className="h-5 w-5" />
                </span>
              )}
            </button>
          </SmartPopover>
        </div>

        {/* Context chips row (link type / price / delivery) */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Chip tone="sky" leading={<IconTag className="h-4 w-4" />}>{linkType}</Chip>
          <Chip tone="slate" leading={<IconPriceTag className="h-4 w-4" />}>{currency(price)}</Chip>
          <Chip tone="slate" leading={<IconTruck className="h-4 w-4" />}>{deliveryDays} days</Chip>

          {permissions?.overPlanLimit && (
            <span className="ml-auto text-[13px]">
              <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                Plan limit reached
              </span>
              <a
                className="ml-2 cursor-pointer text-sky-700 underline decoration-dotted hover:text-sky-800"
                href="#upgrade"
              >
                Upgrade
              </a>
            </span>
          )}
        </div>

        {/* Inline Task Form */}
        <div
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-300",
            showForm ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <form
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveTask();
              }}
            >
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600">
                  Task Title
                </label>
                <input
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Project
                </label>
                <input
                  value={task.project}
                  onChange={(e) => setTask({ ...task, project: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Assignee
                </label>
                <select
                  value={task.assigneeId}
                  onChange={(e) =>
                    setTask({ ...task, assigneeId: e.target.value || undefined })
                  }
                  className="mt-1 w-full cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Due Date
                </label>
                <input
                  type="date"
                  value={task.dueDate || ""}
                  onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Default is today + delivery time ({deliveryDays} days).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) =>
                    setTask({
                      ...task,
                      priority: e.target.value as TaskPayload["priority"],
                    })
                  }
                  className="mt-1 w-full cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              {/* Toggles (modular switch) */}
              <div className="mt-1">
                <Toggle
                  id="notify-assignee"
                  checked={!!task.notifyAssignee}
                  onChange={(val) => setTask({ ...task, notifyAssignee: val })}
                  label="Notify assignee"
                  hint="Send an email notification to the assignee."
                />
              </div>
              <div className="mt-1">
                <Toggle
                  id="follow-task"
                  checked={!!task.followTask}
                  onChange={(val) => setTask({ ...task, followTask: val })}
                  label="Follow this task"
                  hint="Receive updates about changes and comments."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600">
                  Opportunity Details
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
                  <Chip tone="slate">{domain}</Chip>
                  <Chip tone="sky" leading={<IconTag className="h-4 w-4" />}>{linkType}</Chip>
                  <Chip tone="slate" leading={<IconPriceTag className="h-4 w-4" />}>{currency(price)}</Chip>
                  <Chip tone="slate" leading={<IconTruck className="h-4 w-4" />}>{deliveryDays} days</Chip>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600">
                  Internal Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={task.notes}
                  onChange={(e) => setTask({ ...task, notes: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="md:col-span-2 mt-1 flex items-center gap-2">
                <button
                  type="submit"
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm",
                    "bg-[var(--brand)] hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  )}
                  style={{ ["--brand" as any]: BRAND }}
                >
                  Save Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ToastViewport toasts={toasts} />
    </section>
  );
}

/* ---------------------- Section 5: Related Opportunities ------------------ */

function RelatedCard({
  item,
  onClick,
}: {
  item: OpportunityCard;
  onClick?: (i: OpportunityCard) => void;
}) {
  const { domain, wrScore, oppScore, linkType, price, deliveryDays, matchReason, faviconUrl } =
    item;
  return (
    <button
      onClick={() => onClick?.(item)}
      className={cn(
        "group relative h-full w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      )}
      aria-label={`View ${domain} details`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <img
          src={
            faviconUrl ||
            `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
              domain
            )}&sz=32`
          }
          alt=""
          className="h-4 w-4 rounded-sm"
        />
        <div className="truncate text-sm font-semibold text-slate-800">
          {domain}
        </div>
      </div>

      {/* Badges & Chips */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SmartPopover
          label={`Wranker WR Score · ${wrScore}/100`}
          placement="top"
        >
          <Chip tone={wrScore >= 81 ? "emerald" : wrScore >= 61 ? "sky" : wrScore >= 41 ? "amber" : "rose"}>
            WR {wrScore}
          </Chip>
        </SmartPopover>

        <SmartPopover label={`Opportunity Score · ${oppScore}/100`}>
          <Chip tone="blue">Score {oppScore}</Chip>
        </SmartPopover>

        <SmartPopover label={`Link type: ${linkType}`}>
          <Chip tone="sky" leading={<IconTag className="h-4 w-4" />}>{linkType}</Chip>
        </SmartPopover>

        <div className="ml-auto flex items-center gap-2">
          <Chip tone="slate" leading={<IconPriceTag className="h-4 w-4" />}>{currency(price)}</Chip>
          <Chip tone="slate" leading={<IconTruck className="h-4 w-4" />}>{deliveryDays} days</Chip>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <Chip
          tone={
            matchReason === "Competitor Match"
              ? "violet"
              : matchReason === "Trending"
              ? "amber"
              : "emerald"
          }
        >
          {matchReason}
        </Chip>

        <span className="inline-flex items-center gap-1 text-sm text-sky-700 group-hover:underline">
          View Details
          <IconChevronRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

/* --------------------------------- Wrapper -------------------------------- */

export default function PurchaseAndRelated(props: PurchaseAndRelatedProps) {
  const {
    domain = "techinsiderhub.com",
    linkType = "Guest Post",
    price = 60,
    deliveryDays = 4,
    vefogixUrl,
    projectName = "Current Project",
    projectMembers = [
      { id: "u1", name: "Alex" },
      { id: "u2", name: "Priya" },
    ],
    related = [
      {
        domain: "greenplanetnews.co",
        wrScore: 82,
        oppScore: 88,
        linkType: "Guest Post",
        price: 40,
        deliveryDays: 4,
        matchReason: "Niche Match",
      },
      {
        domain: "urbanlifestylemag.com",
        wrScore: 80,
        oppScore: 86,
        linkType: "Link Insertion",
        price: 75,
        deliveryDays: 3,
        matchReason: "Niche Match",
      },
      {
        domain: "finmarketsdaily.net",
        wrScore: 72,
        oppScore: 83,
        linkType: "PR",
        price: 95,
        deliveryDays: 2,
        matchReason: "Trending",
      },
      {
        domain: "startupdigestpro.com",
        wrScore: 68,
        oppScore: 80,
        linkType: "Guest Post",
        price: 150,
        deliveryDays: 7,
        matchReason: "Competitor Match",
      },
    ],
  } = props;

  return (
    <div className="w-full space-y-6 font-inter">
      <FontStyles />
      {/* SECTION 4 */}
      <BuyWorkflow
        {...props}
        domain={domain}
        linkType={linkType}
        price={price}
        deliveryDays={deliveryDays}
        vefogixUrl={vefogixUrl}
        projectName={projectName}
        projectMembers={projectMembers}
      />

      {/* SECTION 5 */}
      <section aria-labelledby="related-ops" className="w-full">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center" style={{ color: BRAND }}>
              <IconSectionLink className="h-5 w-5" />
            </span>
            <h4 id="related-ops" className="text-[16px] font-semibold text-slate-900">
              Related Opportunities
            </h4>
          </div>
          <button
            onClick={() => props.onViewAllRelated?.()}
            className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline"
          >
            View All
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop/Grid */}
        <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {related.map((item) => (
            <RelatedCard
              key={item.domain}
              item={item}
              onClick={props.onSelectRelated}
            />
          ))}
        </div>

        {/* Mobile/Carousel */}
        <div className="md:hidden">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {related.map((item) => (
              <div key={item.domain} className="min-w-[80%] snap-start">
                <RelatedCard item={item} onClick={props.onSelectRelated} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


