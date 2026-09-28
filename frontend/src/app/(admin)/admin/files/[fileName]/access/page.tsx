import { FileAccessPage } from "@/components/files-page";

export default async function AdminFileAccessRoute({
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
  return <FileAccessPage fileName={decoded} />;
}
