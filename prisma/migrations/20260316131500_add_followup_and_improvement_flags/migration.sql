-- AlterTable
ALTER TABLE "IncidentRecord"
ADD COLUMN "followUpEmailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "improvementPlanReceived" BOOLEAN NOT NULL DEFAULT false;
