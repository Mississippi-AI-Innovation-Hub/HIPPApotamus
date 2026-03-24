import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";

const BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "hipaapotamus-documents";

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(process.env.S3_ENDPOINT && {
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
  }),
});

interface UploadParams {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
}

export async function uploadToS3(params: UploadParams): Promise<string> {
  const { key, body, contentType, metadata } = params;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
        ...(metadata && { Metadata: metadata }),
      }),
    );

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com/${key}`;
    logger.info("File uploaded to S3", { key, contentType });
    return url;
  } catch (error) {
    logger.error("Failed to upload to S3", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getPresignedUrl(
  key: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    logger.info("Presigned URL generated", { key, expiresInSeconds });
    return url;
  } catch (error) {
    logger.error("Failed to generate presigned URL", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getObjectFromS3(key: string): Promise<Buffer | null> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    );

    if (!result.Body) return null;

    // Convert the readable stream to a Buffer
    const chunks: Uint8Array[] = [];
    const stream = result.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    logger.info("File downloaded from S3", { key });
    return Buffer.concat(chunks);
  } catch (error) {
    logger.error("Failed to download from S3", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function deleteFromS3(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    );

    logger.info("File deleted from S3", { key });
    return true;
  } catch (error) {
    logger.error("Failed to delete from S3", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
