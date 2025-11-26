"use client"
import { useProfile } from '@/src/redux/providers/ProfileProvider'
import { Popover } from 'antd'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CgCheckO } from "react-icons/cg";


const tabs = [
    { id: 'account-info', name: 'Account Info' },
    { id: 'email', name: 'Email' },
    { id: 'password', name: 'Password' },
]

interface ProfileContentProps {
    activeTab: string
    profile: any
}

export default function ProfileContent({ activeTab, profile }: ProfileContentProps) {
    const router = useRouter()
    const { updateProfile } = useProfile();
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        company: '',
        country: 'India',
        currentEmail: '',
        newEmail: '',
        currentPassword: '',
        newPassword: '',
    })

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username,
                phone: profile.phone || '',
                company: profile.company_name || '',
                currentEmail: profile.email || '',
            }))
        }
    }, [profile])

    const handleTabChange = (tabId: string) => {
        router.push(`/accounts/profile/${tabId}`)
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        const [firstName, ...lastNameParts] = formData.fullName.split(" ");
        const lastName = lastNameParts.join(" ");

        await updateProfile({
            first_name: firstName,
            last_name: lastName,
            phone: formData.phone,
            company_name: formData.company,
            country: formData.country,
        });
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'account-info':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <label className="block text-sm font-medium text-black mb-2">Full name</label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-black mb-2">Phone</label>
                            <input
                                type="number"
                                placeholder="Phone"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-black mb-2">Company</label>
                            <input
                                type="text"
                                placeholder="Company"
                                value={formData.company}
                                onChange={(e) => handleInputChange('company', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-black mb-2">Country</label>
                            <select
                                value={formData.country}
                                onChange={(e) => handleInputChange('country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent"
                            >
                                <option value="India">India</option>
                                <option value="USA">USA</option>
                                <option value="UK">UK</option>
                                <option value="Canada">Canada</option>
                            </select>
                        </div>

                        <div className="flex space-x-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-6 py-2 bg-brand-blue1 text-white rounded-md hover:bg-opacity-90 transition-colors cursor-pointer"
                                onClick={handleSave}
                            >
                                Save changes
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-6 py-2 border border-gray-300 text-black rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </motion.button>
                        </div>
                    </motion.div>
                )

            case 'email':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <label className="block text-sm font-medium text-black mb-2">Current email</label>
                            <input
                                type="email"
                                value={formData.currentEmail}
                                disabled
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-black mb-2">New email</label>
                            <input
                                type="email"
                                placeholder="Enter new email"
                                value={formData.newEmail}
                                onChange={(e) => handleInputChange('newEmail', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent"
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-6 py-2 bg-brand-blue1 text-white rounded-md hover:bg-opacity-90 transition-colors cursor-pointer"
                            onClick={handleSave}
                        >
                            Save changes
                        </motion.button>
                    </motion.div>
                )

            case 'password':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <label className="block text-sm font-medium text-black mb-2">Current password</label>
                            <input
                                type="password"
                                value={formData.currentPassword}
                                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-black mb-2">New password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue1 focus:border-transparent pr-10"
                                />
                                <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">

                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-6 py-2 bg-brand-blue1 text-white rounded-md hover:bg-opacity-90 transition-colors cursor-pointer"
                            onClick={handleSave}
                        >
                            Change password
                        </motion.button>
                    </motion.div>
                )

            case 'security':
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="text-black">
                            Security settings will be available here.
                        </div>
                    </motion.div>
                )

            default:
                return null
        }
    }

    if (!profile) {
        return <div className="p-8">Loading...</div>
    }

    return (
        <div className="flex-1 bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-8 py-4">
                <div className=" mb-2 text-sm sm:text-base text-gray-500 flex gap-1 items-center pt-1">
                    <span>Dashboard</span>
                    <ChevronRight className="text-gray-400 text-sm" />
                    <span className='text-gray-900 font-medium'>Profile settings</span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Profile settings</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-700 font-medium">
                    <span className="flex items-center gap-2">
                        {profile.email}
                        {profile.email_is_verify &&
                            <Popover content="You confirmed your email.">
                                <span className="text-brand-green"><CgCheckO className='text-green-500 text-lg' /></span>
                            </Popover>
                        }
                    </span>
                    <span>ID: {profile.id}</span>
                    {/* <span> Member since:</span> */}
                </div>
            </div>

            <div className="px-8 py-6">
                <div className="flex space-x-8 border-b border-gray-200 mb-8">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-brand-blue1 text-brand-blue1'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {tab.name}
                        </motion.button>
                    ))}
                </div>

                <div className="max-w-2xl">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    )
}
