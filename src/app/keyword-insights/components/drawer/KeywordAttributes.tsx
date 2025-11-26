"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Tag as TagIcon,
  Info,
  BookOpen,
  BadgeDollarSign,
  Compass,
  ShoppingCart,
  Check,
  X,
  FolderPlus,
  Plus,
  ChevronDown,
} from "lucide-react";

/* ─────────────────────────── TOKENS / THEME ─────────────────────────── */
const TK = {
  brand: "#008CCD",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderLight: "#EFF0F6",
  bg: "#FFFFFF",
  chipBg: "#F5F7FA",
  focus: "#0EA5E9",
  radius: 10,
};

type Intent = "Informational" | "Commercial" | "Navigational" | "Transactional";
type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface KeywordAttributesValue {
  volume?: number | null;
  intent: Intent;
  priority: Priority;
  folder?: string | null;
  tags: string[];
}

export interface KeywordAttributesSectionProps {
  keyword: string;
  value: KeywordAttributesValue;
  projectFolders: string[];
  allTags: string[];
  isPremium?: boolean;
  intentEditable?: boolean;
  onChange?: (patch: Partial<KeywordAttributesValue>) => void;
  onCreateFolder?: (name: string) => Promise<string> | string;
}

/* ──────────────────────────── HELPERS & META ─────────────────────────── */
const nf = (n?: number | null) =>
  typeof n === "number" ? new Intl.NumberFormat().format(n) : "—";

const intentMeta: Record<
  Intent,
  { icon: React.ElementType; color: string; desc: string }
> = {
  Informational: {
    icon: BookOpen,
    color: "#8B5CF6",
    desc: "What/How queries with learn intent",
  },
  Commercial: {
    icon: BadgeDollarSign,
    color: "#3B82F6",
    desc: "Best/Top/Compare research intent",
  },
  Navigational: {
    icon: Compass,
    color: "#6B7280",
    desc: "Brand or login navigational queries",
  },
  Transactional: {
    icon: ShoppingCart,
    color: "#10B981",
    desc: "Buy/Order intent",
  },
};

const priorityMeta: Record<Priority, { label: string; dot: string }> = {
  HIGH: { label: "High", dot: "#EF4444" },
  MEDIUM: { label: "Medium", dot: "#F59E0B" },
  LOW: { label: "Low", dot: "#10B981" },
};

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onAway: () => void) {
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current || ref.current.contains(t)) return;
      onAway();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ref, onAway]);
}

/* ──────────────────────────── UI PRIMITIVES ─────────────────────────── */
const Button = ({
  children,
  onClick,
  variant = "default",
  size = "md",
  title,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md";
  className?:string;
  title?: string;
  disabled?: boolean;
}) => {
  const base =
    "inline-flex items-center gap-2 rounded-md border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
  const sizes =
    size === "sm" ? "h-8 px-3 text-sm" : "h-9 px-3 text-[14px]";
  const styles =
    variant === "default"
      ? `border-transparent text-white`
      : variant === "outline"
      ? `border ${"bg-white"}`
      : `border-transparent bg-transparent`;
  const bg =
    variant === "default"
      ? "bg-[var(--brand)] hover:brightness-95"
      : variant === "outline"
      ? "hover:bg-gray-50"
      : "hover:bg-gray-50";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes} ${styles} ${bg} disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ ["--brand" as any]: TK.brand, borderColor: TK.border }}
    >
      {children}
    </button>
  );
};

const Dot = ({ color }: { color: string }) => (
  <span
    aria-hidden
    className="inline-block rounded-full"
    style={{ width: 10, height: 10, background: color }}
  />
);

/* ───────────────────────────── Intent Pill ───────────────────────────── */
function IntentPill({
  value,
  editable = true,
  onChange,
}: {
  value: Intent;
  editable?: boolean;
  onChange?: (v: Intent) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, () => setOpen(false));
  const MetaIcon = intentMeta[value].icon;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ borderColor: TK.border, background: TK.chipBg }}
        title={intentMeta[value].desc}
        onClick={() => editable && setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MetaIcon className="h-4 w-4" color={intentMeta[value].color} />
        <span>{value}</span>
        {editable && (
          <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-20 mt-1 w-56 rounded-md border bg-white p-1 shadow-xl"
          style={{ borderColor: TK.border }}
        >
          {(Object.keys(intentMeta) as Intent[]).map((k) => {
            const Icon = intentMeta[k].icon;
            const active = k === value;
            return (
              <button
                key={k}
                role="menuitem"
                onClick={() => {
                  onChange?.(k);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer ${
                  active ? "bg-[rgba(0,140,205,0.10)] font-medium" : ""
                }`}
                title={intentMeta[k].desc}
              >
                <Icon className="h-4 w-4" color={intentMeta[k].color} />
                <span>{k}</span>
                {active && (
                  <Check className="ml-auto h-4 w-4" style={{ color: TK.brand }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Priority Picker ───────────────────────────── */
function PriorityPicker({
  value,
  onChange,
}: {
  value: Priority;
  onChange?: (v: Priority) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border bg-white px-2.5 py-1 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer"
        style={{ borderColor: TK.border }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change priority"
      >
        <Dot color={priorityMeta[value].dot} />
        <span>{priorityMeta[value].label}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute z-20 mt-1 w-48 rounded-md border bg-white p-1 shadow-xl"
          style={{ borderColor: TK.border }}
        >
          {(Object.keys(priorityMeta) as Priority[]).map((p) => {
            const active = p === value;
            return (
              <button
                key={p}
                role="menuitem"
                onClick={() => {
                  onChange?.(p);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 cursor-pointer ${
                  active ? "bg-[rgba(0,140,205,0.10)] font-medium" : ""
                }`}
              >
                <Dot color={priorityMeta[p].dot} />
                <span>{priorityMeta[p].label}</span>
                {active && (
                  <Check className="ml-auto h-4 w-4" style={{ color: TK.brand }} />
                )}
              </button>
            );
          })}
          <div className="px-2 pb-1 pt-2 text-xs text-gray-500">
            High = immediate optimization priority.
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Folder Picker ───────────────────────────── */
function FolderPicker({
  value,
  folders,
  onChange,
  onCreate,
}: {
  value?: string | null;
  folders: string[];
  onChange?: (folder: string | null) => void;
  onCreate?: (name: string) => Promise<string> | string;
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, () => setOpenCreate(false));

  const handleCreate = async () => {
    const n = newName.trim();
    if (!n) return;
    const created = onCreate ? await onCreate(n) : n;
    onChange?.(created);
    setNewName("");
    setOpenCreate(false);
  };

  return (
    <div className="flex items-center gap-2">
      <select
        title="Select folder"
        className="h-8 w-[220px] rounded-md border bg-white px-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{ borderColor: TK.border, color: TK.text }}
        value={value ?? "Unassigned"}
        onChange={(e) => onChange?.(e.target.value === "Unassigned" ? null : e.target.value)}
      >
        <option value="Unassigned">Unassigned</option>
        {folders.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <div className="relative inline-block" ref={ref}>
        <Button variant="outline" size="sm" onClick={() => setOpenCreate((o) => !o)} title="Create folder">
          <FolderPlus className="h-4 w-4" style={{ color: TK.brand }} />
          Create
        </Button>
        {openCreate && (
          <div
            className="absolute right-0 z-20 mt-1 w-64 rounded-md border bg-white p-3 shadow-xl"
            style={{ borderColor: TK.border }}
          >
            <div className="mb-2 text-sm font-medium">New folder</div>
            <input
              className="h-8 w-full rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{ borderColor: TK.border }}
              placeholder="e.g., Blog"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4" style={{ color: "#fff" }} />
                Create
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Tag Input (chips) ───────────────────────────── */
function TagInput({
  value,
  onChange,
  allOptions,
  isPremium,
}: {
  value: string[];
  onChange?: (tags: string[]) => void;
  allOptions: string[];
  isPremium?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(boxRef, () => setOpen(false));

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const pool = allOptions.filter((t) => !value.includes(t));
    return (qq ? pool.filter((t) => t.toLowerCase().includes(qq)) : pool).slice(0, 8);
  }, [q, allOptions, value]);

  const add = (t: string) => {
    const v = t.trim();
    if (!v) return;
    if (!isPremium && value.length >= 2) {
      setGate(true);
      return;
    }
    if (value.includes(v)) return;
    onChange?.([...value, v]);
    setQ("");
    setOpen(false);
  };
  const remove = (t: string) => onChange?.(value.filter((x) => x !== t));

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
            style={{ borderColor: TK.border, background: TK.chipBg }}
          >
            <span>{t}</span>
            <button
              type="button"
              title={`Remove ${t}`}
              onClick={() => remove(t)}
              className="rounded p-0.5 hover:bg-gray-200 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(q);
            } else if (e.key === "Backspace" && !q && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={isPremium ? "Add tag…" : "Add tag (max 2 on Free)…"}
          className="h-8 w-48 rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: TK.border }}
        />
      </div>

      {open && (
        <div
          className="absolute z-20 mt-1 w-64 rounded-md border bg-white p-1 shadow-xl"
          style={{ borderColor: TK.border }}
          role="listbox"
        >
          {filtered.length ? (
            <div className="max-h-56 overflow-auto">
              {filtered.map((s) => (
                <button
                  key={s}
                  onClick={() => add(s)}
                  className="block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                  role="option"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2 py-2 text-sm text-gray-500">No suggestions</div>
          )}
          {!!q.trim() && (
            <div className="mt-1 border-t pt-1" style={{ borderColor: TK.border }}>
              <Button size="sm" onClick={() => add(q)} className="w-full">
                <Plus className="h-4 w-4" style={{ color: "#fff" }} />
                Create “{q.trim()}”
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Light freemium notice (no CTA, still modular) */}
      {gate && (
        <div
          className="absolute z-30 mt-2 w-72 rounded-md border bg-white p-3 shadow-xl"
          style={{ borderColor: TK.border }}
        >
          <div className="text-sm font-medium">Add more tags</div>
          <div className="mt-1 text-sm text-gray-600">
            Free plan allows up to 2 tags per keyword. Remove a tag to continue.
          </div>
          <div className="mt-2 text-right">
            <Button variant="outline" size="sm" onClick={() => setGate(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── MAIN: Keyword Attributes ───────────────────────── */
export function KeywordAttributesSection({
  keyword,
  value,
  projectFolders,
  allTags,
  isPremium = true,
  intentEditable = true,
  onChange,
  onCreateFolder,
}: KeywordAttributesSectionProps) {
  const [saved, setSaved] = useState<string | null>(null);
  const flash = (msg: string) => {
    setSaved(msg);
    window.setTimeout(() => setSaved(null), 1100);
  };

  return (
    <section
      className="rounded-xl border bg-white"
      style={{
        borderColor: TK.border,
        fontFamily:
          'Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
      }}
      aria-label="Keyword Attributes"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: TK.border }}
      >
        <div className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: TK.text }}>
          <TagIcon className="h-5 w-5" style={{ color: TK.brand }} />
          Keyword Attributes
        </div>
        {saved && <div className="text-xs text-gray-500">{saved}</div>}
      </div>

      {/* Body */}
      <div className="grid gap-5 p-4 md:grid-cols-2">
        {/* Volume */}
        <div>
          <div className="mb-1 text-sm text-gray-600">Search Volume</div>
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold" style={{ color: TK.text }}>
              {nf(value.volume)}
            </div>
            <Info
              className="h-4 w-4"
              style={{ color: TK.brand }}
              aria-label="Monthly average search volume (source: SE Ranking)"
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">Source: SE Ranking</div>
        </div>

        {/* Intent */}
        <div>
          <div className="mb-1 text-sm text-gray-600">Intent</div>
          <IntentPill
            value={value.intent}
            editable={intentEditable}
            onChange={(v) => {
              onChange?.({ intent: v });
              flash("Intent updated");
            }}
          />
          {!intentEditable && (
            <div className="mt-1 text-xs text-gray-500">
              Editing intent is disabled by project settings.
            </div>
          )}
        </div>

        {/* Priority */}
        <div>
          <div className="mb-1 text-sm text-gray-600">Priority</div>
          <PriorityPicker
            value={value.priority}
            onChange={(p) => {
              onChange?.({ priority: p });
              flash(`Priority: ${priorityMeta[p].label}`);
            }}
          />
        </div>

        {/* Folder */}
        <div>
          <div className="mb-1 text-sm text-gray-600">Folder</div>
          <FolderPicker
            value={value.folder ?? null}
            folders={projectFolders}
            onChange={(f) => {
              onChange?.({ folder: f });
              flash(`Folder: ${f ?? "Unassigned"}`);
            }}
            onCreate={onCreateFolder}
          />
        </div>

        {/* Tags (full width on small, half on md via grid gap) */}
        <div className="md:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
            <span>Tags</span>
            <Info
              className="h-4 w-4"
              style={{ color: TK.brand }}
              aria-label="Tags help organize keywords across dashboards."
            />
          </div>
          <TagInput
            value={value.tags}
            allOptions={allTags}
            isPremium={isPremium}
            onChange={(tags) => {
              onChange?.({ tags });
              flash("Tags updated");
            }}
          />
          {!isPremium && (
            <div className="mt-1 text-xs text-gray-500">
              Free plan: up to 2 tags per keyword.
            </div>
          )}
        </div>

        {/* Placeholder disabled control to show modular chips (optional) */}
        <div className="opacity-60 pointer-events-none">
          <div className="mb-1 text-sm text-gray-600">Funnel Stage (coming soon)</div>
          <div
            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm"
            style={{ borderColor: TK.border, background: TK.chipBg }}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-200" />
            <span>Awareness</span>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div
        className="border-t px-4 py-2 text-xs text-gray-500"
        style={{ borderColor: TK.border }}
      >
        Changes save instantly for <strong className="text-gray-800">{keyword}</strong> (device/location scoped).
      </div>
    </section>
  );
}

/* ─────────────────────────── DEMO / EXAMPLE (optional) ───────────────────────────
   Remove this default export in production if you already mount the section elsewhere.
---------------------------------------------------------------------------------- */
export default function DemoKeywordAttributes() {
  const [isPremium, setIsPremium] = useState(true);
  const [state, setState] = useState<KeywordAttributesValue>({
    volume: 12100,
    intent: "Commercial",
    priority: "MEDIUM",
    folder: null,
    tags: ["audit", "tools"],
  });

  const folders = useMemo(() => ["Blog", "Backlinks", "Product", "How‑tos"], []);
  const allTags = useMemo(
    () => ["audit", "tools", "checker", "pricing", "vs", "comparison", "beginner", "guide", "2025"],
    []
  );

  return (
    <div className="space-y-3 p-4 bg-[#F5F7FA]">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Plan</span>
        <Button
          size="sm"
          variant={isPremium ? "default" : "outline"}
          onClick={() => setIsPremium(true)}
          title="Premium"
        >
          Premium
        </Button>
        <Button
          size="sm"
          variant={!isPremium ? "default" : "outline"}
          onClick={() => setIsPremium(false)}
          title="Free"
        >
          Free
        </Button>
      </div>

      <KeywordAttributesSection
        keyword="best seo audit tools"
        value={state}
        projectFolders={folders}
        allTags={allTags}
        isPremium={isPremium}
        intentEditable
        onChange={(patch) => setState((s) => ({ ...s, ...patch }))}
        onCreateFolder={async (name) => {
          await new Promise((r) => setTimeout(r, 300));
          return name;
        }}
      />
    </div>
  );
}

