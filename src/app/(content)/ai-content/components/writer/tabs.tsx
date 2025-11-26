'use client';

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  Globe2,
  Layout,
  RefreshCcw,
  Wand2,
} from "lucide-react";
import type { DraftSection, WriterResponse } from "@/src/lib/ai/writer-schema";
import { cardMotionProps, listItemMotion, TK } from "./shared";
import { GhostButton, PulseBlock, SecondaryButton } from "./primitives";

export type TabKey = "outline" | "draft" | "seo" | "geo" | "aeo" | "citations";
export type StepState = { key: TabKey | "final"; name: string; done: boolean };

export function TabStrip({
  value,
  onChange,
  readyMap,
  onOpenCiteStyle,
}: {
  value: TabKey;
  onChange: (k: TabKey) => void;
  readyMap?: Partial<Record<TabKey, boolean>>;
  onOpenCiteStyle?: () => void;
}) {
  const items: { key: TabKey; label: string }[] = [
    { key: "outline", label: "Outline" },
    { key: "draft", label: "Draft" },
    { key: "seo", label: "SEO Pack" },
    { key: "geo", label: "GEO Pack" },
    { key: "aeo", label: "AEO Pack" },
    { key: "citations", label: "Citations" },
  ];

  return (
    <div className="sticky top-0 z-10 -mx-3 mb-3 border-b bg-white px-3" style={{ borderColor: TK.border }}>
      <div role="tablist" aria-label="Writer results tabs" className="flex h-11 items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          {items.map((it, idx) => (
            <motion.button
              key={it.key}
              role="tab"
              aria-selected={value === it.key}
              onClick={() => onChange(it.key)}
              className="relative pb-2 text-sm font-medium focus-visible:outline"
              style={{
                cursor: "pointer",
                color: value === it.key ? TK.textStrong : TK.text,
                outlineColor: TK.focus,
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18, delay: idx * 0.01 }}
            >
              {it.label}
              <AnimatePresence>
                {value === it.key ? (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full"
                    style={{ background: TK.brand }}
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.3 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                ) : null}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        {value === "citations" ? (
          <div className="pb-1">
            <SecondaryButton disabled={!readyMap?.citations} onClick={onOpenCiteStyle}>
              <BookOpenCheck size={16} style={{ color: TK.brand }} />
              <span className="ml-1 text-[12px]">Cite style</span>
            </SecondaryButton>
          </div>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

export function OutlineTab({
  outline,
  sections,
  isStreaming,
  regeneratingIds,
  onRegenerate,
  onInsert,
}: {
  outline: WriterResponse["outline"];
  sections: DraftSection[];
  isStreaming: boolean;
  regeneratingIds?: string[];
  onRegenerate: (id: string) => void;
  onInsert: (level: "h2" | "h3") => void;
}) {
  const displayOutline =
    outline.length ? outline : sections.map((s) => ({ heading: s.heading, summary: s.markdown?.slice(0, 160) ?? "" }));

  return (
    <div className="grid gap-3">
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-2 text-[12px]" style={{ color: TK.textMuted }}>
          Structure
        </div>
        <ol className="space-y-1 pl-4">
          <AnimatePresence initial={false}>
            {displayOutline.map((s, index) => {
              const regeningId = sections[index]?.id ?? `outline-${index}`;
              const isRegenerating = regeneratingIds?.includes(regeningId) ?? false;
              return (
                <motion.li key={`${s.heading}-${index}`} className="list-decimal" {...listItemMotion} transition={{ duration: 0.35, delay: index * 0.04 }}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium" style={{ color: TK.text }}>
                        {s.heading}
                      </span>
                      {s.summary ? (
                        <p className="text-[12px]" style={{ color: TK.textMuted }}>
                          {s.summary}
                        </p>
                      ) : null}
                      {isRegenerating ? (
                        <div className="mt-1 space-y-1">
                          <PulseBlock className="h-3 w-4/5" />
                          <PulseBlock className="h-3 w-3/5" />
                        </div>
                      ) : null}
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <GhostButton onClick={() => onRegenerate(regeningId)} aria-label="Regenerate this section" disabled={isRegenerating}>
                        <Wand2 size={16} style={{ color: TK.brand }} /> {isRegenerating ? "Regenerating..." : "Regenerate"}
                      </GhostButton>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
        {!displayOutline.length && isStreaming ? (
          <motion.div
            className="space-y-2 pt-2"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="space-y-1">
                <PulseBlock className="h-3 w-3/4" />
                <PulseBlock className="h-3 w-2/3" />
              </div>
            ))}
          </motion.div>
        ) : null}
        <div className="mt-2 inline-flex items-center gap-2">
          <SecondaryButton onClick={() => onInsert("h2")}>
            <FileText size={16} style={{ color: TK.brand }} /> Insert H2
          </SecondaryButton>
          <SecondaryButton onClick={() => onInsert("h3")}>
            <Layout size={16} style={{ color: TK.brand }} /> Insert H3
          </SecondaryButton>
        </div>
      </motion.div>
    </div>
  );
}

type DraftSectionDisplay = DraftSection & { level?: "h2" | "h3"; order?: string; anchor?: string };

const inferLevel = (heading: string, index: number): "h2" | "h3" => {
  const normalized = typeof heading === "string" ? heading.trim() : "";
  if (!normalized) return index === 0 ? "h2" : "h3";
  if (/^h3\b|^###/.test(normalized.toLowerCase())) return "h3";
  if (/^h2\b|^##/.test(normalized.toLowerCase())) return "h2";
  if (/^\d+\.\d+/.test(normalized)) return "h3";
  if (/faq|step|tip|why|how/i.test(normalized) && index > 0) return "h3";
  return index === 0 ? "h2" : "h3";
};

const decorateSections = (sections: DraftSection[]): DraftSectionDisplay[] => {
  let h2Index = 0;
  let h3Index = 0;
  return sections.map((section, index) => {
    const level = (section as DraftSectionDisplay).level ?? inferLevel(section.heading || "", index);
    const safeId = typeof section.id === "string" ? section.id : section.id != null ? String(section.id) : undefined;
    if (level === "h2") {
      h2Index += 1;
      h3Index = 0;
    } else {
      h3Index += 1;
    }
    const order = level === "h2" ? `${h2Index}` : `${h2Index || 1}.${h3Index}`;
    return { ...section, level, order, anchor: safeId ?? `section-${index}` };
  });
};

const SectionBadge = ({ level }: { level?: "h2" | "h3" }) => {
  const label = level === "h3" ? "H3" : "H2";
  const bg = level === "h3" ? "linear-gradient(120deg,#A855F7,#6366F1)" : "linear-gradient(120deg,#0EA5E9,#22C55E)";
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm" style={{ background: bg }}>
      {label}
    </span>
  );
};

const SectionMeta = ({ section }: { section: DraftSectionDisplay }) => (
  <div className="inline-flex flex-wrap items-center gap-2">
    {section.order ? (
      <span className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: TK.border, color: TK.textMuted }}>
        {section.order}
      </span>
    ) : null}
    {typeof section.score === "number" ? (
      <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: TK.successBg, color: TK.success }}>
        Score {section.score}
      </span>
    ) : null}
    {typeof section.fk === "number" ? (
      <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: TK.warningBg, color: TK.warning }}>
        FK {section.fk.toFixed(1)}
      </span>
    ) : null}
  </div>
);

const renderMarkdownBlocks = (markdown: string) => {
  const blocks = (markdown || "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, idx) => {
    const headingMatch = block.match(/^#{1,6}\s+/);
    if (headingMatch) {
      const level = headingMatch[0].trim().length;
      const text = block.replace(/^#{1,6}\s+/, "");
      const Tag = level <= 2 ? ("h3" as const) : ("h4" as const);
      return (
        <Tag key={`h-${idx}`} className="font-semibold" style={{ color: TK.textStrong }}>
          {text}
        </Tag>
      );
    }
    const lines = block.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const isUl = lines.every((l) => /^[-*]\s+/.test(l));
    const isOl = lines.every((l) => /^\d+\.\s+/.test(l));
    if (isUl) {
      return (
        <ul key={`ul-${idx}`} className="list-disc pl-4 space-y-1" style={{ color: TK.text }}>
          {lines.map((l, i) => (
            <li key={i}>{l.replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
    }
    if (isOl) {
      return (
        <ol key={`ol-${idx}`} className="list-decimal pl-4 space-y-1" style={{ color: TK.text }}>
          {lines.map((l, i) => (
            <li key={i}>{l.replace(/^\d+\.\s+/, "")}</li>
          ))}
        </ol>
      );
    }
    return (
      <p key={`p-${idx}`} className="text-sm leading-relaxed" style={{ color: TK.text }}>
        {block}
      </p>
    );
  });
};

export function DraftTab({
  sections,
  streaming,
  regeneratingIds,
  onRegenerate,
}: {
  sections: DraftSection[];
  streaming: boolean;
  regeneratingIds?: string[];
  onRegenerate: (id: string) => void;
}) {
  const decorated = useMemo(() => decorateSections(sections), [sections]);
  const hasSections = decorated.length > 0;

  return (
    <motion.div className="grid gap-3" >

      <AnimatePresence initial={false}>
        {decorated.map((s, index) => (
          <motion.article
            key={s.anchor}
            className="rounded-md border p-3"
            style={{ borderColor: TK.borderSubtle }}
            {...listItemMotion}
            transition={{ duration: 0.4, delay: index * 0.03 }}
          >
            <header className="mb-2 flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2">
                  <SectionBadge level={s.level} />
                  <span className="text-[12px]" style={{ color: TK.textMuted }}>
                    Section {s.order}
                  </span>
                </div>

              </div>
              <div className="inline-flex items-center gap-1">
                <GhostButton
                  onClick={() => onRegenerate(s.id ?? `draft-${index}`)}
                  aria-label="Regenerate this section"
                  disabled={regeneratingIds?.includes(s.id ?? `draft-${index}`)}
                >
                  <RefreshCcw size={16} style={{ color: TK.brand }} />
                  {regeneratingIds?.includes(s.id ?? `draft-${index}`) ? "Regenerating..." : "Regenerate"}
                </GhostButton>
              </div>
            </header>
            <div className="prose prose-sm max-w-none">
              {regeneratingIds && regeneratingIds.includes(s.id ?? `draft-${index}`) ? (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.1, repeat: Infinity, repeatType: "mirror" }}
                >
                  <PulseBlock className="h-3 w-11/12" />
                  <PulseBlock className="h-3 w-10/12" />
                  <PulseBlock className="h-3 w-9/12" />
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {renderMarkdownBlocks(s.markdown || "Draft text will stream here. Add sections to outline to pre-allocate H2/H3 slots.")}
                </div>
              )}
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export function SEOTab({
  seoPack,
  streaming,
  onInsert,
}: {
  seoPack?: WriterResponse["seoPack"];
  streaming: boolean;
  onInsert: () => void;
}) {
  const titleTagsMaybe = seoPack?.titleTags;
  const metaDescriptionsMaybe = seoPack?.metaDescriptions;
  const titleTags = Array.isArray(titleTagsMaybe) ? titleTagsMaybe : [];
  const metaDescriptions = Array.isArray(metaDescriptionsMaybe) ? metaDescriptionsMaybe : [];
  const hasSeo = titleTags.length > 0 || metaDescriptions.length > 0;
  return (
    <div className="grid gap-3">
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-1 text-[12px] text-black">Title tags</div>
        {titleTags.length ? (
          <ul className="list-disc pl-5 text-sm" style={{ color: TK.text }}>
            <AnimatePresence initial={false}>
              {titleTags.map((item, idx) => (
                <motion.li key={idx} {...listItemMotion} transition={{ duration: 0.3, delay: idx * 0.03 }}>
                  {item}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : streaming ? (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0.65 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-4/5" />
            <PulseBlock className="h-3 w-2/3" />
            <PulseBlock className="h-3 w-3/4" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            Provide a topic to view SEO suggestions.
          </div>
        )}
      </motion.div>
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-1 text-[12px] text-black">Meta descriptions</div>
        {metaDescriptions.length ? (
          <ul className="list-disc pl-5 text-sm" style={{ color: TK.text }}>
            <AnimatePresence initial={false}>
              {metaDescriptions.map((item, idx) => (
                <motion.li key={idx} {...listItemMotion} transition={{ duration: 0.3, delay: idx * 0.03 }}>
                  {item}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : streaming ? (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0.65 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-3/4" />
            <PulseBlock className="h-3 w-4/5" />
            <PulseBlock className="h-3 w-2/3" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            SEO metadata will populate here.
          </div>
        )}
      </motion.div>
      <div className="inline-flex items-center gap-2">
        <SecondaryButton disabled={!hasSeo} onClick={onInsert}>
          <ArrowRight size={16} style={{ color: TK.brand }} /> Insert to Draft
        </SecondaryButton>
      </div>
    </div>
  );
}

export function GEOTab({ geoPack, streaming }: { geoPack?: WriterResponse["geoPack"]; streaming: boolean }) {
  const variants = Array.isArray(geoPack) ? geoPack : [];
  return (
    <div className="grid gap-3">
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-2 text-[12px]" style={{ color: TK.textMuted }}>
          Variants
        </div>
        {variants.length ? (
          <div className="flex flex-col gap-2">
            {variants.map((v, idx) => (
              <motion.div key={v.locale + idx} className="rounded-md border p-2" style={{ borderColor: TK.border }} {...listItemMotion} transition={{ duration: 0.35, delay: idx * 0.04 }}>
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <Globe2 size={16} style={{ color: TK.brand }} />
                    <div className="text-sm font-medium" style={{ color: TK.text }}>
                      {v.locale}
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] max-w-sm" style={{ color: "#047857" }}>
                    {v.diff ?? "~5%"}
                  </div>
                </div>
                <div className="mt-1 text-[12px]" style={{ color: TK.textMuted }}>
                  {v.summary}
                </div>
              </motion.div>
            ))}
          </div>
        ) : streaming ? (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-2/3" />
            <PulseBlock className="h-3 w-3/4" />
            <PulseBlock className="h-3 w-1/2" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            GEO rewrites will show up when generated.
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function AEOTab({ aeoPack, streaming }: { aeoPack?: WriterResponse["aeoPack"]; streaming: boolean }) {
  const faqs = Array.isArray(aeoPack?.faqs) ? aeoPack!.faqs : [];
  const directAnswer = aeoPack?.directAnswer ?? "";
  const tldr = aeoPack?.tldr ?? "";
  return (
    <div className="grid gap-3">
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
          Direct answer
        </div>
        {directAnswer ? (
          <p className="text-sm" style={{ color: TK.text }}>
            {directAnswer}
          </p>
        ) : streaming ? (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-4/5" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            Direct answer will stream here.
          </div>
        )}
      </motion.div>
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
          TL;DR
        </div>
        {tldr ? (
          <p className="text-sm" style={{ color: TK.text }}>
            {tldr}
          </p>
        ) : streaming ? (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-3/4" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            TL;DR will stream here.
          </div>
        )}
      </motion.div>
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-2 text-[12px]" style={{ color: TK.textMuted }}>
          FAQs
        </div>
        {faqs.length ? (
          <div className="space-y-2">
            {faqs.map((f, idx) => (
              <motion.div key={idx} className="rounded-md border p-2" style={{ borderColor: TK.border }} {...listItemMotion} transition={{ duration: 0.35, delay: idx * 0.04 }}>
                <div className="text-sm font-medium" style={{ color: TK.text }}>
                  {f.question}
                </div>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  {f.answer}
                </div>
              </motion.div>
            ))}
          </div>
        ) : streaming ? (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-3/4" />
            <PulseBlock className="h-3 w-4/5" />
            <PulseBlock className="h-3 w-3/5" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            FAQs will populate based on the topic.
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function CitationsTab({ citations, streaming }: { citations?: WriterResponse["citations"]; streaming: boolean }) {
  const cites = Array.isArray(citations) ? citations : [];
  return (
    <div className="grid gap-3">
      <motion.div className="rounded-md border p-3" style={{ borderColor: TK.borderSubtle }} {...cardMotionProps}>
        <div className="mb-2 text-[12px]" style={{ color: TK.textMuted }}>
          Citations
        </div>
        {cites.length ? (
          <ol className="space-y-2 pl-4">
            {cites.map((cite, idx) => (
              <li key={cite.url + idx} className="list-decimal text-sm" style={{ color: TK.text }}>
                <div className="font-medium">{cite.title}</div>
                <div className="text-[12px]" style={{ color: TK.textMuted }}>
                  {cite.domain} - {cite.url}
                </div>
              </li>
            ))}
          </ol>
        ) : streaming ? (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "mirror" }}
          >
            <PulseBlock className="h-3 w-3/4" />
            <PulseBlock className="h-3 w-2/3" />
            <PulseBlock className="h-3 w-4/5" />
          </motion.div>
        ) : (
          <div className="text-sm" style={{ color: TK.textMuted }}>
            Citations will appear when required by policy. If your backend is not returning citations yet, display "-".
          </div>
        )}
      </motion.div>
    </div>
  );
}
