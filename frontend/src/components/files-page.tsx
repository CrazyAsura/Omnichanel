"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  ChevronRight,
  CloudUpload,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  MoreHorizontal,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button, Card, PageHeading, Pagination, SearchField, Skeleton } from "@/components/ui";
import { mockApi, createDocumentApi, updateDocumentAccessApi, deleteDocumentApi } from "@/lib/api";
import { downloadCsv } from "@/lib/download";


type AccessLevel = "all" | "admin" | "super-admin";
type ManagedFile = { id?: string; name: string; owner: string; size: string; updated: string; type: string; accessLevel?: string };

function fileHref(fileName: string, base = "/super-admin/files") {
  return `${base}/${encodeURIComponent(fileName)}`;
}

function findFileByName(files: ManagedFile[], targetName: string): ManagedFile | undefined {
  if (!targetName) return undefined;
  let decoded = targetName;
  try {
    decoded = decodeURIComponent(targetName);
  } catch {
    decoded = targetName;
  }

  return files.find((item) => {
    if (item.name === targetName || item.name === decoded) return true;
    try {
      if (decodeURIComponent(item.name) === decoded) return true;
      if (item.name === decodeURIComponent(decoded)) return true;
      if (encodeURIComponent(item.name) === targetName) return true;
    } catch {
      // ignora erros de decodificação de strings já decodificadas
    }
    if (item.name.normalize("NFC") === decoded.normalize("NFC")) return true;
    if (item.name.normalize("NFD") === decoded.normalize("NFD")) return true;
    return false;
  });
}


function useManagedFiles() {
  return useQuery({ queryKey: ["files"], queryFn: mockApi.files });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionType(fileName: string) {
  const extension = fileName.split(".").pop()?.toUpperCase() ?? "FILE";
  return extension === "DOCX" ? "DOC" : extension;
}

function accessLabel(level: string | undefined) {
  switch (level) {
    case "admin":
      return "Somente administradores e super-administradores podem consultar este documento.";
    case "super-admin":
      return "Somente super-administradores podem consultar este documento.";
    default:
      return "Todos os usuários autenticados podem consultar este documento.";
  }
}


export function FilesPage() {
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin") ? "/admin/files" : "/super-admin/files";
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useManagedFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [fileType, setFileType] = useState("Todos os tipos");
  const [menuTarget, setMenuTarget] = useState<{ file: ManagedFile; top: number; left: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ManagedFile | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listeners to close portal dropdown without causing any table scroll
  useEffect(() => {
    if (!menuTarget) return;
    const handleScroll = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.("[data-file-menu]")) return;
      setMenuTarget(null);
    };
    const handleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-file-menu]")) return;
      setMenuTarget(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuTarget(null);
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuTarget]);

  const visible = data.filter(
    (file) =>
      `${file.name} ${file.owner}`.toLowerCase().includes(query.toLowerCase()) &&
      (fileType === "Todos os tipos" || file.type === fileType)
  );

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, fileType]);

  const totalPages = Math.ceil(visible.length / PAGE_SIZE);
  const paginatedFiles = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleToggleMenu(event: React.MouseEvent<HTMLButtonElement>, file: ManagedFile) {
    event.stopPropagation();
    if (menuTarget?.file.name === file.name) {
      setMenuTarget(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192; // 12rem = 192px
    const left = Math.max(16, rect.right - menuWidth);
    const top = rect.bottom + 6;
    setMenuTarget({ file, top, left });
  }

  async function deleteFile(file: ManagedFile) {
    if (!deleteReason.trim()) return;
    try {
      await deleteDocumentApi(file.name, deleteReason.trim());
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      setMenuTarget(null);
      setDeleteTarget(null);
      setDeleteReason("");
      setNotice(`${file.name} foi excluído e registrado no SQL Server.`);
    } catch {
      setNotice("Falha ao excluir o documento no SQL Server.");
    }
  }

  async function addFiles(selected: FileList | null) {
    if (!selected?.length) return;
    try {
      for (const file of Array.from(selected)) {
        await createDocumentApi({
          name: file.name,
          owner: "Marina Costa",
          size: formatFileSize(file.size),
          type: extensionType(file.name),
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      setNotice(`${selected.length} arquivo(s) salvos no SQL Server.`);
    } catch {
      setNotice("Falha ao salvar arquivo(s) no SQL Server.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const metricCards = [
    ["Armazenamento utilizado", "68,4 GB", "de 100 GB disponíveis"],
    ["Arquivos", isLoading ? "—" : `${visible.length}`, "+124 neste mês"],
    ["Compartilhados", "316", "em 42 pastas"],
  ];

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
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.csv,.txt,.xlsx"
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <CloudUpload size={15} />
              Adicionar arquivos
            </Button>
          </>
        }
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status"
            className="mb-4 rounded-lg border border-border bg-white px-4 py-3 text-xs text-stone-600 shadow-sm"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {metricCards.map(([label, value, hint], index) => (
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
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
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
              <option>TXT</option>
              <option>XLSX</option>
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
          <table className="w-full min-w-[680px] text-left">
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-2.5 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-3.5 w-24" />
                    </td>
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-3.5 w-16" />
                    </td>
                    <td className="px-4 py-3.5">
                      <Skeleton className="h-3.5 w-20" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Skeleton className="ml-auto h-7 w-7 rounded-md" />
                    </td>
                  </tr>
                ))
              ) : paginatedFiles.length > 0 ? (
                paginatedFiles.map((file, i) => (
                  <motion.tr
                    key={file.name}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30, delay: i * 0.02 }}
                    className="border-b border-border last:border-0 hover:bg-stone-50/60 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={fileHref(file.name, basePath)} className="flex items-center gap-3 group">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                          {file.type === "PDF" ? (
                            <FileText size={16} />
                          ) : file.type === "CSV" ? (
                            <FileSpreadsheet size={16} />
                          ) : (
                            <File size={16} />
                          )}
                        </span>
                        <span>
                          <span className="block text-xs font-medium text-foreground group-hover:underline">
                            {file.name}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {file.type} · Documento interno
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{file.owner}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{file.size}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{file.updated}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        aria-label={`Mais opções para ${file.name}`}
                        aria-expanded={menuTarget?.file.name === file.name}
                        onClick={(e) => handleToggleMenu(e, file)}
                        className={`rounded-md p-1.5 transition active:scale-95 ${
                          menuTarget?.file.name === file.name
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-muted-foreground">
                    Nenhum arquivo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <Skeleton className="h-3 w-36" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ) : (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={visible.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      {/* Floating 3-dots portal menu to completely prevent scrolling documents */}
      {mounted &&
        menuTarget &&
        createPortal(
          <motion.div
            key={menuTarget.file.name}
            data-file-menu
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 450, damping: 30, bounce: 0.1 }}
            style={{
              position: "fixed",
              top: `${menuTarget.top}px`,
              left: `${menuTarget.left}px`,
            }}
            className="z-[90] w-48 rounded-xl border border-border bg-white p-1.5 text-left shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={fileHref(menuTarget.file.name, basePath)}
              onClick={() => setMenuTarget(null)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Eye size={14} />
              Ver detalhes
            </Link>
            <Link
              href={`${fileHref(menuTarget.file.name, basePath)}/access`}
              onClick={() => setMenuTarget(null)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <LockKeyhole size={14} />
              Acesso
            </Link>
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(menuTarget.file);
                setDeleteReason("");
                setMenuTarget(null);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-700 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          </motion.div>,
          document.body
        )}

      <DeleteFileDialog
        file={deleteTarget}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteFile(deleteTarget)}
      />
    </motion.div>
  );
}

function DeleteFileDialog({
  file,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  file: ManagedFile | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCancel();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-file-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
            className="w-full max-w-md"
          >
            <Card className="p-5 shadow-xl sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                  <Trash2 size={17} />
                </span>
                <div>
                  <h2 id="delete-file-title" className="text-sm font-semibold">
                    Excluir arquivo
                  </h2>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{file.name}</p>
                </div>
              </div>
              <label htmlFor="delete-file-reason" className="mb-1.5 mt-5 block text-xs font-medium">
                Justificativa obrigatória
              </label>
              <textarea
                id="delete-file-reason"
                autoFocus
                required
                minLength={8}
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder="Descreva por que este arquivo será excluído..."
                className="min-h-24 w-full resize-y rounded-lg border border-border bg-white p-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                A justificativa será registrada no histórico desta demonstração.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={reason.trim().length < 8}
                  onClick={onConfirm}
                >
                  Confirmar exclusão
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FileDetailsPage({ fileName }: { fileName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin") ? "/admin/files" : "/super-admin/files";
  const { data = [], isLoading } = useManagedFiles();
  const file = findFileByName(data, fileName);
  const access = ((file as any)?.accessLevel as AccessLevel) || "all";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <Card className="min-h-[480px] p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
          <Card className="h-fit p-5 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </Card>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <Card className="mx-auto mt-12 max-w-xl p-8 text-center">
          <h1 className="text-lg font-semibold">Documento não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este arquivo não existe nos dados de demonstração.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => router.push(basePath)}>
            <ArrowLeft size={15} />
            Voltar aos arquivos
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
      className="mx-auto max-w-4xl"
    >
      <button
        type="button"
        onClick={() => router.push(basePath)}
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Arquivos
      </button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[.15em] text-muted-foreground">
            Detalhes do documento
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{file.name}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {file.type} · {file.size} · Atualizado {file.updated}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`${fileHref(file.name, basePath)}/access`)}>
          <LockKeyhole size={15} />
          Gerenciar acesso
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Card className="min-h-[480px] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-stone-50/70 px-5 py-3 text-xs font-medium">
            <FileText size={15} />
            Prévia do documento
          </div>
          <article className="mx-auto max-w-2xl px-7 py-10 sm:px-12">
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Prévia demonstrativa</p>
            <h2 className="mt-4 text-xl font-semibold">{file.name.replace(/\.[^.]+$/, "")}</h2>
            <p className="mt-5 text-sm leading-7 text-stone-600">
              Este espaço apresenta uma prévia do conteúdo do documento. A versão conectada exibirá o
              texto extraído do arquivo e permitirá consultar suas referências.
            </p>
            <div className="mt-8 space-y-3">
              <div className="h-2 w-full rounded bg-stone-100" />
              <div className="h-2 w-[94%] rounded bg-stone-100" />
              <div className="h-2 w-[88%] rounded bg-stone-100" />
              <div className="h-2 w-[72%] rounded bg-stone-100" />
            </div>
            <h3 className="mt-8 text-sm font-semibold">Informações do arquivo</h3>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              O arquivo foi adicionado por {file.owner}. Para visualizar o conteúdo original, conectar
              armazenamento e habilitar a leitura do documento no ambiente.
            </p>
          </article>
        </Card>
        <Card className="h-fit p-5">
          <h2 className="text-sm font-semibold">Acesso</h2>
          <p className="mt-1 text-xs text-muted-foreground">Quem pode consultar este documento</p>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-stone-50 p-3">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-stone-500" />
            <span className="text-xs leading-5">{accessLabel(access)}</span>
          </div>
          <Link
            href={`${fileHref(file.name, basePath)}/access`}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-stone-700 hover:text-stone-950 transition-colors"
          >
            Editar permissões
            <ChevronRight size={14} />
          </Link>
          <dl className="mt-5 space-y-3 border-t border-border pt-4 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Proprietário</dt>
              <dd className="text-right font-medium">{file.owner}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Modificado</dt>
              <dd className="text-right font-medium">{file.updated}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Tamanho</dt>
              <dd className="text-right font-medium">{file.size}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </motion.div>
  );
}

export function FileAccessPage({ fileName }: { fileName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/admin") ? "/admin/files" : "/super-admin/files";
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useManagedFiles();
  const file = findFileByName(data, fileName);
  const [level, setLevel] = useState<AccessLevel>("all");
  const [saved, setSaved] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    if (file && (file as any).accessLevel) {
      setLevel((file as any).accessLevel as AccessLevel);
    }
  }, [file]);

  async function savePermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    try {
      await updateDocumentAccessApi(file.name, level);
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      setSaved(true);
    } catch {
      // erro tratado
    }
  }

  async function deleteDocument() {
    if (!deleteReason.trim() || !file) return;
    try {
      await deleteDocumentApi(file.name, deleteReason.trim());
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      router.push(basePath);
    } catch {
      // erro tratado
    }
  }

  const options: { value: AccessLevel; title: string; description: string }[] = [
    {
      value: "all",
      title: "Não restrito",
      description: "Funcionários, admins e super-admins podem consultar o arquivo.",
    },
    {
      value: "admin",
      title: "Restrito: Admin ou superior",
      description: "Somente pessoas com cargo de Admin ou Super-admin podem consultar.",
    },
    {
      value: "super-admin",
      title: "Restrito: Super-admin",
      description: "Somente pessoas com cargo de Super-admin podem consultar.",
    },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!file) {
    return (
      <Card className="mx-auto mt-12 max-w-xl p-8 text-center">
        <h1 className="text-lg font-semibold">Documento não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Este arquivo não existe nos dados disponíveis.</p>
        <Button variant="outline" className="mt-5" onClick={() => router.push(basePath)}>
          <ArrowLeft size={15} />
          Voltar aos arquivos
        </Button>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
      className="mx-auto max-w-3xl"
    >
      <button
        type="button"
        onClick={() => router.push(fileHref(file.name, basePath))}
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Detalhes do documento
      </button>
      <PageHeading eyebrow="Permissões do documento" title="Acesso" description={file.name} />
      <Card className="p-5 sm:p-7">
        <form onSubmit={savePermissions}>
          <fieldset>
            <legend className="text-sm font-semibold">Quem pode acessar este arquivo?</legend>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Escolha o nível mínimo de cargo. A configuração é aplicada neste protótipo local.
            </p>
            <div className="mt-5 space-y-3">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                    level === option.value
                      ? "border-stone-500 bg-stone-50"
                      : "border-border hover:bg-stone-50/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="access-level"
                    value={option.value}
                    checked={level === option.value}
                    onChange={() => {
                      setLevel(option.value);
                      setSaved(false);
                    }}
                    className="mt-0.5 accent-stone-800"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {option.title}
                      {level === option.value && <Check size={14} />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              className="text-red-700 hover:bg-red-50"
              onClick={() => {
                setDeleteReason("");
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 size={15} />
              Excluir documento
            </Button>
            <div className="flex items-center gap-3">
              {saved && (
                <span role="status" className="text-xs text-emerald-700 font-medium">
                  Permissões salvas.
                </span>
              )}
              <Button type="submit">
                <Save size={15} />
                Salvar acesso
              </Button>
            </div>
          </div>
        </form>
      </Card>
      <DeleteFileDialog
        file={deleteDialogOpen ? file : null}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={deleteDocument}
      />
    </motion.div>
  );
}
