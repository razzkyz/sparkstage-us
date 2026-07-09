import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import fs from 'fs';

const envLocal = dotenv.parse(fs.readFileSync('./.env.local'));

const s3Client = new S3Client({
  region: 'auto',
  endpoint: envLocal.R2_ENDPOINT,
  credentials: {
    accessKeyId: envLocal.R2_ACCESS_KEY_ID,
    secretAccessKey: envLocal.R2_SECRET_ACCESS_KEY,
  },
});

async function checkR2() {
  try {
    console.log("Checking US bucket...");
    const usCommand = new ListObjectsV2Command({
      Bucket: 'sparkstage-us-assets',
      MaxKeys: 10
    });
    const usRes = await s3Client.send(usCommand);
    console.log("US Bucket files:", usRes.Contents?.map(c => c.Key));
    
    console.log("\nChecking Indo bucket...");
    const indoCommand = new ListObjectsV2Command({
      Bucket: 'sparkstage-public-assets',
      MaxKeys: 10
    });
    const indoRes = await s3Client.send(indoCommand);
    console.log("Indo Bucket files:", indoRes.Contents?.map(c => c.Key));
    
  } catch (err) {
    console.error("Error:", err);
  }
}

checkR2();
