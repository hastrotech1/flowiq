import { Client, Account, Databases, Storage, Functions } from 'appwrite'
import { APPWRITE_CONFIG } from '@/lib/constants'

/**
 * Singleton Appwrite client instance.
 * Initialised once and reused across the entire app.
 * Never instantiate Client() anywhere else — always import from here.
 */
const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId)

/**
 * Appwrite Account service — handles auth, sessions, OAuth.
 * Used by: src/appwrite/auth.ts
 */
export const account = new Account(client)

/**
 * Appwrite Databases service — CRUD for statements + transactions.
 * Used by: src/appwrite/database.ts
 */
export const databases = new Databases(client)

/**
 * Appwrite Storage service — raw statement file upload/download.
 * Used by: src/appwrite/storage.ts
 */
export const storage = new Storage(client)

/**
 * Appwrite Functions service — invokes the AI proxy function
 * that forwards requests to the Anthropic API server-side.
 * Used by: src/appwrite/functions.ts
 */
export const functions = new Functions(client)

export default client
