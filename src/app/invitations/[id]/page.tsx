"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle, Users, Sparkles, ArrowRight, XCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { BASE_URL_WR } from "@/src/util/api"
import Image from "next/image"

function InvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [action, setAction] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(4)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState("")
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    const urlToken = searchParams.get("token")
    const urlAction = searchParams.get("action")

    setToken(urlToken)
    setAction(urlAction)

    if (urlAction === "decline") {
      setShowDeclineForm(true)
    }
  }, [searchParams, router])

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push("/")
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleInvitationResponse = async (reason?: string) => {
    if (!token) return
    setIsProcessing(true)
    setError(null)
    try {
      const requestBody: any = {
        token,
        action,
      }
      if (action === "decline" && reason) {
        requestBody.decline_reason = reason
      }
      const response = await fetch(`${BASE_URL_WR}backend-auth/invitations/respond/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
      const data = await response.json()
      if (response.ok) {
        setIsSuccess(true)
        startCountdown()
      } else {
        if (data.errors && data.errors.non_field_errors) {
          setError(data.errors.non_field_errors[0])
        } else {
          setError("Failed to process invitation")
        }
      }
    } catch (error) {
      console.error("Error processing invitation:", error)
      setError("Network error occurred. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (token && action === "accept") {
      handleInvitationResponse()
    }
  }, [token, action])

  const handleDeclineSubmit = () => {
    if (declineReason.trim()) {
      handleInvitationResponse(declineReason)
    }
  }

  const isAccepting = action === "accept"
  const isDeclining = action === "decline"

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">

        <Image
        src="/images/wrankerscrren.png" 
        alt="Background"
        fill
        className="absolute inset-0 object-cover -z-10"
        priority
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue1/25 via-white to-brand-purpal/10 -z-10" />


      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="text-center space-y-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 rounded-full bg-wranker-primary flex items-center justify-center"
            >
              {error ? (
                <AlertTriangle className="w-10 h-10 text-critical" />
              ) : isSuccess && isAccepting ? (
                <CheckCircle className="w-10 h-10 text-success" />
              ) : isSuccess && isDeclining ? (
                <XCircle className="w-10 h-10 text-critical" />
              ) : (
                <Users className="w-10 h-10 text-brand-blue1" />
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="text-3xl font-bold text-brand-blue1 mb-2">
                {error
                  ? "Invitation Error"
                  : isSuccess && isAccepting
                    ? "Welcome Aboard!"
                    : isSuccess && isDeclining
                      ? "Invitation Declined"
                      : showDeclineForm
                        ? "Decline Invitation"
                        : "Processing Invitation"}
              </h1>
              <p className="text-gray-600">
                {error
                  ? error
                  : isSuccess && isAccepting
                    ? "Your invitation has been accepted successfully"
                    : isSuccess && isDeclining
                      ? "Your invitation has been declined"
                      : showDeclineForm
                        ? "Please provide a reason for declining"
                        : "Processing your invitation response"}
              </p>
            </motion.div>

            {showDeclineForm && !isSuccess && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <Textarea
                  placeholder="Please provide a reason for declining this invitation..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <Button
                  onClick={handleDeclineSubmit}
                  disabled={!declineReason.trim() || isProcessing}
                  className="w-full bg-critical hover:bg-critical/90 text-white"
                >
                  {isProcessing ? "Declining..." : "Submit Decline"}
                </Button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 bg-wranker-primary rounded-full animate-pulse"></div>
                  <div className="w-4 h-4 bg-wranker-secondary rounded-full animate-pulse delay-75"></div>
                  <div className="w-4 h-4 bg-teal rounded-full animate-pulse delay-150"></div>
                </div>
              ) : isSuccess ? (
                <div className="flex items-center justify-center space-x-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Processing Complete</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center space-x-2 text-critical">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Error Occurred</span>
                </div>
              ) : null}
            </motion.div>

            {!error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5 text-magenta animate-pulse" />
                <Sparkles className="w-4 h-4 text-orange animate-pulse delay-100" />
                <Sparkles className="w-5 h-5 text-indigo animate-pulse delay-200" />
              </motion.div>
            )}

            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-wranker-primary to-wranker-secondary rounded-lg p-4 text-black"
              >
                <div className="flex items-center justify-center space-x-2">
                  <ArrowRight className="w-5 h-5" />
                  <span className="font-medium">Redirecting in {countdown} seconds...</span>
                </div>
              </motion.div>
            )}

            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full border-brand-blue1 text-brand-blue1 hover:bg-brand-blue1/10 hover:text-brand-blue1 transition-colors"
            >
              {error ? "Return to Home" : "Continue to Dashboard"}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default function InvitationResponsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <InvitationContent />
    </Suspense>
  )
}
