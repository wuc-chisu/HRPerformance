-- AlterTable
ALTER TABLE "WeeklyRecord" ADD COLUMN     "overdueTasksDetails" JSONB NOT NULL DEFAULT '[]';
