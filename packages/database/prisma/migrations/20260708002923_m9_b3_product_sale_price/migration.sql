-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "saleEndAt" TIMESTAMP(3),
ADD COLUMN     "salePrice" INTEGER,
ADD COLUMN     "saleStartAt" TIMESTAMP(3);
