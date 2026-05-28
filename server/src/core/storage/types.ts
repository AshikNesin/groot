export type UploadOptions = {
  filePath: string;
  fileData: any; // Readable | Buffer | string
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
  contentDisposition?: string;
};

export type UploadResult = {
  filePath: string;
  etag?: string;
};

export type DownloadResult = {
  filePath: string;
  contentType?: string;
  contentLength?: number;
};

export type SignedUrlResult = {
  signedUrl: string;
  expiresIn: number;
};

export type FileExistsResult = {
  exists: boolean;
  size?: number;
  lastModified?: Date;
};

export type ListResult = {
  files: Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>;
  isTruncated: boolean;
  nextContinuationToken?: string;
};

export type ListBucketsResult = {
  buckets: Array<{
    name: string;
    creationDate?: Date;
  }>;
};

export type CopyOptions = {
  sourcePath: string;
  destinationPath: string;
  sourceBucket?: string;
};

export type DownloadOptions = {
  s3Path: string;
  localPath: string;
};

export type GetStringOptions = {
  s3Path: string;
  encoding?: BufferEncoding;
};

export type CreateSignedUrlOptions = {
  filePath: string;
  expiresIn?: number;
  operation?: "get" | "put";
};
