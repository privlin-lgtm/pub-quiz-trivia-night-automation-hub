/*
  Warnings:

  - Added the required column `hostToken` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentRoundIndex" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_packId_fkey" FOREIGN KEY ("packId") REFERENCES "QuizPack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("code", "createdAt", "currentQuestionIndex", "currentRoundIndex", "id", "packId", "status") SELECT "code", "createdAt", "currentQuestionIndex", "currentRoundIndex", "id", "packId", "status" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");
CREATE UNIQUE INDEX "Session_hostToken_key" ON "Session"("hostToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
