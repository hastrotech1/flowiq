import { ID } from 'appwrite'
import { storage } from './client'
import { APPWRITE_CONFIG, MAX_FILE_SIZE_BYTES, ACCEPTED_FILE_TYPES } from '@/lib/constants'

const BUCKET_ID = APPWRITE_CONFIG.buckets.statements

/**
 * Validates a file before upload:
 * - Must be PDF, XLSX, XLS, or CSV
 * - Must be under MAX_FILE_SIZE_BYTES (20 MB)
 * Returns an error string, or null if valid.
 */
export function validateStatementFile(file: File): string | null {
  const acceptedMimeTypes = Object.keys(ACCEPTED_FILE_TYPES)
  if (!acceptedMimeTypes.includes(file.type)) {
    return `Unsupported file type. Please upload a PDF, Excel (.xlsx/.xls), or CSV file.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is 20 MB.`
  }
  return null
}

/**
 * Uploads a bank statement file to Appwrite Storage.
 * Generates a unique file ID automatically.
 *
 * @param file - The File object from the input/drop event
 * @returns The Appwrite file document (contains $id for DB reference)
 */
export async function uploadStatementFile(file: File) {
  const error = validateStatementFile(file)
  if (error) throw new Error(error)

  // ID.unique() generates a collision-resistant Appwrite document ID
  return await storage.createFile(BUCKET_ID, ID.unique(), file)
}

/**
 * Deletes a statement file from Appwrite Storage.
 * Called when the user removes a statement from the app.
 *
 * @param fileId - The Appwrite Storage file ID ($id from upload)
 */
export async function deleteStatementFile(fileId: string): Promise<void> {
  await storage.deleteFile(BUCKET_ID, fileId)
}

/**
 * Returns a temporary download URL for a stored statement file.
 * URL is pre-authenticated — valid for the current session only.
 *
 * @param fileId - The Appwrite Storage file ID
 */
export function getStatementFileUrl(fileId: string): string {
  return storage.getFileDownload(BUCKET_ID, fileId).toString()
}

/**
 * Downloads a statement file as an ArrayBuffer for in-browser parsing.
 * Used by the parser layer to read PDF/Excel bytes client-side.
 *
 * @param fileId - The Appwrite Storage file ID
 */
export async function downloadStatementFile(fileId: string): Promise<ArrayBuffer> {
  const url = getStatementFileUrl(fileId)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download statement file: ${res.statusText}`)
  }
  return res.arrayBuffer()
}
