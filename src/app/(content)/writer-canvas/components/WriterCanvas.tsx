"use client";

/**
 * Writer · Canvas — Header + Body + Control Center (Surfer+ parity · refined)
 * Fonts: Inter, Inter Fallback (applied at root)
 * Tokens: Wranker v1 (brand/borders/text/status/focus/radius/shadow)
 *
 * Fixes & Refinements covered:
 * 1) Collapsible "Title & description" section with section title.
 * 2) Working Suggesting toggle in header (role="switch", aria-checked, keyboardable).
 * 3) Header CTAs: Export, Share, Submit for review — branded icons & focus rings.
 * 4) Inline marks (Bold/Italic/Underline/Strike/List/Quote/Link) now work — selection-based via execCommand.
 * 5) Document/Content Title (editable) added to header.
 * 6) Language (Locale) selector added to header.
 * 7) Right-rail tabs are truly interactive (Guidelines, Facts, Outline, Readability, Links, Citations, Versions).
 * 8) Simulate Conflict → Primary (brand-filled) button.
 *
 * Also includes:
 * - Section Tabs for All · Headings · Paragraphs · Images · FAQs · TL;DR · Direct Answer
 * - Inline rewrite chips (Concise / Expand / Tone / Conflict) working on click
 * - Favicon chip for project/domain
 * - Pointer cursors on all interactive
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  // header / actions
  Sparkles,
  Globe2,
  Send,
  Share2,
  Download,
  Undo2,
  // toolbar
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  // editor chips
  Minimize2,
  StretchVertical,
  MessageSquareText,
  ShieldCheck,
  // rail / tabs / KPIs
  Target,
  BookOpen,
  BookText,
  GaugeCircle,
  History,
  Wand2,
  ListChecks,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Plus,
  AlertTriangle,
  RefreshCcw,
  Check,
  ExternalLink,
  Scissors,
  Trash2,
} from "lucide-react";

/* ───────────────── Tokens (JS fallbacks — real values come from CSS vars) ───────────────── */
const TK = {
  brand: "var(--brand, #008CCD)",
  brand600: "var(--brand-600, #007BB8)",
  onBrand: "var(--on-brand, rgba(255,255,255,0.88))",
  bgApp: "var(--bg-app, #F5F7FA)",
  bgPanel: "var(--bg-panel, #FFFFFF)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  border: "var(--border, #E5E7EB)",
  textStrong: "var(--text-strong, #111827)",
  text: "var(--text, #374151)",
  textMuted: "var(--text-muted, #6B7280)",
  critical: "var(--critical, #E94134)",
  criticalBg: "var(--critical-bg, #FBC4BF)",
  warning: "var(--warning, #F9BB04)",
  warningBg: "var(--warning-bg, #FCEBB8)",
  success: "var(--success, #34A853)",
  successBg: "var(--success-bg, #CBF8D7)",
  focus: "var(--focus, #4286F5)",
  radius: "var(--radius, 6px)",
  shadow1: "var(--shadow-1, 0 1px 3px rgba(0,0,0,0.1))",
} as const;

const fontStack: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

/* ───────────────── Types ───────────────── */
type BlockType = "h2" | "p" | "faq_q" | "faq_a" | "tldr" | "direct_answer" | "image";
type Tone = "Neutral" | "Helpful" | "Confident" | "Playful";
type Rail = "guidelines" | "facts" | "outline" | "readability" | "links" | "citations" | "versions";
type SectionTab = "all" | "headings" | "paragraphs" | "images" | "faqs" | "tldr" | "direct";

type Block = {
  id: string;
  type: BlockType;
  // All textual blocks can hold HTML (for inline marks); image uses src/alt
  text: string;
  html?: string;
  align?: "left" | "center" | "right";
  src?: string;
  alt?: string;
};

export interface WriterCanvasProps {
  project?: { id: string; name: string; domain: string } | null;
  faviconUrlForDomain?: (domain: string) => string;
  draftId?: string;
  initialLocale?: string;
  initialTone?: Tone;
  initialDocTitle?: string;       // Document/Content Title (H1)
  initialSeoTitle?: string;       // SEO title (Title tag)
  initialDescription?: string;    // Meta description
  initialBlocks?: Block[];
  initialTerms?: string[];
  onShare?: () => void;
  onSubmitForReview?: (payload: { draftId?: string; locale: string }) => void;
  onExport?: (opts: { html: boolean; md: boolean; docx: boolean }) => void;
}

/* ───────────────── Utils ───────────────── */
const cn = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

const WORD_RE = /[\p{L}\p{N}'-]+/gu;
const SENTENCE_RE = /[.!?]+(\s|$)/g;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const countWords = (s: string) => (s.match(WORD_RE) || []).length;
const countSentences = (s: string) => Math.max(1, (s.match(SENTENCE_RE) || []).length);
const syllables = (s: string) =>
  (s.match(WORD_RE) || []).reduce((acc, w) => {
    const v = w.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").match(/[aeiouy]{1,2}/g);
    return acc + Math.max(1, v ? v.length : 1);
  }, 0);
const fkGrade = (s: string) => {
  const w = countWords(s);
  const sen = countSentences(s);
  const syl = syllables(s);
  const g = 0.39 * (w / sen) + 11.8 * (syl / Math.max(1, w)) - 15.59;
  return Math.round(Math.max(0, g) * 10) / 10;
};
const linksCount = (s: string) => (s.match(/\bhttps?:\/\/\S+/g) || []).length;

function metricsFor(blocks: Block[], docTitle: string, seoTitle: string, description: string, terms: string[]) {
  const glue = (b: Block) =>
    b.type === "image" ? "" : b.html ?? b.text;
  const all = [docTitle, seoTitle, description, ...blocks.map(glue)].join(" ");
  const words = countWords(all);
  const sentences = countSentences(all);
  const grade = fkGrade(all);
  const links = linksCount(all);
  const headings = blocks.filter((b) => b.type === "h2").length;
  const paragraphs = blocks.filter((b) => b.type === "p").length;
  const images = blocks.filter((b) => b.type === "image").length;

  const used = (k: string) =>
    (all.toLowerCase().match(new RegExp(`\\b${k.toLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "g")) || []).length;
  const coverage = terms.length ? terms.reduce((s, t) => s + (used(t) > 0 ? 1 : 0), 0) / terms.length : 1;

  const seo = clamp(Math.round(60 * coverage + 20 * clamp(links / 6, 0, 1) + 20 * clamp(headings / 6, 0, 1)), 0, 100);
  const readability = clamp(Math.round((12 - grade) * 8), 0, 100);
  const aeo = clamp(
    Math.round(
      (blocks.some((b) => b.type === "direct_answer") ? 45 : 0) +
        (blocks.some((b) => b.type === "tldr") ? 25 : 0) +
        clamp(blocks.filter((b) => b.type === "faq_q").length / 5, 0, 1) * 30
    ),
    0,
    100
  );
  const contentScore = clamp(Math.round(seo * 0.45 + readability * 0.25 + aeo * 0.2 + clamp(paragraphs / 60, 0, 1) * 10), 0, 100);

  return { words, sentences, grade, links, headings, paragraphs, images, seo, readability, aeo, contentScore, used };
}

/* deterministic client-side rewrites */
const FILLERS = ["actually", "really", "very", "basically", "just", "that", "in order to", "currently", "kind of", "sort of", "in fact"];
const concise = (s: string) =>
  s.replace(new RegExp(`\\b(?:${FILLERS.join("|")})\\b`, "gi"), "").replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
const expand = (s: string) => (s.trim().endsWith(".") ? `${s} For example, clarify the step and expected outcome.` : `${s}. For example, clarify the step and expected outcome.`);
const toneMap: Record<Tone, [RegExp, string][]> = {
  Neutral: [[/\bwon't|can't\b/gi, "cannot"]],
  Helpful: [[/\bshould\b/gi, "can"]],
  Confident: [[/\b(might|could|may)\b/gi, "will"]],
  Playful: [[/\boptimize\b/gi, "spruce up"]],
};
const retone = (s: string, t: Tone) => (toneMap[t] || []).reduce((out, [re, rep]) => out.replace(re, rep), s);
const resolveConflicts = (s: string) => s.replace(/“|”/g, '"').replace(/‘|’/g, "'").replace(/\s*–\s*/g, " — ").replace(/\s{2,}/g, " ");

/* ───────────────── UI primitives ───────────────── */
function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
        "transition-colors focus-visible:outline focus-visible:outline-2",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-95 cursor-pointer",
        className
      )}
      style={{ background: TK.brand, color: TK.onBrand, outlineColor: TK.focus, ...style }}
    />
  );
}
function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm",
        "transition-colors hover:bg-[color:var(--bg-app,#F5F7FA)] focus-visible:outline focus-visible:outline-2",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        className
      )}
      style={{ borderColor: TK.border, color: TK.text, background: TK.bgPanel, outlineColor: TK.focus, ...style }}
    />
  );
}
function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-[color:var(--bg-app,#F5F7FA)]", disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer", className)}
      style={{ color: TK.text, background: "transparent", ...style }}
    />
  );
}

/** ToggleSwitch — modular, accessible */
function ToggleSwitch({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-[22px] w-10 items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2"
        style={{ borderColor: TK.border, background: checked ? TK.brand : TK.bgPanel, outlineColor: TK.focus, cursor: "pointer" }}
      >
        <span
          className={cn("absolute left-[2px] h-[18px] w-[18px] rounded-full transition-all", checked ? "translate-x-[18px]" : "")}
          style={{ background: checked ? TK.onBrand : TK.borderSubtle, boxShadow: TK.shadow1 }}
        />
      </button>
      {label ? (
        <label htmlFor={id} className="text-sm cursor-pointer" style={{ color: TK.text }}>
          {label}
        </label>
      ) : null}
    </div>
  );
}

/* KPI ring */
function Ring({ value, label, color }: { value: number; label: string; color: string }) {
  const angle = Math.round((clamp(value, 0, 100) / 100) * 360);
  const bg = `conic-gradient(${color} ${angle}deg, #E5E7EB ${angle}deg)`;
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-full" style={{ background: bg }}>
        <div className="grid size-9 place-items-center rounded-full bg-white text-[11px] font-semibold" style={{ color: TK.textStrong }}>
          {value}
        </div>
      </div>
      <div className="text-sm">
        <div className="font-medium" style={{ color: TK.textStrong }}>
          {label}
        </div>
        <div className="text-[12px]" style={{ color: TK.textMuted }}>
          /100
        </div>
      </div>
    </div>
  );
}

/* Section Tabs */
function SectionTabs({
  value,
  onChange,
  counts,
  onAdd,
}: {
  value: SectionTab;
  onChange: (t: SectionTab) => void;
  counts: Record<SectionTab, number>;
  onAdd: (t: SectionTab) => void;
}) {
  const items: { k: SectionTab; label: string }[] = [
    { k: "all", label: "All" },
    { k: "headings", label: "Headings (H2)" },
    { k: "paragraphs", label: "Paragraphs" },
    { k: "images", label: "Images" },
    { k: "faqs", label: "FAQs" },
    { k: "tldr", label: "TL;DR" },
    { k: "direct", label: "Direct Answer" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <button
          key={it.k}
          onClick={() => onChange(it.k)}
          className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[13px] focus-visible:outline focus-visible:outline-2", value === it.k ? "font-semibold" : "")}
          style={{ borderColor: TK.border, outlineColor: TK.focus, cursor: "pointer" }}
          title={it.label}
        >
          {it.label}
          <span className="rounded px-1 text-[11px]" style={{ background: TK.bgApp }}>{counts[it.k] ?? 0}</span>
        </button>
      ))}
      <div className="ml-auto inline-flex items-center gap-1">
        {(["headings", "paragraphs", "images", "faqs", "tldr", "direct"] as SectionTab[]).includes(value) && (
          <SecondaryButton onClick={() => onAdd(value)}>
            <Plus size={14} style={{ color: TK.brand }} />
            Add {value === "headings" ? "H2" : value === "paragraphs" ? "Paragraph" : value === "images" ? "Image" : value === "faqs" ? "FAQ" : value === "tldr" ? "TL;DR" : "Direct"}
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

/* Inline rewrite chips */
function RewriteChips({
  onConcise,
  onExpand,
  onTone,
  onConflict,
}: {
  onConcise: () => void;
  onExpand: () => void;
  onTone: () => void;
  onConflict: () => void;
}) {
  return (
    <div className="absolute -top-3 right-2 inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-[12px] shadow" style={{ borderColor: TK.border, boxShadow: TK.shadow1 }}>
      <button onClick={onConcise} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2" style={{ outlineColor: TK.focus, cursor: "pointer" }} title="Concise">
        <Minimize2 size={14} style={{ color: TK.brand }} /> Concise
      </button>
      <button onClick={onExpand} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2" style={{ outlineColor: TK.focus, cursor: "pointer" }} title="Expand">
        <StretchVertical size={14} style={{ color: TK.brand }} /> Expand
      </button>
      <button onClick={onTone} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2" style={{ outlineColor: TK.focus, cursor: "pointer" }} title="Tone">
        <MessageSquareText size={14} style={{ color: TK.brand }} /> Tone
      </button>
      <button onClick={onConflict} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2" style={{ outlineColor: TK.focus, cursor: "pointer" }} title="Conflict">
        <ShieldCheck size={14} style={{ color: TK.brand }} /> Conflict
      </button>
    </div>
  );
}

/* Block view */
function BlockView({
  b,
  active,
  onFocus,
  onChange,
  onConcise,
  onExpand,
  onTone,
  onConflict,
  registerRef,
  onReplaceImage,
  onRemove,
}: {
  b: Block;
  active: boolean;
  onFocus: () => void;
  onChange: (t: { text: string; html?: string }) => void;
  onConcise: () => void;
  onExpand: () => void;
  onTone: () => void;
  onConflict: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
  onReplaceImage: () => void;
  onRemove: () => void;
}) {
  const styleAlign =
    b.align === "center" ? { textAlign: "center" as const } : b.align === "right" ? { textAlign: "right" as const } : {};

  const isTextual = b.type !== "image";

  return (
    <div className="relative rounded-md border p-3 hover:shadow" style={{ borderColor: TK.borderSubtle, background: TK.bgPanel }} onClick={onFocus}>
      {active && isTextual && <RewriteChips onConcise={onConcise} onExpand={onExpand} onTone={onTone} onConflict={onConflict} />}

      {/* TEXT BLOCKS */}
      {isTextual && (
        <div
          ref={registerRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(b.type === "h2" ? "text-[18px] font-semibold" : "prose prose-sm max-w-none", "outline-none")}
          style={{ color: b.type === "h2" ? TK.textStrong : TK.text, ...styleAlign }}
          onInput={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const html = el.innerHTML;
            const text = el.textContent || "";
            onChange({ text, html });
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: b.html ?? b.text }} />
        </div>
      )}

      {/* IMAGE BLOCK */}
      {b.type === "image" && (
        <figure className="grid gap-2" style={styleAlign}>
          {b.src ? (
            <img src={b.src} alt={b.alt || ""} className="mx-auto max-h-[320px] rounded-md border" style={{ borderColor: TK.border }} />
          ) : (
            <div className="grid h-40 place-items-center rounded-md border" style={{ borderColor: TK.border, background: "#FAFCFF", color: TK.textMuted }}>
              <ImageIcon size={24} style={{ color: TK.brand }} />
              <div className="text-sm mt-1">No image source</div>
            </div>
          )}
          <figcaption
            contentEditable
            suppressContentEditableWarning
            className="text-[12px] outline-none"
            style={{ color: TK.textMuted }}
            onInput={(e) => onChange({ text: (e.currentTarget.textContent || "").trim() })}
          >
            {b.alt || "Add alt text…"}
          </figcaption>

          {active && (
            <div className="absolute -top-3 right-2 inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-[12px]" style={{ borderColor: TK.border }}>
              <button onClick={onReplaceImage} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50" style={{ cursor: "pointer" }}>
                <ImageIcon size={14} style={{ color: TK.brand }} />
                Replace
              </button>
              <button onClick={onRemove} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-gray-50" style={{ cursor: "pointer" }}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
          )}
        </figure>
      )}
    </div>
  );
}

/* Diff modal */
function DiffModal({ open, onClose, base, mine, theirs }: { open: boolean; onClose: () => void; base: string; mine: string; theirs: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white shadow" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="inline-flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: TK.brand }} />
            <div className="text-sm font-semibold" style={{ color: TK.textStrong }}>
              Merge conflict
            </div>
          </div>
          <GhostButton onClick={onClose}>
            <RefreshCcw size={16} />
            Resolve later
          </GhostButton>
        </div>
        <div className="grid grid-cols-3 gap-3 p-4 text-sm">
          <div>
            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
              Base
            </div>
            <div className="rounded-md border p-2" style={{ borderColor: TK.border, color: TK.text }}>
              {base}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
              Mine
            </div>
            <div className="rounded-md border p-2" style={{ borderColor: TK.border, color: TK.text }}>
              {mine}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
              Theirs
            </div>
            <div className="rounded-md border p-2" style={{ borderColor: TK.border, color: TK.text }}>
              {theirs}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: TK.border }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onClose}>
            <Check size={16} /> Merge & continue
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* Export Modal */
function ExportModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (opts: { html: boolean; md: boolean; docx: boolean }) => void;
}) {
  const [fmt, setFmt] = useState({ html: true, md: false, docx: false });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-white shadow" style={{ borderColor: TK.border }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="inline-flex items-center gap-2">
            <Download size={16} style={{ color: TK.brand }} />
            <div className="text-sm font-semibold" style={{ color: TK.textStrong }}>
              Export
            </div>
          </div>
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
        <div className="p-4 grid gap-3 text-sm" style={{ color: TK.text }}>
          <div className="text-[12px]" style={{ color: TK.textMuted }}>Formats</div>
          <div className="flex flex-wrap items-center gap-3">
            {(["html", "md", "docx"] as const).map((k) => (
              <label key={k} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 cursor-pointer" style={{ borderColor: TK.border }}>
                <input type="checkbox" checked={(fmt as any)[k]} onChange={(e) => setFmt((p) => ({ ...p, [k]: e.target.checked }))} />
                <span className="uppercase text-[12px]">{k}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3" style={{ borderColor: TK.border }}>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={() => onConfirm(fmt)}>
            <Download size={16} /> Export
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* Terms card (right rail) */
function TermsCard({ terms, used, onInsert }: { terms: string[]; used: (k: string) => number; onInsert: (k: string) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "heading" | "nlp">("all"); // demo only; categorize externally if needed
  const filtered = terms.filter((t) => (q ? t.toLowerCase().includes(q.toLowerCase()) : true));
  return (
    <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Search size={14} style={{ color: TK.brand }} />
          <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: TK.textMuted }}>
            Terms
          </div>
        </div>
        <div className="inline-flex items-center gap-1">
          {(["all", "heading", "nlp"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded px-2 py-0.5 text-[12px]", tab === k ? "font-semibold" : "text-gray-600")} style={{ cursor: "pointer" }}>
              {k === "all" ? "All" : k === "heading" ? "Headings" : "NLP"}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2">
        <div className="flex items-center gap-2 rounded-md border px-2 py-1" style={{ borderColor: TK.border }}>
          <Search size={14} />
          <input className="h-8 w-full outline-none text-sm" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {filtered.map((t) => {
          const cur = used(t);
          const ok = cur >= 1;
          return (
            <button
              key={t}
              onClick={() => onInsert(t)}
              className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-colors", ok ? "hover:bg-[#F6FFFB]" : "hover:bg[#FFF8F6]")}
              style={{ borderColor: ok ? TK.success : TK.border, color: ok ? TK.success : TK.text, cursor: "pointer" }}
              title="Insert term"
            >
              <ListChecks size={13} style={{ color: ok ? TK.success : TK.brand }} />
              {t}
              <span className="ml-1 rounded px-1" style={{ background: ok ? TK.successBg : TK.warningBg, color: ok ? TK.success : TK.warning }}>
                {cur}/1
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Right-rail tabs (interactive) */
function RailTabs({ value, onChange }: { value: Rail; onChange: (r: Rail) => void }) {
  const items: { key: Rail; label: string; Icon: any }[] = [
    { key: "guidelines", label: "Guidelines", Icon: Target },
    { key: "facts", label: "Facts", Icon: BookOpen },
    { key: "outline", label: "Outline", Icon: BookText },
    { key: "readability", label: "Readability", Icon: GaugeCircle },
    { key: "links", label: "Links", Icon: LinkIcon },
    { key: "citations", label: "Citations", Icon: BookOpen },
    { key: "versions", label: "Versions", Icon: History },
  ];
  return (
    <div role="tablist" aria-label="Control Center tabs" className="flex flex-wrap gap-1">
      {items.map((it) => (
        <button
          key={it.key}
          role="tab"
          aria-selected={value === it.key}
          onClick={() => onChange(it.key)}
          className={cn("inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] focus-visible:outline focus-visible:outline-2", value === it.key ? "font-semibold" : "text-gray-600")}
          style={{ outlineColor: TK.focus, cursor: "pointer" }}
          title={it.label}
        >
          <it.Icon size={15} style={{ color: TK.brand }} />
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────────── Main Component ───────────────── */
export default function WriterCanvas({
  project,
  faviconUrlForDomain = (d) => `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(d)}`,
  draftId,
  initialLocale = "en-US",
  initialTone = "Helpful",
  initialDocTitle = "Content Marketing: The Practical Guide",
  initialSeoTitle = "Content Marketing: What It Is and Why It Matters",
  initialDescription = "Discover what content marketing is and why it matters for your business. Learn how to engage your audience effectively.",
  initialBlocks,
  initialTerms = ["content marketing", "what is content marketing", "content marketing strategy", "definition"],
  onShare,
  onSubmitForReview,
  onExport,
}: WriterCanvasProps) {
  /* header state */
  const [docTitle, setDocTitle] = useState(initialDocTitle);
  const [locale, setLocale] = useState(initialLocale);
  const [tone, setTone] = useState<Tone>(initialTone);
  const [suggesting, setSuggesting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /* body state */
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [description, setDescription] = useState(initialDescription);
  const [metaOpen, setMetaOpen] = useState(true);

  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks || [
      { id: "tldr", type: "tldr", text: "TL;DR: Lead with a direct answer, then polish structure, links, and citations.", html: "TL;DR: Lead with a <strong>direct answer</strong>, then polish structure, links, and citations." },
      { id: "da", type: "direct_answer", text: "Content marketing is creating useful content to attract and engage audiences and drive outcomes.", html: "Content marketing is creating <em>useful content</em> to attract and engage audiences and drive outcomes." },
      { id: "h2_1", type: "h2", text: "What is Content Marketing? A Simple Definition", html: "What is Content Marketing? A Simple Definition" },
      { id: "p_1", type: "p", text: "Content marketing focuses on creating valuable content to attract and engage audiences.", html: "Content marketing focuses on creating <strong>valuable content</strong> to attract and engage audiences." },
      { id: "h2_2", type: "h2", text: "Key Takeaways", html: "Key Takeaways" },
      { id: "p_2", type: "p", text: "Use concise headings, add internal links, and cite credible sources. Include TL;DR and FAQs to boost AEO readiness.", html: "Use concise headings, add <a href=\"https://example.com/links\">internal links</a>, and cite credible sources. Include TL;DR and FAQs to boost AEO readiness." },
      { id: "img_1", type: "image", text: "", src: "https://picsum.photos/800/400", alt: "Content funnel diagram" },
      { id: "h2_faq", type: "h2", text: "FAQs", html: "FAQs" },
      { id: "faq_q1", type: "faq_q", text: "What is content marketing?", html: "What is content marketing?" },
      { id: "faq_a1", type: "faq_a", text: "It’s a strategy to attract and engage audiences by creating useful, task‑aligned content.", html: "It’s a strategy to attract and engage audiences by creating <em>useful</em>, task‑aligned content." },
    ]
  );

  /* rails */
  const [rail, setRail] = useState<Rail>("guidelines");
  const [factsOpen, setFactsOpen] = useState<Record<string, boolean>>({});

  /* conflict */
  const [online, setOnline] = useState(true);
  const [conflictOpen, setConflictOpen] = useState(false);

  /* editor selection */
  const [activeId, setActiveId] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => (refs.current[id] = el), []);

  useEffect(() => {
    const h = () => setOnline(navigator.onLine);
    h();
    window.addEventListener("online", h);
    window.addEventListener("offline", h);
    return () => {
      window.removeEventListener("online", h);
      window.removeEventListener("offline", h);
    };
  }, []);

  const terms = initialTerms;
  const metrics = useMemo(() => metricsFor(blocks, docTitle, seoTitle, description, terms), [blocks, docTitle, seoTitle, description, terms]);

  /* toolbar helpers: focus & exec */
  const focusActive = useCallback(() => {
    const el = activeId ? refs.current[activeId] : null;
    if (el) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    return el;
  }, [activeId]);

  const exec = useCallback(
    (cmd: string, val?: string) => {
      const el = focusActive();
      if (!el) return;
      document.execCommand(cmd, false, val ?? "");
      setBlocks((xs) =>
        xs.map((b) => {
          if (b.id !== activeId) return b;
          const html = el.innerHTML;
          const text = el.textContent || "";
          return { ...b, html, text };
        })
      );
    },
    [focusActive, activeId]
  );

  const setAlign = useCallback(
    (align: "left" | "center" | "right") => {
      if (!activeId) return;
      setBlocks((xs) => xs.map((b) => (b.id === activeId ? { ...b, align } : b)));
    },
    [activeId]
  );

  /* rewrites */
  const doRewrite = useCallback(
    (id: string, kind: "concise" | "expand" | "tone" | "conflict") => {
      setBlocks((xs) =>
        xs.map((b) => {
          if (b.id !== id) return b;
          if (b.type === "image") return b;
          const basis = b.html ?? b.text;
          let next = basis;
          if (kind === "concise") next = concise(next);
          if (kind === "expand") next = expand(next);
          if (kind === "tone") next = retone(next, tone);
          if (kind === "conflict") next = resolveConflicts(next);
          return { ...b, text: (() => { const d = document.createElement("div"); d.innerHTML = next; return d.textContent || ""; })(), html: next };
        })
      );
    },
    [tone]
  );

  /* links + auto-opt */
  const insertIntoLastParagraph = (t: string) => {
    const last = [...blocks].reverse().find((b) => b.type === "p");
    if (!last) return;
    setBlocks((xs) =>
      xs.map((b) =>
        b.id === last.id
          ? (() => {
              const content = (b.html ?? b.text) + " " + t;
              return { ...b, html: content, text: (() => { const d = document.createElement("div"); d.innerHTML = content; return d.textContent || ""; })() };
            })()
          : b
      )
    );
  };

  const insertInternalLinks = () => {
    const candidates = terms.slice(0, 3);
    setBlocks((xs) =>
      xs.map((b) => {
        if (b.type === "p" || b.type === "faq_a") {
          const base = b.html ?? b.text;
          const linkified = candidates.reduce(
            (out, k) => out.replace(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i"), (m) => `<a href="https://example.com/${encodeURIComponent(m)}">${m}</a>`),
            base
          );
          return { ...b, html: linkified, text: (() => { const d = document.createElement("div"); d.innerHTML = linkified; return d.textContent || ""; })() };
        }
        return b;
      })
    );
  };

  const autoOptimize = () => {
    const missing = terms.filter((t) => metrics.used(t) === 0).slice(0, 3);
    setBlocks((xs) =>
      xs.map((b) => {
        if (b.type === "p") {
          const base = b.html ?? b.text;
          const tightened = base.length > 240 ? concise(base) : base;
          const withTerm = missing.length ? `${tightened} ${missing.shift()}`.trim() : tightened;
          return { ...b, html: withTerm, text: (() => { const d = document.createElement("div"); d.innerHTML = withTerm; return d.textContent || ""; })() };
        }
        if (b.type === "h2") return { ...b, html: resolveConflicts(b.html ?? b.text), text: resolveConflicts(b.text) };
        return b;
      })
    );
    if (!blocks.some((b) => b.type === "tldr"))
      setBlocks((xs) => [{ id: `tldr_${Date.now()}`, type: "tldr", text: "TL;DR: Direct answer first; then structure, links, and citations.", html: "TL;DR: Direct answer first; then structure, links, and citations." }, ...xs]);
    if (!blocks.some((b) => b.type === "direct_answer"))
      setBlocks((xs) => [{ id: `da_${Date.now()}`, type: "direct_answer", text: "Content marketing is creating useful content to attract and engage audiences.", html: "Content marketing is creating <strong>useful content</strong> to attract and engage audiences." }, ...xs]);
  };

  /* content section filtering & add */
  const [sect, setSect] = useState<SectionTab>("all");
  const counts = useMemo(() => {
    const c: Record<SectionTab, number> = {
      all: blocks.length,
      headings: blocks.filter((b) => b.type === "h2").length,
      paragraphs: blocks.filter((b) => b.type === "p").length,
      images: blocks.filter((b) => b.type === "image").length,
      faqs: blocks.filter((b) => b.type === "faq_q" || b.type === "faq_a").length,
      tldr: blocks.filter((b) => b.type === "tldr").length,
      direct: blocks.filter((b) => b.type === "direct_answer").length,
    };
    return c;
  }, [blocks]);

  const blocksToShow = useMemo(() => {
    switch (sect) {
      case "headings": return blocks.filter((b) => b.type === "h2");
      case "paragraphs": return blocks.filter((b) => b.type === "p");
      case "images": return blocks.filter((b) => b.type === "image");
      case "faqs": return blocks.filter((b) => b.type === "faq_q" || b.type === "faq_a");
      case "tldr": return blocks.filter((b) => b.type === "tldr");
      case "direct": return blocks.filter((b) => b.type === "direct_answer");
      default: return blocks;
    }
  }, [blocks, sect]);

  const addBySection = (t: SectionTab) => {
    if (t === "headings") setBlocks((xs) => [...xs, { id: `h2_${Date.now()}`, type: "h2", text: "New H2", html: "New H2" }]);
    if (t === "paragraphs") setBlocks((xs) => [...xs, { id: `p_${Date.now()}`, type: "p", text: "New paragraph…", html: "New paragraph…" }]);
    if (t === "images") {
      const url = window.prompt("Image URL?");
      if (url) setBlocks((xs) => [...xs, { id: `img_${Date.now()}`, type: "image", text: "", src: url, alt: "Image" }]);
    }
    if (t === "faqs") {
      const qid = `faq_q_${Date.now()}`;
      setBlocks((xs) => [...xs, { id: qid, type: "faq_q", text: "New question…", html: "New question…" }, { id: `${qid}_a`, type: "faq_a", text: "New answer…", html: "New answer…" }]);
    }
    if (t === "tldr") setBlocks((xs) => [...xs, { id: `tldr_${Date.now()}`, type: "tldr", text: "TL;DR: …", html: "TL;DR: …" }]);
    if (t === "direct") setBlocks((xs) => [...xs, { id: `da_${Date.now()}`, type: "direct_answer", text: "Direct answer …", html: "Direct answer …" }]);
  };

  /* outline for rail */
  const outline = blocks.filter((b) => b.type === "h2").map((b) => b.text);

  /* toolbar enabled state — all textual blocks support inline marks now */
  const activeBlock = blocks.find((b) => b.id === activeId);
  const marksEnabled = !!activeBlock && activeBlock.type !== "image";

  /* submit & export */
  const submit = () => onSubmitForReview?.({ draftId, locale });
  const doExport = (fmt: { html: boolean; md: boolean; docx: boolean }) => {
    setExportOpen(false);
    onExport?.(fmt);
  };

  return (
    <section className="w-full px-4 mt-4" style={fontStack}>
      {/* Offline banner */}
      {!online && (
        <div className="mb-3 rounded-md border px-3 py-2 text-sm" style={{ borderColor: TK.warning, background: TK.warningBg, color: TK.textStrong }}>
          <AlertTriangle size={16} className="mr-1 inline" /> You’re offline — changes are saved locally.
        </div>
      )}

      {/* ───────── Header (sticky in-panel) ───────── */}
      <div className="sticky top-0 z-30 mb-3 rounded-md border bg-white px-3 py-2" style={{ borderColor: TK.borderSubtle, boxShadow: TK.shadow1 }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left cluster */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Sparkles size={18} style={{ color: TK.brand }} />
            <div className="text-[18px] font-semibold shrink-0" style={{ color: TK.textStrong }}>
              Writer · Canvas
            </div>

            {project ? (
              <span className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm shrink-0" style={{ borderColor: TK.border, color: TK.text }} title="Open project settings">
                <img src={faviconUrlForDomain(project.domain)} className="h-4 w-4 rounded" alt="" />
                {project.domain}
              </span>
            ) : null}

            {/* Document Title (editable) */}
            <div className="flex-1 min-w-[160px]">
              <input
                className="ml-2 h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:outline focus-visible:outline-2"
                style={{ borderColor: TK.border, outlineColor: TK.focus }}
                placeholder="Untitled draft"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value.slice(0, 140))}
                title="Document/Content Title (H1)"
              />
            </div>

            {/* Locale */}
            <div className="inline-flex items-center gap-1 shrink-0">
              <Globe2 size={16} style={{ color: TK.brand }} />
              <select className="h-8 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2" style={{ borderColor: TK.border, outlineColor: TK.focus, cursor: "pointer" }} value={locale} onChange={(e) => setLocale(e.target.value)}>
                {["en-US", "en-GB", "hi-IN"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Suggesting toggle */}
            <div className="ml-2 inline-flex items-center gap-2 shrink-0">
              <ToggleSwitch id="suggesting" checked={suggesting} onChange={setSuggesting} label="Suggesting" />
            </div>
          </div>

          {/* Right cluster (CTAs) */}
          <div className="flex items-center gap-2 shrink-0">
            <SecondaryButton onClick={() => setExportOpen(true)} title="Export">
              <Download size={16} style={{ color: TK.brand }} />
              Export
            </SecondaryButton>
            <SecondaryButton onClick={onShare} title="Share">
              <Share2 size={16} style={{ color: TK.brand }} />
              Share
            </SecondaryButton>
            <PrimaryButton onClick={submit} title="Submit for review">
              <Send size={16} />
              Submit for review
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* ───────── Title & description (collapsible) ───────── */}
      <div className="mb-3 rounded-md border bg-white" style={{ borderColor: TK.borderSubtle }}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="inline-flex items-center gap-2">
            <FileText size={16} style={{ color: TK.brand }} />
            <div className="text-sm font-semibold" style={{ color: TK.textStrong }}>
              Title & description
            </div>
          </div>
          <button onClick={() => setMetaOpen((v) => !v)} className="inline-flex items-center gap-1 text-sm underline" style={{ color: TK.text, cursor: "pointer" }}>
            {metaOpen ? "Hide" : "Show"} {metaOpen ? <ChevronUpIcon /> : <ChevronDown size={14} />}
          </button>
        </div>
        {metaOpen && (
          <div className="grid gap-3 px-3 pb-3">
            <div>
              <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                SEO Title (recommended ≤ 70 chars)
              </div>
              <input
                className="h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2"
                style={{ borderColor: seoTitle.length <= 70 ? TK.border : TK.warning, outlineColor: TK.focus }}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Title tag…"
              />
              <div className="mt-1 text-[12px]" style={{ color: TK.textMuted }}>
                {seoTitle.length}/70
              </div>
            </div>
            <div>
              <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                Meta description (≤ 156 chars)
              </div>
              <textarea
                className="min-h-[64px] w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:outline focus-visible:outline-2"
                style={{ borderColor: description.length <= 156 ? TK.border : TK.warning, outlineColor: TK.focus }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Meta description…"
              />
              <div className="mt-1 text-[12px]" style={{ color: TK.textMuted }}>
                {description.length}/156
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ───────── Formatting toolbar (fully wired) ───────── */}
      <div
        className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-white px-2 py-1"
        style={{ borderColor: TK.borderSubtle }}
        onMouseDown={(e) => {
          // Keep focus on active block when clicking toolbar
          e.preventDefault();
        }}
      >
        <GhostButton onClick={() => exec("bold")} disabled={!marksEnabled} title="Bold">
          <Bold size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => exec("italic")} disabled={!marksEnabled} title="Italic">
          <Italic size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => exec("underline")} disabled={!marksEnabled} title="Underline">
          <Underline size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => exec("strikeThrough")} disabled={!marksEnabled} title="Strikethrough">
          <Strikethrough size={15} style={{ color: TK.brand }} />
        </GhostButton>

        <span className="mx-2 h-5 w-px bg-gray-200" />

        <GhostButton onClick={() => exec("insertUnorderedList")} disabled={!marksEnabled} title="Bulleted list">
          <List size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => exec("insertOrderedList")} disabled={!marksEnabled} title="Numbered list">
          <ListOrdered size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => exec("formatBlock", "blockquote")} disabled={!marksEnabled} title="Quote">
          <Quote size={15} style={{ color: TK.brand }} />
        </GhostButton>

        <span className="mx-2 h-5 w-px bg-gray-200" />

        <GhostButton
          onClick={() => {
            const url = window.prompt("Link URL?");
            if (url) exec("createLink", url);
          }}
          disabled={!marksEnabled}
          title="Insert link"
        >
          <LinkIcon size={15} style={{ color: TK.brand }} />
        </GhostButton>

        <GhostButton
          onClick={() => {
            const url = window.prompt("Image URL?");
            if (!url) return;
            const idx = blocks.findIndex((b) => b.id === activeId);
            const nb: Block = { id: `img_${Date.now()}`, type: "image", text: "", src: url, alt: "Image" };
            if (idx >= 0) setBlocks((xs) => [...xs.slice(0, idx + 1), nb, ...xs.slice(idx + 1)]);
            else setBlocks((xs) => [...xs, nb]);
          }}
          title="Insert image block"
        >
          <ImageIcon size={15} style={{ color: TK.brand }} />
        </GhostButton>

        <span className="mx-2 h-5 w-px bg-gray-200" />

        <GhostButton onClick={() => setAlign("left")} disabled={!activeBlock} title="Align left">
          <AlignLeft size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => setAlign("center")} disabled={!activeBlock} title="Align center">
          <AlignCenter size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => setAlign("right")} disabled={!activeBlock} title="Align right">
          <AlignRight size={15} style={{ color: TK.brand }} />
        </GhostButton>

        <span className="mx-2 h-5 w-px bg-gray-200" />

        <GhostButton onClick={() => exec("undo")} title="Undo (selection)">
          <Undo size={15} style={{ color: TK.brand }} />
        </GhostButton>
        <GhostButton onClick={() => exec("redo")} title="Redo (selection)">
          <Redo size={15} style={{ color: TK.brand }} />
        </GhostButton>

        <div className="ml-auto inline-flex items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
          <Info size={14} />
          Inline marks apply to the focused block (all text blocks supported).
        </div>
      </div>

      {/* ───────── Content Section Tabs ───────── */}
      <div className="mb-3 rounded-md border bg-white px-3 py-2" style={{ borderColor: TK.borderSubtle }}>
        <SectionTabs value={sect} onChange={setSect} counts={counts} onAdd={addBySection} />
      </div>

      {/* ───────── Body Grid ───────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Editor column */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-8">
          <div className="grid gap-3">
            {blocksToShow.map((b) => (
              <div key={b.id} onMouseDown={() => setActiveId(b.id)}>
                <BlockView
                  b={b}
                  active={activeId === b.id}
                  onFocus={() => setActiveId(b.id)}
                  onChange={({ text, html }) =>
                    setBlocks((xs) =>
                      xs.map((it) =>
                        it.id === b.id
                          ? {
                              ...it,
                              text: it.type === "image" ? it.text : text ?? it.text,
                              html: it.type === "image" ? it.html : html ?? it.html,
                              alt: it.type === "image" ? text || it.alt : it.alt,
                            }
                          : it
                      )
                    )
                  }
                  onConcise={() => doRewrite(b.id, "concise")}
                  onExpand={() => doRewrite(b.id, "expand")}
                  onTone={() => doRewrite(b.id, "tone")}
                  onConflict={() => doRewrite(b.id, "conflict")}
                  registerRef={(el) => registerRef(b.id, el)}
                  onReplaceImage={() => {
                    const url = window.prompt("New image URL?", b.src || "");
                    if (!url) return;
                    setBlocks((xs) => xs.map((it) => (it.id === b.id ? { ...it, src: url } : it)));
                  }}
                  onRemove={() => setBlocks((xs) => xs.filter((it) => it.id !== b.id))}
                />
                {/* Block tools */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                  <GhostButton
                    onClick={() =>
                      setBlocks((xs) => {
                        const idx = xs.findIndex((it) => it.id === b.id);
                        if (idx < 0) return xs;
                        const clone: Block = { ...b, id: `${b.id}_copy_${Date.now()}` };
                        return [...xs.slice(0, idx + 1), clone, ...xs.slice(idx + 1)];
                      })
                    }
                    title="Duplicate"
                  >
                    <Scissors size={14} /> Duplicate
                  </GhostButton>
                  <GhostButton onClick={() => setBlocks((xs) => xs.filter((it) => it.id !== b.id))} title="Delete">
                    <Trash2 size={14} /> Delete
                  </GhostButton>
                </div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div className="sticky bottom-0 z-10 mt-4 -mx-2 flex items-center justify-between rounded-md border bg-white px-3 py-2 text-[12px]" style={{ borderColor: TK.borderSubtle }} role="status">
            <div className="flex flex-wrap items-center gap-3" style={{ color: TK.textMuted }}>
              <GaugeCircle size={14} style={{ color: TK.brand }} />
              <span>Words: <b>{metrics.words}</b></span>
              <span>Sentences: <b>{metrics.sentences}</b></span>
              <span>FK grade: <b>{metrics.grade.toFixed(1)}</b></span>
              <span>Links: <b>{metrics.links}</b></span>
              <span>Locale: <b>{locale}</b></span>
              {suggesting ? (
                <span className="rounded-full border px-2 py-0.5" style={{ borderColor: TK.border, color: TK.text }}>
                  Suggesting ON
                </span>
              ) : null}
            </div>
            <div className="inline-flex items-center gap-2">
              {/* Branded, filled CTA per requirement */}
              <PrimaryButton onClick={() => setConflictOpen(true)} title="Simulate merge conflict">
                <AlertTriangle size={14} />
                Simulate conflict
              </PrimaryButton>
              <a className="inline-flex items-center gap-1 text-[12px] underline" href="#" onClick={(e) => e.preventDefault()} title="Open outline in new tab">
                Outline <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-4">
          <div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle, background: TK.bgPanel, boxShadow: TK.shadow1 }}>
            {/* KPI header */}
            <div className="mb-2 flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: TK.border }}>
              <div className="flex items-center gap-3">
                <div className="grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(${TK.brand} ${Math.round(metrics.contentScore * 3.6)}deg,#E5E7EB ${Math.round(metrics.contentScore * 3.6)}deg)` }}>
                  <div className="grid size-10 place-items-center rounded-full bg-white text-[12px] font-semibold" style={{ color: TK.textStrong }}>
                    {metrics.contentScore}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold" style={{ color: TK.textStrong }}>Content Score</div>
                  <div className="text-[12px]" style={{ color: TK.textMuted }}>Live as you type</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2">
                <PrimaryButton onClick={autoOptimize} title="Auto‑Optimize">
                  <Sparkles size={16} /> Auto‑Optimize
                </PrimaryButton>
                <SecondaryButton onClick={insertInternalLinks} title="Insert internal links">
                  <LinkIcon size={16} /> Internal links
                </SecondaryButton>
              </div>
            </div>

            {/* KPI rings */}
            <div className="mb-3 flex items-center justify-between">
              <Ring value={metrics.seo} label="SEO" color={TK.brand} />
              <Ring value={metrics.readability} label="Readability" color={TK.success} />
              <Ring value={metrics.aeo} label="AEO" color={TK.warning} />
            </div>

            {/* Interactive tabs */}
            <div className="border-t pt-2" style={{ borderColor: TK.border }}>
              <RailTabs value={rail} onChange={setRail} />
            </div>

            {/* Tab content */}
            <div className="mt-3 grid gap-3 text-sm">
              {rail === "guidelines" && (
                <>
                  <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                    <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>Content Structure</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "WORDS", val: metrics.words, goal: "2,100–2,415", ok: metrics.words >= 2100 && metrics.words <= 2415 },
                        { label: "HEADINGS", val: metrics.headings, goal: "24–29", ok: metrics.headings >= 24 && metrics.headings <= 29 },
                        { label: "PARAGRAPHS", val: metrics.paragraphs, goal: "68–82", ok: metrics.paragraphs >= 68 && metrics.paragraphs <= 82 },
                        { label: "IMAGES", val: metrics.images, goal: "7–8", ok: metrics.images >= 7 && metrics.images <= 8 },
                      ].map((x) => (
                        <div key={x.label} className="flex items-center justify-between rounded border px-2 py-1" style={{ borderColor: x.ok ? TK.success : TK.border }}>
                          <div className="text-[12px]" style={{ color: TK.textMuted }}>{x.label}</div>
                          <div style={{ color: x.ok ? TK.success : TK.textStrong }}>
                            {x.val} <span className="text-[12px] text-gray-500">/ {x.goal}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <TermsCard terms={terms} used={(k) => metrics.used(k)} onInsert={(k) => insertIntoLastParagraph(k)} />
                </>
              )}

              {rail === "facts" && (
                <div className="grid gap-2">
                  <div className="inline-flex items-center justify-between rounded-md border px-2 py-1" style={{ borderColor: TK.border }}>
                    <div className="inline-flex items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
                      Sources: SERPs · Docs · LLMs
                    </div>
                    <PrimaryButton onClick={() => insertIntoLastParagraph("Creators should produce original, people‑first content.")}>
                      <Sparkles size={16} /> Boost Coverage
                    </PrimaryButton>
                  </div>
                  {[
                    { id: "g-ai-policy", name: "Google's Policy on AI‑Generated Content", count: 5 },
                    { id: "quality-seo", name: "Quality of Content and SEO", count: 6 },
                    { id: "detection-ai", name: "Detection of AI Content by Google", count: 4 },
                  ].map((g) => {
                    const open = !!factsOpen[g.id];
                    return (
                      <div key={g.id} className="rounded-md border" style={{ borderColor: TK.border }}>
                        <button className="flex w-full items-center justify-between px-2 py-2 text-left" style={{ cursor: "pointer" }} onClick={() => setFactsOpen((p) => ({ ...p, [g.id]: !open }))}>
                          <span className="inline-flex items-center gap-2">
                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            {g.name}
                          </span>
                          <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: TK.warningBg, color: TK.warning }}>
                            Facts to cover: {g.count}
                          </span>
                        </button>
                        {open && (
                          <div className="grid gap-2 border-t p-2 text-sm" style={{ borderColor: TK.border }}>
                            <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                              To cover — “Creators should produce original, high‑quality, people‑first content.”{" "}
                              <button className="ml-2 text-[12px] underline" style={{ cursor: "pointer" }} onClick={() => insertIntoLastParagraph("Creators should produce original, people‑first content to succeed in Search.")}>
                                Insert
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {rail === "outline" && (
                <div className="grid gap-2">
                  {outline.length ? (
                    outline.map((h, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-2" style={{ borderColor: TK.border }}>
                        <div className="font-medium" style={{ color: TK.text }}>{h}</div>
                        <div className="inline-flex items-center gap-1">
                          <SecondaryButton onClick={() => setBlocks((xs) => xs.filter((b) => !(b.type === "h2" && b.text === h)))}>Remove</SecondaryButton>
                          <SecondaryButton onClick={() => setBlocks((xs) => [...xs, { id: `h2_${Date.now()}`, type: "h2", text: "New H2", html: "New H2" }])}>
                            <Plus size={16} /> H2
                          </SecondaryButton>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border p-2 text-[12px]" style={{ borderColor: TK.border, color: TK.textMuted }}>
                      Outline will appear as you add H2 blocks.
                    </div>
                  )}
                </div>
              )}

              {rail === "readability" && (
                <div className="grid gap-2">
                  <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                    <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>Readability checks</div>
                    <ul className="list-disc pl-5">
                      <li>Target grade ≤ 9.0 — current {metrics.grade.toFixed(1)}</li>
                      <li>Prefer short sentences and active voice.</li>
                    </ul>
                  </div>
                  <PrimaryButton onClick={() => setBlocks((xs) => xs.map((b) => (b.type !== "image" ? { ...b, html: concise(b.html ?? b.text), text: (() => { const d = document.createElement("div"); d.innerHTML = concise(b.html ?? b.text); return d.textContent || ""; })() } : b)))}>
                    <Wand2 size={16} /> Apply readability fixes
                  </PrimaryButton>
                </div>
              )}

              {rail === "links" && (
                <div className="grid gap-2">
                  <div className="text-[12px]" style={{ color: TK.textMuted }}>Link hygiene: {metrics.links} link(s) detected — aim for 3–6 per 1200 words.</div>
                  <SecondaryButton onClick={insertInternalLinks}>
                    <LinkIcon size={16} /> Insert internal links
                  </SecondaryButton>
                </div>
              )}

              {rail === "citations" && (
                <div className="grid gap-2">
                  <div className="rounded-md border p-2" style={{ borderColor: TK.border }}>
                    Add or verify citations for facts and stats. Use project default style.
                  </div>
                  <SecondaryButton onClick={() => insertIntoLastParagraph("[1] developers.google.com/search/docs/")}>Insert cite</SecondaryButton>
                </div>
              )}

              {rail === "versions" && (
                <div className="grid gap-2">
                  {["v5 — Readability fixes", "v4 — GEO en‑GB", "v3 — AEO pack", "v2 — Regenerate H2.1", "v1 — First draft"].map((v, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border p-2" style={{ borderColor: TK.border }}>
                      <div>{v}</div>
                      <div className="inline-flex items-center gap-2">
                        <SecondaryButton>
                          <Check size={16} /> Restore
                        </SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <DiffModal
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        base={"Start with a direct answer and then improve structure."}
        mine={"Start with a direct answer, then polish headings and links."}
        theirs={"Begin with context, then craft your direct answer and structure."}
      />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} onConfirm={doExport} />

      {/* helper keyframes */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </section>
  );
}

/* tiny chevron-up (since lucide lacks a direct named export above) */
function ChevronUpIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: TK.brand }} xmlns="http://www.w3.org/2000/svg"><path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
