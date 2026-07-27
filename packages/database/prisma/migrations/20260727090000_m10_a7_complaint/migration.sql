-- M10-A7: komplain / return setelah barang diterima.

CREATE TYPE "ComplaintType" AS ENUM ('BROKEN', 'NOT_AS_DESCRIBED', 'MISSING_ITEM', 'OTHER');
CREATE TYPE "ComplaintResolution" AS ENUM ('REFUND', 'REPLACEMENT');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'SELLER_RESPONDED', 'ESCALATED', 'RESOLVED', 'REJECTED');

CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "resolutionType" "ComplaintResolution" NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "sellerResponse" TEXT,
    "adminDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- Satu item pesanan hanya bisa dikomplain sekali; kelanjutannya lewat escalate.
CREATE UNIQUE INDEX "Complaint_orderItemId_key" ON "Complaint"("orderItemId");
CREATE INDEX "Complaint_buyerId_status_idx" ON "Complaint"("buyerId", "status");
CREATE INDEX "Complaint_status_createdAt_idx" ON "Complaint"("status", "createdAt");
CREATE INDEX "Complaint_orderId_idx" ON "Complaint"("orderId");

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
