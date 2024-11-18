/*
  Warnings:

  - Added the required column `as` to the `temporal_conditions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_temporal_conditions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "initial_date" DATETIME,
    "final_date" DATETIME,
    "initial_time" TEXT,
    "final_time" TEXT,
    "triggerId" INTEGER NOT NULL,
    "as" TEXT NOT NULL,
    CONSTRAINT "temporal_conditions_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_temporal_conditions" ("final_date", "id", "initial_date", "triggerId") SELECT "final_date", "id", "initial_date", "triggerId" FROM "temporal_conditions";
DROP TABLE "temporal_conditions";
ALTER TABLE "new_temporal_conditions" RENAME TO "temporal_conditions";
CREATE UNIQUE INDEX "temporal_conditions_triggerId_key" ON "temporal_conditions"("triggerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
