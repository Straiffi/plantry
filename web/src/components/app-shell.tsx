import { Link } from '@tanstack/react-router'
import { ChevronRight, Package, ShoppingCart } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  children: ReactNode
}

type Section = {
  description: string
  icon: ComponentType<{ className?: string }>
  title: string
}

type NavSection = {
  href: string
  icon: ComponentType<{ className?: string }>
  labelKey: 'nav.recipes' | 'nav.shoppingList'
}

const navSections: NavSection[] = [
  {
    href: '/',
    icon: Package,
    labelKey: 'nav.recipes',
  },
  {
    href: '/',
    icon: ShoppingCart,
    labelKey: 'nav.shoppingList',
  },
]

export const AppShell = ({ children }: Props) => {
  const { t } = useTranslation()

  return (
    <div className="min-h-svh bg-muted/30">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col">
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('app.name')}</p>
              <h1 className="text-lg font-semibold tracking-tight">Phase 1 scaffold</h1>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              {navSections.map((section) => {
                const Icon = section.icon

                return (
                  <Button asChild key={section.labelKey} variant="ghost">
                    <Link className="gap-2" to={section.href}>
                      <Icon className="size-4" />
                      <span>{t(section.labelKey)}</span>
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  )
}

export const AppShellHome = ({ sections }: { sections: Section[] }) => {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-2xl sm:text-3xl">Foundation is ready to build on</CardTitle>
          <CardDescription className="max-w-2xl text-sm sm:text-base">
            The workspace now includes a Vite React frontend, Hono API, TanStack router and query,
            Tailwind and shadcn foundations, and Lucide icon support.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Next phase: database, Better Auth, and household-aware application plumbing.</p>
            <p>Theme preset is tracked and ready for later UI work.</p>
          </div>

          <Button className="gap-2" type="button">
            <span>Phase 1 complete</span>
            <ChevronRight className="size-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon

          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export type { Section }
