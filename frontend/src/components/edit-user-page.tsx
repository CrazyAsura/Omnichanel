"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Check,
  Clock3,
  FileCheck2,
  History,
  Info,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { AccessRestricted } from "@/components/access-restricted";
import { Avatar, Button, Card, Input, PageHeading, Skeleton, Status } from "@/components/ui";
import { mockApi } from "@/lib/api";
import type { Person } from "@/lib/mock-data";

const managedUsersStorageKey = "omnichanel-managed-users";
const auditLogStorageKey = "omnichanel-user-edits-log";

type UserAuditEntry = {
  id: string;
  userName: string;
  userEmail: string;
  previousRole: string;
  newRole: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  editedAt: string;
  editedBy: string;
};

function loadStoredUsers(): Person[] {
  try {
    const raw = localStorage.getItem(managedUsersStorageKey);
    return raw ? (JSON.parse(raw) as Person[]) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: Person[]) {
  try {
    localStorage.setItem(managedUsersStorageKey, JSON.stringify(users));
  } catch {}
}

function loadAuditLog(): UserAuditEntry[] {
  try {
    const raw = localStorage.getItem(auditLogStorageKey);
    return raw ? (JSON.parse(raw) as UserAuditEntry[]) : [];
  } catch {
    return [];
  }
}

function appendAuditEntry(entry: UserAuditEntry) {
  try {
    const current = loadAuditLog();
    const updated = [entry, ...current];
    localStorage.setItem(auditLogStorageKey, JSON.stringify(updated));
  } catch {}
}

export function EditUserPage({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const { data: initialUsers = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: mockApi.users,
  });

  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Funcionário" | "Admin">("Funcionário");
  const [status, setStatus] = useState<"Ativo" | "Inativo" | "Bloqueado">("Ativo");
  const [justification, setJustification] = useState("");
  const [userAuditHistory, setUserAuditHistory] = useState<UserAuditEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = loadStoredUsers();
    const pool = stored.length > 0 ? stored : initialUsers;
    const found = pool.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());

    if (found) {
      setCurrentUser(found);
      setName(found.name);
      setRole(found.role === "Admin" ? "Admin" : "Funcionário");
      setStatus(
        found.status === "Ativo" || found.status === "Inativo" || found.status === "Bloqueado"
          ? (found.status as "Ativo" | "Inativo" | "Bloqueado")
          : "Ativo"
      );
    }
    setLoaded(true);

    // Load audits for this specific user
    const allAudits = loadAuditLog();
    setUserAuditHistory(
      allAudits.filter((a) => a.userEmail.toLowerCase() === userEmail.toLowerCase())
    );
  }, [userEmail, initialUsers]);

  // Guard: Admin can NEVER view or edit a Super-admin
  if (loaded && currentUser?.role === "Super-admin") {
    return (
      <AccessRestricted
        title="Acesso Negado: Perfil de Super-administrador"
        description="Administradores não possuem autorização para visualizar ou editar contas com o cargo de Super-admin. Essa área é restrita a Super-administradores."
        backHref="/admin/users"
        backLabel="Voltar para Usuários"
      />
    );
  }

  if (loaded && !currentUser && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="flex min-h-[60vh] items-center justify-center p-4"
      >
        <Card className="max-w-md p-8 text-center border-border shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
            <Info size={24} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Usuário não encontrado
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            O endereço &ldquo;{userEmail}&rdquo; não foi localizado na base de colaboradores.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/admin/users">
              <Button variant="outline">
                <ArrowLeft size={14} />
                Voltar aos usuários
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    );
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!currentUser || justification.trim().length < 8) return;

    setSaving(true);

    const safeRole = role === "Admin" ? "Admin" : "Funcionário";
    const safeStatus = status;

    const auditEntry: UserAuditEntry = {
      id: `audit-${Date.now()}`,
      userName: name.trim(),
      userEmail: currentUser.email,
      previousRole: currentUser.role,
      newRole: safeRole,
      previousStatus: currentUser.status,
      newStatus: safeStatus,
      reason: justification.trim(),
      editedAt: new Date().toLocaleString("pt-BR"),
      editedBy: "Rafael Mendes (Admin)",
    };

    appendAuditEntry(auditEntry);

    // Save to pool
    const stored = loadStoredUsers();
    const pool = stored.length > 0 ? stored : initialUsers;
    const updated = pool.map((u) => {
      if (u.email.toLowerCase() === currentUser.email.toLowerCase()) {
        return {
          ...u,
          name: name.trim(),
          role: safeRole,
          status: safeStatus,
        };
      }
      return u;
    });

    saveStoredUsers(updated);
    setNotice("Alterações salvas com sucesso! Redirecionando...");

    setTimeout(() => {
      router.push("/admin/users");
    }, 700);
  }

  const isFormChanged =
    currentUser &&
    (name.trim() !== currentUser.name ||
      role !== currentUser.role ||
      status !== currentUser.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Top Navigation Breadcrumb */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group mb-3"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para lista de usuários
        </Link>
        <PageHeading
          eyebrow="Painel Administrativo · Governança de Usuários"
          title="Editar Colaborador"
          description="Altere dados, cargo e status do usuário mediante justificativa obrigatória registrada na trilha de auditoria."
        />
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 shadow-sm"
          >
            <Check size={16} />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Header Profile Card */}
      <Card className="p-5 sm:p-6 bg-white border-border shadow-xs">
        {isLoading || !currentUser ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar initials={currentUser.initials} className="h-14 w-14 text-base font-medium" />
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-foreground">{currentUser.name}</h2>
                  <Status>{currentUser.status}</Status>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{currentUser.email}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>Cargo atual: <strong className="text-foreground">{currentUser.role}</strong></span>
                  <span>·</span>
                  <span>Último acesso: {currentUser.lastSeen}</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-stone-50/70 px-4 py-2.5 text-right sm:text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Nível de Permissão
              </p>
              <p className="text-xs font-medium text-foreground mt-0.5">
                {currentUser.role === "Admin" ? "Administrador Operacional" : "Colaborador Padrão"}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Main Grid: Form + Sidebar Audit */}
      <div className="grid gap-6 lg:grid-cols-[1fr_310px]">
        {/* Main Edit Form */}
        <Card className="p-6 bg-white border-border shadow-xs">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Dados Cadastrais</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Informações de identificação do colaborador no sistema.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="user-name" className="mb-1.5 block text-xs font-medium text-foreground">
                  Nome completo *
                </label>
                <Input
                  id="user-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do colaborador"
                />
              </div>

              <div>
                <label htmlFor="user-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Email corporativo (identificador único imutável)
                </label>
                <Input
                  id="user-email"
                  disabled
                  value={currentUser?.email ?? userEmail}
                  className="bg-stone-50 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">Função e Acesso à Plataforma</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina o papel e o estado da conta deste colaborador.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="user-role" className="mb-1.5 block text-xs font-medium text-foreground">
                    Cargo / Função *
                  </label>
                  <select
                    id="user-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "Funcionário" | "Admin")}
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                  >
                    <option value="Funcionário">Funcionário (Apenas Chat)</option>
                    <option value="Admin">Admin (Gestão e Equipe)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Super-administradores só podem ser atribuídos por Super-admins.
                  </p>
                </div>

                <div>
                  <label htmlFor="user-status" className="mb-1.5 block text-xs font-medium text-foreground">
                    Status da conta *
                  </label>
                  <select
                    id="user-status"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "Ativo" | "Inativo" | "Bloqueado")
                    }
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                  >
                    <option value="Ativo">Ativo (Acesso normal)</option>
                    <option value="Inativo">Inativo (Acesso pausado)</option>
                    <option value="Bloqueado">Bloqueado (Acesso revogado)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Contas bloqueadas perdem acesso imediato a todas as sessões.
                  </p>
                </div>
              </div>
            </div>

            {/* Mandatory Justification Section */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4.5">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="user-justification"
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-950"
                >
                  <FileCheck2 size={16} className="text-amber-700" />
                  Justificativa Obrigatória da Alteração *
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    justification.trim().length >= 8 ? "text-emerald-700 font-semibold" : "text-amber-800"
                  }`}
                >
                  {justification.trim().length} / 8 caracteres mínimos
                </span>
              </div>
              <textarea
                id="user-justification"
                required
                minLength={8}
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Descreva obrigatoriamente a razão operacional ou administrativa para alteração do nome, cargo ou status deste usuário..."
                className="w-full resize-none rounded-lg border border-amber-300/80 bg-white p-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
              />
              <p className="mt-1.5 text-[11px] text-amber-900/80 leading-relaxed">
                Esta justificativa será gravada permanentemente na trilha de auditoria e associada ao seu usuário administrador.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Link href="/admin/users">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={justification.trim().length < 8 || !name.trim() || saving}
                className="flex items-center gap-2"
              >
                <Save size={15} />
                {saving ? "Registrando..." : "Salvar alterações com justificativa"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Sidebar Info & Audit Trail for this user */}
        <div className="space-y-4">
          <Card className="p-5 bg-white border-border shadow-xs">
            <div className="flex items-center gap-2 text-foreground mb-3">
              <History size={16} className="text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Auditoria deste Colaborador
              </h3>
            </div>
            {userAuditHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                Nenhuma alteração anterior registrada para este perfil.
              </p>
            ) : (
              <div className="space-y-3">
                {userAuditHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-stone-50/70 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-mono">{item.editedAt}</span>
                      <span className="text-[10px] font-medium text-foreground">{item.editedBy}</span>
                    </div>
                    <p className="text-[11px] text-stone-800 italic bg-white p-2 rounded border border-border/50">
                      &ldquo;{item.reason}&rdquo;
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
                      <span>{item.previousRole} ({item.previousStatus})</span>
                      <span>→</span>
                      <strong className="text-foreground">{item.newRole} ({item.newStatus})</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 bg-stone-50/80 border-border text-xs space-y-2">
            <div className="flex items-center gap-2 text-stone-800 font-semibold">
              <ShieldCheck size={16} className="text-stone-700" />
              <span>Diretrizes do Administrador</span>
            </div>
            <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-muted-foreground">
              <li>
                Administradores gerenciam exclusivamente <strong>Funcionários</strong> e <strong>Administradores</strong>.
              </li>
              <li>
                Status <strong>Bloqueado</strong> impede login imediatamente.
              </li>
              <li>
                Todas as justificativas são inspecionáveis pelos Super-administradores nos relatórios executivos.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
