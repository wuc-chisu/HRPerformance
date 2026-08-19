import ModuleEditorPage from "@/components/training-content/ModuleEditorPage";

export default async function TrainingProgramContentNewModulePage({
  params,
}: {
  params: Promise<{ trainingProgramId: string }>;
}) {
  const { trainingProgramId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <ModuleEditorPage trainingProgramId={trainingProgramId} mode="create" />
      </div>
    </main>
  );
}
