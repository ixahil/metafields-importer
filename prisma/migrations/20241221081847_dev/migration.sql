-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_imports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Running'
);
INSERT INTO "new_imports" ("count", "date", "id", "opId") SELECT "count", "date", "id", "opId" FROM "imports";
DROP TABLE "imports";
ALTER TABLE "new_imports" RENAME TO "imports";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
