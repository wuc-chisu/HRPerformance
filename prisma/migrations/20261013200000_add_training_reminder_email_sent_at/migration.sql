ALTER TABLE "TrainingProgram"
ADD COLUMN "reminderEmailSentAt" TIMESTAMP(3);

ALTER TABLE "EmployeeTrainingAssignment"
ADD COLUMN "reminderEmailSentAt" TIMESTAMP(3);
