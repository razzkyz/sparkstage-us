// Check R2 Buckets and Get Public URLs
// Run: node scripts/check-r2-buckets.js

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import 'dotenv/config'

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Missing R2 credentials in .env.local')
  console.error('Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  process.exit(1)
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
})

async function listBuckets() {
  try {
    console.log('🔍 Listing R2 Buckets...\n')

    const command = new ListBucketsCommand({})
    const response = await s3Client.send(command)

    if (!response.Buckets || response.Buckets.length === 0) {
      console.log('⚠️  No buckets found')
      return
    }

    console.log(`✅ Found ${response.Buckets.length} bucket(s):\n`)

    response.Buckets.forEach((bucket, index) => {
      console.log(`${index + 1}. ${bucket.Name}`)
      console.log(`   Created: ${bucket.CreationDate}`)
      
      // Generate R2.dev public URL
      // Format: https://pub-<hash>.r2.dev
      // Note: You need to enable public access in Cloudflare Dashboard to get actual URL
      console.log(`   Public URL: Check Cloudflare Dashboard → R2 → ${bucket.Name} → Settings → Public Access`)
      console.log('')
    })

    console.log('\n💡 To get R2.dev public URL:')
    console.log('1. Go to: https://dash.cloudflare.com/')
    console.log('2. Click: R2 → [Your Bucket]')
    console.log('3. Click: Settings → Public Access')
    console.log('4. Enable public access if not enabled')
    console.log('5. Copy the R2.dev subdomain URL')
    console.log('')
    console.log('Update .env.local:')
    console.log('R2_PUBLIC_URL=https://pub-xxxxx.r2.dev')

  } catch (error) {
    console.error('❌ Error listing buckets:', error.message)
    
    if (error.Code === 'InvalidAccessKeyId') {
      console.error('\n⚠️  Invalid credentials. Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY')
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('\n⚠️  Invalid secret key. Check R2_SECRET_ACCESS_KEY')
    }
  }
}

listBuckets()
