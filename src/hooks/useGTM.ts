import { useEffect } from 'react'

interface GTMEvent {
  event: string
  [key: string]: string | number | boolean | object | undefined
}

declare global {
  interface Window {
    dataLayer: GTMEvent[]
  }
}

export const useGTM = () => {
  useEffect(() => {
    window.dataLayer = window.dataLayer || []
  }, [])

  const pushEvent = (eventName: string, eventParams: Omit<GTMEvent, 'event'> = {}) => {
    if (typeof window !== 'undefined') {
      window.dataLayer.push({
        event: eventName,
        ...eventParams,
      })
    }
  }

  return { pushEvent }
}
