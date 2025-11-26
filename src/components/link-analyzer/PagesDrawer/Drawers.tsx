"use client";
import React, { useMemo } from "react";
import PageInterlinkingDrawer from "./PageInterlinkingDrawer";
import OutlinkTargetsTable__Section from "./OutlinkTargetsTable__Section";
import OptimizationOpportunitiesSection from "./OptimizationOpportunitiesSection";
export type PageDrawerOutlink = {
  id?: string | number;
  target_url?: string | null;
  target_path?: string | null;
  anchor_text?: string | null;
  anchor_type?: string | null;
  rel?: string | null;
  target_pils?: number | null;
  target_status?: string | null;
  redirect?: string | null;
  last_verified?: string | null;
  instances?: number | null;
  // Legacy camelCase props (client-side normalized rows, kept for safety)
  targetUrl?: string | null;
  targetPath?: string | null;
  anchorText?: string | null;
  anchorType?: string | null;
  targetPils?: number | null;
  targetStatus?: string | null;
  redirectChainDepth?: number | null;
  lastVerified?: string | null;
};
export type PageDrawerData = {
  id?: string | number;
  url?: string | null;
  inlinks?: number | null;
  outlinks?: number | null;
  pils?: number | null;
  aqs?: number | null;
  status?: string | null;
  depth?: number | null;
  page_type?: string | null;
  pageType?: string | null;
  outlinks_details?: PageDrawerOutlink[] | null;
  outlinksDetails?: PageDrawerOutlink[] | null;
};
type Props = {
  data?: PageDrawerData | null;
  onClose?: () => void;
};
const NORMALIZED_TARGET_STATUSES = new Set(["healthy", "redirect", "broken", "orphan"]);
const toNumber = (value: unknown, fallback = 0) => {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
const ensureString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
};
const normalizeAnchorType = (raw: unknown): "exact" | "partial" | "branded" | "generic" => {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  if (value === "phrase" || value === "partial") return "partial";
  if (value === "image" || value === "generic") return "generic";
  if (value === "exact" || value === "branded") return value;
  return "generic";
};
const normalizeTargetStatus = (raw: unknown): "healthy" | "redirect" | "broken" | "orphan" => {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  return (NORMALIZED_TARGET_STATUSES.has(value) ? value : "healthy") as
    | "healthy"
    | "redirect"
    | "broken"
    | "orphan";
};
const extractOutlinks = (data?: PageDrawerData | null): PageDrawerOutlink[] => {
  if (!data) return [];
  const snake = Array.isArray(data.outlinks_details) ? data.outlinks_details : null;
  if (snake && snake.length) return snake;
  const camel = Array.isArray(data.outlinksDetails) ? data.outlinksDetails : null;
  if (camel && camel.length) return camel;
  return [];
};
export default function Drawers({ data, onClose }: Props) {
  const drawerData = data ?? null;
  const outlinkRows = useMemo(() => {
    const details = extractOutlinks(drawerData);
    return details.map((detail, index) => {
      const targetUrl =
        ensureString(detail.target_url, detail.targetUrl)?.toString() ?? "-";
      const targetPath =
        ensureString(detail.target_path, detail.targetPath)?.toString() ?? targetUrl;
      const anchorText =
        ensureString(detail.anchor_text, detail.anchorText)?.toString() ?? "No Text";
      const lastVerified =
        ensureString(detail.last_verified, detail.lastVerified)?.toString() ?? "";
      const targetPils = Math.max(
        0,
        Math.round(toNumber(detail.target_pils ?? detail.targetPils, 0)),
      );
      const redirectValue = detail.redirect ?? null;
      const redirectChainDepth =
        Math.max(0, Math.round(toNumber(detail.redirectChainDepth, 0))) ||
        (redirectValue ? 1 : 0);
      return {
        id: detail.id != null ? String(detail.id) : `t-${index + 1}`,
        targetUrl,
        targetTitle: targetPath,
        anchor: anchorText,
        anchorType: normalizeAnchorType(detail.anchor_type ?? detail.anchorType),
        targetPils,
        targetStatus: normalizeTargetStatus(detail.target_status ?? detail.targetStatus),
        redirectChainDepth,
        lastVerified,
        instances: Math.max(1, Math.round(toNumber(detail.instances, 1))),
      };
    });
  }, [drawerData]);
  const metrics = useMemo(
    () => ({
      url: ensureString(drawerData?.url)?.toString(),
      pils: toNumber(drawerData?.pils, 0),
      aqs: toNumber(drawerData?.aqs, 0),
      inlinks: toNumber(drawerData?.inlinks, 0),
      outlinks: toNumber(drawerData?.outlinks, 0),
    }),
    [drawerData],
  );
  if (!drawerData) return null;
  return (
    <div className="flex flex-col bg-white">
      <PageInterlinkingDrawer
        pageUrl={metrics.url}
        pils={metrics.pils}
        aqs={metrics.aqs}
        inlinks={metrics.inlinks}
        outlinks={metrics.outlinks}
        loading={false}
        onClose={onClose}
      />
      <OutlinkTargetsTable__Section rowsFromApi={outlinkRows} />
      <div className="px-4 pb-5">
        {/* <OptimizationOpportunitiesSection pageId={metrics.url} /> */}
      </div>
    </div>
  );
}