'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';
const token = Cookies.get('login_access_token_wrank');
/**
 * Hook: useLandingPages
 * Purpose:
 *  - Fetch Landing Pages list (paged)
 *  - (Integrated) Fetch Scroll-Depth per page (2 API calls, pages 1..N)
 *  - Only runs when `activeTab === 'landing'`
 *
 * Consumer example:
 * const {
 *   data: landingData,
 *   loading: landingLoading,
 *   error: landingError,
 *   refetch: refetchLanding,
 *   meta: { lastFetchedAt: landingLastFetched, hasContent: landingHasContent },
 *   scroll: { rows: scrollRows, loading: scrollLoading, error: scrollError, hasFullBuckets }
 * } = useLandingPages({ activeTab, projectId, dateRange, page: 1, pagesToLoad: 1 });
 */

type AnalyticsTabKey = 'overview' | 'traffic' | 'landing' | 'conversions' | 'search';
export type LandingDateRange = { start: string; end: string };

type LandingApiPayload = {
  project_id: number;
  start_date: string;
  end_date: string;
  page: number;
};

type LandingPayload = Record<string, any>;
type LandingApiResponse = {
  status: boolean;
  message?: string;
  data?: {
    rows?: LandingPayload[];
    total_records?: number;
    page?: number;
    page_size?: number;
  } | any;
  error?: string;
};

// ---------------- Scroll-Depth types (integrated) ----------------
type RawScrollRow = {
  page_path: string;
  scroll_bucket: number | string;  // 0,25,50,75,100 or GA4 90 meaning ~100
  avg_engagement_seconds?: number;
  reach_pct?: number;   // preferred
  percentage?: number;  // fallback
  pct?: number;         // fallback
  sessions?: number;    // optional
};

type ScrollApiResponse = {
  status: boolean;
  message?: string;
  details?: {
    insight_type?: string;
    data?: RawScrollRow[];
  };
  data?: RawScrollRow[]; // some variants
  error?: string;
};

type ScrollRow = {
  page_path: string;
  p0?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p100?: number;
  avg_engagement_seconds?: number;
  sessions?: number;
};

type ScrollPagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

type UseLandingPagesArgs = {
  activeTab: AnalyticsTabKey;
  projectId?: number;
  dateRange?: LandingDateRange;
  page?: number;
  apiUrl?: string;              // default: https://dashboard.wranker.com/api/landing-pages/
  pagesToLoad?: number;         // for scroll-depth; default 1
  domain?: string | null;       // optional domain hint
  sessionsLookup?: Record<string, number> | null; // optional enrichment by page_path
  scrollPage?: number;
};

type Meta = {
  lastFetchedAt: number | null;
  hasContent: boolean;
};

type UseLandingPagesReturn = {
  data: LandingPayload | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  meta: Meta;
  // integrated scroll-depth
  scroll: {
    rows: ScrollRow[];
    loading: boolean;
    error: string | null;
    hasFullBuckets: boolean;
    domain: string | null;
    pagination: ScrollPagination | null;
  };
};

const DEFAULT_API = 'https://dashboard.wranker.com/api/landing-pages/';

// ---------------- helpers ----------------
const getAuth = (): Record<string, string> => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toNumber = (value: unknown): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

function normalizeBucket(b: number | string): 0 | 25 | 50 | 75 | 100 | null {
  if (b === null || b === undefined) return null;
  const n = typeof b === 'string' ? Number(b) : b;
  if (Number.isNaN(n)) return null;
  if (n >= 95) return 100; // GA4 oddity (90/95 mapped to 100)
  const allowed = [0, 25, 50, 75, 100];
  return (allowed.includes(n as any) ? (n as any) : null);
}
function pickPct(row: RawScrollRow): number | null {
  if (typeof row.reach_pct === 'number') return row.reach_pct;
  if (typeof row.percentage === 'number') return row.percentage;
  if (typeof row.pct === 'number') return row.pct;
  return null;
}

// group incoming rows by page_path and fold buckets
function foldScrollRows(raw: RawScrollRow[], sessionsLookup?: Record<string, number> | null): ScrollRow[] {
  const map = new Map<string, ScrollRow>();

  for (const r of raw || []) {
    const key = r.page_path || "/";
    const bucket = normalizeBucket(r.scroll_bucket);
    const pct = pickPct(r);

    const curr = map.get(key) || { page_path: key };
    if (bucket != null && typeof pct === 'number') {
      if (bucket === 0) curr.p0 = pct;
      if (bucket === 25) curr.p25 = pct;
      if (bucket === 50) curr.p50 = pct;
      if (bucket === 75) curr.p75 = pct;
      if (bucket === 100) curr.p100 = pct;
    }
    if (typeof r.avg_engagement_seconds === 'number') {
      curr.avg_engagement_seconds = r.avg_engagement_seconds;
    }
    if (typeof r.sessions === 'number') {
      curr.sessions = r.sessions;
    }
    map.set(key, curr);
  }

  // apply sessions enrichment if provided
  if (sessionsLookup) {
    for (const [k, v] of Object.entries(sessionsLookup)) {
      const curr = map.get(k);
      if (curr) curr.sessions = curr.sessions ?? v;
    }
  }

  return Array.from(map.values());
}

// ---------------- main hook ----------------
export function useLandingPages({
  activeTab,
  projectId,
  dateRange,
  page = 1,
  apiUrl = DEFAULT_API,
  pagesToLoad = 1,
  domain = null,
  sessionsLookup = null,
  scrollPage = 1,
}: UseLandingPagesArgs): UseLandingPagesReturn {
  const [data, setData] = useState<LandingPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const hasContent = useMemo(() => {
    if (!data) return false;
    const pages = Array.isArray((data as any)?.pages) ? (data as any).pages : [];
    const hcls = Array.isArray((data as any)?.high_clicks_low_sessions)
      ? (data as any).high_clicks_low_sessions
      : [];
    return pages.length > 0 || hcls.length > 0;
  }, [data]);

  // scroll-depth
  const [scrollRows, setScrollRows] = useState<ScrollRow[]>([]);
  const [scrollLoading, setScrollLoading] = useState<boolean>(false);
  const [scrollError, setScrollError] = useState<string | null>(null);
  const [scrollPagination, setScrollPagination] = useState<ScrollPagination | null>(null);
  const resolvedDomain = domain || null;

  const isActive = activeTab === 'landing';
  const canRun = isActive && !!projectId && !!dateRange?.start && !!dateRange?.end;

  const controllerRef = useRef<AbortController | null>(null);
  const scrollControllerRef = useRef<AbortController | null>(null);

  const runLandingFetch = useCallback(async () => {
    if (!canRun) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    const body: LandingApiPayload = {
      project_id: projectId!,
      start_date: dateRange!.start,
      end_date: dateRange!.end,
      page,
    };

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuth(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LandingApiResponse = await res.json();

      if (!json?.status) {
        throw new Error(json?.error || json?.message || 'Unknown API error');
      }
      const payloadRaw = json?.data ?? {};
      const payload: LandingPayload = (payloadRaw && typeof payloadRaw === 'object' && !Array.isArray(payloadRaw))
        ? (payloadRaw as LandingPayload)
        : { pages: Array.isArray(payloadRaw) ? payloadRaw : [] };
      setData(payload);

      setLastFetchedAt(Date.now());
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Failed to fetch landing pages');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, canRun, dateRange?.start, dateRange?.end, page, projectId]);

  const runScrollDepthFetch = useCallback(async () => {
    if (!canRun) return;
    scrollControllerRef.current?.abort();
    const controller = new AbortController();
    scrollControllerRef.current = controller;

    setScrollLoading(true);
    setScrollError(null);

    try {
      const startPage = Math.max(1, scrollPage);
      const totalPagesToFetch = Math.max(1, pagesToLoad);
      const pageNumbers = Array.from({ length: totalPagesToFetch }, (_, idx) => startPage + idx);

      const responses = await Promise.all(
        pageNumbers.map((pageNumber) => {
          const payload = {
            project_id: projectId!,
            start_date: dateRange!.start,
            end_date: dateRange!.end,
            page: pageNumber,
            insight_type: 'scroll_depth',
            ...(resolvedDomain ? { domain: resolvedDomain } : {}),
          };
          return fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuth(),
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
        })
      );

      const allRaw: RawScrollRow[] = [];
      let meta: ScrollPagination | null = null;

      for (const response of responses) {
        if (!response.ok) throw new Error(`Scroll depth HTTP ${response.status}`);
        const json: ScrollApiResponse = await response.json();

        const dataSection = (json as any)?.data;
        if (!meta && dataSection && typeof dataSection === 'object' && !Array.isArray(dataSection)) {
          const totalRecords =
            toNumber((dataSection as any)?.total_records) ??
            toNumber((dataSection as any)?.totalRecords) ??
            0;
          const pageSize =
            toNumber((dataSection as any)?.page_size) ??
            toNumber((dataSection as any)?.pageSize);
          const currentPageVal =
            toNumber((dataSection as any)?.current_page) ??
            toNumber((dataSection as any)?.currentPage) ??
            startPage;
          const totalPages =
            toNumber((dataSection as any)?.total_pages) ??
            toNumber((dataSection as any)?.totalPages) ??
            (pageSize ? Math.ceil((totalRecords || 0) / pageSize) : pageNumbers.length);

          meta = {
            totalRecords: Math.max(0, totalRecords ?? 0),
            totalPages: Math.max(1, totalPages || 1),
            currentPage: Math.max(1, currentPageVal || startPage),
            pageSize: Math.max(1, pageSize ?? 1),
          };
        }

        // API may return data under details.data or data
        const rowsCandidate =
          Array.isArray((json as any)?.data?.rows)
            ? (json as any).data.rows
            : Array.isArray(json.details?.data)
              ? json.details.data
              : Array.isArray(json.data)
                ? json.data
                : [];
        if (Array.isArray(rowsCandidate)) {
          allRaw.push(...(rowsCandidate as RawScrollRow[]));
        }
      }

      const folded = foldScrollRows(allRaw, sessionsLookup);
      setScrollRows(folded);
      if (meta) {
        const fallbackSize = meta.pageSize || (folded.length > 0 ? folded.length : 1);
        setScrollPagination({
          totalRecords: Math.max(0, meta.totalRecords),
          totalPages: Math.max(1, meta.totalPages),
          currentPage: Math.max(1, meta.currentPage),
          pageSize: Math.max(1, fallbackSize),
        });
      } else {
        const fallbackSize = folded.length || 1;
        setScrollPagination({
          totalRecords: folded.length,
          totalPages: Math.max(1, Math.ceil((folded.length || 1) / fallbackSize)),
          currentPage: Math.max(1, startPage),
          pageSize: Math.max(1, fallbackSize),
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setScrollError(err?.message || 'Failed to fetch scroll-depth');
      setScrollRows([]);
      setScrollPagination(null);
    } finally {
      setScrollLoading(false);
    }
  }, [apiUrl, canRun, dateRange?.start, dateRange?.end, pagesToLoad, projectId, resolvedDomain, sessionsLookup, scrollPage]);

  // Single effect that runs both fetches when the tab becomes active (and inputs change)
  useEffect(() => {
    if (!canRun) return;
    runLandingFetch();
    runScrollDepthFetch();
    return () => {
      controllerRef.current?.abort();
      scrollControllerRef.current?.abort();
    };
  }, [canRun, runLandingFetch, runScrollDepthFetch]);

  const hasFullBuckets = useMemo(
    () => scrollRows.some(r => r.p25 != null && r.p50 != null && r.p75 != null && r.p100 != null),
    [scrollRows]
  );

  const refetch = useCallback(() => {
    if (!canRun) return;
    runLandingFetch();
    runScrollDepthFetch();
  }, [canRun, runLandingFetch, runScrollDepthFetch]);

  return {
    data,
    loading,
    error,
    refetch,
    meta: { lastFetchedAt, hasContent },
    scroll: {
      rows: scrollRows,
      loading: scrollLoading,
      error: scrollError,
      hasFullBuckets,
      domain: resolvedDomain,
      pagination: scrollPagination,
    },
  };
}








