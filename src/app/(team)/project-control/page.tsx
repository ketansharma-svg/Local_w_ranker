"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import Projects from "./components/ProjectsList";
// 🚀 Dynamically import with SSR disabled
const Header = dynamic(
  () => import("./components/ProjectsList"),
  {
    ssr: false,
    loading: () => (
      
      <div
        className="flex items-center justify-center h-20 text-brand-blue1"
      >
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm font-medium">Loading Project Management Control Center...</span>
      </div>
    ),
  }
)
const ProjectControl = () => {
  return (
    <Header />
  );
};

export default ProjectControl;
