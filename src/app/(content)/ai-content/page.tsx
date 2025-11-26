'use client';
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

    const AiContents = dynamic(
  () => import("./components/AiContent"),
  {
    ssr: false,
    loading: () => (
      
      <div
        className="flex items-center justify-center h-20 text-brand-blue1"
      >
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading AI Content Writer...</span>
      </div>
    ),
  }
)
export default function Page() {
  return (
    <>
    <AiContents />
    </>
  );
}