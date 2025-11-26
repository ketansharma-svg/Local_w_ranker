"use client"

import React from "react"
import dynamic from "next/dynamic"
import CommonLoading from "@/src/components/common/Loader"

// Dynamically import Rankings
const Rankings = dynamic(() => import("./rankings"), {
  ssr: false,
  loading: () => <CommonLoading />, 
})

const AnalyticsPage = () => {
  return (
    <>
      <Rankings onClose={() => ""} />
    </>
  )
}

export default AnalyticsPage
