export interface StorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isDirectory: boolean;
}

export interface PublicShare {
  id: number;
  shareId: string;
  bucketName: string;
  filePath: string;
  fileName: string;
  contentType: string | null;
  fileSize: number | null;
  expiresAt: string;
  accessCount: number;
  maxAccessCount: number | null;
  isPasswordProtected: boolean;
  createdAt: string;
  isExpired: boolean;
  isAccessLimitReached: boolean;
}
