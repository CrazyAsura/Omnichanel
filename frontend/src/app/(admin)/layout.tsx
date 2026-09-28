import { AdminShell } from "@/components/admin-shell";
import { Providers } from "@/components/providers";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminShell role="admin">{children}</AdminShell>
    </Providers>
  );
} 
