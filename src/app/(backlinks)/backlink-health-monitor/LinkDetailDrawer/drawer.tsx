import { Drawer } from "antd";
import { useEffect, useState } from 'react';
import { LinkDetailHeader } from './HeaderLinkDetail';
import IssueHighlightsDemo from './IssueHighlights';
import Demo_LinkEvidenceContext from './LinkEvidence&Context';
import { MetricsTrendsSection } from './MetricsTrends';
import { RelatedLinksSection } from './RelatedLinks';
import RiskNetworkDemo from './Risk&Network';
import DemoSummaryCards from './SummaryCards';
import TimelineDemoCanvas from './TimelineChangeHistory';


const DetailDrawer = ({ detailOpen, setDetailOpen, backlinkId, data }) => {

    const scenarios = {
        "Active · At Risk · Type Changed": {
            link_id: "lnk_12345",
            domain: "example-news.site",
            favicon_url: undefined,
            source_url:
                "https://example-news.site/articles/2025/08/08/ai-content-seo-best-practices?utm_source=wranker&utm_medium=ref",
            status: "active",
            status_changed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
            health_state: "at_risk",
            health_reason: "At Risk due to WR drop (−12) and anchor change",
            link_type: "nofollow",
            link_type_prev: "dofollow",
            link_type_changed_at: "2025-07-30T10:12:00Z",
            disavowed: false,
        },
        "Removed · Toxic · Dofollow": {
            link_id: "lnk_removed",
            domain: "toxic-blog.example",
            source_url: "https://toxic-blog.example/posts/bad-link#section",
            status: "removed",
            status_changed_at: "2025-08-01T05:00:00Z",
            health_state: "toxic",
            health_reason: "Toxic due to spam score > 60 and PBN overlap",
            link_type: "dofollow",
            disavowed: true,
        },
        "Redirected · Healthy · Sponsored": {
            link_id: "lnk_redirected",
            domain: "partner.site",
            favicon_url: undefined,
            source_url: "https://partner.site/go/offer?ref=abc",
            status: "redirected",
            status_changed_at: "2025-08-09T12:00:00Z",
            health_state: "healthy",
            link_type: "sponsored",
            disavowed: false,
        },
    };

    const [which, setWhich] = useState(
        "Active · At Risk · Type Changed",
    );

    function mockSeries(startISO: string, values: number[]) {
        const start = new Date(startISO).getTime();
        const step = 1000 * 60 * 60 * 24 * 14; // 14 days between checks
        return values.map((v, i) => ({ t: new Date(start + i * step).toISOString(), v }));
    }

    const DEMO_WR = mockSeries("2025-03-01T04:00:00Z", [64, 68, 72, 70, 66, 78]);
    const DEMO_SPAM = mockSeries("2025-03-01T04:00:00Z", [34, 31, 28, 24, 22, 18]);


    const [wrCurr, setWrCurr] = useState(DEMO_WR[DEMO_WR.length - 1].v);
    const [wrPrev, setWrPrev] = useState(DEMO_WR[DEMO_WR.length - 2].v);
    const [spamCurr, setSpamCurr] = useState(DEMO_SPAM[DEMO_SPAM.length - 1].v);
    const [spamPrev, setSpamPrev] = useState(DEMO_SPAM[DEMO_SPAM.length - 2].v);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<any>([]);
    const domain = "example.com";

    useEffect(() => {
        const t = setTimeout(() => {
            try {
                const mock = [
                    {
                        id: "lnk_101",
                        path: "/blog/how-to-seo-like-a-pro-guide",
                        source_url: "https://example.com/blog/how-to-seo-like-a-pro-guide",
                        status: "active",
                        type: "nofollow",
                        wr: 78,
                        wr_prev: 90,
                        last_checked: new Date(Date.now() - 3 * 86400000).toISOString(),
                        type_prev: "dofollow",
                        type_changed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
                    },
                    {
                        id: "lnk_102",
                        path: "/tools/best-seo-tools-2025",
                        source_url: "https://example.com/tools/best-seo-tools-2025",
                        status: "redirected",
                        type: "sponsored",
                        wr: 65,
                        last_checked: new Date(Date.now() - 1 * 86400000).toISOString(),
                    },
                    {
                        id: "lnk_103",
                        path: "/contact",
                        source_url: "https://example.com/contact",
                        status: "removed",
                        type: "ugc",
                        wr: 32,
                        last_checked: new Date(Date.now() - 9 * 86400000).toISOString(),
                    },
                    {
                        id: "lnk_104",
                        path: "/category/marketing/case-study-a-very-long-segment-that-keeps-going-and-going",
                        source_url:
                            "https://example.com/category/marketing/case-study-a-very-long-segment-that-keeps-going-and-going",
                        status: "active",
                        type: "dofollow",
                        wr: 84,
                        last_checked: new Date(Date.now() - 18 * 86400000).toISOString(), // overdue
                    },
                    {
                        id: "lnk_105",
                        path: "/old/archived/2024/post",
                        source_url: "https://example.com/old/archived/2024/post",
                        status: "not_checked",
                        type: "nofollow",
                        wr: 41,
                        last_checked: undefined,
                    },
                ];
                setRows(mock);
                setLoading(false);
            } catch (e) {
                setError("Mock error");
                setLoading(false);
            }
        }, 700);
        return () => clearTimeout(t);
    }, []);

    function handleOpenDetail(id: string) {
        alert(`Open Link Detail drawer for ${id}`);
    }
    function handleOpenSource(url: string) {
        window.open(url, "_blank");
    }
    function handleViewAll(dom: string) {
        alert(`Navigate to main table filtered by domain=${dom}`);
    }
    const onPointNavigate = ({ metric, iso }: { metric: 'wr' | 'spam'; iso: string }) => {
        const el = document.getElementById("timeline") || document.getElementById("trends");
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`[navigate] metric=${metric} → timeline@${iso}`);
    };



    const usingExternal = !!data;

    // derive header + section inputs
    const headerData = usingExternal ? data.header : scenarios[which];
    const evidenceData = usingExternal ? data.evidence : {
        // build from your existing demo defaults
        link_id: "lnk_123",
        domain: "example.com",
        source_url: "https://example.com/post",
        target_url: "https://yoursite.com/page",
        status: "active",
        health_state: "healthy",
        link_type: "nofollow",
        wr: 78, spam: 22, ip_risk: false,
        http_chain: [{ code: "200", url: "https://example.com/post", at: new Date().toISOString() }],
        first_seen: new Date().toISOString(),
        last_checked: new Date().toISOString(),
    };

    const summaryData = usingExternal ? data.summary : { wr: 78, wr_prev: 90, spam: 22, spam_prev: 28, ip_risk: false, last_checked: new Date().toISOString(), first_seen: new Date().toISOString(), index_status: "unknown" };
    const wrSeries = usingExternal ? (data.metrics?.wr_series ?? []) : DEMO_WR;
    const spamSeries = usingExternal ? (data.metrics?.spam_series ?? []) : DEMO_SPAM;
    const relatedItems = usingExternal ? (data.related ?? []) : rows;
    const riskData = usingExternal ? data.risk : {
        link_id: "lnk_123", domain: "example.com", ip: "203.0.113.10", asn: "AS64500", host: "edge.example", ip_risk: false, ip_risk_reasons: [], last_checked: new Date().toISOString(), disavowed: false,
    };


    return (
        <Drawer
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            width={1100}
            title={
                <LinkDetailHeader
                    data={headerData}
                    onClose={() => setDetailOpen(false)}
                    onRecheck={async () => {
                        await new Promise((r) => setTimeout(r, 800));
                        console.log("Verification queued — we’ll notify you.");
                        alert("Verification queued — we’ll notify you.");
                    }}
                    onCreateTask={(p) => alert(`Create Task for ${p.domain} (link ${p.linkId})`)}
                    onFlag={(id) => alert(`Flagged ${id} for review`)}
                    onOpenDisavow={(d) => alert(`Open Disavow Monitor for ${d}`)}
                />}
            footer={
                <div className="flex gap-2 justify-end w-full">
                    <button
                        className="rounded border px-3 py-2 text-sm hover:bg-slate-50 ">
                        Re‑check
                    </button>
                    <button
                        className="rounded border px-3 py-2 text-sm hover:bg-slate-50 ">
                        Create Task
                    </button>
                    <button
                        className="rounded border px-3 py-2 text-sm hover:bg-slate-50 ">
                        Flag
                    </button>
                    <button
                        className="rounded border px-3 py-2 text-sm hover:bg-slate-50 ">
                        Disavow
                    </button>
                </div>
            }
        >
            <div className=' space-y-4'>
                <DemoSummaryCards />
                <IssueHighlightsDemo />
                <Demo_LinkEvidenceContext />
                <TimelineDemoCanvas />
                <MetricsTrendsSection
                    wr_series={wrSeries}
                    spam_series={spamSeries}
                    wr={summaryData.wr}
                    wr_prev={summaryData.wr_prev}
                    spam={summaryData.spam}
                    spam_prev={summaryData.spam_prev}
                    onPointNavigate={onPointNavigate}
                />
                <RiskNetworkDemo />
                <RelatedLinksSection
                    domain={headerData.domain}
                    items={relatedItems}
                    loading={false}
                    error={null}
                    onOpenLinkDetail={(id) => console.log("Open nested link", id)}
                    onOpenSource={(url) => window.open(url, "_blank")}
                    onViewAll={(dom) => console.log("Filter main table for", dom)}
                />
            </div>
        </Drawer>
    )
}

export default DetailDrawer