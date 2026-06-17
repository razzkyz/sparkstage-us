// Simple R2 Connection Test
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'

// Paste credentials directly for testing
const ACCOUNT_ID = '58103a6169fd3011a58d558c15adb7c6'
const ACCESS_KEY = '98eaa698e2edca5cc23ed52b03cec8d9'
const SECRET_KEY = 'fb9d4deb43017dd9902d12ccebfbbd8164571339850fc4fb2a60d5a5df6f041e'

console.log('Testing R2 Connection...')
console.log(`Account: ${ACCOUNT_ID}`)
console.log(`Access Key: ${ACCESS_KEY.substring(0, 8)}...`)
console.log(`Secret Key: ${SECRET_KEY.substring(0, 8)}...`)
console.log('')

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
})

try {
  const command = new ListBucketsCommand({})
  const response = await s3Client.send(command)
  
  console.log('✅ SUCCESS! Connection works!')
  console.log(`Found ${response.Buckets?.length || 0} buckets:`)
  response.Buckets?.forEach(b => console.log(`  - ${b.Name}`))
  
} catch (error) {
  console.log('❌ FAILED:', error.message)
  console.log('')
  console.log('Common issues:')
  console.log('1. Token needs 1-2 minutes to propagate after creation')
  console.log('2. Token permissions not set correctly')
  console.log('3. Credentials copied incorrectly (check for spaces)')
  console.log('')
  console.log('Please verify in Cloudflare Dashboard:')
  console.log('→ R2 → Manage R2 API Tokens')
  console.log('→ Check token has "Object Read & Write" permission')
  console.log('→ Check token applies to "All buckets" or specific buckets')
}
