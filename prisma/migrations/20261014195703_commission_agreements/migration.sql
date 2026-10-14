-- CreateTable
CREATE TABLE "CommissionAgreement" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "terms" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionAgreement_listingId_idx" ON "CommissionAgreement"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionAgreement_agentId_listingId_key" ON "CommissionAgreement"("agentId", "listingId");

-- AddForeignKey
ALTER TABLE "CommissionAgreement" ADD CONSTRAINT "CommissionAgreement_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
