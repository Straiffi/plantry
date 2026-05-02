import { Link, useRouterState } from '@tanstack/react-router'
import { BookOpen, Package2, Settings2, ShoppingBasket } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppContext } from '@/app/app-context'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
}

type NavSection = {
  href: '/shopping-list' | '/recipes' | '/products' | '/settings'
  icon: ComponentType<{ className?: string }>
  labelKey: 'nav.shoppingList' | 'nav.recipes' | 'nav.products' | 'nav.settings'
}

const navSections: NavSection[] = [
  { href: '/shopping-list', icon: ShoppingBasket, labelKey: 'nav.shoppingList' },
  { href: '/recipes', icon: BookOpen, labelKey: 'nav.recipes' },
  { href: '/products', icon: Package2, labelKey: 'nav.products' },
  { href: '/settings', icon: Settings2, labelKey: 'nav.settings' },
]

type NavItemProps = {
  isActive: boolean
  section: NavSection
}

const NavItem = ({ isActive, section }: NavItemProps) => {
  const { t } = useTranslation()
  const Icon = section.icon

  return (
    <Link
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-3 lg:text-sm',
        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
      to={section.href}
    >
      <Icon className="size-4" />
      <span>{t(section.labelKey)}</span>
    </Link>
  )
}

export const AppShell = ({ children }: Props) => {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { household, householdMembership, user } = useAppContext()

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col lg:flex-row lg:px-4">
        <aside className="hidden w-80 shrink-0 lg:flex lg:flex-col lg:gap-6 lg:px-4 lg:py-6">
          <div className="rounded-3xl border border-border/60 bg-card p-6">
            <p className="text-sm font-medium text-primary">{t('app.name')}</p>
            <h1 className="mt-3 font-heading text-3xl tracking-tight text-foreground">{t('shell.title')}</h1>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3 px-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{household?.name ?? t('shell.noHousehold')}</p>
                {householdMembership && <p className="text-xs text-muted-foreground">{t('shell.roleLabel', { role: householdMembership.role })}</p>}
              </div>
              <Badge variant="outline">{user.name}</Badge>
            </div>

            <nav className="space-y-2">
              {navSections.map((section) => (
                <NavItem isActive={pathname.startsWith(section.href)} key={section.href} section={section} />
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex min-h-svh flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background lg:hidden">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{t('app.name')}</p>
                <p className="text-sm text-muted-foreground">{household?.name ?? t('shell.noHousehold')}</p>
              </div>
              {householdMembership && <Badge variant="outline">{t('shell.roleLabel', { role: householdMembership.role })}</Badge>}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background px-3 py-3 lg:hidden">
            <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
              {navSections.map((section) => (
                <NavItem isActive={pathname.startsWith(section.href)} key={section.href} section={section} />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
