"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

    const ContentHome = dynamic(
  () => import("./components/ContentHome"),
  {
    ssr: false,
    loading: () => (
      
      <div
        className="flex items-center justify-center h-20 text-brand-blue1"
      >
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading Content Dashboard...</span>
      </div>
    ),
  }
)
export default function Page() {
  return (
    <>
    <ContentHome />
    </>
  );
}