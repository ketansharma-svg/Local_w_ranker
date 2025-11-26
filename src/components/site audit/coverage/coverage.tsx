"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { toast } from "sonner";
import GscIntegrationPanel from "@/src/components/link-analyzer/gsc/GscIntegrationPanel";

// === Your app imports (paths unchanged) ===
import { BASE_URL_WR } from "@/src/util/api";
import { useProjectManager } from "/src/hooks/use-project-manager";
import CoverageSummary from "./coverageSummary";
import CoverageBreakdown from "./coverageBreakdown";
import CoverageDistribution from "./coverageDistribution";
import GscValidation from "./gscValidation";
import { useProjectContext } from "@/src/redux/providers/ProjectContext";

/* =======================================================================
   Types
   ======================================================================= */
interface CustomSession extends Session {
  accessToken?: string;
  refreshToken?: string;
}

type JobStatus =
  | "INITIALIZING"
  | "QUEUED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DONE"
  | "FAILED"
  | "ERROR"
  | string;

interface InspectStartResponse {
  status: boolean;
  domain?: string;
  job_exists?: boolean;
  job_created?: boolean;
  inspect_id?: number;
  job_status?: JobStatus;
  site_created?: boolean;
  batch_count?: number;
  message?: string;
  batch_urls?: { process_all?: string; process_batch?: string };
  gsc_analysis?: any;
  created_at?: string;
}

interface InspectionStatusResponse extends InspectStartResponse {
  total_pages?: number;
  processed_count?: number;
  pending_count?: number;
  progress_percentage?: number; // 0..100
}

/* =======================================================================
   Constants
   ======================================================================= */
const POLL_INTERVAL_MS = 60_000; // 1 minute
const MAX_POLL_MINUTES = 30;     // safety cap

/* =======================================================================
   Component
   ======================================================================= */
const Coverage: React.FC = () => {
  const { selectedProject, refreshProjects } = useProjectManager();
  
  const { updateProject } = useProjectContext();

  const { data: sessionData, status } = useSession();
  const session = sessionData as CustomSession;
  const token = Cookies.get("login_access_token_wrank");

  // Local mirror to avoid explicit store refreshes and re-renders
  const [project, setProject] = useState<any>(null);

  // GSC sites & selection
  const [gscSites, setGscSites] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [selectedSite, setSelectedSite] = useState<string | undefined>();

  // Coverage analysis & job state
  const [analysis, setAnalysis] = useState<any>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [jobMessage, setJobMessage] = useState<string>("");

  const [isPolling, setIsPolling] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartRef = useRef<number | null>(null);
  const prevProjectIdRef = useRef<number | string | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const hasSession = useMemo(() => !!session && status === "authenticated", [session, status]);
  const isProjectConnectedToGsc = !!(project?.gsc_email_data && project?.gsc_url);

  // Dedup guards for connect/disconnect PATCHes
  const sitePatchInFlightRef = useRef(false);
  const lastSavedSiteRef = useRef<string | undefined>(undefined);
  const disconnectInFlightRef = useRef(false);

  /* ---------------------------------- Sync selection ---------------------------------- */
  useEffect(() => {
    if (!selectedProject) {
      setProject(null);
      setGscSites([]);
      setSelectedSite(undefined);
      prevProjectIdRef.current = null;
      return;
    }

    setProject(selectedProject);
    const currentProjectId = selectedProject.id ?? null;
    if (prevProjectIdRef.current !== currentProjectId) {
      setGscSites([]);
      setSelectedSite(undefined);
      prevProjectIdRef.current = currentProjectId;
    }
  }, [selectedProject]);

  /* ---------------------------------- Auth helpers ---------------------------------- */

  const handleDisconnectGSC = async () => {
    if (!project?.id || disconnectInFlightRef.current) return;
    disconnectInFlightRef.current = true;
    try {
      await updateProject(project.id, { remove_gsc: true }); // triggers fetchProjects internally
      await refreshProjects();
      // Local mirror (no explicit refreshes)
      setProject((p: any) => (p ? { ...p, gsc_email_data: null, gsc_url: null } : p));
      setGscSites([]);
      setSelectedSite(undefined);

      // Requirement: one button only - do PATCH work and then sign out
      await signOut({ redirect: true });
      toast.success("Disconnected from Google Search Console for this project.");
    } catch (e) {
      toast.error("Failed to disconnect GSC.");
    } finally {
      disconnectInFlightRef.current = false;
    }
  };

  /* ---------------------------------- GSC Sites ---------------------------------- */
  const fetchGSCSites = useCallback(async () => {
    if (!hasSession || !session?.accessToken) {
      toast.error("Connect your Google account first to load sites.");
      return [];
    }
    try {
      const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) throw new Error(`GSC sites HTTP ${res.status}`);
      const data = await res.json();
      const sites =
        data.siteEntry?.map((s: any) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel })) || [];
      setGscSites(sites);
      localStorage.setItem("gscSites", JSON.stringify(sites));
      return sites;
    } catch (err: any) {
      console.error(err);
      toast.error(`Could not fetch GSC sites: ${err.message || "Unknown error"}`);
      return [];
    }
  }, [hasSession, session?.accessToken]);

  const gscSiteOptions = useMemo(
    () => gscSites.map((s) => ({ label: s.siteUrl, value: s.siteUrl })),
    [gscSites]
  );

  const handleSelectSite = async (site: string) => {
    setSelectedSite(site);
    if (!project || !hasSession) return;

    // De-dup: ignore same site or parallel clicks
    if (sitePatchInFlightRef.current) return;
    if (lastSavedSiteRef.current === site && project?.gsc_url === site) return;

    sitePatchInFlightRef.current = true;
    try {
      await updateProject(project.id, {
        gsc_email: session.user?.email,
        gsc_url: site,
        gsc_access_token: session.accessToken,
        gsc_refresh_token: session.refreshToken,
      }); // triggers fetchProjects internally (no explicit refresh here)
      await refreshProjects();

      // Instant mirror - avoids extra GETs / remounts
      setProject((p: any) => (p ? { ...p, gsc_email_data: session.user?.email, gsc_url: site } : p));
      lastSavedSiteRef.current = site;
      toast.success("Project updated with selected GSC site.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save selected GSC site.");
    } finally {
      sitePatchInFlightRef.current = false;
    }
  };

  /* ---------------------------------- Polling control ---------------------------------- */
  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => () => clearPolling(), [clearPolling]);

  /* ---------------------------------- API: inspection-status (POST) ---------------------------------- */
  const hitInspectionStatus = useCallback(
    async (gscUrl: string) => {
      try {
        const { data } = await axios.post<InspectionStatusResponse>(
          `${BASE_URL_WR}inspection-status/`,
          { gsc_url: gscUrl },
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        // Keep status/message visible
        if (typeof data?.job_status === "string") setJobStatus(String(data.job_status));
        if (typeof data?.message === "string") setJobMessage(String(data.message));

        // Render when ready
        if (data?.gsc_analysis) {
          setAnalysis(data);
          clearPolling();
          toast.success("Inspection complete. Rendering coverage analysis.");
          return true; // signal done
        }

        // Still in progress
        if (["INITIALIZING", "QUEUED", "IN_PROGRESS"].includes(String(data?.job_status || "").toUpperCase())) {
          const pct = typeof data?.progress_percentage === "number" ? data.progress_percentage : undefined;
          if (typeof pct === "number") {
            toast.message(`Processing... ${Math.max(0, Math.min(100, Math.round(pct)))}%`);
          }
          return false; // keep going
        }

        // Failed or unknown terminal
        if (["FAILED", "ERROR"].includes(String(data?.job_status || "").toUpperCase())) {
          clearPolling();
          toast.error(data?.message || "Inspection failed. Reconnect Google and try again.");
          return true;
        }

        return false;
      } catch (err: any) {
        const ax: any = err as AxiosError;
        if (ax.response?.data?.error) {
          clearPolling();
          console.log(String(ax.response?.data?.error));
          return true;
        }
        if (ax?.response?.status === 401) {
          clearPolling();
          toast.error("Session expired. Reconnect Google and try again.");
          return true;
        }
        console.error("inspection-status error:", ax?.message || err);
        toast.message("Network hiccup while checking status; please contact support with context.");
        return false;
      }
    },
    [token, clearPolling]
  );

  /* ---------------------------------- API: get-coverage-data (POST) ---------------------------------- */
  const startInspection = useCallback(async () => {
    if (!project?.gsc_url) {
      toast.error("Select a GSC site first, then click Get Data.");
      return;
    }

    setIsBusy(true);
    clearPolling();
    setAnalysis(null);
    setJobStatus("");
    setJobMessage("");

    try {
      const { data } = await axios.post<InspectStartResponse>(
        `${BASE_URL_WR}get-coverage-data/`,
        { project_id: selectedProject?.id },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );

      // Case A: server returns analysis immediately -> render, no polling
      if (data?.gsc_analysis) {
        setAnalysis(data);
        toast.success("Coverage analysis is ready. Displaying results.");
        return;
      }

      // Case B: job started -> begin polling inspection-status
      setJobStatus(String(data?.job_status || "INITIALIZING"));
      setJobMessage(data?.message || "Inspection started. We'll refresh results every minute.");
      setIsPolling(true);
      toast.info(data?.message || "Inspection started. We'll check results every 1 minute.");

      // immediate probe, then cadence
      const doneNow = await hitInspectionStatus(project.gsc_url);
      if (doneNow) return;

      pollStartRef.current = Date.now();
      pollTimerRef.current = setInterval(async () => {
        const started = pollStartRef.current ?? Date.now();
        const elapsedMin = Math.floor((Date.now() - started) / 60_000);
        if (elapsedMin >= MAX_POLL_MINUTES) {
          clearPolling();
          toast.error(
            'Inspection is taking longer than expected. Click "Get Data" to resume later or keep this page open.'
          );
          return;
        }
        const done = await hitInspectionStatus(project.gsc_url);
        if (done && pollTimerRef.current) {
          clearPolling();
        }
      }, POLL_INTERVAL_MS);
    } catch (err: any) {
      const ax = err as AxiosError<any>;
      const msg = ax?.response?.data?.message || ax?.message || "Failed to start inspection.";
      toast.error(`${msg} - ensure your GSC site is selected and tokens are valid.`);
    } finally {
      setIsBusy(false);
    }
  }, [project?.gsc_url, selectedProject?.id, token, clearPolling, hitInspectionStatus]);

  useEffect(() => {
    if (analysis?.gsc_analysis && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [analysis?.gsc_analysis]);

  return (
    <div className="w-full">
      {/* Shared GSC Integration Panel */}
      <GscIntegrationPanel
        project={project}
        hasSession={hasSession}
        session={session}
        gscSites={gscSites}
        gscSiteOptions={gscSiteOptions as { value: string; label: string; permission: string; }[]} // Fix: type mismatch
        selectedSite={selectedSite}
        setSelectedSite={setSelectedSite}
        onLoadSites={fetchGSCSites}
        onSelectSite={handleSelectSite}
        onDisconnect={handleDisconnectGSC}
      />

      {/* Coverage-specific actions when connected */}
      {isProjectConnectedToGsc && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-6 mt-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex flex-col gap-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">Coverage Analysis</h3>
              </div>
              <p className="text-sm text-gray-700">
                Fetch fresh coverage insights from your connected Search Console property. Keep this card open and we will
                slide you to the results as soon as they land.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3">
              <button
                onClick={startInspection}
                disabled={isBusy}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-colors font-semibold py-2.5 px-5 rounded-lg text-white shadow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isBusy ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span>Starting...</span>
                  </>
                ) : (
                  "Get Data"
                )}
              </button>
            </div>
          </div>

          {/* Status banner */}
          {(isPolling || jobMessage) && jobMessage !== "Request Accepted successfully" && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-white/90 p-4 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  i
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Live status</p>
                  <p className="text-sm text-gray-700">
                    {jobMessage || "Inspection in progress. We'll refresh automatically."}
                    {isPolling && jobStatus && <span className="ml-2 text-xs text-gray-500">({jobStatus})</span>}
                  </p>
                </div>
                {isPolling && (
                  <div className="hidden sm:block text-right">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">Auto-refreshing</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results (unchanged) */}
      {analysis?.gsc_analysis && (
        <div ref={resultsRef} className="mt-8 space-y-4">
          <CoverageSummary summary={analysis?.gsc_analysis?.summary} />
          <CoverageBreakdown coverage_breakdown={analysis?.gsc_analysis?.coverage_breakdown} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <CoverageDistribution summary={analysis?.gsc_analysis?.summary} createdAtDate={analysis?.created_at} />
            <GscValidation />
          </div>
        </div>
      )}

    </div>
  );
};

export default Coverage;
