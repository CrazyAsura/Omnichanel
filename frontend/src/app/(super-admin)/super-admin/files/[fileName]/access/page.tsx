import { FileAccessPage } from "@/components/files-page";

export default async function SuperAdminFileAccessRoute({
  params,
}: {
  params: Promise<{ fileName: string }>;
}) {
  const { fileName } = await params;
  return <FileAccessPage fileName={fileName} />;
}
