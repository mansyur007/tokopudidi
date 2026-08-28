-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "PromoCode_categoryId_idx" ON "PromoCode"("categoryId");

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
