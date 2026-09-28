import { AdminShell } from "@/components/admin-shell";
import { Providers } from "@/components/providers";

export default function FuncionarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AdminShell role="funcionario">{children}</AdminShell>
    </Providers>
  );
}
