import { serve } from '../_shared/deps.ts'
import { json, handleCors } from '../_shared/http.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { deleteImageKitFileById, findImageKitFileIdByPath } from '../_shared/imagekit.ts'

type RequestBody = {
  fileId?: string
  productImageId?: number | string
  filePath?: string
}

const ALLOWED_PUBLIC_FILE_PATH_PATTERNS = [
  /^\/public\/banners\/[^/]+$/,
  /^\/public\/beauty\/posters\/[^/]+$/,
  /^\/public\/beauty\/glam\/[^/]+$/,
  /^\/public\/charm-bar-assets\/[a-z0-9-]+\/[^/]+$/,
  /^\/public\/dressing-room\/[0-9]+\/[^/]+$/,
  /^\/public\/events-schedule\/[a-z0-9-]+\/[^/]+$/,
  /^\/public\/stage-gallery\/[^/]+$/,
]

function normalizeFilePath(value: string): string {
  const trimmed = value.trim().replace(/\\/g, '/')
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/')
}

function isAllowedPublicFilePath(filePath: string): boolean {
  return ALLOWED_PUBLIC_FILE_PATH_PATTERNS.some((pattern) => pattern.test(filePath))
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, { status: 405 })
  }

  const { context, response } = await requireAdminContext(req)
  if (response) return response
  if (!context) return json(req, { error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as RequestBody
    const fileId = String(body.fileId ?? '').trim()
    const rawFilePath = typeof body.filePath === 'string' ? body.filePath : ''
    const filePath = rawFilePath ? normalizeFilePath(rawFilePath) : ''
    const productImageId = Number(body.productImageId)

    if (filePath) {
      if (!isAllowedPublicFilePath(filePath)) {
        return json(req, { error: 'Invalid filePath' }, { status: 400 })
      }

      const resolvedFileId = await findImageKitFileIdByPath(filePath)
      if (!resolvedFileId) {
        return json(req, { error: 'ImageKit file not found for filePath' }, { status: 404 })
      }

      await deleteImageKitFileById(resolvedFileId)
      return json(req, { ok: true, fileId: resolvedFileId, filePath })
    }

    if (!fileId) {
      return json(req, { error: 'Missing fileId or filePath' }, { status: 400 })
    }

    let productImageQuery = context.supabaseService
      .from('product_images')
      .select('id, image_provider, provider_file_id')
      .eq('image_provider', 'imagekit')

    if (Number.isFinite(productImageId) && productImageId > 0) {
      productImageQuery = productImageQuery.eq('id', productImageId)
    } else {
      productImageQuery = productImageQuery.eq('provider_file_id', fileId)
    }

    const { data: productImageRow, error: productImageError } = await productImageQuery.maybeSingle()

    if (productImageError) {
      return json(req, { error: 'Failed to verify product image' }, { status: 500 })
    }

    if (!productImageRow?.id || String(productImageRow.provider_file_id ?? '').trim() !== fileId) {
      return json(req, { error: 'Product image not found for this fileId' }, { status: 404 })
    }

    await deleteImageKitFileById(fileId)
    return json(req, { ok: true, productImageId: productImageRow.id })
  } catch (error) {
    console.error('imagekit-delete failed', error)
    return json(req, { error: error instanceof Error ? error.message : 'Failed to delete ImageKit file' }, { status: 500 })
  }
})
