import { EditUserPage } from "@/components/edit-user-page";

export default async function AdminEditUserSubRoute({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);
  return <EditUserPage userEmail={decodedEmail} />;
}
