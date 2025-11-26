"use client"
import ProfileContent from '@/src/components/accounts/profile-content'
import { useProfile } from '@/src/redux/providers/ProfileProvider'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

const validTabs = ['account-info', 'email', 'password', 'security']

export default function ProfilePage() {
  const { profile, fetchProfile } = useProfile()
  const params = useParams()
  const activeTab = params.tab as string

  // Redirect to default tab if invalid tab
  useEffect(() => {
    if (!validTabs.includes(activeTab)) {
      window.location.href = '/accounts/profile/account-info'
    }
  }, [activeTab])

  if (!validTabs.includes(activeTab)) {
    return null
  }

  return (
    <>

            <ProfileContent activeTab={activeTab} profile={profile} />

    </>
  )
}
