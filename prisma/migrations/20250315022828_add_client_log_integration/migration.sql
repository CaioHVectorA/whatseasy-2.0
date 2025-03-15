/*
  Warnings:

  - Added the required column `type` to the `client_connections` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_client_connections" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "client_connections_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_client_connections" ("clientId", "createdAt", "id", "updatedAt") SELECT "clientId", "createdAt", "id", "updatedAt" FROM "client_connections";
DROP TABLE "client_connections";
ALTER TABLE "new_client_connections" RENAME TO "client_connections";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
