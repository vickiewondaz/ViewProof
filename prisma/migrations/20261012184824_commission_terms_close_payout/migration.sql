-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedPrice" DECIMAL(14,2),
ADD COLUMN     "introducedBy" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "payoutStatus" TEXT DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "commissionTerms" TEXT;
