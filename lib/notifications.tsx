'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface AppNotification {
  id: string
  type: 'video_ready' | 'gardens_ready'
  title: string
  videoId: string
  createdAt: number
}

interface NotificationContextValue {
  notifications: AppNotification[]
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt'>) => void
  dismissNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const id = Math.random().toString(36).slice(2)
    const notification: AppNotification = { ...n, id, createdAt: Date.now() }
    setNotifications(prev => {
      // Avoid duplicates (same type + videoId already pending)
      const exists = prev.some(p => p.type === n.type && p.videoId === n.videoId)
      if (exists) return prev
      return [notification, ...prev].slice(0, 5) // max 5 queued
    })
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(p => p.id !== id))
    }, 8_000)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, dismissNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
