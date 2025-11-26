"use client"

import { useRouter } from "next/navigation"

import SetupModal from "@/src/components/common/SetupModal"
import DashboardHeader from "@/src/components/header/dashboard-header"
import { IssueDrawer } from "@/src/components/issue-drawer"
import Layout from "@/src/components/layout"
import { AuditOverviewComponent } from "@/src/components/site audit/audit-overview"
import { useProjectManager } from "@/src/hooks/use-project-manager"
import { useSiteDetail } from "@/src/redux/providers/SiteDetailProvider"
import type { RootState } from "@/src/redux/store"
import { BASE_URL_WR } from "@/src/util/api"
import axios from "axios"
import { AnimatePresence, motion } from "framer-motion"
import Cookies from "js-cookie"
import { Loader2 } from "lucide-react"
import { Suspense, useEffect, useRef, useState } from "react"
import { Hourglass } from "react-loader-spinner"
import { useSelector } from "react-redux"
import { toast } from "sonner"
import AuditSkeleton from "./auditskeleton"

export interface PageAffected {
  url: string
  title: string
  status: "New" | "Existing" | "Re_Appeared"
  validation: "Validated" | "Not Validated"
}

export interface Issue {
  title: string
  severity: "Critical" | "Medium" | "Low" | string
  summary: string
  pagesAffected: PageAffected[]
  fixInstructions: string
}

// Separate component for search params logic
const DashboardContent = () => {
  const { projects, loading: load, fetched } = useSelector((state: RootState) => state.projectReducer)
  
  const { selectedProject, loading: projectLoading } = useProjectManager()
  const { activeSection, activeSubmenu } = useSelector((state: RootState) => state.sidebar)
  const { user }: any = useSelector((state: RootState) => state.userReducer)

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

const openedModalRef = useRef(false);

  const projectsLength = (() => {
    if (!projects) return 0;
    if (Array.isArray(projects)) return projects.length;
    if (typeof projects === "object") return Object.keys(projects).length;
    return 0;
  })();

  useEffect(() => {
    // If already opened once, never open again
    if (openedModalRef.current) return;

    // Wait while any project-related loading is in progress
    if (Boolean(load) || Boolean(projectLoading)) return;

    // Wait until fetch cycle completed (successful or intentionally marked fetched=false on failure)
    if (!fetched) return;

    // Only open when there are truly zero projects
    if (projectsLength === 0) {
      setModalOpen(true);
      openedModalRef.current = true;
    }
  }, [projectsLength, load, projectLoading, fetched]);

  const { siteDetails, siteDetailsError, pendingStatusMsg, setSiteId, loading, pending }: any = useSiteDetail()


  useEffect(() => {
    if (selectedProject?.id) {
      setSiteId(selectedProject.id)
    }
  }, [selectedProject?.id, setSiteId])

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue)
    if (issue?.pagesAffected?.length > 0) {
      setIsDrawerOpen(true)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedIssue(null)
  }

  return (
    <div className={siteDetailsError || pending ? "bg-white" : ""}>
      {modalOpen  && <SetupModal modalOpen={modalOpen} setModalOpen={setModalOpen} />}
      <DashboardHeader
        activeSection={activeSection || "SEO"}
        activeSubmenu={activeSubmenu || "Site Audit"}
        selectedProject={selectedProject}
        setSelectedProject={() => { }}
        analysis_completed_at={siteDetails?.result?.analysis_completed_at}
      />

      {(() => {
        if (loading && !siteDetailsError ) {
          return <AuditSkeleton />;
        }

        if (!selectedProject) {
          return (
            <div className="flex items-center justify-center mt-10 bg-white">
              <div className="border border-gray-200 rounded-lg shadow-md p-6 max-w-xl w-full text-center">
                <h2 className="text-gray-700 text-lg font-semibold">Select a project to load its audit overview.</h2>
                <p className="text-gray-500 text-sm mt-2">
                  Choose a project from the selector above or create a new one to get started.
                </p>
              </div>
            </div>
          )
        }

        if (siteDetailsError) {
          return (
            <div className="flex items-center justify-center mt-10">
              <div className="border border-red-200 rounded-lg shadow-md p-6 max-w-xl w-full flex items-center gap-4">
                <img
                  src="https://static.thenounproject.com/png/504708-200.png"
                  alt="Error"
                  className="w-16 h-16 object-contain"
                />
                <div>
                  <h2 className="text-red-600 text-lg font-semibold">
                    {String(siteDetailsError)}
                  </h2>
                </div>
              </div>
            </div>
          );
        }

        if (pending ) {
          return (
            <div className="flex items-center justify-center mt-10">
              <div className="border border-blue-200 rounded-lg shadow-md p-6 max-w-xl w-full flex items-center gap-4">
                <Hourglass
                  visible
                  height="80"
                  width="80"
                  ariaLabel="hourglass-loading"
                  colors={["#306cce", "#72a1ed"]}
                />
                <div>
                  <h2 className="text-blue-500 text-lg font-semibold">
                    {pendingStatusMsg}
                  </h2>
                  {siteDetailsError && (
                    <p className="text-gray-600 text-sm mt-1">
                      {String(siteDetailsError)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }

        if (siteDetails?.status && !pending) {
          
          return (
             <AuditOverviewComponent onIssueClick={handleIssueClick} id={selectedProject?.id} sitedetails={siteDetails} selectedProject={selectedProject} />
          );
        }
        return null;
      })()}


      <IssueDrawer issue={selectedIssue} isOpen={isDrawerOpen} onClose={handleCloseDrawer} />
    </div>
  )
}

const Dashboard = () => {
  const router = useRouter()
  const [sending, setSending] = useState(false)

  const sendVerification = async () => {
    const token = Cookies.get("login_access_token_wrank")
    try {
      setSending(true)
      await axios.post(
        `${BASE_URL_WR}backend-auth/email-verification/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )
      router.push("/dashboard")
      toast.success("Verification email sent. Please check your inbox.")
    } catch (e) {
      setSending(false)
      toast.error("Error sending verification email please try again")
    } finally {
      setSending(false)
    }
  }

  const { user }: any = useSelector((state: RootState) => state.userReducer)

  if (user && user?.is_email_verified === false) {
    return (
      <AnimatePresence>
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 backdrop-blur-[3px] bg-black/30"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, y: "-50%" }}
            transition={{ duration: 0.3 }}
            className="fixed top-1/2 left-1/2 z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-lg rounded-lg p-6 w-[90%] max-w-md text-center"
          >
            <h2 className="text-xl font-semibold text-red-600">Email Verification Required</h2>
            <p className="text-gray-700 mt-2">Please verify your email address to gain full access to all features.</p>

            {/* Animated Button */}
            <motion.button
              onClick={sendVerification}
              disabled={sending}
              layout // enables smooth width transition
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-blue1 text-white rounded hover:bg-brand-blue2 hover:text-black hover:shadow transition"
            >
              {sending && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Loader2 className="animate-spin w-4 h-4 text-white" />
                </motion.div>
              )}
              Resend Verification Email
            </motion.button>
          </motion.div>
        </>
      </AnimatePresence>
    )
  }

  return (
    <Layout>
        <DashboardContent />
    </Layout>
  )
}

export default Dashboard
