import TrainingCertificatePage from "@/components/training-content/TrainingCertificatePage";

export default async function TrainingCertificateRoutePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <TrainingCertificatePage certificateId={certificateId} />
      </div>
    </main>
  );
}
