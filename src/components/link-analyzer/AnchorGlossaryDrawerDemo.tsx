import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search as SearchIcon,
  X,
  Download,
  ClipboardCopy,
  Check,
  ChevronDown,
  ExternalLink,
  ChevronRight,
  Anchor as AnchorIcon,
  Target,
  Type,
  Hash,
  BadgeCheck,
  MousePointer,
  Image as ImageIcon,
  Link as LinkIcon,
  ShieldOff,
  DollarSign,
  Users,
  BookOpen,
  HelpCircle,
} from "lucide-react";

/**
 * Drawer 4: Anchor Glossary / Help — updated
 * - Uses branded iconography (header + types + attributes)
 * - Inter font family (with system fallbacks)
 * - Modular Button design (primary / secondary / outline)
 * - PDF download via print-friendly guide
 * - No emoji
 */

// ---------------------------------------------------------------------------
// Tokens (aligned with Wranker design tokens from other sections)
// ---------------------------------------------------------------------------
const tokens = {
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  border: "var(--wr-borderLight, #EFF0F6)",
  brand: "var(--wr-brand, #008CCD)",
  brandHover: "var(--wr-brandHover, #007DB3)",
  valueBlue: "var(--wr-valueBlue, #0077FF)",
  chipBg: "#F5F7FA",
  chipHover: "#E5E7EB",
  warning: "var(--wr-warning, #F59E0B)",
  danger: "var(--wr-critical, #EF4444)",
  success: "var(--wr-success, #10B981)",
};

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
const SECTION_IDS = {
  ANCHOR_TYPES: "anchor-types",
  AQS: "aqs",
  ATTRIBUTES: "link-attributes",
  TIPS: "optimization-tips",
  EXTRAS: "extras",
} as const;

type DeepLinkKey =
  | "anchor-types"
  | "exact"
  | "phrase"
  | "partial"
  | "branded"
  | "generic"
  | "empty"
  | "aqs"
  | "link-attributes"
  | "optimization-tips"
  | "extras";

type DrawerProps = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  deepLink?: DeepLinkKey | null;
  widthClass?: string;
  secondaryWidthClass?: string;
};

// ---------------------------------------------------------------------------
// Hook: useEscToClose
// ---------------------------------------------------------------------------
function useEscToClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onClose]);
}

// ---------------------------------------------------------------------------
// Small utils: fuzzy match & highlight
// ---------------------------------------------------------------------------
function fuzzyMatch(hay: string, q: string) {
  if (!q) return true;
  const needles = q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const h = hay.toLowerCase();
  return needles.every((n) => h.includes(n));
}

function markHighlight(text: string, query: string) {
  if (!query) return text;
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ---------------------------------------------------------------------------
// Glossary content
// ---------------------------------------------------------------------------
const glossaryData = {
  [SECTION_IDS.ANCHOR_TYPES]: {
    title: "Anchor Types",
    items: [
      {
        id: "exact",
        title: "Exact Match",
        definition: "Anchor matches the target keyword exactly.",
        example: "seo tools → linking to /seo-tools",
        tip: "Overuse can signal over-optimization; ideally keep under 30%.",
        icon: Target,
      },
      {
        id: "phrase",
        title: "Phrase Match",
        definition: "Keyword appears within a longer, natural phrase.",
        example: "best seo tools for beginners",
        tip: "Diversify across multiple long-tail phrases to stay natural.",
        icon: Type,
      },
      {
        id: "partial",
        title: "Partial Match",
        definition: "Semantically related or variant keyword usage.",
        example: "optimize site health score",
        tip: "Useful for variation; combine with branded signals.",
        icon: Hash,
      },
      {
        id: "branded",
        title: "Branded",
        definition: "Brand name used as the anchor.",
        example: "Wranker SEO platform",
        tip: "Maintain 10–20% branded anchors to strengthen brand authority.",
        icon: BadgeCheck,
      },
      {
        id: "generic",
        title: "Generic",
        definition: "Non-descriptive anchors that lack keywords.",
        example: "Click here, Read more",
        tip: "Keep generic anchors under 15% of total.",
        icon: MousePointer,
      },
      {
        id: "empty",
        title: "Empty / Image Only",
        definition: "Anchors without visible text or image-only links; rely on alt text.",
        example: '<a href="#"><img src="banner.png" alt="SEO Guide"/></a>',
        tip: "Always provide meaningful alt text for image anchors.",
        icon: ImageIcon,
      },
    ],
  },
  [SECTION_IDS.AQS]: {
    title: "AQS (Anchor Quality Score)",
    content: {
      definition:
        "A 0–100 composite score measuring anchor quality across diversity, relevance, placement, and generic/empty penalties.",
      tiers: [
        { label: "75–100 = Excellent", tone: "good" },
        { label: "50–74 = Needs Review", tone: "warn" },
        { label: "0–49 = Poor", tone: "bad" },
      ],
      note: "AQS < 50 triggers alerts in tables & Smart Suggestions across the Anchors tab.",
      formula:
        "AQS = 0.3·Diversity + 0.3·Relevance + 0.2·Placement + 0.2·Penalty(Generic/Empty)",
    },
  },
  [SECTION_IDS.ATTRIBUTES]: {
    title: "Link Attributes",
    items: [
      { term: "DoFollow", def: "Default; passes link equity (no rel needed).", icon: LinkIcon },
      { term: "NoFollow", def: "Signals search engines not to follow the link.", icon: ShieldOff },
      { term: "Sponsored", def: "Indicates paid/sponsored link content.", icon: DollarSign },
      { term: "UGC", def: "User-generated content (forums, comments).", icon: Users },
    ],
  },
  [SECTION_IDS.TIPS]: {
    title: "Anchor Optimization Tips",
    bullets: [
      "Keep anchors descriptive & relevant to the destination.",
      "Balance exact-match with branded and phrase anchors.",
      "Avoid repetitive site-wide links (headers/footers).",
      "Use context-rich phrases to keep profiles natural.",
    ],
  },
  [SECTION_IDS.EXTRAS]: {
    title: "Extras",
    qa: [
      {
        q: "How does Wranker calculate AQS?",
        a: "AQS blends diversity, semantic relevance, placement context, and penalties for generic/empty anchors using weighted factors. See the full doc for advanced inputs & examples.",
        href: "#",
      },
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Modular Button (matches other sections' pattern)
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "outline" | "quiet";
type ButtonSize = "sm" | "md";

const Button: React.FC<
  React.PropsWithChildren<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    onClick?: () => void;
    title?: string;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
    className?: string;
    fullWidth?: boolean;
    type?: "button" | "submit";
  }>
> = ({
  variant = "primary",
  size = "md",
  onClick,
  title,
  iconLeft,
  iconRight,
  className,
  fullWidth,
  type = "button",
  children,
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--wr-brand,#008CCD)]/40 transition-colors";
  const pxpy = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm";
  const width = fullWidth ? "w-full" : "";
  const styles =
    variant === "primary"
      ? `text-white bg-[${tokens.brand}] hover:bg-[${tokens.brandHover}]`
      : variant === "secondary"
      ? `text-[${tokens.text}] bg-[${tokens.chipBg}] hover:bg-[${tokens.chipHover}] border border-[${tokens.border}]`
      : variant === "outline"
      ? `text-[${tokens.text}] bg-white hover:bg-gray-50 border border-[${tokens.border}]`
      : `text-[${tokens.valueBlue}] hover:bg-gray-50`; // quiet

  return (
    <button type={type} title={title} onClick={onClick} className={`${base} ${pxpy} ${styles} ${width} ${className ?? ""}`}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Reusable UI bits
// ---------------------------------------------------------------------------
const Divider: React.FC = () => (
  <div className="border-t" style={{ borderColor: tokens.border }} aria-hidden />
);

const DrawerOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  if (!open) return null;
  return <div onClick={onClose} className="fixed inset-0 z-[60] bg-black/50" aria-hidden />;
};

const DrawerPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}> = ({ open, onClose, widthClass = "md:w-[420px]", ariaLabel = "Drawer", children }) => {
  useEscToClose(open, onClose);
  return (
    <div
      className={`fixed inset-y-0 right-0 z-[70] w-screen ${widthClass} bg-white shadow-xl border-l motion-safe:transition-transform motion-safe:duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{
        borderColor: tokens.border,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

const SecondaryDrawerPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  widthClass?: string;
  children: React.ReactNode;
}> = ({ open, onClose, widthClass = "md:w-[840px]", children }) => {
  useEscToClose(open, onClose);
  return (
    <div
      className={`fixed inset-y-0 right-0 z-[80] w-screen ${widthClass} bg-white shadow-2xl border-l motion-safe:transition-transform motion-safe:duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      style={{
        borderColor: tokens.border,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Anchor Details"
    >
      {children}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; id?: string } & React.HTMLAttributes<HTMLDivElement>> = ({
  title,
  id,
  ...rest
}) => (
  <div id={id} {...rest} className="flex items-center justify-between py-2">
    <h3 className="text-[15px] font-semibold" style={{ color: tokens.text }}>
      {title}
    </h3>
  </div>
);

const TierPill: React.FC<{ tone: "good" | "warn" | "bad"; children: React.ReactNode }> = ({ tone, children }) => {
  const map = { good: tokens.success, warn: tokens.warning, bad: tokens.danger } as const;
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mr-2 mb-2"
      style={{ background: "#F5F7FA", color: map[tone] }}
    >
      {children}
    </span>
  );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:bg-gray-50"
      style={{ borderColor: tokens.border, color: tokens.valueBlue }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch (e) {
          console.error(e);
        }
      }}
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
    </button>
  );
};

const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; onClear: () => void }> = ({
  value,
  onChange,
  onClear,
}) => (
  <div className="flex items-center gap-2 rounded border px-2 py-1.5" style={{ borderColor: tokens.border }}>
    <SearchIcon className="w-4 h-4" style={{ color: tokens.muted }} />
    <input
      className="w-full outline-none text-sm bg-transparent"
      style={{ color: tokens.text, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system" }}
      placeholder="Search glossary (e.g., Exact, Generic, AQS)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Search glossary"
    />
    {value && (
      <button onClick={onClear} className="p-1 rounded hover:bg-gray-50" title="Clear">
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Printable Guide (print → Save as PDF in browser)
// ---------------------------------------------------------------------------
function makePrintableGuideHtml({ project = "Demo Project" }: { project?: string }) {
  const date = new Date().toLocaleDateString();
  const ver = "v1.0";
  const style = `
    <style>
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system; color: #111827; margin: 24px; }
      h1 { font-size: 20px; margin: 0; }
      h2 { font-size: 16px; margin: 20px 0 8px; }
      p, li { font-size: 13px; line-height: 1.5; }
      .meta { color: #6B7280; font-size: 12px; margin: 4px 0 20px; }
      .card { border: 1px solid #EFF0F6; border-radius: 8px; padding: 12px; margin: 12px 0; }
      .pill { display:inline-block; font-size:12px; padding:2px 8px; border-radius:999px; background:#F5F7FA; margin-right:6px; }
      ul { padding-left: 18px; }
      code { background:#F5F7FA; padding:2px 4px; border-radius:4px; font-size:12px; }
      @media print { a { color: #111827; text-decoration: none; } }
    </style>
  `;
  function sectionAnchorTypes() {
    const items = (glossaryData[SECTION_IDS.ANCHOR_TYPES] as any).items as Array<any>;
    return `
      <div class="card">
        <h2>Anchor Types</h2>
        ${items
          .map(
            (it) => `
            <h3>${it.title}</h3>
            <p><strong>Definition:</strong> ${it.definition}</p>
            <p><strong>Example:</strong> ${it.example}</p>
            <p><strong>SEO Tip:</strong> ${it.tip}</p>
          `,
          )
          .join("")}
      </div>
    `;
  }
  function sectionAQS() {
    const { definition, tiers, note, formula } = (glossaryData[SECTION_IDS.AQS] as any).content;
    return `
      <div class="card">
        <h2>AQS (Anchor Quality Score)</h2>
        <p>${definition}</p>
        <p><strong>Scoring Tiers:</strong></p>
        <p>${tiers.map((t: any) => `<span class="pill">${t.label}</span>`).join(" ")}</p>
        <p><em>${note}</em></p>
        <p><strong>Formula (simplified):</strong> ${formula}</p>
      </div>
    `;
  }
  function sectionAttrs() {
    const items = (glossaryData[SECTION_IDS.ATTRIBUTES] as any).items as Array<any>;
    return `
      <div class="card">
        <h2>Link Attributes</h2>
        ${items.map((x) => `<p><strong>${x.term}:</strong> ${x.def}</p>`).join("")}
      </div>
    `;
  }
  function sectionTips() {
    const bullets = (glossaryData[SECTION_IDS.TIPS] as any).bullets as Array<string>;
    return `
      <div class="card">
        <h2>Anchor Optimization Tips</h2>
        <ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
      </div>
    `;
  }
  function sectionExtras() {
    const qa = (glossaryData[SECTION_IDS.EXTRAS] as any).qa as Array<any>;
    return `
      <div class="card">
        <h2>Extras</h2>
        ${qa
          .map(
            (q) => `
            <p><strong>Q:</strong> ${q.q}</p>
            <p><strong>A:</strong> ${q.a}</p>
          `,
          )
          .join("")}
      </div>
    `;
  }
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Anchor Optimization Guide — ${project}</title>
        ${style}
      </head>
      <body>
        <h1>Anchor Optimization Guide</h1>
        <div class="meta">Project: ${project} · Date: ${date} · Version: ${ver}</div>
        ${sectionAnchorTypes()}
        ${sectionAQS()}
        ${sectionAttrs()}
        ${sectionTips()}
        ${sectionExtras()}
      </body>
    </html>
  `;
  return html;
}

function openPrintableAndPrint(projectName?: string) {
  const html = makePrintableGuideHtml({ project: projectName || "Demo Project" });
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print(); // user can Save as PDF
  }, 350);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AnchorGlossaryDrawerDemo(props: DrawerProps) {
  const [open, setOpen] = useState(!!props.open);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<DeepLinkKey | null>(null);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const widthClass = props.widthClass || "md:w-[420px]";
  const secondaryWidthClass = props.secondaryWidthClass || "md:w-[840px]";

  useEffect(() => {
    if (typeof props.open === "boolean") setOpen(props.open);
  }, [props.open]);

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    props.onOpenChange?.(v);
  };

  // Deep link auto-expand & scroll
  useEffect(() => {
    if (!open) return;
    const key = props.deepLink;
    if (!key) return;
    setExpanded(key);
    setTimeout(() => {
      const el = document.getElementById(`gl-${key}`) || document.getElementById(`sec-${key}`);
      if (el && scrollRef.current) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.deepLink]);

  // Search hits
  const searchHits = useMemo(() => {
    if (!query) return null;
    const q = query.toLowerCase();
    const hits: string[] = [];

    const types = (glossaryData[SECTION_IDS.ANCHOR_TYPES] as any).items as Array<any>;
    types.forEach((it) => {
      const blob = `${it.title} ${it.definition} ${it.example} ${it.tip}`;
      if (fuzzyMatch(blob, q)) hits.push(it.id);
    });

    const aqs = (glossaryData[SECTION_IDS.AQS] as any).content as any;
    const aqsBlob = `${aqs.definition} ${aqs.tiers.map((t: any) => t.label).join(" ")} ${aqs.note} ${aqs.formula}`;
    if (fuzzyMatch(aqsBlob, q)) hits.push("aqs");

    const attrs = (glossaryData[SECTION_IDS.ATTRIBUTES] as any).items as Array<any>;
    attrs.forEach((a) => {
      if (fuzzyMatch(`${a.term} ${a.def}`, q)) hits.push("link-attributes");
    });

    const tips = (glossaryData[SECTION_IDS.TIPS] as any).bullets as Array<string>;
    if (fuzzyMatch(tips.join(" "), q)) hits.push("optimization-tips");

    const extras = (glossaryData[SECTION_IDS.EXTRAS] as any).qa as Array<any>;
    extras.forEach((x) => {
      if (fuzzyMatch(`${x.q} ${x.a}`, q)) hits.push("extras");
    });

    return new Set(hits);
  }, [query]);

  const showSection = (key: DeepLinkKey | keyof typeof SECTION_IDS) => {
    if (!searchHits) return true;
    return (
      (searchHits as any).has(key) ||
      (key === SECTION_IDS.ANCHOR_TYPES &&
        ["exact", "phrase", "partial", "branded", "generic", "empty"].some((s) => (searchHits as any).has(s)))
    );
  };

  // PDF Download
  const downloadPdf = () => openPrintableAndPrint("Demo Project");

  // Secondary drawer body (details view)
  const renderSecondaryBody = () => {
    if (!selectedType) return null;
    const { title, definition, example, tip, icon: IconComp } = selectedType;
    return (
      <div className="flex flex-col h-full">
        {/* Sticky header for secondary */}
        <div
          className="sticky top-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
          style={{ borderBottom: `1px solid ${tokens.border}` }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              {IconComp ? <IconComp className="w-5 h-5" style={{ color: tokens.valueBlue }} /> : <BookOpen className="w-5 h-5" style={{ color: tokens.valueBlue }} />}
              <h2 className="text-[18px] font-semibold" style={{ color: tokens.text }}>
                Anchor Type Details — {title}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSecondaryOpen(false)} title="Close details" iconLeft={<X className="w-4 h-4" />}>
              Close
            </Button>
          </div>
        </div>
        {/* Body */}
        <div className="h-[calc(100vh-64px)] overflow-y-auto px-4 pb-6">
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-3" style={{ borderColor: tokens.border }}>
              <h4 className="font-semibold mb-1" style={{ color: tokens.text }}>
                Definition
              </h4>
              <p className="text-sm" style={{ color: tokens.text }}>
                {definition}
              </p>
            </div>
            <div className="border rounded-md p-3" style={{ borderColor: tokens.border }}>
              <h4 className="font-semibold mb-1" style={{ color: tokens.text }}>
                Example
              </h4>
              <p className="text-sm font-mono">{example}</p>
              <div className="mt-2">
                <CopyButton text={example} />
              </div>
            </div>
            <div className="border rounded-md p-3 md:col-span-2" style={{ borderColor: tokens.border }}>
              <h4 className="font-semibold mb-1" style={{ color: tokens.text }}>
                SEO Tip
              </h4>
              <p className="text-sm" style={{ color: tokens.text }}>
                {tip}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Branded quick chips (iconic, no emoji)
  const Chip: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
    icon?: React.ReactNode;
  }> = ({ children, onClick, title, icon }) => (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex items-center gap-2 px-2.5 py-1 text-sm rounded-full border transition-colors motion-safe:duration-150 outline-none focus:ring-2 focus:ring-offset-2 mr-2 mb-2 hover:bg-gray-50"
      style={{ borderColor: tokens.border, color: tokens.text }}
    >
      {icon}
      {children}
    </button>
  );

  return (
    <div className="p-4" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system" }}>
      {/* Demo triggers */}
      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="secondary"
          iconLeft={<HelpCircle className="w-4 h-4" />}
          onClick={() => onOpenChange(true)}
          title="Open Glossary"
        >
          Open Glossary
        </Button>
        <Chip
          onClick={() => {
            setExpanded("anchor-types");
            onOpenChange(true);
          }}
          title="Deep-link: Anchor Types"
          icon={<AnchorIcon className="w-4 h-4" style={{ color: tokens.valueBlue }} />}
        >
          Anchor Types
        </Chip>
        <Chip
          onClick={() => {
            setExpanded("aqs");
            onOpenChange(true);
          }}
          title="Deep-link: AQS"
          icon={<BookOpen className="w-4 h-4" style={{ color: tokens.valueBlue }} />}
        >
          AQS
        </Chip>
        <Chip
          onClick={() => {
            setExpanded("generic");
            onOpenChange(true);
          }}
          title="Deep-link: Generic"
          icon={<MousePointer className="w-4 h-4" style={{ color: tokens.valueBlue }} />}
        >
          Generic
        </Chip>
        <Chip
          onClick={() => {
            setExpanded("exact");
            onOpenChange(true);
          }}
          title="Deep-link: Exact"
          icon={<Target className="w-4 h-4" style={{ color: tokens.valueBlue }} />}
        >
          Exact
        </Chip>
        <Chip
          onClick={() => {
            setExpanded("link-attributes");
            onOpenChange(true);
          }}
          title="Deep-link: Attributes"
          icon={<LinkIcon className="w-4 h-4" style={{ color: tokens.valueBlue }} />}
        >
          rel=*
        </Chip>
        <Chip
          onClick={() => {
            setExpanded("optimization-tips");
            onOpenChange(true);
          }}
          title="Deep-link: Tips"
          icon={<HelpCircle className="w-4 h-4" style={{ color: tokens.valueBlue }} />}
        >
          Tips
        </Chip>
      </div>

      {/* Overlay + Primary Drawer */}
      <DrawerOverlay open={open} onClose={() => onOpenChange(false)} />
      <DrawerPanel open={open} onClose={() => onOpenChange(false)} widthClass={widthClass} ariaLabel="Anchor Glossary & Help">
        {/* Header */}
        <div
          className="sticky top-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
          style={{ borderBottom: `1px solid ${tokens.border}` }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <AnchorIcon className="w-5 h-5" style={{ color: tokens.valueBlue }} />
              <h2 className="text-[18px] font-semibold" style={{ color: tokens.text }}>
                Anchor Glossary & Help
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                title="Download Guide (PDF)"
                iconLeft={<Download className="w-4 h-4" />}
              >
                Download PDF
              </Button>
              <Button variant="quiet" size="sm" onClick={() => onOpenChange(false)} title="Close" iconLeft={<X className="w-4 h-4" />}>
                Close
              </Button>
            </div>
          </div>
          <div className="px-4 pb-3">
            <SearchBox value={query} onChange={setQuery} onClear={() => setQuery("")} />
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="h-[calc(100vh-110px)] overflow-y-auto px-4 pb-6" role="document">
          {/* SECTION 1: Anchor Types */}
          {showSection(SECTION_IDS.ANCHOR_TYPES) && (
            <div className="py-3" id="sec-anchor-types">
              <SectionHeader title="Anchor Types" />
              <div className="mt-2 space-y-3">
                {(glossaryData[SECTION_IDS.ANCHOR_TYPES] as any).items.map((it: any) => {
                  const isOpen = expanded === it.id || expanded === SECTION_IDS.ANCHOR_TYPES;
                  const Icon = it.icon as React.ComponentType<any> | undefined;
                  return (
                    <div key={it.id} id={`gl-${it.id}`} className="border rounded-md" style={{ borderColor: tokens.border }}>
                      <div className="w-full flex items-center justify-between px-3 py-2">
                        <button
                          className="flex-1 text-left hover:bg-gray-50 rounded px-1 py-1"
                          onClick={() => setExpanded(isOpen ? null : it.id)}
                          aria-expanded={isOpen}
                        >
                          <span className="inline-flex items-center gap-2 font-medium" style={{ color: tokens.text }}>
                            {Icon ? <Icon className="w-4 h-4" style={{ color: tokens.valueBlue }} /> : null}
                            {markHighlight(it.title, query)}
                          </span>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Open details"
                          iconRight={<ChevronRight className="w-3.5 h-3.5" />}
                          onClick={() => {
                            setSelectedType(it);
                            setSecondaryOpen(true);
                          }}
                        >
                          Details
                        </Button>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 text-sm" style={{ color: tokens.text }}>
                          <p className="mb-1">
                            <span className="text-[13px] text-gray-500">Definition:</span> {markHighlight(it.definition, query)}
                          </p>
                          <p className="mb-1">
                            <span className="text-[13px] text-gray-500">Example:</span>{" "}
                            <span className="font-mono">{markHighlight(it.example, query)}</span> <CopyButton text={it.example} />
                          </p>
                          <p className="mb-1">
                            <span className="text-[13px] text-gray-500">SEO Tip:</span> {markHighlight(it.tip, query)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Divider />

          {/* SECTION 2: AQS */}
          {showSection(SECTION_IDS.AQS) && (
            <div className="py-3" id="sec-aqs">
              <SectionHeader title="AQS (Anchor Quality Score)" />
              <div className="mt-2 border rounded-md p-3" style={{ borderColor: tokens.border }} id="gl-aqs">
                <p className="text-sm mb-2" style={{ color: tokens.text }}>
                  {markHighlight((glossaryData[SECTION_IDS.AQS] as any).content.definition, query)}
                </p>
                <div className="mb-2 text-sm">
                  <span className="text-[13px] text-gray-500 mr-1">Scoring Tiers:</span>
                  {(glossaryData[SECTION_IDS.AQS] as any).content.tiers.map((t: any, i: number) => (
                    <TierPill key={i} tone={t.tone as any}>
                      {markHighlight(t.label, query)}
                    </TierPill>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  <em>{markHighlight((glossaryData[SECTION_IDS.AQS] as any).content.note, query)}</em>
                </p>
                <p className="text-sm">
                  <span className="text-[13px] text-gray-500">Formula (simplified):</span>{" "}
                  {markHighlight((glossaryData[SECTION_IDS.AQS] as any).content.formula, query)}
                </p>
              </div>
            </div>
          )}

          <Divider />

          {/* SECTION 3: Link Attributes */}
          {showSection(SECTION_IDS.ATTRIBUTES) && (
            <div className="py-3" id="sec-link-attributes">
              <SectionHeader title="Link Attributes" />
              <div className="mt-2 border rounded-md divide-y" style={{ borderColor: tokens.border }}>
                {(glossaryData[SECTION_IDS.ATTRIBUTES] as any).items.map((a: any, idx: number) => {
                  const Icon = a.icon as React.ComponentType<any> | undefined;
                  return (
                    <div key={idx} id="gl-link-attributes" className="px-3 py-2 text-sm flex items-start gap-2">
                      {Icon ? <Icon className="mt-0.5 w-4 h-4" style={{ color: tokens.valueBlue }} /> : <LinkIcon className="mt-0.5 w-4 h-4" style={{ color: tokens.valueBlue }} />}
                      <p className="m-0" style={{ color: tokens.text }}>
                        <strong>{markHighlight(a.term, query)}:</strong> {markHighlight(a.def, query)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Divider />

          {/* SECTION 4: Optimization Tips */}
          {showSection(SECTION_IDS.TIPS) && (
            <div className="py-3" id="sec-optimization-tips">
              <SectionHeader title="Anchor Optimization Tips" />
              <ul className="mt-2 list-disc pl-6 text-sm" style={{ color: tokens.text }}>
                {(glossaryData[SECTION_IDS.TIPS] as any).bullets.map((b: string, i: number) => (
                  <li key={i}>{markHighlight(b, query)}</li>
                ))}
              </ul>
            </div>
          )}

          <Divider />

          {/* SECTION 5: Extras */}
          {showSection(SECTION_IDS.EXTRAS) && (
            <div className="py-3" id="sec-extras">
              <SectionHeader title="Extras" />
              <div className="mt-2 space-y-2">
                {(glossaryData[SECTION_IDS.EXTRAS] as any).qa.map((x: any, i: number) => (
                  <div key={i} className="border rounded-md p-3" style={{ borderColor: tokens.border }}>
                    <p className="text-sm font-medium mb-1" style={{ color: tokens.text }}>
                      Q: {markHighlight(x.q, query)}
                    </p>
                    <p className="text-sm" style={{ color: tokens.text }}>
                      A: {markHighlight(x.a, query)}
                    </p>
                    {x.href && (
                      <a
                        href={x.href}
                        className="inline-flex items-center gap-1 text-xs mt-2 text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read more <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Export CTA (Modular Button) */}
          <div className="pt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={downloadPdf}
              title="Download Anchor Optimization Guide (PDF)"
              iconLeft={<Download className="w-4 h-4" />}
            >
              Download Anchor Optimization Guide (PDF)
            </Button>
          </div>
        </div>
      </DrawerPanel>

      {/* Secondary Wide Drawer */}
      <SecondaryDrawerPanel open={secondaryOpen} onClose={() => setSecondaryOpen(false)} widthClass={secondaryWidthClass}>
        {renderSecondaryBody()}
      </SecondaryDrawerPanel>
    </div>
  );
}
