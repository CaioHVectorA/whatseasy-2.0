/*
  Warnings:

  - You are about to drop the column `isConnected` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_connection` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `last_sync` on the `users` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "last_sync" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_conn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "qr" TEXT NOT NULL,
    CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Step" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "validations" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "formId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    CONSTRAINT "Step_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "forms" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "forms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "triggers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    CONSTRAINT "triggers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TextTrigger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "triggerId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "TextTrigger_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "responses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "triggerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "responses_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "temporal_conditions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "description" TEXT NOT NULL,
    "initial_date" DATETIME NOT NULL,
    "final_date" DATETIME NOT NULL,
    "triggerId" INTEGER NOT NULL,
    CONSTRAINT "temporal_conditions_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trigger_clusters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "triggerId" INTEGER NOT NULL,
    "inside" BOOLEAN NOT NULL DEFAULT true,
    "clusterId" INTEGER NOT NULL,
    CONSTRAINT "trigger_clusters_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "trigger_clusters_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContactCluster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" INTEGER
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "password") SELECT "createdAt", "email", "id", "name", "password" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_key" ON "Client"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "temporal_conditions_triggerId_key" ON "temporal_conditions"("triggerId");
