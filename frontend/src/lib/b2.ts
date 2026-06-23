import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const b2 = new S3Client({
  endpoint: process.env.B2_ENDPOINT_URL!,
  region: 'us-east-005', // typically matches the endpoint region
  credentials: {
    accessKeyId: process.env.B2_ACCOUNT_KEY_ID!,
    secretAccessKey: process.env.B2_ACCOUNT_APPLICATION_KEY!,
  },
});

export async function getPresignedUrl(fileName: string, expiresIn = 3600) {
  const bucketName = process.env.B2_BUCKET_NAME!;
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });
  
  // Generate a signed URL that expires in 1 hour (3600 seconds) by default
  const signedUrl = await getSignedUrl(b2, command, { expiresIn });
  return signedUrl;
}

export async function uploadToB2(fileBuffer: Buffer, fileName: string, contentType: string = 'application/pdf') {
  const bucketName = process.env.B2_BUCKET_NAME!;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await b2.send(command);
  
  // Return a signed URL instead of a static public URL for private buckets
  return await getPresignedUrl(fileName);
}
