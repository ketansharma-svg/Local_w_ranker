"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AeoIntent, ContentType, ProjectInfo, ToneOption } from "@/src/lib/ai/writer-schema";
import {
  Wand2,
  RotateCcw,
  Save,
  Upload,
  Share2,
  Settings,
  ChevronDown,
  Layers,
  Info,
  Globe2,
  Quote,
  Users,
  Target,
  Check,
  Search,
} from "lucide-react";
import { ProjectSelector } from "@/src/components/common/project-selector";

const TK = {
  brand: "var(--brand, #008CCD)",
  onBrand: "var(--on-brand, rgba(255,255,255,0.88))",
  textStrong: "var(--text-strong, #111827)",
  text: "var(--text, #374151)",
  textMuted: "var(--text-muted, #6B7280)",
  border: "var(--border, #E5E7EB)",
  borderSubtle: "var(--border-subtle, #EFF0F6)",
  panel: "var(--bg-panel, #FFFFFF)",
  appBg: "var(--bg-app, #F5F7FA)",
  focus: "var(--focus, #4286F5)",
};

const fontStack: React.CSSProperties = {
  fontFamily:
    'Inter, "Inter Fallback", "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif',
};

export interface AiWriterHeaderProps {
  // Data sources
  project?: ProjectInfo | null;
  projects?: ProjectInfo[];
  locales?: string[];
  contentTypes?: ContentType[];
  tones?: ToneOption[];
  audiences?: string[];

  // Current selections (optional, else component manages local state)
  valueContentType?: ContentType;
  valueLocale?: string;
  valueTone?: ToneOption;
  valueAudience?: string;
  valueAeoIntent?: AeoIntent;

  // Callbacks
  onProjectChange?: (projectId: string | null) => void;
  onContentTypeChange?: (v: ContentType) => void;
  onLocaleChange?: (v: string) => void;
  onToneChange?: (v: ToneOption) => void;
  onAudienceChange?: (v: string) => void;
  onAeoIntentChange?: (v: AeoIntent) => void;

  onGenerate?: () => void;
  onReset?: () => void;
  onSaveTemplate?: (name: string) => void;
  onOpenHelp?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onOpenSettings?: () => void;

  // Saved templates (optional)
  templates?: string[];
  onLoadTemplate?: (name: string) => void;
  onDeleteTemplate?: (name: string) => void;
  onSetDefaultTemplate?: (name: string) => void;
  defaultTemplateName?: string;
}

function useOutsideClose<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!isOpen) return;
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen, onClose]);
  return ref;
}

function faviconFor(domainOrUrl: string) {
  try {
    const host = domainOrUrl.includes("://") ? new URL(domainOrUrl).hostname : domainOrUrl;
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`;
  } catch {
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domainOrUrl)}`;
  }
}

function PrimaryButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:brightness-95 focus-visible:outline"
      style={{
        background: TK.brand,
        color: TK.onBrand,
        outlineColor: TK.focus,
      }}
    >
      {Icon ? <Icon size={16} className="shrink-0" /> : null}
      <span>{title}</span>
    </button>
  );
}

function SecondaryButton({
  title,
  onClick,
  icon: Icon,
}: {
  title: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-sm transition-colors hover:bg-gray-50 focus-visible:outline"
      style={{ borderColor: TK.border, color: TK.text, outlineColor: TK.focus }}
    >
      {Icon ? <Icon size={16} /> : null}
      <span>{title}</span>
    </button>
  );
}

function IconChipButton({
  title,
  onClick,
  children,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-md border transition-colors hover:bg-gray-50 focus-visible:outline"
      style={{ borderColor: TK.border, outlineColor: TK.focus }}
    >
      <span style={{ color: TK.brand }}>{children}</span>
    </button>
  );
}

function ChipTrigger({
  children,
  title,
  onClick,
}: React.PropsWithChildren<{ title: string; onClick?: () => void }>) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-2.5 text-[13px] transition-colors hover:bg-gray-50 focus-visible:outline"
      style={{ borderColor: TK.border, color: TK.text, outlineColor: TK.focus }}
    >
      {children}
      <ChevronDown size={16} className="text-[#9CA3AF]" />
    </button>
  );
}

function DropdownCard({
  open,
  onClose,
  minWidth = 260,
  children,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void; minWidth?: number }>) {
  const ref = useOutsideClose<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute z-50 mt-2 rounded-md bg-white shadow"
      style={{ minWidth, border: `1px solid ${TK.border}` }}
    >
      {children}
    </div>
  );
}

function TitleWithInfo({ title, onHelp }: { title: string; onHelp?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <Layers size={18} style={{ color: TK.brand }} />
      <h2 className="text-[18px] font-semibold" style={{ color: TK.textStrong }}>
        {title}
      </h2>
      <button
        type="button"
        onClick={onHelp}
        className="inline-flex items-center gap-1 text-[13px] underline decoration-transparent transition hover:decoration-inherit focus-visible:outline"
        style={{ color: TK.brand, outlineColor: TK.focus, cursor: "pointer" }}
        title="Open Help"
      >
        <Info size={16} />
        Open Help
      </button>
    </div>
  );
}

function ProjectSelectorChip({
  project,
  projects = [],
  onChange,
}: {
  project?: ProjectInfo | null;
  projects?: ProjectInfo[];
  onChange?: (projectId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = project ? project.domain : "All projects";
  return (
    <div className="relative">
      <ChipTrigger title="Select Project" onClick={() => setOpen((s) => !s)}>
        {project ? (
          <img src={faviconFor(project.domain)} alt="" className="h-4 w-4 rounded" />
        ) : (
          <Layers size={16} style={{ color: TK.brand }} />
        )}
        <span className="font-medium">{label}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={320}>
        <div className="max-h-[300px] overflow-auto">
          {projects.map((p) => (
            <button
              key={p.id}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-gray-50"
              onClick={() => {
                onChange?.(p.id);
                setOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                <img src={faviconFor(p.domain)} alt="" className="h-4 w-4 rounded" />
                <span>{p.domain}</span>
              </div>
              {project?.id === p.id && <Check size={16} className="text-emerald-600" />}
            </button>
          ))}
        </div>
        <div className="px-3 py-2" style={{ borderTop: `1px solid ${TK.border}` }}>
          <button
            className="cursor-pointer text-sm underline"
            onClick={() => {
              onChange?.(null);
              setOpen(false);
            }}
          >
            Clear focus (All projects)
          </button>
        </div>
      </DropdownCard>
    </div>
  );
}

function OptionChip({
  title,
  icon: Icon,
  valueLabel,
  onOpen,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number;style?:any; }>;
  valueLabel: string;
  onOpen: () => void;
}) {
  return (
    <ChipTrigger title={title} onClick={onOpen}>
      <Icon size={16} style={{ color: TK.brand }} />
      <span className="font-medium">{valueLabel}</span>
    </ChipTrigger>
  );
}

function SimpleSelect({
  open,
  onClose,
  options,
  value,
  onChange,
  searchablePlaceholder,
}: {
  open: boolean;
  onClose: () => void;
  options: Array<{ id: string; label: string; meta?: string }>;
  value: string;
  onChange: (id: string) => void;
  searchablePlaceholder?: string;
}) {
  const [q, setQ] = useState("");
  const ref = useOutsideClose<HTMLDivElement>(open, onClose);
  if (!open) return null;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="absolute z-50 mt-2 min-w-[240px] rounded-md bg-white shadow" style={{ border: `1px solid ${TK.border}` }}>
      <div className="border-b p-2" style={{ borderColor: TK.border }}>
        <div className="flex items-center gap-2 rounded border px-2 py-1.5" style={{ borderColor: TK.border }}>
          <Search size={16} className="text-[#9CA3AF]" />
          <input
            className="w-full text-sm outline-none"
            placeholder={searchablePlaceholder ?? "Search"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="max-h-[280px] overflow-auto">
        {filtered.map((o) => (
          <button
            key={o.id}
            className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
            onClick={() => {
              onChange(o.id);
              onClose();
            }}
          >
            <span>
              {o.label}
              {o.meta ? <span className="ml-1 text-xs text-gray-500">· {o.meta}</span> : null}
            </span>
            {value === o.id && <Check size={16} className="text-emerald-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplatesChip({
  currentName,
  templates = [],
  onSave,
  onLoad,
  onDelete,
  onSetDefault,
  defaultName,
}: {
  currentName?: string;
  templates?: string[];
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete?: (name: string) => void;
  onSetDefault?: (name: string) => void;
  defaultName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <div className="relative">
      <ChipTrigger title="Templates" onClick={() => setOpen((s) => !s)}>
        <Save size={16} style={{ color: TK.brand }} />
        <span className="font-medium">{currentName ? `Template: ${currentName}` : "Templates"}</span>
      </ChipTrigger>
      <DropdownCard open={open} onClose={() => setOpen(false)} minWidth={320}>
        <div className="border-b px-3 py-2" style={{ borderColor: TK.border }}>
          <div className="text-[12px]" style={{ color: TK.textMuted }}>
            Save current inputs as
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="w-full rounded border px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: TK.border }}
              placeholder="e.g., Blog • en-US • Helpful"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="h-9 cursor-pointer rounded-md px-3 text-sm font-medium"
              style={{ background: TK.brand, color: TK.onBrand }}
              onClick={() => {
                if (name.trim()) {
                  onSave(name.trim());
                  setName("");
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
        <div className="max-h-[240px] overflow-auto">
          {templates.length === 0 ? (
            <div className="px-3 py-3 text-sm" style={{ color: TK.textMuted }}>
              No templates yet.
            </div>
          ) : (
            templates.map((v) => (
              <div key={v} className="flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-gray-50">
                <button className="cursor-pointer text-left" onClick={() => onLoad(v)}>
                  {v}
                  {v === defaultName ? " • default" : ""}
                </button>
                <div className="flex items-center gap-2">
                  {onSetDefault ? (
                    <button className="cursor-pointer underline" onClick={() => onSetDefault(v)}>
                      Set default
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button className="cursor-pointer underline text-red-600" onClick={() => onDelete(v)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownCard>
    </div>
  );
}

export function AiWriterHeader({
  project,
  projects = [],
  locales = ["en-US", "en-GB", "hi-IN"],
  contentTypes = ["blog", "landing", "docs", "resource", "newsletter"],
  tones = ["Neutral", "Helpful", "Confident", "Playful"],
  audiences = ["Developers", "SMB marketers", "CX leaders", "C‑suite"],

  valueContentType,
  valueLocale,
  valueTone,
  valueAudience,
  valueAeoIntent,

  onProjectChange,
  onContentTypeChange,
  onLocaleChange,
  onToneChange,
  onAudienceChange,
  onAeoIntentChange,

  onGenerate,
  onReset,
  onSaveTemplate,
  onOpenHelp,
  onImport,
  onExport,
  onShare,
  onOpenSettings,

  templates = [],
  onLoadTemplate,
  onDeleteTemplate,
  onSetDefaultTemplate,
  defaultTemplateName,
}: AiWriterHeaderProps) {
  // Local state fallbacks when uncontrolled
  const [ct, setCt] = useState<ContentType>(valueContentType ?? "blog");
  const [loc, setLoc] = useState<string>(valueLocale ?? locales[0]);
  const [tone, setTone] = useState<ToneOption>(valueTone ?? "Helpful");
  const [aud, setAud] = useState<string>(valueAudience ?? audiences[0]);
  const [aeo, setAeo] = useState<AeoIntent>(valueAeoIntent ?? "direct_answer");
  const [currentTemplate, setCurrentTemplate] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (valueContentType) setCt(valueContentType);
  }, [valueContentType]);
  useEffect(() => {
    if (valueLocale) setLoc(valueLocale);
  }, [valueLocale]);
  useEffect(() => {
    if (valueTone) setTone(valueTone);
  }, [valueTone]);
  useEffect(() => {
    if (valueAudience) setAud(valueAudience);
  }, [valueAudience]);
  useEffect(() => {
    if (valueAeoIntent) setAeo(valueAeoIntent);
  }, [valueAeoIntent]);

  // Dropdown toggles
  const [openType, setOpenType] = useState(false);
  const [openLocale, setOpenLocale] = useState(false);
  const [openTone, setOpenTone] = useState(false);
  const [openAudience, setOpenAudience] = useState(false);
  const [openAeo, setOpenAeo] = useState(false);

  const aeoLabel = useMemo(
    () =>
      aeo === "direct_answer"
        ? "Direct Answer"
        : aeo === "how_to"
        ? "How‑to"
        : aeo === "comparative"
        ? "Comparative"
        : "FAQ‑first",
    [aeo]
  );

  const canGenerate = Boolean(ct && loc); // Topic, etc., validated in the body; header enforces key scoping

  return (
    <div className="w-full bg-white p-6 text-[14px]" style={fontStack}>
      {/* Row A — Title & breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <TitleWithInfo title="AI Content Writer" onHelp={onOpenHelp} />
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] leading-tight">
          <span style={{ color: TK.text }}>Content</span>
          <span className="text-[#9CA3AF]">›</span>
          <span style={{ color: TK.text }}>Writer</span>
          <span className="text-[#9CA3AF]">›</span>
          <span className="font-semibold" style={{ color: TK.text }}>
            Automated
          </span>
        </nav>
      </div>

      {/* Row B — Project focus & header actions (parity with Home) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* <ProjectSelectorChip
            project={project ?? null}
            projects={projects}
            onChange={(id) => onProjectChange?.(id)}
          /> */}
          <ProjectSelector />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton title="Reset" icon={RotateCcw} onClick={onReset} />
          {/* Optional global icons to match Home affordances */}
          <IconChipButton title="Import" onClick={onImport}>
            <Upload className="size-4" />
          </IconChipButton>
          <IconChipButton title="Export" onClick={onExport}>
            <Upload className="size-4 rotate-180" />
          </IconChipButton>
          <IconChipButton title="Share" onClick={onShare}>
            <Share2 className="size-4" />
          </IconChipButton>
          <IconChipButton title="Settings" onClick={onOpenSettings}>
            <Settings className="size-4" />
          </IconChipButton>
        </div>
      </div>

      {/* Separator #1 */}
      <div className="mt-3" style={{ borderBottom: `2px solid ${TK.border}` }} />

      {/* Row C — Panel‑specific filter chips (content scope) */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Content Type */}
          <div className="relative">
            <OptionChip title="Content Type" icon={Layers} valueLabel={ct.charAt(0).toUpperCase() + ct.slice(1)} onOpen={() => setOpenType(true)} />
            <SimpleSelect
              open={openType}
              onClose={() => setOpenType(false)}
              options={contentTypes.map((t) => ({ id: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              value={ct}
              onChange={(id) => {
                setCt(id as ContentType);
                onContentTypeChange?.(id as ContentType);
              }}
              searchablePlaceholder="Search content types"
            />
          </div>

          {/* Locale */}
          <div className="relative">
            <OptionChip title="Locale" icon={Globe2} valueLabel={loc} onOpen={() => setOpenLocale(true)} />
            <SimpleSelect
              open={openLocale}
              onClose={() => setOpenLocale(false)}
              options={locales.map((l) => ({ id: l, label: l }))}
              value={loc}
              onChange={(id) => {
                setLoc(id);
                onLocaleChange?.(id);
              }}
              searchablePlaceholder="Search locales (BCP‑47)"
            />
          </div>

          {/* Tone */}
          <div className="relative">
            <OptionChip title="Tone" icon={Quote} valueLabel={tone} onOpen={() => setOpenTone(true)} />
            <SimpleSelect
              open={openTone}
              onClose={() => setOpenTone(false)}
              options={tones.map((t) => ({ id: t, label: t }))}
              value={tone}
              onChange={(id) => {
                setTone(id as ToneOption);
                onToneChange?.(id as ToneOption);
              }}
              searchablePlaceholder="Search tones"
            />
          </div>

          {/* Audience */}
          <div className="relative">
            <OptionChip title="Audience" icon={Users} valueLabel={aud} onOpen={() => setOpenAudience(true)} />
            <SimpleSelect
              open={openAudience}
              onClose={() => setOpenAudience(false)}
              options={audiences.map((a) => ({ id: a, label: a }))}
              value={aud}
              onChange={(id) => {
                setAud(id);
                onAudienceChange?.(id);
              }}
              searchablePlaceholder="Search audiences"
            />
          </div>

          {/* AEO Intent */}
          <div className="relative">
            <OptionChip title="AEO Intent" icon={Target} valueLabel={aeoLabel} onOpen={() => setOpenAeo(true)} />
            <SimpleSelect
              open={openAeo}
              onClose={() => setOpenAeo(false)}
              options={[
                { id: "direct_answer", label: "Direct Answer" },
                { id: "how_to", label: "How‑to" },
                { id: "comparative", label: "Comparative" },
                { id: "faq_first", label: "FAQ‑first" },
              ]}
              value={aeo}
              onChange={(id) => {
                setAeo(id as AeoIntent);
                onAeoIntentChange?.(id as AeoIntent);
              }}
              searchablePlaceholder="Search intents"
            />
          </div>
        </div>

        {/* Templates (Save / Load) */}
        {/* <div className="flex items-center gap-2">
          <TemplatesChip
            currentName={currentTemplate}
            templates={templates}
            defaultName={defaultTemplateName}
            onSave={(name) => {
              onSaveTemplate?.(name);
              setCurrentTemplate(name);
            }}
            onLoad={(name) => {
              onLoadTemplate?.(name);
              setCurrentTemplate(name);
            }}
            onDelete={onDeleteTemplate}
            onSetDefault={onSetDefaultTemplate}
          />
        </div> */}
      </div>
    </div>
  );
}
