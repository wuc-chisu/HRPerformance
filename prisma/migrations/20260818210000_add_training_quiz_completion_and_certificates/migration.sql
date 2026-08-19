DO $$
BEGIN
    CREATE TYPE "TrainingCertificateStatus" AS ENUM ('ACTIVE', 'REVOKED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "EmployeeTrainingQuizAttempt"
ADD COLUMN IF NOT EXISTS "trainingCycleId" TEXT,
ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "passingScoreUsed" DOUBLE PRECISION;

UPDATE "EmployeeTrainingQuizAttempt" AS attempt
SET
  "trainingCycleId" = assignment."trainingCycleId",
  "attemptNumber" = source."attempt_number",
  "passingScoreUsed" = COALESCE(attempt."passingScoreUsed", program."passingScore")
FROM "EmployeeTrainingAssignment" AS assignment
JOIN "TrainingProgram" AS program ON program.id = assignment."trainingProgramId"
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "assignmentId" ORDER BY "createdAt" ASC, id ASC) AS attempt_number
  FROM "EmployeeTrainingQuizAttempt"
) AS source ON source.id = attempt.id
WHERE assignment.id = attempt."assignmentId"
  AND (attempt."trainingCycleId" IS NULL OR attempt."attemptNumber" IS NULL OR attempt."passingScoreUsed" IS NULL);

ALTER TABLE "EmployeeTrainingQuizAttempt"
ALTER COLUMN "trainingCycleId" SET NOT NULL,
ALTER COLUMN "attemptNumber" SET NOT NULL;

ALTER TABLE "EmployeeTrainingQuizAttempt"
ADD CONSTRAINT "EmployeeTrainingQuizAttempt_trainingCycleId_fkey"
FOREIGN KEY ("trainingCycleId") REFERENCES "TrainingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeTrainingQuizAttempt_assignmentId_attemptNumber_key"
ON "EmployeeTrainingQuizAttempt"("assignmentId", "attemptNumber");

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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_certificateId_key"
ON "TrainingCertificate"("certificateId");

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingCertificate_employee_assignment_cycle_status_key"
ON "TrainingCertificate"("employeeId", "assignmentId", "trainingCycleId", "status");

CREATE INDEX IF NOT EXISTS "TrainingCertificate_employeeId_completionDate_idx"
ON "TrainingCertificate"("employeeId", "completionDate");

CREATE INDEX IF NOT EXISTS "TrainingCertificate_assignmentId_idx"
ON "TrainingCertificate"("assignmentId");

DO $$
BEGIN
    ALTER TABLE "TrainingCertificate"
    ADD CONSTRAINT "TrainingCertificate_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "TrainingCertificate"
    ADD CONSTRAINT "TrainingCertificate_trainingProgramId_fkey"
    FOREIGN KEY ("trainingProgramId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "TrainingCertificate"
    ADD CONSTRAINT "TrainingCertificate_trainingCycleId_fkey"
    FOREIGN KEY ("trainingCycleId") REFERENCES "TrainingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "TrainingCertificate"
    ADD CONSTRAINT "TrainingCertificate_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "EmployeeTrainingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "TrainingCertificate"
    ADD CONSTRAINT "TrainingCertificate_completionRecordId_fkey"
    FOREIGN KEY ("completionRecordId") REFERENCES "TrainingCompletionRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE "TrainingCertificate"
    ADD CONSTRAINT "TrainingCertificate_finalQuizAttemptId_fkey"
    FOREIGN KEY ("finalQuizAttemptId") REFERENCES "EmployeeTrainingQuizAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
