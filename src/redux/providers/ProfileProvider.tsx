"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { BASE_URL_WR } from "../../util/api";
import { toast } from "sonner";

interface ProfileData {
    // define your API's expected fields
    id?: number;
    name?: string;
    email?: string;
    [key: string]: any;
}

interface ProfileContextType {
    profile: ProfileData | null;
    loading: boolean;
    error: string | null;
    fetchProfile: () => Promise<void>;
    updateProfile: any;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = Cookies.get("login_access_token_wrank");

            if (!token) {
                setError("No token found");
                setLoading(false);
                return;
            }

            const res = await axios.get(`${BASE_URL_WR}backend-auth/profile/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            setProfile(res.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to fetch profile");
        } finally {
            setLoading(false);
        }
    };
    const updateProfile = async (updatedData: Partial<ProfileData>) => {
        try {
            setLoading(true);
            setError(null);

            const token = Cookies.get("login_access_token_wrank");
            if (!token) {
                setError("No token found");
                return;
            }

            const res = await axios.patch(
                `${BASE_URL_WR}backend-auth/profile/`,
                updatedData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            toast.success("Profile updated successfully");
            fetchProfile()
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to update profile")
            setError(err.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchProfile();
    }, []);

    return (
        <ProfileContext.Provider value={{ profile, loading, error, fetchProfile, updateProfile }}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = (): ProfileContextType => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within a ProfileProvider");
    }
    return context;
};
