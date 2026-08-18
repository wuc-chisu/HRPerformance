DO $$
BEGIN
    CREATE TYPE "TrainingCompletionMethod" AS ENUM (
        'EXAM_SCORE',
        'CERTIFICATE',
        'HOURS_EVIDENCE_REQUIREMENT',
        'HOURS_CE_REQUIREMENT',
        'HR_VERIFICATION'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

ALTER TYPE "TrainingAudience" ADD VALUE IF NOT EXISTS 'CALIFORNIA_NON_SUPERVISORY_EMPLOYEES';
ALTER TYPE "TrainingAudience" ADD VALUE IF NOT EXISTS 'CALIFORNIA_SUPERVISORS_MANAGERS';
ALTER TYPE "TrainingAudience" ADD VALUE IF NOT EXISTS 'APPLICABLE_CALIFORNIA_EMPLOYEES';
ALTER TYPE "TrainingAudience" ADD VALUE IF NOT EXISTS 'EDUCATIONAL_ADMINISTRATORS';
ALTER TYPE "TrainingAudience" ADD VALUE IF NOT EXISTS 'EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE';
ALTER TYPE "TrainingAudience" ADD VALUE IF NOT EXISTS 'DISTANCE_EDUCATION_ADMINISTRATORS';

ALTER TABLE "TrainingProgram"
ADD COLUMN IF NOT EXISTS "programCode" TEXT,
ADD COLUMN IF NOT EXISTS "completionMethod" "TrainingCompletionMethod";

UPDATE "TrainingProgram"
SET "completionMethod" = CASE
    WHEN "completionMethod" IS NOT NULL THEN "completionMethod"
    WHEN "examRequired" = true THEN 'EXAM_SCORE'::"TrainingCompletionMethod"
    WHEN "trainingMethod" = 'EXTERNAL_TRAINING' THEN 'CERTIFICATE'::"TrainingCompletionMethod"
    WHEN "trainingMethod" = 'PROFESSIONAL_DEVELOPMENT_RECORD' THEN 'HOURS_EVIDENCE_REQUIREMENT'::"TrainingCompletionMethod"
    WHEN "trainingMethod" = 'CERTIFICATE_RECORD_TRACKING' THEN 'HOURS_CE_REQUIREMENT'::"TrainingCompletionMethod"
    ELSE 'HR_VERIFICATION'::"TrainingCompletionMethod"
END;

ALTER TABLE "TrainingProgram"
ALTER COLUMN "completionMethod" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingProgram_programCode_key" ON "TrainingProgram"("programCode");
