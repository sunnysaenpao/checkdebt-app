-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_provider" TEXT,
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "provider_id" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
