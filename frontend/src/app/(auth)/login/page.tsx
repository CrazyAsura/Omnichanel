"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "motion/react";
import { Bot, LockKeyhole, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { useDispatch } from "react-redux";
import { Button, Input } from "@/components/ui";
import { setSession, type AppDispatch, type UserRole } from "@/lib/store";

const schema = z.object({
  email: z.string().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});
type FormValues = z.infer<typeof schema>;

const demoProfiles: {
  role: UserRole;
  name: string;
  email: string;
  badge: string;
  route: string;
  description: string;
  Icon: typeof ShieldCheck;
}[] = [
  {
    role: "super-admin",
    name: "Marina Costa",
    email: "marina.costa@exemplo.com",
    badge: "Super-admin",
    route: "/super-admin",
    description: "Acesso total: arquivos, logs, relatórios e usuários.",
    Icon: ShieldAlert,
  },
  {
    role: "admin",
    name: "Ricardo Mendes",
    email: "ricardo.mendes@exemplo.com",
    badge: "Admin",
    route: "/admin",
    description: "Gestão operacional e edição de usuários com justificativa.",
    Icon: ShieldCheck,
  },
  {
    role: "funcionario",
    name: "Lucas Almeida",
    email: "lucas.almeida@exemplo.com",
    badge: "Funcionário",
    route: "/funcionario/chat",
    description: "Acesso restrito exclusivamente ao chat interno.",
    Icon: Bot,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "marina.costa@exemplo.com",
      password: "••••••••••••",
    },
  });

  function selectProfile(profile: (typeof demoProfiles)[0]) {
    setValue("email", profile.email);
    setValue("password", "••••••••••••");
    dispatch(
      setSession({
        email: profile.email,
        name: profile.name,
        role: profile.role,
      })
    );
    router.push(profile.route);
  }

  async function onSubmit(values: FormValues) {
    const emailLower = values.email.toLowerCase();
    let targetRole: UserRole = "admin";
    let targetRoute = "/admin";

    if (emailLower.includes("super") || emailLower.includes("marina")) {
      targetRole = "super-admin";
      targetRoute = "/super-admin";
    } else if (
      emailLower.includes("func") ||
      emailLower.includes("lucas") ||
      emailLower.includes("colab")
    ) {
      targetRole = "funcionario";
      targetRoute = "/funcionario/chat";
    }

    dispatch(
      setSession({
        email: values.email,
        name: values.email.split("@")[0].replace(".", " "),
        role: targetRole,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    router.push(targetRoute);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
        className="w-full max-w-[460px]"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white shadow-sm">
            <LockKeyhole size={19} strokeWidth={1.7} />
          </div>
          <p className="text-xs font-medium uppercase tracking-[.18em] text-muted-foreground">
            Plataforma Omnicanal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Acesse sua conta</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Selecione um perfil de demonstração ou insira suas credenciais.
          </p>
        </div>

        {/* Demo Fast Profile Pickers */}
        <div className="mb-5 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Perfis de demonstração por cargo:
          </p>
          <div className="grid gap-2">
            {demoProfiles.map((profile) => (
              <button
                key={profile.role}
                type="button"
                onClick={() => selectProfile(profile)}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-3 text-left shadow-sm hover:border-neutral-400 hover:bg-stone-50/60 active:scale-[0.99] transition-all"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800">
                  <profile.Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {profile.name}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                      {profile.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                    {profile.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,.035)]"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="nome@empresa.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium">
                Senha
              </label>
              <Link
                href="/reset-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar com credenciais"}
            <span aria-hidden="true">→</span>
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © 2026 · Console de Gerenciamento Omnicanal
        </p>
      </motion.section>
    </main>
  );
}
