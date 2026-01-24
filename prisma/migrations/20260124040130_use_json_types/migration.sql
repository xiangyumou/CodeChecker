/*
  Warnings:

  - The `imageReferences` column on the `requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `problemDetails` column on the `requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `analysisResult` column on the `requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `gptRawResponse` column on the `requests` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "requests" DROP COLUMN "imageReferences",
ADD COLUMN     "imageReferences" JSONB,
DROP COLUMN "problemDetails",
ADD COLUMN     "problemDetails" JSONB,
DROP COLUMN "analysisResult",
ADD COLUMN     "analysisResult" JSONB,
DROP COLUMN "gptRawResponse",
ADD COLUMN     "gptRawResponse" JSONB;
