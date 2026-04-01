-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskCompletionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'OVERDUE');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "contractWorkHours" INTEGER,
ADD COLUMN     "employeeType" TEXT NOT NULL DEFAULT 'Full time',
ADD COLUMN     "onboardingChecklistAssigned" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingStep1Notes" TEXT,
ADD COLUMN     "onboardingStep1UpdatedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep1UpdatedBy" TEXT NOT NULL DEFAULT 'System',
ADD COLUMN     "onboardingStep2Completed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingStep2CompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep2Forms" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "onboardingStep3Completed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingStep3CompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep4Completed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingStep4CompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep5Completed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onboardingStep5CompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep6AnnualTracking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep6LastReviewAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep6StartedAt" TIMESTAMP(3),
ADD COLUMN     "systemAccessClickup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "systemAccessGmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "systemAccessGoogleDrive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "systemAccessMoodle" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "completionStatus" "TaskCompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "evaluatorName" TEXT NOT NULL,
    "evaluationScore" DOUBLE PRECISION NOT NULL,
    "taskCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overdueTaskCount" INTEGER NOT NULL DEFAULT 0,
    "strengths" TEXT,
    "improvementAreas" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_employeeId_idx" ON "Task"("employeeId");

-- CreateIndex
CREATE INDEX "Task_employeeId_completionStatus_idx" ON "Task"("employeeId", "completionStatus");

-- CreateIndex
CREATE INDEX "Task_employeeId_priority_idx" ON "Task"("employeeId", "priority");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Evaluation_employeeId_idx" ON "Evaluation"("employeeId");

-- CreateIndex
CREATE INDEX "Evaluation_employeeId_periodStart_periodEnd_idx" ON "Evaluation"("employeeId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Evaluation_evaluationScore_idx" ON "Evaluation"("evaluationScore");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
