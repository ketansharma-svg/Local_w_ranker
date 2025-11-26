import * as React from "react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */

type LinkType = "Guest Post" | "Link Insertion" | "PR" | string;

export type LinkOpportunityHeaderProps = {
  /** Domain without protocol, e.g., "techinsiderhub.com" */
  domain: string;
  /** Favicon URL (optional) */
  faviconUrl?: string | null;
  /** Vefogix listing URL for Buy Now (optional) */
  listingUrl?: string | null;

  /** Quick-fact values (all optional, rendered with graceful fallbacks) */
  priceUsd?: number | null;
  priceBandAvgUsd?: number | null;
  wrBandLabel?: string | null; // e.g., "WR 80–89"
  deliveryDays?: number | null;
  spamScore?: number | null;
  linkType?: LinkType | null;
  bestValue?: boolean | null;

  /** Actions */
  onExport?: () => void;
  onSaveToggle?: (next: boolean) => void;

  /** Controlled saved state (optional). If omitted we manage local state. */
  saved?: boolean;

  /** Class passthrough */
  className?: string;
};

/* ─────────────────────────────────────────────────────────────
   Header — UPDATED to match screenshot
   - Adds breadcrumb row (brand chain-link icon, chevrons)
   - Uses Inter / Inter Fallback fonts
   - Branded (#008CCD) icons
   - Clickables use pointer cursor
   - Export is an outlined text button (icon + label)
   - Chips order: Link Type → Price → Delivery → Spam
───────────────────────────────────────────────────────────── */

export const LinkOpportunityHeader: React.FC<LinkOpportunityHeaderProps> = ({
  domain,
  faviconUrl,
  listingUrl,

  priceUsd = null,
  priceBandAvgUsd = null,
  wrBandLabel = null,
  deliveryDays = null,
  spamScore = null,
  linkType = null,
  bestValue = null,

  onExport,
  onSaveToggle,
  saved,

  className = "",
}) => {
  /* Inter + tokens (local to header) */
  const InterTokens = () => (
    <style>
      {`
        .wr-font{
          font-family: Inter, Inter Fallback, "Inter var", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", sans-serif;
        }
      `}
    </style>
  );

  const [isSaved, setIsSaved] = React.useState<boolean>(!!saved);
  React.useEffect(() => {
    if (typeof saved === "boolean") setIsSaved(saved);
  }, [saved]);

  const handleToggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    onSaveToggle?.(next);
  };

  const openListing = () => {
    if (!listingUrl) return;
    window.open(listingUrl, "_blank", "noopener,noreferrer");
  };

  const normDomain = React.useMemo(() => {
    if (!domain) return "";
    return domain.replace(/^https?:\/\//i, "").replace(/\/+$/, "").trim();
  }, [domain]);

  const formatMoney = (n: number | null | undefined) =>
    typeof n === "number" && isFinite(n)
      ? n.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        })
      : "—";

  const speedLabel = (d: number | null | undefined) => {
    if (typeof d !== "number" || !isFinite(d))
      return { text: "—", tone: "muted" as const };
    if (d <= 3) return { text: "Fast", tone: "success" as const };
    if (d <= 10) return { text: "Standard", tone: "warn" as const };
    return { text: "Slow", tone: "danger" as const };
  };

  const spamTone = (s: number | null | undefined) => {
    if (typeof s !== "number" || !isFinite(s))
      return { text: "—", tone: "muted" as const };
    if (s <= 20) return { text: "Low", tone: "success" as const };
    if (s <= 40) return { text: "Medium", tone: "warn" as const };
    return { text: "High", tone: "danger" as const };
  };

  const toneClasses = (tone: "success" | "warn" | "danger" | "muted") => {
    switch (tone) {
      case "success":
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
      case "warn":
        return "bg-amber-50 text-amber-700 ring-amber-200";
      case "danger":
        return "bg-rose-50 text-rose-700 ring-rose-200";
      default:
        return "bg-slate-50 text-slate-700 ring-slate-200";
    }
  };

  const linkTypeTone = (lt: LinkType | null) => {
    if (!lt)
      return "bg-slate-50 text-slate-700 ring-slate-200";
    if (/guest\s*post/i.test(String(lt)))
      return "bg-blue-50 text-blue-700 ring-blue-200";
    if (/link\s*insertion/i.test(String(lt)))
      return "bg-orange-50 text-orange-700 ring-orange-200";
    if (/pr/i.test(String(lt)))
      return "bg-violet-50 text-violet-700 ring-violet-200";
    return "bg-slate-50 text-slate-700 ring-slate-200";
  };

  const Chip: React.FC<{
    toneClass: string;
    ariaLabel: string;
    children: React.ReactNode;
  }> = ({ toneClass, ariaLabel, children }) => (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm ring-1 ${toneClass}`}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );

  const DeliveryChip = () => {
    const s = speedLabel(deliveryDays);
    return (
      <Tooltip content="Estimated time from order confirmation to content publication.">
        <Chip toneClass={toneClasses(s.tone)} ariaLabel="Delivery time">
          <IconClock className="h-4 w-4 text-[#008CCD]" />
          <span className="font-semibold">
            {typeof deliveryDays === "number" ? `${deliveryDays} days` : "—"}
          </span>
          {s.text !== "—" && <span className="mx-1">·</span>}
          {s.text !== "—" && (
            <span className="text-[13px]">{s.text}</span>
          )}
        </Chip>
      </Tooltip>
    );
  };

  const SpamChip = () => {
    const t = spamTone(spamScore);
    return (
      <Tooltip content="Calculated by Wranker’s backlink risk model. Lower = safer.">
        <Chip toneClass={toneClasses(t.tone)} ariaLabel="Spam score">
          <IconShield className="h-4 w-4 text-[#008CCD]" />
          <span className="font-semibold">
            {typeof spamScore === "number" ? `Spam ${spamScore}` : "Spam —"}
          </span>
          {t.text !== "—" && <span className="mx-1">·</span>}
          {t.text !== "—" && <span className="text-[13px]">{t.text}</span>}
        </Chip>
      </Tooltip>
    );
  };

  const PriceChip = () => {
    const price = formatMoney(priceUsd);
    const hasSmart = typeof priceBandAvgUsd === "number" && !!wrBandLabel;
    const smart = hasSmart
      ? `Price vs. WR band average\nBand: ${wrBandLabel}\nMedian: ${formatMoney(
          priceBandAvgUsd!
        )}`
      : "Listing price from Vefogix marketplace.";
    return (
      <Tooltip content={smart}>
        <Chip
          toneClass={toneClasses(bestValue ? "success" : "muted")}
          ariaLabel="Price"
        >
          <IconPriceTag className="h-4 w-4 text-[#008CCD]" />
          <span className="font-semibold">{price}</span>
          {bestValue ? <span className="sr-only">Best Value</span> : null}
        </Chip>
      </Tooltip>
    );
  };

  const LinkTypeChip = () => (
    <Tooltip content="Listing type in Vefogix marketplace.">
      <Chip toneClass={linkTypeTone(linkType)} ariaLabel="Link type">
        <IconTag className="h-4 w-4 text-[#008CCD]" />
        <span className="font-semibold">{linkType ?? "—"}</span>
      </Chip>
    </Tooltip>
  );

  return (
    <header
      className={`wr-font sticky z-50 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 ${className}`}
    >
      <InterTokens />
      <div className="mx-auto w-full px-4 py-3 md:py-4">
        {/* Breadcrumb row (as in screenshot) */}
        <div className="mb-2 flex items-center text-[12px] text-slate-600">
          <IconLinkAlt className="mr-2 h-4 w-4 text-[#008CCD]" />
          <a href="#" className="cursor-pointer hover:underline">
            Backlink Insights
          </a>
          <IconChevronRight className="mx-1 h-4 w-4 text-slate-300" />
          <a href="#" className="cursor-pointer hover:underline">
            Opportunities
          </a>
          <IconChevronRight className="mx-1 h-4 w-4 text-slate-300" />
          <span className="font-medium text-slate-800">
            Opportunity Domain Details
          </span>
        </div>

        {/* Desktop layout */}
        <div className="hidden items-center justify-between gap-3 md:flex">
          {/* Left: domain identity */}
          <div className="min-w-0 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faviconUrl} alt="" className="h-6 w-6" />
              ) : (
                <IconGlobe className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <a
              href={normDomain ? `https://${normDomain}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[320px] truncate font-semibold text-slate-900 hover:underline cursor-pointer"
              title={normDomain}
            >
              {normDomain || "—"}
            </a>
            {normDomain && (
              <IconExternal className="h-4 w-4 text-slate-400" aria-hidden />
            )}
          </div>

          {/* Middle: quick-fact chips (ORDERED to match screenshot) */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <LinkTypeChip />
            <PriceChip />
            <DeliveryChip />
            <SpamChip />
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              title="Export"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <IconDownload className="h-5 w-5 text-[#008CCD]" />
              Export
            </button>

            <button
              type="button"
              onClick={openListing}
              disabled={!listingUrl}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[#008CCD] px-4 text-sm font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              aria-disabled={!listingUrl}
              title={
                listingUrl
                  ? "Buy on Vefogix (opens in new tab)"
                  : "Listing unavailable"
              }
            >
              <IconCart className="mr-2 h-5 w-5" />
              Buy Now
            </button>

            <IconButton
              label={isSaved ? "Remove from Favorites" : "Save to Favorites"}
              onClick={handleToggleSave}
              tooltip={isSaved ? "Remove from favorites" : "Save to favorites"}
              pressed={isSaved}
            >
              {isSaved ? (
                <IconHeartSolid className="h-5 w-5 text-rose-500" />
              ) : (
                <IconHeart className="h-5 w-5" />
              )}
            </IconButton>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* Row 1: Domain */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faviconUrl} alt="" className="h-6 w-6" />
              ) : (
                <IconGlobe className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <a
              href={normDomain ? `https://${normDomain}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[70%] truncate font-semibold text-slate-900 hover:underline cursor-pointer"
              title={normDomain}
            >
              {normDomain || "—"}
            </a>
            {normDomain && (
              <IconExternal className="h-4 w-4 text-slate-400" aria-hidden />
            )}
          </div>

          {/* Row 2: chips (scrollable) */}
          <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <LinkTypeChip />
            <PriceChip />
            <DeliveryChip />
            <SpamChip />
          </div>

          {/* Row 3: actions (Buy full width) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExport}
              title="Export"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <IconDownload className="h-5 w-5 text-[#008CCD]" />
              Export
            </button>

            <button
              type="button"
              onClick={openListing}
              disabled={!listingUrl}
              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-md bg-[#008CCD] px-4 text-sm font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              aria-disabled={!listingUrl}
              title={
                listingUrl
                  ? "Buy on Vefogix (opens in new tab)"
                  : "Listing unavailable"
              }
            >
              <IconCart className="mr-2 h-5 w-5" />
              Buy Now
            </button>

            <IconButton
              label={isSaved ? "Remove from Favorites" : "Save to Favorites"}
              onClick={handleToggleSave}
              tooltip={isSaved ? "Remove from favorites" : "Save to favorites"}
              pressed={isSaved}
            >
              {isSaved ? (
                <IconHeartSolid className="h-5 w-5 text-rose-500" />
              ) : (
                <IconHeart className="h-5 w-5" />
              )}
            </IconButton>
          </div>
        </div>
      </div>
    </header>
  );
};

/* ---------- Helpers: Tooltip & IconButton ---------- */

const IconButton: React.FC<{
  label: string;
  tooltip?: string;
  onClick?: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}> = ({ label, tooltip, onClick, pressed, children }) => (
  <Tooltip content={tooltip || label}>
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      title={tooltip || label}
    >
      {children}
    </button>
  </Tooltip>
);

const Tooltip: React.FC<{
  content?: React.ReactNode;
  children: React.ReactNode;
}> = ({ content, children }) => (
  <div className="group relative inline-flex">
    {children}
    {content ? (
      <div className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-50 hidden -translate-x-1/2 group-hover:block">
        <div className="max-w-xs whitespace-pre-line rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
          {content}
        </div>
      </div>
    ) : null}
  </div>
);

/* ---------- Minimal inline SVG icons (no external deps) ---------- */

const IconLinkAlt = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11 5"
    />
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07L13 19"
    />
  </svg>
);
const IconChevronRight = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
    <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
  </svg>
);
const IconExternal = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 3h7v7M10 14L21 3M21 10v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10"
    />
  </svg>
);
const IconGlobe = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <circle cx="12" cy="12" r="9" strokeWidth="2" />
    <path strokeWidth="2" d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </svg>
);
const IconClock = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <circle cx="12" cy="12" r="9" strokeWidth="2" />
    <path strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 3" />
  </svg>
);
const IconShield = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M12 3l7 4v5a9 9 0 0 1-7 9 9 9 0 0 1-7-9V7l7-4z" />
  </svg>
);
const IconTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path
      strokeWidth="2"
      d="M20.59 13.41L11 3H3v8l9.59 9.59a2 2 0 0 0 2.82 0l5.18-5.18a2 2 0 0 0 0-2.82z"
    />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
const IconPriceTag = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M3 7l7-4 11 6v6l-7 4L3 13V7z" />
    <path strokeWidth="2" d="M14 7l-5 3 5 3 5-3-5-3z" />
  </svg>
);
const IconCart = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M3 3h2l1 5h13l-1.2 6H7.2M10 21a1 1 0 1 0 0-2m8 2a1 1 0 1 0 0-2" />
  </svg>
);
const IconHeart = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path
      strokeWidth="2"
      d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z"
    />
  </svg>
);
const IconHeartSolid = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
const IconDownload = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
    <path strokeWidth="2" d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   Minimal Demo (optional)
   - Remove in production if you mount the header inside your app
───────────────────────────────────────────────────────────── */

const Demo: React.FC = () => {
  const [saved, setSaved] = React.useState(false);
  return (
    // <div className="min-h-screen bg-[#F5F7FA] p-4 text-slate-900">
    //   <div className="mx-auto max-w-[1280px] rounded-xl border border-slate-200 bg-white shadow-sm">
    //     <LinkOpportunityHeader
    //       domain="techinsiderhub.com"
    //       faviconUrl="https://www.google.com/s2/favicons?sz=64&domain=techinsiderhub.com"
    //       listingUrl="https://vefogix.com/listing/sample-opportunity"
    //       priceUsd={149}
    //       priceBandAvgUsd={210}
    //       wrBandLabel="WR 70–79"
    //       deliveryDays={5}
    //       spamScore={18}
    //       linkType="Guest Post"
    //       bestValue
    //       onExport={() => alert("Export clicked")}
    //       saved={saved}
    //       onSaveToggle={setSaved}
    //     />
    //     <div className="p-6">
    //       <p className="text-sm text-slate-600">
    //         Body content goes here… scroll to confirm the header remains sticky.
    //       </p>
    //       <div className="h-[800px]" />
    //     </div>
    //   </div>
    // </div>
     <LinkOpportunityHeader
          domain="techinsiderhub.com"
          faviconUrl="https://www.google.com/s2/favicons?sz=64&domain=techinsiderhub.com"
          listingUrl="https://vefogix.com/listing/sample-opportunity"
          priceUsd={149}
          priceBandAvgUsd={210}
          wrBandLabel="WR 70–79"
          deliveryDays={5}
          spamScore={18}
          linkType="Guest Post"
          bestValue
          onExport={() => alert("Export clicked")}
          saved={saved}
          onSaveToggle={setSaved}
        />
  );
};

export default Demo;
