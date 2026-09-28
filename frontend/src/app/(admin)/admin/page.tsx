"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  FileCheck2,
  FileText,
  History,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Avatar, Button, Card, PageHeading, Skeleton, Status } from "@/components/ui";
import { ActivityChart } from "@/components/charts";
import { mockApi } from "@/lib/api";
import { downloadReportPdf } from "@/lib/download";
import { IntegrationFlowCanvas } from "@/components/integration-flow-canvas";

type AuditEntry = {
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

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: mockApi.dashboard });
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["users"], queryFn: mockApi.users });
  const adminVisibleUsers = users.filter((u) => u.role !== "Super-admin");
  const [notice, setNotice] = useState("");
  const [recentAudits, setRecentAudits] = useState<AuditEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("omnichanel-user-edits-log");
      if (stored) {
        setRecentAudits(JSON.parse(stored).slice(0, 3));
      } else {
        // Fallback demo audit history
        setRecentAudits([
          {
            id: "demo-1",
            userName: "Carlos Souza",
            userEmail: "carlos.souza@empresa.com",
            previousRole: "Funcionário",
            newRole: "Admin",
            previousStatus: "Ativo",
            newStatus: "Ativo",
            reason: "Promoção interna para coordenação de atendimento ao cliente.",
            editedAt: "Hoje, 10:14",
            editedBy: "Administrador",
          },
          {
            id: "demo-2",
            userName: "Juliana Santos",
            userEmail: "juliana.santos@empresa.com",
            previousRole: "Funcionário",
            newRole: "Funcionário",
            previousStatus: "Ativo",
            newStatus: "Inativo",
            reason: "Solicitação de licença maternidade de 6 meses formalizada pelo RH.",
            editedAt: "Ontem, 16:30",
            editedBy: "Administrador",
          },
        ]);
      }
    } catch {
      setRecentAudits([]);
    }
  }, []);

  const exportAdminDashboard = () =>
    downloadReportPdf({
      title: "Relatório de Administração - Visão Geral",
      filename: "relatorio-administracao.pdf",
    });

  const adminMetrics = [
    { key: "users", label: "Usuários ativos", value: data?.users ?? "1.284", change: "+8,2%", Icon: Users, hint: "em relação ao mês passado" },
    { key: "sessions", label: "Sessões operacionais", value: "842", change: "+5,4%", Icon: UserCheck, hint: "colaboradores conectados" },
    { key: "audits", label: "Edições justificadas", value: String(Math.max(14, recentAudits.length)), change: "+12,1%", Icon: FileCheck2, hint: "todas com auditoria" },
    { key: "chat", label: "Interações no chat", value: "1.954", change: "+11,3%", Icon: Bot, hint: "mensagens da equipe" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Painel Administrativo"
        title="Visão geral"
        description="Gerencie usuários, visualize atividades da equipe e acompanhe justificativas."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportAdminDashboard}>
              <FileText size={15} />
              Exportar PDF
            </Button>
            <Link href="/admin/users">
              <Button>
                <Users size={15} />
                Gerenciar usuários
              </Button>
            </Link>
          </div>
        }
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status"
            className="mb-4 rounded-lg border border-border bg-white px-4 py-3 text-xs shadow-sm"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminMetrics.map((item, index) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, delay: index * 0.05 }}
          >
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <item.Icon size={16} className="text-neutral-600" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{item.value}</span>
                <span className="inline-flex items-center text-xs font-medium text-emerald-600">
                  <ArrowUpRight size={13} />
                  {item.change}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Atividade do time</h2>
              <p className="mt-1 text-xs text-muted-foreground">Engajamento e movimentação de usuários</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center">
              <Skeleton className="h-[240px] w-full rounded-xl" />
            </div>
          ) : (
            <ActivityChart compact />
          )}
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-neutral-500" />
                <h2 className="text-sm font-semibold">Justificativas recentes</h2>
              </div>
              <Link
                href="/admin/users"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Alterações de função e status requerem justificativa obrigatória registrada em auditoria.
            </p>
            <div className="space-y-3">
              {recentAudits.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-stone-50/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{entry.userName}</span>
                    <span className="text-[10px] text-muted-foreground">{entry.editedAt}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-600 line-clamp-2">
                    &ldquo;{entry.reason}&rdquo;
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{entry.previousRole} → <strong className="text-foreground">{entry.newRole}</strong></span>
                    <span>·</span>
                    <span>Por {entry.editedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <Link href="/admin/users" className="block w-full">
              <Button variant="outline" className="w-full text-xs">
                Acessar gestão de usuários
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Usuários recentes da plataforma</h2>
              <p className="mt-1 text-xs text-muted-foreground">Colaboradores e administradores cadastrados</p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Ver todos usuários <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {usersLoading || isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex items-center gap-3 flex-1">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))
              : adminVisibleUsers.slice(0, 4).map((user) => (
                  <div key={user.email} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar initials={user.initials} className="h-8 w-8 text-[10px]" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{user.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                      <Status>{user.status}</Status>
                    </div>
                  </div>
                ))}
          </div>
        </Card>
      </div>

      {/* Mapa Mental de Arquitetura & Integração (Estilo n8n & Gemini Notebook) */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Arquitetura de Integração (Estilo n8n & Gemini Notebook)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mapa mental dinâmico das conexões REST API e MCP Server em execução.
            </p>
          </div>
          <Link
            href="/admin/integrations"
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-800 hover:text-black dark:text-neutral-200"
          >
            <span>Gerenciar conexões</span>
            <ArrowRight size={13} />
          </Link>
        </div>
        <IntegrationFlowCanvas className="h-[620px] rounded-2xl border border-border shadow-sm" />
      </div>
    </motion.div>
  );
}
