-- CreateTable
CREATE TABLE "trigger_cluster_relations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "triggerId" INTEGER NOT NULL,
    "triggerClusterId" INTEGER NOT NULL,
    CONSTRAINT "trigger_cluster_relations_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trigger_cluster_relations_triggerClusterId_fkey" FOREIGN KEY ("triggerClusterId") REFERENCES "ContactCluster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
