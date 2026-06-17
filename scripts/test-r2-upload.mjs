// Test R2 Upload to sparkstage-us-assets
// Run: node scripts/test-r2-upload.mjs

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    
    const [key, ...valueParts] = trimmed.split('=')
    const value = valueParts.join('=').trim()
    
    if (key && value) {
      process.env[key] = value
    }
  })
} catch (error) {
  console.error('❌ Failed to load .env.local:', error.message)
  process.exit(1)
}

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME || 'sparkstage-us-assets'

console.log('🔍 R2 Configuration:')
console.log(`   Account ID: ${accountId ? '✅ Found' : '❌ Missing'}`)
console.log(`   Access Key: ${accessKeyId ? '✅ Found' : '❌ Missing'}`)
console.log(`   Secret Key: ${secretAccessKey ? '✅ Found' : '❌ Missing'}`)
console.log(`   Bucket: ${bucketName}`)
console.log('')

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Missing R2 credentials in .env.local')
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

async function testR2Upload() {
  try {
    // Step 1: List buckets
    console.log('📋 Step 1: List all buckets...')
    const listCommand = new ListBucketsCommand({})
    const listResponse = await s3Client.send(listCommand)
    
    if (listResponse.Buckets) {
      console.log(`✅ Found ${listResponse.Buckets.length} bucket(s):`)
      listResponse.Buckets.forEach(bucket => {
        const isTarget = bucket.Name === bucketName
        console.log(`   ${isTarget ? '→' : ' '} ${bucket.Name}${isTarget ? ' (target)' : ''}`)
      })
      console.log('')
    }

    // Step 2: Upload test file
    console.log('📤 Step 2: Upload test file...')
    const testContent = `R2 Upload Test - ${new Date().toISOString()}`
    const testKey = `test/upload-test-${Date.now()}.txt`
    
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    })
    
    await s3Client.send(putCommand)
    console.log(`✅ File uploaded: ${testKey}`)
    console.log('')

    // Step 3: Verify upload
    console.log('✅ Step 3: Verify upload...')
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    })
    
    const getResponse = await s3Client.send(getCommand)
    console.log('✅ File verified in R2')
    console.log('')

    // Step 4: Show public URL info
    console.log('🌐 Step 4: Public URL Configuration')
    console.log('')
    console.log('Your file is uploaded to:')
    console.log(`   Key: ${testKey}`)
    console.log('')
    console.log('To access it publicly, you need to:')
    console.log('1. Go to: https://dash.cloudflare.com/')
    console.log('2. Click: R2 → sparkstage-us-assets')
    console.log('3. Click: Settings → Public Access')
    console.log('4. Enable "Allow Access" if not enabled')
    console.log('5. Copy the R2.dev subdomain (e.g., https://pub-xxxxx.r2.dev)')
    console.log('')
    console.log('Then your file will be accessible at:')
    console.log(`   https://pub-xxxxx.r2.dev/${testKey}`)
    console.log('')
    console.log('Update .env.local with:')
    console.log(`   R2_PUBLIC_URL=https://pub-xxxxx.r2.dev`)
    console.log('')
    console.log('✅ R2 Upload Test PASSED!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.Code === 'NoSuchBucket') {
      console.error(`\n⚠️  Bucket "${bucketName}" not found`)
      console.error('Available buckets are listed above.')
    } else if (error.Code === 'InvalidAccessKeyId') {
      console.error('\n⚠️  Invalid credentials. Check R2_ACCESS_KEY_ID')
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('\n⚠️  Invalid secret key. Check R2_SECRET_ACCESS_KEY')
    } else if (error.Code === 'AccessDenied') {
      console.error('\n⚠️  Access denied. Check API token permissions.')
      console.error('Token must have "Object Read & Write" permission.')
    }
    
    process.exit(1)
  }
}

testR2Upload()
