-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR NOT NULL,
    "password" VARCHAR NOT NULL,
    "name" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceType" VARCHAR,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "transports" VARCHAR[],
    "credentialName" VARCHAR,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicFileShare" (
    "id" SERIAL NOT NULL,
    "shareId" VARCHAR NOT NULL,
    "bucketName" VARCHAR NOT NULL,
    "filePath" VARCHAR NOT NULL,
    "fileName" VARCHAR NOT NULL,
    "contentType" VARCHAR,
    "fileSize" INTEGER,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "maxAccessCount" INTEGER,
    "passwordHash" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PublicFileShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyv" (
    "key" VARCHAR NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "keyv_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" SERIAL NOT NULL,
    "jobId" VARCHAR NOT NULL,
    "jobName" VARCHAR,
    "level" VARCHAR NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSON,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "provider" VARCHAR NOT NULL,
    "model" VARCHAR NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalCost" DECIMAL(10,6) NOT NULL,
    "stopReason" VARCHAR NOT NULL,
    "requestId" VARCHAR NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "title" VARCHAR,
    "context" JSONB NOT NULL,
    "lastModel" VARCHAR NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialId_key" ON "Passkey"("credentialId");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "Passkey_credentialId_idx" ON "Passkey"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicFileShare_shareId_key" ON "PublicFileShare"("shareId");

-- CreateIndex
CREATE INDEX "public_file_share_share_id" ON "PublicFileShare"("shareId");

-- CreateIndex
CREATE INDEX "public_file_share_expires_at" ON "PublicFileShare"("expiresAt");

-- CreateIndex
CREATE INDEX "public_file_share_bucket_name" ON "PublicFileShare"("bucketName");

-- CreateIndex
CREATE INDEX "job_logs_jobId_idx" ON "job_logs"("jobId");

-- CreateIndex
CREATE INDEX "job_logs_timestamp_idx" ON "job_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_requestId_key" ON "ai_usage"("requestId");

-- CreateIndex
CREATE INDEX "ai_usage_userId_idx" ON "ai_usage"("userId");

-- CreateIndex
CREATE INDEX "ai_usage_provider_model_idx" ON "ai_usage"("provider", "model");

-- CreateIndex
CREATE INDEX "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_updatedAt_idx" ON "ai_conversations"("updatedAt");

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
