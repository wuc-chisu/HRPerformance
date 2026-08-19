import CourseContentManagerPage from "@/components/training-content/CourseContentManagerPage";

export default async function TrainingProgramContentPage({
  params,
}: {
  params: Promise<{ trainingProgramId: string }>;
}) {
  const { trainingProgramId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <CourseContentManagerPage trainingProgramId={trainingProgramId} />
      </div>
    </main>
  );
}
