/*
  Warnings:

  - Added the required column `updatedAt` to the `ContactCluster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ContactCluster` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContactCluster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContactCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ContactCluster" ("id", "name") SELECT "id", "name" FROM "ContactCluster";
DROP TABLE "ContactCluster";
ALTER TABLE "new_ContactCluster" RENAME TO "ContactCluster";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
