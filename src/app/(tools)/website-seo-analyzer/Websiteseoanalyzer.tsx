
"use client"

import { motion } from "framer-motion";
import { AlertOctagon, AlertTriangle, Check, ChevronDown, ChevronUp, Download, Info, Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from "react";
import { FaCheckCircle, FaFacebook, FaInstagram, FaLinkedin, FaPinterest, FaWhatsapp, FaYoutube } from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { toast } from "sonner";
// import { analyzeWebsite } from "@/util/serveraction";
import { Spin } from "antd";
import axios from "axios";
import Cookies from 'js-cookie';
import Image from "next/image";
import Link from "next/link";
import { PiArrowBendLeftUpBold } from "react-icons/pi";
// import { Line, Doughnut } from "react-chartjs-2"
import { RxMobile } from "react-icons/rx";
import { SlScreenDesktop } from "react-icons/sl";
import { BASE_URL_WR } from "@/src/util/api";
import {
    ArcElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { FaXTwitter } from 'react-icons/fa6';
import { CollapsibleLinks } from "./collapsible-links";


ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)

interface SEOAnalysisProps {
    result: {
        title: {
            content: string
            length: number
            optimal_length: boolean
            pixel_width: number
            optimal_pixel_width: boolean
        }
        meta_description: {
            content: string
            length: number
            optimal_length: boolean
            pixel_width: number
            optimal_pixel_width: boolean
        }
        word_count: number
        indexing: {
            canonical_tag: string
            canonical_tag_message: string
            noindex_tag: boolean
            noindex_tag_message: string
            robots_txt: boolean
            robots_txt_message: string
            xml_sitemap: boolean
            xml_sitemap_message: string
            favicon_found: boolean
            favicon_message: string
            iframes_used: boolean
            iframes_message: string
            email_privacy: boolean
            email_privacy_message: string
        }
        analyze_accessibility: {
            friendly_links: boolean
            friendly_links_message: string
            legible_font_sizes: boolean
            legible_font_sizes_message: string
        }
        schema_message: string
        security: {
            ssl_enabled: boolean
            ssl_message: string
            https_redirect: boolean
            https_redirect_message: string
        }
        performance: {
            h1_tag: boolean
            header_tags_frequency: {
                h2: number
                h3: number
                h4: number
                h5: number
                h6: number
            }
            images_without_alt: number
            images_alt_attribute_message: string
            images_without_alt_urls: string[]
        }
        href: {
            hreflang_usage: boolean
            language: string
        }
        analytics_flash: {
            analytics: string
            flash_content: string
        }
        social_media: Array<{
            platform: string
            found: boolean
            links: string[]
        }>
        seo_score: number
    }
}
const ProgressCircle = ({ value, total, label, category }: { value: number; total: number; label: string; category: string }) => {
    const [animatedPercentage, setAnimatedPercentage] = useState(0)

    const percentage = (value / total) * 100
    const radius = 80
    const strokeWidth = 15
    const circumference = 2 * Math.PI * radius
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedPercentage(percentage)
        }, 100)
        return () => clearTimeout(timer)
    }, [percentage])
    const strokeDasharray = `${(animatedPercentage * circumference) / 100} ${circumference}`
    const getColor = () => {
        switch (category) {
            case 'Excellent':
                return "#008ccd"
            case 'Good':
                return "#008ccd"
            case 'Needs Improvement':
                return "#008ccd"
            default:
                return "#008ccd"
        }
    }

    return (
        <div className="flex flex-col w-full items-center rounded-md p-4 shadow-2 hover:scale-105 smooth3 hover:shadow-lg 2xl:min-w-[241px]">
            <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
                <svg className="transform -rotate-90" width={radius * 2} height={radius * 2}>
                    <circle
                        cx={radius}
                        cy={radius}
                        r={radius - strokeWidth / 2}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={radius}
                        cy={radius}
                        r={radius - strokeWidth / 2}
                        fill="none"
                        stroke={getColor()}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{value}</span>
                    <span className="text-sm text-gray-500">{total !== 100 ? `of ${total}` : '%'}</span>
                </div>
            </div>
            <div className="mt-2 text-center">
                <div className="font-medium">{label}</div>
                <div className="text-sm font-semibold" style={{ color: getColor() }}>{category}</div>
            </div>
        </div>
    )
}
const analyzeResults = (result: any) => {
    let excellent = 0
    let good = 0
    let needsImprovement = 0
    let total = 0
    const checkItem = (item: boolean | string, invertLogic = false) => {
        total++
        if (typeof item === 'boolean') {
            if (item !== invertLogic) excellent++
            else needsImprovement++
        } else if (typeof item === 'string') {
            if (item.toLowerCase().includes('not found') || item.toLowerCase().includes('missing')) {
                needsImprovement++
            } else {
                excellent++
            }
        }
    }
    // Title
    checkItem(result?.title?.optimal_length)
    checkItem(result?.title?.optimal_pixel_width)
    // Meta Description
    checkItem(result?.meta_description?.optimal_length)
    checkItem(result?.meta_description?.optimal_pixel_width)
    // Indexing
    checkItem(result?.indexing?.noindex_tag)
    checkItem(result?.indexing?.robots_txt)
    checkItem(result?.indexing?.xml_sitemap)
    checkItem(result?.indexing?.favicon_found)
    checkItem(result?.indexing?.iframes_used, true) // Invert logic as iframes are discouraged
    checkItem(result?.indexing?.email_privacy)
    // Accessibility
    checkItem(result?.analyze_accessibility?.friendly_links)
    checkItem(result?.analyze_accessibility?.legible_font_sizes)
    // Security
    checkItem(result?.security?.ssl_enabled)
    checkItem(result?.security?.https_redirect)
    // Performance
    checkItem(result?.performance?.h1_tag)
    checkItem(result?.performance?.images_without_alt === 0)
    // Href
    checkItem(result?.href?.hreflang_usage)
    // Analytics
    checkItem(result?.analytics_flash?.analytics)
    checkItem(result?.analytics_flash?.flash_content)
    // Social Media
    result?.social_media?.forEach((platform: any) => checkItem(platform.found))
    const excellentThreshold = 0.8 * total
    const goodThreshold = 0.6 * total
    if (excellent >= excellentThreshold) {
        // Keep as excellent
    } else if (excellent >= goodThreshold) {
        good += excellent
        excellent = 0
    } else {
        needsImprovement += excellent
        excellent = 0
    }
    return { excellent, good, needsImprovement, total }
}
const MetricInfo = {
    FCP: { title: 'First Contentful Paint', description: 'Time to first content render', good: 1.8, needsImprovement: 3 },
    SI: { title: 'Speed Index', description: 'How quickly content is visually displayed', good: 3.4, needsImprovement: 5.8 },
    LCP: { title: 'Largest Contentful Paint', description: 'Largest content element load time', good: 2.5, needsImprovement: 4 },
    CLS: { title: 'Cumulative Layout Shift', description: 'Measure of layout stability', good: 0.1, needsImprovement: 0.25 },
    FID: { title: 'First Input Delay', description: 'Time from first interaction to response', good: 100, needsImprovement: 300 },
}
export default function SiteAudit() {
    const [showImageAlts, setShowImageAlts] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isDaAnalyzing, setIsdaAnalyzing] = useState(false)
    const [isLinkAnalyzing, setIsLinkAnalyzing] = useState(false)
    const [isDomainAnalyzing, setIsDomainAnalyzing] = useState(false)
    const [isSpeedAnalyzing, setIsSpeedAnalyzing] = useState(false)
    const [isExportingPdf, setIsExportingPdf] = useState(false)
    const [openTags, setOpenTags] = useState<Record<string, boolean>>({});
    const toggleTag = (tag: string) => {
        setOpenTags(prev => ({ ...prev, [tag]: !prev[tag] }));
    };

    const [url, setUrl] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('auditurl');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    })
    const [responseData, setResponseData] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('daPaResult');
            return saved ? JSON.parse(saved) : null;
        }
        return [];
    });
    const [result, setResult] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('analysisResult');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });
    const texts = result?.performance.header_tags_texts || {};

    const [analyseLink, setAnalyzeLink] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('linkanalysisResult');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });
    const [domianDetails, setdomianDetails] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('domianDetails');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });
    const [pageSpeed, setPageSpeed] = useState<any>(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('speedDetails');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });
    const [social, setsocial] = useState<any>();
    useEffect(() => {
        if (result) {
            sessionStorage.setItem('analysisResult', JSON.stringify(result));
        }
        if (url) {
            sessionStorage.setItem('auditurl', JSON.stringify(url));
        }
        if (responseData) {
            sessionStorage.setItem('daPaResult', JSON.stringify(responseData));
        }
        if (analyseLink) {
            sessionStorage.setItem('linkanalysisResult', JSON.stringify(analyseLink));
        }
        if (domianDetails) {
            sessionStorage.setItem('domianDetails', JSON.stringify(domianDetails));
        }
        if (pageSpeed) {
            sessionStorage.setItem('speedDetails', JSON.stringify(pageSpeed));
        }
    }, [result, url, responseData, analyseLink, domianDetails, pageSpeed]);

    const renderSection = (title: string, content: React.ReactNode, optimal: boolean, link: any) => (
        <div className="bg-white p-6 rounded-lg shadow-sm border overflow-hidden">
            <div className="flex items-center gap-2 mb-4 w-full relative">
                <div className="w-6 h-6 rounded-full bg- flex items-center justify-center">
                    {optimal ? (
                        <FaCheckCircle className="text-xl text-brand-blue1" />
                    ) : (
                        <MdCancel className="text-2xl text-red-500" />
                    )}
                </div>
                <h3 className="font-semibold text-homeblack text-lg">{title}</h3>
                {link ?
                    <Link
                        href={link}
                        className="flex items-end  px-4 py-2 bg-brand-blue1 text-white rounded-md justify-end right-0 absolute hover:scale-105 smooth3 ">Detailed Analysis</Link>
                    : ""}
            </div>
            <div className="space-y-4 border rounded-md px-8 py-4">
                {content}
            </div>
        </div>
    )

    const [showInternalLinks, setShowInternalLinks] = useState(false);
    const [showExternalLinks, setShowExternalLinks] = useState(false);
    const [showBrokenLinks, setShowBrokenLinks] = useState(false);
    const [showdomianDetails, setShowdomianDetails] = useState(false);
    const [strategy, setStrategy] = useState("desktop");

    const normalizeURL = (url: string) => {
        if (!url) return "";
        // Trim spaces and check if starts with http:// or https://
        if (!/^https?:\/\//i.test(url)) {
            return `https://${url}`;
        }
        return url;
    };


    const handledapaAnalyze = async () => {
        if (!url) {
            toast.error("Please enter a website URL");
            return;
        }
        const normalizedUrl = normalizeURL(url);
        // Validate after normalization
        if (!validateURL(normalizedUrl)) {
            toast.error("Please enter a valid URL");
            return;
        }
        const access_token = Cookies.get("login_access_token_wrank");
        const headers = {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        };
        try {
            setIsAnalyzing(true);
            setIsdaAnalyzing(true);
            setIsLinkAnalyzing(true);
            setIsDomainAnalyzing(true);
            const seoAnalysis = await axios.post(`${BASE_URL_WR}seo-check/`, { url: normalizedUrl }, { headers });
            setResult(seoAnalysis.data);
            setIsdaAnalyzing(false);
            const domainDetails = await axios.post(`${BASE_URL_WR}domain-details/`, { url: normalizedUrl });
            setdomianDetails(domainDetails.data);
            setIsDomainAnalyzing(false);
            const linkAnalysis = await axios.post(`${BASE_URL_WR}link-analyzer/`, { url: normalizedUrl });
            setAnalyzeLink(linkAnalysis.data.data);
            setIsLinkAnalyzing(false);
            toast.success("Website analysis completed successfully!");
        } catch (error) {
            console.error("Error analyzing website:", error);
            toast.error("Failed to analyze the website. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };


    const findSpeed = async (strategy: any) => {
        const normalizedUrl = normalizeURL(url);
        try {
            setIsSpeedAnalyzing(true);
            const pageSpeedDetails = await axios.post(`${BASE_URL_WR}page-speed/`, { url: normalizedUrl, strategy });
            setPageSpeed(pageSpeedDetails.data);
        } catch (error) {
            console.error("Error fetching page speed details:", error);
        } finally {
            setIsSpeedAnalyzing(false);
        }
    };

    const { excellent, good, needsImprovement, total } = analyzeResults(result)
    const getSEOScoreCategory = (score: number) => {
        if (score >= 80) return 'Excellent'
        if (score >= 60) return 'Good'
        return 'Needs Improvement'
    }
    const progressData = [
        {
            value: excellent,
            total,
            label: excellent > 0 ? "High-Quality Factors" : "No High-Quality Factors",
            category: excellent > 0 ? "Excellent" : "Needs Improvement",
        },
        {
            value: good,
            total,
            label: "Moderate Quality Factors",
            category: "Good",
        },
        {
            value: needsImprovement,
            total,
            label: "Areas Needing Improvement",
            category: "Needs Improvement",
        },
    ];
    const maxFrequency = Math.max(
        result?.performance?.header_tags_frequency?.h2,
        result?.performance?.header_tags_frequency?.h3,
        result?.performance?.header_tags_frequency?.h4,
        result?.performance?.header_tags_frequency?.h5,
        result?.performance?.header_tags_frequency?.h6
    )
    const maxKeywordFrequency = useMemo(() => {
        // Check if result?.keyword_consistency is defined and not null
        const keywordConsistency = result?.keyword_consistency || {};
        return Math.max(...Object.values(keywordConsistency).map((data: any) => data.page_frequency));
    }, [result?.keyword_consistency]);
    const maxBigramFrequency = useMemo(() => {
        // Check if result?.bigram_consistency is defined and not null
        const bigramConsistency = result?.bigram_consistency || [];
        return Math.max(...bigramConsistency.map((data: any) => data.page_frequency));
    }, [result?.bigram_consistency]);
    const [error, setError] = useState<any>('');

    const validateURL = (url: string) => {
        const urlRegex = new RegExp(
            "^(https?:\\/\\/)" +
            "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*\\.)+[a-zA-Z]{2,}|" +
            "((\\d{1,3}\\.){3}\\d{1,3}))|" +
            "\\[([a-fA-F\\d:]+)\\])" +
            "(:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*" +
            "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" +
            "(#[-a-zA-Z\\d_]*)?$", "i"
        );
        return urlRegex.test(url);
    };
    const handleChange = (e: any) => {
        const value = e.target.value.trim();
        setUrl(value);
        setError("");
    };


    const getScoreColor = (score: number) => {
        if (score >= 90) return "#22c55e"
        if (score >= 50) return "#f59e0b"
        return "#ef4444"
    }
    const getScoreIcon = (score: number) => {
        if (score >= 90) return <Check className="w-5 h-5 text-green-500" />
        if (score >= 50) return <AlertTriangle className="w-5 h-5 text-yellow-500" />
        return <AlertOctagon className="w-5 h-5 text-red-500" />
    }
    const MetricProgressBar = ({ value, max, good, needsImprovement }: {
        value: number,
        max: number,
        good: number,
        needsImprovement: number
    }) => {
        const percentage = (value / max) * 100
        const getColor = () => {
            if (value <= good) return "bg-green-500"
            if (value <= needsImprovement) return "bg-yellow-500"
            return "bg-red-500"
        }
        return (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1 smooth3">
                <div
                    className={`h-2.5 rounded-full smooth3 ${getColor()}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        )
    }
    const ScoreCircle = ({ score, label }: { score: number; label: string }) => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border"
        >
            <div className="relative mb-2">
                <svg className="w-24 h-24 smooth3">
                    <circle
                        className="text-gray-200 smooth3"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="44"
                        cx="48"
                        cy="48"
                    />
                    <circle
                        className="text-blue smooth3"
                        strokeWidth="8"
                        strokeLinecap="round"
                        stroke={getScoreColor(score)}
                        fill="transparent"
                        r="44"
                        cx="48"
                        cy="48"
                        style={{
                            strokeDasharray: `${2 * Math.PI * 44}`,
                            strokeDashoffset: `${2 * Math.PI * 44 * (1 - score / 100)}`,
                            transformOrigin: "50% 50%",
                            transform: "rotate(-90deg)",
                        }}
                    />
                </svg>
                <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">
                    {score?.toFixed(0)}
                </span>
            </div>
            <span className="text-sm font-medium ">{label}</span>
        </motion.div>
    )
    const MetricCard = ({ metric, value }: { metric: keyof typeof MetricInfo, value: number }) => {

        const info = MetricInfo[metric]
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-lg shadow-sm border"
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-medium text-gray-900">{info.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                    </div>
                    <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                <div className="space-y-4">
                    <MetricProgressBar
                        value={value}
                        max={info.needsImprovement * 1.5}
                        good={info.good}
                        needsImprovement={info.needsImprovement}
                    />
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{value?.toFixed(2)} {metric === 'FID' ? 'ms' : 's'}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Target: {`< ${info.good}${metric === 'FID' ? 'ms' : 's'}`}</span>
                            {getScoreIcon(value <= info.good ? 100 : value <= info.needsImprovement ? 50 : 0)}
                        </div>
                    </div>
                </div>
            </motion.div>
        )
    }
    const platformIcons: { [key: string]: any } = {
        facebook: <FaFacebook className="text-[#1877F2]" />,
        instagram: <FaInstagram className="text-[#E1306C]" />,
        linkedin: <FaLinkedin className="text-[#0A66C2]" />,
        youtube: <FaYoutube className="text-[#FF0000]" />,
        whatsapp: <FaWhatsapp className="text-[#25D366]" />,
        pinterest: <FaPinterest className="text-[#E60023]" />,
        twitter: <FaXTwitter className="text-[black]" />,
    };
    const allApisDone =
        !!result &&
        !isAnalyzing &&
        !isDaAnalyzing &&
        !isLinkAnalyzing &&
        !isDomainAnalyzing &&
        !isSpeedAnalyzing;

    const reportRef = useRef<HTMLDivElement | null>(null);

    const handleDownload = async () => {
        if (!allApisDone) {
            toast.info('Please wait until all checks are finished before exporting.');
            return;
        }

        const element = reportRef.current;
        if (!element) {
            toast.error('Run an analysis before downloading the report.');
            return;
        }

        let cleanupFrame: (() => void) | null = null;

        try {
            setIsExportingPdf(true);
            if (typeof document === 'undefined' || typeof window === 'undefined') {
                throw new Error('BROWSER_ONLY_FEATURE');
            }

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.setAttribute('aria-hidden', 'true');
            document.body.appendChild(iframe);
            cleanupFrame = () => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            };

            const printWindow = iframe.contentWindow;
            const printDoc = printWindow?.document;

            if (!printWindow || !printDoc) {
                throw new Error('PRINT_WINDOW_UNAVAILABLE');
            }

            printDoc.open();
            printDoc.write('<!doctype html><html><head><title>Wranker SEO Report</title></head><body></body></html>');
            printDoc.close();

            const styleNodes = document.head.querySelectorAll('style, link[rel=\"stylesheet\"]');
            const pendingStyles: Promise<void>[] = [];

            styleNodes.forEach((node) => {
                const clone = node.cloneNode(true) as HTMLElement;
                if (clone.tagName === 'LINK') {
                    pendingStyles.push(
                        new Promise<void>((resolve) => {
                            const link = clone as HTMLLinkElement;
                            link.addEventListener('load', () => resolve(), { once: true });
                            link.addEventListener('error', () => resolve(), { once: true });
                        }),
                    );
                }
                printDoc.head.appendChild(clone);
            });

            const clonedReport = element.cloneNode(true) as HTMLElement;
            clonedReport.style.padding = '32px';
            clonedReport.style.boxSizing = 'border-box';
            clonedReport.style.maxWidth = '100%';
            clonedReport.style.margin = '0 auto';

            const baseUrl = window.location.origin;
            const logoSrc = `${baseUrl}/wranker-logo.svg`;
            const formattedTimestamp = new Date().toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
            });

            const readableUrl = (() => {
                if (!url) return 'N/A';
                try {
                    const normalized = url.startsWith('http') ? url : `https://${url}`;
                    const parsed = new URL(normalized);
                    return parsed.hostname.replace(/^www\./, '');
                } catch {
                    return url;
                }
            })();

            const header = printDoc.createElement('header');
            header.className = 'wr-print-header';
            header.innerHTML = `
                <div class="wr-print-logo">
                    <img src="/wranker-logo.png" alt="Wranker logo" />
                    <div>
                        <p class="wr-print-label">Wranker SEO Analyzer</p>
                        <p class="wr-print-value">${readableUrl}</p>
                    </div>
                </div>
                <div class="wr-print-meta">
                    <p>Generated on ${formattedTimestamp}</p>
                    <p>Comprehensive website performance overview</p>
                </div>
            `;

            const footer = printDoc.createElement('footer');
            footer.className = 'wr-print-footer';
            footer.innerHTML = `
                <div>
                    <strong>Wranker</strong> - Data-driven SEO, monitoring & reporting platform
                </div>
                <div class="wr-print-footer-meta">
                    <span>wranker.com</span>
                    <span>support@wranker.com</span>
                    <span>(c) ${new Date().getFullYear()} Wranker Inc.</span>
                </div>
            `;

            const chromeStyles = printDoc.createElement('style');
            chromeStyles.textContent = `
                body {
                    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                    background: #f8fafc;
                    color: #0f172a;
                    margin: 0;
                }
                .wr-print-container {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    background: #ffffff;
                }
                .wr-print-header,
                .wr-print-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 16px 32px;
                    color: #0f172a;
                    border-bottom: 1px solid #e2e8f0;
                }
                .wr-print-header {
                    padding-bottom: 12px;
                    margin-bottom: 12px;
                }
                .wr-print-footer {
                    flex-direction: column;
                    align-items: flex-start;
                    row-gap: 6px;
                    border-top: 1px solid #e2e8f0;
                    border-bottom: none;
                    margin-top: 32px;
                    font-size: 11px;
                    color: #475569;
                }
                .wr-print-footer-meta {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .wr-print-logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .wr-print-logo img {
                    height: 40px;
                    width: auto;
                }
                .wr-print-label {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin: 0;
                    color: #64748b;
                }
                .wr-print-value {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 1px 0 0;
                    color: #0f172a;
                }
                .wr-print-meta {
                    text-align: right;
                    font-size: 12px;
                    color: #475569;
                }
                .wr-print-meta p {
                    margin: 0;
                }
                .wr-print-main {
                    flex: 1;
                    padding: 0 32px 24px;
                }
                @media print {
                    .wr-print-header {
                        page-break-after: avoid;
                    }
                    .wr-print-footer {
                        page-break-before: avoid;
                    }
                    .wr-print-main {
                        padding-bottom: 0;
                    }
                }
            `;

            const main = printDoc.createElement('main');
            main.className = 'wr-print-main';
            main.appendChild(clonedReport);

            const container = printDoc.createElement('div');
            container.className = 'wr-print-container';
            container.appendChild(header);
            container.appendChild(main);
            container.appendChild(footer);

            printDoc.head.appendChild(chromeStyles);
            printDoc.body.appendChild(container);
            printDoc.body.className = document.body.className;
            printDoc.documentElement.className = document.documentElement.className;

            if (pendingStyles.length) {
                await Promise.race([
                    Promise.allSettled(pendingStyles),
                    new Promise((resolve) => setTimeout(resolve, 1200)),
                ]);
            }

            printWindow.focus();
            printWindow.print();
            toast.success('Print dialog opened. Choose "Save as PDF" to download the report.');

            setTimeout(() => {
                cleanupFrame?.();
                cleanupFrame = null;
            }, 1000);
        } catch (error) {
            console.error('PDF export failed', error);
            toast.error('Unable to open the print dialog. Please try again.');
        } finally {
            if (cleanupFrame) {
                cleanupFrame();
                cleanupFrame = null;
            }
            setIsExportingPdf(false);
        }
    };


    return (
        <div className="min-h-screen">
            <div
                className="mx-auto  space-y-4 ">
                {/* <h3 className="text-3xl md:text-4xl font-bold  text-blue md:text-start text-center">Site Audit</h3> */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className='shadowop p-10 flex flex-col gap-2 rounded-lg z-10'>
                    <label htmlFor="website-url" className="block text-lg font-medium text-gray-700">
                        Get a detailed SEO overview.
                    </label>
                    <div className="flex flex-col md:flex-row gap-4 ">
                        <div className="w-full md:w-2/3 lg:w-1/2">
                            <input
                                type="text"
                                placeholder="Enter website URL"
                                className="w-full px-4 py-3 rounded-lg outline text-homeblack"
                                value={url}
                                onChange={handleChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handledapaAnalyze();
                                        findSpeed("desktop");
                                    }
                                }}
                            />
                        </div>
                        <div className="flex gap-4">

                            <button
                                onClick={() => {
                                    handledapaAnalyze();
                                    findSpeed("desktop");
                                }}
                                disabled={isAnalyzing || error || !url}
                                className="px-8 py-2 bg-brand-blue1 text-white rounded-lg flex items-center gap-2 hover:scale-105 smooth3 transition-colors disabled:cursor-not-allowed"
                            >
                                {isAnalyzing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="w-4 h-4" />
                                        Search
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    <p className=" flex gap-2 items-center"><span className="flex items-center text-blue gap-1 font-bold "> <PiArrowBendLeftUpBold className="font-bold text-xl" /> Get started: </span> Enter in a URL and hit Search to find out the SEO overview of your website.</p>
                    {result && (
                        <div
                            ref={reportRef}
                            id="wranker-report"
                            className="space-y-8 max-w-screen mt-3">
                            <div className="">
                                <div className='flex justify-between items-center'>
                                    <h2 className="text-xl font-semibold mb-4 text-black">1. Overall SEO Performance</h2>
                                    <button
                                        type="button"
                                        className="bg-brand-blue1 text-white border-none py-2 px-4 text-center text-base m-1 cursor-pointer rounded disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                        onClick={handleDownload}
                                        disabled={!allApisDone || isExportingPdf}
                                        aria-disabled={!allApisDone || isExportingPdf}
                                        title={!allApisDone ? "Generating... Please wait for all data to load." : isExportingPdf ? "Opening print dialog..." : "Open the print dialog to save the report as PDF"}
                                    >
                                        {isExportingPdf ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Opening print dialog...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                <span>Download / Print PDF</span>
                                            </>
                                        )}
                                    </button>

                                </div>
                                <div className="flex justify-between">
                                    <div className="flex flex-1 justify-between gap-6 items-center 2xl:flex-row flex-col">
                                        <div className="flex gap-4 md:flex-row flex-col w-full justify-between">
                                            <ProgressCircle
                                                value={result.seo_score}
                                                total={100}
                                                label="Overall SEO Score"
                                                category={getSEOScoreCategory(result.seo_score)}
                                            />
                                            {progressData.map((data, index) => (
                                                <ProgressCircle key={index} {...data} />
                                            ))}
                                        </div>
                                        <div className="flex flex-col p-6 rounded-lg text-black relative overflow-hidden shadow-2 w-full h-full potential_bg hover:scale-105 smooth3">

                                            {isDaAnalyzing && <Spin />}
                                            {!isDaAnalyzing && responseData?.map((item: any, index: any) => (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 100, scale: 0.7 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{ duration: 0.1 }}
                                                    key={index}
                                                    className="bg-white/80 p-6 border rounded-lg shadow-md transition-transform transform smooth3  w-full "
                                                >
                                                    <h3 className="text-xl font-semibold text-gray-800 mb-4">{item.domain}</h3>
                                                    <div className="text-sm  space-y-2">

                                                        <p className="flex items-center text-gray-700">
                                                            <strong className="mr-2 text-gray-900">DA:</strong> {item.DA}
                                                        </p>
                                                        <p className="flex items-center text-gray-700">
                                                            <strong className="mr-2 text-gray-900">PA:</strong> {item.PA}
                                                        </p>
                                                        <p className="flex items-center text-gray-700">
                                                            <strong className="mr-2 text-gray-900">Spam Score:</strong> {item.spam_score}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-black">2. Content</h2>
                                <div className="grid md:grid-cols-2 gap-6  rounded-md">
                                    {renderSection("Title Tag", (
                                        <>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Title Tag:</div>
                                                <div>{result.title?.content ? result.title?.content : "Not Found"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Length:</div>
                                                <div>{result.title?.length ? result.title?.length : "0"} Character(s)</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Pixel Width:</div>
                                                <div>{result.title?.pixel_width ? result.title?.pixel_width : "0"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Word Count On Page:</div>
                                                <div>{result.word_count ? result.word_count : "0"} Word(s)</div>
                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Limit title tags to 55 characters</div>
                                                <div>• Place your core keyword at the start of your title tag, if possible</div>
                                                <div>• Make title tags transparent, but also enticing for your audience</div>
                                            </div>
                                        </>
                                    ), result.title?.optimal_length, null)}
                                    {renderSection("Meta Description", (
                                        <>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Meta Description:</div>
                                                <div>{result.meta_description?.content ? result.meta_description?.content : "Not Found"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Length:</div>
                                                <div>{result.meta_description?.length ? result.meta_description?.length : "0"} Character(s)</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Pixel Width:</div>
                                                <div>{result.meta_description?.pixel_width ? result.meta_description?.pixel_width : "0"}</div>
                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Limit meta descriptions to 155 characters</div>
                                                <div>• Use action-oriented language that compels the user to click</div>
                                                <div>• Provide a concise summary of the page content</div>
                                            </div>
                                        </>
                                    ), result.meta_description?.optimal_length, null)}
                                    {renderSection("Indexing", (
                                        <>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Canonical Tag:</div>
                                                <div>{result.indexing.canonical_tag ? result.indexing.canonical_tag : "Not Found"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Robots.txt:</div>
                                                <div>{result.indexing.robots_txt_message ? result.indexing.robots_txt_message : "Not Found"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">XML Sitemap:</div>
                                                <div>{result.indexing.xml_sitemap_message ? result.indexing.xml_sitemap_message : "Not Found"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Favicon:</div>
                                                <div className="flex items-center gap-2">
                                                    {result?.indexing?.favicon_message ? (
                                                        <img
                                                            src={result.indexing.favicon_message}
                                                            alt="favicon"
                                                            className="w-5 h-5"
                                                        />
                                                    ) :
                                                        (
                                                            <img
                                                                src="path_to_default_favicon.ico" // Provide path to a default favicon if not found
                                                                alt="default favicon"
                                                                className="w-5 h-5"
                                                            />
                                                        )}
                                                    <span>{result?.indexing?.favicon_message ? `${result.indexing.favicon_message}` : "Not Found"}</span>
                                                </div>                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">iFrames:</div>
                                                <div>{result.indexing.iframes_message ? result.indexing.iframes_message : "Not Found"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Email Privacy Message:</div>
                                                <div>{result.indexing.email_privacy_message ? result.indexing.email_privacy_message : "Not Found"}</div>
                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Ensure your canonical tag is correctly set</div>
                                                <div>• Make sure robots.txt and XML sitemap are present and properly configured</div>
                                                <div>• Check for any unintended noindex tags</div>
                                            </div>
                                        </>
                                    ), result.indexing.noindex_tag, null)}
                                    {renderSection("Performance", (
                                        <>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">H1 Tag:</div>
                                                {/* <div>{result?.performance.h1_tag ? "Present" : "Missing"}</div> */}
                                                <div>{result?.performance.h1_tag}</div>
                                            </div>
                                            <div className="mt-4">
                                                <div className="text-sm text-homeblack font-semibold mb-2">H1-H6 Header Tag Usage</div>
                                                <div className="border rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-gray-50">
                                                                <th className="text-left p-3 text-sm font-medium ">Header Tag</th>
                                                                <th className="text-left p-3 text-sm font-medium ">Frequency</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.entries(result?.performance.header_tags_frequency).map(([tag, count]: any) => (
                                                                <tr key={tag} className="border-t">
                                                                    <td className="p-3 flex justify-center items-start text-sm">{tag.toUpperCase()}</td>
                                                                    <td className="p-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm w-6">{count}</span>
                                                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                                <div
                                                                                    className="bg-brand-blue1 h-2 rounded-full transition-all duration-500"
                                                                                    style={{
                                                                                        width: maxFrequency ? `${(count / maxFrequency) * 100}%` : '0%'
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            {texts[tag]?.length > 0 && (
                                                                                <button
                                                                                    onClick={() => toggleTag(tag)}
                                                                                    className="ml-4 text-xs text-purple hover:underline">
                                                                                    {openTags[tag] ? "Hide Context" : "View Context"}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        {openTags[tag] && texts[tag]?.length > 0 && (
                                                                            <div className="bg-slate-200 mt-2 p-3 rounded-lg">
                                                                                <ol className="ml-4 list-decimal text-sm text-gray-700">
                                                                                    {texts[tag].map((text: string, idx: number) => (
                                                                                        <li key={idx}>{text}</li>
                                                                                    ))}
                                                                                </ol>
                                                                            </div >
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Images without Alt Text:</div>
                                                <div>{result?.performance.images_alt_attribute_message}</div>
                                            </div>
                                            <div className="w-full !via-gray-600">
                                                <div className="text-sm text-homeblack font-semibold">Images without Alt URLs:</div>
                                                <ul className="list-disc w-full pl-5 break-words">
                                                    {result?.performance.images_without_alt_urls?.slice(0, showImageAlts ? undefined : 1).map((url: any, index: number) => (
                                                        <li key={index} className="break-words">{url}</li>
                                                    ))}

                                                    {result?.performance.images_without_alt_urls?.length > 1 && (
                                                        <li
                                                            onClick={() => setShowImageAlts(!showImageAlts)}
                                                            className="flex items-center hover:underline font-semibold cursor-pointer text-pink-600 mt-2"
                                                        >
                                                            {showImageAlts
                                                                ? 'Show less'
                                                                : `${result.performance.images_without_alt_urls.length - 1} more`}
                                                            {showImageAlts ? (
                                                                <ChevronUp className="w-4 h-4 ml-1" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 ml-1" />
                                                            )}
                                                        </li>
                                                    )}
                                                </ul>

                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Use a single H1 tag on each page</div>
                                                <div>• Provide alt text for all images</div>
                                                <div>• Optimize images and use lazy loading where appropriate</div>
                                            </div>
                                        </>
                                    ), result?.performance.h1_tag, "/image-alt-text-checker")}
                                    {renderSection("Accessibility", (
                                        <>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Friendly Links:</div>
                                                <div>{result.analyze_accessibility.friendly_links_message}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Legible Font Sizes:</div>
                                                <div>{result.analyze_accessibility.legible_font_sizes_message}</div>
                                                {/* Conditionally render small font details if they exist */}
                                                {result.analyze_accessibility.small_font_details && result.analyze_accessibility.small_font_details.length > 0 && (
                                                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                                        <div className="font-medium">Small font elements found:</div>
                                                        <ul className="list-disc pl-5">
                                                            {result.analyze_accessibility.small_font_details.map((detail: { size: string; element: string; text_sample: string },
                                                                index: number) => (
                                                                <li key={index}>
                                                                    <span className="font-semibold">{detail.size}</span>:-
                                                                    {detail.element} tag - &quot;{detail.text_sample}&quot;
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Schema:</div>
                                                <div>{result.schema_message}</div>
                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Use descriptive and friendly link text</div>
                                                <div>• Ensure all font sizes are legible across devices</div>
                                                <div>• Implement proper heading structure (H1, H2, H3, etc.)</div>
                                            </div>
                                        </>
                                    ), result.analyze_accessibility.friendly_links && result.analyze_accessibility.legible_font_sizes, null)}

                                    {renderSection("Link Analysis",
                                        isLinkAnalyzing ? <Spin /> :
                                            analyseLink ? (
                                                analyseLink.error ? (
                                                    <div className="text-homegrey">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <AlertTriangle className="w-5 h-5 text-[#64748B]" />
                                                            <div className="font-semibold">Link Analysis Failed</div>
                                                        </div>

                                                    </div>
                                                ) : (
                                                    <>
                                                        <div>
                                                            <div className="text-sm text-homeblack font-semibold">Internal Links:</div>
                                                            {!analyseLink.internal_links || analyseLink.internal_links.length === 0 ? (
                                                                <div className="">Not Found</div>
                                                            ) : (
                                                                <ul className="list-disc pl-5">
                                                                    {analyseLink.internal_links.slice(0, 1).map((link: any, index: any) => (
                                                                        <li key={index}>{link}</li>
                                                                    ))}
                                                                    {showInternalLinks && analyseLink.internal_links.slice(1).map((link: any, index: any) => (
                                                                        <li key={index}>{link}</li>
                                                                    ))}
                                                                    {analyseLink.internal_links.length > 1 && (
                                                                        <li
                                                                            onClick={() => setShowInternalLinks(!showInternalLinks)}
                                                                            className="flex items-center font-semibold cursor-pointer text-pink smooth1 hover:underline"
                                                                        >
                                                                            {showInternalLinks ? (
                                                                                <>
                                                                                    Show less <ChevronUp className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {analyseLink.internal_links.length - 1} more <ChevronDown className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            )}
                                                                        </li>
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-homeblack font-semibold">External Links:</div>
                                                            {!analyseLink.external_links || analyseLink.external_links.length === 0 ? (
                                                                <div className="">Not Found</div>
                                                            ) : (
                                                                <ul className="list-disc pl-5">
                                                                    {analyseLink.external_links.slice(0, 1).map((link: any, index: any) => (
                                                                        <li key={index}>{link}</li>
                                                                    ))}
                                                                    {showExternalLinks && analyseLink.external_links.slice(1).map((link: any, index: any) => (
                                                                        <li key={index}>{link}</li>
                                                                    ))}
                                                                    {analyseLink.external_links.length > 1 && (
                                                                        <li
                                                                            onClick={() => setShowExternalLinks(!showExternalLinks)}
                                                                            className="flex items-center font-semibold cursor-pointer text-pink smooth1 hover:underline"
                                                                        >
                                                                            {showExternalLinks ? (
                                                                                <>
                                                                                    Show less <ChevronUp className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {analyseLink.external_links.length - 1} more <ChevronDown className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            )}
                                                                        </li>
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm text-homeblack font-semibold">Broken Links:</div>
                                                            {!analyseLink.broken_links || analyseLink.broken_links.length === 0 ? (
                                                                <div className="">Not Found</div>
                                                            ) : (
                                                                <ul className="list-disc pl-5">
                                                                    {analyseLink.broken_links.slice(0, 1).map((link: any, index: any) => (
                                                                        <li key={index}>{link}</li>
                                                                    ))}
                                                                    {showBrokenLinks && analyseLink.broken_links.slice(1).map((link: any, index: any) => (
                                                                        <li key={index}>{link}</li>
                                                                    ))}
                                                                    {analyseLink.broken_links.length > 1 && (
                                                                        <li
                                                                            onClick={() => setShowBrokenLinks(!showBrokenLinks)}
                                                                            className="flex items-center font-semibold cursor-pointer text-pink smooth1 hover:underline"
                                                                        >
                                                                            {showBrokenLinks ? (
                                                                                <>
                                                                                    Show less <ChevronUp className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {analyseLink.broken_links.length - 1} more <ChevronDown className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            )}
                                                                        </li>
                                                                    )}
                                                                </ul>
                                                            )}
                                                        </div>
                                                        <div className="bg-lightblue p-4 rounded-lg mt-4">
                                                            <div>• Ensure hreflang tags are implemented for multi-language support.</div>
                                                            <div>• Verify analytics are properly configured to track website performance.</div>
                                                            <div>• Remove Flash content as it is outdated and unsupported by modern browsers.</div>
                                                        </div>
                                                    </>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-2 text-gray-500 p-4 bg-gray-50 rounded-lg">
                                                    <Info className="w-5 h-5 text-gray-400" />
                                                    <span>Link analysis data is currently unavailable. Please try running the analysis again.</span>
                                                </div>
                                            ),
                                        analyseLink && !analyseLink.error && (analyseLink?.internal_links?.length > 0 || analyseLink?.external_links?.length > 0 || analyseLink?.broken_links?.length > 0),
                                        '/link-analyzer'
                                    )}
                                    {renderSection("Additional Information", (
                                        <>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Hreflang Usage:</div>
                                                <div>{result.href.hreflang_usage ? "Used" : "Not Used"}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Language:</div>
                                                <div>{result.href.language}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Analytics:</div>
                                                <div>{result.analytics_flash.analytics}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">Flash Content:</div>
                                                <div>{result.analytics_flash.flash_content}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-homeblack font-semibold">SEO Score:</div>
                                                <div>{result.seo_score}/100</div>
                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Consider implementing hreflang tags for multi-language support</div>
                                                <div>• Ensure analytics are properly set up to track website performance</div>
                                                <div>• Avoid using Flash content as it&apos;s outdated and not supported by modern browsers</div>
                                            </div>
                                        </>
                                    ), true, null)}
                                    {renderSection("Social Media", (
                                        <>
                                            <div
                                                className="grid grid-cols-1  lg:grid-cols-2 2xl:grid-cols-3 gap-4 "
                                            >
                                                {result?.social_media.map((platform: any) => (
                                                    <motion.div
                                                        key={platform.platform}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        whileHover={{ scale: 1.05 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="border py-4 px-6 bg-white  rounded-md flex flex-col items-start gap-4"
                                                    >
                                                        <div className='flex items-center gap-2'>
                                                            <div className="text-4xl">
                                                                {platformIcons[platform.platform.toLowerCase()] || <div className="text-gray-400">?</div>}
                                                            </div>
                                                            <div className=''>
                                                                <div className="text-lg font-bold text-gray-800 capitalize">{platform?.platform}</div>
                                                                <div
                                                                    className={`text-sm ${platform.found ? "text-green-600" : "text-red-500"}`}
                                                                >
                                                                    {platform.found ? "Found" : "Not Found"}
                                                                </div></div>
                                                        </div>
                                                        {platform.found && platform.links && <CollapsibleLinks links={platform.links} />}

                                                    </motion.div>
                                                ))}
                                            </div>
                                            <div className="bg-lightblue p-4 rounded-lg">
                                                <div>• Ensure all relevant social media profiles are linked</div>
                                                <div>• Use Open Graph tags for better social sharing</div>
                                                <div>• Keep social media profiles up-to-date and active</div>
                                            </div>
                                        </>
                                    ), result.social_media.some((platform: any) => platform.found), null)}
                                </div>
                                <div className="w-full mt-8">
                                    {renderSection(
                                        "Domain Details",
                                        isDomainAnalyzing ? (
                                            <Spin />
                                        ) : (
                                            domianDetails && (
                                                <>
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 space-y-2">
                                                        <div>
                                                            <div className="text-sm text-homeblack font-semibold">Domain:</div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {domianDetails?.domain && (
                                                                    <Image
                                                                        src={`https://www.google.com/s2/favicons?domain=${domianDetails.domain}`}
                                                                        alt={`${domianDetails.domain} favicon`}
                                                                        width={16}
                                                                        height={16}
                                                                        unoptimized
                                                                        className="mt-0.5"
                                                                    />
                                                                )}
                                                                <span className="break-all">{domianDetails?.domain || 'Not found'}</span>
                                                            </div>
                                                        </div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Domain Age:</div>
                                                            <div>{domianDetails?.domain_age}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Sub Domain:</div>
                                                            <div>{domianDetails?.subdomain || "N/A"}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">IP Address:</div>
                                                            <div>{domianDetails?.ip_address}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Top Level Domain:</div>
                                                            <div>{domianDetails?.tld}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Hosting Server:</div>
                                                            <div>{domianDetails?.hosting_server}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Registrar:</div>
                                                            <div>{domianDetails?.whois_data?.registrar}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Creation Date:</div>
                                                            <div>{domianDetails?.whois_data?.creation_date}</div></div>
                                                        <div className=''>
                                                            <div className="text-sm text-homeblack font-semibold">Expiration Date:</div>
                                                            <div>{domianDetails?.whois_data?.expiration_date}</div></div>
                                                        <div>
                                                            <div className="text-sm text-homeblack font-semibold">Name Servers:</div>
                                                            {domianDetails?.whois_data?.name_servers.length === 0 ? (
                                                                <div>Not Found</div>
                                                            ) : (
                                                                <ul className="list-disc pl-5">
                                                                    {domianDetails?.whois_data?.name_servers.slice(0, 1).map((ns: string, index: number) => (
                                                                        <li key={index}>{ns}</li>
                                                                    ))}
                                                                    {showdomianDetails &&
                                                                        domianDetails?.whois_data?.name_servers.slice(1).map((ns: string, index: number) => (
                                                                            <li key={index}>{ns}</li>
                                                                        ))}
                                                                    {domianDetails?.whois_data?.name_servers.length > 1 && (
                                                                        <li
                                                                            onClick={() => setShowdomianDetails(!showdomianDetails)}
                                                                            className="flex items-center font-semibold cursor-pointer text-pink smooth1 hover:underline"
                                                                        >
                                                                            {showdomianDetails ? (
                                                                                <>
                                                                                    Show less <ChevronUp className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    {domianDetails.whois_data.name_servers.length - 1} more <ChevronDown className="w-4 h-4 ml-1" />
                                                                                </>
                                                                            )}
                                                                        </li>
                                                                    )}

                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>

                                                </>
                                            )
                                        ),
                                        domianDetails?.domain,
                                        null
                                    )}

                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-semibold mb-4 text-black">3. Keyword Consistency</h2>
                                <div className="bg-white p-6 rounded-lg shadow-sm border">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="p-2 text-left">Keyword</th>
                                                    <th className="p-2 text-center">Title</th>
                                                    <th className="p-2 text-center">Description</th>
                                                    <th className="p-2 text-center">H1-H6</th>
                                                    <th className="p-2 text-center">Frequency</th>
                                                    <th className="p-2 text-left">Frequency Bar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(result.keyword_consistency).map(([keyword, data]: any) => (
                                                    <tr key={keyword} className="border-b">
                                                        <td className="p-2">{keyword}</td>
                                                        <td className="p-2 text-center">
                                                            {data.title ? (
                                                                <Check className="inline w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <X className="inline w-4 h-4 text-red-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {data.meta_description_tag ? (
                                                                <Check className="inline w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <X className="inline w-4 h-4 text-red-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {data.headings_tags ? (
                                                                <Check className="inline w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <X className="inline w-4 h-4 text-red-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">{data.page_frequency}</td>
                                                        <td className="p-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                                <div
                                                                    className="bg-brand-blue1 h-2.5 rounded-full"
                                                                    style={{ width: `${(data.page_frequency / maxKeywordFrequency) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-black">4. Bigram Consistency</h2>
                                <div className="bg-white p-6 rounded-lg shadow-sm border">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="p-2 text-left">Keyword</th>
                                                    <th className="p-2 text-center">Title</th>
                                                    <th className="p-2 text-center">Description</th>
                                                    <th className="p-2 text-center">H1-H6</th>
                                                    <th className="p-2 text-center">Frequency</th>
                                                    <th className="p-2 text-left">Frequency Bar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.bigram_consistency.map((data: any, index: any) => (
                                                    <tr key={index} className="border-b">
                                                        <td className="p-2">{data.keyword}</td>
                                                        <td className="p-2 text-center">
                                                            {data.title ? (
                                                                <Check className="inline w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <X className="inline w-4 h-4 text-red-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {data.meta_description_tag ? (
                                                                <Check className="inline w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <X className="inline w-4 h-4 text-red-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            {data.headings_tags ? (
                                                                <Check className="inline w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <X className="inline w-4 h-4 text-red-500" />
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">{data.page_frequency}</td>
                                                        <td className="p-2">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                                <div
                                                                    className="bg-brand-blue1 h-2.5 rounded-full"
                                                                    style={{ width: `${(data.page_frequency / maxBigramFrequency) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8">
                                <h2 className="text-xl font-semibold mb-4 text-black">5. Pagespeed Insights</h2>
                                <div className="bg-white  rounded-lg  border">
                                    {isSpeedAnalyzing ? (<Spin />) :
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="bg-white rounded-xl  p-8"
                                        >
                                            <div className="flex items-center justify-between mb-8">
                                                <h2 className="text-2xl font-bold text-gray-900">
                                                    Core Web Vitals Assessment
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex ">
                                                        <button
                                                            className={`flex items-center hover:bg-brand-blue1 hover:text-white smooth3 gap-2  py-2 px-4 rounded-full mr-4 ${strategy === "desktop" ? "bg-brand-blue1 text-white" : "bg-lightblue text-pink"
                                                                }`}
                                                            onClick={() => {
                                                                setStrategy("desktop");
                                                                findSpeed("desktop");
                                                            }}
                                                        >
                                                            Desktop <SlScreenDesktop className="text-lg" />
                                                        </button>
                                                        <button
                                                            className={`flex items-center hover:bg-brand-blue1 hover:text-white smooth3 gap-2  py-2 px-4 rounded-full ${strategy === "mobile" ? "bg-brand-blue1 text-white" : "bg-lightblue text-pink"
                                                                }`}
                                                            onClick={() => {
                                                                setStrategy("mobile");
                                                                findSpeed("mobile");
                                                            }}
                                                        >
                                                            Mobile <RxMobile className="text-lg" />
                                                        </button>
                                                    </div>
                                                    <span className={`px-3 py-2 rounded-full text-sm font-medium ${pageSpeed?.score >= 90 ? 'bg-green-200 text-green-800' :
                                                        pageSpeed?.score >= 50 ? 'bg-yellow-200 text-yellow-800' :
                                                            'bg-red-200 text-red-800'
                                                        }`}>
                                                        Overall Score: {pageSpeed?.score}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                                <ScoreCircle score={pageSpeed?.performance_score} label="Performance" />
                                                <ScoreCircle score={pageSpeed?.accessibility_score} label="Accessibility" />
                                                <ScoreCircle score={pageSpeed?.best_practices_score} label="Best Practices" />
                                                <ScoreCircle score={pageSpeed?.seo_score} label="SEO" />
                                            </div>
                                            <div className="space-y-6">
                                                <h3 className="text-xl font-bold text-gray-900">Core Web Vitals</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <MetricCard
                                                        metric="LCP"
                                                        value={pageSpeed?.core_web_vitals?.lcp}
                                                    />
                                                    <MetricCard
                                                        metric="FID"
                                                        value={pageSpeed?.core_web_vitals?.fid}
                                                    />
                                                    <MetricCard
                                                        metric="CLS"
                                                        value={pageSpeed?.core_web_vitals?.cls}
                                                    />
                                                    <MetricCard
                                                        metric="FCP"
                                                        value={pageSpeed?.core_web_vitals?.fcp}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-6 mt-12">
                                                <h3 className="text-xl font-bold text-gray-900">Additional Performance Metrics</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                                                        <h4 className="font-medium text-gray-900 mb-2">First Contentful Paint</h4>
                                                        <p className="text-2xl font-bold">{pageSpeed?.performance_metrics.first_contentful_paint}</p>
                                                    </div>
                                                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                                                        <h4 className="font-medium text-gray-900 mb-2">Speed Index</h4>
                                                        <p className="text-2xl font-bold">{pageSpeed?.performance_metrics.speed_index}</p>
                                                    </div>
                                                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                                                        <h4 className="font-medium text-gray-900 mb-2">Largest Contentful Paint</h4>
                                                        <p className="text-2xl font-bold">{pageSpeed?.performance_metrics.largest_contentful_paint}</p>
                                                    </div>
                                                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                                                        <h4 className="font-medium text-gray-900 mb-2">Cumulative Layout Shift</h4>
                                                        <p className="text-2xl font-bold">{pageSpeed?.performance_metrics.cumulative_layout_shift}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-8 p-4 bg-brand-blue1-50 rounded-lg">
                                                <h4 className="font-medium text-blue-900 mb-2">Understanding the Scores</h4>
                                                <ul className="space-y-2 text-sm text-blue-800">
                                                    <li>• 90-100 (Good): The page meets the core web vitals threshold for this metric</li>
                                                    <li>• 50-89 (Needs Improvement): The page doesn&apos;t meet the threshold and should be improved</li>
                                                    <li>• 0-49 (Poor): The page is performing poorly and requires significant improvements</li>
                                                </ul>
                                            </div>
                                        </motion.div>}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
                {!result &&
                    <div className="flex flex-col md:flex-row w-full  justify-between px-4 md:px-8 lg:px-16 py-12 mx-auto text-homeblack">
                        {/* Left Section */}
                        <div className="w-full md:w-[50%] flex flex-col items-start gap-8">
                            {/* Heading and Description */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-3xl font-semibold leading-tight">
                                    Audit Your Website&apos;s SEO Performance
                                </h3>
                                <p className="text-base  leading-relaxed">
                                    Enter a website URL to uncover technical SEO issues, performance metrics, and  optimization opportunities.
                                </p>
                            </div>
                            {/* Benefits Section */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-lg font-semibold">Benefits:</h3>
                                <ul className="flex flex-col gap-2">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full " />
                                        Identify Critical Issues: Fix errors impacting your SEO.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full " />
                                        Improve Rankings: Enhance overall site health for better visibility.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full " />
                                        Comprehensive Analysis: Understand and optimize your site structure.
                                    </li>
                                </ul>
                            </div>
                            {/* Try it now section */}
                            <div className="flex flex-col gap-2">
                                <span className="text-[#0096FF] font-medium">Try it now!</span>
                                <span className="text-sm ">Enter a link above to see the results.</span>
                            </div>
                        </div>
                        {/* Right Section - Image */}
                        <div className="w-full md:w-[50%] flex items-center mt-8 md:mt-0 -z-0">
                            <Image src={"/images/Frame 1116607879.svg"} alt="Post" height={1000} width={1000} />
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}
