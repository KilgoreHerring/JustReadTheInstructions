-- AlterTable
ALTER TABLE "HorizonItem" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "handbookNoticeNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "HorizonItem_handbookNoticeNumber_key" ON "HorizonItem"("handbookNoticeNumber");

-- CreateIndex
CREATE INDEX "HorizonItem_parentId_idx" ON "HorizonItem"("parentId");

-- AddForeignKey
ALTER TABLE "HorizonItem" ADD CONSTRAINT "HorizonItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "HorizonItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
