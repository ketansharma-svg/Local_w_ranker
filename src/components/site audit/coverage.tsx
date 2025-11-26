

import { CardContent } from '@/components/ui/card'
import { signIn } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import React from 'react'
import { FcGoogle } from "react-icons/fc"

const Coverage = ({ siteIssues, selectedProject }: any) => {

  const pathname = usePathname()


  const handleSignInForProject = async () => {
    // if (!currentProject) return

    const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}${pathname}` : ""


    signIn("google", { callbackUrl })
  }


  return (
    <CardContent className="pt-0 bg-white flex items-center justify-center">
      <button
        onClick={handleSignInForProject}
        className="bg-blue flex items-center gap-2 cursor-pointer hover:scale-105 smooth3 font-bold py-2 px-4 rounded transition duration-300 shadow-lg"
      >
        Connect with <FcGoogle className="text-2xl bg-white rounded-full" />
      </button>
    </CardContent>
  )
}

export default Coverage