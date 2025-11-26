"use client";

import React, { Suspense } from "react";
import Layout from "@/src/components/layout";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { TaskDrawerProvider } from "@/src/redux/providers/TaskDrawerProvider";

// 🚀 Dynamically import with SSR disabled
const DemoKeywordsHeader = dynamic(
  () => import("./components/keywordInsightsHeader"),
  {
    ssr: false,
    loading: () => (
      
      <div
        className="flex items-center justify-center h-20 text-brand-blue1"
      >
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading keyword insights…</span>
      </div>
    ),
  }
)
const KeywordInsightNew = () => {
  return (
    <div className="min-h-screen bg-background">
      <TaskDrawerProvider>
        <Suspense fallback={null}>
          <Layout>
            <DemoKeywordsHeader />
          </Layout>
        </Suspense>
      </TaskDrawerProvider>
    </div>
  );
};

export default KeywordInsightNew;
