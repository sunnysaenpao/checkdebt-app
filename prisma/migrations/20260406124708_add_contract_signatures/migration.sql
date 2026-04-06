-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "sig_borrower" TEXT,
ADD COLUMN     "sig_lender" TEXT,
ADD COLUMN     "sig_witness1" TEXT,
ADD COLUMN     "sig_witness2" TEXT,
ADD COLUMN     "witness1_name" TEXT,
ADD COLUMN     "witness2_name" TEXT;
