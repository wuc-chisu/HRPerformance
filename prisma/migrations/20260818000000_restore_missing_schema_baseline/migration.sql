-- Restore schema additions previously applied with db push but omitted from migration history.
-- Run before the August training migrations. Existing rows are preserved.

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingCategory" AS ENUM ('WUC_REQUIRED_TRAINING', 'CALIFORNIA_REQUIRED_TRAINING', 'ACCREDITATION_COMPLIANCE_TRAINING', 'FACULTY_TRAINING', 'CLINIC_SAFETY_TRAINING', 'PROFESSIONAL_DEVELOPMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingRequirementType" AS ENUM ('REQUIRED', 'OPTIONAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingAudience" AS ENUM ('ALL_EMPLOYEES', 'EMPLOYEES', 'MANAGERS', 'HR_ADMINS', 'EXECUTIVES', 'CALIFORNIA_NON_SUPERVISORY_EMPLOYEES', 'CALIFORNIA_SUPERVISORS_MANAGERS', 'APPLICABLE_CALIFORNIA_EMPLOYEES', 'FACULTY', 'EDUCATIONAL_ADMINISTRATORS', 'CLINIC_PERSONNEL', 'EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE', 'ONLINE_HYBRID_FACULTY', 'DISTANCE_EDUCATION_ADMINISTRATORS', 'LICENSED_ACUPUNCTURISTS', 'CUSTOM_GROUP');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingRecurrence" AS ENUM ('ONE_TIME', 'ANNUAL', 'EVERY_2_YEARS', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingIntervalUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingMethod" AS ENUM ('WUC_INTERNAL_COURSE', 'EXTERNAL_TRAINING', 'CERTIFICATE_RECORD_TRACKING', 'PROFESSIONAL_DEVELOPMENT_RECORD');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingCompletionMethod" AS ENUM ('EXAM_SCORE', 'CERTIFICATE', 'HOURS_EVIDENCE_REQUIREMENT', 'HOURS_CE_REQUIREMENT', 'HR_VERIFICATION');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingModuleType" AS ENUM ('VIDEO', 'READING', 'DOCUMENT', 'EXTERNAL_LINK', 'QUIZ', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingModuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingCycleStatus" AS ENUM ('CURRENT', 'UPCOMING', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingAssignmentStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'WAIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingModuleProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingQuizQuestionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingQuizChoice" AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingQuizAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- CreateEnum
CREATE TYPE "TrainingCertificateStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

-- AlterEnum
ALTER TYPE "IncidentFinalAction" ADD VALUE IF NOT EXISTS 'SALARY_CUT';

-- DropIndex
DROP INDEX IF EXISTS "Holiday_name_date_key";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "monthlySalaryAfterProbation" DOUBLE PRECISION DEFAULT 1400,
ADD COLUMN IF NOT EXISTS "monthlySalaryDuringProbation" DOUBLE PRECISION DEFAULT 1300,
ADD COLUMN IF NOT EXISTS "officeSchedule" JSONB,
ADD COLUMN IF NOT EXISTS "onboardingStep3Forms" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "onboardingStep4Forms" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "personalEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "preboardingSteps" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "probationPeriodEndDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "probationPeriodStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "professionalDevelopmentRecords" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "staffWorkLocation" TEXT NOT NULL DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS "systemRole" TEXT NOT NULL DEFAULT 'Employee';

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "workLocation" TEXT NOT NULL DEFAULT 'USA';

-- AlterTable
ALTER TABLE "IncidentRecord" ADD COLUMN IF NOT EXISTS "pipAdjustmentAgreementSent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "OffboardingRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "separationType" TEXT NOT NULL DEFAULT 'Resignation',
    "leaveType" TEXT NOT NULL DEFAULT 'Active working notice',
    "noticeDate" TIMESTAMP(3),
    "lastWorkingDate" TIMESTAMP(3),
    "hrResponsible" TEXT NOT NULL DEFAULT '',
    "itResponsible" TEXT NOT NULL DEFAULT '',
    "step1" JSONB NOT NULL DEFAULT '{}',
    "step2" JSONB NOT NULL DEFAULT '{}',
    "step3" JSONB NOT NULL DEFAULT '{}',
    "step4" JSONB NOT NULL DEFAULT '{}',
    "step5" JSONB NOT NULL DEFAULT '{}',
    "step6" JSONB NOT NULL DEFAULT '{}',
    "step7" JSONB NOT NULL DEFAULT '{}',
    "step8" JSONB NOT NULL DEFAULT '{}',
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingProgram" (
    "id" TEXT NOT NULL,
    "programCode" TEXT,
    "trainingName" TEXT NOT NULL,
    "description" TEXT,
    "category" "TrainingCategory" NOT NULL,
    "requirementType" "TrainingRequirementType" NOT NULL DEFAULT 'REQUIRED',
    "appliesTo" "TrainingAudience"[],
    "customGroupName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "recurrence" "TrainingRecurrence" NOT NULL,
    "recurrenceIntervalValue" INTEGER,
    "recurrenceIntervalUnit" "TrainingIntervalUnit",
    "nextCycleDate" TIMESTAMP(3),
    "trainingMethod" "TrainingMethod" NOT NULL,
    "completionMethod" "TrainingCompletionMethod" NOT NULL,
    "examRequired" BOOLEAN NOT NULL DEFAULT false,
    "passingScore" DOUBLE PRECISION,
    "certificateRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "TrainingProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingCycle" (
    "id" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "cycleStartDate" TIMESTAMP(3) NOT NULL,
    "cycleDueDate" TIMESTAMP(3) NOT NULL,
    "status" "TrainingCycleStatus" NOT NULL DEFAULT 'CURRENT',
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "windowDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeTrainingAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "trainingCycleId" TEXT NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "TrainingAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "completionDate" TIMESTAMP(3),
    "examScore" DOUBLE PRECISION,
    "certificateReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTrainingAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingCompletionRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "trainingCycleId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "examScore" DOUBLE PRECISION,
    "certificateReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCompletionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingCertificate" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNameSnapshot" TEXT NOT NULL,
    "employeeCodeSnapshot" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "trainingProgramNameSnapshot" TEXT NOT NULL,
    "trainingProgramCodeSnapshot" TEXT,
    "trainingCycleId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "completionRecordId" TEXT,
    "finalQuizAttemptId" TEXT,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "finalScore" DOUBLE PRECISION,
    "requiredPassingScore" DOUBLE PRECISION,
    "status" "TrainingCertificateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingProgramModule" (
    "id" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "moduleType" "TrainingModuleType" NOT NULL DEFAULT 'VIDEO',
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "TrainingModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "contentReference" TEXT,
    "contentStorageKey" TEXT,
    "contentFileName" TEXT,
    "contentMimeType" TEXT,
    "contentSizeBytes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgramModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeTrainingModuleProgress" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "trainingProgramModuleId" TEXT NOT NULL,
    "status" "TrainingModuleProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTrainingModuleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TrainingProgramQuizQuestion" (
    "id" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "status" "TrainingQuizQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "answerA" TEXT NOT NULL,
    "answerB" TEXT NOT NULL,
    "answerC" TEXT NOT NULL,
    "answerD" TEXT NOT NULL,
    "correctAnswer" "TrainingQuizChoice" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgramQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeTrainingQuizAttempt" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "trainingProgramId" TEXT NOT NULL,
    "trainingCycleId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "TrainingQuizAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "scorePercent" DOUBLE PRECISION,
    "passingScoreUsed" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTrainingQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EmployeeTrainingQuizAnswer" (
    "id" TEXT NOT NULL,
    "quizAttemptId" TEXT NOT NULL,
    "trainingProgramQuizQuestionId" TEXT NOT NULL,
    "selectedAnswer" "TrainingQuizChoice" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTrainingQuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OffboardingRecord_employeeId_key" ON "OffboardingRecord"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OffboardingRecord_updatedAt_idx" ON "OffboardingRecord"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingProgram_programCode_key" ON "TrainingProgram"("programCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingProgram_category_idx" ON "TrainingProgram"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingProgram_requirementType_idx" ON "TrainingProgram"("requirementType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingProgram_status_idx" ON "TrainingProgram"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingCycle_trainingProgramId_status_idx" ON "TrainingCycle"("trainingProgramId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCycle_trainingProgramId_cycleStartDate_key" ON "TrainingCycle"("trainingProgramId", "cycleStartDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingAssignment_employeeId_dueDate_idx" ON "EmployeeTrainingAssignment"("employeeId", "dueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingAssignment_status_idx" ON "EmployeeTrainingAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeTrainingAssignment_employeeId_trainingProgramId_tra_key" ON "EmployeeTrainingAssignment"("employeeId", "trainingProgramId", "trainingCycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingCompletionRecord_employeeId_completedAt_idx" ON "TrainingCompletionRecord"("employeeId", "completedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingCompletionRecord_trainingProgramId_completedAt_idx" ON "TrainingCompletionRecord"("trainingProgramId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_certificateId_key" ON "TrainingCertificate"("certificateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingCertificate_employeeId_completionDate_idx" ON "TrainingCertificate"("employeeId", "completionDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingCertificate_assignmentId_idx" ON "TrainingCertificate"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_employeeId_assignmentId_trainingCycleId_key" ON "TrainingCertificate"("employeeId", "assignmentId", "trainingCycleId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingProgramModule_trainingProgramId_status_displayOrder_idx" ON "TrainingProgramModule"("trainingProgramId", "status", "displayOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingModuleProgress_employeeId_status_idx" ON "EmployeeTrainingModuleProgress"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeTrainingModuleProgress_assignmentId_trainingProgram_key" ON "EmployeeTrainingModuleProgress"("assignmentId", "trainingProgramModuleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingProgramQuizQuestion_trainingProgramId_status_displa_idx" ON "TrainingProgramQuizQuestion"("trainingProgramId", "status", "displayOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingQuizAttempt_employeeId_trainingProgramId_cr_idx" ON "EmployeeTrainingQuizAttempt"("employeeId", "trainingProgramId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingQuizAttempt_assignmentId_createdAt_idx" ON "EmployeeTrainingQuizAttempt"("assignmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeTrainingQuizAttempt_assignmentId_attemptNumber_key" ON "EmployeeTrainingQuizAttempt"("assignmentId", "attemptNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingQuizAnswer_quizAttemptId_idx" ON "EmployeeTrainingQuizAnswer"("quizAttemptId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EmployeeTrainingQuizAnswer_trainingProgramQuizQuestionId_idx" ON "EmployeeTrainingQuizAnswer"("trainingProgramQuizQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Holiday_name_date_workLocation_key" ON "Holiday"("name", "date", "workLocation");

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "OffboardingRecord" ADD CONSTRAINT "OffboardingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCycle" ADD CONSTRAINT "TrainingCycle_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingAssignment" ADD CONSTRAINT "EmployeeTrainingAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingAssignment" ADD CONSTRAINT "EmployeeTrainingAssignment_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingAssignment" ADD CONSTRAINT "EmployeeTrainingAssignment_trainingCycleId_fkey" FOREIGN KEY ("trainingCycleId") REFERENCES "TrainingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCompletionRecord" ADD CONSTRAINT "TrainingCompletionRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCompletionRecord" ADD CONSTRAINT "TrainingCompletionRecord_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCompletionRecord" ADD CONSTRAINT "TrainingCompletionRecord_trainingCycleId_fkey" FOREIGN KEY ("trainingCycleId") REFERENCES "TrainingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCompletionRecord" ADD CONSTRAINT "TrainingCompletionRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EmployeeTrainingAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_trainingCycleId_fkey" FOREIGN KEY ("trainingCycleId") REFERENCES "TrainingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EmployeeTrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_completionRecordId_fkey" FOREIGN KEY ("completionRecordId") REFERENCES "TrainingCompletionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_finalQuizAttemptId_fkey" FOREIGN KEY ("finalQuizAttemptId") REFERENCES "EmployeeTrainingQuizAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingProgramModule" ADD CONSTRAINT "TrainingProgramModule_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingModuleProgress" ADD CONSTRAINT "EmployeeTrainingModuleProgress_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingModuleProgress" ADD CONSTRAINT "EmployeeTrainingModuleProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EmployeeTrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingModuleProgress" ADD CONSTRAINT "EmployeeTrainingModuleProgress_trainingProgramModuleId_fkey" FOREIGN KEY ("trainingProgramModuleId") REFERENCES "TrainingProgramModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "TrainingProgramQuizQuestion" ADD CONSTRAINT "TrainingProgramQuizQuestion_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingQuizAttempt" ADD CONSTRAINT "EmployeeTrainingQuizAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingQuizAttempt" ADD CONSTRAINT "EmployeeTrainingQuizAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EmployeeTrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingQuizAttempt" ADD CONSTRAINT "EmployeeTrainingQuizAttempt_trainingProgramId_fkey" FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingQuizAnswer" ADD CONSTRAINT "EmployeeTrainingQuizAnswer_quizAttemptId_fkey" FOREIGN KEY ("quizAttemptId") REFERENCES "EmployeeTrainingQuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
-- AddForeignKey
ALTER TABLE "EmployeeTrainingQuizAnswer" ADD CONSTRAINT "EmployeeTrainingQuizAnswer_trainingProgramQuizQuestionId_fkey" FOREIGN KEY ("trainingProgramQuizQuestionId") REFERENCES "TrainingProgramQuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
