import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const b2 = new S3Client({
  endpoint: process.env.B2_ENDPOINT_URL!,
  region: 'us-east-005', // typically matches the endpoint region
  credentials: {
    accessKeyId: process.env.B2_ACCOUNT_KEY_ID!,
    secretAccessKey: process.env.B2_ACCOUNT_APPLICATION_KEY!,
  },
});

export async function uploadToB2(fileBuffer: Buffer, fileName: string, contentType: string = 'application/pdf') {
  const bucketName = process.env.B2_BUCKET_NAME!;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await b2.send(command);
  
  // B2 public URL format if the bucket is public
  // https://f005.backblazeb2.com/file/<bucketName>/<fileName>
  // Or using the endpoint URL:
  return `${process.env.B2_ENDPOINT_URL}/file/${bucketName}/${fileName}`;
}
