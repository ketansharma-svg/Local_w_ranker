"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'
import { OAuthDialog } from './OAuthDialog'
import { useOAuthDialog } from '@/src/hooks/useOAuthDialog'

interface OAuthButtonProps {
  onSuccess?: () => void
  title?: string
  description?: string
  buttonText?: string
  className?: string
  variant?: 'default' | 'outline' | 'secondary'
}

export function OAuthButton({
  onSuccess,
  title,
  description,
  buttonText = 'Connect with Google',
  className,
  variant = 'default'
}: OAuthButtonProps) {
  const { isOpen, openDialog, closeDialog, handleSuccess, title: dialogTitle, description: dialogDescription } = useOAuthDialog({
    onSuccess,
    title,
    description
  })

  return (
    <>
      <Button
        onClick={openDialog}
        className={className}
        variant={variant}
      >
        <FcGoogle className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>

      <OAuthDialog
        isOpen={isOpen}
        onClose={closeDialog}
        onSuccess={handleSuccess}
        title={dialogTitle}
        description={dialogDescription}
      />
    </>
  )
}
