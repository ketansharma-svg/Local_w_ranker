"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Drawer, Popover, Empty, Tag, Button as AntBtn } from "antd";
import {
    FiAlertTriangle,
    FiBarChart2,
    FiEdit3,
    FiRefreshCw,
    FiUpload,
} from "react-icons/fi";
import Image from "next/image";

// ✅ NEW: your hooks
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider";
import { useProjectManager } from "@/src/hooks/use-project-manager";

// (Optional) shadcn cards you were already using
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Issue = {
    type: string;
    issue_type: "🔴 Critical" | "🟠 Warning" | "🟡 Low" | string;
    details?: {
        anchor_text?: string;
        health_status?: string;
        failing_url?: string;
        description?: string;
        issues?: string[];
        missing_alt?: string;
        fix?: string;
    };
};

type PageData = {
    url?: string;
    total_issues?: number;
    issue_counts?: Record<string, number>;
    issues?: Issue[];
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onPageAnalyzer?: (url?: string) => void;
    pageData?: PageData;
};

const severityColorMap: Record<string, string> = {
    "🔴 Critical": "error",
    "🟠 Warning": "orange",
    "🟡 Low": "gold",
};

const AffectedDrawer: React.FC<Props> = ({ onClose, isOpen, pageData, onPageAnalyzer }) => {
    const [issueDetailType, setIssueDetailType] = useState<"group" | "flat">("group");
    const [openIndexes, setOpenIndexes] = useState<number[]>([]);

    const { openTaskDrawer } = useTaskDrawer();
    const { selectedProject } = useProjectManager();

    const url = pageData?.url ?? "";
    const totalIssues = pageData?.total_issues ?? 0;
    const lowCount = pageData?.issue_counts?.["🟡 Low"] ?? 0;
    const issues: Issue[] = pageData?.issues ?? [];

    const groupedIssues = useMemo(() => {
        const acc: Record<string, Issue[]> = {};
        for (const issue of issues) {
            const t = issue.type;
            if (!acc[t]) acc[t] = [];
            acc[t].push(issue);
        }
        return acc;
    }, [issues]);

    const issueGroups = useMemo(
        () =>
            Object.entries(groupedIssues).map(([type, arr]) => ({
                title: toTitle(type),
                issueCount: arr.length,
                issues: arr.map((issue) => ({
                    title:
                        issue.details?.anchor_text ||
                        issue.details?.health_status ||
                        issue.type,
                    severity: issue.issue_type,
                    affected:
                        issue.details?.failing_url ||
                        issue.details?.description ||
                        issue.details?.issues?.join(", ") ||
                        issue.details?.missing_alt ||
                        issue.details?.health_status ||
                        "No details",
                    fix: issue.details?.fix || "No fix info",
                    raw: issue,
                })),
            })),
        [groupedIssues]
    );

    const issuesFlatData = useMemo(
        () =>
            issues.map((issue) => ({
                name:
                    issue.details?.anchor_text ||
                    issue.details?.health_status ||
                    issue.type,
                category: issue.type,
                severity: issue.issue_type,
                description:
                    issue.details?.failing_url ||
                    issue.details?.description ||
                    issue.details?.issues?.join(", ") ||
                    issue.details?.missing_alt ||
                    issue.details?.health_status ||
                    "No details",
                raw: issue,
            })),
        [issues]
    );

    const toggle = (idx: number) => {
        setOpenIndexes((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    // ---------- TASK HELPERS ----------
    const buildTaskTitle = (issueTitle?: string, category?: string) =>
        `Fix: ${issueTitle || "SEO Issue"} · ${category || "General"}`;

    const buildTaskDescription = (issue: Issue) => {
        const parts: string[] = [];
        if (url) parts.push(`Page URL: ${url}`);
        if (issue.type) parts.push(`Category: ${toTitle(issue.type)}`);
        if (issue.issue_type) parts.push(`Severity: ${issue.issue_type}`);
        if (issue.details?.anchor_text) parts.push(`Anchor Text: ${issue.details.anchor_text}`);
        if (issue.details?.failing_url) parts.push(`Failing/Related URL: ${issue.details.failing_url}`);
        if (issue.details?.description) parts.push(`Notes: ${issue.details.description}`);
        if (issue.details?.issues?.length) parts.push(`Sub-issues: ${issue.details.issues.join(", ")}`);
        if (issue.details?.fix) parts.push(`Suggested Fix: ${issue.details.fix}`);
        return parts.join("\n");
    };

    const createTask = (title: string, description: string) => {
        openTaskDrawer({
            title,
            description,
            projectId: selectedProject?.id ?? null,
            type: "createNew",
        });
    };

    const onCreateTaskFromIssue = (issue: Issue) => {
        const t =
            issue.details?.anchor_text ||
            issue.details?.health_status ||
            issue.type;
        const title = buildTaskTitle(t, issue.type);
        const description = buildTaskDescription(issue);
        createTask(title, description);
    };

    // ---------- POPOVER CONTENT ----------
    const popInfo = (text: string) => <div style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{text}</div>;

    return (
        <Drawer
            placement="right"
            onClose={onClose}
            open={isOpen}
            width={1100}
            closable={false}
            bodyStyle={{ padding: 10 }}
        >
            <motion.div
                className="bg-white p-8"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                transition={{ duration: 0.4 }}
            >
                {/* Header */}
                <div className="flex flex-col pb-4 gap-4 w-full">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 items-center">
                            <h2 className="text-[#000] text-[18px] font-semibold">Issue Summary</h2>
                        </div>
                        <div className="flex items-center gap-2 text-blue-600">
                            <Popover content={popInfo("Re-fetch latest analysis for this page.")}>
                                <FiRefreshCw className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                            </Popover>
                            <Popover content={popInfo("Export current view as CSV / JSON.")}>
                                <FiUpload className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                            </Popover>
                            <Popover content={popInfo("Bulk edit / annotate selected issues.")}>
                                <FiEdit3 className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                            </Popover>
                            <Popover content={popInfo("Open trends & breakdown charts.")}>
                                <FiBarChart2 className="cursor-pointer hover:scale-105 hover:bg-gray-100 h-6 w-6 p-1 rounded-sm" />
                            </Popover>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-[14px] font-medium">
                        <div className="flex items-center gap-1">
                            <span className="text-[14px]">Low Severity Issues:</span>
                            <Popover content={popInfo("Number of low severity issues for this page.")}>
                                <span className="text-yellow-600 font-semibold cursor-pointer">{lowCount}</span>
                            </Popover>
                        </div>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                            <span className="font-medium">URL:</span>
                            <Popover content={popInfo(url || "—")}>
                                <span className="text-blue-600 font-semibold cursor-pointer">{url || "—"}</span>
                            </Popover>
                        </div>
                        <span className="ml-auto text-sm text-gray-700">Total Issues: {totalIssues}</span>
                    </div>
                </div>

                <div className="border" />

                {/* Categories */}
                <Card className="border border-gray-200 mt-4">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                            <CardTitle className="text-[18px] font-medium">Issue Categories</CardTitle>
                            <Popover content={popInfo("Export the issue categories with counts & examples.")}>
                                <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md text-[14px] p-2 cursor-pointer">
                                    <Image alt="" src="/images/WRanker - Export Icon grey.png" className="h-[14px] w-auto" height={14} width={14} />
                                    <span>Export</span>
                                </div>
                            </Popover>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-12 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <AnimatePresence>
                                {Object.entries(groupedIssues).map(([type, arr], idx) => {
                                    const preview = arr
                                        .slice(0, 3)
                                        .map((i) => i.details?.anchor_text || i.details?.health_status || i.type)
                                        .join(", ");
                                    return (
                                        <motion.div
                                            key={type}
                                            className="border rounded-md p-3 flex flex-col justify-between hover:bg-gray-50"
                                            initial={{ opacity: 0, y: 40 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 40 }}
                                            transition={{ delay: idx * 0.06, duration: 0.35 }}
                                        >
                                            <div className="flex w-full items-center justify-between mb-2">
                                                <span className="text-[#000] text-[14px] font-medium">{toTitle(type)}</span>
                                                <Popover content={popInfo("Number of issues in this category.")}>
                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded cursor-pointer">
                                                        {arr.length} Issues
                                                    </span>
                                                </Popover>
                                            </div>
                                            <Popover content={popInfo(preview || "No examples")}>
                                                <span className="text-[13px] text-gray-700 line-clamp-2 cursor-pointer">{preview || "—"}</span>
                                            </Popover>

                                            <div className="mt-3 flex items-center justify-end gap-2">
                                                <Popover
                                                    trigger="hover"
                                                    content={
                                                        <div className="flex flex-col gap-2 w-[260px]">
                                                            <AntBtn
                                                                onClick={() => {
                                                                    const title = `Fix: ${toTitle(type)} · ${arr.length} issue(s)`;
                                                                    const description = [
                                                                        `Page URL: ${url || "—"}`,
                                                                        `Category: ${toTitle(type)}`,
                                                                        `Severity Mix: ${summarizeSeverities(arr)}`,
                                                                        `Top Examples: ${preview || "—"}`,
                                                                    ].join("\n");
                                                                    createTask(title, description);
                                                                }}
                                                                type="primary"
                                                                block
                                                            >
                                                                Create Task
                                                            </AntBtn>
                                                            <AntBtn
                                                                onClick={() => onPageAnalyzer?.(url)}
                                                                block
                                                            >
                                                                View in Page Analyzer
                                                            </AntBtn>
                                                        </div>
                                                    }
                                                >
                                                    <AntBtn size="small">Actions</AntBtn>
                                                </Popover>
                                            </div>

                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>

                {/* Issue Details */}
                <Card className="border border-gray-200 mt-4">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-1 pb-2 border-b-2">
                            <CardTitle className="text-[18px] font-medium">Issue Details</CardTitle>
                            <div className="flex gap-2 items-center">
                                <div className="border rounded flex">
                                    <button
                                        onClick={() => setIssueDetailType("group")}
                                        className={`text-[14px] px-3 py-2 ${issueDetailType === "group" ? "bg-[#D9EEF8] text-[#008CCD]" : "text-gray-600"}`}
                                    >
                                        Grouped View
                                    </button>
                                    <button
                                        onClick={() => setIssueDetailType("flat")}
                                        className={`text-[14px] px-3 py-2 ${issueDetailType === "flat" ? "bg-[#D9EEF8] text-[#008CCD]" : "text-gray-600"}`}
                                    >
                                        Flat List
                                    </button>
                                </div>
                                <Popover content={popInfo("Export the expanded issue details as CSV/JSON.")}>
                                    <div className="flex items-center gap-2 border border-[#EFF0F6] text-[#676767] rounded-md text-[14px] p-2 cursor-pointer">
                                        <Image alt="" src="/images/WRanker - Export Icon grey.png" className="h-[14px] w-auto" height={14} width={14} />
                                        <span>Export</span>
                                    </div>
                                </Popover>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {issueDetailType === "group" && (
                            <div className="flex flex-col gap-2">
                                <AnimatePresence>
                                    {issueGroups.map((group, idx) => (
                                        <motion.div
                                            key={group.title}
                                            className="border border-gray-200 p-3 rounded-lg hover:bg-gray-50"
                                            initial={{ opacity: 0, y: 40 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 40 }}
                                            transition={{ delay: idx * 0.06, duration: 0.35 }}
                                        >
                                            {/* header */}
                                            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggle(idx)}>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-gray-800">{group.title}</h3>
                                                    <Popover content={popInfo("Number of issues in this group.")}>
                                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded cursor-pointer">
                                                            {group.issueCount} Issues
                                                        </span>
                                                    </Popover>
                                                </div>
                                                <span className="text-gray-500 text-lg">{openIndexes.includes(idx) ? "▴" : "▾"}</span>
                                            </div>

                                            {/* body */}
                                            <AnimatePresence>
                                                {openIndexes.includes(idx) &&
                                                    group.issues.map((issue, issueIdx) => (
                                                        <motion.div
                                                            key={`${group.title}-${issueIdx}`}
                                                            className="mt-3 p-3 border rounded bg-gray-50 space-y-3"
                                                            initial={{ opacity: 0, y: 30 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 30 }}
                                                            transition={{ delay: issueIdx * 0.03, duration: 0.25 }}
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <FiAlertTriangle className="text-orange-500" />
                                                                    <span className="font-medium text-gray-800">{issue.title}</span>
                                                                </div>
                                                                <Popover content={popInfo(`Severity: ${issue.severity}`)}>
                                                                    <Tag color={severityColorMap[issue.severity] || "default"}>{issue.severity}</Tag>
                                                                </Popover>
                                                            </div>

                                                            <div className="text-sm text-gray-700">
                                                                <Popover content={popInfo(issue.affected || "—")}>
                                                                    <p className="cursor-pointer">
                                                                        <strong>Affected:</strong> {issue.affected || "—"}
                                                                    </p>
                                                                </Popover>
                                                                <Popover content={popInfo(issue.fix || "—")}>
                                                                    <p className="cursor-pointer">
                                                                        <strong>Fix:</strong> {issue.fix || "—"}
                                                                    </p>
                                                                </Popover>
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                <AntBtn
                                                                    type="primary"
                                                                    onClick={() => onCreateTaskFromIssue(issue.raw)}
                                                                >
                                                                    Create Task
                                                                </AntBtn>

                                                                <AntBtn onClick={() => onPageAnalyzer?.(url)} type="default">
                                                                    View in Page Analyzer
                                                                </AntBtn>
                                                            </div>

                                                        </motion.div>
                                                    ))}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {issueGroups.length === 0 && (
                                    <div className="py-8">
                                        <Empty description="No grouped issues found." />
                                    </div>
                                )}
                            </div>
                        )}

                        {issueDetailType === "flat" && (
                            <motion.div
                                className="bg-white p-4 rounded-md border border-gray-200 shadow-sm"
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                transition={{ duration: 0.35 }}
                            >
                                {issuesFlatData.length === 0 ? (
                                    <div className="py-8">
                                        <Empty description="No issues to display." />
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Issue</th>
                                                <th className="px-4 py-3">Category</th>
                                                <th className="px-4 py-3">Severity</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <AnimatePresence>
                                                {issuesFlatData.map((row, idx) => (
                                                    <motion.tr
                                                        key={`flat-${idx}`}
                                                        className="border-b hover:bg-gray-50"
                                                        initial={{ opacity: 0, y: 30 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 30 }}
                                                        transition={{ delay: idx * 0.02, duration: 0.25 }}
                                                    >
                                                        <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                                                            <FiAlertTriangle className="text-orange-500" />
                                                            <Popover content={popInfo(row.name || "—")}>
                                                                <span className="cursor-pointer">{row.name || "—"}</span>
                                                            </Popover>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700">
                                                            <Popover content={popInfo(toTitle(row.category || ""))}>
                                                                <span className="cursor-pointer">{toTitle(row.category || "")}</span>
                                                            </Popover>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Popover content={popInfo(`Severity: ${row.severity || "—"}`)}>
                                                                <Tag color={severityColorMap[row.severity] || "default"}>
                                                                    {row.severity || "—"}
                                                                </Tag>
                                                            </Popover>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700">
                                                            <Popover content={popInfo(row.description || "—")}>
                                                                <span className="cursor-pointer line-clamp-2">{row.description || "—"}</span>
                                                            </Popover>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <AntBtn
                                                                    type="primary"
                                                                    size="small"
                                                                    onClick={() => onCreateTaskFromIssue(row.raw)}
                                                                >
                                                                    Create Task
                                                                </AntBtn>

                                                                <AntBtn
                                                                    size="small"
                                                                    onClick={() => onPageAnalyzer?.(url)}
                                                                    type="default"
                                                                >
                                                                    View in Page Analyzer
                                                                </AntBtn>
                                                            </div>
                                                        </td>

                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                )}

                                <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-3">
                                    <span className="text-sm text-gray-500">0 tasks selected</span>
                                    <div className="flex gap-3">
                                        <AntBtn>
                                            Export CSV
                                        </AntBtn>
                                        <AntBtn
                                            type="primary"
                                            onClick={() => {
                                                // Example bulk-create: create 1 master task summarizing all flat rows
                                                const title = `Fix: ${issuesFlatData.length} issue(s) on ${url || "page"}`;
                                                const description = [
                                                    `Page URL: ${url || "—"}`,
                                                    `Issues:`,
                                                    ...issuesFlatData.slice(0, 20).map((r) => `• ${r.name} [${toTitle(r.category)} | ${r.severity}] - ${truncate(r.description, 140)}`),
                                                    issuesFlatData.length > 20 ? "… (truncated)" : "",
                                                ].join("\n");
                                                createTask(title, description);
                                            }}
                                        >
                                            Bulk Create Tasks
                                        </AntBtn>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </Drawer>
    );
};

export default AffectedDrawer;

// ---------- utils ----------
function toTitle(s: string) {
    return s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";
}
function truncate(s: string, n: number) {
    if (!s) return "—";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function summarizeSeverities(arr: Issue[]) {
    const m = new Map<string, number>();
    for (const i of arr) m.set(i.issue_type, (m.get(i.issue_type) || 0) + 1);
    return Array.from(m.entries())
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
}
