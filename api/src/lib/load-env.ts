import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

type LoadEnvironmentFilesOptions = {
  envFileLoader?: ((filePath: string) => void) | null | undefined
  envLocalPath?: string
  envPath?: string
  fileExists?: (filePath: string) => boolean
}

const findRepositoryRoot = () => {
  let directory = currentDirectory

  while (true) {
    if (existsSync(path.join(directory, 'drizzle.config.ts'))) {
      return directory
    }

    const parentDirectory = path.dirname(directory)

    if (parentDirectory === directory) {
      return currentDirectory
    }

    directory = parentDirectory
  }
}

const repositoryRoot = findRepositoryRoot()

const envLocalPath = path.join(repositoryRoot, '.env.local')
const envPath = path.join(repositoryRoot, '.env')

const createLoadEnvFile = () => {
  return typeof process.loadEnvFile === 'function'
    ? process.loadEnvFile.bind(process)
    : undefined
}

export const loadEnvironmentFiles = (options: LoadEnvironmentFilesOptions = {}) => {
  const envFileLoader = options.envFileLoader === undefined
    ? createLoadEnvFile()
    : options.envFileLoader
  const localPath = options.envLocalPath ?? envLocalPath
  const defaultPath = options.envPath ?? envPath
  const fileExists = options.fileExists ?? existsSync

  if (!envFileLoader) {
    return
  }

  // Shell-provided environment variables should win over file values.
  if (fileExists(localPath)) {
    envFileLoader(localPath)
  }

  if (fileExists(defaultPath)) {
    envFileLoader(defaultPath)
  }
}

loadEnvironmentFiles()
