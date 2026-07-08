-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "shopId" TEXT;

-- CreateIndex
CREATE INDEX "PromoCode_shopId_isActive_idx" ON "PromoCode"("shopId", "isActive");

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
