import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import { resources } from '@/i18n/resources'

export const i18nReady = i18next.use(initReactI18next).init({
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  lng: 'en',
  resources,
})

export const i18n = i18next
