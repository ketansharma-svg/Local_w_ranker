"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Info, ChevronDown, Globe, ShieldAlert } from "lucide-react";

/* --------------------------- Wranker design tokens --------------------------- */
const TOKENS = {
  border: "var(--wr-border, #E5E7EB)",
  borderLight: "var(--wr-borderLight, #EFF0F6)",
  text: "var(--wr-text, #111827)",
  muted: "var(--wr-muted, #6B7280)",
  brand: "var(--wr-brand, #008CCD)", // updated brand
  success: "var(--wr-success, #10B981)",
  warning: "var(--wr-warning, #F59E0B)",
  danger: "var(--wr-danger, #EF4444)",
  cool: "var(--wr-cool, #3B82F6)",
  appBg: "var(--wr-bg-subtle, #F5F7FA)",
  radius: "var(--wr-radius-lg, 16px)",
};

/* ---------------------------------- Types ----------------------------------- */
export type RefDomainRow = {
  id: string;
  domain: string;          // root domain
  wrScore: number;         // 0..100
  backlinks: number;       // total backlinks from this domain
  dofollow: number;        // count dofollow
  nofollow: number;        // count nofollow
  toxic?: boolean;         // risk flag
  dropped?: boolean;       // recent drop indicator (optional)
  faviconUrl?: string;     // optional custom favicon url
};

type Props = {
  title?: string;
  rows?: RefDomainRow[];
  maxRows?: number; // default 6
  className?: string;

  onViewAll?: () => void; // → Audit → Referring Domains tab
  onRowOpenDrawer?: (domain: string) => void; // row click
  onDomainClick?: (domain: string) => void; // domain text click
  onWrScoreClick?: (domain: string, score: number) => void; // WR score badge click
  onLinkTypeClick?: (domain: string, type: "dofollow" | "nofollow") => void; // chip click
};

/* ------------------------------- UI helpers --------------------------------- */
const wrColor = (score: number) => {
  // 81–100 green, 61–80 blue, 41–60 amber, 0–40 red
  if (score >= 81) return { bg: "rgba(16,185,129,0.12)", fg: "#047857", ring: "#10B981" };
  if (score >= 61) return { bg: "rgba(59,130,246,0.12)", fg: "#1D4ED8", ring: "#3B82F6" };
  if (score >= 41) return { bg: "rgba(245,158,11,0.14)", fg: "#92400E", ring: "#F59E0B" };
  return { bg: "rgba(239,68,68,0.12)", fg: "#991B1B", ring: "#EF4444" };
};

const fmt = (n: number) => n.toLocaleString();

/* Default sample (used only if no data is passed) */
const SAMPLE: RefDomainRow[] = [
  { id: "d1", domain: "newsdigest.com", wrScore: 78, backlinks: 32, dofollow: 25, nofollow: 7, toxic: false },
  { id: "d2", domain: "topseo123.info", wrScore: 41, backlinks: 18, dofollow: 10, nofollow: 8, toxic: true, dropped: true },
  { id: "d3", domain: "govresources.gov", wrScore: 91, backlinks: 6, dofollow: 6, nofollow: 0, toxic: false },
  { id: "d4", domain: "discountdeals.net", wrScore: 35, backlinks: 25, dofollow: 5, nofollow: 20, toxic: true },
  { id: "d5", domain: "bloghub.io", wrScore: 66, backlinks: 14, dofollow: 12, nofollow: 2, toxic: false },
  { id: "d6", domain: "designweekly.org", wrScore: 84, backlinks: 8, dofollow: 7, nofollow: 1, toxic: false },
];

/* ----------------------------- Domain favicon ------------------------------- */
const Favicon = ({ domain, src }: { domain: string; src?: string }) => {
  const url = src || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="mr-2 inline-block h-4 w-4 rounded"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
};

/* ------------------------- Modular chip (clickable) -------------------------- */
const Chip = ({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "gray";
}) => {
  const styles =
    tone === "blue"
      ? { bg: "rgba(0,140,205,0.10)", fg: TOKENS.brand, bd: "rgba(0,140,205,0.35)" }
      : { bg: "rgba(107,114,128,0.12)", fg: "#374151", bd: "rgba(156,163,175,0.35)" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[12px] font-medium shadow-sm"
      style={{ background: styles.bg, color: styles.fg, borderColor: styles.bd }}
    >
      {label}: <strong className="tabular-nums">{value}</strong>
    </span>
  );
};

/* ------------------------ Small circular WR gauge --------------------------- */
const MiniGauge = ({
  value,
  size = 16,
  stroke = 2,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;
  const brand = TOKENS.brand;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block"
      style={{ color: brand }}
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

/* ----------------------------- Main component ------------------------------- */
export default function ReferringDomainsPreviewTable({
  title = "Referring Domains (Preview)",
  rows = SAMPLE,
  maxRows = 6,
  className,

  onViewAll,
  onRowOpenDrawer,
  onDomainClick,
  onWrScoreClick,
  onLinkTypeClick,
}: Props) {
  // graceful fallbacks to keep this component drop-in and self-contained
  const noop = () => {};
  const _viewAll = onViewAll || noop;
  const _rowOpen = onRowOpenDrawer || ((d: string) => console.log("Open domain drawer:", d));
  const _domainClick = onDomainClick || ((d: string) => console.log("Open domain drawer + full view:", d));
  const _wrClick = onWrScoreClick || ((d: string, s: number) => console.log("Open WR Score breakdown:", d, s));
  const _linkType = onLinkTypeClick || ((d: string, t: "dofollow" | "nofollow") => console.log("Open Links tab:", d, t));

  const preview = rows.slice(0, Math.max(1, Math.min(maxRows, 7)));

  // header toggles (visual only; no data mutation)
  const [toxicOnly, setToxicOnly] = useState(false);
  const [droppedOnly, setDroppedOnly] = useState(false);

  return (
    <section
      className={className}
      style={{
        fontFamily:
          'Inter, Inter Fallback, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      <Card className="border h-full" style={{ borderColor: TOKENS.border, borderRadius: TOKENS.radius }}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {/* Branded section icon */}
            <Globe className="h-5 w-5" style={{ color: TOKENS.brand }} aria-hidden />
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle switches (brand styled) */}
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <Switch
                checked={toxicOnly}
                onCheckedChange={(v) => setToxicOnly(Boolean(v))}
                className="data-[state=checked]:bg-[#008CCD]"
              />
              Toxic only
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <Switch
                checked={droppedOnly}
                onCheckedChange={(v) => setDroppedOnly(Boolean(v))}
                className="data-[state=checked]:bg-[#008CCD]"
              />
              Dropped only
            </label>

            <Button
              variant="outline"
              size="sm"
              onClick={_viewAll}
              className="gap-2 cursor-pointer"
              title="Open full Referring Domains view"
            >
              <ExternalLink className="h-4 w-4" />
              View All Referring Domains
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-auto border-t" style={{ borderColor: TOKENS.borderLight }}>
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="w-[40%] min-w-[220px]">Domain</TableHead>
                  <TableHead className="min-w-[120px]">WR Score</TableHead>
                  <TableHead className="min-w-[120px]">
                    <div className="inline-flex items-center gap-1">
                      Ref. Backlinks
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>Includes all link types.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[200px]">Link Types</TableHead>
                  <TableHead className="min-w-[80px] text-center">Risk</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {preview.map((r) => {
                  const strong = r.wrScore >= 81;
                  const showRow =
                    (!toxicOnly || r.toxic) && (!droppedOnly || r.dropped); // visual filter only
                  if (!showRow) return null;

                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-[#F7FAFC]"
                      onClick={() => _rowOpen(r.domain)}
                    >
                      {/* Domain */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Use favicon for domains */}
                          <Favicon domain={r.domain} src={r.faviconUrl} />
                          <button
                            className="max-w-full truncate text-left font-medium underline cursor-pointer"
                            style={{ color: TOKENS.brand }}
                            onClick={(e) => {
                              e.stopPropagation();
                              _domainClick(r.domain);
                            }}
                            title={`Open ${r.domain}`}
                            aria-label={`Open ${r.domain}`}
                          >
                            {r.domain}
                          </button>

                          {/* Optional dropped indicator */}
                          {r.dropped && (
                            <span
                              className="inline-flex items-center gap-1 text-[12px] text-red-600"
                              title="Recent drop indicator"
                            >
                              <ChevronDown className="h-3.5 w-3.5" /> dropped
                            </span>
                          )}

                          {/* Optional strong badge */}
                          {strong && (
                            <span
                              className="ml-1 inline-flex items-center rounded-full px-2 py-[1px] text-[11px] font-medium"
                              style={{
                                background: "rgba(16,185,129,0.10)",
                                color: "#047857",
                                border: "1px solid rgba(16,185,129,0.25)",
                              }}
                              title="WR > 80 – strong domain"
                            >
                              Strong
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* WR Score (small circular gauge + value, brand only) */}
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            _wrClick(r.domain, r.wrScore);
                          }}
                          className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 cursor-pointer"
                          title="Open WR Score Breakdown"
                          aria-label={`Open WR Score breakdown for ${r.domain}`}
                        >
                          <MiniGauge value={r.wrScore} />
                          <span className="text-sm font-semibold tabular-nums" style={{ color: TOKENS.brand }}>
                            {Math.max(0, Math.min(100, r.wrScore))}
                          </span>
                        </button>
                      </TableCell>

                      {/* Ref. Backlinks */}
                      <TableCell className="tabular-nums">{fmt(r.backlinks)}</TableCell>

                      {/* Link Types */}
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="hover:opacity-90 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              _linkType(r.domain, "dofollow");
                            }}
                            title="Open dofollow links from this domain"
                            aria-label={`Open dofollow links from ${r.domain}`}
                          >
                            <Chip label="Dofollow" value={r.dofollow} tone="blue" />
                          </button>
                          <button
                            className="hover:opacity-90 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              _linkType(r.domain, "nofollow");
                            }}
                            title="Open nofollow links from this domain"
                            aria-label={`Open nofollow links from ${r.domain}`}
                          >
                            <Chip label="Nofollow" value={r.nofollow} tone="gray" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Risk / Toxic flag (no emoji) */}
                      <TableCell className="text-center">
                        {r.toxic ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-[2px] text-[12px] font-semibold"
                                  style={{
                                    background: "rgba(239,68,68,0.10)",
                                    color: "#991B1B",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                  }}
                                >
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  Toxic
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>This domain has toxic patterns.</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer CTA (preview → full view) */}
          <div
            className="flex items-center justify-end gap-2 border-t p-3"
            style={{ borderColor: TOKENS.borderLight, background: "#fff" }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={_viewAll}
              className="gap-2 cursor-pointer"
              title="Go to Audit → Referring Domains"
            >
              <ExternalLink className="h-4 w-4" />
              View All Referring Domains
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile stacked guidance (kept minimal; table remains scrollable) */}
      <div className="mt-2 hidden text-xs text-muted-foreground sm:block" />
    </section>
  );
}
