"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, FileText } from "lucide-react";
import { ActivityChart } from "@/components/charts";
import { Button, Card, PageHeading, Skeleton } from "@/components/ui";
import { mockApi } from "@/lib/api";
import { downloadReportPdf } from "@/lib/download";

export function ReportsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["reports"], queryFn: mockApi.reports });
  const [period, setPeriod] = useState("Últimos 30 dias");
  const [environment, setEnvironment] = useState("Todos os ambientes");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [environmentOpen, setEnvironmentOpen] = useState(false);

  const periodRef = useRef<HTMLDivElement>(null);
  const environmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
        setPeriodOpen(false);
      }
      if (environmentRef.current && !environmentRef.current.contains(event.target as Node)) {
        setEnvironmentOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <Button
            onClick={() =>
              downloadReportPdf({
                title: `Relatório Executivo Omnichannel - ${period}`,
                filename: `relatorio-executivo-${period.toLowerCase().replace(/\s+/g, "-")}.pdf`,
              })
            }
          >
            <FileText size={15} />
            Exportar PDF Executivo (Java)
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <div ref={periodRef} className="relative">
          <Button
            variant="outline"
            className="h-9 text-xs"
            onClick={() => {
              setPeriodOpen(!periodOpen);
              setEnvironmentOpen(false);
            }}
          >
            {period}
            <ChevronDown size={14} />
          </Button>
          <AnimatePresence>
            {periodOpen && (
              <OptionsMenu
                options={["Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias"]}
                onSelect={(value) => {
                  setPeriod(value);
                  setPeriodOpen(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>

        <div ref={environmentRef} className="relative">
          <Button
            variant="outline"
            className="h-9 text-xs"
            onClick={() => {
              setEnvironmentOpen(!environmentOpen);
              setPeriodOpen(false);
            }}
          >
            {environment}
            <ChevronDown size={14} />
          </Button>
          <AnimatePresence>
            {environmentOpen && (
              <OptionsMenu
                options={["Todos os ambientes", "Produção", "Homologação"]}
                onSelect={(value) => {
                  setEnvironment(value);
                  setEnvironmentOpen(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <Skeleton className="h-3.5 w-28" />
                <div className="flex items-baseline justify-between pt-1">
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-2.5 w-24" />
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
                    <span className="text-[11px] font-medium text-emerald-700">{item.change}</span>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neutral-800 transition-all duration-500"
                      style={{ width: item.width }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">vs. período anterior</p>
                </Card>
              </motion.div>
            ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Uso ao longo do tempo</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Atividade diária · {period} · {environment}
            </p>
          </div>
          {isLoading ? (
            <div className="h-[240px] flex items-end gap-2 border-b border-border pb-2 pt-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-t-[3px]"
                  style={{ height: `${25 + ((i * 17) % 65)}%` }}
                />
              ))}
            </div>
          ) : (
            <ActivityChart />
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Resumo por categoria</h2>
          <p className="mt-1 text-xs text-muted-foreground">Distribuição de eventos</p>
          <div className="mt-6 space-y-5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                ))
              : [
                  ["Requisições", "48%", "84%"],
                  ["Arquivos", "26%", "62%"],
                  ["Usuários", "18%", "44%"],
                  ["Outros", "8%", "22%"],
                ].map(([name, percent, width]) => (
                  <div key={name}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="text-muted-foreground">{percent}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width }}
                        className="h-full rounded-full bg-neutral-800 transition-all duration-500"
                      />
                    </div>
                  </div>
                ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function OptionsMenu({
  options,
  onSelect,
}: {
  options: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ type: "spring", stiffness: 450, damping: 30, bounce: 0.1 }}
      className="absolute left-0 top-11 z-20 min-w-44 rounded-xl border border-border bg-white p-1.5 shadow-lg"
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-muted transition-colors active:scale-[0.99]"
        >
          {option}
        </button>
      ))}
    </motion.div>
  );
}
