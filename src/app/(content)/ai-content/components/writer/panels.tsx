'use client';

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Eye,
  EyeOff,
  Globe2,
  History,
  ListChecks,
  MoveRight,
  Pause,
  RefreshCcw,
  Settings,
  Sparkles,
  Square,
  Timer,
  Upload,
  Wand2,
  X,
  Layout,
  Share2,
} from "lucide-react";
import { GhostButton, PrimaryButton, SecondaryButton } from "./primitives";
import { cardMotionProps, listItemMotion, TK } from "./shared";

export function HelperPanel() {
  return (
    <aside className="rounded-md border p-3 h-full" style={{ borderColor: TK.borderSubtle, background: TK.bgPanel }}>
      <div className="mb-2 inline-flex items-center gap-2">
        <ListChecks size={16} style={{ color: TK.brand }} />
        <div className="text-[12px] font-semibold uppercase tracking-wide">
          Tips & Examples
        </div>
      </div>
      <ul className="ml-4 list-disc space-y-1 text-[12px]" style={{ color: TK.text }}>
        <li>Start with a concrete topic (for example, "Server-side rendering for SEO").</li>
        <li>Add 3-8 target keywords; long-tail phrases are welcomed.</li>
        <li>Pick AEO intent that matches the searcher goal.</li>
      </ul>
      <div className="mt-3 rounded-md border p-2 text-sm" style={{ borderColor: TK.border, background: "#FCFDFE" }}>
        <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
          Outline pattern
        </div>
        <pre className="whitespace-pre-wrap text-[12px]" style={{ color: TK.text }}>
          {`H2 Intro
H2 Concept
  H3 Key idea A
  H3 Key idea B
H2 How-to
  H3 Step 1
  H3 Step 2
H2 FAQs`}
        </pre>
      </div>
    </aside>
  );
}

export function StreamingOverlay({
  elapsedMs,
  onCancel,
  onPause,
  onPartial,
  steps,
}: {
  elapsedMs: number;
  onCancel: () => void;
  onPause: () => void;
  onPartial: (reason: "section" | "locale_changed") => void;
  steps: Array<{ key: string; name: string; done: boolean }>;
}) {
  const mins = Math.floor(elapsedMs / 60000);
  const secs = Math.floor((elapsedMs % 60000) / 1000);
  return (
    <aside className="rounded-md border p-3 h-full" style={{ borderColor: TK.borderSubtle, background: TK.bgPanel }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Sparkles size={16} style={{ color: TK.brand }} />
          <div>
            <div className="text-sm font-medium" style={{ color: TK.text }}>
              Generating with Wranker AI
            </div>
            <div className="text-[12px]" style={{ color: TK.textMuted }}>
              <Timer className="mr-1 inline-block" size={12} /> Elapsed {mins}:{secs.toString().padStart(2, "0")}
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1">
          <GhostButton onClick={onPause} aria-label="Pause generation">
            <Pause size={16} />
            Pause
          </GhostButton>
          <GhostButton onClick={onCancel} aria-label="Cancel generation">
            <Square size={16} />
            Cancel
          </GhostButton>
        </div>
      </div>

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {steps.map((s, i) => (
            <motion.li
              key={s.key}
              className="flex items-center gap-2 rounded-md border px-2 py-1"
              style={{
                borderColor: s.done ? TK.border : TK.borderSubtle,
                background: s.done ? "#FAFDFF" : TK.bgPanel,
              }}
              {...listItemMotion}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              {s.done ? (
                <Check size={14} style={{ color: TK.success }} />
              ) : (
                <RefreshCcw size={14} className="animate-spin" style={{ color: TK.brand }} />
              )}
              <span className="text-sm" style={{ color: TK.text }}>
                {i + 1}. {s.name}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

    </aside>
  );
}

export function QuickWinCard({
  title,
  est,
  onPreview,
  onApply,
  canUndo,
  onUndo,
  children,
}: React.PropsWithChildren<{
  title: string;
  est: string;
  onPreview: () => void;
  onApply: () => void;
  canUndo: boolean;
  onUndo: () => void;
}>) {
  return (
    <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold" style={{ color: TK.text }}>
            {title}
          </div>
          <div className="text-[12px]" style={{ color: TK.textMuted }}>
            Est. {est}
          </div>
        </div>
        <div className="inline-flex items-center gap-1">
          <GhostButton onClick={onPreview} aria-label={`Preview ${title}`}>
            Preview
          </GhostButton>
          <GhostButton onClick={canUndo ? onUndo : onApply} aria-label={canUndo ? `Undo ${title}` : `Apply ${title}`}>
            {canUndo ? (
              <>
                <X size={16} /> Undo
              </>
            ) : (
              <>
                <MoveRight size={16} /> Apply
              </>
            )}
          </GhostButton>
        </div>
      </div>
      <div className="mt-2 text-sm" style={{ color: TK.text }}>
        {children}
      </div>
    </motion.div>
  );
}

export function RightRail({
  collapsed,
  onToggle,
  canUndoScore,
  canUndoReadability,
  canUndoAeo,
  onPreviewScore,
  onPreviewReadability,
  onPreviewAeo,
  onApplyScore,
  onApplyReadability,
  onApplyAeo,
  onUndoScore,
  onUndoReadability,
  onUndoAeo,
}: {
  collapsed: boolean;
  onToggle: (c: boolean) => void;
  canUndoScore: boolean;
  canUndoReadability: boolean;
  canUndoAeo: boolean;
  onPreviewScore: () => void;
  onPreviewReadability: () => void;
  onPreviewAeo: () => void;
  onApplyScore: () => void;
  onApplyReadability: () => void;
  onApplyAeo: () => void;
  onUndoScore: () => void;
  onUndoReadability: () => void;
  onUndoAeo: () => void;
}) {
  return (
    <aside className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle, background: TK.bgPanel }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Wand2 size={16} style={{ color: TK.brand }} />
          <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: TK.textMuted }}>
            Apply Fix
          </div>
        </div>
        <GhostButton onClick={() => onToggle(!collapsed)}>
          {collapsed ? <Eye size={16} /> : <EyeOff size={16} />}
          {collapsed ? "Show" : "Hide"}
        </GhostButton>
      </div>
      {!collapsed && (
        <div className="grid gap-3">
          <QuickWinCard title="Score fixes" est="+4 pts" onPreview={onPreviewScore} onApply={onApplyScore} canUndo={canUndoScore} onUndo={onUndoScore}>
            Normalize headings and structure; align terminology.
          </QuickWinCard>
          <QuickWinCard
            title="Readability fixes"
            est="-1.2 FK"
            onPreview={onPreviewReadability}
            onApply={onApplyReadability}
            canUndo={canUndoReadability}
            onUndo={onUndoReadability}
          >
            Shorten long sentences; tighten passive phrasing.
          </QuickWinCard>
          <QuickWinCard title="AEO fixes" est="+12% ready" onPreview={onPreviewAeo} onApply={onApplyAeo} canUndo={canUndoAeo} onUndo={onUndoAeo}>
            Insert Direct Answer, TL;DR, and 3-5 FAQs using current context.
          </QuickWinCard>
        </div>
      )}
    </aside>
  );
}

export function Drawer({
  open,
  title,
  onClose,
  width = 440,
  children,
}: React.PropsWithChildren<{ open: boolean; title: string; onClose: () => void; width?: number }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog" aria-label={title}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full bg-white shadow-lg"
        style={{
          width,
          borderLeft: `1px solid ${TK.border}`,
          borderTopLeftRadius: TK.radius,
          borderBottomLeftRadius: TK.radius,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: TK.border }}>
          <div className="inline-flex items-center gap-2">
            <Settings size={16} style={{ color: TK.brand }} />
            <h4 className="text-sm font-semibold" style={{ color: TK.textStrong }}>
              {title}
            </h4>
          </div>
          <GhostButton onClick={onClose} aria-label="Close drawer">
            <X size={16} />
            Close
          </GhostButton>
        </div>
        <div className="h-[calc(100%-56px)] overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

export function VersionHistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title="Version History">
      <div className="rounded-md border p-3" style={{ borderColor: TK.border }}>
        <div className="text-sm font-medium" style={{ color: TK.text }}>
          Version history data
        </div>
        <div className="text-[12px]" style={{ color: TK.textMuted }}>
          Backend endpoint not wired yet - show "-" until the API is available.
        </div>
        <div className="mt-2 rounded-md border px-2 py-1 text-sm" style={{ borderColor: TK.border, color: TK.text }}>
          -
        </div>
      </div>
    </Drawer>
  );
}

export function StickyFooter({
  hasDraft,
  exporting,
  onOpenCanvas,
  onSaveDraft,
  onExportClick,
  onShareClick,
}: {
  hasDraft: boolean;
  exporting?: boolean;
  onOpenCanvas: () => void;
  onSaveDraft: () => void;
  onExportClick: () => void;
  onShareClick: () => void;
}) {
  const disabled = !hasDraft;
  return (
    <div
      className="sticky bottom-0 z-20 mt-4 -mx-4 flex items-center justify-between border-t bg-white px-4 py-3"
      style={{ borderColor: TK.borderSubtle }}
      role="toolbar"
      aria-label="Writer footer actions"
    >
      <div className="text-[12px]" style={{ color: TK.textMuted }}>
        {hasDraft ? "Draft is editable. Unsaved changes are guarded on navigation." : "Generate a draft to enable Canvas & Save."}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton onClick={onExportClick} disabled={disabled || exporting} aria-disabled={disabled || exporting}>
          <Upload size={16} className="rotate-180" />
          {exporting ? "Exporting..." : "Export"}
        </SecondaryButton>
        <SecondaryButton disabled aria-disabled onClick={onShareClick}>
          <Share2 size={16} /> Share
        </SecondaryButton>
        <PrimaryButton disabled onClick={onOpenCanvas} aria-disabled>
          <Layout size={16} /> Open in Canvas
        </PrimaryButton>
        <PrimaryButton disabled onClick={onSaveDraft} aria-disabled>
          <History size={16} /> Save Draft
        </PrimaryButton>
      </div>
    </div>
  );
}
