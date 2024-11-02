/*
  Warnings:

  - You are about to drop the column `triggerId` on the `responses` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TextTrigger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "triggerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "TextTrigger_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TextTrigger" ("id", "text", "triggerId", "type") SELECT "id", "text", "triggerId", "type" FROM "TextTrigger";
DROP TABLE "TextTrigger";
ALTER TABLE "new_TextTrigger" RENAME TO "TextTrigger";
CREATE TABLE "new_response_trigger_relations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "responseId" INTEGER NOT NULL,
    "triggerId" INTEGER NOT NULL,
    CONSTRAINT "response_trigger_relations_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "response_trigger_relations_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_response_trigger_relations" ("id", "responseId", "triggerId") SELECT "id", "responseId", "triggerId" FROM "response_trigger_relations";
DROP TABLE "response_trigger_relations";
ALTER TABLE "new_response_trigger_relations" RENAME TO "response_trigger_relations";
CREATE TABLE "new_responses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "asMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_responses" ("asMessage", "content", "createdAt", "id", "type") SELECT "asMessage", "content", "createdAt", "id", "type" FROM "responses";
DROP TABLE "responses";
ALTER TABLE "new_responses" RENAME TO "responses";
CREATE TABLE "new_temporal_conditions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "initial_date" DATETIME NOT NULL,
    "final_date" DATETIME NOT NULL,
    "triggerId" INTEGER NOT NULL,
    CONSTRAINT "temporal_conditions_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_temporal_conditions" ("final_date", "id", "initial_date", "triggerId") SELECT "final_date", "id", "initial_date", "triggerId" FROM "temporal_conditions";
DROP TABLE "temporal_conditions";
ALTER TABLE "new_temporal_conditions" RENAME TO "temporal_conditions";
CREATE UNIQUE INDEX "temporal_conditions_triggerId_key" ON "temporal_conditions"("triggerId");
CREATE TABLE "new_trigger_cluster_relations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "triggerId" INTEGER NOT NULL,
    "triggerClusterId" INTEGER NOT NULL,
    CONSTRAINT "trigger_cluster_relations_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trigger_cluster_relations_triggerClusterId_fkey" FOREIGN KEY ("triggerClusterId") REFERENCES "ContactCluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_trigger_cluster_relations" ("id", "triggerClusterId", "triggerId") SELECT "id", "triggerClusterId", "triggerId" FROM "trigger_cluster_relations";
DROP TABLE "trigger_cluster_relations";
ALTER TABLE "new_trigger_cluster_relations" RENAME TO "trigger_cluster_relations";
CREATE TABLE "new_trigger_clusters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inside" BOOLEAN NOT NULL DEFAULT true,
    "clusterId" INTEGER NOT NULL,
    CONSTRAINT "trigger_clusters_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContactCluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_trigger_clusters" ("clusterId", "id", "inside") SELECT "clusterId", "id", "inside" FROM "trigger_clusters";
DROP TABLE "trigger_clusters";
ALTER TABLE "new_trigger_clusters" RENAME TO "trigger_clusters";
CREATE TABLE "new_trigger_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "triggerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trigger_logs_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_trigger_logs" ("createdAt", "id", "triggerId") SELECT "createdAt", "id", "triggerId" FROM "trigger_logs";
DROP TABLE "trigger_logs";
ALTER TABLE "new_trigger_logs" RENAME TO "trigger_logs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
