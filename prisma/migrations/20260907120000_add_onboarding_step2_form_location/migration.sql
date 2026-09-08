ALTER TABLE "OnboardingStep2FormTemplate"
ADD COLUMN IF NOT EXISTS "appliesToLocation" TEXT[] NOT NULL DEFAULT ARRAY['US', 'Taiwan']::TEXT[];

-- Backfill any existing rows that predate this column so they remain visible to both locations.
UPDATE "OnboardingStep2FormTemplate"
SET "appliesToLocation" = ARRAY['US', 'Taiwan']::TEXT[]
WHERE cardinality("appliesToLocation") = 0;
