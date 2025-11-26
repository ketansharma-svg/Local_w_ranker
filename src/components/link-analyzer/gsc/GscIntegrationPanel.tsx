"use client"

import { InfoCircleOutlined } from "@ant-design/icons"
import { Select, Tooltip } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import type { Session } from "next-auth"
import { signIn, signOut, useSession } from "next-auth/react"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { FcGoogle } from "react-icons/fc"
import { MdClose } from "react-icons/md"


type Props = {
  project: any
  hasSession: boolean
  session: (Session & { accessToken?: string; refreshToken?: string }) | null
  gscSites: Array<{ siteUrl: string; permissionLevel: string }>
  gscSiteOptions: Array<{ value: string; label: string; permission:string }>
  selectedSite?: string
  setSelectedSite: React.Dispatch<React.SetStateAction<string | undefined>>
  onLoadSites: () => Promise<void>
  onSelectSite: (site: string) => Promise<void>
  onDisconnect: () => Promise<void>
}

export function GscIntegrationPanel({
  project,
  hasSession,
  session,
  gscSites,
  gscSiteOptions,
  selectedSite,
  setSelectedSite,
  onLoadSites,
  onSelectSite,
  onDisconnect,
}: Props) {

  
  const isConnected = Boolean(project?.gsc_url && project?.gsc_email_data)
  const [isLoadingSites, setIsLoadingSites] = useState(false)
  const [authState, setAuthState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [authMessage, setAuthMessage] = useState("")
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [didAttemptSiteLoad, setDidAttemptSiteLoad] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const autoCollapsedRef = useRef(false)

  const { data: freshSession, status: freshStatus } = useSession()
  const actualSession = freshSession || session
  const actualHasSession = freshStatus === "authenticated" || hasSession
  const sessionEmail = useMemo(() => actualSession?.user?.email ?? "Google user", [actualSession?.user?.email])
  const hasSiteOptions = gscSiteOptions.length > 0

  const connectButtonLabel = useMemo(() => {
    if (authState === "loading") return "Connecting..."
    if (authState === "error") return "Retry Google Connect"
    if (authState === "success") return "Connected"
    return "Connect with Google"
  }, [authState])

  useEffect(() => {
    if (!didAttemptSiteLoad || isLoadingSites) return
    if (hasSiteOptions) {
      setSitesError(null)
    } else {
      setSitesError("No Google Search Console sites were returned for this account.")
    }
  }, [didAttemptSiteLoad, hasSiteOptions, isLoadingSites])

  useEffect(() => {
    if (authState === "loading" && actualHasSession) {
      setAuthState("success")
      setAuthMessage("Connected! You can now load your GSC sites.")
    }
  }, [authState, actualHasSession])

  useEffect(() => {
    if (!isConnected) {
      setIsPanelCollapsed(false)
      autoCollapsedRef.current = false
      return
    }

    if (!autoCollapsedRef.current) {
      setIsPanelCollapsed(true)
      autoCollapsedRef.current = true
    }
  }, [isConnected])

  const handleLoadSites = async () => {
    if (isLoadingSites || hasSiteOptions) return
    setSitesError(null)
    setDidAttemptSiteLoad(true)
    setIsLoadingSites(true)
    try {
      await onLoadSites()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load Google Search Console sites."
      setSitesError(message)
    } finally {
      setIsLoadingSites(false)
    }
  }

  const handleConnectClick = async () => {
    if (authState === "loading") return
    setAuthState("loading")
    setAuthMessage("Opening Google sign-in...")
    try {
      await signIn("google", {
        callbackUrl: window.location.href,
        redirect: false,
      })
    } catch (err) {
      console.error("OAuth error:", err)
      const message = err instanceof Error ? err.message : "Failed to start Google sign-in."
      setAuthState("error")
      setAuthMessage(message)
    }
  }

  return (
    <motion.div
      layout
      className="bg-gradient-to-br from-sky-50 to-blue-50 border rounded-xl p-6 mt-4 mx-auto w-full relative overflow-hidden shadow"
      initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left */}
        <motion.div
          className="flex flex-col gap-3 w-full"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FcGoogle className="text-2xl" /> Google Search Console Integration
          </h2>

          <AnimatePresence mode="wait">
            {isConnected && (
              <motion.div
                key="connected-url"
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="bg-white border rounded-lg px-4 py-2 text-sm">
                  <span className="text-gray-600">GSC URL: </span>
                  <span className="font-medium">{String(project?.gsc_url)}</span>
                </div>
              </motion.div>
            )}

            {actualHasSession && !isConnected && (
              <motion.div
                key="session-info"
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-gray-600 text-sm">
                  Logged in as <b>{sessionEmail}</b> - Select a GSC site to connect
                </p>
              </motion.div>
            )}

            {!actualHasSession && !isConnected && (
              <motion.div
                key="connect-copy"
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-gray-600 text-sm">Connect your Google account to access GSC data</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right */}
        <div className="flex flex-col items-center justify-center w-full md:w-auto">
          <AnimatePresence mode="wait">
            {!actualHasSession && !isConnected && (
              <motion.div
                key="connect-google"
                className="flex flex-col items-center gap-3 text-center"
                initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConnectClick}
                  disabled={authState === "loading"}
                  className="flex items-center gap-2 bg-brand-blue1 hover:bg-brand-blue1/80 disabled:opacity-60 transition-colors px-5 py-2.5 rounded-lg font-semibold text-white shadow"
                >
                  <FcGoogle className="text-xl bg-white rounded-full p-0.5" />
                  {authState === "loading" && (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  <span>{connectButtonLabel}</span>
                </motion.button>
                <AnimatePresence>
                  {authMessage && (
                    <motion.p
                      key={`${authState}-${authMessage}`}
                      className={
                        authState === "error"
                          ? "text-xs text-red-600"
                          : authState === "success"
                          ? "text-xs text-green-600"
                          : "text-xs text-gray-600"
                      }
                      initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                      transition={{ duration: 0.3 }}
                      aria-live="polite"
                    >
                      {authMessage}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {actualHasSession && !isConnected && (
              <motion.div
                key="select-site"
                className="flex flex-col items-center gap-3 text-center w-full"
                initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <motion.div
                  className="flex flex-col sm:flex-row items-center gap-3 w-full"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
<Select
  style={{ width: 320, height: 44 }}
  className="shadow-sm rounded-lg border border-gray-300 hover:border-blue-400 transition-all duration-200"
  placeholder="Select a GSC site"
  value={selectedSite}
  loading={isLoadingSites}
  disabled={isLoadingSites}
  onChange={(val) => {
    setSelectedSite(val)
    onSelectSite(val)
  }}
  showSearch
  filterOption={(input, option) =>
    String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
  }
>
  {gscSiteOptions.map((opt) => {
    const isUnverified = opt.permission === "siteUnverifiedUser"

    return (
      <Select.Option
        key={opt.value}
        value={opt.value}
        label={opt.label}
        disabled={isUnverified}
      >
        <div className="flex items-center justify-between w-full">
          <span className={isUnverified ? "text-gray-400" : "text-gray-800"}>
            {opt.label}
          </span>
          {isUnverified && (
            <Tooltip
              title="This website is unverified. Please verify it in Google Search Console."
              placement="right"
            >
              <InfoCircleOutlined className="text-yellow-500 ml-2" />
            </Tooltip>
          )}
        </div>
      </Select.Option>
    )
  })}
</Select>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoadSites}
                    disabled={isLoadingSites || hasSiteOptions}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors font-semibold py-2 px-4 rounded-lg text-white shadow"
                  >
                    {isLoadingSites ? "Loading..." : hasSiteOptions ? "Sites Loaded" : "Load GSC Sites"}
                  </motion.button>
                </motion.div>

                <div className="flex items-center gap-2">
                  <p className="text-gray-600 text-xs">Logged in as {sessionEmail}</p>
                  <button
                    onClick={() => signOut({ redirect: false })}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Sign out
                  </button>
                </div>

                <AnimatePresence>
                  {sitesError && (
                    <motion.p
                      key={`gsc-error-${sitesError}`}
                      className="text-xs text-red-600"
                      initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                      transition={{ duration: 0.25 }}
                      aria-live="assertive"
                    >
                      {sitesError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {isConnected && (
              <motion.div
                key="connected-state"
                className="flex flex-col items-center gap-3 text-center"
                initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <p className="text-gray-700 text-sm">
                  Connected to <b>{String(project?.gsc_email_data)}</b>
                </p>
                {actualHasSession && <p className="text-gray-600 text-xs italic">Session: {sessionEmail}</p>}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onDisconnect}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-700 transition-colors px-5 py-2.5 rounded-lg font-semibold text-white shadow"
                >
                  <MdClose className="text-lg" /> Disconnect
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!isConnected && (
          <motion.div
            key="gsc-callout"
            className="mt-3 text-sm text-gray-700 bg-white border rounded-md px-3 py-2"
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            Link your project to a GSC property to unlock Insights &amp; Overview.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default GscIntegrationPanel
