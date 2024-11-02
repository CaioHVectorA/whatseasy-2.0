/*
  Warnings:

  - You are about to drop the column `description` on the `temporal_conditions` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_temporal_conditions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "initial_date" DATETIME NOT NULL,
    "final_date" DATETIME NOT NULL,
    "triggerId" INTEGER NOT NULL,
    CONSTRAINT "temporal_conditions_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_temporal_conditions" ("final_date", "id", "initial_date", "triggerId") SELECT "final_date", "id", "initial_date", "triggerId" FROM "temporal_conditions";
DROP TABLE "temporal_conditions";
ALTER TABLE "new_temporal_conditions" RENAME TO "temporal_conditions";
CREATE UNIQUE INDEX "temporal_conditions_triggerId_key" ON "temporal_conditions"("triggerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
