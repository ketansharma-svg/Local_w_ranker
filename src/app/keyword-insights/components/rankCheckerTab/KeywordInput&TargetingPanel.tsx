"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Upload, ClipboardPaste, RefreshCw, Loader2, Search, Plus } from "lucide-react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import Cookies from "js-cookie"
import { useProjectManager } from "@/src/hooks/use-project-manager"
const token = Cookies.get("login_access_token_wrank")
/* ---------- Tokens (Tab 2 parity) ---------- */
const CSS = [
  ":root{--wr-brand:#008CCD;--wr-value-blue:#0077FF;--wr-chart-blue:#4286F5;--wr-chart-fill:#BDD6FF;--wr-success:#10B981;--wr-warning:#F59E0B;--wr-danger:#EF4444;--wr-text:#111827;--wr-muted:#6B7280;--wr-border:#EFF0F6;--wr-panel:#FFFFFF;--wr-hover:#FAFAFA;--wr-radius:6px;--wr-shadow-sm:0 1px 2px rgba(17,24,39,.06)}",
  "*{box-sizing:border-box}",
  "body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:var(--wr-text)}",
  ".wrap{padding:16px}",
  ".wr-chip{display:inline-flex;align-items:center;gap:8px;height:24px;padding:0 10px;font-size:12px;color:#000;background:#F5F7FA;border-radius:999px;border:1px solid var(--wr-border);transition:transform .2s ease}",
  ".wr-chip:hover{background:#E5E7EB;cursor:pointer;color:#000;transform:translateY(-1px)}",
  ".wr-chip.active{background:#fff;box-shadow:inset 0 0 0 1px var(--wr-value-blue);color:var(--wr-text)}",
  ".wr-title{font-weight:600;color:var(--wr-text)}",
  ".wr-muted{color:var(--wr-muted)}",
  ".seg{display:inline-flex;gap:2px;background:#F5F7FA;border:1px solid var(--wr-border);border-radius:999px;padding:2px}",
  ".seg button{height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;cursor:pointer;font-size:12px;color:var(--wr-text)}",
  '.seg button[data-active="true"]{background:#D9EEF8;box-shadow:inset 0 0 0 1px var(--wr-value-blue)}',
  ".sticky-panel{position:sticky;top:0;z-index:8;background:var(--wr-panel);border:1px solid var(--wr-border);border-radius:var(--wr-radius);box-shadow:var(--wr-shadow-sm);padding:16px}",
  ".tag{display:inline-flex;align-items:center;background:#F5F7FA;border:1px solid var(--wr-border);border-radius:999px;padding:0 8px;height:24px;margin-right:6px;font-size:12px}",
  ".tag button{margin-left:6px;border:0;background:transparent;cursor:pointer}",
].join("\n")
const Tokens = () => <style dangerouslySetInnerHTML={{ __html: CSS }} />

/* ---------- Types & helpers ---------- */
type Device = "desktop" | "mobile"
type Plan = "free" | "premium"

export interface InputPanelState {
  keywords: string[]
  device: Device
  locationISO: "IN" | "US" | "AE" // retained for compatibility; not used for API
  competitors: string[]
  plan: Plan
  limits: { manual: number; csv: number }
  isSubmitting: boolean
  cachedAt?: string | null
  tw: "7d" | "30d" | "90d"
}

export interface SubmitPayload {
  device: Device
  location_id: number
  domain: string
  keywords: string[]
  competitors?: string[]
}

type SearchEngineRow = {
  id: number
  country: string
  engine_id_desktop: number
  engine_id_mobile: number
}
type LocationOption = {
  id: number
  label: string
  engine_id_desktop: number
  engine_id_mobile: number
}

const normalizeLines = (lines: string[]) => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of lines) {
    let s = raw.replace(/^["']|["']$/g, "").trim().replace(/\s+/g, " ")
    if (!s) continue
    if (s.length > 120) s = s.slice(0, 120)
    const k = s.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(s)
    }
  }
  return out
}
const parseCSVFirstCol = (text: string) => normalizeLines(text.split(/\r?\n/).map((r) => r.split(",")[0] ?? ""))
const domainValid = (d: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(d.trim())

/* ---------- Motion helpers ---------- */
const fadeUp:any = (i = 0) => ({
  initial: { opacity: 0, y: 10, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.35, ease: "easeOut", delay: i * 0.04 },
})

/* ---------- Component ---------- */
export function RankCheckerInputPanel(props: {
  state: InputPanelState
  setState: React.Dispatch<React.SetStateAction<InputPanelState>>
  onSubmit: (payload: SubmitPayload) => Promise<void> // parent will call the API
  onClearResults?: () => void
  onResetForm?: () => void
  onHeightChange?: (px: number) => void
  isLoading?: boolean
}) {
  const { selectedProject } = useProjectManager()

  const { state, setState, onSubmit, onClearResults, onResetForm, onHeightChange, isLoading } = props
  const [rawText, setRawText] = useState(state.keywords.join("\n"))
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null)
  const [fetching, setFetching] = useState(false)
  const [searchResults, setSearchResults] = useState<LocationOption[]>([])
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [domain, setDomain] = useState("")
  const [competitorDraft, setCompetitorDraft] = useState("")

  useEffect(() => {
    if (typeof selectedProject?.domain === "string") {
      setDomain(selectedProject.domain)
    }
  }, [selectedProject])

  useEffect(() => {
    setRawText(state.keywords.join("\n"))
  }, [state.keywords])

  useEffect(() => {
    if (!panelRef.current) return
    const ro = new ResizeObserver((e) => onHeightChange?.(e[0].contentRect.height))
    ro.observe(panelRef.current)
    onHeightChange?.(panelRef.current.offsetHeight)
    return () => ro.disconnect()
  }, [onHeightChange])

  function cleanup(commit: boolean) {
    const lines = normalizeLines(rawText.split(/\r?\n/))
    if (commit) setState((s) => ({ ...s, keywords: lines }))
    return lines
  }

  const entered = cleanup(false).length
  const limits = state.limits
  const overLimit = entered > limits.manual
  const overCopy =
    state.plan === "free"
      ? `You’ve entered ${entered} keywords. Free limit is 5. Remove some or Upgrade.`
      : `Max ${limits.manual} keywords per batch. Try CSV for larger imports.`
  const disableCTA = state.isSubmitting || isLoading || entered < 1 || overLimit

  // ---------- Location search against new endpoint ----------
  const handleSearch = async (value: string) => {
    setQuery(value)
    if (value.trim().length < 3) {
      setSearchResults([])
      return
    }
    setFetching(true)
    try {
      const res = await axios.get<SearchEngineRow[]>(
        `https://dashboard.wranker.com/api/search-engines/`,
        {
          params: { country: value.toLowerCase() },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      )
      const mapped: LocationOption[] = (res.data || []).map((row) => ({
        id: row.id,
        label: row.country,
        engine_id_desktop: row.engine_id_desktop,
        engine_id_mobile: row.engine_id_mobile,
      }))
      setSearchResults(mapped)
    } catch (err) {
      console.error("Error fetching search engines:", err)
      toast.error("Could not fetch locations. Try a different country name.")
    } finally {
      setFetching(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const cookieToken = Cookies.get("login_access_token_wrank")

  async function submit() {
    const list = cleanup(true)
    if (!list.length) {
      toast.error("After cleanup, no keywords remain.")
      return
    }
    if (list.length > limits.manual) {
      toast.error(overCopy)
      return
    }
    if (!domainValid(domain)) {
      toast.error("Enter a valid domain (e.g., example.com)")
      return
    }
    if (!selectedLocation) {
      toast.error("Please select a location")
      return
    }
    if (!cookieToken && !token) {
      toast.error("You’re not authenticated.")
      return
    }

    const payload: SubmitPayload = {
      device: state.device,
      location_id: selectedLocation.id,
      domain: domain.trim(),
      keywords: list,
      competitors: state.competitors,
    }

    try {
      await onSubmit(payload) // parent will call POST /check-keywords/ and then GET results
    } catch (err) {
      console.error("Error submitting:", err)
      toast.error("Failed to submit request")
    }
  }

  const addCompetitor = () => {
    const v = (competitorDraft || "").trim()
    if (!v) return
    if (!domainValid(v)) {
      toast.error("Enter a valid domain (e.g., example.com)")
      return
    }
    setState((s) => ({ ...s, competitors: [...s.competitors, v] }))
    setCompetitorDraft("")
  }

  return (
    <>
      <Tokens />
      <motion.div
        ref={panelRef}
        className="sticky-panel"
        role="region"
        aria-label="Keyword Input & Targeting"
        {...fadeUp()}
      >
        {/* Row 1 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <motion.div className="wr-title" style={{ fontSize: 16 }} {...fadeUp(0)}>
              Keyword Input & Targeting
            </motion.div>
            <motion.div className="wr-muted" style={{ fontSize: 13 }} {...fadeUp(0.1)}>
              Enter keywords, choose device & location, then run a check.
            </motion.div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(["free", "premium"] as const).map((tier, i) => (
              <motion.button
                key={tier}
                className={`wr-chip ${state.plan === tier ? "active" : ""}`}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    plan: tier,
                    limits: { manual: tier === "free" ? 5 : 50, csv: tier === "free" ? 50 : 1000 },
                  }))
                }
                {...fadeUp(0.12 + i * 0.04)}
              >
                {tier[0].toUpperCase() + tier.slice(1)}
              </motion.button>
            ))}
            <motion.div className="seg" role="tablist" aria-label="time window" {...fadeUp(0.2)}>
              {(["7d", "30d", "90d"] as const).map((v, i) => (
                <button key={v} data-active={String(state.tw === v)} onClick={() => setState((s) => ({ ...s, tw: v }))}>
                  {v}
                </button>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Domain */}
        <motion.div style={{ marginBottom: 12 }} {...fadeUp(0.24)}>
          <label className="text-black" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
            Domain
          </label>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g., example.com"
            className="w-full px-3 py-2 rounded "
            style={{ border: "1px solid var(--wr-border)", borderRadius: 6 }}
          />
        </motion.div>

        {/* Keywords */}
        <motion.div style={{ position: "relative", marginBottom: 12 }} {...fadeUp(0.28)}>
          <div className="flex items-center mb-4 justify-between">
            <label className="text-black" style={{ fontSize: 13, display: "block" }}>
              Keywords
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                {
                  label: "Remove Duplicates",
                  onClick: () => {
                    const lines = normalizeLines(rawText.split(/\r?\n/))
                    setRawText(lines.join("\n"))
                    setState((s) => ({ ...s, keywords: lines }))
                  },
                },
                {
                  label: "Trim Lines",
                  onClick: () => {
                    const lines = rawText
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean)
                    setRawText(lines.join("\n"))
                  },
                },
                {
                  label: "Clear",
                  onClick: () => {
                    setRawText("")
                    setState((s) => ({ ...s, keywords: [] }))
                  },
                },
              ].map((b, i) => (
                <motion.button key={b.label} className="wr-chip" onClick={b.onClick} {...fadeUp(0.3 + i * 0.04)}>
                  {b.label}
                </motion.button>
              ))}
            </div>
          </div>
          <textarea
            aria-label="Enter keywords"
            placeholder={`Enter one keyword per line (max ${limits.manual} per batch for ${state.plan}).`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onBlur={() => cleanup(true)}
            style={{
              width: "100%",
              minHeight: 140,
              maxHeight: 280,
              padding: 12,
              border: "1px solid var(--wr-border)",
              borderRadius: 6,
            }}
          />
          <div style={{ position: "absolute", right: 8, bottom: 8, fontSize: 12 }}>
            Entered: <span style={{ color: "var(--wr-value-blue)" }}>{entered}</span> / Limit: {limits.manual}
          </div>
        </motion.div>

        {/* Controls grid */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
          {/* Device */}
          <motion.div {...fadeUp(0.36)}>
            <label className="wr-muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Device
            </label>
            <div className="seg" role="radiogroup" aria-label="Device">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} data-active={String(state.device === d)} onClick={() => setState((s) => ({ ...s, device: d }))}>
                  {d === "desktop" ? "Desktop" : "Mobile"}
                </button>
              ))}
            </div>
            <div className="wr-muted" style={{ fontSize: 12, marginTop: 6 }}>
              Affects SERP & rank source
            </div>
          </motion.div>

          {/* Location (new API) */}
          <motion.div {...fadeUp(0.4)}>
            <label className="wr-muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Location
            </label>
            <div ref={wrapperRef} className="relative w-full max-w-sm">
              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="Type a country (min 3 chars)…"
                className="w-full h-8 px-3 "
                style={{
                  flex: "1 1 160px",
                  minWidth: 160,
                  height: 28,
                  border: "1px solid var(--wr-border)",
                  borderRadius: 6,
                  padding: "0 8px",
                }}
              />
              <AnimatePresence>
                {open && (searchResults.length > 0 || fetching) && (
                  <motion.ul
                    key="dropdown"
                    initial={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {fetching ? (
                      <li className="p-3 text-gray-500">Loading…</li>
                    ) : (
                      searchResults.map((loc, i) => (
                        <motion.li
                          key={`${loc.id}-${loc.label}`}
                          whileHover={{ backgroundColor: "#f3f4f6" }}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: i * 0.03 }}
                          onClick={() => {
                            setSelectedLocation(loc)
                            setQuery(loc.label)
                            setOpen(false)
                          }}
                          className="cursor-pointer px-3 py-2 text-sm"
                        >
                          {loc.label}
                        </motion.li>
                      ))
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
              {selectedLocation && (
                <div className="wr-muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Selected: <strong>{selectedLocation.label}</strong>
                </div>
              )}
            </div>
          </motion.div>

          {/* Competitors (Enter + Add button) */}
          <motion.div {...fadeUp(0.44)}>
            <label className="wr-muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Competitors (max 3)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <AnimatePresence initial={false}>
                {state.competitors.map((d, i) => (
                  <motion.span
                    key={`${d}-${i}`}
                    className="tag"
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                    transition={{ duration: 0.2 }}
                  >
                    {d}
                    <button
                      aria-label={`Remove ${d}`}
                      onClick={() => setState((s) => ({ ...s, competitors: s.competitors.filter((_, j) => j !== i) }))}
                    >
                      ✕
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>

              {state.competitors.length < 3 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    placeholder="e.g., semrush.com"
                    value={competitorDraft}
                    onChange={(e) => setCompetitorDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCompetitor()
                    }}
                    style={{
                      flex: "1 1 160px",
                      minWidth: 160,
                      height: 28,
                      border: "1px solid var(--wr-border)",
                      borderRadius: 6,
                      padding: "0 8px",
                    }}
                  />
                  <motion.button
                    type="button"
                    className="wr-chip"
                    onClick={addCompetitor}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.03 }}
                    title="Add competitor"
                  >
                    <Plus size={14} /> Add
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Upload / Paste */}
          <motion.div {...fadeUp(0.48)}>
            <label className="wr-muted" style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Upload / Paste
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <label className="wr-chip" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Upload CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) {
                      alert("This file is too large (max 5 MB).")
                      return
                    }
                    const rd = new FileReader()
                    rd.onload = () => {
                      const vals = parseCSVFirstCol(String(rd.result || ""))
                      if (!vals.length) {
                        alert("No keywords found in the first column.")
                        return
                      }
                      const merged = normalizeLines([...state.keywords, ...vals])
                      const lim = state.limits.csv
                      setState((s) => ({ ...s, keywords: merged.slice(0, lim) }))
                      setRawText(merged.join("\n"))
                    }
                    rd.readAsText(file)
                  }}
                />
              </label>
              <button
                className="wr-chip"
                onClick={async () => {
                  try {
                    const t = await navigator.clipboard.readText()
                    const list = normalizeLines(t.split(/\r?\n/))
                    const merged = normalizeLines([...state.keywords, ...list])
                    setState((s) => ({ ...s, keywords: merged.slice(0, s.limits.manual) }))
                    setRawText(merged.join("\n"))
                  } catch {
                    const t = prompt("Paste keywords (one per line):") || ""
                    const list = normalizeLines(t.split(/\r?\n/))
                    const merged = normalizeLines([...state.keywords, ...list])
                    setState((s) => ({ ...s, keywords: merged.slice(0, s.limits.manual) }))
                    setRawText(merged.join("\n"))
                  }
                }}
              >
                <ClipboardPaste size={14} /> Paste
              </button>
            </div>
            <div className="wr-muted" style={{ fontSize: 12, marginTop: 6 }}>
              CSV first column only · max 5MB.
            </div>
          </motion.div>

          {/* CTA + caching banner */}
          <motion.div
          className="flex items-center justify-between w-full"
            {...fadeUp(0.52)}
          >

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                disabled={disableCTA}
                onClick={submit}
                className={`h-10 min-w-[160px] rounded-md text-white flex items-center justify-center gap-2 ${
                  disableCTA ? "cursor-not-allowed bg-gray-400 px-2" : "cursor-pointer bg-[var(--wr-value-blue)]"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {state.isSubmitting || isLoading ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {state.isSubmitting && !isLoading
                        ? `Submitting ${entered} keywords…`
                        : `Checking ${entered} keywords…`}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Check Rankings
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="wr-chip" onClick={() => onClearResults?.()}>
                  Clear results
                </button>
                <button className="wr-chip" onClick={() => onResetForm?.()}>
                  Reset form
                </button>
              </div>
            </div>
          </motion.div>

          {state.cachedAt && (
            <motion.div
              style={{
                gridColumn: "1 / -1",
                marginTop: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                border: "1px solid var(--wr-border)",
                borderRadius: 6,
              }}
              initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="wr-muted" style={{ fontSize: 13 }}>
                Results cached • last refreshed just now
              </div>
              <button className="wr-chip" onClick={() => alert("Refresh (mock)")}>
                <RefreshCw size={14} /> Refresh now
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  )
}
