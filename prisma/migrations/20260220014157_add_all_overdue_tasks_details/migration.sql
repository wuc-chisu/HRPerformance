-- AlterTable
ALTER TABLE "WeeklyRecord" ADD COLUMN     "allOverdueTasksDetails" JSONB NOT NULL DEFAULT '[]';
