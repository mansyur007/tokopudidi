-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "preorderDays" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isPreorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preorderDays" INTEGER;
