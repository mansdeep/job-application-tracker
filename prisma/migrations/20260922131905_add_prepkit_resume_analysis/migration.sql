-- AlterTable
ALTER TABLE "PrepKit" ADD COLUMN     "resumeGaps" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "resumeAdditions" JSONB NOT NULL DEFAULT '[]';
