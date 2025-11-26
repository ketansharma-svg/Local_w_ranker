"use client";

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "antd";
import { BookOpenCheck, History, Loader2, Sparkles } from "lucide-react";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { ProjectInfo, WriterInputs, DraftSection as DraftSectionType, WriterResponse } from "@/src/lib/ai/writer-schema";
import { defaultInputs } from "@/src/lib/ai/writer-schema";
import { HelperPanel, StreamingOverlay, StickyFooter, VersionHistoryDrawer, Drawer } from "./writer/panels";
import { TabStrip, OutlineTab, DraftTab, SEOTab, GEOTab, AEOTab, CitationsTab, TabKey } from "./writer/tabs";
import { UrlList, AttachmentList } from "./writer/files";
import { FieldGroup, ChipInput, LabeledInput, PrimaryButton, SecondaryButton, GhostButton, ErrorBanner } from "./writer/primitives";
import { TK, fontStack } from "./writer/shared";
import { cleanTopic, emit, faviconFor, formatFriendlyDate, isValidUrl, slugify } from "./writer/utils";

type ProjectContext = ProjectInfo;
type DraftSection = DraftSectionType & { level?: "h2" | "h3" };
type StepKey = TabKey | "final";
type StepState = { key: StepKey; name: string; done: boolean };

export type WriterAutomatedHandle = {
    triggerGenerate: () => void;
    cancel: () => void;
    resetView: () => void;
    exportDraft: () => void;
    shareDraft: () => void;
};

export type WriterBodyProps = {
    project?: ProjectContext | null;
    valueInputs?: WriterInputs;
    defaultInputs?: Partial<WriterInputs>;
    onInputsChange?: (inputs: WriterInputs, haveRequiredTriplet: boolean) => void;
    onGenerate?: (inputs: WriterInputs) => void;
    onCancelStream?: () => void;
    onPauseStream?: () => void;
    onPartialRerun?: (reason: "section" | "competitor_added" | "locale_changed") => void;
    onOpenCanvas?: () => void;
    onSaveDraft?: () => void;
    onExport?: () => void;
    onShare?: () => void;
    onProjectClick?: () => void;
    demoFallback?: boolean;
};

const STEP_TEMPLATE: Array<{ key: StepKey; name: string }> = [
    { key: "outline", name: "Drafting outline" },
    { key: "draft", name: "Writing draft sections" },
    { key: "seo", name: "Optimizing SEO pack" },
    { key: "geo", name: "Localizing GEO variants" },
    { key: "aeo", name: "Generating AEO pack" },
    { key: "citations", name: "Linking credible citations" },
    { key: "final", name: "Final readability and polish" },
];

const EXPORT_TRACK_ENDPOINT = "/api/writer/export-log";

const normalizeCitations = (raw: unknown, requireCitations: boolean): WriterResponse["citations"] => {
    const citationArray = Array.isArray(raw) ? raw : [];
    const seen = new Set<string>();
    const out: WriterResponse["citations"] = [];

    const extractDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace(/^www\./, "");
        } catch {
            return "";
        }
    };

    for (const entry of citationArray) {
        if (!entry) continue;
        if (typeof entry === "string") {
            const cleaned = entry.replace(/^\[\d+\]\s*/, "");
            const [maybeTitle, maybeDomain, maybeUrl] = cleaned.split(" - ").map((part) => part?.trim()).filter(Boolean);
            const url = maybeUrl?.startsWith("http") ? maybeUrl : "";
            const domain = maybeDomain && !maybeDomain.startsWith("http") ? maybeDomain : url ? extractDomain(url) : "";
            const title = maybeTitle || domain || url || "Source";
            if (url && !seen.has(url)) {
                out.push({ title, domain: domain || extractDomain(url) || "-", url });
                seen.add(url);
            }
            continue;
        }

        if (typeof entry === "object") {
            const obj = entry as any;
            const urlRaw = typeof obj.url === "string" ? obj.url.trim() : "";
            const url = urlRaw && urlRaw.startsWith("http") ? urlRaw : "";
            const domain = typeof obj.domain === "string" && obj.domain ? obj.domain : url ? extractDomain(url) : "";
            const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : domain || url || "Source";
            if (url && !seen.has(url)) {
                out.push({ title, domain: domain || extractDomain(url) || "-", url });
                seen.add(url);
            }
        }
    }

    if (!out.length && requireCitations) return [{ title: "-", domain: "-", url: "-" }];
    return out;
};

const normalizeFaqs = (raw: unknown): WriterResponse["aeoPack"]["faqs"] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const obj = entry as any;
            const question = typeof obj.question === "string" ? obj.question : typeof obj.Q === "string" ? obj.Q : null;
            const answer = typeof obj.answer === "string" ? obj.answer : typeof obj.A === "string" ? obj.A : null;
            if (!question || !answer) return null;
            return { question, answer };
        })
        .filter(Boolean) as WriterResponse["aeoPack"]["faqs"];
};

const normalizeAeoPack = (raw: unknown): WriterResponse["aeoPack"] => {
    const obj = (raw ?? {}) as any;
    const directAnswer = typeof obj.directAnswer === "string" ? obj.directAnswer : "";
    const tldr = typeof obj.tldr === "string" ? obj.tldr : "";
    const faqs = normalizeFaqs(obj.faqs);
    return { directAnswer, tldr, faqs };
};

const computeTripletReady = (draft: WriterInputs) => draft.topic.trim().length > 0 && Boolean(draft.contentType) && Boolean(draft.locale);

const createInitialInputs = (base?: Partial<WriterInputs>): WriterInputs => ({
    ...defaultInputs,
    ...base,
    keywords: base?.keywords ?? [...defaultInputs.keywords],
    competitors: base?.competitors ?? [...defaultInputs.competitors],
    attachments: base?.attachments ?? [...defaultInputs.attachments],
    policy: {
        ...defaultInputs.policy,
        ...base?.policy,
    },
});

const WriterAutomatedBody = forwardRef<WriterAutomatedHandle, WriterBodyProps>(
    (
        {
            project,
            valueInputs,
            defaultInputs,
            onInputsChange,
            onGenerate,
            onCancelStream,
            onPauseStream,
            onPartialRerun,
            onOpenCanvas,
            onSaveDraft,
            onExport,
            onShare,
            onProjectClick,
        },
        ref
    ) => {
        const initialInputs = useMemo(() => createInitialInputs(defaultInputs), [defaultInputs]);
        const [internalInputs, setInternalInputs] = useState<WriterInputs>(initialInputs);

        useEffect(() => {
            if (!valueInputs) {
                setInternalInputs(initialInputs);
            }
        }, [initialInputs, valueInputs]);

        const inputs = valueInputs ?? internalInputs;

        const updateInputs = useCallback(
            (updater: (prev: WriterInputs) => WriterInputs) => {
                if (valueInputs) {
                    const next = updater(inputs);
                    onInputsChange?.(next, computeTripletReady(next));
                } else {
                    setInternalInputs((prev) => {
                        const next = updater(prev);
                        onInputsChange?.(next, computeTripletReady(next));
                        return next;
                    });
                }
            },
            [inputs, onInputsChange, valueInputs]
        );

        const haveRequiredTriplet = computeTripletReady(inputs);
        const [streaming, setStreaming] = useState(false);
        const [elapsed, setElapsed] = useState(0);
        const [steps, setSteps] = useState<StepState[]>(() => STEP_TEMPLATE.map((s) => ({ ...s, done: false })));
        const [view, setView] = useState<"composer" | "results">("composer");
        const [activeTab, setActiveTab] = useState<TabKey>("outline");
        const [sections, setSections] = useState<DraftSection[]>([]);
        const [outline, setOutline] = useState<WriterResponse["outline"]>([]);
        const [seoPack, setSeoPack] = useState<WriterResponse["seoPack"]>({ titleTags: [], metaDescriptions: [] });
        const [geoPack, setGeoPack] = useState<WriterResponse["geoPack"]>([]);
        const [aeoPack, setAeoPack] = useState<WriterResponse["aeoPack"]>({ directAnswer: "", tldr: "", faqs: [] });
        const [citations, setCitations] = useState<WriterResponse["citations"]>([]);
        const [writerError, setWriterError] = useState<string | null>(null);
        const [regeneratingSectionIds, setRegeneratingSectionIds] = useState<string[]>([]);
        const [exporting, setExporting] = useState(false);
        const [openVersion, setOpenVersion] = useState(false);
        const [openCiteStyle, setOpenCiteStyle] = useState(false);
        const [regenDialog, setRegenDialog] = useState<{ open: boolean; target?: DraftSection | null; reason: string }>({
            open: false,
            target: null,
            reason: "",
        });
        const [insertDialog, setInsertDialog] = useState<{ open: boolean; level: "h2" | "h3"; heading: string; notes: string }>({
            open: false,
            level: "h2",
            heading: "",
            notes: "",
        });

        const controllerRef = useRef<AbortController | null>(null);

        const resolvedOutline = Array.isArray(outline) ? outline : [];
        const resolvedSections = Array.isArray(sections) ? sections : [];
        const resolvedSeoPack = useMemo(
            () => ({
                titleTags: Array.isArray(seoPack?.titleTags) ? seoPack.titleTags : [],
                metaDescriptions: Array.isArray(seoPack?.metaDescriptions) ? seoPack.metaDescriptions : [],
            }),
            [seoPack]
        );
        const resolvedGeoPack = Array.isArray(geoPack) ? geoPack : [];
        const resolvedAeoPack = useMemo(() => normalizeAeoPack(aeoPack), [aeoPack]);
        const resolvedCitations = Array.isArray(citations) ? citations : [];

        const resetSteps = useCallback(() => setSteps(STEP_TEMPLATE.map((s) => ({ ...s, done: false }))), []);
        const markStep = useCallback((key: StepKey) => setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, done: true } : step))), []);
        const revealResults = useCallback(() => {
            setView((prev) => {
                if (prev === "results") return prev;
                setActiveTab("outline");
                return "results";
            });
        }, []);

        useEffect(() => {
            if (!streaming) {
                setElapsed(0);
                return;
            }
            let raf: number;
            const start = Date.now();
            const tick = () => {
                setElapsed(Date.now() - start);
                raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
            return () => cancelAnimationFrame(raf);
        }, [streaming]);

        const applyPartial = useCallback(
            (payload: Partial<WriterResponse>) => {
                const safeOutline = Array.isArray(payload.outline) ? payload.outline : [];
                const safeDraft = Array.isArray(payload.draft) ? payload.draft : [];
                const safeSeo = payload.seoPack ?? { titleTags: [], metaDescriptions: [] };
                const safeGeo = Array.isArray(payload.geoPack) ? payload.geoPack : [];
                const safeAeo = normalizeAeoPack(payload.aeoPack);
                const safeCitations = normalizeCitations(payload.citations, inputs.policy?.citationsRequired ?? false);

                if (safeOutline.length) {
                    setOutline(safeOutline);
                    revealResults();
                    markStep("outline");
                }
                if (safeDraft.length) {
                    revealResults();
                    setSections((prev) => {
                        const levelMap = new Map(prev.map((s) => [s.id ?? s.heading, s.level]));
                        return safeDraft.map((section, idx) => ({
                            id: section.id ?? `draft-${idx}`,
                            heading: section.heading,
                            markdown: section.markdown,
                            score: section.score,
                            fk: section.fk,
                            level: levelMap.get(section.id ?? section.heading),
                        }));
                    });
                    markStep("draft");
                }
                if (payload.seoPack !== undefined) {
                    setSeoPack(safeSeo);
                    markStep("seo");
                }
                if (payload.geoPack !== undefined) {
                    setGeoPack(safeGeo);
                    markStep("geo");
                }
                if (payload.aeoPack !== undefined) {
                    setAeoPack(safeAeo);
                    markStep("aeo");
                }
                if (payload.citations !== undefined) {
                    setCitations(safeCitations);
                    markStep("citations");
                }
            },
            [inputs.policy?.citationsRequired, markStep, revealResults]
        );

        const finalizeStream = useCallback(() => {
            controllerRef.current = null;
            setStreaming(false);
            setView("results");
            markStep("final");
        }, [markStep]);

        const cancelStream = useCallback(() => {
            if (controllerRef.current) {
                controllerRef.current.abort();
                controllerRef.current = null;
            }
            setStreaming(false);
            onCancelStream?.();
        }, [onCancelStream]);

        const pauseStream = useCallback(() => onPauseStream?.(), [onPauseStream]);

        const startGenerate = useCallback(async () => {
            if (!haveRequiredTriplet || streaming) return;
            setWriterError(null);
            setOutline([]);
            setSections([]);
            setSeoPack({ titleTags: [], metaDescriptions: [] });
            setGeoPack([]);
            setAeoPack(normalizeAeoPack(null));
            setCitations([]);
            setRegeneratingSectionIds([]);
            setRegenDialog({ open: false, target: null, reason: "" });
            setInsertDialog((prev) => ({ ...prev, open: false, heading: "", notes: "" }));
            resetSteps();
            setView("composer");
            setActiveTab("outline");
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            setStreaming(true);
            setElapsed(0);
            emit("writer_generate_click", {
                have_topic: !!inputs.topic,
                have_type: !!inputs.contentType,
                have_locale: !!inputs.locale,
                ts: Date.now(),
            });
            onGenerate?.(inputs);
            try {
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inputs, project }),
                    signal: controller.signal,
                });
                if (!response.ok || !response.body) throw new Error("Unable to stream writer response.");
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                const processBuffer = () => {
                    let idx;
                    while ((idx = buffer.indexOf("\n\n")) !== -1) {
                        const chunk = buffer.slice(0, idx).trim();
                        buffer = buffer.slice(idx + 2);
                        if (!chunk) continue;
                        let event = "message";
                        const dataParts: string[] = [];
                        for (const line of chunk.split("\n")) {
                            if (line.startsWith("event:")) event = line.replace("event:", "").trim();
                            else if (line.startsWith("data:")) dataParts.push(line.replace("data:", "").trim());
                        }
                        const dataStr = dataParts.join("\n");
                        if (!dataStr) continue;
                        if (event === "partial" || event === "result") {
                            try {
                                const parsed = JSON.parse(dataStr) as Partial<WriterResponse>;
                                applyPartial(parsed);
                                if (event === "result") markStep("final");
                            } catch (err) {
                                console.error("Failed to parse chunk", err);
                            }
                        } else if (event === "error") {
                            try {
                                const payload = JSON.parse(dataStr);
                                setWriterError(payload.message || "Something went wrong.");
                            } catch {
                                setWriterError("Something went wrong.");
                            }
                            cancelStream();
                        } else if (event === "done") {
                            finalizeStream();
                        }
                    }
                };

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    processBuffer();
                }
                buffer += decoder.decode();
                processBuffer();
                finalizeStream();
            } catch (error) {
                if ((error as DOMException).name === "AbortError") return;
                console.error(error);
                setWriterError("We could not finish this run. Please try again.");
                cancelStream();
            }
        }, [applyPartial, cancelStream, finalizeStream, haveRequiredTriplet, inputs, markStep, onGenerate, project, resetSteps, streaming]);

        const handleExport = useCallback(async () => {
            if (exporting || typeof window === "undefined") return;
            if (!resolvedSections.length && !resolvedOutline.length) {
                console.warn("Nothing to export yet.");
                return;
            }
            setExporting(true);
            const now = new Date();
            const safeTopic = cleanTopic(inputs.topic || project?.name || "AI Writer Draft") || "AI Writer Draft";
            const filename = `${slugify(safeTopic)}-${formatFriendlyDate(now)}.docx`;
            const paragraphs: Paragraph[] = [];
            const addMarkdownParagraphs = (markdown: string, options?: { stripLeadingHeading?: boolean }) => {
                let text = markdown ?? "";
                if (options?.stripLeadingHeading) {
                    text = text.replace(/^\s*#{1,6}\s+[^\n]+(\n+|$)/, "");
                }
                const chunks = text
                    .split(/\n{2,}/)
                    .map((chunk) => chunk.trim())
                    .filter(Boolean);
                if (!chunks.length) {
                    paragraphs.push(new Paragraph({ children: [new TextRun(text || " ")], spacing: { after: 200 } }));
                    return;
                }
                chunks.forEach((chunk) => {
                    paragraphs.push(new Paragraph({ children: [new TextRun(chunk)], spacing: { after: 200 } }));
                });
            };

            paragraphs.push(
                new Paragraph({ text: safeTopic, heading: HeadingLevel.TITLE }),
                new Paragraph({
                    text: project ? `${project.name} - ${project.domain}` : "General project",
                    spacing: { after: 120 },
                }),
                new Paragraph({
                    text: `Locale: ${inputs.locale || "n/a"} - Type: ${inputs.contentType || "n/a"} - Exported ${now.toLocaleString()}`,
                    spacing: { after: 240 },
                })
            );

            if (resolvedOutline.length) {
                paragraphs.push(new Paragraph({ text: "Outline", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } }));
                resolvedOutline.forEach((item, idx) => {
                    paragraphs.push(new Paragraph({ text: `${idx + 1}. ${item.heading}`, spacing: { after: item.summary ? 60 : 140 } }));
                    if (item.summary) {
                        paragraphs.push(new Paragraph({ text: item.summary, bullet: { level: 0 }, spacing: { after: 120 } }));
                    }
                });
            }

            if (resolvedSections.length) {
                paragraphs.push(new Paragraph({ text: "Draft", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 140 } }));
                resolvedSections.forEach((section, index) => {
                    const headingLevel =
                        (section.level ?? (index === 0 ? "h2" : "h3")) === "h3" ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2;
                    paragraphs.push(
                        new Paragraph({
                            text: section.heading,
                            heading: headingLevel,
                            spacing: { before: 140, after: 80 },
                        })
                    );
                    // const meta: string[] = [];
                    // if (typeof section.score === "number") meta.push(`Score ${section.score}`);
                    // if (typeof section.fk === "number") meta.push(`FK ${section.fk.toFixed(1)}`);
                    // if (meta.length) {
                    //     paragraphs.push(new Paragraph({ text: meta.join(" | "), spacing: { after: 80 } }));
                    // }
                    addMarkdownParagraphs(section.markdown, { stripLeadingHeading: true });
                });
            }

            if (resolvedSeoPack.titleTags.length || resolvedSeoPack.metaDescriptions.length) {
                paragraphs.push(new Paragraph({ text: "SEO Pack", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
                if (resolvedSeoPack.titleTags.length) {
                    paragraphs.push(new Paragraph({ text: "Title tags", heading: HeadingLevel.HEADING_3, spacing: { after: 60 } }));
                    resolvedSeoPack.titleTags.forEach((t) => paragraphs.push(new Paragraph({ text: t, bullet: { level: 0 } })));
                }
                if (resolvedSeoPack.metaDescriptions.length) {
                    paragraphs.push(new Paragraph({ text: "Meta descriptions", heading: HeadingLevel.HEADING_3, spacing: { before: 120, after: 60 } }));
                    resolvedSeoPack.metaDescriptions.forEach((t) => paragraphs.push(new Paragraph({ text: t, bullet: { level: 0 } })));
                }
            }

            if (resolvedGeoPack.length) {
                paragraphs.push(new Paragraph({ text: "GEO Pack", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
                resolvedGeoPack.forEach((variant) => {
                    paragraphs.push(new Paragraph({ text: `${variant.locale} ${variant.diff ? `(${variant.diff})` : ""}`.trim(), heading: HeadingLevel.HEADING_3 }));
                    paragraphs.push(new Paragraph({ text: variant.summary, spacing: { after: 120 } }));
                });
            }

            if (resolvedAeoPack.directAnswer || resolvedAeoPack.tldr || resolvedAeoPack.faqs.length) {
                paragraphs.push(new Paragraph({ text: "AEO Pack", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
                if (resolvedAeoPack.directAnswer) {
                    paragraphs.push(new Paragraph({ text: "Direct answer", heading: HeadingLevel.HEADING_3 }));
                    addMarkdownParagraphs(resolvedAeoPack.directAnswer);
                }
                if (resolvedAeoPack.tldr) {
                    paragraphs.push(new Paragraph({ text: "TL;DR", heading: HeadingLevel.HEADING_3 }));
                    addMarkdownParagraphs(resolvedAeoPack.tldr);
                }
                if (resolvedAeoPack.faqs.length) {
                    paragraphs.push(new Paragraph({ text: "FAQs", heading: HeadingLevel.HEADING_3, spacing: { before: 120, after: 60 } }));
                    resolvedAeoPack.faqs.forEach((faq) => {
                        paragraphs.push(new Paragraph({ text: `Q: ${faq.question}`, bullet: { level: 0 } }));
                        paragraphs.push(new Paragraph({ text: `A: ${faq.answer}`, bullet: { level: 1 }, spacing: { after: 60 } }));
                    });
                }
            }

            if (resolvedCitations.length) {
                paragraphs.push(new Paragraph({ text: "Citations", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
                resolvedCitations.forEach((cite, idx) => {
                    paragraphs.push(new Paragraph({ text: `${idx + 1}. ${cite.title} - ${cite.domain} - ${cite.url}`, spacing: { after: 60 } }));
                });
            }

            try {
                const doc = new Document({ sections: [{ children: paragraphs }] });
                const blob = await Packer.toBlob(doc);
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = filename;
                anchor.click();
                URL.revokeObjectURL(url);
                onExport?.();
                const payload = {
                    project: project ?? null,
                    inputs,
                    outputs: {
                        outline: resolvedOutline,
                        draft: resolvedSections,
                        seoPack: resolvedSeoPack,
                        geoPack: resolvedGeoPack,
                        aeoPack: resolvedAeoPack,
                        citations: resolvedCitations,
                    },
                    meta: {
                        exportedAt: now.toISOString(),
                        format: "docx",
                        filename,
                    },
                };
                await fetch(EXPORT_TRACK_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } catch (error) {
                console.error("Failed to export writer draft", error);
                setWriterError("Export failed. Please try again.");
            } finally {
                setExporting(false);
            }
        }, [exporting, inputs, onExport, project, resolvedAeoPack, resolvedCitations, resolvedGeoPack, resolvedOutline, resolvedSections, resolvedSeoPack]);

        useImperativeHandle(
            ref,
            () => ({
                triggerGenerate: startGenerate,
                cancel: cancelStream,
                resetView: () => {
                    cancelStream();
                    setView("composer");
                    setActiveTab("outline");
                    setSections([]);
                    setOutline([]);
                    setSeoPack({ titleTags: [], metaDescriptions: [] });
                    setGeoPack([]);
                    setAeoPack({ directAnswer: "", tldr: "", faqs: [] });
                    setCitations([]);
                    resetSteps();
                    setWriterError(null);
                },
                exportDraft: () => handleExport(),
                shareDraft: () => onShare?.(),
            }),
            [cancelStream, handleExport, onShare, resetSteps, startGenerate]
        );

        const addCompetitor = useCallback(
            (url: string) => {
                if (!isValidUrl(url)) return;
                updateInputs((p) => ({ ...p, competitors: Array.from(new Set([...p.competitors, url])) }));
                onPartialRerun?.("competitor_added");
            },
            [onPartialRerun, updateInputs]
        );

        const topicErr = inputs.topic.trim().length === 0 ? null : inputs.topic.length > 160 ? "Keep topic under 160 characters." : null;
        const tabReadyMap = useMemo(
            () => ({
                outline: true,
                draft: resolvedSections.length > 0,
                seo: resolvedSeoPack.titleTags.length > 0 || resolvedSeoPack.metaDescriptions.length > 0,
                geo: resolvedGeoPack.length > 0,
                aeo: Boolean(resolvedAeoPack.directAnswer || resolvedAeoPack.tldr || resolvedAeoPack.faqs.length),
                citations: resolvedCitations.length > 0,
            }),
            [resolvedAeoPack, resolvedCitations, resolvedGeoPack, resolvedSections, resolvedSeoPack]
        );

        const requestSectionDraft = useCallback(
            async (target: DraftSection, options?: { notes?: string; reason?: string }) => {
                const sectionId = target.id ?? target.heading ?? `section-${Date.now()}`;
                const originalHeading = target.heading;
                const originalMarkdown = target.markdown;
                const pendingMessage = options?.notes ? "Generating section from your notes..." : "Regenerating section...";
                setRegeneratingSectionIds((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
                setSections((prev) =>
                    prev.map((s) =>
                        s.id === sectionId || (!s.id && s.heading === originalHeading)
                            ? { ...s, id: sectionId, markdown: pendingMessage }
                            : s
                    )
                );
                try {
                    const response = await fetch("/api/chat/regenerate-section", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            inputs,
                            project,
                            section: { id: sectionId, heading: target.heading, markdown: target.markdown, level: target.level, notes: options?.notes, reason: options?.reason },
                        }),
                    });
                    if (!response.ok) throw new Error(`Failed to regenerate section ${sectionId}`);
                    const data = (await response.json()) as DraftSection & { summary?: string };
                    const nextHeading = data.heading || originalHeading;
                    const nextMarkdown = data.markdown || originalMarkdown;
                    setSections((prev) =>
                        prev.map((s) =>
                            s.id === sectionId || (!s.id && s.heading === originalHeading)
                                ? { ...s, id: sectionId, heading: nextHeading, markdown: nextMarkdown ?? s.markdown }
                                : s
                        )
                    );
                    if (nextHeading !== originalHeading || data.summary) {
                        setOutline((prev) =>
                            prev.map((item) =>
                                item.heading === originalHeading ? { ...item, heading: nextHeading, summary: data.summary ?? item.summary } : item
                            )
                        );
                    }
                } catch (error) {
                    console.error("Failed to regenerate section", error);
                    setWriterError("Could not regenerate that section. Please try again.");
                    setSections((prev) =>
                        prev.map((s) =>
                            s.id === sectionId || (!s.id && s.heading === originalHeading)
                                ? { ...s, id: sectionId, markdown: originalMarkdown ?? s.markdown }
                                : s
                        )
                    );
                } finally {
                    setRegeneratingSectionIds((prev) => prev.filter((x) => x !== sectionId));
                }
            },
            [inputs, project]
        );

        const handleRegenerateSection = useCallback(
            (id?: string) => {
                const target =
                    (id ? resolvedSections.find((s) => s.id === id) : resolvedSections[0]) ??
                    resolvedSections.find((s) => Boolean(s.id)) ??
                    null;
                if (!target) return;
                const targetWithId = { ...target, id: target.id ?? id ?? `section-${Date.now()}` };
                if (regeneratingSectionIds.includes(targetWithId.id)) return;
                setRegenDialog({ open: true, target: targetWithId, reason: "Increase length" });
            },
            [regeneratingSectionIds, resolvedSections]
        );

        const confirmRegenerateSection = useCallback(() => {
            if (!regenDialog.target) {
                setRegenDialog((prev) => ({ ...prev, open: false }));
                return;
            }
            const reason = regenDialog.reason.trim();
            emit("writer_partial_rerun", { reason: "section", id: regenDialog.target.id });
            onPartialRerun?.("section");
            void requestSectionDraft(regenDialog.target, { reason });
            setRegenDialog({ open: false, target: null, reason: "" });
        }, [onPartialRerun, regenDialog.reason, regenDialog.target, requestSectionDraft]);

        const handleInsertSection = useCallback(
            (level: "h2" | "h3") => {
                setInsertDialog({ open: true, level, heading: "", notes: "" });
            },
            []
        );

        const confirmInsertSection = useCallback(() => {
            if (!insertDialog.heading.trim()) return;
            const heading = insertDialog.heading.trim();
            const notes = insertDialog.notes.trim();
            const reason = "New section from outline";
            const id = `${insertDialog.level}-${Date.now()}`;
            const initialSection: DraftSection = { id, heading, markdown: notes ? `Drafting from: ${notes}` : "Drafting new section...", level: insertDialog.level };
            setSections((prev) => [...prev, initialSection]);
            if (insertDialog.level === "h2") {
                setOutline((prev) => [...prev, { heading, summary: notes }]);
            }
            setView("results");
            setActiveTab("draft");
            void requestSectionDraft(initialSection, { notes, reason });
            setInsertDialog((prev) => ({ ...prev, open: false, heading: "", notes: "" }));
        }, [insertDialog.heading, insertDialog.level, insertDialog.notes, requestSectionDraft]);

        const closeRegenDialog = useCallback(() => setRegenDialog((prev) => ({ ...prev, open: false })), []);
        const closeInsertDialog = useCallback(() => setInsertDialog((prev) => ({ ...prev, open: false })), []);

        const handleInsertSeoPack = useCallback(() => {
            const blocks: DraftSection[] = [];
            if (resolvedSeoPack.titleTags.length) {
                blocks.push({
                    id: `seo-title-${Date.now()}`,
                    heading: "SEO: Title tag options",
                    markdown: resolvedSeoPack.titleTags.map((t, idx) => `${idx + 1}. ${t}`).join("\n"),
                    level: "h3",
                });
            }
            if (resolvedSeoPack.metaDescriptions.length) {
                blocks.push({
                    id: `seo-desc-${Date.now()}`,
                    heading: "SEO: Meta descriptions",
                    markdown: resolvedSeoPack.metaDescriptions.map((t, idx) => `${idx + 1}. ${t}`).join("\n"),
                    level: "h3",
                });
            }
            if (!blocks.length) return;
            setSections((prev) => [...prev, ...blocks]);
            setView("results");
            setActiveTab("draft");
        }, [resolvedSeoPack.metaDescriptions, resolvedSeoPack.titleTags]);

        const handlePartialFromOverlay = useCallback(
            (reason: "section" | "locale_changed") => {
                if (reason === "section") {
                    handleRegenerateSection();
                } else {
                    emit("writer_partial_rerun", { reason: "locale_changed" });
                    onPartialRerun?.("locale_changed");
                }
            },
            [handleRegenerateSection, onPartialRerun]
        );

        return (
            <section
                className="p-4 mt-4"
                style={{ borderColor: TK.borderSubtle, background: TK.bgPanel, boxShadow: TK.shadow1, ...fontStack }}
                role="region"
                aria-label="Writer body"
            >
                {project ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <button
                            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm cursor-pointer focus-visible:outline"
                            style={{ borderColor: TK.border, outlineColor: TK.focus, background: TK.bgPanel, color: TK.text }}
                            onClick={() => onProjectClick?.()}
                            aria-label={`Open project ${project.name}`}
                            title={project.name}
                        >
                            <img src={faviconFor(project.domain)} alt="" className="h-4 w-4 rounded" />
                            <span>{project.domain}</span>
                        </button>

                        <GhostButton onClick={() => setOpenVersion(true)} title="Version history">
                            <History size={16} style={{ color: TK.brand }} />
                            Version history
                        </GhostButton>
                        <GhostButton onClick={() => setOpenCiteStyle(true)} title="Citation style">
                            <BookOpenCheck size={16} style={{ color: TK.brand }} />
                            Cite style
                        </GhostButton>
                    </div>
                ) : null}

                {view === "composer" ? (
                    <div className="mb-3 text-[12px]" style={{ color: TK.textMuted }}>
                        {haveRequiredTriplet ? "Ready to generate." : "Add topic, content type, and locale to generate."}
                    </div>
                ) : null}

                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 lg:col-span-8 xl:col-span-8">
                        {view === "composer" ? (
                            <div className="grid gap-4">
                                <FieldGroup title="Topic & Keywords">
                                    <LabeledInput
                                        label="Topic"
                                        required
                                        value={inputs.topic}
                                        onChange={(v) => updateInputs((p) => ({ ...p, topic: v.slice(0, 160) }))}
                                        placeholder="e.g., AI content optimization techniques"
                                        error={topicErr}
                                        maxLen={160}
                                    />
                                    <ChipInput
                                        label="Keywords"
                                        placeholder="Press Enter or comma to add..."
                                        value={inputs.keywords}
                                        onChange={(xs) => updateInputs((p) => ({ ...p, keywords: xs }))}
                                    />
                                </FieldGroup>

                                <FieldGroup title="Audience & Tone">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                                Audience (select or freeform)
                                            </div>
                                            <input
                                                className="h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:outline"
                                                style={{ borderColor: TK.border, outlineColor: TK.focus }}
                                                value={inputs.audience ?? ""}
                                                onChange={(e) => updateInputs((p) => ({ ...p, audience: e.target.value }))}
                                                placeholder='e.g., "Developers", "SMB marketers"'
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                                Tone
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {(["Neutral", "Helpful", "Confident", "Playful"] as const).map((tone) => (
                                                    <label
                                                        key={tone}
                                                        className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                                                        style={{ borderColor: inputs.tone === tone ? TK.brand : TK.border }}
                                                    >
                                                        <input type="radio" name="tone" className="cursor-pointer" checked={inputs.tone === tone} onChange={() => updateInputs((p) => ({ ...p, tone }))} />
                                                        <span>{tone}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </FieldGroup>

                                <FieldGroup title="Locale, Content Type & AEO Intent">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                                Locale (required)
                                            </div>
                                            <input
                                                className="h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:outline"
                                                style={{ borderColor: TK.border, outlineColor: TK.focus }}
                                                value={inputs.locale}
                                                onChange={(e) => updateInputs((p) => ({ ...p, locale: e.target.value.trim() }))}
                                                placeholder="e.g., en-US"
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                                Content type (required)
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(["blog", "landing", "docs", "resource", "newsletter"] as const).map((ct) => (
                                                    <label
                                                        key={ct}
                                                        className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                                                        style={{ borderColor: inputs.contentType === ct ? TK.brand : TK.border }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="contentType"
                                                            className="cursor-pointer"
                                                            checked={inputs.contentType === ct}
                                                            onChange={() => updateInputs((p) => ({ ...p, contentType: ct }))}
                                                        />
                                                        <span>{ct.charAt(0).toUpperCase() + ct.slice(1)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                            AEO intent
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {([
                                                ["direct_answer", "Direct Answer", "Optimizes for featured snippet style answers."],
                                                ["how_to", "How-to", "Step sequence with concise actions."],
                                                ["comparative", "Comparative", "Pros/cons and feature contrasts."],
                                                ["faq_first", "FAQ-first", "Question list with short answers."],
                                            ] as const).map(([val, label, hint]) => (
                                                <label
                                                    key={val}
                                                    className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm"
                                                    style={{ borderColor: inputs.aeoIntent === val ? TK.brand : TK.border }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="aeo_intent"
                                                        checked={inputs.aeoIntent === val}
                                                        onChange={() => updateInputs((p) => ({ ...p, aeoIntent: val }))}
                                                        className="mt-[3px] cursor-pointer"
                                                    />
                                                    <div>
                                                        <div style={{ color: TK.text }}>{label}</div>
                                                        <div className="text-[12px]" style={{ color: TK.textMuted }}>
                                                            {hint}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </FieldGroup>

                                <FieldGroup title="Competitors & Attachments">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                                Competitor URLs
                                            </div>
                                            <UrlList
                                                value={inputs.competitors}
                                                onAdd={addCompetitor}
                                                onRemove={(url) => updateInputs((p) => ({ ...p, competitors: p.competitors.filter((x) => x !== url) }))}
                                            />
                                        </div>
                                        <div>
                                            <div className="mb-1 text-[12px]" style={{ color: TK.textMuted }}>
                                                Attachments (.pdf/.docx/.md, smaller than 10MB)
                                            </div>
                                            <AttachmentList
                                                files={inputs.attachments}
                                                onAdd={(fs) => updateInputs((p) => ({ ...p, attachments: [...p.attachments, ...fs] }))}
                                                onRemove={(id) => updateInputs((p) => ({ ...p, attachments: p.attachments.filter((f) => f.id !== id) }))}
                                            />
                                        </div>
                                    </div>
                                </FieldGroup>

                                <FieldGroup title="Policy & Targets">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="citations"
                                                checked={inputs.policy.citationsRequired}
                                                onChange={(e) => updateInputs((p) => ({ ...p, policy: { ...p.policy, citationsRequired: e.target.checked } }))}
                                                className="h-4 w-4 cursor-pointer"
                                            />
                                            <label htmlFor="citations" className="text-sm" style={{ color: TK.text }}>
                                                Citations required
                                            </label>
                                        </div>
                                        <div className="inline-flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="brand-guard"
                                                checked={inputs.policy.brandTermsGuard}
                                                onChange={(e) => updateInputs((p) => ({ ...p, policy: { ...p.policy, brandTermsGuard: e.target.checked } }))}
                                                className="h-4 w-4 cursor-pointer"
                                            />
                                            <label htmlFor="brand-guard" className="text-sm" style={{ color: TK.text }}>
                                                Brand term guard
                                            </label>
                                        </div>
                                        <div className="inline-flex items-center gap-2">
                                            <span className="text-sm" style={{ color: TK.text }}>
                                                Word count
                                            </span>
                                            <input
                                                type="number"
                                                min={300}
                                                max={5000}
                                                step={50}
                                                className="h-9 w-24 rounded-md border px-2 text-sm outline-none focus-visible:outline"
                                                style={{ borderColor: TK.border, outlineColor: TK.focus }}
                                                value={inputs.wordCount ?? ""}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    const num = Number(raw);
                                                    if (!raw.trim()) {
                                                        updateInputs((p) => ({ ...p, wordCount: undefined }));
                                                    } else if (!Number.isNaN(num)) {
                                                        updateInputs((p) => ({ ...p, wordCount: Math.max(300, Math.min(5000, Math.round(num))) }));
                                                    }
                                                }}
                                                placeholder="900"
                                            />
                                        </div>
                                        <div className="inline-flex items-center gap-2">
                                            <span className="text-sm" style={{ color: TK.text }}>
                                                Reading level
                                            </span>
                                            <select
                                                className="h-9 rounded-md border px-2 text-sm outline-none focus-visible:outline cursor-pointer"
                                                style={{ borderColor: TK.border, outlineColor: TK.focus }}
                                                value={inputs.policy.readingLevel}
                                                onChange={(e) => updateInputs((p) => ({ ...p, policy: { ...p.policy, readingLevel: e.target.value } }))}
                                            >
                                                {["grade_8", "grade_9", "grade_10", "grade_11"].map((g) => (
                                                    <option key={g} value={g}>
                                                        {g.replace("_", " ")}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </FieldGroup>

                                <div className="flex items-center justify-between">
                                    <div className="text-[12px]" style={{ color: TK.textMuted }}>
                                        Ready to generate: {haveRequiredTriplet ? "3 of 3" : `${[!!inputs.topic, !!inputs.contentType, !!inputs.locale].filter(Boolean).length} of 3`} required fields complete.
                                    </div>
                                    <PrimaryButton onClick={startGenerate} disabled={!haveRequiredTriplet || streaming} aria-disabled={!haveRequiredTriplet || streaming}>
                                        {streaming ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} /> Generate Draft
                                            </>
                                        )}
                                    </PrimaryButton>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                {view === "results" ? (
                                    <div
                                        className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2"
                                        style={{ borderColor: TK.borderSubtle, background: "linear-gradient(120deg,rgba(0,140,205,0.05),#fff)" }}
                                    >
                                        <div>
                                            <div className="text-[12px]" style={{ color: TK.textMuted }}>
                                                Title
                                            </div>
                                            <div className="text-[15px] font-semibold leading-tight" style={{ color: TK.textStrong }}>
                                                {inputs.topic || "Untitled draft"}
                                            </div>
                                        </div>
                                        <div className="inline-flex flex-wrap items-center gap-2 text-[12px]" style={{ color: TK.textMuted }}>
                                            {inputs.contentType ? (
                                                <span className="rounded-full border px-2 py-0.5" style={{ borderColor: TK.border, color: TK.text }}>
                                                    {inputs.contentType}
                                                </span>
                                            ) : null}
                                            {inputs.locale ? (
                                                <span className="rounded-full border px-2 py-0.5" style={{ borderColor: TK.border, color: TK.text }}>
                                                    {inputs.locale}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                                <TabStrip value={activeTab} onChange={setActiveTab} readyMap={tabReadyMap} onOpenCiteStyle={() => setOpenCiteStyle(true)} />
                                <div className="grid gap-3">
                                    {activeTab === "outline" && (
                                        <OutlineTab
                                            outline={outline}
                                            sections={sections}
                                            isStreaming={streaming}
                                            regeneratingIds={regeneratingSectionIds}
                                            onRegenerate={(id) => handleRegenerateSection(id)}
                                            onInsert={handleInsertSection}
                                        />
                                    )}
                                    {activeTab === "draft" && (
                                        <DraftTab
                                            sections={sections}
                                            streaming={streaming}
                                            regeneratingIds={regeneratingSectionIds}
                                            onRegenerate={(id) => handleRegenerateSection(id)}
                                        />
                                    )}
                                    {activeTab === "seo" && <SEOTab seoPack={seoPack} streaming={streaming} onInsert={handleInsertSeoPack} />}
                                    {activeTab === "geo" && <GEOTab geoPack={geoPack} streaming={streaming} />}
                                    {activeTab === "aeo" && <AEOTab aeoPack={aeoPack} streaming={streaming} />}
                                    {activeTab === "citations" && <CitationsTab citations={citations} streaming={streaming} />}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-span-12 space-y-3 lg:col-span-4 xl:col-span-4">
                        {streaming ? (
                            <StreamingOverlay elapsedMs={elapsed} onCancel={cancelStream} onPause={pauseStream} onPartial={handlePartialFromOverlay} steps={steps} />
                        ) : view === "composer" ? (
                            <HelperPanel />
                        ) : (
                            <></>
                        )}
                        <AnimatePresence>{writerError ? <ErrorBanner key="writer-error" message={writerError} /> : null}</AnimatePresence>
                    </div>
                </div>

                <StickyFooter
                    hasDraft={view === "results" && sections.length > 0}
                    exporting={exporting}
                    onOpenCanvas={() => onOpenCanvas?.()}
                    onSaveDraft={() => onSaveDraft?.()}
                    onExportClick={handleExport}
                    onShareClick={() => onShare?.()}
                />

                <VersionHistoryDrawer open={openVersion} onClose={() => setOpenVersion(false)} />
                <Drawer open={openCiteStyle} onClose={() => setOpenCiteStyle(false)} title="Citation Style">
                    <div className="grid gap-2 text-sm" style={{ color: TK.text }}>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border p-2" style={{ borderColor: TK.border }}>
                            <input type="radio" defaultChecked /> Footnote numerals
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border p-2" style={{ borderColor: TK.border }}>
                            <input type="radio" /> Author-date markers
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border p-2" style={{ borderColor: TK.border }}>
                            <input type="radio" /> Inline superscripts
                        </label>

                    </div>
                </Drawer>
                <InlineModal
                    open={regenDialog.open}
                    title="Regenerate section"
                    description="Share what to tweak so we can improve this section with the right intent."
                    confirmLabel={regeneratingSectionIds.includes(regenDialog.target?.id ?? "") ? "Regenerating..." : "Regenerate"}
                    confirmDisabled={!regenDialog.target || regeneratingSectionIds.includes(regenDialog.target?.id ?? "")}
                    onClose={closeRegenDialog}
                    onConfirm={confirmRegenerateSection}
                >
                    <div className="grid gap-2">
                        <div className="text-[12px]" style={{ color: TK.textMuted }}>
                            Regenerating: {regenDialog.target?.heading || "Section"}
                        </div>
                        <textarea
                            className="h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:outline"
                            style={{ borderColor: TK.border, outlineColor: TK.focus, color: TK.text }}
                            placeholder="e.g., Increase length, humanize tone, add examples, simplify steps"
                            value={regenDialog.reason}
                            onChange={(e) => setRegenDialog((prev) => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>
                </InlineModal>
                <InlineModal
                    open={insertDialog.open}
                    title={`Insert ${insertDialog.level.toUpperCase()} section`}
                    description="Add a heading and optional notes. We'll draft the section and drop it into the preview."
                    confirmLabel="Insert & Draft"
                    confirmDisabled={!insertDialog.heading.trim()}
                    onClose={closeInsertDialog}
                    onConfirm={confirmInsertSection}
                >
                    <div className="grid gap-2">
                        <label className="grid gap-1 text-sm" style={{ color: TK.text }}>
                            Heading
                            <input
                                className="h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:outline"
                                style={{ borderColor: TK.border, outlineColor: TK.focus, color: TK.text }}
                                placeholder={`Add your ${insertDialog.level === "h2" ? "H2" : "H3"} heading`}
                                value={insertDialog.heading}
                                onChange={(e) => setInsertDialog((prev) => ({ ...prev, heading: e.target.value }))}
                            />
                        </label>
                        <label className="grid gap-1 text-sm" style={{ color: TK.text }}>
                            Notes (optional)
                            <textarea
                                className="h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:outline"
                                style={{ borderColor: TK.border, outlineColor: TK.focus, color: TK.text }}
                                placeholder="Key points, bullets, or tone hints"
                                value={insertDialog.notes}
                                onChange={(e) => setInsertDialog((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                        </label>
                    </div>
                </InlineModal>
            </section>
        );
    }
);

WriterAutomatedBody.displayName = "WriterAutomatedBody";

export default WriterAutomatedBody;

const InlineModal = ({
    open,
    title,
    description,
    children,
    confirmLabel = "Save",
    confirmDisabled,
    onClose,
    onConfirm,
}: React.PropsWithChildren<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    confirmDisabled?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}>) => {
    return (
        <AnimatePresence>
            {open ? (
                <Modal
                    open={open}
                    onCancel={onClose}
                    footer={
                        <div className="flex justify-end gap-2">
                            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                            <PrimaryButton onClick={onConfirm} disabled={confirmDisabled}>
                                {confirmLabel}
                            </PrimaryButton>
                        </div>
                    }
                    destroyOnClose
                    centered
                    closable
                    styles={{
                        content: { borderRadius: 12, border: `1px solid ${TK.border as string}`, boxShadow: TK.shadow1 as string },
                        header: { paddingBottom: 8, borderBottom: `1px solid ${TK.border as string}` },
                        body: { paddingTop: 8, paddingBottom: 0 },
                    }}
                    title={
                        <div className="space-y-1">
                            <div className="text-[15px] font-semibold" style={{ color: TK.textStrong }}>
                                {title}
                            </div>
                            {description ? (
                                <p className="text-sm" style={{ color: TK.textMuted }}>
                                    {description}
                                </p>
                            ) : null}
                        </div>
                    }
                >
                    <div className="grid gap-3">{children}</div>
                </Modal>
            ) : null}
        </AnimatePresence>
    );
};
