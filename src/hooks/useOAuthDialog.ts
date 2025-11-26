"use client"

import { useState } from 'react'

interface UseOAuthDialogOptions {
  onSuccess?: () => void
  title?: string
  description?: string
}

export function useOAuthDialog(options: UseOAuthDialogOptions = {}) {
  const [isOpen, setIsOpen] = useState(false)

  const openDialog = () => setIsOpen(true)
  const closeDialog = () => setIsOpen(false)

  const handleSuccess = () => {
    options.onSuccess?.()
    closeDialog()
  }

  return {
    isOpen,
    openDialog,
    closeDialog,
    handleSuccess,
    title: options.title || 'Connect Google Search Console',
    description: options.description || 'Connect your Google account to access Google Search Console data.'
  }
}
