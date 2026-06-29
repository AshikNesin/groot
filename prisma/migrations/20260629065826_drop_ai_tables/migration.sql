-- DropForeignKey
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_userId_fkey";

-- DropForeignKey
ALTER TABLE "ai_conversations" DROP CONSTRAINT "ai_conversations_userId_fkey";

-- DropTable
DROP TABLE "ai_usage";

-- DropTable
DROP TABLE "ai_conversations";
