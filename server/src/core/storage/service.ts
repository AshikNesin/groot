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
  StorageResult,
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

  async upload(options: UploadOptions): Promise<StorageResult<UploadResult>> {
    try {
      const { filePath, fileData, contentType, metadata, cacheControl, contentDisposition } =
        options;

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
        data: {
          filePath,
          etag: response.ETag,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async download(options: DownloadOptions): Promise<StorageResult<DownloadResult>> {
    try {
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
        data: {
          filePath: localPath,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getBuffer({ s3Path }: { s3Path: string }): Promise<StorageResult<Buffer>> {
    try {
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
      const buffer = Buffer.concat(chunks);

      return {
        data: buffer,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async getString(options: GetStringOptions): Promise<StorageResult<string>> {
    const { s3Path, encoding = "utf-8" } = options;
    const result = await this.getBuffer({ s3Path });
    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }
    return {
      data: result.data.toString(encoding),
      error: null,
    };
  }

  async remove({
    filePaths,
  }: {
    filePaths: string[];
  }): Promise<StorageResult<{ filePaths: string[] }>> {
    try {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: filePaths.map((key) => ({ Key: key })),
        },
      });

      await this.client.send(command);

      return {
        data: { filePaths },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete all objects under a prefix. Handles S3 pagination internally
   * (deletes each listed page immediately to avoid buffering all keys in memory).
   */
  async removeByPrefix({
    prefix,
  }: {
    prefix: string;
  }): Promise<StorageResult<{ deletedCount: number }>> {
    try {
      let deletedCount = 0;
      let continuationToken: string | undefined;

      do {
        const listResult = await this.list({ prefix, maxKeys: 1000, continuationToken });
        if (listResult.error) {
          return { data: null, error: listResult.error };
        }

        const keys = listResult.data?.files.map((file) => file.key) ?? [];
        if (keys.length) {
          const deleteResult = await this.remove({ filePaths: keys });
          if (deleteResult.error) {
            return { data: null, error: deleteResult.error };
          }
          deletedCount += keys.length;
        }

        continuationToken =
          listResult.data?.isTruncated && listResult.data?.nextContinuationToken
            ? listResult.data.nextContinuationToken
            : undefined;
      } while (continuationToken);

      return { data: { deletedCount }, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async createSignedUrl(options: CreateSignedUrlOptions): Promise<StorageResult<SignedUrlResult>> {
    try {
      const { filePath, expiresIn = 3600, operation = "get" } = options;

      const command =
        operation === "get"
          ? new GetObjectCommand({ Bucket: this.bucketName, Key: filePath })
          : new PutObjectCommand({ Bucket: this.bucketName, Key: filePath });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });

      return {
        data: { signedUrl, expiresIn },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async fileExists({ filePath }: { filePath: string }): Promise<StorageResult<FileExistsResult>> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });

      const response = await this.client.send(command);

      return {
        data: {
          exists: true,
          size: response.ContentLength,
          lastModified: response.LastModified,
        },
        error: null,
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
        return {
          data: { exists: false },
          error: null,
        };
      }

      return {
        data: { exists: false },
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async list(
    options: { prefix?: string; maxKeys?: number; continuationToken?: string } = {},
  ): Promise<StorageResult<ListResult>> {
    try {
      const { prefix, maxKeys = 1000, continuationToken } = options;
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });

      const response = await this.client.send(command);

      return {
        data: {
          files: (response.Contents || [])
            .filter((obj) => obj.Key && obj.Size !== undefined && obj.LastModified)
            .map((obj) => ({
              key: obj.Key as string,
              size: obj.Size as number,
              lastModified: obj.LastModified as Date,
            })),
          isTruncated: response.IsTruncated || false,
          nextContinuationToken: response.NextContinuationToken,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async copy(options: CopyOptions): Promise<StorageResult<UploadResult>> {
    try {
      const { sourcePath, destinationPath, sourceBucket } = options;
      const copySource = `${sourceBucket || this.bucketName}/${sourcePath}`;

      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: destinationPath,
        CopySource: copySource,
      });

      const response = await this.client.send(command);

      return {
        data: {
          filePath: destinationPath,
          etag: response.CopyObjectResult?.ETag,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  async listBuckets(): Promise<StorageResult<ListBucketsResult>> {
    try {
      const command = new ListBucketsCommand({});
      const response = await this.client.send(command);

      return {
        data: {
          buckets: (response.Buckets || []).map((bucket) => ({
            name: bucket.Name || "",
            creationDate: bucket.CreationDate,
          })),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }

  setBucketName(bucketName: string): void {
    this.bucketName = bucketName;
  }
}
