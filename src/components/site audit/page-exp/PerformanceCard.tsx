"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AiOutlineDown } from "react-icons/ai"
import { splitAndRenderMultipleLinksNoJSX } from "@/src/util/helper"
import { useTaskDrawer } from "@/src/redux/providers/TaskDrawerProvider"
import { useProjectManager } from "@/src/hooks/use-project-manager"

export function PerformanceCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const truncatedText = description.length > 100 ? description.slice(0, 70) + "..." : description
  const { openTaskDrawer } = useTaskDrawer();
  const { selectedProject } = useProjectManager();

  if (!title && !description) {
    return (
      <div className="flex flex-col items-center justify-center ">
        <p className="text-2xl text-gray-500">No data available</p>
      </div>
    )
  }

  return (
    <motion.div
      className="border rounded-md p-6 flex flex-col justify-between bg-white hover:shadow-md transition-shadow duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <span className="font-semibold text-[16px]">{title}</span>
            <motion.span
              className="border rounded-full p-1 border-brand-red text-brand-red text-[11px] font-normal"
              transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
            >
              high Impact
            </motion.span>
          </div>
        </div>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-full hover:bg-gray-100 bg-gray-50 transition-colors duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
            <AiOutlineDown className="text-[#0077FF]" />
          </motion.div>
        </motion.button>
      </div>

      {/* Collapsible Description */}
      <div className="mt-2 overflow-hidden">
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div
              key="truncated"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
                opacity: { duration: 0.2 },
              }}
            >
              <span className="font-normal text-gray-600 text-[16px] block">
                {splitAndRenderMultipleLinksNoJSX(truncatedText)}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
                opacity: { duration: 0.3, delay: 0.1 },
              }}
            >
              <span className="font-normal text-gray-600 text-[16px] block">
                {splitAndRenderMultipleLinksNoJSX(description)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.div
        className="flex justify-end mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <motion.span
          className="text-[#0077FF] font-normal text-[15px] cursor-pointer underline hover:text-[#0066DD] transition-colors duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => openTaskDrawer({
            title,
            projectId: selectedProject?.id ?? null,
            type: "createNew",
            description
          })}
        >
          Create Task
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
