-- AlterTable
ALTER TABLE "requests" ADD COLUMN "stage1CompletedAt" DATETIME;
ALTER TABLE "requests" ADD COLUMN "stage1Status" TEXT DEFAULT 'pending';
ALTER TABLE "requests" ADD COLUMN "stage2CompletedAt" DATETIME;
ALTER TABLE "requests" ADD COLUMN "stage2Status" TEXT DEFAULT 'pending';
ALTER TABLE "requests" ADD COLUMN "stage3CompletedAt" DATETIME;
ALTER TABLE "requests" ADD COLUMN "stage3Status" TEXT DEFAULT 'pending';
