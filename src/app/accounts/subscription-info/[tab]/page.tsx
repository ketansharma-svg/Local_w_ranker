"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const SubscriptionInfo = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/accounts/subscription-info/summary')
  }, [router])
  return (
    <div>SubscriptionInfo</div>
  )
}

export default SubscriptionInfo