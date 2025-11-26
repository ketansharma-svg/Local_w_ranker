"use client"

import { motion } from "framer-motion"

export default function CommonLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <motion.div
        className="flex gap-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.15,
              repeat: Infinity,
              repeatDelay: 0.3,
            },
          },
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-4 h-4 rounded-full bg-brand-blue1"
            variants={{
              hidden: { y: 0, opacity: 0.3 },
              visible: {
                y: -10,
                opacity: 1,
        transition: {
          repeat: Infinity,   
          repeatType: "reverse", 
          duration: 0.5,
        },              },
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}
