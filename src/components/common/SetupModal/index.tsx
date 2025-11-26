"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Modal, Select, Spin } from "antd";
import {
  Globe,
  Users,
  Settings,
  Target,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import axios from "axios";
import { BASE_URL_WR } from "@/src/util/api";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { useProjectManager } from "@/src/hooks/use-project-manager";
import { useRouter } from "next/navigation";
import { fetchCampaignOverview } from "@/src/redux/reducer/campaignReducer";
import { AppDispatch } from "@/src/redux/store";
import { useDispatch } from "react-redux";
import { signIn, signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import {
  GaProperty,
  hasValidGaCache,
  readGaCache,
  writeGaCache,
} from "@/src/util/gaIntegration";


const { Option } = Select;

type GoogleSession = Session & {
  accessToken?: string;
  refreshToken?: string;
};

type GaPropertyOption = {
  value: string;
  label: string;
  accountName?: string;
};

interface FormData {
  // Step 1: Basic Project Info
  projectName: string;
  websiteUrl: string;
  logo: File | null;
  colorTheme: string;

  // Step 2: Connect Data (skippable)
  gscConnected: boolean;
  ga4Connected: boolean;
  gscSiteUrl: string;
  gaPropertyId: string;
  gaPropertyLabel: string;
  gscEmail: string;
  gaEmail: string;

  // Step 3: SEO Setup
  targetKeywords: string[];
  competitorDomains: string[];
  targetCountries: LocationOption[];

  // Step 4: Project Team (skippable)
  teamMembers: Array<{ email: string; role: string }>;

  // Step 5: Project Settings
  defaultTimeZone: string;
  defaultDateRange: string;
  notificationFrequency: string;
  autoAuditSchedule: string;

  // Step 6: Review options
  runInitialAudit: boolean;
  startKeywordTracking: boolean;
}

interface LocationOption {
  label: string;
  value: string;
  code: number;
}

const createInitialFormData = (): FormData => ({
  projectName: "",
  websiteUrl: "",
  logo: null,
  colorTheme: "#3B82F6",
  gscConnected: false,
  ga4Connected: false,
  gscSiteUrl: "",
  gaPropertyId: "",
  gaPropertyLabel: "",
  gscEmail: "",
  gaEmail: "",
  targetKeywords: [],
  competitorDomains: [],
  targetCountries: [],
  teamMembers: [],
  defaultTimeZone: "UTC",
  defaultDateRange: "Last 30 days",
  notificationFrequency: "Weekly",
  autoAuditSchedule: "Weekly",
  runInitialAudit: true,
  startKeywordTracking: true,
});

const createInitialTempInputs = () => ({
  keyword: "",
  competitor: "",
  memberEmail: "",
});

const normalizeGaPropertyId = (resourceName: string) => {
  if (!resourceName) return resourceName;
  const parts = resourceName.split("/");
  return parts[parts.length - 1] || resourceName;
};

const mapGaPropertiesToOptions = (
  properties: GaProperty[],
): GaPropertyOption[] =>
  properties.map((property) => {
    const normalizedId = normalizeGaPropertyId(property.propertyId);
    return {
      value: normalizedId,
      label: `${property.displayName} (${normalizedId})`,
      accountName: property.accountId,
    };
  });

const SETUP_MODAL_STATE_KEY = "wrank_setup_modal_state_v1";
const SETUP_MODAL_REOPEN_KEY = "wrank_setup_modal_reopen";

type PersistedSetupState = {
  currentStep: number;
  formData: Omit<FormData, "logo"> & { logo: null };
  selectedGscSite?: string;
  selectedGaProperty?: string;
  savedAt: number;
};

const steps = [
  {
    id: 1,
    title: "Project Info",
    subtitle: "Let's start with the essentials",
    icon: Globe,
    required: true,
  },
  {
    id: 2,
    title: "Connect Your Data",
    subtitle: "Link Google Search Console and Analytics",
    icon: BarChart3,
    required: false,
  },
  {
    id: 3,
    title: "SEO Setup",
    subtitle: "Configure your SEO tracking preferences",
    icon: Target,
    required: true,
  },
  // {
  //   id: 4,
  //   title: "Project Team",
  //   subtitle: "Invite team members and assign roles",
  //   icon: Users,
  //   required: false,
  // },
  {
    id: 4,
    title: "Project Settings",
    subtitle: "Configure default preferences",
    icon: Settings,
    required: true,
  },
  {
    id: 5,
    title: "Review & Create",
    subtitle: "Review your project configuration",
    icon: CheckCircle,
    required: true,
  },
];

const clampStep = (value: number) =>
  Math.min(Math.max(value || 1, 1), steps.length);

const toPersistedFormData = (data: FormData): PersistedSetupState["formData"] =>
  ({
    ...data,
    logo: null,
  } as PersistedSetupState["formData"]);

export default function MultiStepForm({modalOpen, setModalOpen }:any) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [searchResults, setSearchResults] = useState<LocationOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [websiteError, setWebsiteError] = useState("");
  const [competitorError, setCompetitorError] = useState("");
  const [countriesError, setCountriesError] = useState("");
  const [formData, setFormData] = useState<FormData>(() =>
    createInitialFormData(),
  );
  const [tempInputs, setTempInputs] = useState(() => createInitialTempInputs());

  const { data: sessionData, status: sessionStatus } = useSession();
  const session = sessionData as GoogleSession | null;
  const sessionEmail = session?.user?.email ?? "";
  const sessionAccessToken = session?.accessToken;
  const sessionRefreshToken = session?.refreshToken;
  const hasGoogleSession =
    sessionStatus === "authenticated" && Boolean(sessionAccessToken);

  const [authLoadingTarget, setAuthLoadingTarget] = useState<
    "gsc" | "ga" | null
  >(null);
  const [gscSites, setGscSites] = useState<
    Array<{ siteUrl: string; permissionLevel: string }>
  >([]);
  const [isLoadingGscSites, setIsLoadingGscSites] = useState(false);
  const [gscError, setGscError] = useState<string | null>(null);
  const [selectedGscSite, setSelectedGscSite] = useState<string | undefined>();
  const [gaPropertyOptions, setGaPropertyOptions] = useState<
    GaPropertyOption[]
  >([]);
  const [isLoadingGaProperties, setIsLoadingGaProperties] = useState(false);
  const [gaError, setGaError] = useState<string | null>(null);
  const [selectedGaProperty, setSelectedGaProperty] = useState<
    string | undefined
  >();
  const [gaLastFetchedAt, setGaLastFetchedAt] = useState<number | null>(null);
  const clearPersistedState = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(SETUP_MODAL_STATE_KEY);
    window.localStorage.removeItem(SETUP_MODAL_REOPEN_KEY);
  }, []);
  const markModalForReopen = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETUP_MODAL_REOPEN_KEY, "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SETUP_MODAL_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedSetupState>;
      if (parsed.formData) {
        setFormData((prev) => ({
          ...prev,
          ...parsed.formData,
        }));
      }
      if (typeof parsed.currentStep === "number") {
        setCurrentStep(clampStep(parsed.currentStep));
      }
      if (parsed.selectedGscSite !== undefined) {
        setSelectedGscSite(parsed.selectedGscSite || undefined);
      }
      if (parsed.selectedGaProperty !== undefined) {
        setSelectedGaProperty(parsed.selectedGaProperty || undefined);
      }
    } catch (error) {
      console.warn("Failed to restore setup modal state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload: PersistedSetupState = {
        currentStep,
        formData: toPersistedFormData(formData),
        selectedGscSite,
        selectedGaProperty,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(
        SETUP_MODAL_STATE_KEY,
        JSON.stringify(payload),
      );
    } catch (error) {
      console.warn("Failed to persist setup modal state", error);
    }
  }, [currentStep, formData, selectedGscSite, selectedGaProperty]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldReopen = window.localStorage.getItem(SETUP_MODAL_REOPEN_KEY);
    if (!shouldReopen) return;
    if (!modalOpen) {
      setModalOpen?.(true);
      return;
    }
    window.localStorage.removeItem(SETUP_MODAL_REOPEN_KEY);
  }, [modalOpen, setModalOpen]);

  const handleSearch = async (value: string) => {
    if (value.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      setFetching(true);
      const res = await axios.get(
        `${BASE_URL_WR}search-locations/?search_term=${value}`
      );
      const data = res?.data?.data || [];
      const filtered = data.map((item: any) => ({
        label: `${item.name} (${item.target_type})`,
        value: item.name,
        code: `${item.location_code}`,
      }));
      setSearchResults(filtered);
    } catch (err) {
      console.error("Error fetching countries:", err);
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (selectedValues: string[]) => {
    // Find the selected location objects (with code)
    const selectedLocations = searchResults.filter((loc) =>
      selectedValues.includes(loc.value)
    );

    setFormData((prev) => ({
      ...prev,
      targetCountries: selectedLocations, // store entire object
    }));
    if (selectedLocations.length === 0) {
      setCountriesError("At least one country/city is required");
    } else {
      setCountriesError("");
    }
  };

  const resetGoogleSelections = useCallback(() => {
    setSelectedGscSite(undefined);
    setSelectedGaProperty(undefined);
    setFormData((prev) => ({
      ...prev,
      gscConnected: false,
      ga4Connected: false,
      gscSiteUrl: "",
      gaPropertyId: "",
      gaPropertyLabel: "",
      gscEmail: "",
      gaEmail: "",
    }));
  }, []);

  const clearGoogleAuthState = useCallback(() => {
    setGscSites([]);
    setGaPropertyOptions([]);
    setGscError(null);
    setGaError(null);
    resetGoogleSelections();
  }, [resetGoogleSelections]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      clearGoogleAuthState();
      setAuthLoadingTarget(null);
    }
  }, [sessionStatus, clearGoogleAuthState]);

  useEffect(() => {
    if (!hasGoogleSession) return;
    const cache:any = readGaCache();
    if (hasValidGaCache(cache)) {
      setGaPropertyOptions(mapGaPropertiesToOptions(cache.properties));
      setGaLastFetchedAt(cache.timestamp);
    }
  }, [hasGoogleSession]);

  const handleGoogleConnect = useCallback(
    async (target: "gsc" | "ga") => {
      if (hasGoogleSession) return;
      setAuthLoadingTarget(target);
      try {
        markModalForReopen();
        await signIn("google", {
          callbackUrl: window.location.href,
          redirect: false,
        });
      } catch (error) {
        console.error("Google connect failed", error);
        toast.error("Failed to start Google sign-in. Please try again.");
      } finally {
        setAuthLoadingTarget(null);
      }
    },
    [hasGoogleSession, markModalForReopen],
  );

  const handleGoogleDisconnect = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      toast.success("Disconnected Google account.");
    } catch (error) {
      console.error("Failed to disconnect Google session", error);
      toast.error("Unable to disconnect Google session. Please try again.");
    } finally {
      clearGoogleAuthState();
    }
  }, [clearGoogleAuthState]);

  const handleLoadGscSites = useCallback(async () => {
    if (!hasGoogleSession || !sessionAccessToken) {
      toast.error("Connect your Google account first.");
      return;
    }

    setIsLoadingGscSites(true);
    setGscError(null);
    try {
      const response = await fetch(
        "https://www.googleapis.com/webmasters/v3/sites",
        {
          headers: { Authorization: `Bearer ${sessionAccessToken}` },
        },
      );
      if (!response.ok) {
        throw new Error(
          `Unable to load Search Console sites (${response.status}).`,
        );
      }
      const data = await response.json();
      const sites =
        data.siteEntry?.map((site: any) => ({
          siteUrl: site.siteUrl,
          permissionLevel: site.permissionLevel,
        })) ?? [];
      setGscSites(sites);
      if (!sites.length) {
        setGscError(
          "No Google Search Console sites were returned for this account.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load Google Search Console sites.";
      setGscError(message);
      toast.error(message);
    } finally {
      setIsLoadingGscSites(false);
    }
  }, [hasGoogleSession, sessionAccessToken]);

  const handleSelectGscSite = useCallback(
    (value?: string) => {
      const nextValue = value || "";
      setSelectedGscSite(nextValue || undefined);
      setFormData((prev) => ({
        ...prev,
        gscConnected: Boolean(nextValue),
        gscSiteUrl: nextValue,
        gscEmail: nextValue ? sessionEmail : "",
      }));
    },
    [sessionEmail],
  );

  const handleLoadGaProperties = useCallback(async () => {
    if (!hasGoogleSession || !sessionAccessToken) {
      toast.error("Connect your Google account first.");
      return;
    }

    const cache:any = readGaCache();
    if (hasValidGaCache(cache)) {
      setGaPropertyOptions(mapGaPropertiesToOptions(cache.properties));
      setGaLastFetchedAt(cache.timestamp);
      return;
    }

    setIsLoadingGaProperties(true);
    setGaError(null);
    try {
      const response = await fetch(
        "https://analyticsadmin.googleapis.com/v1alpha/accountSummaries?pageSize=200",
        {
          headers: {
            Authorization: `Bearer ${sessionAccessToken}`,
            Accept: "application/json",
          },
        },
      );

      if (response.status === 403) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          errorPayload.error?.message ||
            "Access denied to Google Analytics. Ensure you have permissions and the API is enabled.",
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText ||
            `Failed to fetch Google Analytics properties (${response.status}).`,
        );
      }

      const data = await response.json();
      const summaries: GaProperty[] = [];
      const accountSummaries = (data.accountSummaries ||
        []) as Array<{
        account: string;
        propertySummaries?: Array<{ property: string; displayName: string }>;
      }>;

      for (const account of accountSummaries) {
        const properties = account.propertySummaries || [];
        properties.forEach((property) => {
          summaries.push({
            accountId: account.account,
            propertyId: property.property,
            displayName: property.displayName,
          });
        });
      }

      const options = mapGaPropertiesToOptions(summaries);
      setGaPropertyOptions(options);
      const timestamp = Date.now();
      setGaLastFetchedAt(timestamp);
      writeGaCache({ timestamp, properties: summaries });

      if (!summaries.length) {
        setGaError(
          "No Google Analytics properties were returned for this account.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load Google Analytics properties.";
      setGaError(message);
      toast.error(message);
    } finally {
      setIsLoadingGaProperties(false);
    }
  }, [hasGoogleSession, sessionAccessToken]);

  const handleSelectGaProperty = useCallback(
    (value?: string) => {
      const nextValue = value || "";
      setSelectedGaProperty(nextValue || undefined);
      const optionLabel =
        gaPropertyOptions.find((option) => option.value === nextValue)?.label ||
        "";
      setFormData((prev) => ({
        ...prev,
        ga4Connected: Boolean(nextValue),
        gaPropertyId: nextValue,
        gaPropertyLabel: optionLabel,
        gaEmail: nextValue ? sessionEmail : "",
      }));
    },
    [gaPropertyOptions, sessionEmail],
  );

  const gscSiteOptions = useMemo(
    () =>
      gscSites.map((site) => ({
        value: site.siteUrl,
        label: site.siteUrl,
        permission: site.permissionLevel,
      })),
    [gscSites],
  );

  const selectedGaPropertyLabel = useMemo(() => {
    if (!formData.gaPropertyId) return "";
    return (
      formData.gaPropertyLabel ||
      gaPropertyOptions.find(
        (option) => option.value === formData.gaPropertyId,
      )?.label ||
      formData.gaPropertyId
    );
  }, [formData.gaPropertyId, formData.gaPropertyLabel, gaPropertyOptions]);

  const resetFormState = useCallback(() => {
    clearPersistedState();
    setFormData(createInitialFormData());
    setTempInputs(createInitialTempInputs());
    setSearchResults([]);
    setWebsiteError("");
    setCompetitorError("");
    setCountriesError("");
    setCurrentStep(1);
    setDirection(0);
    resetGoogleSelections();
  }, [clearPersistedState, resetGoogleSelections]);

  const slideVariants: any = {
    initial: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: "easeInOut" },
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
      opacity: 0,
      transition: { duration: 0.4, ease: "easeInOut" },
    }),
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const skipStep = () => {
    const step = steps.find((s) => s.id === currentStep);
    if (step && !step.required) {
      nextStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.projectName.trim() !== "" &&
          formData.websiteUrl.trim() !== ""
        );
      case 3:
        return (formData.targetCountries.length > 0)
      default:
        return true;
    }
  };

  const addKeyword = () => {
    if (tempInputs.keyword.trim() && formData.targetKeywords.length < 5) {
      setFormData((prev) => ({
        ...prev,
        targetKeywords: [...prev.targetKeywords, tempInputs.keyword.trim()],
      }));
      setTempInputs((prev) => ({ ...prev, keyword: "" }));
    }
  };

  const removeKeyword = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      targetKeywords: prev.targetKeywords.filter((_, i) => i !== index),
    }));
  };

  const addCompetitor = () => {
    const input = tempInputs.competitor.trim();

    if (formData.competitorDomains.length >= 5) return;

    if (!input.startsWith("https://")) {
      setCompetitorError("Competitor domain must start with https://");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      competitorDomains: [...prev.competitorDomains, input],
    }));

    setTempInputs((prev) => ({ ...prev, competitor: "" }));
    setCompetitorError("");
  };
  const removeCompetitor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      competitorDomains: prev.competitorDomains.filter((_, i) => i !== index),
    }));
  };

  const addTeamMember = () => {
    if (tempInputs.memberEmail.trim()) {
      setFormData((prev) => ({
        ...prev,
        teamMembers: [
          ...prev.teamMembers,
          { email: tempInputs.memberEmail.trim(), role: "Viewer" },
        ],
      }));
      setTempInputs((prev) => ({ ...prev, memberEmail: "" }));
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index),
    }));
  };

  const updateTeamMemberRole = (index: number, role: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) =>
        i === index ? { ...member, role } : member
      ),
    }));
  };

  // Import useProjectManager with ES6 style
  const { refreshProjects } = useProjectManager();
  const dispatch = useDispatch<AppDispatch>()

const router = useRouter();
  const refreshOverview = useCallback(() => {
    dispatch(fetchCampaignOverview())
  }, [dispatch])

  const handleSubmit = async () => {
    const token = Cookies.get("login_access_token_wrank");
    if (!token) {
      toast.error("Authentication token not found. Please log in again.");
      router.push("/signin")
      return;
    }
    const gscPayload =
      formData.gscConnected && formData.gscSiteUrl
        ? {
            gsc_url: formData.gscSiteUrl,
            gsc_email: formData.gscEmail || sessionEmail,
            ...(sessionAccessToken
              ? {
                  gsc_access_token: sessionAccessToken,
                  gsc_refresh_token: sessionRefreshToken,
                }
              : {}),
          }
        : {};
    const gaPayload =
      formData.ga4Connected && formData.gaPropertyId
        ? {
            analytics_id: formData.gaPropertyId,
            ga_email: formData.gaEmail || sessionEmail,
            ...(sessionAccessToken
              ? {
                  ga_access_token: sessionAccessToken,
                  ga_refresh_token: sessionRefreshToken,
                }
              : {}),
          }
        : {};
    const payload = {
      name: formData.projectName,
      url: formData.websiteUrl,
      language: "en",
      location: formData.targetCountries[0]?.value || "",
      location_code: formData.targetCountries[0]?.code || 1,
      competitors: formData.competitorDomains,
      keywords: formData.targetKeywords,
      ...gscPayload,
      ...gaPayload,
    };

    try {
      setLoading(true);
      const res = await axios.post(
        `${BASE_URL_WR}my-project/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.success("Project Created Successfully", {
        position: "top-right",
      });
      refreshProjects();
      refreshOverview()
      resetFormState();
      setModalOpen(false);
    } catch (error:any) {
      console.error("API error:", error.response);
      error.response.data.error && toast.error(error.response.data.error)
      error.response.data.location[0] && toast.error(error.response.data.location[0])
      error.response.data.location[0] && setCurrentStep(3)
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    projectName: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md  outline-none transition-all"
                placeholder="Enter project name"
              />
              <p className="text-sm text-gray-500 mt-1">
                This name will appear across your dashboards
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    websiteUrl: value,
                  }));
    if (!/^https?:\/\/.+/.test(value)) {
      setWebsiteError("Website URL must start with http:// or https://");
                  } else {
                    setWebsiteError("");
                  }
                }}
                className={`w-full px-4 py-3 border rounded-md outline-none transition-all ${
                  websiteError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="https://example.com"
              />
              {websiteError && (
                <p className="text-red-500 text-sm mt-1">{websiteError}</p>
              )}
            </div>
          </div>
        );

      case 2: {
        const gscButtonLabel = hasGoogleSession
          ? isLoadingGscSites
            ? "Loading sites..."
            : gscSiteOptions.length
            ? "Reload GSC sites"
            : "Load GSC sites"
          : authLoadingTarget === "gsc"
          ? "Connecting..."
          : "Connect with Google";
        const gaButtonLabel = hasGoogleSession
          ? isLoadingGaProperties
            ? "Loading properties..."
            : gaPropertyOptions.length
            ? "Reload GA4 properties"
            : "Load GA4 properties"
          : authLoadingTarget === "ga"
          ? "Connecting..."
          : "Connect with Google";
        const gscButtonDisabled = hasGoogleSession
          ? isLoadingGscSites
          : authLoadingTarget === "gsc";
        const gaButtonDisabled = hasGoogleSession
          ? isLoadingGaProperties
          : authLoadingTarget === "ga";

        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-brand-blue3" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Google Search Console
                    </h3>
                    <p className="text-sm text-gray-600">
                      Connect to track search performance
                    </p>
                    {selectedGscSite && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {selectedGscSite}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={
                    hasGoogleSession
                      ? handleLoadGscSites
                      : () => handleGoogleConnect("gsc")
                  }
                  disabled={gscButtonDisabled}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    hasGoogleSession
                      ? "bg-white text-blue-600 border border-blue-200 hover:border-blue-400"
                      : "bg-blue-500 text-white hover:bg-brantext-brand-blue3"
                  } ${gscButtonDisabled ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {gscButtonLabel}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {hasGoogleSession ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700">
                      Select a Search Console property
                    </label>
                    <Select
                      className="w-full border rounded-sm border-black/20 mb-2"
                      placeholder="Pick a verified property"
                      value={selectedGscSite}
                      onChange={(value) =>
                        handleSelectGscSite(value as string | undefined)
                      }
                      allowClear
                      showSearch
                      optionFilterProp="value"
                      disabled={isLoadingGscSites || !gscSiteOptions.length}
                      loading={isLoadingGscSites}
                    >
                      {gscSiteOptions.map((option) => (
                        <Option
                          key={option.value}
                          value={option.value}
                          disabled={option.permission === "siteUnverifiedUser"}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span>{option.label}</span>
                            {option.permission === "siteUnverifiedUser" && (
                              <span className="text-xs text-gray-500">
                                Unverified
                              </span>
                            )}
                          </span>
                        </Option>
                      ))}
                    </Select>
                    {gscError && (
                      <p className="text-sm text-red-600">{gscError}</p>
                    )}
                    <div className="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {gscSiteOptions.length
                          ? `${gscSiteOptions.length} site${
                              gscSiteOptions.length === 1 ? "" : "s"
                            } loaded`
                          : "Load your verified Search Console sites to continue."}
                      </span>
                      <div className="flex items-center gap-2">
                        {sessionEmail && (
                          <span>Signed in as {sessionEmail}</span>
                        )}
                        <button
                          type="button"
                          onClick={handleGoogleDisconnect}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Sign in with Google to fetch your Search Console sites.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-md p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-md flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Google Analytics 4
                    </h3>
                    <p className="text-sm text-gray-600">
                      Connect to track user behavior
                    </p>
                    {selectedGaProperty && (
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {selectedGaPropertyLabel}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={
                    hasGoogleSession
                      ? handleLoadGaProperties
                      : () => handleGoogleConnect("ga")
                  }
                  disabled={gaButtonDisabled}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    hasGoogleSession
                      ? "bg-white text-orange-600 border border-orange-200 hover:border-orange-400"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  } ${gaButtonDisabled ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {gaButtonLabel}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {hasGoogleSession ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700">
                      Select a GA4 property
                    </label>
                    <Select
                      className="w-full border rounded-sm border-black/20 mb-2"
                      placeholder="Pick a GA4 property"
                      value={selectedGaProperty}
                      onChange={(value) =>
                        handleSelectGaProperty(value as string | undefined)
                      }
                      showSearch
                      optionFilterProp="children"
                      allowClear
                      disabled={
                        isLoadingGaProperties || !gaPropertyOptions.length
                      }
                      loading={isLoadingGaProperties}
                    >
                      {gaPropertyOptions.map((option) => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                    {gaError && (
                      <p className="text-sm text-red-600">{gaError}</p>
                    )}
                    <div className="flex flex-col gap-1 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        {gaPropertyOptions.length
                          ? `${gaPropertyOptions.length} propert${
                              gaPropertyOptions.length === 1 ? "y" : "ies"
                            } loaded${
                              gaLastFetchedAt
                                ? ` · ${new Date(
                                    gaLastFetchedAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : ""
                            }`
                          : "Load GA4 properties to sync analytics."}
                      </span>
                      <button
                        type="button"
                        onClick={handleGoogleDisconnect}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Sign in with Google to fetch your GA4 properties.
                  </p>
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                You can skip this step and connect later.
              </p>
            </div>
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Keywords (up to 5){" "} 
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tempInputs.keyword}
                  onChange={(e) =>
                    setTempInputs((prev) => ({
                      ...prev,
                      keyword: e.target.value,
                    }))
                  }
                  onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md  outline-none"
                  placeholder="Enter keyword..."
                  disabled={formData.targetKeywords.length >= 5}
                />
                <button
                  onClick={addKeyword}
                  disabled={
                    !tempInputs.keyword.trim() ||
                    formData.targetKeywords.length >= 5
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-brantext-brand-blue3 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(index)}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Your core SEO focus terms
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competitor Domains (up to 5)
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={tempInputs.competitor}
                  onChange={(e) => {
                    setTempInputs((prev) => ({
                      ...prev,
                      competitor: e.target.value,
                    }));
                    setCompetitorError("");
                  }}
                  onKeyPress={(e) => e.key === "Enter" && addCompetitor()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md  outline-none"
                  placeholder="https://www.example.com"
                  disabled={formData.competitorDomains.length >= 5}
                />
                <button
                  onClick={addCompetitor}
                  disabled={
                    !tempInputs.competitor.trim() ||
                    formData.competitorDomains.length >= 5
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-brantext-brand-blue3 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
              {competitorError && (
                <p className="text-red-500 text-sm mt-1">{competitorError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {formData.competitorDomains.map((domain, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {domain}
                    <button
                      onClick={() => removeCompetitor(index)}
                      className="hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Use for competitive tracking
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Countries/Cities <span className="text-red-500">*</span>
              </label>
              <Select
                showSearch
                value={formData.targetCountries.map((item) => item.value)}
                onSearch={handleSearch}
                onChange={handleChange}
                filterOption={false}
                notFoundContent={
                  fetching ? <Spin size="small" /> : "No results"
                }
    className={`w-full ${countriesError ? "border border-red-500 rounded-md" : ""}`}
                placeholder="Type at least 3 letters to search"
              >
                {searchResults.map((item: any) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
                {countriesError && (
    <p className="text-red-500 text-sm mt-1">{countriesError}</p>
  )}
              <p className="text-sm text-gray-500 mt-1">
                Drive geo-based audit & keyword reporting
              </p>
            </div>
          </div>
        );

      // case 4:
      //   return (
      //     <div className="space-y-6">
      //       <div>
      //         <label className="block text-sm font-medium text-gray-700 mb-2">
      //           Invite Team Members
      //         </label>
      //         <div className="flex gap-2 mb-4">
      //           <input
      //             type="email"
      //             value={tempInputs.memberEmail}
      //             onChange={(e) =>
      //               setTempInputs((prev) => ({
      //                 ...prev,
      //                 memberEmail: e.target.value,
      //               }))
      //             }
      //             onKeyPress={(e) => e.key === "Enter" && addTeamMember()}
      //             className="flex-1 px-4 py-2 border border-gray-300 rounded-md  outline-none"
      //             placeholder="colleague@example.com"
      //           />
      //           <select className="px-3 py-2 border border-gray-300 rounded-md  outline-none">
      //             <option value="Admin">Admin</option>
      //             <option value="Editor">Editor</option>
      //             <option value="Viewer">Viewer</option>
      //           </select>
      //           <button
      //             onClick={addTeamMember}
      //             disabled={!tempInputs.memberEmail.trim()}
      //             className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-brantext-brand-blue3 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      //           >
      //             Invite
      //           </button>
      //         </div>
      //         <p className="text-sm text-gray-500 mb-4">
      //           You can manage users later in project settings
      //         </p>

      //         {formData.teamMembers.length > 0 && (
      //           <div className="space-y-2">
      //             {formData.teamMembers.map((member, index) => (
      //               <div
      //                 key={index}
      //                 className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
      //               >
      //                 <span className="text-sm text-gray-700">
      //                   {member.email}
      //                 </span>
      //                 <div className="flex items-center gap-2">
      //                   <select
      //                     value={member.role}
      //                     onChange={(e) =>
      //                       updateTeamMemberRole(index, e.target.value)
      //                     }
      //                     className="px-2 py-1 text-sm border border-gray-300 rounded  outline-none"
      //                   >
      //                     <option value="Admin">Admin</option>
      //                     <option value="Editor">Editor</option>
      //                     <option value="Viewer">Viewer</option>
      //                   </select>
      //                   <button
      //                     onClick={() => removeTeamMember(index)}
      //                     className="text-red-500 hover:text-red-700 p-1"
      //                   >
      //                     <X className="w-4 h-4" />
      //                   </button>
      //                 </div>
      //               </div>
      //             ))}
      //           </div>
      //         )}
      //       </div>

      //       <div className="bg-gray-50 rounded-md p-4">
      //         <h3 className="font-medium text-gray-900 mb-3">
      //           Role Permissions
      //         </h3>
      //         <div className="space-y-2 text-sm">
      //           <div className="flex justify-between">
      //             <span className="font-medium">Admin</span>
      //             <span className="text-gray-600">
      //               Full access, can delete project
      //             </span>
      //           </div>
      //           <div className="flex justify-between">
      //             <span className="font-medium">Editor</span>
      //             <span className="text-gray-600">
      //               Can edit settings and view reports
      //             </span>
      //           </div>
      //           <div className="flex justify-between">
      //             <span className="font-medium">Viewer</span>
      //             <span className="text-gray-600">
      //               Read-only access to reports
      //             </span>
      //           </div>
      //         </div>
      //       </div>
      //     </div>
      //   );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Time Zone
              </label>
              <select
                value={formData.defaultTimeZone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultTimeZone: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md  outline-none"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Time (EST)</option>
                <option value="PST">Pacific Time (PST)</option>
                <option value="GMT">Greenwich Mean Time (GMT)</option>
                <option value="CET">Central European Time (CET)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Date Range
              </label>
              <select
                value={formData.defaultDateRange}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    defaultDateRange: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md  outline-none"
              >
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 30 days">Last 30 days</option>
                <option value="Last 90 days">Last 90 days</option>
                <option value="Last 12 months">Last 12 months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Frequency
              </label>
              <select
                value={formData.notificationFrequency}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notificationFrequency: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md  outline-none"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Never">Never</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Audit Schedule
              </label>
              <select
                value={formData.autoAuditSchedule}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    autoAuditSchedule: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-md  outline-none"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Manual">Manual only</option>
              </select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-700">Domain:</span>
                <span className="text-gray-900">
                  {formData.websiteUrl || "Not set"}
                </span>
              </div>
              <div className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">GA4:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      formData.ga4Connected
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {formData.ga4Connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                {formData.ga4Connected && (
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    <p>{selectedGaPropertyLabel || formData.gaPropertyId}</p>
                    {formData.gaEmail && <p>as {formData.gaEmail}</p>}
                  </div>
                )}
              </div>
              <div className="py-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">GSC:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      formData.gscConnected
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {formData.gscConnected ? "Connected" : "Not connected"}
                  </span>
                </div>
                {formData.gscConnected && (
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    <p className="break-words">{formData.gscSiteUrl}</p>
                    {formData.gscEmail && <p>as {formData.gscEmail}</p>}
                  </div>
                )}
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-700">Keywords:</span>
                <span className="text-gray-900">
                  {formData.targetKeywords.length > 0
                    ? formData.targetKeywords.join(", ")
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-700">Competitors:</span>
                <span className="text-gray-900">
                  {formData.competitorDomains.length > 0
                    ? formData.competitorDomains.join(", ")
                    : "None"}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.runInitialAudit}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      runInitialAudit: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-brand-blue3 border-gray-300 rounded "
                />
                <span className="text-sm text-gray-700">
                  Run Initial Site Audit Now
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.startKeywordTracking}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startKeywordTracking: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-brand-blue3 border-gray-300 rounded "
                />
                <span className="text-sm text-gray-700">
                  Start Tracking Keywords Now
                </span>
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-md hover:from-brantext-brand-blue3 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Project & Start SEO Scan
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepData = steps.find((step) => step.id === currentStep);

  return (
    <Modal
      open={modalOpen}
      footer={null}
      onCancel={() => setModalOpen(false)}
      centered
      width={""}
      className="flex items-center justify-center"
    >
      <div className=" flex items-center justify-center">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress Bar */}
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`
                    relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }
                  `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`
                      w-16 h-1 mx-2 transition-all duration-300
                      ${currentStep > step.id ? "bg-blue-500" : "bg-gray-200"}
                    `}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentStepData?.title}
              </h1>
              <p className="text-gray-600">{currentStepData?.subtitle}</p>
            </div>

            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              {renderStepContent()}
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-6 py-3 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex gap-3">
                {currentStepData &&
                  !currentStepData.required &&
                  currentStep !== 6 && (
                    <button
                      onClick={skipStep}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Skip
                    </button>
                  )}

                {currentStep < steps.length ? (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-brantext-brand-blue3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
