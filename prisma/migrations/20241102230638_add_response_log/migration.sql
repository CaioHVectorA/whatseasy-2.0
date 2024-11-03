-- CreateTable
CREATE TABLE "response_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "responseId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "response_logs_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses" ("id") ON DELETE NO ACTION ON UPDATE CASCADE
);
