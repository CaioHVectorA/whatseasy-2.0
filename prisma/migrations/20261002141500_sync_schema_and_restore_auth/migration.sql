-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ContactCluster";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Step";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TextTrigger";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "trigger_clusters";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "contact_clusters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contact_clusters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact_cluster_relations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "contactId" INTEGER NOT NULL,
    "clusterId" INTEGER NOT NULL,
    CONSTRAINT "contact_cluster_relations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contact_cluster_relations_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "contact_clusters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "options" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_field_definitions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "steps" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "question" TEXT NOT NULL,
    "validations" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "formId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    CONSTRAINT "steps_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "text_triggers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "triggerId" INTEGER NOT NULL,
    CONSTRAINT "text_triggers_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactName" TEXT,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "automationType" TEXT,
    "automationId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "last_sync" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_conn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "qr" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("createdAt", "id", "isConnected", "last_conn", "last_sync", "qr", "updatedAt", "userId") SELECT "createdAt", "id", "isConnected", "last_conn", "last_sync", "qr", "updatedAt", "userId" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE UNIQUE INDEX "clients_id_key" ON "clients"("id");
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");
CREATE TABLE "new_contacts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customFields" TEXT DEFAULT '{}',
    "lastInteraction" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterId" INTEGER,
    CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contacts_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "contact_clusters" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_contacts" ("clusterId", "createdAt", "id", "name", "phone", "updatedAt", "userId") SELECT "clusterId", "createdAt", "id", "name", "phone", "updatedAt", "userId" FROM "contacts";
DROP TABLE "contacts";
ALTER TABLE "new_contacts" RENAME TO "contacts";
CREATE TABLE "new_response_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "responseId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "response_logs_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_response_logs" ("createdAt", "id", "responseId") SELECT "createdAt", "id", "responseId" FROM "response_logs";
DROP TABLE "response_logs";
ALTER TABLE "new_response_logs" RENAME TO "response_logs";
CREATE TABLE "new_responses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL DEFAULT 'TEXTO',
    "content" TEXT NOT NULL,
    "asMessage" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_responses" ("asMessage", "content", "createdAt", "id", "type") SELECT "asMessage", "content", "createdAt", "id", "type" FROM "responses";
DROP TABLE "responses";
ALTER TABLE "new_responses" RENAME TO "responses";
CREATE TABLE "new_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_schedules" ("createdAt", "id", "message", "phone", "time", "updatedAt", "userId") SELECT "createdAt", "id", "message", "phone", "time", "updatedAt", "userId" FROM "schedules";
DROP TABLE "schedules";
ALTER TABLE "new_schedules" RENAME TO "schedules";
CREATE TABLE "new_temporal_conditions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL DEFAULT 'SPECIFIC_TIME',
    "cron" TEXT,
    "inactivityDays" INTEGER,
    "targetTime" TEXT,
    "initial_date" DATETIME,
    "final_date" DATETIME,
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
    "included" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "trigger_cluster_relations_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "trigger_cluster_relations_triggerClusterId_fkey" FOREIGN KEY ("triggerClusterId") REFERENCES "contact_clusters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_trigger_cluster_relations" ("id", "included", "triggerClusterId", "triggerId") SELECT "id", "included", "triggerClusterId", "triggerId" FROM "trigger_cluster_relations";
DROP TABLE "trigger_cluster_relations";
ALTER TABLE "new_trigger_cluster_relations" RENAME TO "trigger_cluster_relations";
CREATE TABLE "new_trigger_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "triggerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trigger_logs_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "triggers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_trigger_logs" ("createdAt", "id", "triggerId") SELECT "createdAt", "id", "triggerId" FROM "trigger_logs";
DROP TABLE "trigger_logs";
ALTER TABLE "new_trigger_logs" RENAME TO "trigger_logs";
CREATE TABLE "new_triggers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL DEFAULT 'REACTIVE',
    "name" TEXT NOT NULL DEFAULT 'Automação',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "delaySeconds" INTEGER NOT NULL DEFAULT 0,
    "actionType" TEXT,
    "actionConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "triggers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_triggers" ("active", "createdAt", "id", "name", "order", "usageCount", "userId") SELECT "active", "createdAt", "id", "name", "order", "usageCount", "userId" FROM "triggers";
DROP TABLE "triggers";
ALTER TABLE "new_triggers" RENAME TO "triggers";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name") SELECT "createdAt", "email", "id", "name" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_id_key" ON "users"("id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "contact_cluster_relations_contactId_clusterId_key" ON "contact_cluster_relations"("contactId", "clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_userId_key_key" ON "custom_field_definitions"("userId", "key");

