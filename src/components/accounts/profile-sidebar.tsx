"use client"
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

const sidebarItems = [
  { name: 'Profile settings', path: '/accounts/profile/account-info', isProfileSettings: true },
  { name: 'Subscription info', path: '/accounts/subscription-info' },
  { name: 'User Management', path: '/accounts/users' },
  { name: 'Notifications', path: '/accounts/notifications' },
  { name: 'Query log', path: '/accounts/query-log' },
  { name: 'Activity log', path: '/accounts/activity-log' },
  { name: 'Authorized Applications', path: '/accounts/authorized-apps' },
  { name: 'Agency Partners', path: '/accounts/agency-partners' },
]

interface ProfileSidebarProps {
  activeTab: string
}

export function ProfileSidebar({ activeTab }: ProfileSidebarProps) {
  
  const router = useRouter()

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My profile</h2>
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isProfileSettings = !!item.isProfileSettings;
            const isDisabled = !isProfileSettings;
            const isActive = isProfileSettings || item.path.includes(activeTab);
            return (
              <motion.button
                key={item.name}
                onClick={() => {
                  if (isDisabled) return;
                  router.push(item.path);
                }}
                disabled={isDisabled}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isProfileSettings
                    ? 'bg-brand-blue2 text-brand-blue1 border-l-4 border-brand-blue1 cursor-pointer'
                    : 'text-gray-400 bg-gray-100 opacity-60 cursor-not-allowed'
                }`}
                style={isDisabled ? { cursor: 'not-allowed', filter: 'grayscale(1)' } : {}}
                whileHover={isProfileSettings ? { x: 2 } : {}}
                whileTap={isProfileSettings ? { scale: 0.98 } : {}}
              >
                {item.name}
              </motion.button>
            )
          })}
          <motion.button
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-brand-blue1 hover:bg-gray-100 flex items-center opacity-60 cursor-not-allowed"
            disabled
            style={{ cursor: 'not-allowed', filter: 'grayscale(1)' }}
          >
            <span className="mr-2">+</span>
            Join our Beta Tester Club
          </motion.button>
        </nav>
      </div>
    </div>
  )
}
