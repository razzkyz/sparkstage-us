import { getImageKitEnv } from './env.ts'

const textEncoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

export function getProductImageFolder(productId: number): string {
  const { productImagesBasePath } = getImageKitEnv()
  return `${productImagesBasePath}/${productId}`
}

function normalizeImageKitFolderPath(folderPath: string): string {
  const trimmed = folderPath.trim().replace(/\\/g, '/')
  const normalized = `/${trimmed.replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/')
  return normalized === '/' ? '/products' : normalized
}

async function createImageKitUploadAuthPayloadForFolder(folder: string) {
  const { publicKey, privateKey, urlEndpoint } = getImageKitEnv()
  const token = crypto.randomUUID()
  const expire = Math.floor(Date.now() / 1000) + 15 * 60
  const signingKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(privateKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', signingKey, textEncoder.encode(`${token}${expire}`))
  return {
    publicKey,
    urlEndpoint,
    token,
    expire,
    signature: toHex(signatureBuffer),
    folder,
  }
}

export async function createImageKitUploadAuthPayload(productId: number) {
  return createImageKitUploadAuthPayloadForFolder(getProductImageFolder(productId))
}

export async function createImageKitFolderUploadAuthPayload(folderPath: string) {
  return createImageKitUploadAuthPayloadForFolder(normalizeImageKitFolderPath(folderPath))
}

export async function deleteImageKitFileById(fileId: string): Promise<void> {
  const { privateKey } = getImageKitEnv()
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${privateKey}:`)}`,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ImageKit delete failed (${response.status}): ${body || response.statusText}`)
  }
}

type ImageKitListFileItem = {
  fileId?: string
  name?: string
  filePath?: string
  type?: string
}

function createImageKitBasicAuthHeader(): string {
  const { privateKey } = getImageKitEnv()
  return `Basic ${btoa(`${privateKey}:`)}`
}

export async function findImageKitFileIdByPath(filePath: string): Promise<string | null> {
  const normalizedPath = `/${filePath.trim().replace(/^\/+/, '')}`
  const lastSlashIndex = normalizedPath.lastIndexOf('/')
  if (lastSlashIndex <= 0 || lastSlashIndex === normalizedPath.length - 1) {
    throw new Error('Invalid ImageKit file path')
  }

  const folderPath = normalizedPath.slice(0, lastSlashIndex)
  const fileName = normalizedPath.slice(lastSlashIndex + 1)
  const response = await fetch(
    `https://api.imagekit.io/v1/files?${new URLSearchParams({
      path: folderPath,
      limit: '1000',
      skip: '0',
      type: 'file',
    }).toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: createImageKitBasicAuthHeader(),
      },
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`ImageKit list files failed (${response.status}): ${body || response.statusText}`)
  }

  const payload = (await response.json()) as ImageKitListFileItem[]
  const file = payload.find((item) =>
    item?.type === 'file' &&
    item?.name === fileName &&
    item?.filePath === normalizedPath &&
    typeof item?.fileId === 'string' &&
    item.fileId.trim() !== ''
  )

  return file?.fileId ?? null
}
