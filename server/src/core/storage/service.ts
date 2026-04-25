import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { env } from "@/core/env";
import type {
  UploadOptions,
  UploadResult,
  DownloadOptions,
  DownloadResult,
  FileExistsResult,
  ListResult,
  ListBucketsResult,
  CopyOptions,
  GetStringOptions,
  CreateSignedUrlOptions,
  SignedUrlResult,
} from "@/core/storage/types";

export class StorageService {
  private client: S3Client;
  private bucketName: string;

  constructor(bucketName?: string) {
    this.client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.bucketName = bucketName || env.AWS_DEFAULT_S3_BUCKET;
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const { filePath, fileData, contentType, metadata, cacheControl, contentDisposition } = options;

    const input: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: filePath,
      Body: fileData as PutObjectCommandInput["Body"],
      ContentType: contentType,
      Metadata: metadata,
      CacheControl: cacheControl,
      ContentDisposition: contentDisposition,
    };

    const command = new PutObjectCommand(input);
    const response = await this.client.send(command);

    return {
      filePath,
      etag: response.ETag,
    };
  }

  async download(options: DownloadOptions): Promise<DownloadResult> {
    const { s3Path, localPath } = options;
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Path,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error("No body in response");
    }

    const body = response.Body as Readable;
    await pipeline(body, createWriteStream(localPath));

    return {
      filePath: localPath,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  }

  async getBuffer({ s3Path }: { s3Path: string }): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Path,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error("No body in response");
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async getString(options: GetStringOptions): Promise<string> {
    const { s3Path, encoding = "utf-8" } = options;
    const buffer = await this.getBuffer({ s3Path });
    return buffer.toString(encoding);
  }

  async remove({ filePaths }: { filePaths: string[] }): Promise<{ filePaths: string[] }> {
    const command = new DeleteObjectsCommand({
      Bucket: this.bucketName,
      Delete: {
        Objects: filePaths.map((key) => ({ Key: key })),
      },
    });

    await this.client.send(command);

    return { filePaths };
  }

  async removeByPrefix({ prefix }: { prefix: string }): Promise<{ deletedCount: number }> {
    let deletedCount = 0;
    let continuationToken: string | undefined;

    do {
      const listResult = await this.list({ prefix, maxKeys: 1000, continuationToken });

      const keys = listResult.files.map((file) => file.key);
      if (keys.length) {
        await this.remove({ filePaths: keys });
        deletedCount += keys.length;
      }

      continuationToken =
        listResult.isTruncated && listResult.nextContinuationToken
          ? listResult.nextContinuationToken
          : undefined;
    } while (continuationToken);

    return { deletedCount };
  }

  async createSignedUrl(options: CreateSignedUrlOptions): Promise<SignedUrlResult> {
    const { filePath, expiresIn = 3600, operation = "get" } = options;

    const command =
      operation === "get"
        ? new GetObjectCommand({ Bucket: this.bucketName, Key: filePath })
        : new PutObjectCommand({ Bucket: this.bucketName, Key: filePath });

    const signedUrl = await getSignedUrl(this.client, command, { expiresIn });

    return { signedUrl, expiresIn };
  }

  async fileExists({ filePath }: { filePath: string }): Promise<FileExistsResult> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const response = await this.client.send(command);

      return {
        exists: true,
        size: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        (("name" in error && error.name === "NotFound") ||
          ("$metadata" in error &&
            typeof error.$metadata === "object" &&
            error.$metadata !== null &&
            "httpStatusCode" in error.$metadata &&
            error.$metadata.httpStatusCode === 404))
      ) {
        return { exists: false };
      }

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async list(
    options: { prefix?: string; maxKeys?: number; continuationToken?: string } = {},
  ): Promise<ListResult> {
    const { prefix, maxKeys = 1000, continuationToken } = options;
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    });

    const response = await this.client.send(command);

    return {
      files: (response.Contents || [])
        .filter((obj) => obj.Key && obj.Size !== undefined && obj.LastModified)
        .map((obj) => ({
          key: obj.Key as string,
          size: obj.Size as number,
          lastModified: obj.LastModified as Date,
        })),
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  }

  async copy(options: CopyOptions): Promise<UploadResult> {
    const { sourcePath, destinationPath, sourceBucket } = options;
    const copySource = `${sourceBucket || this.bucketName}/${sourcePath}`;

    const command = new CopyObjectCommand({
      Bucket: this.bucketName,
      Key: destinationPath,
      CopySource: copySource,
    });

    const response = await this.client.send(command);

    return {
      filePath: destinationPath,
      etag: response.CopyObjectResult?.ETag,
    };
  }

  async listBuckets(): Promise<ListBucketsResult> {
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);

    return {
      buckets: (response.Buckets || []).map((bucket) => ({
        name: bucket.Name || "",
        creationDate: bucket.CreationDate,
      })),
    };
  }

  getBucketName(): string {
    return this.bucketName;
  }

  setBucketName(bucketName: string): void {
    this.bucketName = bucketName;
  }
}
