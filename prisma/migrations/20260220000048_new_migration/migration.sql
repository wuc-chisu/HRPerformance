-- AlterTable
ALTER TABLE "WeeklyRecord" ADD COLUMN     "assignedTasksDetails" JSONB NOT NULL DEFAULT '[]';
