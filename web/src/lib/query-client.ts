import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

export const plantryQueryDefaults = {
  mutations: {
    retry: false,
  },
  queries: {
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 60 * 1000,
  },
} satisfies DefaultOptions

const mergeDefaultOptions = (defaultOptions?: DefaultOptions): DefaultOptions => {
  return {
    mutations: {
      ...plantryQueryDefaults.mutations,
      ...defaultOptions?.mutations,
    },
    queries: {
      ...plantryQueryDefaults.queries,
      ...defaultOptions?.queries,
    },
  }
}

export const createPlantryQueryClient = (defaultOptions?: DefaultOptions) => {
  return new QueryClient({
    defaultOptions: mergeDefaultOptions(defaultOptions),
  })
}
