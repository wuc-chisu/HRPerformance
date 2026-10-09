-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT NOT NULL DEFAULT 'Employee';

-- AlterTable
ALTER TABLE "OnboardingStep2FormTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "appliesToLocation" SET DEFAULT ARRAY[]::TEXT[];
