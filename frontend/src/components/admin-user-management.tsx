"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ClipboardList,
  Clock3,
  Edit3,
  FileCheck2,
  History,
  ShieldAlert,
  ShieldBan,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  Input,
  PageHeading,
  Pagination,
  SearchField,
  Skeleton,
  Status,
} from "@/components/ui";
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

export function AdminUsersManagement() {
  const { data = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: mockApi.users });
  const [users, setUsers] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos os papéis");
  const [statusFilter, setStatusFilter] = useState("Todos os status");


  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"Funcionário" | "Admin">("Funcionário");
  const [newStatus, setNewStatus] = useState<"Ativo" | "Inativo" | "Bloqueado">("Ativo");
  const [newJustification, setNewJustification] = useState("");

  const [notice, setNotice] = useState("");
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [auditLog, setAuditLog] = useState<UserAuditEntry[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    setAuditLog(loadAuditLog());
    const stored = loadStoredUsers();
    const source = stored.length > 0 ? stored : data;
    // Strict requirement: Admin must NEVER see or handle Super-admin!
    // Also normalize statuses to "Ativo" | "Inativo" | "Bloqueado"
    const sanitized = source
      .filter((u) => u.role !== "Super-admin")
      .map((u) => {
        let validStatus = u.status;
        if (validStatus !== "Ativo" && validStatus !== "Inativo" && validStatus !== "Bloqueado") {
          validStatus = "Bloqueado";
        }
        return {
          ...u,
          status: validStatus,
        };
      });
    setUsers(sanitized);
  }, [data]);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter]);

  const filtered = users.filter((u) => {
    // Defense-in-depth: Admin can NEVER see Super-admin
    if (u.role === "Super-admin") return false;
    const matchesSearch = `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesRole = roleFilter === "Todos os papéis" || u.role === roleFilter;
    const matchesStatus = statusFilter === "Todos os status" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);


  function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newJustification.trim().length < 8) return;

    // Guard: Admin can strictly only create "Funcionário" or "Admin"
    const safeRole = newRole === "Admin" ? "Admin" : "Funcionário";
    const initials = newName
      .trim()
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const newUser: Person = {
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: safeRole,
      status: newStatus,
      lastSeen: "Nunca",
      initials: initials || "US",
    };

    const auditEntry: UserAuditEntry = {
      id: `audit-${Date.now()}`,
      userName: newUser.name,
      userEmail: newUser.email,
      previousRole: "— (Novo cadastro)",
      newRole: newUser.role,
      previousStatus: "—",
      newStatus: newUser.status,
      reason: newJustification.trim(),
      editedAt: new Date().toLocaleString("pt-BR"),
      editedBy: "Rafael Mendes (Admin)",
    };

    appendAuditEntry(auditEntry);
    setAuditLog((prev) => [auditEntry, ...prev]);

    const updatedList = [newUser, ...users];
    setUsers(updatedList);
    saveStoredUsers(updatedList);

    setNotice(`Usuário "${newUser.name}" cadastrado como ${newUser.role} (${newUser.status}).`);
    setCreateModalOpen(false);
    setNewName("");
    setNewEmail("");
    setNewRole("Funcionário");
    setNewStatus("Ativo");
    setNewJustification("");
  }

  const activeCount = users.filter((u) => u.status === "Ativo").length;
  const inactiveCount = users.filter((u) => u.status === "Inativo").length;
  const blockedCount = users.filter((u) => u.status === "Bloqueado").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
      className="space-y-6"
    >
      <PageHeading
        eyebrow="Painel Administrativo"
        title="Gestão de Usuários"
        description="Visualize colaboradores, cadastre novos membros e edite cadastros mediante justificativa obrigatória."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAuditHistory(!showAuditHistory)}
              className="flex items-center gap-2"
            >
              <History size={15} />
              {showAuditHistory ? "Ocultar histórico" : "Histórico de justificativas"}
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus size={15} />
              Novo usuário
            </Button>
          </div>
        }
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Check size={14} />
              {notice}
            </span>
            <button
              onClick={() => setNotice("")}
              aria-label="Dispensar aviso"
              className="text-emerald-700 hover:text-emerald-950"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics Cards: Reflecting Ativo, Inativo and Bloqueado */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de colaboradores</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight">{users.length}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">Funcionários e administradores</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700">{activeCount}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">Acesso regular liberado</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Usuários inativos</p>
            <span className="h-2 w-2 rounded-full bg-stone-400" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-700">{inactiveCount}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">Acesso pausado temporariamente</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Usuários bloqueados</p>
            <span className="h-2 w-2 rounded-full bg-rose-500" />
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-700">{blockedCount}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">Acesso revogado e bloqueado</p>
        </Card>
      </div>

      {/* Expandable Audit Log */}
      <AnimatePresence>
        {showAuditHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <Card className="border-amber-200/80 bg-amber-50/30 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-amber-900 mb-3">
                <ClipboardList size={18} />
                <h3 className="text-sm font-semibold">Trilha de Auditoria · Justificativas de Alteração</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Histórico de edições realizadas por administradores com suas respectivas justificativas obrigatórias.
              </p>

              {auditLog.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhuma alteração registrada ainda. Ao editar qualquer usuário, a justificativa constará aqui.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditLog.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border bg-white p-3.5 text-xs space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{log.userName}</span>
                        <span className="text-[10px] text-muted-foreground">{log.editedAt}</span>
                      </div>
                      <p className="text-[11px] text-stone-700 bg-stone-50 p-2 rounded-md border border-border/60">
                        &ldquo;{log.reason}&rdquo;
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground pt-1">
                        <span>
                          Cargo: <strong className="text-foreground">{log.previousRole}</strong> →{" "}
                          <strong className="text-foreground">{log.newRole}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Status: <strong className="text-foreground">{log.previousStatus}</strong> →{" "}
                          <strong className="text-foreground">{log.newStatus}</strong>
                        </span>
                        <span>·</span>
                        <span>Por {log.editedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Users Table */}
      <Card>
        <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar colaboradores por nome ou email..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por papel"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            >
              <option>Todos os papéis</option>
              <option>Funcionário</option>
              <option>Admin</option>
            </select>
            <select
              aria-label="Filtrar por status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            >
              <option>Todos os status</option>
              <option>Ativo</option>
              <option>Inativo</option>
              <option>Bloqueado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-border bg-stone-50/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Último acesso</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-2.5 w-44" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-4 py-3.5 text-right"><Skeleton className="ml-auto h-8 w-20 rounded-md" /></td>
                  </tr>
                ))
              ) : paginated.length > 0 ? (
                paginated.map((user, i) => (
                  <motion.tr
                    key={user.email}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar initials={user.initials} className="h-8 w-8 text-[10px]" />
                        <div>
                          <Link
                            href={`/admin/users/${encodeURIComponent(user.email)}`}
                            className="text-xs font-medium text-foreground hover:underline transition-colors"
                          >
                            {user.name}
                          </Link>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{user.role}</td>
                    <td className="px-4 py-3.5">
                      <Status>{user.status}</Status>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{user.lastSeen}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/admin/users/${encodeURIComponent(user.email)}`}>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-2.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <Edit3 size={13} />
                          Editar
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-muted-foreground">
                    Nenhum colaborador encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>

      {/* Create New User Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
              className="w-full max-w-lg"
            >
              <Card className="p-6 shadow-2xl">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-base font-semibold">Novo Colaborador</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Cadastre um novo funcionário ou administrador com registro de justificativa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    aria-label="Fechar"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="new-user-name" className="mb-1.5 block text-xs font-medium">
                      Nome completo
                    </label>
                    <Input
                      id="new-user-name"
                      required
                      placeholder="Ex: Mariana Silva"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="new-user-email" className="mb-1.5 block text-xs font-medium">
                      Email corporativo
                    </label>
                    <Input
                      id="new-user-email"
                      type="email"
                      required
                      placeholder="mariana.silva@empresa.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="new-user-role" className="mb-1.5 block text-xs font-medium">
                        Função / Cargo
                      </label>
                      <select
                        id="new-user-role"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as "Funcionário" | "Admin")}
                        className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                      >
                        <option value="Funcionário">Funcionário</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="new-user-status" className="mb-1.5 block text-xs font-medium">
                        Status inicial
                      </label>
                      <select
                        id="new-user-status"
                        value={newStatus}
                        onChange={(e) =>
                          setNewStatus(e.target.value as "Ativo" | "Inativo" | "Bloqueado")
                        }
                        className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                        <option value="Bloqueado">Bloqueado</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <label
                      htmlFor="new-user-justification"
                      className="mb-1.5 flex items-center justify-between text-xs font-semibold text-amber-900"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 size={15} /> Justificativa do cadastro *
                      </span>
                      <span className="text-[10px] text-amber-700 font-normal">
                        Mínimo de 8 caracteres
                      </span>
                    </label>
                    <textarea
                      id="new-user-justification"
                      required
                      minLength={8}
                      rows={3}
                      value={newJustification}
                      onChange={(e) => setNewJustification(e.target.value)}
                      placeholder="Descreva o motivo da contratação, departamento e autorização do cadastro..."
                      className="w-full resize-none rounded-lg border border-border bg-white p-3 text-xs outline-none placeholder:text-muted-foreground focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={newJustification.trim().length < 8 || !newName.trim() || !newEmail.trim()}
                    >
                      Cadastrar usuário
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
