// Direct R2 Upload Test (skip ListBuckets)
// This works with Object Read & Write permission
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

const ACCOUNT_ID = '58103a6169fd3011a58d558c15adb7c6'
const ACCESS_KEY = '98eaa698e2edca5cc23ed52b03cec8d9'
const SECRET_KEY = 'fb9d4deb43017dd9902d12ccebfbbd8164571339850fc4fb2a60d5a5df6f041e'
const BUCKET_NAME = 'sparkstage-us-assets'

console.log('🚀 Testing Direct R2 Upload...')
console.log(`   Bucket: ${BUCKET_NAME}`)
console.log(`   Account: ${ACCOUNT_ID}`)
console.log('')

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
})

async function testDirectUpload() {
  try {
    // Step 1: Upload test file
    console.log('📤 Step 1: Upload test file...')
    const testContent = `R2 Upload Test - ${new Date().toISOString()}\nBucket: ${BUCKET_NAME}`
    const testKey = `test/upload-test-${Date.now()}.txt`
    
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    })
    
    await s3Client.send(putCommand)
    console.log(`✅ File uploaded successfully!`)
    console.log(`   Key: ${testKey}`)
    console.log('')

    // Step 2: Verify upload
    console.log('✅ Step 2: Verify file exists...')
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    })
    
    await s3Client.send(getCommand)
    console.log('✅ File verified in R2!')
    console.log('')

    // Step 3: Show public URL
    console.log('🌐 Step 3: Get Public URL')
    console.log('')
    console.log('To access this file publicly:')
    console.log('1. Go to: https://dash.cloudflare.com/')
    console.log(`2. R2 → ${BUCKET_NAME} → Settings → Public Access`)
    console.log('3. Enable "Allow Access" if not enabled')
    console.log('4. Copy R2.dev subdomain URL')
    console.log('')
    console.log('Your file will be at:')
    console.log(`   https://pub-xxxxx.r2.dev/${testKey}`)
    console.log('')
    console.log('✅ R2 UPLOAD TEST PASSED! 🎉')
    console.log('')
    console.log('Token is working correctly!')
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message)
    
    if (error.Code === 'NoSuchBucket') {
      console.error(`\n⚠️  Bucket "${BUCKET_NAME}" not found`)
    } else if (error.Code === 'AccessDenied') {
      console.error('\n⚠️  Access denied. Token may not have write permission.')
    } else if (error.Code === 'InvalidAccessKeyId') {
      console.error('\n⚠️  Invalid Access Key ID')
    } else if (error.Code === 'SignatureDoesNotMatch') {
      console.error('\n⚠️  Invalid Secret Access Key')
    }
    
    process.exit(1)
  }
}

testDirectUpload()
