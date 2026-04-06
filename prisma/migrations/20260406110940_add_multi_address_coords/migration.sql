-- AlterTable
ALTER TABLE "borrowers" ADD COLUMN     "registered_lat" DOUBLE PRECISION,
ADD COLUMN     "registered_lng" DOUBLE PRECISION,
ADD COLUMN     "residential_lat" DOUBLE PRECISION,
ADD COLUMN     "residential_lng" DOUBLE PRECISION,
ADD COLUMN     "work_address" TEXT,
ADD COLUMN     "work_lat" DOUBLE PRECISION,
ADD COLUMN     "work_lng" DOUBLE PRECISION;
