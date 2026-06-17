# Copy R2 Bucket dari Indonesia ke US

**Date:** 2026-06-13  
**Purpose:** Copy product images dari R2 Indonesia ke R2 US

---

## 📋 Prerequisites

1. **Rclone installed** - Download dari: https://rclone.org/downloads/
2. **R2 Credentials** - Sudah ada di `.env.r2-migration`

---

## 🚀 Method 1: Menggunakan Rclone (Recommended)

### Step 1: Install Rclone

**Windows:**
```bash
# Download dan extract rclone
# Download dari: https://rclone.org/downloads/
# Extract ke C:\rclone\

# Add to PATH atau jalankan langsung
C:\rclone\rclone.exe version
```

**Alternative (via Chocolatey):**
```bash
choco install rclone
```

### Step 2: Configure Rclone

Buat file `rclone.conf` di folder ini:

```ini
[r2-indo]
type = s3
provider = Cloudflare
access_key_id = 2e5f3b814dfd2925e60bb5aad6f74483
secret_access_key = fdb41bebbc3ae3f763bd9abb3bd1238402d6adf7e19422d08498ed9754e35f5c
endpoint = https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
acl = private

[r2-us]
type = s3
provider = Cloudflare
access_key_id = 2e5f3b814dfd2925e60bb5aad6f74483
secret_access_key = fdb41bebbc3ae3f763bd9abb3bd1238402d6adf7e19422d08498ed9754e35f5c
endpoint = https://58103a6169fd3011a58d558c15adb7c6.r2.cloudflarestorage.com
acl = private
```

### Step 3: Copy Bucket

**Copy seluruh bucket:**
```bash
rclone copy r2-indo:sparkstage-public-assets r2-us:sparkstage-us-assets --progress
```

**Copy folder tertentu saja (products):**
```bash
rclone copy r2-indo:sparkstage-public-assets/products r2-us:sparkstage-us-assets/products --progress
```

**Copy dengan filter (hanya .jpg dan .png):**
```bash
rclone copy r2-indo:sparkstage-public-assets/products r2-us:sparkstage-us-assets/products --include "*.jpg" --include "*.png" --progress
```

---

## 🚀 Method 2: Menggunakan Node.js Script

Jika tidak mau install Rclone, bisa pakai script Node.js:

### Step 1: Install Dependencies

```bash
npm install @aws-sdk/client-s3 dotenv
```

### Step 2: Create Script

File: `scripts/copy-r2-bucket.js`

```javascript
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.r2-migration' });

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function copyBucket() {
  const sourceBucket = 'sparkstage-public-assets';
  const targetBucket = 'sparkstage-us-assets';
  
  console.log(`📦 Copying from ${sourceBucket} to ${targetBucket}...`);
  
  try {
    // List all objects in source bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: sourceBucket,
      Prefix: 'products/', // Only copy products folder
    });
    
    const { Contents } = await client.send(listCommand);
    
    if (!Contents || Contents.length === 0) {
      console.log('❌ No files found!');
      return;
    }
    
    console.log(`📊 Found ${Contents.length} files to copy`);
    
    // Copy each object
    let copied = 0;
    for (const object of Contents) {
      try {
        // Get object from source
        const getCommand = new GetObjectCommand({
          Bucket: sourceBucket,
          Key: object.Key,
        });
        
        const { Body, ContentType } = await client.send(getCommand);
        
        // Put object to target
        const putCommand = new PutObjectCommand({
          Bucket: targetBucket,
          Key: object.Key,
          Body: Body,
          ContentType: ContentType,
        });
        
        await client.send(putCommand);
        
        copied++;
        console.log(`✅ [${copied}/${Contents.length}] Copied: ${object.Key}`);
      } catch (err) {
        console.error(`❌ Failed to copy ${object.Key}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Done! Copied ${copied}/${Contents.length} files`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

copyBucket();
```

### Step 3: Run Script

```bash
node scripts/copy-r2-bucket.js
```

---

## 🚀 Method 3: Cloudflare Dashboard (Manual)

**Limitations:** Tidak ada fitur copy bucket di dashboard.

**Workaround:**
1. Download files dari bucket Indonesia
2. Upload ke bucket US

**Not recommended** untuk 2,227 files!

---

## ⚡ Quick Start (Recommended Path)

### Option A: Copy Semua Gambar (2,227 files)

```bash
# Install rclone
choco install rclone

# Configure rclone (gunakan config di atas)

# Copy semua products
rclone copy r2-indo:sparkstage-public-assets/products r2-us:sparkstage-us-assets/products --progress
```

**Estimasi waktu:** ~5-10 menit (tergantung ukuran file)

### Option B: Copy Sample Saja (20-50 files untuk testing)

Jika hanya mau testing dulu, copy beberapa file saja:

```bash
rclone copy r2-indo:sparkstage-public-assets/products r2-us:sparkstage-us-assets/products --max-size 1M --max-transfer 20M --progress
```

---

## 📊 Setelah Copy Selesai

### 1. Verify Files

```bash
# List files in US bucket
rclone ls r2-us:sparkstage-us-assets/products

# Compare count
rclone size r2-indo:sparkstage-public-assets/products
rclone size r2-us:sparkstage-us-assets/products
```

### 2. Setup Custom Domain

Create custom domain untuk US bucket: `cdn.sparkstage-us.com`

See: `R2_US_DOMAIN_SETUP.md` (akan dibuat nanti)

### 3. Update Database

Update URLs dari:
- `https://cdn.sparkstage55.com/products/...`

Ke:
- `https://cdn.sparkstage-us.com/products/...`

---

## 🔒 Security Notes

1. **Credentials:** File rclone.conf berisi credentials - jangan commit ke git!
2. **Permissions:** Pastikan bucket US sudah dibuat dan accessible
3. **Backup:** R2 Indonesia tetap intact (tidak berubah)

---

## ❓ Troubleshooting

### Error: "bucket not found"

Pastikan bucket `sparkstage-us-assets` sudah dibuat di Cloudflare.

### Error: "access denied"

Cek R2 API token permissions: Read & Write access.

### Slow Transfer

Gunakan `--transfers` flag untuk parallel upload:

```bash
rclone copy r2-indo:sparkstage-public-assets/products r2-us:sparkstage-us-assets/products --transfers 10 --progress
```

---

## 📚 Resources

- Rclone Docs: https://rclone.org/s3/
- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- R2 API Docs: https://developers.cloudflare.com/r2/api/s3/api/

---

**Next Steps:**
1. Choose method (Rclone recommended)
2. Create US bucket first: `sparkstage-us-assets`
3. Run copy command
4. Setup custom domain
5. Update database URLs
