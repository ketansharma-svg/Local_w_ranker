"use client"

import type { GaProperty } from "@/src/util/gaIntegration"
import { Button, Select, Tooltip } from "antd"
import { AnimatePresence, motion } from "framer-motion"
import type { Session } from "next-auth"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { FcGoogle } from "react-icons/fc"
import { MdClose } from "react-icons/md"

interface GaPropertyOption {
  value: string
  label: string
  accountName?: string
}

type GaIntegrationPanelProps = {
  project: any
  session: (Session & { accessToken?: string; refreshToken?: string }) | null
  hasSession: boolean
  onDisconnect: () => Promise<void>
  onSelectProperty: (propertyId: string) => Promise<void>
  onLoadProperties: () => Promise<GaProperty[] | void>
  propertyOptions: GaPropertyOption[]
  selectedProperty?: string
  setSelectedProperty: React.Dispatch<React.SetStateAction<string | undefined>>
  isLoadingProperties: boolean
  setIsLoadingProperties: React.Dispatch<React.SetStateAction<boolean>>
  refreshProperties: () => Promise<void>
  lastFetchedAt?: number | null
}

const LOADER_ROWS = [0, 1, 2, 3]

export function GaIntegrationPanel({
  project,
  session,
  hasSession,
  onDisconnect,
  onSelectProperty,
  onLoadProperties,
  propertyOptions,
  selectedProperty,
  setSelectedProperty,
  isLoadingProperties,
  setIsLoadingProperties,
  refreshProperties,
  lastFetchedAt,
}: GaIntegrationPanelProps) {
  const isConnected = Boolean(
    (project?.analytics_id_data) &&
      (project?.ga_email_data),
  )
  const sessionEmail = useMemo(() => session?.user?.email ?? "Google user", [session?.user?.email])
  const connectedEmail = project?.ga_email_data ?? project?.ga_email ?? sessionEmail
  const connectedAnalyticsId =
    project?.analytics_id_data ?? project?.analytics_id ?? selectedProperty
  const [authState, setAuthState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [authMessage, setAuthMessage] = useState("")
  const [propertiesError, setPropertiesError] = useState<string | null>(null)
  const [didAttemptLoad, setDidAttemptLoad] = useState(false)

  const handleConnectClick = async () => {
    if (authState === "loading") return
    setAuthState("loading")
    setAuthMessage("Opening Google sign-in...")
    try {
      await (await import("next-auth/react")).signIn("google", {
        callbackUrl: window.location.href,
        redirect: false,
      })
      setAuthState("success")
    } catch (err) {
      console.error("OAuth error:", err)
      const message = err instanceof Error ? err.message : "Failed to start Google sign-in."
      setAuthState("error")
      setAuthMessage(message)
    }
  }

  useEffect(() => {
    if (authState === "loading" && hasSession) {
      setAuthState("success")
      setAuthMessage("Connected! You can now load properties.")
    }
  }, [authState, hasSession])

  const handleLoadProperties = useCallback(async () => {
    if (isLoadingProperties) return
    setDidAttemptLoad(true)
    setIsLoadingProperties(true)
    setPropertiesError(null)
    try {
      const summaries = await onLoadProperties()
      if (!summaries || summaries.length === 0) {
        setPropertiesError("No Google Analytics properties found for this account.")
      }
    } catch (err) {
      console.error("Failed to load GA properties", err)
      const message = err instanceof Error ? err.message : "Unable to load Google Analytics properties."
      setPropertiesError(message)
    } finally {
      setIsLoadingProperties(false)
    }
  }, [isLoadingProperties, onLoadProperties, setIsLoadingProperties])

  useEffect(() => {
    if (!didAttemptLoad || isLoadingProperties) return
    if (propertyOptions.length > 0) {
      setPropertiesError(null)
    } else {
      setPropertiesError("No Google Analytics properties were returned for this account.")
    }
  }, [didAttemptLoad, propertyOptions.length, isLoadingProperties])

  const renderLastFetched = () => {
    if (!lastFetchedAt) return null
    return `Last synced ${new Date(lastFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  return (
    <motion.div
      layout
      className="bg-gradient-to-br from-purple-50 via-indigo-50 to-white border rounded-xl p-6 mt-4 mx-auto w-full relative overflow-hidden shadow"
      initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <motion.div
          className="flex flex-col gap-3 w-full"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FcGoogle className="text-2xl" /> Google Analytics Integration
          </h2>

          <AnimatePresence mode="wait">
            {isConnected && (
              <motion.div
                key="ga-connected-summary"
                className="flex flex-wrap items-center gap-3 text-sm"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {connectedAnalyticsId && (
                  <div className="bg-white/90 border rounded-lg px-4 py-2">
                    <span className="text-gray-600">Property ID: </span>
                    <span className="font-medium text-gray-800">
                      {String(connectedAnalyticsId)}
                    </span>
                  </div>
                )}
                {connectedEmail && (
                  <div className="bg-white/90 border rounded-lg px-4 py-2">
                    <span className="text-gray-600">Connected as </span>
                    <span className="font-medium text-gray-800">{String(connectedEmail)}</span>
                  </div>
                )}
                {renderLastFetched() && (
                  <motion.span
                    className="text-xs text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                  >
                    {renderLastFetched()}
                  </motion.span>
                )}
              </motion.div>
            )}

            {!isConnected && hasSession && (
              <motion.div
                key="ga-session-info"
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-gray-600 text-sm">
                  Logged in as <b>{sessionEmail}</b> - Select a GA4 property to connect
                </p>
              </motion.div>
            )}

            {!hasSession && !isConnected && (
              <motion.div
                key="ga-connect-copy"
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-gray-600 text-sm">
                  Connect your Google account to access Google Analytics data
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex flex-col items-center justify-center w-full md:w-auto">
          <AnimatePresence mode="wait">
            {!hasSession && !isConnected && (
              <motion.div
                key="ga-connect"
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
                  <span>
                    {authState === "loading"
                      ? "Connecting..."
                      : authState === "error"
                      ? "Retry Google Connect"
                      : "Connect with Google"}
                  </span>
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

            {hasSession && !isConnected && (
              <motion.div
                key="ga-select-property"
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
                    style={{ width: 340, height: 40 }}
                    placeholder="Select a GA4 property"
                    value={selectedProperty}
                    loading={isLoadingProperties}
                    showSearch
                    filterOption={(input, option) => String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                    options={propertyOptions}
                    onChange={(val) => {
                      setSelectedProperty(val)
                      onSelectProperty(val)
                    }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoadProperties}
                    disabled={isLoadingProperties || propertyOptions.length > 0}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-colors font-semibold py-2 px-4 rounded-lg text-white shadow"
                  >
                    {isLoadingProperties ? "Loading..." : propertyOptions.length > 0 ? "Properties Loaded" : "Load Properties"}
                  </motion.button>
                </motion.div>

                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Logged in as {sessionEmail}</span>
                  <Tooltip title="Refresh property list from Google Analytics">
                    <Button size="small" type="link" onClick={refreshProperties} className="p-0">
                      Revalidate
                    </Button>
                  </Tooltip>
                  <Button size="small" type="link" danger onClick={async () => (await import("next-auth/react")).signOut({ redirect: false })}>
                    Sign out
                  </Button>
                </div>

                <AnimatePresence>
                  {propertiesError && (
                    <motion.p
                      key={`ga-error-${propertiesError}`}
                      className="text-xs text-red-600"
                      initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                      transition={{ duration: 0.25 }}
                      aria-live="assertive"
                    >
                      {propertiesError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {isConnected && (
              <motion.div
                key="ga-connected-state"
                className="flex flex-col items-center gap-3 text-center"
                initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <p className="text-gray-700 text-sm">
                  Connected to <b>{String(connectedEmail)}</b>
                </p>
                {connectedAnalyticsId && (
                  <p className="text-gray-600 text-xs">
                    Property ID: <span className="font-medium">{connectedAnalyticsId}</span>
                  </p>
                )}
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
            key="ga-callout"
            className="mt-3 text-sm text-gray-700 bg-white border rounded-md px-3 py-2"
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            Link your project to a Google Analytics property to unlock advanced analytics insights.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default GaIntegrationPanel
