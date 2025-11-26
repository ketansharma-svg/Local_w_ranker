"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface OAuthDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  provider?: 'google'
  title?: string
  description?: string
}

export function OAuthDialog({
  isOpen,
  onClose,
  onSuccess,
  provider = 'google',
  title = 'Connect with Google',
  description = 'Connect your Google account to access Google Search Console data and insights.'
}: OAuthDialogProps) {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [authState, setAuthState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<number | null>(null)

  // Handle session changes
  useEffect(() => {
    if (session && status === 'authenticated' && authState === 'loading') {
      setAuthState('success')
      toast.success('Successfully connected to Google!')
      // Close immediately after success
      try {
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close()
          popupRef.current = null
        }
      } catch {}
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1000)
    }
  }, [session, status, authState, onSuccess, onClose])

  const handleOAuth = async () => {
    try {
      setIsLoading(true)
      setAuthState('loading')
      
      // Use a popup window for OAuth instead of full page redirect
      const popup = window.open(
        `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(window.location.href)}`,
        'oauth-popup',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }
      popupRef.current = popup

      // Monitor popup
      const checkClosed = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(checkClosed)
          setIsLoading(false)
          
          // Check if we have a session after popup closes
          if (session && status === 'authenticated') {
            setAuthState('success')
            toast.success('Successfully connected to Google!')
            setTimeout(() => {
              onSuccess?.()
              onClose()
            }, 1000)
          } else {
            setAuthState('error')
            toast.error('Authentication was cancelled or failed')
          }
        }
      }, 500) // Check more frequently
      pollRef.current = checkClosed

      // Cleanup after 5 minutes
      window.setTimeout(() => {
        if (!popup.closed) {
          popup.close()
          window.clearInterval(checkClosed)
          setIsLoading(false)
          setAuthState('error')
          toast.error('Authentication timed out')
        }
      }, 300000)

    } catch (error) {
      console.error('OAuth error:', error)
      setAuthState('error')
      toast.error('Failed to start authentication')
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (authState === 'loading') return // Prevent closing during auth
    setAuthState('idle')
    onClose()
  }

  const getIcon = () => {
    switch (authState) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <FcGoogle className="h-5 w-5" />
    }
  }

  const getButtonText = () => {
    switch (authState) {
      case 'loading':
        return 'Connecting...'
      case 'success':
        return 'Connected!'
      case 'error':
        return 'Try Again'
      default:
        return 'Connect with Google'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600 text-center">
            {description}
          </p>
          
          <div className="flex flex-col items-center space-y-4">
            <Button
              onClick={handleOAuth}
              disabled={isLoading || authState === 'loading'}
              className="w-full flex items-center justify-center gap-2"
              variant={authState === 'success' ? 'default' : 'outline'}
            >
              {getIcon()}
              {getButtonText()}
            </Button>
            
            {authState === 'success' && (
              <p className="text-sm text-green-600 text-center">
                Redirecting you back to the page...
              </p>
            )}
            
            {authState === 'error' && (
              <p className="text-sm text-red-600 text-center">
                Authentication failed. Please try again.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
