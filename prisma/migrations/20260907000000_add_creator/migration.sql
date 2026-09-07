-- AlterTable
ALTER TABLE "QuizPack" ADD COLUMN "creatorId" TEXT;

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceKey" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "packsGeneratedInPeriod" INTEGER NOT NULL DEFAULT 0,
    "periodStartedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Creator_deviceKey_key" UNIQUE ("deviceKey")
);

-- CreateIndex
CREATE INDEX "QuizPack_creatorId_idx" ON "QuizPack"("creatorId");
