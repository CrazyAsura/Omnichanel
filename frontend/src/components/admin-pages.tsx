"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlus,
  Clock3,
  CloudDownload,
  File,
  FileSpreadsheet,
  FileText,
  KeyRound,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar, Button, Card, Input, PageHeading, Pagination, SearchField, Skeleton, Status } from "@/components/ui";
import { mockApi } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import type { Person } from "@/lib/mock-data";
import { IntegrationPage as IntegrationPageComponent } from "@/components/integration-page";
import { ReportsPage as ReportsPageComponent } from "@/components/reports-page";

export function UsersPage({ initialRole }: { initialRole?: Person["role"] }) {
  const { data = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: mockApi.users });
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState(initialRole ?? "Todos os papéis");
  const [status, setStatus] = useState("Todos os status");

  const filtered = data.filter(
    (item) =>
      `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()) &&
      (role === "Todos os papéis" || item.role === role) &&
      (status === "Todos os status" || item.status === status)
  );

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  useEffect(() => {
    setPage(1);
  }, [query, role, status]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <RoleTabs selected={initialRole} />
      <PageHeading
        eyebrow="Workspace"
        title={initialRole === "Funcionário" ? "Funcionários" : initialRole ?? "Administração"}
        description="Gerencie funcionários, admins e super-admins e seus acessos."
        action={
          <Button onClick={() => setModal(true)}>
            <UserPlus size={15} />
            Convidar usuário
          </Button>
        }
      />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Total de usuários", "1.284", "↑ 8,2% neste mês"],
          ["Usuários ativos", "1.196", "93,1% do total"],
          ["Convites pendentes", "12", "5 enviados esta semana"],
        ].map(([label, value, hint], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.05 }}
          >
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              {isLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
                </>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      <div className="mb-4 grid gap-3 xl:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold">Funcionário</p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
            Usa o chat interno e consulta documentos e sistemas liberados.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold">Admin</p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
            Administra equipe, conteúdos e integrações do workspace.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold">Super-admin</p>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
            Gerencia o ambiente completo, permissões e configurações globais.
          </p>
        </Card>
      </div>
      <Card>
        <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchField value={query} onChange={setQuery} placeholder="Buscar por nome ou email..." />
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por papel"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            >
              <option>Todos os papéis</option>
              <option>Funcionário</option>
              <option>Admin</option>
              <option>Super-admin</option>
            </select>
            <select
              aria-label="Filtrar por status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
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
                <th className="px-4 py-3" />
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
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-3.5 w-24" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Skeleton className="ml-auto h-7 w-7 rounded-md" />
                    </td>
                  </tr>
                ))
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((person, i) => (
                  <motion.tr
                    key={person.email}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar initials={person.initials} className="h-8 w-8 text-[10px]" />
                        <div>
                          <p className="text-xs font-medium">{person.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{person.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{person.role}</td>
                    <td className="px-4 py-3.5">
                      <Status>{person.status}</Status>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{person.lastSeen}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        aria-label={`Opções para ${person.name}`}
                        onClick={() =>
                          window.alert(
                            `Usuário: ${person.name} · Função: ${person.role} · Status: ${person.status}`
                          )
                        }
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted active:scale-95 transition"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
      {modal && (
        <InviteModal
          onClose={() => setModal(false)}
          onInvite={(email) => {
            setModal(false);
            setNotice(`Convite enviado para ${email}`);
          }}
        />
      )}
    </motion.div>
  );
}

function RoleTabs({ selected }: { selected?: Person["role"] }) {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const tabs = [
    { label: "Visão geral", href: `${basePath}/users`, role: undefined },
    { label: "Funcionários", href: `${basePath}/users/employees`, role: "Funcionário" },
    { label: "Admin", href: `${basePath}/users/admins`, role: "Admin" },
    { label: "Super-admin", href: `${basePath}/users/super-admins`, role: "Super-admin" },
  ];
  return (
    <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`border-b-2 px-3 py-2.5 text-xs transition-colors ${
            selected === tab.role
              ? "border-neutral-800 font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Funcionário");
  const [status, setStatus] = useState("Ativo");
  return (
    <Modal
      title="Convidar usuário"
      description="Envie um convite para alguém participar do workspace."
      onClose={onClose}
    >
      <label className="mb-1.5 block text-xs font-medium">Email</label>
      <Input
        type="email"
        placeholder="nome@empresa.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium">Função</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          >
            <option>Funcionário</option>
            <option>Admin</option>
            <option>Super-admin</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium">Status inicial</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          >
            <option>Ativo</option>
            <option>Inativo</option>
            <option>Bloqueado</option>
          </select>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!email.includes("@")} onClick={() => onInvite(email)}>
          Enviar convite
        </Button>
      </div>
    </Modal>
  );
}

export function FilesPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["files"], queryFn: mockApi.files });
  const [query, setQuery] = useState("");
  const [fileType, setFileType] = useState("Todos os tipos");
  const [notice, setNotice] = useState("");
  const visible = data.filter(
    (file) =>
      `${file.name} ${file.owner}`.toLowerCase().includes(query.toLowerCase()) &&
      (fileType === "Todos os tipos" || file.type === fileType)
  );

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    setPage(1);
  }, [query, fileType]);

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const paginated = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Workspace"
        title="Arquivos"
        description="Visualize e organize os arquivos do ambiente."
        action={
          <Button
            onClick={() =>
              window.alert(
                "Selecione arquivos na versão conectada. Uploads estão desativados nesta demonstração."
              )
            }
          >
            <CloudDownload size={15} />
            Adicionar arquivos
          </Button>
        }
      />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Armazenamento utilizado", "68,4 GB", "de 100 GB disponíveis"],
          ["Arquivos", "8.492", "+124 neste mês"],
          ["Compartilhados", "316", "em 42 pastas"],
        ].map(([label, value, hint], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.05 }}
          >
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              {isLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
                </>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchField value={query} onChange={setQuery} placeholder="Buscar arquivos..." />
          <div className="flex gap-2">
            <select
              aria-label="Filtrar arquivos por tipo"
              value={fileType}
              onChange={(event) => setFileType(event.target.value)}
              className="h-9 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            >
              <option>Todos os tipos</option>
              <option>PDF</option>
              <option>DOC</option>
              <option>CSV</option>
            </select>
            <Button
              variant="outline"
              className="h-9 text-xs"
              onClick={() =>
                downloadCsv(
                  "arquivos.csv",
                  visible.map(({ name, owner, size, updated, type }) => ({
                    name,
                    owner,
                    size,
                    updated,
                    type,
                  }))
                )
              }
            >
              <ArrowDownToLine size={14} />
              Download
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border bg-stone-50/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Proprietário</th>
                <th className="px-4 py-3 font-medium">Tamanho</th>
                <th className="px-4 py-3 font-medium">Modificado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-36" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-24" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-16" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3.5 text-right"><Skeleton className="ml-auto h-7 w-7 rounded-md" /></td>
                  </tr>
                ))
              ) : (
                paginated.map((file) => (
                  <tr key={file.name} className="border-b border-border last:border-0 hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          {file.type === "PDF" ? (
                            <FileText size={16} />
                          ) : file.type === "CSV" ? (
                            <FileSpreadsheet size={16} />
                          ) : (
                            <File size={16} />
                          )}
                        </span>
                        <div>
                          <p className="text-xs font-medium">{file.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{file.type} · Compartilhado</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{file.owner}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{file.size}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{file.updated}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        aria-label="Mais opções"
                        onClick={() => window.alert("Ação demonstrativa: abrir detalhes do registro.")}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted active:scale-95 transition"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={visible.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
    </motion.div>
  );
}

export function IntegrationsPage() {
  return <IntegrationPageComponent />;
}

function LegacyIntegrationsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["integrations"], queryFn: mockApi.integrations });
  const [kind, setKind] = useState("Todas");
  const [notice, setNotice] = useState("");
  const filtered = data.filter((item) => kind === "Todas" || item.kind === kind);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 4;

  useEffect(() => {
    setPage(1);
  }, [kind]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Desenvolvedores"
        title="APIs e MCPs"
        description="Gerencie conexões, chaves e servidores conectados."
        action={
          <Button onClick={() => setNotice("Assistente de integração aberto.")}>
            <CirclePlus size={15} />
            Nova integração
          </Button>
        }
      />
      {notice && <Notice message={notice} onClose={() => setNotice("")} />}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Integrações", "18", "conexões configuradas"],
          ["Requisições (30 dias)", "482,9 mil", "↑ 12,5% vs. período anterior"],
          ["Disponibilidade média", "99,96%", "últimos 30 dias"],
        ].map(([label, value, hint], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.05 }}
          >
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              {isLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
                </>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      <Card>
        <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold">Conexões</h2>
            <p className="mt-1 text-xs text-muted-foreground">APIs REST e servidores MCP</p>
          </div>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          >
            <option>Todas</option>
            <option>REST API</option>
            <option>MCP Server</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-border bg-stone-50/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Integração</th>
                <th className="px-4 py-3 font-medium">Endpoint</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Requisições</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-2.5 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Skeleton className="h-3.5 w-40" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-3.5 w-16" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="ml-auto h-7 w-7 rounded-md" /></td>
                  </tr>
                ))
              ) : (
                paginated.map((item, i) => (
                  <motion.tr
                    key={item.name}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                          <KeyRound size={16} />
                        </span>
                        <div>
                          <p className="text-xs font-medium">{item.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{item.kind}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-muted-foreground">{item.endpoint}</td>
                    <td className="px-4 py-4">
                      <Status>{item.status}</Status>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{item.requests}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        aria-label="Mais opções"
                        onClick={() => window.alert("Ação demonstrativa: abrir detalhes do registro.")}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted active:scale-95 transition"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
    </motion.div>
  );
}

export function ReportsPage() {
  return <ReportsPageComponent />;
}

function LegacyReportsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["reports"], queryFn: mockApi.reports });
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Análises"
        title="Relatórios"
        description="Indicadores de uso e operação do ambiente."
        action={
          <Button variant="outline">
            <ArrowDownToLine size={15} />
            Exportar dados
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Button variant="outline" className="h-9 text-xs">
          Últimos 30 dias <ChevronDown size={14} />
        </Button>
        <Button variant="outline" className="h-9 text-xs">
          Todos os ambientes <ChevronDown size={14} />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </Card>
            ))
          : data.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.05 }}
              >
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
                    <span className="text-[11px] text-emerald-700">{item.change}</span>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-neutral-800" style={{ width: item.width }} />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">vs. período anterior</p>
                </Card>
              </motion.div>
            ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold">Uso ao longo do tempo</h2>
            <p className="mt-1 text-xs text-muted-foreground">Atividade diária no período selecionado</p>
          </div>
          <div className="flex h-[240px] items-end gap-2 border-b border-border pb-2">
            {[
              42, 52, 48, 67, 59, 74, 62, 81, 72, 64, 86, 70, 89, 79, 68, 91, 75, 84, 66, 78, 93, 71, 86,
              75, 63, 81, 72, 97,
            ].map((height, index) => (
              <div
                key={index}
                style={{ height: `${height}%` }}
                className={`flex-1 rounded-t-[3px] ${index === 26 ? "bg-neutral-800" : "bg-stone-200"}`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
            <span>01 set</span>
            <span>07 set</span>
            <span>14 set</span>
            <span>21 set</span>
            <span>27 set</span>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Resumo por categoria</h2>
          <p className="mt-1 text-xs text-muted-foreground">Distribuição de eventos</p>
          <div className="mt-6 space-y-5">
            {[
              ["Requisições", "48%", "84%"],
              ["Arquivos", "26%", "62%"],
              ["Usuários", "18%", "44%"],
              ["Outros", "8%", "22%"],
            ].map(([name, percent, width]) => (
              <div key={name}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{name}</span>
                  <span className="text-muted-foreground">{percent}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div style={{ width }} className="h-full rounded-full bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

export function ActivityPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["activity"], queryFn: mockApi.activity });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas as ações");

  const filtered = data.filter(
    (item) =>
      `${item.user} ${item.action} ${item.target}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === "Todas as ações" ||
        (category === "Arquivos" && item.target.toLowerCase().includes("arquivo")) ||
        (category === "APIs" && item.action.toLowerCase().includes("api")) ||
        (category === "Permissões" && item.action.toLowerCase().includes("permissões")))
  );

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Observabilidade"
        title="Logs de atividades"
        description="Acompanhe as ações realizadas pelos usuários no sistema."
        action={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "logs-de-atividades.csv",
                filtered.map((item) => ({
                  usuario: item.user,
                  acao: item.action,
                  recurso: item.target,
                  horario: item.time,
                }))
              )
            }
          >
            <ArrowDownToLine size={15} />
            Exportar logs
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar atividade..." />
        <select
          aria-label="Filtrar atividades"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        >
          <option>Todas as ações</option>
          <option>Arquivos</option>
          <option>APIs</option>
          <option>Permissões</option>
        </select>
      </div>
      <Card>
        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-5">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))
          ) : (
            paginated.map((item, index) => (
              <motion.div
                key={item.user + item.target + index}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.02 }}
                className="flex gap-4 px-5 py-5 hover:bg-stone-50/40 transition-colors"
              >
                <Avatar initials={item.initials} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6">
                    <span className="font-medium text-foreground">{item.user}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="font-medium text-foreground">{item.target}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock3 size={12} />
                      {item.time}
                    </span>
                    <span>·</span>
                    <span>IP 192.168.1.{24 + index}</span>
                    <span>·</span>
                    <span>Sessão autenticada</span>
                  </div>
                </div>
                <button
                  aria-label="Detalhes da atividade"
                  onClick={() =>
                    window.alert(`${item.user}: ${item.action} ${item.target} · ${item.time}`)
                  }
                  className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted active:scale-95 transition"
                >
                  Detalhes
                </button>
              </motion.div>
            ))
          )}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
    </motion.div>
  );
}

export function ErrorsPage() {
  const { data = [], isLoading, refetch } = useQuery({ queryKey: ["errors"], queryFn: mockApi.errors });
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("Todas as severidades");

  const filtered = data.filter(
    (error) =>
      `${error.title} ${error.service} ${error.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (severity === "Todas as severidades" || error.severity === severity)
  );

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    setPage(1);
  }, [query, severity]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Observabilidade"
        title="Logs de erros"
        description="Investigue falhas e acompanhe a saúde dos serviços."
        action={
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw size={14} />
            Atualizar
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Erros hoje", "28", "↓ 12% vs. ontem"],
          ["Críticos", "3", "Requerem atenção"],
          ["Taxa de erro", "0,12%", "Dentro do esperado"],
        ].map(([label, value, hint], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.05 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                {i === 1 && <AlertTriangle size={15} className="text-amber-600" />}
              </div>
              {isLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
                </>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      <Card>
        <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchField value={query} onChange={setQuery} placeholder="Buscar por mensagem ou serviço..." />
          <select
            aria-label="Filtrar por severidade"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-3 text-xs outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          >
            <option>Todas as severidades</option>
            <option>Crítico</option>
            <option>Alto</option>
            <option>Médio</option>
            <option>Baixo</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-border bg-stone-50/70 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Erro</th>
                <th className="px-4 py-3 font-medium">Serviço</th>
                <th className="px-4 py-3 font-medium">Severidade</th>
                <th className="px-4 py-3 font-medium">Horário</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><Skeleton className="h-3.5 w-28" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="ml-auto h-7 w-7 rounded-md" /></td>
                  </tr>
                ))
              ) : (
                paginated.map((error, i) => (
                  <motion.tr
                    key={error.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.02 }}
                    onClick={() => setSelected(error.id)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700">
                          <ShieldAlert size={15} />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{error.title}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {error.id} · HTTP {error.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[11px] text-muted-foreground">{error.service}</td>
                    <td className="px-4 py-4">
                      <Status>{error.severity}</Status>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{error.time}</td>
                    <td className="px-4 py-4 text-right">
                      <button aria-label="Abrir detalhes" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted active:scale-95 transition">
                        <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </Card>
      {selected && <ErrorDetails id={selected} onClose={() => setSelected(null)} />}
    </motion.div>
  );
}

function ErrorDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const { data = [] } = useQuery({ queryKey: ["errors"], queryFn: mockApi.errors });
  const error = data.find((item) => item.id === id);
  return (
    <Modal title="Detalhes do erro" description={`${error?.id} · ${error?.time}`} onClose={onClose}>
      <div className="rounded-lg border border-border bg-stone-50 p-4">
        <p className="text-sm font-medium">{error?.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Serviço {error?.service} · HTTP {error?.code}
        </p>
      </div>
      <p className="mb-2 mt-5 text-xs font-medium">Stack trace</p>
      <pre className="overflow-auto rounded-lg bg-neutral-950 p-4 text-[10px] leading-5 text-neutral-300">{`Error: Request failed with status code ${error?.code}\n  at processRequest (src/api/gateway.ts:142:18)\n  at async handleIncoming (src/server/router.ts:87:9)\n  at async Promise.all (index 0)`}</pre>
      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
          className="w-full max-w-[440px] rounded-2xl border border-border bg-white p-6 shadow-xl"
        >
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted active:scale-95 transition"
            >
              <X size={16} />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 shadow-sm"
    >
      <span className="flex items-center gap-2">
        <Check size={14} />
        {message}
      </span>
      <button onClick={onClose} aria-label="Dispensar aviso" className="active:scale-95 transition">
        <X size={14} />
      </button>
    </motion.div>
  );
}
