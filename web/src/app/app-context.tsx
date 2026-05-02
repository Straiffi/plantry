import { createContext, useContext } from 'react'

import type { Household, HouseholdMembership, MeResponse } from '@/lib/api'

type SessionUser = MeResponse['user']
type SessionState = {
  session: MeResponse['session']
  user: SessionUser
}

type AppContextValue = {
  household: Household | null
  householdMembership: HouseholdMembership | null
  session: SessionState['session']
  user: SessionUser
}

export const AppContext = createContext<AppContextValue | null>(null)

export const useAppContext = () => {
  const value = useContext(AppContext)

  if (!value) {
    throw new Error('AppContext is required inside authenticated screens')
  }

  return value
}
