'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Cookies from 'js-cookie';

export type TrafficDateRange = { start: string; end: string };
export type TabKey = 'overview' | 'traffic' | 'landing' | 'conversions' | 'search';

type TrafficApiPayload = { project_id: number; start_date: string; end_date: string };

export type TrafficApiResponse = {
  status: boolean;
  message: string;
  tab: string;
  format: string;
  data?: {
    tab: string;
    description: string;
    charts: {
      sources: any[];
      devices: any[];
      scroll_depth_analysis: any[];
      scroll_summary: any;
      user_types: any;
      user_cards: any[];
      daily_metrics: any[];
      daily_metrics_device_session: any[];
    };
    landing_page_scroll_performance: any[];
    summary: any;
    filters_applied: any;
  };
  metadata?: any;
  project_id?: number;
  is_ga_connected?: boolean;
};

export function useTrafficEngagement(params: {
  activeTab: TabKey;
  projectId?: number;
  dateRange?: TrafficDateRange | null;
}) {
  const { activeTab, projectId, dateRange } = params;

  const [data, setData] = useState<TrafficApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canFetch = useMemo(
    () => activeTab === 'traffic' && !!projectId && !!dateRange?.start && !!dateRange?.end,
    [activeTab, projectId, dateRange?.start, dateRange?.end]
  );

  const fetchOnce = useCallback(async () => {
    if (!canFetch) return;

    const token = Cookies.get('login_access_token_wrank');
    if (!token) {
      setError('Authentication token missing. Please sign in again.');
      setData(null);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setLoading(true);
      setError(null);

      const body: TrafficApiPayload = {
        project_id: Number(projectId),
        start_date: dateRange!.start,
        end_date: dateRange!.end,
      };

      const res = await fetch('https://dashboard.wranker.com/api/traffic-engagement/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to fetch traffic engagement (${res.status}).`);
      }

      const json: TrafficApiResponse = await res.json();
      setData(json);
      setLastFetchedAt(Date.now());
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Failed to load traffic engagement.');
      setData(null);
    } finally {
      setLoading(false);
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, [canFetch, projectId, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    if (!canFetch) {
      if (activeTab !== 'traffic') {
        if (abortRef.current) abortRef.current.abort();
        setLoading(false);
      }
      return;
    }
    fetchOnce();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [canFetch, fetchOnce, activeTab]);

  const refetch = useCallback(() => {
    if (!canFetch) return;
    fetchOnce();
  }, [canFetch, fetchOnce]);

  const hasContent =
    !!data?.data?.charts &&
    (
      data.data.charts.sources?.length ||
      data.data.charts.devices?.length ||
      data.data.charts.daily_metrics?.length ||
      data.data.charts.daily_metrics_device_session?.length
    );

  return { data, loading, error, refetch, meta: { lastFetchedAt, hasContent } };
}
