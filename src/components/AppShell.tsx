import { Outlet } from 'react-router-dom'
import { BottomNav } from '@/components/BottomNav'
import { useRealtimeSync } from '@/data/hooks'

export function AppShell() {
  useRealtimeSync()
  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-28">
      <Outlet />
      <BottomNav />
    </div>
  )
}
