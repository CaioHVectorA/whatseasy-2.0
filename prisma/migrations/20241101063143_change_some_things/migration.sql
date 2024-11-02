/*
  Warnings:

  - You are about to drop the column `triggerId` on the `trigger_clusters` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_trigger_clusters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inside" BOOLEAN NOT NULL DEFAULT true,
    "clusterId" INTEGER NOT NULL,
    CONSTRAINT "trigger_clusters_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContactCluster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_trigger_clusters" ("clusterId", "id", "inside") SELECT "clusterId", "id", "inside" FROM "trigger_clusters";
DROP TABLE "trigger_clusters";
ALTER TABLE "new_trigger_clusters" RENAME TO "trigger_clusters";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
