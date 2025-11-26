

"use client";

import axios, { CancelTokenSource } from "axios";
import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from "react";

type SiteDetail = any; // Replace with actual type if available

interface SiteDetailContextType {
    affectedDetails: SiteDetail | null;
    loading: boolean;
    affectedDetailsError: SiteDetail | null;
    fetchDetails: (siteId: any) => Promise<void>
}

const AffectedDetailContext = createContext<SiteDetailContextType | undefined>(undefined);

export const AffectedDetailProvider = ({ children }: { children: ReactNode }) => {

    const [affectedDetails, setAffectedDetails] = useState<SiteDetail | null>(null);
    const [affectedDetailsError, setAffectedDetailsError] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const cancelSourceRef = useRef<CancelTokenSource | null>(null);

  

    const fetchDetails = useCallback(async (siteId: any) => {
        try {
            cancelSourceRef.current?.cancel("affected details superseded");
            cancelSourceRef.current = axios.CancelToken.source();
            setLoading(true);
            const res: any = await axios.get(`https://dashboard.wranker.com/api/page-affected-details/${siteId}/`, {
                cancelToken: cancelSourceRef.current.token,
            });
            setAffectedDetails(res.data);
            setAffectedDetailsError(null)
        } catch (error: any) {
            if (axios.isCancel(error)) {
                // ignore cancellation
            } else if (axios.isAxiosError(error)) {
                setAffectedDetailsError(error?.response?.data?.error);
            } else {
                console.error("Unexpected error:", error);
                setAffectedDetailsError(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        return () => {
            cancelSourceRef.current?.cancel("affected details provider unmounted");
        };
    }, []);

    return (
        <AffectedDetailContext.Provider value={{ affectedDetails, affectedDetailsError, loading, fetchDetails }}>
            {children}
        </AffectedDetailContext.Provider>
    );
};

export const useAffectedDetails = () => {
    const context = useContext(AffectedDetailContext);
    if (context === undefined) {
        throw new Error("useSiteDetail must be used within a SiteDetailProvider");
    }
    // clear cancellation on unmount via caller if needed
    return context;
};
