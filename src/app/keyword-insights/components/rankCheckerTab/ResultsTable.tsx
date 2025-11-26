"use client";

import React, { useMemo, useState } from "react";
import type { TableProps, MenuProps } from "antd";
import {
  Table,
  Tag,
  Tooltip,
  Button,
  Input,
  Dropdown,
  Checkbox,
  Segmented,
  Space,
  message,
} from "antd";
import { LoadingOutlined } from "@ant-design/icons";

import {
  Columns3,
  List,
  LayoutGrid,
  Search as SearchIcon,
  Download,
  RefreshCw,
  ClipboardList,
  BarChart3,
  Trash2,
  Plus,
  ExternalLink,
  Monitor,
  Smartphone,
} from "lucide-react";

export interface CheckerRow {
  id: string;
  taskId?: string | null;
  domain?: string;
  keyword: string;
  volume?: number | string | null;
  device: "desktop" | "mobile";
  locationISO: string;
  rank: number | null;
  url?: string | null;
  googlePage?: string | null;
  competitors?: Array<{ domain: string; rank: number | null }>;
  inTracker: boolean;
  lastSeen?: string | null;
  status?: string;
}

/* ---------- helpers ---------- */
const nf = (n: number) => new Intl.NumberFormat().format(n);
const rankCell = (n: number | null) =>
  n == null || n === 0 || n > 100 ? "Not ranked" : `#${n}`;
const bucketLabel = (r: number | null) => {
  if (r == null || r === 0 || r > 100) return null;
  if (r <= 3) return "Top 3";
  if (r <= 10) return "Top 10";
  if (r <= 20) return "Top 20";
  if (r <= 50) return "Top 50";
  return "Top 100";
};

const transformRankingData = (rankings: any[]): CheckerRow[] =>
  rankings.map((ranking, index) => {
    const taskId = ranking.taskId ?? ranking.task_id ?? null
    const id = ranking.id ?? taskId ?? `${ranking.keyword ?? "row"}-${index}`
    return {
      id: String(id),
      taskId: taskId ?? null,
      domain: ranking.domain,
      keyword: ranking.keyword,
      volume: ranking.volume === "-" ? null : ranking.volume,
      device: ranking.device as "desktop" | "mobile",
      locationISO: ranking.locationISO,
      rank: ranking.rank === 0 ? null : ranking.rank,
      url: ranking.url || null,
      googlePage: ranking.googlePage || null,
      competitors: ranking.competitors || [],
      inTracker: ranking.inTracker,
      status: ranking.status,
    }
  });

function exportCSV(rows: CheckerRow[]) {
  const headers = [
    "Keyword",
    "Volume",
    "Device",
    "Location",
    "Rank",
    "URL",
    "Google Page",
    "In Tracker?",
    "Competitors",
  ];
  const lines = rows.map((r) =>
    [
      r.keyword,
      r.volume ?? "",
      r.device,
      r.locationISO,
      r.rank ?? "",
      r.url ?? "",
      r.googlePage ?? "",
      r.inTracker ? "Yes" : "No",
      (r.competitors || [])
        .map((c) => `${c.domain}#${c.rank ?? "—"}`)
        .join("|"),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rank_checker_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- component ---------- */
export default function ResultsTable({
  rankings = [],
  isLoading = false,
  title = "Rank Check Results",
}: {
  rankings?: any[];
  isLoading?: boolean;
  title?: string;
}) {  

  
  const rows = transformRankingData(rankings);

  // table UI state
  const [density, setDensity] = useState<"large" | "middle" | "small">(
    "large"
  );
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState({
    ranked: null as boolean | null,
    tracked: null as boolean | null,
    withComps: false,
  });
  const [visibleCols, setVisibleCols] = useState({
    volume: true,
    rank: true,
    url: true,
    googlePage: true,
    competitors: true,
    competitorUrls: true,
    inTracker: true,
    add: true,
    serp: true,
    actions: true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !(
          r.keyword.toLowerCase().includes(q) ||
          (r.url || "").toLowerCase().includes(q)
        )
      )
        return false;
      if (filters.ranked !== null) {
        const ranked = r.rank != null && r.rank <= 100;
        if (filters.ranked !== ranked) return false;
      }
      if (filters.tracked !== null) {
        if (filters.tracked !== r.inTracker) return false;
      }
      if (filters.withComps && !(r.competitors && r.competitors.length))
        return false;
      return true;
    });
  }, [rows, search, filters]);

  

  /* ---------- column dropdown ---------- */
  const columnMenu: MenuProps["items"] = Object.keys(visibleCols).map((k) => ({
    key: k,
    label: (
      <Checkbox
        checked={(visibleCols as any)[k]}
        onChange={() =>
          setVisibleCols((prev) => ({ ...prev, [k]: !(prev as any)[k] }))
        }
      >
        {k}
      </Checkbox>
    ),
  }));

  /* ---------- columns ---------- */
  const columns: any = [
    {
      title: "Keyword",
      dataIndex: "keyword",
      key: "keyword",
      fixed: "left",
      width: 320,
      render: (_: any, r) => (
        <div className="min-w-[280px] max-w-[420px]">
          <div className="font-semibold">{r.keyword}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            {r.device === "desktop" ? (
              <Monitor size={14} strokeWidth={1.5} />
            ) : (
              <Smartphone size={14} strokeWidth={1.5} />
            )}
            <span>{r.locationISO}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Domain",
      dataIndex: "domain",
      key: "domain",
      width: 150,
      render: (_: any, r) => {
        return(<div className="min-w-[280px] max-w-[420px]">
          <div className="font-semibold">{r.domain}</div>
        </div>
      )},
    },
    visibleCols.volume && {
      title: "Search Volume",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      width: 140,
      sorter: (a, b) =>
        Number(a.volume || -1) - Number(b.volume || -1),
      render: (v) =>
        v && v !== "-" ? <span>{nf(Number(v))}</span> : <span>—</span>,
    },
    visibleCols.rank && {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      align: "center",
      width: 140,
      sorter: (a, b) =>
        (a.rank == null ? 9999 : a.rank) -
        (b.rank == null ? 9999 : b.rank),
      render: (_: any, r) => {
        if (r.status === "Pending") {
          return (
            <div className="flex items-center justify-center gap-2">
              <LoadingOutlined />
              <Tag color="processing">Fetching…</Tag>
            </div>
          )
        } const bucket = bucketLabel(r.rank);
        const colour = r.rank != null && r.rank <= 100 ? "blue" : "red";
        return (
          <div className="flex items-center justify-center gap-2">
            <Tag color={colour}>{rankCell(r.rank)}</Tag>
            {bucket && <Tag>{bucket}</Tag>}
          </div>
        );
      },
    },
    visibleCols.url && {
      title: "Ranking URL",
      dataIndex: "url",
      key: "url",
      width: 360,
      render: (url: string | null) =>
        url ? (
          <a
            className="flex items-center justify-between text-blue-600 hover:underline"
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <Tooltip title={url}>
              <span className="truncate">{url}</span>
            </Tooltip>
            <ExternalLink size={14} />
          </a>
        ) : (
          <span>—</span>
        ),
    },
    // visibleCols.googlePage && {
    //   title: "Google Page",
    //   dataIndex: "googlePage",
    //   key: "googlePage",
    //   width: 360,
    //   render: (p: string | null) =>
    //     p ? (
    //       <a
    //         className="flex items-center justify-between text-blue-600 hover:underline"
    //         href={p}
    //         target="_blank"
    //         rel="noreferrer"
    //       >
    //         <Tooltip title={p}>
    //           <span className="truncate">{p}</span>
    //         </Tooltip>
    //         <ExternalLink size={14} />
    //       </a>
    //     ) : (
    //       <span>—</span>
    //     ),
    // },
    visibleCols.competitors && {
      title: "Competitors",
      dataIndex: "competitors",
      key: "competitors",
      width: 280,
      render: (comps: CheckerRow["competitors"]) =>
        comps && comps.length ? (
          <>
              <div  className='flex flex-col gap-2'>
            {comps.slice(0, 3).map((c, i) => (
               <p key={i} className="border px-2 rounded-md"> {c.domain}</p> 
              ))}
              </div>
          </>
        ) : (
          <span>—</span>
        ),
    },
    visibleCols.competitorUrls && {
  title: "Competitor URLs",
  dataIndex: "competitors",
  key: "competitorUrls",
  width: 400,
  render: (comps: CheckerRow["competitors"]) =>
    comps && comps.length ? (
      <div className="flex flex-col gap-2">
        {comps.slice(0, 3).map((c:any, i) => (
          <div key={`${c.domain}-${i}`} className="flex items-center justify-between ">
            <a
              href={c.ranked_url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-blue-600 hover:underline max-w-[300px]"
              title={c.ranked_url}
            >
              {c.ranked_url || "—"}
            </a>
            <Tag color="blue">{c.rank ? `#${c.rank}` : "—"}</Tag>
          </div>
        ))}
      </div>
    ) : (
      <span>—</span>
    ),
},

    visibleCols.inTracker && {
      title: "In Tracker?",
      dataIndex: "inTracker",
      key: "inTracker",
      align: "center",
      width: 140,
      render: (t: boolean) => <Tag color={t ? "blue" : undefined}>{t ? "Yes" : "No"}</Tag>,
    },
    visibleCols.add && {
      title: "Add",
      key: "add",
      align: "center",
      width: 70,
      render: (_: any, r) => (
        <Tooltip title="Add to Tracking">
          <Button
            type="default"
            size="small"
            disabled={r.inTracker}
            onClick={() => message.success(`Add "${r.keyword}" to tracking`)}
            icon={<Plus size={16} />}
          />
        </Tooltip>
      ),
    },
    visibleCols.serp && {
      title: "SERP",
      key: "serp",
      align: "center",
      width: 70,
      render: (_: any, r) => (
        <Tooltip title={`Open SERP preview for ${r.keyword}`}>
          <Button
            type="default"
            size="small"
            onClick={() => message.info("SERP preview")}
            icon={<span role="img" aria-label="Search">🔍</span>}
          />
        </Tooltip>
      ),
    },
    visibleCols.actions && {
      title: "Actions",
      key: "actions",
      align: "center",
      width: 196,
      render: (_: any, r) => (
        <Space>
          <Tooltip title="Assign Task">
            <Button
              size="small"
              onClick={() => message.success(`Task for ${r.keyword}`)}
              icon={<ClipboardList size={16} />}
            />
          </Tooltip>
          <Tooltip title="Drilldown">
            <Button
              size="small"
              onClick={() => message.info("Drilldown")}
              icon={<BarChart3 size={16} />}
            />
          </Tooltip>
          <Tooltip title="Remove row">
            <Button
              size="small"
              danger
              onClick={() => message.warning("Remove (demo)")}
              icon={<Trash2 size={16} />}
            />
          </Tooltip>
        </Space>
      ),
    },
  ].filter(Boolean) as any;

  /* ---------- row selection ---------- */
  const rowSelection: TableProps<CheckerRow>["rowSelection"] = {
    selectedRowKeys: selectedKeys,
    onChange: (keys) => setSelectedKeys(keys),
  };

  /* ---------- top toolbar ---------- */
  const densityMenu: MenuProps["items"] = (["large", "middle", "small"] as const).map(
    (d) => ({
      key: d,
      label: (
        <Button type="text" onClick={() => setDensity(d)}>
          {d === "large" ? "Comfortable" : d === "middle" ? "Cozy" : "Compact"}
        </Button>
      ),
    })
  );

  const rowsMenu: MenuProps["items"] = [10, 25, 50, 100, 200].map((n) => ({
    key: String(n),
    label: (
      <Button
        type="text"
        onClick={() => setPageSize(n)}
      >
        {n}
      </Button>
    ),
  }));

  const clearAll = () => {
    setFilters({ ranked: null, tracked: null, withComps: false });
    setSearch("");
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-semibold">{title}</div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown menu={{ items: columnMenu }} trigger={["click"]}>
            <Button aria-label="Columns">
              <Columns3 size={16} className="mr-1" /> Columns
            </Button>
          </Dropdown>
          <Dropdown menu={{ items: densityMenu }} trigger={["click"]}>
            <Button aria-label="Density">
              <List size={16} className="mr-1" /> Density
            </Button>
          </Dropdown>
          <Dropdown menu={{ items: rowsMenu }} trigger={["click"]}>
            <Button aria-label="Rows per page">
              <LayoutGrid size={16} className="mr-1" /> Rows
            </Button>
          </Dropdown>
          <Tooltip title="Refresh">
            <Button onClick={() => window.location.reload()} icon={<RefreshCw size={16} />} />
          </Tooltip>
          <Tooltip title="Export CSV">
            <Button onClick={() => exportCSV(filtered)} icon={<Download size={16} />} />
          </Tooltip>
          <div className="relative">
            <Input
              allowClear
              prefix={<SearchIcon size={16} className="text-slate-400" />}
              placeholder="Search keyword or URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-xs ${filters.ranked === true ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                ranked: f.ranked === true ? null : true,
              }))
            }
          >
            Ranked
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${filters.ranked === false ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                ranked: f.ranked === false ? null : false,
              }))
            }
          >
            Not ranked
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${filters.tracked === true ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                tracked: f.tracked === true ? null : true,
              }))
            }
          >
            In tracker
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${filters.tracked === false ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                tracked: f.tracked === false ? null : false,
              }))
            }
          >
            Untracked
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${filters.withComps ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            onClick={() =>
              setFilters((f) => ({ ...f, withComps: !f.withComps }))
            }
          >
            With competitors
          </button>
        </div>
        <Button type="text" className="text-slate-600" onClick={clearAll}>
          Clear all
        </Button>
      </div>

      {/* Bulk bar */}
      {selectedKeys.length > 0 && (
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-slate-100 px-2 text-sm">
          <div>
            <strong>{selectedKeys.length}</strong> selected
          </div>
          <Space>
            <Button size="small" onClick={() => message.success("Assign Task")}>
              <ClipboardList size={14} className="mr-1" /> Task
            </Button>
            <Button
              size="small"
              onClick={() =>
                exportCSV(filtered.filter((r) => selectedKeys.includes(r.id)))
              }
              icon={<Download size={14} />}
            >
              Export
            </Button>
            <Button size="small" onClick={() => message.success("Add to Tracking")}>
              <Plus size={14} className="mr-1" /> Add
            </Button>
            <Button
              size="small"
              danger
              onClick={() => message.warning("Remove (demo)")}
              icon={<Trash2 size={14} />}
            >
              Remove
            </Button>
            <Button size="small" onClick={() => setSelectedKeys([])}>
              Deselect all
            </Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Table<CheckerRow>
        rowKey="id"
        size={density}
        columns={columns}
        dataSource={filtered}
        rowSelection={rowSelection}
        sticky
        scroll={{ x: 1400 }}
        pagination={{
          pageSize,
          showSizeChanger: false,
        }}
        className="px-2"
      />
    </div>
  );
}
