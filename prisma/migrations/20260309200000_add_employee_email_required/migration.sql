-- Add required email column with safe default for existing rows
ALTER TABLE "Employee"
ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
