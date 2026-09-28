import { FileDetailsPage } from "@/components/files-page";

export default async function SuperAdminFileDetailsRoute({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = await params;
  return <FileDetailsPage fileName={fileName} />;
}
