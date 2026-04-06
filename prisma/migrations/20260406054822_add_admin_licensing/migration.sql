-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('trial', 'active', 'expired', 'suspended');

-- CreateEnum
CREATE TYPE "LicensePlan" AS ENUM ('monthly', 'quarterly', 'semiannual', 'yearly');

-- AlterTable
ALTER TABLE "lenders" ADD COLUMN     "license_expires" TIMESTAMP(3),
ADD COLUMN     "license_status" "LicenseStatus" NOT NULL DEFAULT 'trial',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan" "LicensePlan" NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "lender_id" TEXT NOT NULL,
    "plan" "LicensePlan" NOT NULL,
    "license_code" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "license_codes_code_key" ON "license_codes"("code");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_lender_id_fkey" FOREIGN KEY ("lender_id") REFERENCES "lenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
