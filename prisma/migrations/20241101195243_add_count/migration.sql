/*
  Warnings:

  - You are about to drop the `reactives` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "reactives";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_triggers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL DEFAULT 'Gatilho',
    "order" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "count_used" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "triggers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_triggers" ("active", "createdAt", "id", "name", "order", "usageCount", "userId") SELECT "active", "createdAt", "id", "name", "order", "usageCount", "userId" FROM "triggers";
DROP TABLE "triggers";
ALTER TABLE "new_triggers" RENAME TO "triggers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
