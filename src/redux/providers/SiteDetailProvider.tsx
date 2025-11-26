

"use client";

import axios, { CancelTokenSource } from "axios";
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";

type SiteDetail = any; // Replace with actual type if available

interface SiteDetailContextType {
    siteDetails: SiteDetail | null;
    loading: boolean;
    pending: boolean;
    setSiteId: (id: number | null) => void;
    siteDetailsError: SiteDetail | null;
    pendingStatusMsg: string
    fetchDetails: () => Promise<void>;
    crawling: any;
    crawlingData: any;
}

const SiteDetailContext = createContext<SiteDetailContextType | undefined>(undefined);

export const SiteDetailProvider = ({ children }: { children: ReactNode }) => {
    const [siteId, setSiteId] = useState<number | null>(null);
    const [siteDetails, setSiteDetails] = useState<SiteDetail | null>(null);
    const [pendingStatusMsg, setPendingStatusMsg] = useState("")
    const [siteDetailsError, setSiteDetailsError] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [pending, setPending] = useState<boolean>(false);


    const [crawlingData, setCrawlingData] = useState([]);
    const [crawling, setCrawling] = useState<boolean>(false);
    const cancelSourceRef = useRef<CancelTokenSource | null>(null);

    const fetchDetails = useCallback(async () => {
        try {
            cancelSourceRef.current?.cancel("site detail request superseded");
            cancelSourceRef.current = axios.CancelToken.source();
            setLoading(true);
            const res: any = await axios.get(`https://dashboard.wranker.com/api/site-crawling-details/${siteId}/`, {
                cancelToken: cancelSourceRef.current.token,
            });
            setPending(res.data.status === "pending" ? true : false)
            setSiteDetails(res.data.data);
            setCrawlingData(res.data.crawaling_data);
            setCrawling(res.data.crawaling);
            setSiteDetailsError(null)
            if (res.data.status === "pending") {
                setPendingStatusMsg(res.data.message)
            } else if (res.data.status?.toLowerCase() === 'completed') {
            setLoading(false);
            }
        } catch (error: any) {
            if (axios.isCancel(error)) {
                // ignore cancellation
            } else if (axios.isAxiosError(error)) {
                setSiteDetailsError(error?.response?.data?.error);
            } else {
                console.error("Unexpected error:", error);
                setSiteDetailsError(null);
            }
            setLoading(false);
        } finally {
            setLoading(false);
        }
    }, [siteId]);

    useEffect(() => {
        if (!siteId) return;
        fetchDetails();
        return () => {
            cancelSourceRef.current?.cancel("site detail request aborted on unmount");
        };
    }, [siteId]);

    return (
        <SiteDetailContext.Provider value={{ siteDetails, siteDetailsError, pendingStatusMsg, loading, setSiteId, fetchDetails, crawlingData, crawling,pending }}>
            {children}
        </SiteDetailContext.Provider>
    );
};

export const useSiteDetail = () => {
    const context = useContext(SiteDetailContext);
    if (context === undefined) {
        throw new Error("useSiteDetail must be used within a SiteDetailProvider");
    }
    return context;
};
