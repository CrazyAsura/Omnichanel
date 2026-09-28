import { FileDetailsPage } from "@/components/files-page";

export default async function SuperAdminFileDetailsRoute({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = await params;
  let decoded = fileName;
  try {
    decoded = decodeURIComponent(fileName);
  } catch {
    decoded = fileName;
  }
  return <FileDetailsPage fileName={decoded} />;
}
