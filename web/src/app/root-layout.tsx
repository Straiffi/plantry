import { Outlet } from '@tanstack/react-router'

import { AppShell } from '@/components/app-shell'

export const RootLayout = () => {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
