-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('cash', 'bank_transfer');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_type" "PaymentType" NOT NULL DEFAULT 'cash',
ADD COLUMN     "slip_image" TEXT;
