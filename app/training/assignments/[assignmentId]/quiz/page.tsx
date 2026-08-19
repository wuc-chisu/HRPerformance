import { notFound } from "next/navigation";

import EmployeeFinalQuizPage from "@/components/training-quiz/EmployeeFinalQuizPage";
import { getEmployeeTrainingCourseDetail } from "@/lib/trainingCourseDetail";

export default async function EmployeeTrainingAssignmentQuizPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const detail = await getEmployeeTrainingCourseDetail(assignmentId);

  if (!detail || !detail.trainingProgram.examRequired) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <EmployeeFinalQuizPage assignmentId={assignmentId} />
      </div>
    </main>
  );
}
