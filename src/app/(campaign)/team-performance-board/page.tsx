"use client"

import dynamic from "next/dynamic";
import React from "react";

// Dynamic imports with SSR disabled
const DemoTeamPerformanceHeader = dynamic(() => import("./HeaderBar"), { ssr: false });
const DemoTeamKpiCards = dynamic(() => import("./PerformanceSummary(KPis)"), { ssr: false });
const DemoAssigneePerformanceTable = dynamic(() => import("./AssigneePerformanceTable"), { ssr: false });

const TeamPerformanceBoard = () => {
  return (
    <>
      <DemoTeamPerformanceHeader />
      <DemoTeamKpiCards />
      <DemoAssigneePerformanceTable />
    </>
  );
};

export default TeamPerformanceBoard;
