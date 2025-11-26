"use client"

import { motion } from "framer-motion"

const TabLoadingState = () => {
  const placeholderCards = Array.from({ length: 6 })

  return (
    <div className="space-y-8 rounded-2xl border border-border/40 bg-card/30 p-6 shadow-sm">
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="h-7 w-40 rounded-full bg-muted animate-pulse" />
        <div className="h-10 w-32 rounded-full bg-muted animate-pulse" />
      </motion.div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {placeholderCards.map((_, index) => (
          <motion.div
            key={index}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-6 shadow-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative space-y-4">
              <div className="h-4 w-24 rounded-full bg-muted animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-muted animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-2/3 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-5/6 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default TabLoadingState
