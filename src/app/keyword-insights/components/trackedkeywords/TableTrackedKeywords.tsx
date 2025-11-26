"use client"

import { useProjectManager } from "@/src/hooks/use-project-manager"
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"
import { BASE_URL_WR } from "@/src/util/api"
import { Popover ,Pagination  } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Columns3,
  Download,
  ExternalLink,
  Filter,
  Globe,
  LayoutGrid,
  List,
  Loader2,
  Monitor,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import React, { useEffect, useMemo, useState } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts"
import Cookies from "js-cookie"
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { toast } from "sonner"
countries.registerLocale(en);



/* ========================= */
const CSS = [
  ":root{--wr-brand:#008CCD;--wr-value-blue:#0077FF;--wr-text:#111827;--wr-muted:#6B7280;--wr-borderLight:#EFF0F6;--wr-chip-bg:#F5F7FA;--wr-chip-hover:#E5E7EB;--wr-radius:6px;--wr-shadow-sm:0 1px 2px rgba(17,24,39,.06);--wr-row-hover:#FAFAFA;--wr-panel:#F9FAFB}",
  "*{box-sizing:border-box}",
  "body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:var(--wr-text)}",
  ".wr-section{padding:16px;background:#fff;border:1px solid var(--wr-borderLight);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm)}",
  ".wr-title{font-weight:600;color:var(--wr-text)}",
  ".wr-muted{color:var(--wr-muted)}",
  ".wr-chip{display:inline-flex;align-items:center;gap:8px;height:24px;padding:0 10px;font-size:12px;color:#000;background:var(--wr-chip-bg);border-radius:999px;border:1px solid var(--wr-borderLight)}",
  ".wr-chip:hover{background:var(--wr-chip-hover);cursor:pointer}",
  ".wr-chip.active{background:#fff;box-shadow:inset 0 0 0 1px var(--wr-value-blue);color:var(--wr-text)}",
  ".wr-iconbtn{width:32px;height:32px;border:1px solid var(--wr-borderLight);border-radius:6px;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}",
  ".wr-toolbar{display:flex;align-items:center;gap:8px}",
  ".wr-section-header{height:48px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--wr-borderLight)}",

  ".filter-bar{border-bottom:1px solid var(--wr-borderLight)}",
  ".filter-row{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 4px}",
  ".bulk-row{height:48px;display:flex;align-items:center;justify-content:space-between;background:var(--wr-chip-bg);border-top:1px solid var(--wr-borderLight);padding:0 8px}",

  ".menu{position:absolute;top:40px;right:0;background:#fff;border:1px solid var(--wr-borderLight);border-radius:8px;box-shadow:var(--wr-shadow-sm);padding:8px;min-width:220px;z-index:10}",
  ".menu h4{margin:6px 8px 8px 8px;font-size:12px;color:var(--wr-muted)}",
  ".menu .row{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;font-size:13px}",
  ".menu .row:hover{background:#FAFAFA;border-radius:6px}",

  ".table-scroll{overflow:auto}",
  "table{width:100%;border-collapse:separate;border-spacing:0}",
  "thead th{position:sticky;top:0;z-index:5;background:var(--wr-chip-bg);color:var(--wr-muted);font-weight:600;border-bottom:1px solid var(--wr-borderLight);height:44px;padding:0 12px;text-align:left;white-space:nowrap}",
  "tbody td{height:var(--rowH,48px);padding:0 12px;border-bottom:1px solid var(--wr-borderLight);vertical-align:middle;background:#fff}",
  "tr:hover{background:var(--wr-row-hover)}",

  ".sticky-kw{position:sticky;left:0;z-index:3;background:#fff}",

  ".tag{display:inline-flex;align-items:center;background:var(--wr-chip-bg);border:1px solid var(--wr-borderLight);border-radius:999px;padding:0 8px;height:24px;margin-right:6px;font-size:12px}",
  ".tag button{margin-left:6px;border:0;background:transparent;cursor:pointer}",
].join("\n")

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}

/* ========================= */
type Intent = "Informational" | "Navigational" | "Commercial" | "Transactional"
type Priority = "High" | "Medium" | "Low"
type Device = "desktop" | "mobile"
type Location = string

type Row = {
  id: string
  keywordId: number
  keyword: string
  volume: number | null
  device: Device
  locationISO: string | null
  locationLabel: string
  todayRank: number | null
  rank7dAgo: number | null
  initialRank: number | null
  change: number | null
  intent: Intent
  priority: Priority
  folder?: string | null
  url?: string | null
  googlePage?: string | null;
  tags: string[]
  trend30d?: (number | null)[]
  engineId: number | null
}

interface LocationOption {
  id: number
  label: string
  engine_id_desktop: number
  engine_id_mobile: number
}

interface EngineResolverProps {
  keywordId: number
  currentLocation?: string
  onResolved?: (keywordId: number, engineId: number) => Promise<void> | void
}

/* ========================= */
const nf = (n: number) => new Intl.NumberFormat().format(n)
function toISO2(location?: string): string | null {
  if (!location) return null;

  const s = location.trim();
  // If already ISO-2 like "IN", "US", "GB" – accept it as-is
  if (/^[A-Z]{2}$/i.test(s)) return s.toUpperCase();

  // Try by English name (case-insensitive), returns alpha2 or undefined
  const code = countries.getAlpha2Code(s, "en");
  return code ? code.toUpperCase() : null;
}

// Optional: produce a flag emoji from ISO-2 without any deps
function flagEmoji(iso2?: string | null): string {
  if (!iso2) return "";
  return iso2
    .toUpperCase()
    .replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
const rankCell = (n: number | null) => (n == null || n > 100 ? "—" : `#${n}`)
function exportCSV(rows: Row[]) {
  const headers = [
    "Keyword",
    "Search Volume",
    "Device",
    "Location",
    "Today Rank",
    "7 Days Ago",
    "Initial Rank",
    "Change",
    "Intent",
    "Priority",
    "Folder",
    "URL",
    "Tags",
  ]
  const lines = rows.map((r) =>
    [
      r.keyword,
      r.volume ?? "",
      r.device,
      r.locationISO,
      r.todayRank ?? "",
      r.rank7dAgo ?? "",
      r.initialRank ?? "",
      r.change ?? "",
      r.intent,
      r.priority,
      r.folder ?? "",
      r.url ?? "",
      r.tags.join("|"),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  const csv = [headers.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "tracked_keywords.csv"
  a.click()
  URL.revokeObjectURL(url)
}

/* Tags editor */
function TagsEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState("")
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {tags.map((t, i) => (
        <span key={i} className="tag">
          {t}
          <button aria-label={`remove ${t}`} onClick={() => onChange(tags.filter((_, j) => j !== i))}>
            ✕
          </button>
        </span>
      ))}
      <input
        aria-label="Add tag"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && val.trim()) {
            onChange([...tags, val.trim()])
            setVal("")
          }
          if (e.key === "Backspace" && !val && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
        placeholder="+"
        style={{ width: 60, height: 28, border: `1px solid var(--wr-borderLight)`, borderRadius: 6, padding: "0 6px" }}
      />
    </div>
  )
}

const EngineResolver = ({ keywordId, currentLocation, onResolved }: EngineResolverProps) => {
  const [query, setQuery] = useState(currentLocation ?? "")
  const [options, setOptions] = useState<LocationOption[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<number | "">("")
  const [device, setDevice] = useState<Device>("desktop")
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const token = Cookies.get("login_access_token_wrank")

  const searchLocations = async () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      toast.error("Enter at least 2 characters to search locations.")
      return
    }

    setIsSearching(true)
    try {
      const url = new URL(`${BASE_URL_WR}search-engines/`)
      url.searchParams.set("country", trimmed.toLowerCase())
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error(`Search failed (${res.status})`)

      const data = (await res.json()) as Array<{
        id: number
        country: string
        engine_id_desktop: number
        engine_id_mobile: number
      }>

      const mapped: LocationOption[] = data.map((row) => ({
        id: row.id,
        label: row.country,
        engine_id_desktop: row.engine_id_desktop,
        engine_id_mobile: row.engine_id_mobile,
      }))

      setOptions(mapped)
      setSelectedLocationId(mapped[0]?.id ?? "")

      if (!mapped.length) {
        toast.info("No matching locations found.")
      }
    } catch (error) {
      console.error("Location search failed:", error)
      toast.error("Could not fetch locations. Try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSave = async () => {
    if (!selectedLocationId) {
      toast.error("Select a location before updating.")
      return
    }

    const selection = options.find((opt) => opt.id === Number(selectedLocationId))
    if (!selection) {
      toast.error("Selected location is no longer available.")
      return
    }

    const engineId = device === "mobile" ? selection.engine_id_mobile : selection.engine_id_desktop
    if (!engineId) {
      toast.error("Engine id missing for this selection.")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`${BASE_URL_WR}tracking/seranking/start/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          keyword_id: keywordId,
          engine_id: engineId,
          device: device === "mobile" ? "Mobile" : "Desktop",
          location: selection.label,
        }),
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || "Failed to start tracking keyword.")
      }

      toast.success("Tracking started for keyword.")

      if (onResolved) {
        await onResolved(keywordId, engineId)
      }
    } catch (error) {
      console.error("Failed to start tracking:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start tracking keyword.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mt-2 rounded-md border border-dashed border-amber-300 bg-amber-50 p-3 text-xs">
      <p className="text-amber-800 font-semibold">Tracking not started</p>
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            aria-label="Search location"
            className="flex-1 rounded border border-amber-200 px-2 py-1 text-xs outline-none focus:border-amber-400"
            placeholder="Search country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="rounded bg-amber-600 px-3 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={searchLocations}
            disabled={isSearching || query.trim().length < 2}
            type="button"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>

        {options.length > 0 && (
          <select
            className="w-full rounded border border-amber-200 px-2 py-1 text-xs outline-none focus:border-amber-400"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value ? Number(e.target.value) : "")}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <select
            className="flex-1 rounded border border-amber-200 px-2 py-1 text-xs outline-none focus:border-amber-400"
            value={device}
            onChange={(e) => setDevice(e.target.value as Device)}
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>

          <button
            className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSave}
            disabled={isSaving || !selectedLocationId}
            type="button"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start tracking"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ========================= */
type TopBucket = "top3" | "top10" | "top50" | null
type Filters = {
  topBucket: TopBucket
  newly: boolean
  device: "any" | Device
  location: "any" | Location
}
interface KeywordData {
  id: number
  created_at: string
  updated_at: string
  keyword: string
  project_id: number
  location_code: string
  location: string
  created_date: string
  created_time: string
  keyword_details: KeywordDetail[]
  device: string
  volume: number
  intent: string
  priority: string
  engine_id: number | null
}

interface ApiResponse {
  project_id: number
  language: string
  location: string
  keyword_data: KeywordData[]
}
interface KeywordDetail {
  id: number
  project_keyword_id: number
  datetime: string
  user_id: number
  task_id: string
  domain: string | null
  rank: number
  serp_page: string
  google_page: string
  status: string
  date: string
  time: string
}

interface TableTrackedKeywordsProps {
  keywordData: KeywordData[]
  loading: boolean
  onRefresh?: () => Promise<void> | void
  selectedProject?: any
  onOpen?: () => void
  onClose?: () => void
}

export default function TabletrackedkeywordsApp({ keywordData, loading, onRefresh }: TableTrackedKeywordsProps) {
  const { openTaskDrawer } = useTaskDrawer();
  const { selectedProject } = useProjectManager();
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState("")
  const [density, setDensity] = useState<"comfortable" | "cozy" | "compact">("comfortable")
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: "today" | "change" | "volume" | "priority"; dir: "asc" | "desc" }>({
    key: "today",
    dir: "asc",
  })

  const transformKeywordData = (data: KeywordData[]): Row[] => {
    return data.map((keyword) => {

      const details = keyword.keyword_details.sort(
        (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
      )

      const todayRank = details[0]?.rank > 0 ? details[0].rank : null

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const rank7dAgo = details.find((d) => {
        const detailDate = new Date(d.datetime)
        const diffDays = Math.abs((sevenDaysAgo.getTime() - detailDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 2
      })?.rank
      const rank7dAgoValue = rank7dAgo && rank7dAgo > 0 ? rank7dAgo : null

      const initialRank = details[details.length - 1]?.rank > 0 ? details[details.length - 1].rank : null

      let change: number | null = null
      if (todayRank && rank7dAgoValue) {
        change = todayRank - rank7dAgoValue
      }

      const availableDates = details.filter((d) => d.rank > 0).length
      const trendDays = Math.min(30, availableDates) // Use available data up to 30 days

      const trend30d: (number | null)[] = []
      for (let i = trendDays - 1; i >= 0; i--) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() - i)

        const closestDetail = details.find((d) => {
          const detailDate = new Date(d.datetime)
          const diffDays = Math.abs((targetDate.getTime() - detailDate.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays <= 1
        })

        trend30d.push(closestDetail && closestDetail.rank > 0 ? closestDetail.rank : null)
      }

      const iso2 = toISO2(keyword.location);
      const googlePage =
        (details[0]?.google_page && details[0]?.google_page.trim())
          ? details[0].google_page
          : ``;


      return {
        id: keyword.id.toString(),
        keywordId: keyword.id,
        keyword: keyword.keyword,
        volume: keyword.volume > 0 ? keyword.volume : null,
        device: (keyword.device?.toLowerCase() === "mobile" ? "mobile" : "desktop") as Device,
        locationISO: iso2,
        locationLabel: keyword.location || "",
        todayRank,
        rank7dAgo: rank7dAgoValue,
        initialRank,
        change,
        intent: (keyword.intent.charAt(0).toUpperCase() + keyword.intent.slice(1)) as Intent,
        priority: (keyword.priority.charAt(0).toUpperCase() + keyword.priority.slice(1)) as Priority,
        folder: null,
        url: details[0]?.serp_page || null,
        googlePage,
        tags: [keyword.intent, keyword.priority].filter(Boolean),
        trend30d,
        engineId: keyword.engine_id ?? null,
      }
    })
  }

  useEffect(() => {
    if (!keywordData || keywordData.length === 0) {
      setRows([])
      return
    }

    if (keywordData && keywordData.length > 0) {
      const transformedRows = transformKeywordData(keywordData)
      setRows(transformedRows)
    }
  }, [keywordData])

  const [filters, setFilters] = useState<Filters>({
    topBucket: null,
    newly: false,
    device: "any",
    location: "any",
  })

  const [openMenu, setOpenMenu] = useState<null | "cols" | "density" | "rows" | "smart">(null)

  const [cols, setCols] = useState({
    volume: true,
    device: true,
    location: true,
    today: true,
    seven: true,
    initial: true,
    change: true,
    intent: true,
    priority: true,
    folder: true,
    url: true,
    tags: true,
    actions: true,
  })

  const handleEngineResolved = async (keywordId: number, engineId: number) => {
    setRows((rs) => rs.map((row) => (row.keywordId === keywordId ? { ...row, engineId } : row)))

    if (onRefresh) {
      try {
        await onRefresh()
      } catch (error) {
        console.error("Failed to refresh keywords after engine update:", error)
      }
    }
  }



  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let out = rows.filter((r) => !q || [r.keyword, r.url || "", ...r.tags].join(" ").toLowerCase().includes(q))

    if (filters.device !== "any") out = out.filter((r) => r.device === filters.device)
    if (filters.location !== "any") out = out.filter((r) => r.locationISO === filters.location)

    if (filters.topBucket) {
      const lim = filters.topBucket === "top3" ? 3 : filters.topBucket === "top10" ? 10 : 50
      out = out.filter((r) => (r.todayRank ?? 9999) <= lim)
    }
    if (filters.newly) {
      out = out.filter((r) => {
        const was = r.rank7dAgo
        const today = r.todayRank
        const unranked7d = was == null || was > 100
        return unranked7d && today != null && today <= 100
      })
    }

    out.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1
      const prioOrder = (p: Priority) => (p === "High" ? 0 : p === "Medium" ? 1 : 2)
      let va: any, vb: any
      if (sort.key === "today") {
        va = a.todayRank ?? 1e9
        vb = b.todayRank ?? 1e9
      } else if (sort.key === "change") {
        va = a.change == null ? 1e9 : a.change
        vb = b.change == null ? 1e9 : b.change
      } else if (sort.key === "volume") {
        va = a.volume ?? -1
        vb = b.volume ?? -1
        if (va === vb) {
          va = a.todayRank ?? 1e9
          vb = b.todayRank ?? 1e9
        }
      } else {
        va = prioOrder(a.priority)
        vb = prioOrder(b.priority)
      }
      return (va > vb ? 1 : -1) * dir
    })

    return out
  }, [rows, search, sort, filters])

  const locationOptions = useMemo(() => {
    const set = new Set(rows.map(r => r.locationISO).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [rows]);


  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage)
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))


  function createTask(title: string, description: string) {
    openTaskDrawer({
      title,
      description,
      projectId: selectedProject?.id ?? null,
      type: "createNew",
    });
  }

  function buildTaskForRow(r: Row) {
    const lines = [
      `Keyword: ${r.keyword}`,
      `Device: ${r.device}`,
      `Location: ${r.locationISO}`,
      `Today Rank: ${r.todayRank ?? "—"}`,
      `7d Ago: ${r.rank7dAgo ?? "—"}`,
      `Initial Rank: ${r.initialRank ?? "—"}`,
      `Intent: ${r.intent}`,
      `Priority: ${r.priority}`,
      r.volume != null ? `Search Volume: ${r.volume}` : null,
      r.url ? `SERP Link: ${r.url}` : null,
    ].filter(Boolean);
    return {
      title: `Keyword Task · ${r.keyword}`,
      desc: lines.join("\n"),
    };
  }

  function buildBulkTask(selectedRows: Row[]) {
    const head = `Keywords Selected: ${selectedRows.length}`;
    const body = selectedRows.slice(0, 50).map((k) =>
      `• ${k.keyword} — Today: ${k.todayRank ?? "—"} | 7d: ${k.rank7dAgo ?? "—"} | ${k.device}/${k.locationISO}`
    );
    const tail = selectedRows.length > 50 ? "… (truncated)" : null;
    return {
      title: `Keyword Ops · ${selectedRows.length} selected`,
      desc: [head, "", ...body, tail].filter(Boolean).join("\n"),
    };
  }


  if (loading)
    return (
      <>
        <GlobalStyles />
        <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
        </div>
      </>
    )


  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button className={`wr-chip ${active ? "active" : ""}`} onClick={onClick}>
      {label}
    </button>
  )

  return (
    <>
      <GlobalStyles />
      <div style={{ padding: 16 }}>
        <section
          className="wr-section"
          style={{ ["--rowH" as any]: density === "comfortable" ? "48px" : density === "cozy" ? "44px" : "40px" }}
        >
          <div className="wr-section-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <h3 className="wr-title" style={{ fontSize: 16, margin: 0 }}>
                Tracked Keywords
              </h3>
              <span className="wr-chip">{nf(filtered.length)}</span>
            </div>

            <div className="wr-toolbar" style={{ position: "relative" }}>
              <button
                className="wr-iconbtn"
                title="Columns"
                onClick={() => setOpenMenu((m) => (m === "cols" ? null : "cols"))}
              >
                <Columns3 size={16} />
              </button>
              <button
                className="wr-iconbtn"
                title="Density"
                onClick={() => setOpenMenu((m) => (m === "density" ? null : "density"))}
              >
                <List size={16} />
              </button>
              <button
                className="wr-iconbtn"
                title="Rows / page"
                onClick={() => setOpenMenu((m) => (m === "rows" ? null : "rows"))}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className="wr-iconbtn"
                title="Smart Filters"
                onClick={() => setOpenMenu((m) => (m === "smart" ? null : "smart"))}
              >
                <Filter size={16} />
              </button>
              <button className="wr-iconbtn" title="Export CSV" onClick={() => exportCSV(filtered)}>
                <Download size={16} />
              </button>

              {openMenu === "cols" && (
                <div className="menu" onMouseLeave={() => setOpenMenu(null)}>
                  <h4>Visible columns</h4>
                  {Object.keys(cols).map((k) => (
                    <label key={k} className="row">
                      <span>{k}</span>
                      <input
                        type="checkbox"
                        checked={(cols as any)[k]}
                        onChange={() => {
                          const next = { ...cols } as any
                          next[k] = !next[k]
                          setCols(next)
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}
              {openMenu === "density" && (
                <div className="menu" onMouseLeave={() => setOpenMenu(null)}>
                  <h4>Row density</h4>
                  {(["comfortable", "cozy", "compact"] as const).map((d) => (
                    <button
                      key={d}
                      className="row"
                      onClick={() => {
                        setDensity(d)
                        setOpenMenu(null)
                      }}
                    >
                      <span style={{ textTransform: "capitalize" }}>{d}</span>
                      {density === d ? "✓" : ""}
                    </button>
                  ))}
                </div>
              )}
              {openMenu === "rows" && (
                <div className="menu" onMouseLeave={() => setOpenMenu(null)}>
                  <h4>Rows per page</h4>
                  {[25, 50, 100, 200].map((n) => (
                    <button
                      key={n}
                      className="row"
                      onClick={() => {
                        setPerPage(n)
                        setPage(1)
                        setOpenMenu(null)
                      }}
                    >
                      <span>{n}</span>
                      {perPage === n ? "✓" : ""}
                    </button>
                  ))}
                </div>
              )}
              {openMenu === "smart" && (
                <div className="menu" onMouseLeave={() => setOpenMenu(null)}>
                  <h4>Quick filters</h4>
                  <div className="row">
                    <span>Top 3</span>
                    <input
                      type="checkbox"
                      checked={filters.topBucket === "top3"}
                      onChange={() => {
                        setFilters((f) => ({ ...f, topBucket: f.topBucket === "top3" ? null : "top3" }))
                      }}
                    />
                  </div>
                  <div className="row">
                    <span>Top 10</span>
                    <input
                      type="checkbox"
                      checked={filters.topBucket === "top10"}
                      onChange={() => {
                        setFilters((f) => ({ ...f, topBucket: f.topBucket === "top10" ? null : "top10" }))
                      }}
                    />
                  </div>
                  <div className="row">
                    <span>Top 50</span>
                    <input
                      type="checkbox"
                      checked={filters.topBucket === "top50"}
                      onChange={() => {
                        setFilters((f) => ({ ...f, topBucket: f.topBucket === "top50" ? null : "top50" }))
                      }}
                    />
                  </div>
                  <div className="row">
                    <span>Newly Ranked (7d)</span>
                    <input
                      type="checkbox"
                      checked={filters.newly}
                      onChange={() => {
                        setFilters((f) => ({ ...f, newly: !f.newly }))
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="filter-bar">
            <div className="filter-row">
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {chip("Top 3", filters.topBucket === "top3", () =>
                  setFilters((f) => ({ ...f, topBucket: f.topBucket === "top3" ? null : "top3" })),
                )}
                {chip("Top 10", filters.topBucket === "top10", () =>
                  setFilters((f) => ({ ...f, topBucket: f.topBucket === "top10" ? null : "top10" })),
                )}
                {chip("Top 50", filters.topBucket === "top50", () =>
                  setFilters((f) => ({ ...f, topBucket: f.topBucket === "top50" ? null : "top50" })),
                )}
                {chip("Newly Ranked (7d)", filters.newly, () => setFilters((f) => ({ ...f, newly: !f.newly })))}
                {chip("🖥 Desktop", filters.device === "desktop", () =>
                  setFilters((f) => ({ ...f, device: f.device === "desktop" ? "any" : "desktop" })),
                )}
                {chip("📱 Mobile", filters.device === "mobile", () =>
                  setFilters((f) => ({ ...f, device: f.device === "mobile" ? "any" : "mobile" })),
                )}

                {locationOptions.map((cc) =>
                  chip(`${flagEmoji(cc)} ${cc}`, filters.location === cc, () =>
                    setFilters((f) => ({ ...f, location: f.location === cc ? "any" : cc })),
                  )
                )}

              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="wr-chip"
                  onClick={() => {
                    setFilters({ topBucket: null, newly: false, device: "any", location: "any" })
                    setSearch("")
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {selected.size > 0 && (
              <div className="bulk-row">
                <div>
                  <strong>{selected.size}</strong> selected
                </div>
                <div className="wr-toolbar">
                  <button
                    className="wr-chip"
                    onClick={() => {
                      const selectedRows = pageRows.filter((r) => selected.has(r.id));
                      if (!selectedRows.length) return;
                      const { title, desc } = buildBulkTask(selectedRows);
                      createTask(title, desc);
                    }}
                  >
                    <ClipboardList size={14} /> Create Task
                  </button>

                  <button className="wr-chip" onClick={() => exportCSV(rows.filter((r) => selected.has(r.id)))}>
                    Export
                  </button>
                  <button className="wr-chip" onClick={() => setSelected(new Set())}>
                    Deselect all
                  </button>
                  <button
                    className="wr-chip"
                    onClick={() => {
                      if (confirm(`Delete ${selected.size} keyword(s)?`)) {
                        setRows((rs: Row[]) => rs.filter((x) => !selected.has(x.id)))
                        setSelected(new Set())
                      }
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0" }}>
            <div style={{ position: "relative" }}>
              <input
                aria-label="Search keyword, tag, or URL"
                placeholder="Search keyword, tag, or URL…"
                style={{
                  width: 320,
                  height: 32,
                  border: `1px solid var(--wr-borderLight)`,
                  borderRadius: 6,
                  padding: "0 28px",
                }}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
              <Search size={16} style={{ position: "absolute", left: 8, top: 8 }} className="wr-muted" />
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 52 }}>
                    <input
                      type="checkbox"
                      aria-label="Select page"
                      checked={allPageSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected((s) => {
                            const n = new Set(s)
                            pageRows.forEach((r) => n.add(r.id))
                            return n
                          })
                        } else {
                          setSelected((s) => {
                            const n = new Set(s)
                            pageRows.forEach((r) => n.delete(r.id))
                            return n
                          })
                        }
                      }}
                    />
                  </th>
                  <th
                    className="sticky-kw"
                    style={{ left: 0, minWidth: 260, maxWidth: 420, background: "var(--wr-chip-bg)" }}
                  >
                    Keyword
                  </th>

                  {cols.volume && <th>Search Volume</th>}
                  {cols.device && <th>Device</th>}
                  {cols.location && <th>Location</th>}
                  {cols.today && (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setSort((s) => ({ key: "today", dir: s.key === "today" && s.dir === "asc" ? "desc" : "asc" }))
                      }
                    >
                      Today's Rank
                    </th>
                  )}
                  {cols.seven && <th>7 Days Ago</th>}
                  {cols.initial && <th>Initial Rank</th>}
                  {cols.change && (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setSort((s) => ({ key: "change", dir: s.key === "change" && s.dir === "asc" ? "desc" : "asc" }))
                      }
                    >
                      Change
                    </th>
                  )}
                  {cols.intent && <th>Intent</th>}
                  {cols.priority && <th>Priority</th>}
                  {cols.folder && <th>Folder</th>}
                  {cols.url && <th>Landing Page (URL)</th>}
                  {cols.tags && <th>Tags</th>}
                  {cols.actions && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {pageRows.map((r: any) => {
                  const isSel = selected.has(r.id)
                  const isExp = expanded.has(r.id)


                  return (
                    <React.Fragment key={r.id}>
                      <tr>
                        <td style={{ width: 52 }}>
                          <input
                            type="checkbox"
                            aria-label={`Select keyword ${r.keyword}`}
                            checked={isSel}
                            onChange={(e) => {
                              setSelected((s) => {
                                const n = new Set(s)
                                e.target.checked ? n.add(r.id) : n.delete(r.id)
                                return n
                              })
                            }}
                          />
                        </td>

                        <td className="sticky-kw " style={{ left: 0, minWidth: 260, maxWidth: 420 }}>
                          <div className="flex items-center gap-2">
                            <button
                              className="border p-1 rounded-lg cursor-pointer"
                              aria-label="Expand"
                              onClick={() =>
                                setExpanded((e) => {
                                  const n = new Set(e)
                                  n.has(r.id) ? n.delete(r.id) : n.add(r.id)
                                  return n
                                })
                              }
                            >
                              <motion.div
                                initial={false}
                                animate={{ rotate: isExp ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight size={16} />
                              </motion.div>
                            </button>
                            <strong title={r.keyword}>{r.keyword}</strong>
                          </div>

                          <div className="wr-muted" style={{ fontSize: 12 }}>
                            {r.tags[0] || ""}
                          </div>
                        </td>

                        {cols.volume && (
                          <td>{r.volume ? nf(r.volume) : "—"}</td>
                        )}
                        {cols.device && (
                          <td>
                            {r.device === "desktop" ? (
                              <Monitor size={16} strokeWidth={2} className="wr-muted" />
                            ) : (
                              <Smartphone size={16} strokeWidth={2} className="wr-muted" />
                            )}
                          </td>
                        )}
                        {cols.location && (
                          <td>
                            <div className="flex items-center gap-2">
                              {r.locationISO ? (
                                <Image
                                  height={20}
                                  width={20}
                                  src={`https://flagcdn.com/64x48/${r.locationISO.toLowerCase()}.png`}
                                  alt={r.locationISO}
                                />
                              ) : (
                                <Globe size={16} className="wr-muted" />
                              )}
                              <span>{r.locationLabel || r.locationISO || "—"}</span>
                            </div>
                            {!r.engineId && (
                              <EngineResolver
                                keywordId={r.keywordId}
                                currentLocation={r.locationLabel || r.locationISO || ""}
                                onResolved={handleEngineResolved}
                              />
                            )}
                          </td>
                        )}

                        {cols.today && <td style={{ textAlign: "center", minWidth: 98 }}>{rankCell(r.todayRank)}</td>}
                        {cols.seven && <td style={{ textAlign: "center", minWidth: 98 }}>{rankCell(r.rank7dAgo)}</td>}
                        {cols.initial && (
                          <td style={{ textAlign: "center", minWidth: 98 }}>{rankCell(r.initialRank)}</td>
                        )}
                        {cols.change && (
                          <td style={{ textAlign: "center", minWidth: 118 }}>
                            {r.change == null ? (
                              <span className="wr-chip" style={{ height: 20 }}>
                                —
                              </span>
                            ) : r.change < 0 ? (
                              <span className="wr-chip" style={{ height: 20, background: "#10B981", color: "#fff" }}>
                                ↑ {Math.abs(r.change)}
                              </span>
                            ) : r.change > 0 ? (
                              <span className="wr-chip" style={{ height: 20, background: "#EF4444", color: "#fff" }}>
                                ↓ {Math.abs(r.change)}
                              </span>
                            ) : (
                              <span className="wr-chip" style={{ height: 20, background: "#6B7280", color: "#fff" }}>
                                ↔ 0
                              </span>
                            )}
                          </td>
                        )}
                        {cols.intent && (
                          <td>
                            <select
                              value={r.intent}
                              onChange={(e) =>
                                setRows((rs) =>
                                  rs.map((x) => (x.id === r.id ? { ...x, intent: e.target.value as Intent } : x)),
                                )
                              }
                            >
                              {["Informational", "Navigational", "Commercial", "Transactional"].map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        {cols.priority && (
                          <td>
                            <select
                              value={r.priority}
                              onChange={(e) =>
                                setRows((rs) =>
                                  rs.map((x) => (x.id === r.id ? { ...x, priority: e.target.value as Priority } : x)),
                                )
                              }
                            >
                              {["High", "Medium", "Low"].map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        {cols.folder && (
                          <td>
                            <input
                              value={r.folder || ""}
                              onChange={(e) =>
                                setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, folder: e.target.value } : x)))
                              }
                              placeholder="None"
                              style={{
                                width: "100%",
                                height: 28,
                                border: `1px solid var(--wr-borderLight)`,
                                borderRadius: 6,
                                padding: "0 6px",
                              }}
                            />
                          </td>
                        )}
                        {cols.url && (
                          <td style={{ minWidth: 240, maxWidth: 420 }}>
                            {r.url ? (
                              <a
                                href={r.url}
                                title={r.url}
                                onClick={(e) => e.preventDefault()}
                                style={{ color: "var(--wr-value-blue)", textDecoration: "none" }}
                              >
                                {r.url} <ExternalLink size={14} />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                        {cols.tags && (
                          <td>
                            <TagsEditor
                              tags={r.tags}
                              onChange={(t) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, tags: t } : x)))}
                            />
                          </td>
                        )}
                        {cols.actions && (
                          <td style={{ textAlign: "center" }}>
                            <div className="wr-toolbar" style={{ justifyContent: "center" }}>
                              <button
                                className="wr-iconbtn"
                                title="Create Task"
                                onClick={() => {
                                  const { title, desc } = buildTaskForRow(r);
                                  createTask(title, desc);
                                }}
                              >
                                <ClipboardList size={16} />
                              </button>

                              {/* SERP (Google) */}
                              <Popover
                                placement="left"
                                overlayStyle={{ maxWidth: 360 }}
                                content={
                                  <div style={{ maxWidth: 340, wordBreak: "break-all" }}>
                                    <div style={{ fontSize: 12, color: "var(--wr-muted)", marginBottom: 4 }}>
                                      Google SERP URL
                                    </div>
                                    {r.googlePage ? (
                                      <a href={r.googlePage} target="_blank" rel="noopener noreferrer" style={{ color: "var(--wr-value-blue)" }}>
                                        {r.googlePage}
                                      </a>
                                    ) : (
                                      <span>Not available</span>
                                    )}
                                  </div>
                                }
                                trigger="hover"
                              >
                                <button
                                  className="wr-iconbtn"
                                  title="Google SERP"
                                  onClick={() => {
                                    if (!r.googlePage) return;
                                    window.open(r.googlePage, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <Search size={16} />
                                </button>
                              </Popover>


                              <button
                                className="wr-iconbtn"
                                title="Drilldown"
                                onClick={() => {
                                  setExpanded((e) => {
                                    const n = new Set(e);
                                    n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                                    return n;
                                  });
                                }}
                              >
                                <BarChart3 size={16} />
                              </button>

                            </div>
                          </td>
                        )}
                      </tr>

                      <AnimatePresence initial={false}>
                        {isExp && (
                          <motion.tr
                            key={`exp-${r.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={15} style={{ padding: 0 }}>
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <div style={{ padding: 16, borderTop: `1px solid var(--wr-borderLight)` }}>
                                  <div className="wr-title" style={{ fontSize: 14, marginBottom: 8 }}>
                                    {r.keyword} — {r.trend30d?.length || 0} day Rank Trend
                                  </div>
                                  <div style={{ height: 120 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={(r.trend30d || []).map((v, i) => ({ d: i + 1, v: v ?? 110 }))}>
                                        <Area type="monotone" dataKey="v" stroke="#4286F5" fill="#BDD6FF" />
                                        <RTooltip formatter={(v: any) => [`#${v}`, "Rank"]} />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="wr-muted" style={{ fontSize: 12 }}>
          {filtered.length === 0
            ? "No keywords found"
            : `Showing ${(page - 1) * perPage + 1}–${Math.min(
                page * perPage,
                filtered.length,
              )} of ${filtered.length}`}
        </span>

        <Pagination
          size="small"
          current={page}
          pageSize={perPage}
          total={filtered.length}
          showSizeChanger
          pageSizeOptions={['10', '25', '50', '100']}
          onChange={(nextPage, nextPageSize) => {
            if (nextPageSize && nextPageSize !== perPage) {
              // page size changed
              setPerPage(nextPageSize)
              setPage(1)
            } else {
              // only page changed
              setPage(nextPage)
            }
          }}
        />
      </div>
        </section>
      </div>
    </>
  )
}
