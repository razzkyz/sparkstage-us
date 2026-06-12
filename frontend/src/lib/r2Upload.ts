// Cloudflare R2 Upload Helper
// Handles direct uploads to R2 via presigned URLs
// Date: 2026-06-10

import { supabase } from './supabase'

interface R2UploadResponse {
  uploadUrl: string
  publicUrl: string
  key: string
  fileName: string
}

interface UploadOptions {
  file: File
  productId: number
  onProgress?: (progress: number) => void
}

/**
 * Upload a file to Cloudflare R2
 * 
 * @param options - Upload configuration
 * @returns Public URL of uploaded file
 */
export async function uploadToR2(options: UploadOptions): Promise<string> {
  const { file, productId, onProgress } = options

  try {
    // Step 1: Get presigned upload URL from backend
    const { data: authData } = await supabase.auth.getSession()
    
    if (!authData.session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-upload-url`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          productId: productId,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get upload URL')
    }

    const { data }: { data: R2UploadResponse } = await response.json()

    // Step 2: Upload file directly to R2 using presigned URL
    const uploadResponse = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`)
    }

    // Step 3: Track progress (simulated since direct upload doesn't provide progress)
    if (onProgress) {
      onProgress(100)
    }

    // Return public URL
    return data.publicUrl

  } catch (error) {
    console.error('R2 upload error:', error)
    throw error
  }
}

/**
 * Upload multiple files to R2
 * 
 * @param files - Array of files to upload
 * @param productId - Product ID for folder organization
 * @param onProgress - Progress callback (0-100)
 * @returns Array of public URLs
 */
export async function uploadMultipleToR2(
  files: File[],
  productId: number,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const urls: string[] = []
  
  for (let i = 0; i < files.length; i++) {
    const url = await uploadToR2({
      file: files[i],
      productId,
      onProgress: (fileProgress) => {
        if (onProgress) {
          const totalProgress = ((i + fileProgress / 100) / files.length) * 100
          onProgress(Math.round(totalProgress))
        }
      },
    })
    urls.push(url)
  }

  return urls
}

/**
 * Validate file before upload
 * 
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}

/**
 * Delete file from R2 (requires backend function)
 * Note: This is a placeholder - implement backend deletion if needed
 * 
 * @param imageUrl - Full URL of image to delete
 */
export async function deleteFromR2(imageUrl: string): Promise<void> {
  // Extract key from URL
  const url = new URL(imageUrl)
  const key = url.pathname.substring(1) // Remove leading slash

  console.warn('R2 deletion not implemented yet:', key)
  
  // TODO: Implement backend Edge Function for R2 deletion
  // For now, images remain in R2 (acceptable for low-cost storage)
}
