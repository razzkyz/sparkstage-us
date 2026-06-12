// Cloudflare R2 Presigned Upload URL Generator
// This Edge Function generates presigned URLs for direct R2 uploads
// Date: 2026-06-10

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UploadRequest {
  fileName: string
  fileType: string
  productId: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { fileName, fileType, productId }: UploadRequest = await req.json()

    if (!fileName || !fileType || !productId) {
      throw new Error('Missing required fields: fileName, fileType, productId')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`)
    }

    // Generate unique file name
    const fileExt = fileName.split('.').pop()
    const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`
    const s3Key = `products/${productId}/${uniqueFileName}`

    // Configure R2 S3 client
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: Deno.env.get('R2_ENDPOINT'),
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
      },
    })

    // Generate presigned upload URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME') ?? '',
      Key: s3Key,
      ContentType: fileType,
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600, // 10 minutes
    })

    // Construct public URL for the uploaded file
    const publicUrl = `${Deno.env.get('R2_PUBLIC_URL')}/${s3Key}`

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          uploadUrl: presignedUrl,
          publicUrl: publicUrl,
          key: s3Key,
          fileName: uniqueFileName,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('R2 upload URL generation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
