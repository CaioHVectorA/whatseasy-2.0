-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_trigger_cluster_relations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "triggerId" INTEGER NOT NULL,
    "triggerClusterId" INTEGER NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "trigger_cluster_relations_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trigger_cluster_relations_triggerClusterId_fkey" FOREIGN KEY ("triggerClusterId") REFERENCES "ContactCluster" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_trigger_cluster_relations" ("id", "triggerClusterId", "triggerId") SELECT "id", "triggerClusterId", "triggerId" FROM "trigger_cluster_relations";
DROP TABLE "trigger_cluster_relations";
ALTER TABLE "new_trigger_cluster_relations" RENAME TO "trigger_cluster_relations";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
