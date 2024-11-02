-- CreateTable
CREATE TABLE "response_trigger_relations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "responseId" INTEGER NOT NULL,
    "triggerId" INTEGER NOT NULL,
    CONSTRAINT "response_trigger_relations_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "response_trigger_relations_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_responses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "asMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggerId" INTEGER
);
INSERT INTO "new_responses" ("content", "createdAt", "id", "triggerId", "type") SELECT "content", "createdAt", "id", "triggerId", "type" FROM "responses";
DROP TABLE "responses";
ALTER TABLE "new_responses" RENAME TO "responses";
CREATE TABLE "new_triggers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL DEFAULT 'Gatilho',
    "order" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    CONSTRAINT "triggers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_triggers" ("active", "createdAt", "id", "order", "userId") SELECT "active", "createdAt", "id", "order", "userId" FROM "triggers";
DROP TABLE "triggers";
ALTER TABLE "new_triggers" RENAME TO "triggers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
