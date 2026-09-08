CREATE TABLE IF NOT EXISTS "OnboardingStep2FormTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "googleDriveUrl" TEXT NOT NULL DEFAULT '',
  "displayOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "appliesTo" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "section" TEXT NOT NULL DEFAULT 'Staff forms',
  "detailText" TEXT,
  "allowNotApplicable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OnboardingStep2FormTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OnboardingStep2FormTemplate_title_key"
ON "OnboardingStep2FormTemplate"("title");

CREATE INDEX IF NOT EXISTS "OnboardingStep2FormTemplate_isActive_displayOrder_idx"
ON "OnboardingStep2FormTemplate"("isActive", "displayOrder");

ALTER TABLE "OnboardingStep2FormTemplate"
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

INSERT INTO "OnboardingStep2FormTemplate" ("id", "title", "displayOrder", "appliesTo", "section", "detailText", "allowNotApplicable")
VALUES
  ('step2_application_form', 'Application Form', 10, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_direct_deposit', 'Direct Deposit Form', 20, ARRAY['Employee', 'Faculty'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_self_identification', 'Self-Identification Form', 30, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_background_check', 'Background Check Form', 40, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_copyright', 'Copyright Releasing Authorization Form', 50, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_portrait_rights', 'Portrait Right Authorization Form', 60, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_drug_alcohol', 'Acknowledgement of Drug and Alcohol-Free Form', 70, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_emergency_contact', 'Emergency Contact Form', 80, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_faculty_handbook', 'Faculty Handbook Signature Form', 90, ARRAY['Faculty'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_w4', 'Form W-4', 100, ARRAY['Employee', 'Faculty'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_i9', 'Form I-9 (Work Authorization)', 110, ARRAY['Employee', 'Faculty'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_verification', 'Verification Form', 120, ARRAY['Employee', 'Faculty', 'Contractor'], 'Sub-step 1: Staff to fill out', NULL, false),
  ('step2_w2', 'Form W-2 (Employee)', 130, ARRAY['Employee', 'Faculty'], 'Sub-step 1: Staff to fill out', NULL, true),
  ('step2_w9', 'Form W-9 (Contractor)', 140, ARRAY['Contractor'], 'Sub-step 1: Staff to fill out', NULL, true)
ON CONFLICT ("title") DO NOTHING;