"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent, type PointerEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Bot, Check, CircleHelp, Copy, Database, FileOutput, GitBranch, KeyRound, Link2, MoreHorizontal, MousePointer2, Play, Plus, Save, Search, Settings2, Sparkles, Trash2, Webhook, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "trigger" | "http" | "mcp" | "transform" | "agent" | "output";
type Step = { id: string; kind: Kind; x: number; y: number; label: string; endpoint?: string; method?: string; credentialId?: string; operation?: string };
type Link = { id: string; source: string; target: string };
type Workflow = { id: string; name: string; steps: Step[]; links: Link[]; updatedAt: number };
type Connection = { id: string; name: string; kind: "REST API" | "MCP Server"; endpoint: string; maskedKey: string; example?: boolean };
type Run = { id: string; workflowId: string; at: number; status: "Concluída" | "Falhou"; detail: string; steps: number };
type Tab = "editor" | "connections" | "runs";

const STORAGE = "omnichanel-integration-workspace-v1";
const NODE_WIDTH = 232;
const NODE_HEIGHT = 112;
const CATALOG: { kind: Kind; title: string; caption: string; icon: typeof Webhook; tone: string }[] = [
  { kind: "trigger", title: "Início manual", caption: "Dispare o fluxo sob demanda", icon: Play, tone: "bg-orange-50 text-orange-600 border-orange-200" },
  { kind: "http", title: "Requisição HTTP", caption: "Consulte uma API externa", icon: Webhook, tone: "bg-blue-50 text-blue-600 border-blue-200" },
  { kind: "mcp", title: "Ferramenta MCP", caption: "Acesse um servidor MCP", icon: Database, tone: "bg-violet-50 text-violet-600 border-violet-200" },
  { kind: "transform", title: "Transformar dados", caption: "Organize a saída anterior", icon: GitBranch, tone: "bg-teal-50 text-teal-600 border-teal-200" },
  { kind: "agent", title: "Agente de IA", caption: "Analise com o assistente", icon: Bot, tone: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200" },
  { kind: "output", title: "Resultado", caption: "Finalize e entregue os dados", icon: FileOutput, tone: "bg-emerald-50 text-emerald-600 border-emerald-200" },
];
const EXAMPLES: Connection[] = [
  { id: "example-api", name: "API de exemplo", kind: "REST API", endpoint: "https://api.exemplo.com/v1", maskedKey: "Não configurada", example: true },
  { id: "example-mcp", name: "Servidor MCP de exemplo", kind: "MCP Server", endpoint: "https://mcp.exemplo.com", maskedKey: "Não configurada", example: true },
];
const INITIAL: Workflow = {
  id: "example-flow", name: "Consulta de documentos", updatedAt: Date.now(),
  steps: [
    { id: "example-start", kind: "trigger", x: 100, y: 340, label: "Início manual" },
    { id: "example-agent", kind: "agent", x: 440, y: 340, label: "Analisar documentos", operation: "Leitor de documentos internos" },
    { id: "example-output", kind: "output", x: 780, y: 340, label: "Entregar resposta", operation: "Resposta do chat" },
  ],
  links: [
    { id: "example-link-1", source: "example-start", target: "example-agent" },
    { id: "example-link-2", source: "example-agent", target: "example-output" },
  ],
};

function nextStep(kind: Kind, x: number, y: number): Step {
  return { id: crypto.randomUUID(), kind, x, y, label: CATALOG.find((item) => item.kind === kind)!.title, method: kind === "http" ? "GET" : undefined };
}

function reaches(links: Link[], start: string, target: string): boolean {
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (id === target) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return links.filter((link) => link.source === id).some((link) => visit(link.target));
  };
  return visit(start);
}

export function IntegrationPage() {
  const [flows, setFlows] = useState<Workflow[]>([INITIAL]);
  const [activeId, setActiveId] = useState(INITIAL.id);
  const [connections, setConnections] = useState<Connection[]>(EXAMPLES);
  const [runs, setRuns] = useState<Run[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("editor");
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL.steps[1].id);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [zoom, setZoom] = useState(0.9);
  const [notice, setNotice] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flowMenuOpen, setFlowMenuOpen] = useState(false);
  const [connectionName, setConnectionName] = useState("");
  const [connectionKind, setConnectionKind] = useState<Connection["kind"]>("REST API");
  const [connectionEndpoint, setConnectionEndpoint] = useState("");
  const [connectionKey, setConnectionKey] = useState("");
  const [connectionFilter, setConnectionFilter] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; x: number; y: number; clientX: number; clientY: number } | null>(null);
  const flow = flows.find((item) => item.id === activeId) ?? flows[0];
  const selected = flow?.steps.find((step) => step.id === selectedId);
  const selectedLink = flow?.links.find((link) => link.id === selectedLinkId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE) ?? "null") as { flows?: Workflow[]; connections?: Connection[]; runs?: Run[]; activeId?: string } | null;
        if (saved?.flows?.length && Array.isArray(saved.flows)) {
          setFlows(saved.flows);
          setActiveId(saved.flows.some((item) => item.id === saved.activeId) ? saved.activeId! : saved.flows[0].id);
          setSelectedId(null);
        }
        if (Array.isArray(saved?.connections)) setConnections(saved.connections);
        if (Array.isArray(saved?.runs)) setRuns(saved.runs);
      } catch { /* Ignore malformed local demo data. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE, JSON.stringify({ flows, activeId, connections, runs: runs.slice(0, 40) }));
  }, [flows, activeId, connections, runs, hydrated]);

  const changeFlow = useCallback((update: (current: Workflow) => Workflow) => {
    setFlows((current) => current.map((item) => item.id === activeId ? { ...update(item), updatedAt: Date.now() } : item));
  }, [activeId]);

  const updateStep = (id: string, patch: Partial<Step>) => changeFlow((current) => ({ ...current, steps: current.steps.map((step) => step.id === id ? { ...step, ...patch } : step) }));

  const addStep = (kind: Kind, x?: number, y?: number) => {
    const step = nextStep(kind, x ?? 220 + flow.steps.length * 32, y ?? 180 + flow.steps.length * 28);
    changeFlow((current) => ({ ...current, steps: [...current.steps, step] }));
    setSelectedId(step.id);
    setSelectedLinkId(null);
    setInspectorOpen(true);
    setTab("editor");
    setNotice(`${step.label} adicionado. Arraste o nó e conecte as portas.`);
  };

  const addLink = (source: string, target: string) => {
    setConnectFrom(null);
    if (source === target || flow.links.some((link) => link.source === source && link.target === target) || reaches(flow.links, target, source)) {
      setNotice("Conexão inválida ou ciclo detectado.");
      return;
    }
    if (flow.steps.find((step) => step.id === source)?.kind === "output" || flow.steps.find((step) => step.id === target)?.kind === "trigger") {
      setNotice("Conecte a saída de uma etapa à entrada de uma etapa seguinte.");
      return;
    }
    changeFlow((current) => ({ ...current, links: [...current.links, { id: crypto.randomUUID(), source, target }] }));
    setNotice("Etapas conectadas.");
  };

  const deleteSelected = useCallback(() => {
    if (selectedLinkId) {
      changeFlow((current) => ({ ...current, links: current.links.filter((link) => link.id !== selectedLinkId) }));
      setSelectedLinkId(null);
    } else if (selectedId) {
      changeFlow((current) => ({ ...current, steps: current.steps.filter((step) => step.id !== selectedId), links: current.links.filter((link) => link.source !== selectedId && link.target !== selectedId) }));
      setSelectedId(null);
    }
  }, [changeFlow, selectedId, selectedLinkId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnectFrom(null); setFlowMenuOpen(false);
        if (dialogOpen) { setDialogOpen(false); setConnectionKey(""); }
        return;
      }
      if (!(["Delete", "Backspace"].includes(event.key)) || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (selectedId || selectedLinkId) { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, selectedId, selectedLinkId, dialogOpen]);

  const createFlow = () => {
    const id = crypto.randomUUID();
    const step = nextStep("trigger", 180, 320);
    setFlows((current) => [...current, { id, name: "Novo fluxo", steps: [step], links: [], updatedAt: Date.now() }]);
    setActiveId(id); setSelectedId(step.id); setSelectedLinkId(null); setTab("editor");
    setNotice("Fluxo criado. Adicione etapas pela biblioteca.");
  };

  const duplicateFlow = () => {
    const id = crypto.randomUUID();
    setFlows((current) => [...current, { ...flow, id, name: `${flow.name} (cópia)`, updatedAt: Date.now() }]);
    setActiveId(id); setSelectedId(null);
    setNotice("Cópia criada.");
  };

  const renameFlow = () => {
    const name = window.prompt("Nome do fluxo", flow.name)?.trim();
    if (!name) return;
    changeFlow((current) => ({ ...current, name: name.slice(0, 80) }));
    setNotice("Fluxo renomeado.");
  };

  const deleteFlow = () => {
    if (flows.length === 1) { setNotice("Mantenha ao menos um fluxo no espaço de trabalho."); return; }
    if (!window.confirm(`Excluir o fluxo “${flow.name}”?`)) return;
    const next = flows.filter((item) => item.id !== flow.id);
    setFlows(next); setActiveId(next[0].id); setSelectedId(null); setSelectedLinkId(null);
    setNotice("Fluxo excluído.");
  };

  const runFlow = async () => {
    if (runningId) return;
    const starts = flow.steps.filter((step) => step.kind === "trigger");
    const outputs = flow.steps.filter((step) => step.kind === "output");
    const missingConnection = flow.steps.find((step) => (step.kind === "http" || step.kind === "mcp") && (!step.credentialId || !connections.some((item) => item.id === step.credentialId && !item.example)));
    const reachable = new Set<string>();
    const walk = (id: string) => { if (reachable.has(id)) return; reachable.add(id); flow.links.filter((link) => link.source === id).forEach((link) => walk(link.target)); };
    starts.forEach((step) => walk(step.id));
    const problem = starts.length !== 1 ? "Adicione exatamente um início manual." : !outputs.length ? "Adicione uma etapa de resultado." : missingConnection ? `Configure uma conexão cadastrada para “${missingConnection.label}”.` : flow.steps.some((step) => !reachable.has(step.id)) ? "Conecte todas as etapas ao início." : !outputs.some((step) => reachable.has(step.id)) ? "Conecte um resultado ao início." : "";
    if (problem) {
      setNotice(problem);
      setRuns((current) => [{ id: crypto.randomUUID(), workflowId: flow.id, at: Date.now(), status: "Falhou", detail: problem, steps: 0 }, ...current]);
      setTab("runs");
      return;
    }
    const pending = new Set(reachable);
    const order: Step[] = [];
    while (pending.size) {
      const ready = flow.steps.find((step) => pending.has(step.id) && flow.links.filter((link) => link.target === step.id).every((link) => !pending.has(link.source)));
      if (!ready) break;
      order.push(ready); pending.delete(ready.id);
    }
    setCompletedIds([]);
    for (const step of order) {
      setRunningId(step.id);
      await new Promise((resolve) => setTimeout(resolve, 420));
      setCompletedIds((current) => [...current, step.id]);
    }
    setRunningId(null);
    setRuns((current) => [{ id: crypto.randomUUID(), workflowId: flow.id, at: Date.now(), status: "Concluída", detail: "Execução simulada: nenhuma API ou ferramenta externa foi chamada.", steps: order.length }, ...current]);
    setNotice(`Simulação concluída: ${order.length} etapas percorridas.`);
    setTab("runs");
  };

  const saveConnection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = connectionName.trim(), endpoint = connectionEndpoint.trim(), key = connectionKey.trim();
    if (!name || !key || !endpoint) return;
    if (key.length < 8) { setNotice("Use uma chave com pelo menos oito caracteres para evitar exposição no identificador."); return; }
    try { if (!["http:", "https:"].includes(new URL(endpoint).protocol)) throw new Error("Protocolo inválido"); } catch { setNotice("Informe uma URL HTTP ou HTTPS válida para a conexão."); return; }
    if (connections.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setNotice("Já existe uma conexão com esse nome."); return; }
    setConnections((current) => [...current, { id: crypto.randomUUID(), name, kind: connectionKind, endpoint, maskedKey: `•••• ${key.slice(-4)}` }]);
    setConnectionName(""); setConnectionEndpoint(""); setConnectionKey(""); setDialogOpen(false);
    setNotice("Conexão adicionada ao protótipo. A chave não foi armazenada nem enviada.");
  };

  const closeDialog = () => { setDialogOpen(false); setConnectionKey(""); };
  const filteredCatalog = CATALOG.filter((item) => `${item.title} ${item.caption}`.toLowerCase().includes(catalogFilter.toLowerCase()));
  const visibleConnections = connections.filter((item) => `${item.name} ${item.kind} ${item.endpoint}`.toLowerCase().includes(connectionFilter.toLowerCase()));
  const flowRuns = runs.filter((item) => item.workflowId === flow.id);

  function onNodePointerDown(event: PointerEvent<HTMLDivElement>, step: Step) {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = { id: step.id, x: step.x, y: step.y, clientX: event.clientX, clientY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(step.id); setSelectedLinkId(null); setInspectorOpen(true);
  }

  function onNodePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    updateStep(drag.id, { x: Math.max(20, Math.round(drag.x + (event.clientX - drag.clientX) / zoom)), y: Math.max(20, Math.round(drag.y + (event.clientY - drag.clientY) / zoom)) });
  }

  function onPaletteDrag(event: DragEvent<HTMLButtonElement>, kind: Kind) {
    event.dataTransfer.setData("application/x-omnichannel-node", kind);
    event.dataTransfer.effectAllowed = "copy";
  }

  function onCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/x-omnichannel-node") as Kind;
    if (!CATALOG.some((item) => item.kind === kind) || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    addStep(kind, Math.max(20, Math.round((event.clientX - rect.left + viewportRef.current.scrollLeft) / zoom - NODE_WIDTH / 2)), Math.max(20, Math.round((event.clientY - rect.top + viewportRef.current.scrollTop) / zoom - NODE_HEIGHT / 2)));
  }

  return (
    <div className="relative flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-[#f8f9fb] text-stone-900">
      <header className="z-20 flex h-[70px] shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 pl-14 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600"><GitBranch size={18} /></div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[.16em] text-stone-400">Workspace / Integrações</p>
            <div className="flex items-center gap-2">
              <select aria-label="Selecionar fluxo" value={flow.id} onChange={(event) => { setActiveId(event.target.value); setSelectedId(null); setSelectedLinkId(null); setCompletedIds([]); }} className="max-w-[180px] cursor-pointer truncate border-0 bg-transparent p-0 text-sm font-semibold outline-none sm:max-w-[260px]">
                {flows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <span className="hidden rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-500 sm:inline-flex">Protótipo local</span>
            </div>
          </div>
        </div>
        <nav aria-label="Seções de integrações" className="hidden rounded-xl border border-stone-200 bg-stone-50 p-1 md:flex">
          {([{ id: "editor", label: "Editor", icon: GitBranch }, { id: "connections", label: "Conexões", icon: KeyRound }, { id: "runs", label: "Execuções", icon: Activity }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition", tab === id ? "bg-white text-stone-950 shadow-sm" : "text-stone-500 hover:text-stone-900")}><Icon size={14} />{label}</button>)}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative"><button type="button" onClick={() => setFlowMenuOpen((value) => !value)} title="Ações do fluxo" aria-label="Ações do fluxo" aria-expanded={flowMenuOpen} className="rounded-lg border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-50"><MoreHorizontal size={16} /></button>{flowMenuOpen && <div className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-stone-200 bg-white p-1.5 text-xs shadow-lg"><button type="button" onClick={() => { setFlowMenuOpen(false); renameFlow(); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-stone-50">Renomear fluxo</button><button type="button" onClick={() => { setFlowMenuOpen(false); duplicateFlow(); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-stone-50">Duplicar fluxo</button><button type="button" onClick={() => { setFlowMenuOpen(false); deleteFlow(); }} className="block w-full rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">Excluir fluxo</button></div>}</div>
          <button type="button" onClick={createFlow} className="hidden items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium hover:bg-stone-50 sm:inline-flex"><Plus size={14} />Novo fluxo</button>
          <button type="button" onClick={() => { localStorage.setItem(STORAGE, JSON.stringify({ flows, activeId, connections, runs })); setNotice("Alterações salvas neste navegador."); }} className="hidden items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium hover:bg-stone-50 lg:inline-flex"><Save size={14} />Salvar</button>
          <button type="button" disabled={Boolean(runningId)} onClick={runFlow} className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"><Play size={13} fill="currentColor" />{runningId ? "Executando" : "Simular"}</button>
        </div>
      </header>

      <div className="flex h-10 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 text-[11px] text-stone-500 md:hidden">
        <div className="flex gap-3">{(["editor", "connections", "runs"] as Tab[]).map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={cn("capitalize", tab === item && "font-semibold text-stone-900")}>{item === "connections" ? "Conexões" : item === "runs" ? "Execuções" : "Editor"}</button>)}</div>
        <button type="button" onClick={createFlow} aria-label="Novo fluxo"><Plus size={16} /></button>
      </div>

      {tab === "editor" ? (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {catalogOpen && <aside className="z-10 hidden w-[246px] shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
            <div className="border-b border-stone-100 px-4 py-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Adicionar etapa</h2><p className="mt-0.5 text-[11px] text-stone-500">Arraste para o canvas ou clique.</p></div><button type="button" aria-label="Fechar biblioteca" onClick={() => setCatalogOpen(false)} className="rounded-md p-1 text-stone-400 hover:bg-stone-100"><X size={15} /></button></div><label className="mt-4 flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-stone-400"><Search size={14} /><input value={catalogFilter} onChange={(event) => setCatalogFilter(event.target.value)} placeholder="Buscar etapas" aria-label="Buscar etapas" className="w-full bg-transparent text-xs text-stone-900 outline-none placeholder:text-stone-400" /></label></div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">{filteredCatalog.map((item) => <button key={item.kind} type="button" draggable onDragStart={(event) => onPaletteDrag(event, item.kind)} onClick={() => addStep(item.kind)} className="flex w-full cursor-grab items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-stone-50 active:cursor-grabbing"><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", item.tone)}><item.icon size={17} /></span><span className="min-w-0"><span className="block text-xs font-semibold">{item.title}</span><span className="block truncate text-[10px] text-stone-500">{item.caption}</span></span><Plus size={13} className="ml-auto shrink-0 text-stone-300" /></button>)}</div>
            <div className="border-t border-stone-100 p-4 text-[11px] leading-5 text-stone-500"><CircleHelp size={14} className="mb-2" />Conecte a saída de um nó à entrada de outro. Use o painel lateral para configurar cada etapa.</div>
          </aside>}

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="z-10 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-3 backdrop-blur sm:px-4">
              <div className="flex items-center gap-1.5"><button type="button" onClick={() => setCatalogOpen((value) => !value)} className="rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50" title="Alternar biblioteca" aria-label="Alternar biblioteca"><Plus size={16} /></button><span className="ml-2 hidden text-[11px] text-stone-500 sm:block">{flow.steps.length} etapas <span className="mx-1 text-stone-300">·</span> {flow.links.length} conexões</span>{connectFrom && <button type="button" onClick={() => setConnectFrom(null)} className="ml-2 rounded-lg bg-orange-50 px-2 py-1 text-[11px] text-orange-700">Selecione uma entrada · cancelar</button>}</div>
              <div className="flex items-center gap-1"><button type="button" onClick={() => setZoom((value) => Math.max(0.55, +(value - 0.1).toFixed(2)))} title="Diminuir zoom" aria-label="Diminuir zoom" className="rounded-md p-1.5 hover:bg-stone-100"><ZoomOut size={16} /></button><span className="w-10 text-center text-[11px] tabular-nums text-stone-500">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.35, +(value + 0.1).toFixed(2)))} title="Aumentar zoom" aria-label="Aumentar zoom" className="rounded-md p-1.5 hover:bg-stone-100"><ZoomIn size={16} /></button><button type="button" onClick={() => { setZoom(0.9); viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" }); }} className="ml-1 rounded-md border border-stone-200 px-2 py-1.5 text-[11px] hover:bg-stone-50">Ajustar</button><button type="button" onClick={() => setInspectorOpen((value) => !value)} title="Alternar configurações" aria-label="Alternar configurações" className="ml-1 rounded-md p-1.5 hover:bg-stone-100"><Settings2 size={16} /></button></div>
            </div>
            <div ref={viewportRef} onDragOver={(event) => event.preventDefault()} onDrop={onCanvasDrop} className="relative min-h-0 flex-1 overflow-auto bg-[#f7f8fa]" style={{ backgroundImage: "radial-gradient(#d8dce3 1px, transparent 1px)", backgroundSize: `${22 * zoom}px ${22 * zoom}px` }}>
              <div style={{ width: 1600 * zoom, height: 960 * zoom, position: "relative" }}>
                <div style={{ width: 1600, height: 960, transform: `scale(${zoom})`, transformOrigin: "top left", position: "absolute" }}>
                  <svg aria-label="Conexões do fluxo" width="1600" height="960" className="pointer-events-none absolute inset-0 overflow-visible">
                    {flow.links.map((link) => {
                      const source = flow.steps.find((step) => step.id === link.source), target = flow.steps.find((step) => step.id === link.target);
                      if (!source || !target) return null;
                      const x1 = source.x + NODE_WIDTH, y1 = source.y + NODE_HEIGHT / 2, x2 = target.x, y2 = target.y + NODE_HEIGHT / 2;
                      const curve = `M ${x1} ${y1} C ${x1 + Math.max(80, (x2 - x1) / 2)} ${y1}, ${x2 - Math.max(80, (x2 - x1) / 2)} ${y2}, ${x2} ${y2}`;
                      return <g key={link.id} className="pointer-events-auto cursor-pointer" onClick={() => { setSelectedLinkId(link.id); setSelectedId(null); setInspectorOpen(true); }}><path d={curve} stroke="transparent" strokeWidth="18" fill="none" /><path d={curve} stroke={selectedLinkId === link.id ? "#ea580c" : "#a8b1bf"} strokeWidth={selectedLinkId === link.id ? 3 : 2} fill="none" /></g>;
                    })}
                  </svg>
                  {flow.steps.map((step) => {
                    const meta = CATALOG.find((item) => item.kind === step.kind)!;
                    const Icon = meta.icon;
                    const active = selectedId === step.id;
                    return <div key={step.id} onPointerDown={(event) => onNodePointerDown(event, step)} onPointerMove={onNodePointerMove} onPointerUp={() => { dragRef.current = null; }} style={{ left: step.x, top: step.y, width: NODE_WIDTH, height: NODE_HEIGHT, touchAction: "none" }} className={cn("absolute cursor-grab select-none rounded-xl border bg-white shadow-[0_4px_18px_rgba(26,32,44,.07)] active:cursor-grabbing", active ? "border-orange-400 ring-[3px] ring-orange-100" : "border-stone-200 hover:border-stone-300", runningId === step.id && "ring-[3px] ring-blue-200", completedIds.includes(step.id) && "border-emerald-400")}> 
                      {step.kind !== "trigger" && <button type="button" aria-label={`Conectar entrada de ${step.label}`} onClick={(event) => { event.stopPropagation(); if (connectFrom) addLink(connectFrom, step.id); else setNotice("Selecione primeiro a saída de outra etapa."); }} className={cn("absolute -left-[7px] top-[50px] z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-stone-400 ring-1 ring-stone-300 hover:bg-orange-500", connectFrom && "bg-orange-500 ring-orange-300")} />}
                      <div className={cn("flex h-1.5 rounded-t-xl", meta.tone.split(" ")[0])} />
                      <div className="flex items-center gap-3 px-3 pt-3"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", meta.tone)}><Icon size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{step.label}</p><p className="mt-0.5 truncate text-[10px] text-stone-500">{step.kind === "http" ? step.method ?? "GET" : step.kind === "agent" ? step.operation ?? "Agente interno" : meta.caption}</p></div><span className="h-2 w-2 shrink-0 rounded-full bg-stone-200" /></div>
                      <div className="mt-3 border-t border-stone-100 px-3 py-2 text-[10px] text-stone-400">{step.kind === "http" || step.kind === "mcp" ? (step.credentialId ? "Conexão selecionada" : "Configure a conexão") : "Etapa de fluxo"}</div>
                      {step.kind !== "output" && <button type="button" aria-label={`Conectar saída de ${step.label}`} onClick={(event) => { event.stopPropagation(); setConnectFrom(step.id); setNotice("Agora clique na entrada da próxima etapa."); }} className={cn("absolute -right-[7px] top-[50px] z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-stone-500 ring-1 ring-stone-300 hover:bg-orange-500", connectFrom === step.id && "bg-orange-500 ring-orange-300")} />}
                    </div>;
                  })}
                </div>
              </div>
              {!flow.steps.length && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-stone-400">Adicione uma etapa para começar o fluxo.</div>}
            </div>
            <div className="absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-[11px] text-stone-500 shadow-sm"><MousePointer2 size={14} className="text-orange-500" />Arraste etapas para organizar; conecte pelos círculos laterais.</div>
            <div className="flex gap-1 overflow-x-auto border-t border-stone-200 bg-white p-2 lg:hidden">{CATALOG.map(({ kind, title, icon: Icon }) => <button key={kind} type="button" onClick={() => addStep(kind)} className="flex shrink-0 items-center gap-1 rounded-lg border border-stone-200 px-2 py-1.5 text-[10px]"><Icon size={13} />{title}</button>)}</div>
          </div>

          {inspectorOpen && <aside className="absolute inset-y-0 right-0 z-20 flex w-[min(330px,90vw)] flex-col border-l border-stone-200 bg-white shadow-xl xl:static xl:shadow-none">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-stone-100 px-4"><div><p className="text-xs font-semibold">Parâmetros</p><p className="text-[10px] text-stone-400">Configure a etapa selecionada</p></div><button type="button" onClick={() => setInspectorOpen(false)} aria-label="Fechar parâmetros" className="rounded-md p-1 hover:bg-stone-100"><X size={16} /></button></div>
            {selected ? <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              <div className="flex items-center gap-3"><div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", CATALOG.find((item) => item.kind === selected.kind)!.tone)}>{(() => { const Icon = CATALOG.find((item) => item.kind === selected.kind)!.icon; return <Icon size={18} />; })()}</div><div><p className="text-sm font-semibold">{CATALOG.find((item) => item.kind === selected.kind)!.title}</p><p className="text-[11px] text-stone-500">ID {selected.id.slice(0, 8)}</p></div></div>
              <label className="block text-[11px] font-medium">Nome da etapa<input value={selected.label} onChange={(event) => updateStep(selected.id, { label: event.target.value })} maxLength={80} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-orange-400" /></label>
              {(selected.kind === "http" || selected.kind === "mcp") && <><label className="block text-[11px] font-medium">Conexão cadastrada<select value={selected.credentialId ?? ""} onChange={(event) => updateStep(selected.id, { credentialId: event.target.value || undefined })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-orange-400"><option value="">Selecione uma conexão</option>{connections.filter((item) => item.kind === (selected.kind === "http" ? "REST API" : "MCP Server")).map((item) => <option key={item.id} value={item.id}>{item.name}{item.example ? " · exemplo" : ""}</option>)}</select></label><button type="button" onClick={() => { setTab("connections"); setDialogOpen(true); }} className="flex items-center gap-1 text-[11px] font-medium text-orange-700 hover:underline"><Plus size={13} />Adicionar conexão</button><label className="block text-[11px] font-medium">{selected.kind === "http" ? "Caminho ou URL da requisição" : "Nome da ferramenta MCP"}<input value={selected.endpoint ?? ""} onChange={(event) => updateStep(selected.id, { endpoint: event.target.value })} placeholder={selected.kind === "http" ? "/v1/recursos" : "consultar_documentos"} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-orange-400" /></label></>}
              {selected.kind === "http" && <label className="block text-[11px] font-medium">Método<select value={selected.method ?? "GET"} onChange={(event) => updateStep(selected.id, { method: event.target.value })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></label>}
              {selected.kind === "agent" && <label className="block text-[11px] font-medium">Modo do agente<select value={selected.operation ?? "Leitor de documentos internos"} onChange={(event) => updateStep(selected.id, { operation: event.target.value })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs"><option>Leitor de documentos internos</option><option>Analista de dados</option><option>Gerador de arquivos</option></select></label>}
              {(selected.kind === "transform" || selected.kind === "output") && <label className="block text-[11px] font-medium">Descrição da saída<input value={selected.operation ?? ""} onChange={(event) => updateStep(selected.id, { operation: event.target.value })} placeholder="Ex.: Resumo para o chat" className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs" /></label>}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-[11px] leading-5 text-stone-500">{selected.kind === "trigger" ? "Inicia a simulação local do fluxo." : selected.kind === "output" ? "Define o ponto de chegada do fluxo." : "Os parâmetros ficam salvos neste navegador. A simulação não envia dados para sistemas externos."}</div>
              <div className="flex gap-2 border-t border-stone-100 pt-4"><button type="button" onClick={() => { const copy = { ...selected, id: crypto.randomUUID(), x: selected.x + 45, y: selected.y + 145 }; changeFlow((current) => ({ ...current, steps: [...current.steps, copy] })); setSelectedId(copy.id); setNotice("Etapa duplicada."); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2 text-[11px] hover:bg-stone-50"><Copy size={13} />Duplicar</button><button type="button" onClick={deleteSelected} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-2 py-2 text-[11px] text-red-600 hover:bg-red-50"><Trash2 size={13} />Excluir</button></div>
            </div> : selectedLink ? <div className="space-y-3 p-4 text-xs"><div className="flex items-center gap-2 font-semibold"><Link2 size={15} />Conexão entre etapas</div><p className="text-stone-500">{flow.steps.find((item) => item.id === selectedLink.source)?.label} → {flow.steps.find((item) => item.id === selectedLink.target)?.label}</p><button type="button" onClick={deleteSelected} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"><Trash2 size={13} />Remover conexão</button></div> : <div className="flex flex-1 flex-col items-center justify-center px-5 text-center text-xs text-stone-400"><MousePointer2 size={24} className="mb-3" />Selecione uma etapa ou conexão no canvas para editar.</div>}
          </aside>}
        </div>
      ) : tab === "connections" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7"><div className="mx-auto max-w-6xl space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-orange-600">Credenciais e serviços</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Conexões</h1><p className="mt-1 text-sm text-stone-500">Selecione serviços nos nós HTTP e MCP. As conexões abaixo são um protótipo local.</p></div><button type="button" onClick={() => setDialogOpen(true)} className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-stone-700"><Plus size={15} />Adicionar integração</button></div>
          <div className="grid gap-3 sm:grid-cols-3"><Metric label="Conexões cadastradas" value={String(connections.filter((item) => !item.example).length)} icon={KeyRound} /><Metric label="APIs REST" value={String(connections.filter((item) => item.kind === "REST API" && !item.example).length)} icon={Webhook} /><Metric label="Servidores MCP" value={String(connections.filter((item) => item.kind === "MCP Server" && !item.example).length)} icon={Database} /></div>
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4"><div><h2 className="text-sm font-semibold">Catálogo de conexões</h2><p className="mt-0.5 text-xs text-stone-500">Metadados demonstrativos; nenhuma conexão externa é realizada.</p></div><label className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-stone-400"><Search size={14} /><input value={connectionFilter} onChange={(event) => setConnectionFilter(event.target.value)} placeholder="Buscar conexão" aria-label="Buscar conexão" className="w-40 bg-transparent text-xs text-stone-900 outline-none" /></label></div><div className="divide-y divide-stone-100">{visibleConnections.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-stone-50"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600">{item.kind === "REST API" ? <Webhook size={18} /> : <Database size={18} />}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-xs font-semibold">{item.name}</p><span className={cn("rounded-full px-2 py-0.5 text-[10px]", item.example ? "bg-stone-100 text-stone-500" : "bg-orange-50 text-orange-700")}>{item.example ? "Exemplo" : "Rascunho"}</span></div><p className="mt-1 truncate text-[11px] text-stone-500">{item.kind} · {item.endpoint}</p></div><span className="hidden text-[11px] text-stone-500 sm:block">{item.maskedKey}</span>{!item.example && <button type="button" onClick={() => { if (!window.confirm(`Remover a conexão “${item.name}”?`)) return; setConnections((current) => current.filter((connection) => connection.id !== item.id)); setNotice("Conexão removida."); }} title="Remover integração" aria-label={`Remover ${item.name}`} className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}</div>)}{!visibleConnections.length && <p className="px-5 py-12 text-center text-sm text-stone-500">Nenhuma conexão encontrada.</p>}</div></div>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">As chaves digitadas são descartadas após salvar; apenas os últimos caracteres aparecem para identificação. Integrações reais exigem armazenamento seguro e APIs no backend.</p>
        </div></div>
      ) : <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-7"><div className="mx-auto max-w-5xl space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.15em] text-orange-600">Histórico do fluxo</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Execuções</h1><p className="mt-1 text-sm text-stone-500">Prévia local para “{flow.name}”. Nenhuma etapa dispara sistemas externos.</p></div><button type="button" disabled={Boolean(runningId)} onClick={runFlow} className="flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50"><Play size={14} />Simular novamente</button></div><div className="overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="border-b border-stone-100 px-5 py-4 text-sm font-semibold">Histórico recente</div>{flowRuns.length ? <div className="divide-y divide-stone-100">{flowRuns.map((item) => <div key={item.id} className="flex items-center gap-4 px-5 py-4"><span className={cn("flex h-9 w-9 items-center justify-center rounded-full", item.status === "Concluída" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>{item.status === "Concluída" ? <Check size={16} /> : <X size={16} />}</span><div className="flex-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold">{item.status}</span><span className="text-[10px] text-stone-400">{item.steps} etapas</span></div><p className="mt-1 text-[11px] text-stone-500">{item.detail}</p></div><time className="text-[11px] text-stone-400">{new Date(item.at).toLocaleString("pt-BR")}</time></div>)}</div> : <div className="flex flex-col items-center justify-center px-4 py-16 text-center"><Activity size={25} className="text-stone-300" /><h2 className="mt-3 text-sm font-semibold">Nenhuma execução ainda</h2><p className="mt-1 text-xs text-stone-500">Use “Simular” para verificar o encadeamento do fluxo.</p></div>}</div></div></div>}

      <AnimatePresence>{notice && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="status" className="absolute bottom-5 left-1/2 z-40 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-xl border border-stone-200 bg-stone-900 px-4 py-3 text-xs text-white shadow-xl"><Sparkles size={14} className="shrink-0 text-orange-300" /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Fechar aviso" className="rounded p-1 hover:bg-white/15"><X size={13} /></button></motion.div>}</AnimatePresence>

      {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}><div role="dialog" aria-modal="true" aria-labelledby="connection-title" className="w-full max-w-[460px] rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-orange-600">Nova conexão</p><h2 id="connection-title" className="mt-1 text-lg font-semibold">Adicionar integração</h2><p className="mt-1 text-xs text-stone-500">Cadastre a identificação da API ou do servidor MCP.</p></div><button type="button" onClick={closeDialog} aria-label="Fechar formulário" className="rounded-md p-1 hover:bg-stone-100"><X size={18} /></button></div><form onSubmit={saveConnection} className="mt-6 space-y-4"><label className="block text-xs font-medium">Tipo<select value={connectionKind} onChange={(event) => setConnectionKind(event.target.value as Connection["kind"])} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs"><option>REST API</option><option>MCP Server</option></select></label><label className="block text-xs font-medium">Nome da integração<input value={connectionName} onChange={(event) => setConnectionName(event.target.value)} maxLength={80} required placeholder="Ex.: CRM interno" className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs outline-none focus:border-orange-400" /></label><label className="block text-xs font-medium">URL do serviço<input value={connectionEndpoint} onChange={(event) => setConnectionEndpoint(event.target.value)} type="url" required placeholder="https://api.empresa.local" className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs outline-none focus:border-orange-400" /></label><label className="block text-xs font-medium">Chave de API<input value={connectionKey} onChange={(event) => setConnectionKey(event.target.value)} type="password" autoComplete="new-password" minLength={8} required placeholder="Cole sua chave" className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-xs outline-none focus:border-orange-400" /></label><p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-800">Protótipo: a chave será descartada. Para conectar de verdade, cadastre a credencial no backend seguro.</p><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={closeDialog} className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium hover:bg-stone-50">Cancelar</button><button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700">Salvar integração</button></div></form></div></div>}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof KeyRound }) {
  return <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4"><div><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div><Icon size={19} className="text-stone-300" /></div>;
}
