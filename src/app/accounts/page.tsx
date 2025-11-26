"use client"
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AccountsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the default profile tab
    router.replace('/accounts/profile/account-info')
  }, [router])

  return null 
}
