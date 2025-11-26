import { useProjectManager } from "@/src/hooks/use-project-manager";
import { BASE_URL_WR } from "@/src/util/api";
import Cookies from "js-cookie";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import BrokenLinksStatusBreakdownDemo from "./BrokenLinksTab/BreakdownByStatusCode";
import BrokenLinksSourceImpact from "./BrokenLinksTab/BrokenLinksSourceImpact";
import BrokenLinksSummarySection from "./BrokenLinksTab/BrokenLinksSummarySection";
import BrokenLinksTableSection from "./BrokenLinksTab/BrokenLinksTableSection";
import SmartSuggestionsSection from "./BrokenLinksTab/SmartSuggestionsSection";
import TabLoadingState from "./TabLoadingState";

export interface BrokenLinksSummaryBucket {
  code: string | number;
  label: string;
  count: number;
  percent: number | null;
}

export interface BrokenLinksTrendAuditItem {
  t: string; // ISO date string
  summary?: {
    total?: number;
    internal?: { count?: number; percent?: number | null };
    external?: { count?: number; percent?: number | null };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface BrokenLinksTrendPayload {
  last_audits?: BrokenLinksTrendAuditItem[];
  [key: string]: unknown;
}

export interface BrokenLinksTopPageItem {
  page_url?: string;              // NEW
  source_page?: string;           // keep for backward compatibility
  url?: string;                   // keep for backward compatibility
  broken_count?: number;          // NEW
  broken?: number;                // keep for backward compatibility
  internal?: number;
  external?: number;
  count?: number;                 // keep for older payloads
  share_percent?: number;         // NEW (optional, if you want later)
  [key: string]: unknown;
}

export interface BrokenLinksRow {
  id?: string | number;
  source_page?: string;
  source_url?: string;
  target_url?: string;
  anchor_text?: string;
  anchor_type?: string;
  link_type?: string;
  status_code?: string | number;
  last_checked?: string;
  priority_score?: number;
  [key: string]: unknown;
}

export interface BrokenLinksSourceImpactItem {
  source_page: string;
  broken: number;
  internal: number;
  external: number;
  c404?: number;
  c410?: number;
  timeout?: number;
  error?: number;
  s5xx?: number;
  severity?: string;
  last_crawled?: string;
  traffic_est?: number | null;
  [key: string]: unknown;
}

export interface BrokenLinksApiResponse {
  status?: boolean;
  message?: string;
  summary?: {
    total?: number;
    internal?: { count?: number; percent?: number | null };
    external?: { count?: number; percent?: number | null };
    updated_at?: string; // if backend ever sends it
    [key: string]: unknown;
  };
  status_breakdown?: {
    total?: number;
    buckets?: BrokenLinksSummaryBucket[];
    [key: string]: unknown;
  };
  trend?: BrokenLinksTrendPayload; // <<< important
  top_pages?: {
    min_count?: number;
    items?: BrokenLinksTopPageItem[];
    [key: string]: unknown;
  };
  rows?: BrokenLinksRow[];
  source_page_impact?: {
    items?: BrokenLinksSourceImpactItem[];
    thresholds?: { low?: string; moderate?: string; high?: string };
    [key: string]: unknown;
  };
  meta?: {
    trend_points?: number;
    latest_audit_at?: string; // <<< use as updatedAt fallback
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export type BrokenLinksDataContextValue = {
  data: BrokenLinksApiResponse | null;
  loading: boolean;
  error: string | null;
  refetch: (options?: { silent?: boolean }) => void;
};

const BrokenLinksDataContext = createContext<BrokenLinksDataContextValue | undefined>(undefined);

export const useBrokenLinksData = () => {
  const ctx = React.useContext(BrokenLinksDataContext);
  if (!ctx) {
    throw new Error("useBrokenLinksData must be used within BrokenLinksDataContext.Provider");
  }
  return ctx;
};

type BrokenLinksTabProps = {
  isActive?: boolean;
};

const BrokenLinksTab: React.FC<BrokenLinksTabProps> = ({ isActive = false }) => {
  const { selectedProject } = useProjectManager();
  const [data, setData] = useState<BrokenLinksApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedProjectId = useRef<string | null>(null);
  const authTokenValue = Cookies.get("login_access_token_wrank");

  const fetchData = useCallback(
    async (
      projectId: string,
      options: {
        force?: boolean;
        silent?: boolean;
      } = {},
    ) => {
      const { force = false, silent = false } = options;
      if (!authTokenValue) {
        setError("Authentication required. Please sign in again.");
        setData(null);
        return;
      }

      if (!force && lastFetchedProjectId.current === projectId) return;

      if (!silent) setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${BASE_URL_WR}broken-links/${projectId}/`, {
          headers: {
            Authorization: `Bearer ${authTokenValue}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load broken links (${response.status})`);
        }

        const payload = (await response.json()) as BrokenLinksApiResponse;
        setData(payload);
        lastFetchedProjectId.current = projectId;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load broken links.";
        setError(message);
        setData(null);
        lastFetchedProjectId.current = null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authTokenValue],
  );

  useEffect(() => {
    lastFetchedProjectId.current = null;
    setData(null);
    setError(null);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!isActive) return;
    const projectId = selectedProject?.id;
    if (!projectId) {
      setError("Select a project to view broken links.");
      setData(null);
      return;
    }
    if (!authTokenValue) {
      setError("Authentication required. Please sign in again.");
      setData(null);
      return;
    }
    fetchData(String(projectId));
  }, [authTokenValue, fetchData, isActive, selectedProject?.id]);

  const contextValue = useMemo<BrokenLinksDataContextValue>(() => {
    return {
      data,
      loading,
      error,
      refetch: (options) => {
        const projectId = selectedProject?.id;
        if (!projectId) {
          setError("Select a project to refresh data.");
          setData(null);
          return;
        }
        if (!authTokenValue) {
          setError("Authentication required. Please sign in again.");
          setData(null);
          return;
        }
        fetchData(String(projectId), { force: true, ...(options ?? {}) });
      },
    };
  }, [authTokenValue, data, error, fetchData, loading, selectedProject?.id]);

  return (
    <BrokenLinksDataContext.Provider value={contextValue}>
      {loading && !data ? (
        <TabLoadingState />
      ) : (
        <div className="space-y-4">
          <BrokenLinksSummarySection />
          <BrokenLinksTableSection />
          <BrokenLinksStatusBreakdownDemo />
          <BrokenLinksSourceImpact />
          {/* <SmartSuggestionsSection /> */}
        </div>
      )}
    </BrokenLinksDataContext.Provider>
  );
};

export default BrokenLinksTab;
