"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Download,
  Ellipsis,
  FileText,
  FolderOpen,
  KeyRound,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Card, PageHeading, Skeleton, Status } from "@/components/ui";
import { ActivityChart } from "@/components/charts";
import { mockApi } from "@/lib/api";
import { downloadReportPdf } from "@/lib/download";
import { IntegrationFlowCanvas } from "@/components/integration-flow-canvas";

const metrics = [
  { key: "users", label: "Usuários ativos", change: "+8,2%", Icon: Users, hint: "em relação ao mês passado" },
  { key: "requests", label: "Requisições da API", change: "+12,5%", Icon: KeyRound, hint: "em relação ao mês passado" },
  { key: "files", label: "Arquivos armazenados", change: "+4,3%", Icon: FolderOpen, hint: "em relação ao mês passado" },
  { key: "errors", label: "Erros registrados", change: "−2,1%", Icon: FileText, hint: "em relação ao mês passado", down: true },
];

export default function SuperAdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: mockApi.dashboard });
  const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ["users"], queryFn: mockApi.users });
  const [chartMenu, setChartMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const chartMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chartMenuRef.current && !chartMenuRef.current.contains(event.target as Node)) {
        setChartMenu(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportDashboard = () =>
    downloadReportPdf({
      title: "Relatório Super-admin - Visão Geral",
      filename: "relatorio-super-admin.pdf",
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
    >
      <PageHeading
        eyebrow="Console Super-admin"
        title="Visão Geral do Sistema"
        description="Acompanhe métricas globais, arquivos, conexões externas e logs de observabilidade."
        action={
          <Button variant="outline" onClick={exportDashboard}>
            <FileText size={15} />
            Exportar PDF
          </Button>
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
        {metrics.map((item, index) => (
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
              {isLoading ? (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : (
                <>
                  <p className="mt-4 text-[28px] font-semibold tracking-tight">
                    {data?.[item.key as keyof typeof data] as string}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <span className={`flex items-center ${item.down ? "text-emerald-700" : "text-neutral-800 font-medium"}`}>
                      {item.down ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />} {item.change}
                    </span>
                    {item.hint}
                  </p>
                </>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Atividade do sistema</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Volume de requisições nos últimos 30 dias
              </p>
            </div>
            <div ref={chartMenuRef} className="relative">
              <button
                type="button"
                aria-label="Opções do gráfico"
                onClick={() => setChartMenu(!chartMenu)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted active:scale-95 transition"
              >
                <Ellipsis size={17} />
              </button>
              <AnimatePresence>
                {chartMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ type: "spring", stiffness: 450, damping: 30, bounce: 0.1 }}
                    className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-border bg-white p-1.5 shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        exportDashboard();
                        setChartMenu(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                    >
                      Exportar gráfico
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice("Gráfico atualizado com dados de demonstração.");
                        setChartMenu(false);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                    >
                      Atualizar dados
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Atividade recente</h2>
              <p className="mt-1 text-xs text-muted-foreground">Últimas ações registradas</p>
            </div>
            <Link
              href="/super-admin/activity"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                ))
              : (data?.activity ?? []).slice(0, 4).map((item) => (
                  <div key={item.user + item.target} className="flex gap-3">
                    <Avatar initials={item.initials} className="h-8 w-8 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-5">
                        <span className="font-medium text-foreground">{item.user}</span>{" "}
                        <span className="text-muted-foreground">{item.action}</span>{" "}
                        <span className="font-medium text-foreground">{item.target}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Usuários do sistema</h2>
              <p className="mt-1 text-xs text-muted-foreground">Super-admins, admins e funcionários</p>
            </div>
            <Link
              href="/super-admin/users"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Ver usuários <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {usersLoading || isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
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
              : (users ?? []).slice(0, 3).map((user) => (
                  <div key={user.email} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/50 transition-colors">
                    <Avatar initials={user.initials} className="h-8 w-8 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{user.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                    <Status>{user.status}</Status>
                  </div>
                ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Saúde das integrações</h2>
              <p className="mt-1 text-xs text-muted-foreground">Status das conexões externas</p>
            </div>
            <Link
              href="/super-admin/integrations"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Ver integrações <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-0 px-5">
            {[
              { name: "API de produção", detail: "api.exemplo.com/v1", status: "Ativa", latency: "42 ms" },
              { name: "Servidor de arquivos", detail: "MCP · files.internal", status: "Ativa", latency: "86 ms" },
              { name: "Ambiente de homologação", detail: "staging.exemplo.com", status: "Atenção", latency: "—" },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between border-b border-border py-4 last:border-0"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{item.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{item.detail}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-[10px] text-muted-foreground sm:inline">{item.latency}</span>
                  <Status>{item.status}</Status>
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
            href="/super-admin/integrations"
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
