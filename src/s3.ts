import { S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_REGION, S3_ENDPOINT } from "./config.ts";

export const s3Client = new Bun.S3Client({
  accessKeyId: S3_ACCESS_KEY,
  secretAccessKey: S3_SECRET_KEY,
  bucket: S3_BUCKET,
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
});
