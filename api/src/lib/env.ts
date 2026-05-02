const fallbackBetterAuthSecret = 'development-secret-change-me-before-production-1234'
const fallbackBetterAuthUrl = 'http://localhost:5173'
const fallbackDatabaseUrl = 'postgres://postgres:postgres@localhost:5432/recipe_app'
const fallbackGoogleClientId = 'development-google-client-id'
const fallbackGoogleClientSecret = 'development-google-client-secret'

type RuntimeEnvironment = Partial<Record<
  | 'BETTER_AUTH_SECRET'
  | 'BETTER_AUTH_URL'
  | 'DATABASE_URL'
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'NODE_ENV',
  string | undefined
>>

const createOrigin = (url: string) => {
  return new URL(url).origin
}

const readEnvironmentValue = (
  environment: RuntimeEnvironment,
  name: Exclude<keyof RuntimeEnvironment, 'NODE_ENV'>,
  fallbackValue: string,
) => {
  const value = environment[name]?.trim()

  return value ? value : fallbackValue
}

const parseAppUrl = (value: string) => {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error('BETTER_AUTH_URL must be an absolute URL')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('BETTER_AUTH_URL must use http or https')
  }

  if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    throw new Error('BETTER_AUTH_URL must be the app origin without a path, query, or hash')
  }

  return parsedUrl.origin
}

const assertProductionConfig = (environment: RuntimeEnvironment, betterAuthUrl: string) => {
  const requiredEnvironmentVariables: Array<Exclude<keyof RuntimeEnvironment, 'NODE_ENV'>> = [
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ]

  for (const variableName of requiredEnvironmentVariables) {
    if (!environment[variableName]?.trim()) {
      throw new Error(`${variableName} must be set in production`)
    }
  }

  const parsedUrl = new URL(betterAuthUrl)

  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
    throw new Error('BETTER_AUTH_URL must not point to localhost in production')
  }
}

export const resolveEnv = (environment: RuntimeEnvironment = process.env) => {
  const betterAuthUrl = parseAppUrl(readEnvironmentValue(environment, 'BETTER_AUTH_URL', fallbackBetterAuthUrl))
  const resolvedEnv = {
    betterAuthSecret: readEnvironmentValue(environment, 'BETTER_AUTH_SECRET', fallbackBetterAuthSecret),
    betterAuthUrl,
    databaseUrl: readEnvironmentValue(environment, 'DATABASE_URL', fallbackDatabaseUrl),
    googleClientId: readEnvironmentValue(environment, 'GOOGLE_CLIENT_ID', fallbackGoogleClientId),
    googleClientSecret: readEnvironmentValue(environment, 'GOOGLE_CLIENT_SECRET', fallbackGoogleClientSecret),
  } as const

  if (environment.NODE_ENV === 'production') {
    assertProductionConfig(environment, resolvedEnv.betterAuthUrl)
  }

  return resolvedEnv
}

export const env = resolveEnv()

export const appOrigin = createOrigin(env.betterAuthUrl)
