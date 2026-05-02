import { BookOpen, ShoppingCart, Tags } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AppShellHome, type Section } from '@/components/app-shell'

export const HomePage = () => {
  const { t } = useTranslation()

  const sections: Section[] = [
    {
      description: t('sections.recipes.description'),
      icon: BookOpen,
      title: t('sections.recipes.title'),
    },
    {
      description: t('sections.shoppingList.description'),
      icon: ShoppingCart,
      title: t('sections.shoppingList.title'),
    },
    {
      description: t('sections.products.description'),
      icon: Tags,
      title: t('sections.products.title'),
    },
  ]

  return <AppShellHome sections={sections} />
}
