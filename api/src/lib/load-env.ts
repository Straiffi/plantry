import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

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

// Shell-provided environment variables should win over file values.
if (existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath)
}

if (existsSync(envPath)) {
  process.loadEnvFile(envPath)
}
