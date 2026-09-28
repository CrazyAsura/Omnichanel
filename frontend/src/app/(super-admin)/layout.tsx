import { AdminShell } from "@/components/admin-shell";
import { Providers } from "@/components/providers";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminShell role="super-admin">{children}</AdminShell>
    </Providers>
  );
}
