"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  Server,
  Cpu,
  Bot,
  Zap,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  Database,
  Copy,
  Check,
  X,
  Layers,
  Scale,
  Plus,
  GitFork,
  ListFilter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Move,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FlowMode = "all" | "api" | "mcp";

interface NodeData {
  id: string;
  title: string;
  category: string;
  icon: typeof Globe;
  role: string;
  protocol: string;
  endpointOrTool: string;
  status: string;
  accentColor: string;
  borderColor: string;
  x: number;
  y: number;
  width: number;
  description: string;
  cleanArchitectureNote: string;
  samplePayload: string;
  tags: string[];
  track: "api" | "mcp" | "shared";
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  track: "api" | "mcp" | "shared";
  strokeWidth?: number;
  dashed?: boolean;
}

const NODES: NodeData[] = [
  // --- FLUXO REST API ---
  {
    id: "webhook",
    title: "Client Webhook",
    category: "INGESTION / TRIGGER",
    icon: Globe,
    role: "Ponto de entrada de clientes (WhatsApp, Webchat, E-mail)",
    protocol: "HTTP/1.1 & HTTP/2",
    endpointOrTool: "POST /api/chat",
    status: "200 OK",
    accentColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    borderColor: "border-amber-500/60 hover:border-amber-400",
    x: 40,
    y: 90,
    width: 210,
    description: "Recebe payloads de webhook de clientes finais em tempo real via REST padrão.",
    cleanArchitectureNote: "Entrada primária na camada Presentation (Controller). Valida DTOs e encaminha para Use Cases.",
    samplePayload: `// Ingestão Webhook:
{
  "sessionId": "usr_9981",
  "channel": "WHATSAPP",
  "message": "Preciso do relatório de vendas deste mês em PDF",
  "timestamp": "2026-09-27T17:30:00Z"
}`,
    tags: ["REST", "Webhook", "Presentation"],
    track: "api",
  },
  {
    id: "spring-controller",
    title: "REST API Gateway",
    category: "INPUT ADAPTER",
    icon: Server,
    role: "Spring MVC Controller REST com autenticação e validação",
    protocol: "REST / JSON",
    endpointOrTool: "/api/chat & /api/reports",
    status: "Active",
    accentColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    borderColor: "border-blue-500/60 hover:border-blue-400",
    x: 350,
    y: 90,
    width: 230,
    description: "Roteador central com endpoints HTTP, CORS configurado, rate limiting e mapeamento de DTOs.",
    cleanArchitectureNote: "Fino e desacoplado: converte ChatRequest -> SendMessageCommand e aciona a Input Port.",
    samplePayload: `@PostMapping("/api/chat")
public ResponseEntity<ChatResponse> handle(
    @Valid @RequestBody ChatRequest req
) {
    var command = mapper.toCommand(req);
    var output = chatInputPort.execute(command);
    return ResponseEntity.ok(ChatResponse.from(output));
}`,
    tags: ["Spring Boot 3.5", "REST", "Input Port"],
    track: "api",
  },
  {
    id: "spring-usecase",
    title: "Orchestrator Use Case",
    category: "APPLICATION CORE",
    icon: Cpu,
    role: "Regras de negócio, fluxos de contexto e despacho para Gemma 4",
    protocol: "In-Memory Java Port",
    endpointOrTool: "ProcessMessageUseCase",
    status: "Running",
    accentColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    borderColor: "border-indigo-500/60 hover:border-indigo-400",
    x: 680,
    y: 90,
    width: 240,
    description: "Cérebro da aplicação. Decide se responde diretamente, consulta a base vetorial ou gera relatórios.",
    cleanArchitectureNote: "Regra pura em application/usecase, dependendo somente de ports e domain entities.",
    samplePayload: `// Application Layer:
public final class ProcessMessageUseCase implements ProcessMessageInputPort {
    private final AiEnginePort aiEnginePort;
    private final DocumentSearchPort documentPort;
    private final ReportGeneratorPort reportPort;
}`,
    tags: ["Clean Architecture", "Hexagonal", "Domain"],
    track: "api",
  },
  {
    id: "pdf-engine",
    title: "Relatórios PDF (Java)",
    category: "OUTPUT ADAPTER",
    icon: FileSpreadsheet,
    role: "Geração de PDFs executivos com JFreeChart & OpenPDF",
    protocol: "Binary Application/PDF",
    endpointOrTool: "GET /api/reports/executive/pdf",
    status: "Ready",
    accentColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/60 hover:border-emerald-400",
    x: 680,
    y: 250,
    width: 240,
    description: "Adapter de infraestrutura com quebra de página inteligente, gráficos estatísticos e numeração dinâmica.",
    cleanArchitectureNote: "Implementa PdfReportGeneratorPort. Constrói documentos sem vazar bibliotecas para o Core.",
    samplePayload: `// OpenPdfReportGeneratorAdapter:
document.newPage();
var chart = jFreeChartRenderer.renderChart(data);
document.add(chart);
table.setKeepTogether(true);`,
    tags: ["OpenPDF", "JFreeChart", "PDF"],
    track: "api",
  },

  // --- FLUXO MCP PROTOCOL ---
  {
    id: "mcp-host",
    title: "AI Host Client (Gemini)",
    category: "AI AGENT CLIENT",
    icon: Bot,
    role: "Gemini Notebook / Claude Desktop / Antigravity Agent",
    protocol: "MCP Client (JSON-RPC 2.0)",
    endpointOrTool: "tools/call & resources/read",
    status: "Connected",
    accentColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    borderColor: "border-cyan-500/60 hover:border-cyan-400",
    x: 40,
    y: 390,
    width: 210,
    description: "Assistente de IA que descobre ferramentas autonomamente através do catálogo exposto pelo servidor MCP.",
    cleanArchitectureNote: "Age como cliente externo consumindo contratos de tool-calling definidos via especificação MCP.",
    samplePayload: `// Chamada do Host para o Servidor MCP:
{
  "jsonrpc": "2.0",
  "id": 104,
  "method": "tools/call",
  "params": {
    "name": "generate_executive_pdf",
    "arguments": { "period": "LAST_30_DAYS" }
  }
}`,
    tags: ["MCP Host", "JSON-RPC", "Autonomous AI"],
    track: "mcp",
  },
  {
    id: "mcp-server",
    title: "MCP Protocol Server",
    category: "PROTOCOL GATEWAY",
    icon: Zap,
    role: "Servidor Model Context Protocol (stdio & SSE)",
    protocol: "MCP Specification v1.0",
    endpointOrTool: "tools/list & prompts/list",
    status: "Listening",
    accentColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    borderColor: "border-purple-500/60 hover:border-purple-400",
    x: 350,
    y: 390,
    width: 230,
    description: "Servidor compatível com MCP que traduz requisições de ferramentas em chamadas de casos de uso internos.",
    cleanArchitectureNote: "Adapter de entrada (Presentation) alternativo ao REST, reutilizando as mesmas Input Ports.",
    samplePayload: `// Handshake Inicial MCP:
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": true }
    },
    "serverInfo": { "name": "omnichannel-mcp-server", "version": "1.0.0" }
  }
}`,
    tags: ["MCP Server", "STDIO / SSE", "AI Protocol"],
    track: "mcp",
  },
  {
    id: "mcp-tools",
    title: "Catalog of AI Tools",
    category: "DYNAMIC TOOLS",
    icon: Sparkles,
    role: "Registro dinâmico de ferramentas expostas aos LLMs",
    protocol: "Tool Declarations",
    endpointOrTool: "consultar_documento, gerar_relatorio",
    status: "12 Tools Active",
    accentColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30",
    borderColor: "border-pink-500/60 hover:border-pink-400",
    x: 680,
    y: 390,
    width: 240,
    description: "Esquemas JSON Schema que instruem o modelo sobre como e quando invocar funções do sistema.",
    cleanArchitectureNote: "Mapeamento bidirecional: JSON Schema <-> Command Objects validados da camada de aplicação.",
    samplePayload: `// Declaração de Ferramenta MCP:
{
  "name": "consultar_base_conhecimento",
  "description": "Busca trechos em documentos internos e políticas.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "maxResults": { "type": "integer", "default": 5 }
    },
    "required": ["query"]
  }
}`,
    tags: ["JSON Schema", "Tools Catalog", "RAG"],
    track: "mcp",
  },

  // --- NÓS COMPARTILHADOS ---
  {
    id: "ai-engine",
    title: "Gemma 4 / LLM Engine",
    category: "INTELLIGENCE ENGINE",
    icon: ShieldCheck,
    role: "Processamento de Linguagem Natural & Raciocínio",
    protocol: "gRPC & Ollama API",
    endpointOrTool: "POST /api/generate",
    status: "Online (4.2 tps)",
    accentColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    borderColor: "border-rose-500/60 hover:border-rose-400",
    x: 990,
    y: 190,
    width: 260,
    description: "Modelo de linguagem local ou remoto (Gemma 4) para síntese textual, raciocínio e geração de insights.",
    cleanArchitectureNote: "Acessado por uma porta de saída AiEnginePort com implementação gRPC/REST na infraestrutura.",
    samplePayload: `// Saída do Gemma 4:
{
  "model": "gemma-4-9b-instruct",
  "response": "Com base nos contratos anexados, a taxa de renovação...",
  "tokens": 420,
  "inferenceMs": 182
}`,
    tags: ["Gemma 4", "gRPC", "LLM"],
    track: "shared",
  },
  {
    id: "storage",
    title: "Database & Document Vault",
    category: "INFRASTRUCTURE",
    icon: Database,
    role: "Persistência SQL Server, Redis Cache e Vetores",
    protocol: "JDBC & Redis Protocol",
    endpointOrTool: "tcp://sqlserver:1433",
    status: "Healthy",
    accentColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    borderColor: "border-emerald-500/60 hover:border-emerald-400",
    x: 990,
    y: 440,
    width: 260,
    description: "Armazena sessões, logs de auditoria e métricas agregadas que alimentam os relatórios executivos em PDF.",
    cleanArchitectureNote: "Adapter de saída implementando portas de persistência com Flyway migrations.",
    samplePayload: `// Cache em memória Redis com TTL:
redisTemplate.opsForValue()
    .set("session:" + id, session, Duration.ofHours(2));`,
    tags: ["SQL Server", "Redis", "JPA"],
    track: "shared",
  },
];

// Estrutura de Dados: Grafo de Conectores (Vértices e Arestas)
const EDGES: FlowEdge[] = [
  // Trilha REST API
  { id: "e-rest-1", source: "webhook", target: "spring-controller", color: "#f59e0b", track: "api", strokeWidth: 2.5 },
  { id: "e-rest-2", source: "spring-controller", target: "spring-usecase", color: "#6366f1", track: "api", strokeWidth: 2.5 },
  { id: "e-rest-3", source: "spring-usecase", target: "ai-engine", color: "#a855f7", track: "api", strokeWidth: 2.5 },
  { id: "e-rest-pdf", source: "spring-controller", target: "pdf-engine", color: "#0ea5e9", track: "api", strokeWidth: 2.0 },
  // Trilha MCP
  { id: "e-mcp-1", source: "mcp-host", target: "mcp-server", color: "#06b6d4", track: "mcp", strokeWidth: 2.5 },
  { id: "e-mcp-2", source: "mcp-server", target: "mcp-tools", color: "#06b6d4", track: "mcp", strokeWidth: 2.5 },
  { id: "e-mcp-3", source: "mcp-tools", target: "ai-engine", color: "#06b6d4", track: "mcp", strokeWidth: 2.5 },
  // Trilha Compartilhada
  { id: "e-shared-storage", source: "ai-engine", target: "storage", color: "#10b981", track: "shared", strokeWidth: 2.0 },
];

// Estrutura de Dados: Índice Hash O(1) de nós por ID
const NODE_MAP = new Map<string, NodeData>(NODES.map((node) => [node.id, node]));

// Estrutura de Dados: Índice Invertido O(1) para filtros de trilha
const TRACK_INDEX: Record<FlowMode, Set<string>> = {
  all: new Set(NODES.map((n) => n.id)),
  api: new Set(NODES.filter((n) => n.track === "api" || n.track === "shared").map((n) => n.id)),
  mcp: new Set(NODES.filter((n) => n.track === "mcp" || n.track === "shared").map((n) => n.id)),
};

/**
 * Componente do Nó com React.memo para evitar re-renderizações desnecessárias durante pan/zoom
 */
const NodeCard = memo(function NodeCard({
  node,
  visible,
  isSelected,
  onSelect,
}: {
  node: NodeData;
  visible: boolean;
  isSelected: boolean;
  onSelect: (node: NodeData) => void;
}) {
  const Icon = node.icon;
  return (
    <motion.div
      data-no-pan="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => onSelect(node)}
      animate={{
        opacity: visible ? 1 : 0.18,
        scale: visible ? 1 : 0.96,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width}px`,
      }}
      className={`absolute rounded-2xl border-2 p-3.5 bg-card/95 backdrop-blur shadow-md cursor-pointer transition-all select-none hover:shadow-xl ${
        node.borderColor
      } ${isSelected ? "ring-2 ring-foreground shadow-2xl scale-[1.02]" : ""}`}
    >
      {/* Pin de Entrada (Esquerda) */}
      {node.id !== "webhook" && node.id !== "mcp-host" && (
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-card" />
      )}

      {/* Header do Card */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${node.accentColor}`}>
          {node.category}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">{node.status}</span>
      </div>

      {/* Título & Ícone */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
          <Icon size={14} />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold truncate">{node.title}</h3>
        </div>
      </div>

      {/* Resumo do papel */}
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{node.role}</p>

      {/* Rodapé do Nó */}
      <div className="mt-2.5 pt-2 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground font-mono">
        <span className="truncate max-w-[130px]">{node.endpointOrTool}</span>
        <span className="text-foreground font-medium">{node.protocol.split(" ")[0]}</span>
      </div>

      {/* Pin de Saída (Direita) */}
      {node.id !== "storage" && node.id !== "pdf-engine" && (
        <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-card" />
      )}
    </motion.div>
  );
});

/**
 * Componente do Cabo Bézier Otimizado com React.memo
 */
const FlowCable = memo(function FlowCable({
  path,
  color,
  strokeWidth = 2.5,
  opacity,
}: {
  path: string;
  color: string;
  strokeWidth?: number;
  opacity: number;
}) {
  return (
    <path
      d={path}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray="6 4"
      className="animate-flow"
      opacity={opacity}
    />
  );
});

export interface IntegrationFlowCanvasProps {
  className?: string;
  activeTab?: "canvas" | "list";
  onTabChange?: (tab: "canvas" | "list") => void;
  onOpenAddModal?: () => void;
}

export function IntegrationFlowCanvas({
  className,
  activeTab = "canvas",
  onTabChange,
  onOpenAddModal,
}: IntegrationFlowCanvasProps = {}) {
  const [selectedNode, setSelectedNode] = useState<NodeData>(NODES[0]);
  const [flowMode, setFlowMode] = useState<FlowMode>("all");
  const [copied, setCopied] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Pan & Zoom Engine State
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 50, y: 35 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const didDragRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  // Copiar payload do nó
  const copyPayload = useCallback(() => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(selectedNode.samplePayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedNode]);

  // Checagem de visibilidade O(1) via Inverted Index
  const isVisible = useCallback(
    (nodeId: string) => TRACK_INDEX[flowMode].has(nodeId),
    [flowMode]
  );

  // Cálculo Geométrico dos Cabos Bézier Dinâmicos a partir do Grafo
  const computedEdges = useMemo(() => {
    return EDGES.map((edge) => {
      const source = NODE_MAP.get(edge.source);
      const target = NODE_MAP.get(edge.target);
      if (!source || !target) return null;

      let path = "";
      // Caso 1: Conexão Vertical (ex: AI Engine para Storage)
      if (Math.abs(source.x - target.x) < 80 && target.y > source.y) {
        const x1 = source.x + source.width / 2;
        const y1 = source.y + 115;
        const x2 = target.x + target.width / 2;
        const y2 = target.y;
        const dy = Math.max(30, (y2 - y1) / 2);
        path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
      } else {
        // Caso 2: Conexão Horizontal Padrão de Pino a Pino
        const x1 = source.x + source.width;
        const y1 = source.y + 45;
        const x2 = target.x;
        const y2 = target.y + 45;
        const dx = Math.max(40, (x2 - x1) / 2);
        path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      }

      // Opacidade baseada no modo de fluxo
      let opacity = 0.85;
      if (flowMode === "api" && edge.track === "mcp") opacity = 0.1;
      if (flowMode === "mcp" && edge.track === "api") opacity = 0.1;

      return {
        ...edge,
        path,
        opacity,
      };
    }).filter(Boolean) as (FlowEdge & { path: string; opacity: number })[];
  }, [flowMode]);

  // Funções de Zoom e Ajuste
  const handleZoomIn = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(2.2, prevZoom + 0.15);
      const factor = nextZoom / prevZoom;
      setPan((prevPan) => ({
        x: cx - (cx - prevPan.x) * factor,
        y: cy - (cy - prevPan.y) * factor,
      }));
      return nextZoom;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setZoom((prevZoom) => {
      const nextZoom = Math.max(0.35, prevZoom - 0.15);
      const factor = nextZoom / prevZoom;
      setPan((prevPan) => ({
        x: cx - (cx - prevPan.x) * factor,
        y: cy - (cy - prevPan.y) * factor,
      }));
      return nextZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 60, y: 40 });
  }, []);

  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 50;
    const contentW = 1320;
    const contentH = 680;
    const availableW = Math.max(200, rect.width - padding * 2);
    const availableH = Math.max(200, rect.height - padding * 2);
    const scale = Math.min(availableW / contentW, availableH / contentH, 1.25);
    const nextZoom = Math.max(0.35, Math.min(scale, 1.4));

    setZoom(nextZoom);
    setPan({
      x: (rect.width - contentW * nextZoom) / 2,
      y: (rect.height - contentH * nextZoom) / 2,
    });
  }, []);

  // Atalhos de teclado
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        handleFitView();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetZoom, handleFitView]);

  // Zoom no cursor com a roda do mouse (Wheel Zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(2.2, Math.max(0.35, prevZoom * zoomFactor));
        const scaleChange = nextZoom / prevZoom;

        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * scaleChange,
          y: mouseY - (mouseY - prevPan.y) * scaleChange,
        }));

        return nextZoom;
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  // Drag com requestAnimationFrame para performance 60/120 FPS
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-pan]")) return;

    setIsDragging(true);
    didDragRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }, [pan.x, pan.y]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        didDragRef.current = true;
      }

      // Throttling via requestAnimationFrame
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        });
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isDragging]);

  const handleSelectNode = useCallback((node: NodeData) => {
    if (!didDragRef.current) {
      setSelectedNode(node);
      setInspectorOpen(true);
    }
  }, []);

  return (
    <div className={cn("flex flex-col h-full w-full min-h-0 flex-1 bg-card overflow-hidden select-none", className)}>
      {/* Topbar com Controles, Filtros e Ações */}
      <header className="h-14 border-b border-border px-4 pl-14 lg:px-5 flex items-center justify-between bg-card/90 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold text-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Fluxograma de Integração</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                LIVE CANVAS
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Estilo n8n & Gemini Notebook • REST API vs MCP Protocol</p>
          </div>
        </div>

        {/* Abas e Filtros de Fluxo Segmentados */}
        <div className="flex items-center gap-2">
          {onTabChange && (
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border gap-1 text-xs">
              <button
                onClick={() => onTabChange("canvas")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === "canvas" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitFork size={13} />
                <span>Canvas n8n</span>
              </button>
              <button
                onClick={() => onTabChange("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === "list" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListFilter size={13} />
                <span>Conexões</span>
              </button>
            </div>
          )}

          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border gap-1 text-xs">
            <button
              onClick={() => setFlowMode("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                flowMode === "all" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Visão Completa
            </button>
            <button
              onClick={() => setFlowMode("api")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                flowMode === "api" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              REST API
            </button>
            <button
              onClick={() => setFlowMode("mcp")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                flowMode === "mcp" ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              MCP Protocol
            </button>
            <button
              onClick={() => setCompareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-amber-500 hover:bg-amber-500/10"
            >
              <Scale size={13} />
              <span>API vs MCP</span>
            </button>
          </div>
        </div>

        {/* Indicadores de Status e Ação */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">HTTP :8080</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 border border-border text-foreground">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-mono text-[11px]">MCP :stdio/sse</span>
          </div>
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 bg-foreground text-background px-3 py-1.5 rounded-lg font-medium text-xs hover:opacity-90 transition active:scale-95 shadow-sm"
            >
              <Plus size={14} />
              <span>Nova conexão</span>
            </button>
          )}

          {/* Toggle do Inspector Drawer */}
          <button
            onClick={() => setInspectorOpen((prev) => !prev)}
            title={inspectorOpen ? "Ocultar detalhes do nó" : "Mostrar detalhes do nó"}
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            {inspectorOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        </div>
      </header>

      {/* Área Central: Canvas com Pan/Zoom + Inspector Drawer */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Canvas Interativo com Grade Dinâmica e Arraste por Mouse */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleFitView}
          style={{
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          }}
          className={cn(
            "flex-1 relative overflow-hidden bg-dot-grid transition-colors",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          {/* Conteúdo Escalado e Deslocado no Canvas */}
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "0 0",
              transition: isDragging ? "none" : "transform 0.08s ease-out",
            }}
            className="relative w-[1350px] h-[720px] select-none"
          >
            {/* SVG de Conectores Bézier Dinamicamente Derivados do Grafo */}
            <svg className="absolute inset-0 w-[1350px] h-[720px] pointer-events-none z-0">
              {computedEdges.map((edge) => (
                <FlowCable
                  key={edge.id}
                  path={edge.path}
                  color={edge.color}
                  strokeWidth={edge.strokeWidth}
                  opacity={edge.opacity}
                />
              ))}
            </svg>

            {/* Nós do Canvas Memoizados */}
            <div className="relative w-[1350px] h-[680px] z-10">
              {NODES.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  visible={isVisible(node.id)}
                  isSelected={selectedNode.id === node.id}
                  onSelect={handleSelectNode}
                />
              ))}
            </div>
          </div>

          {/* Floating Navigation Dock (Zoom e Pan Controls) */}
          <div
            data-no-pan="true"
            className="absolute bottom-6 left-6 z-30 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300"
          >
            {/* Dock Principal com Controles de Zoom */}
            <div className="flex items-center bg-card/90 backdrop-blur-md border border-border shadow-xl rounded-2xl p-1 gap-0.5 text-foreground">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Diminuir zoom (Tecla -)"
                aria-label="Diminuir zoom"
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-95"
              >
                <ZoomOut size={15} />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                title="Redefinir para 100% (Tecla 0)"
                aria-label="Redefinir zoom para 100%"
                className="px-2 py-1 text-xs font-mono font-medium rounded-lg hover:bg-muted text-foreground transition active:scale-95"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                title="Aumentar zoom (Tecla +)"
                aria-label="Aumentar zoom"
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-95"
              >
                <ZoomIn size={15} />
              </button>

              <div className="w-px h-5 bg-border mx-1" />

              <button
                type="button"
                onClick={handleFitView}
                title="Enquadrar fluxo completo (Tecla F ou Duplo Clique)"
                aria-label="Enquadrar visualização"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition active:scale-95"
              >
                <Maximize2 size={13} />
                <span className="hidden sm:inline">Enquadrar</span>
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                title="Centralizar canvas"
                aria-label="Centralizar canvas"
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-95"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Hint Flutuante de Ajuda Gestual */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/85 backdrop-blur border border-border text-[11px] text-muted-foreground shadow-md">
              <Move size={12} className="text-foreground shrink-0" />
              <span>Arraste para mover • Scroll para zoom</span>
            </div>
          </div>
        </div>

        {/* Inspector Drawer Lateral (Estilo n8n & Gemini Notebook) */}
        <AnimatePresence initial={false}>
          {inspectorOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 384, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="border-l border-border bg-card/95 backdrop-blur flex flex-col z-20 shadow-2xl overflow-hidden shrink-0"
            >
              <div className="w-96 flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                      {selectedNode && <selectedNode.icon size={16} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate">{selectedNode.title}</h4>
                      <span className="text-[10px] text-muted-foreground font-mono">{selectedNode.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                      {selectedNode.status}
                    </span>
                    <button
                      onClick={() => setInspectorOpen(false)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
                      title="Ocultar painel"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
                  {/* Descrição Funcional */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Função Arquitetural
                    </label>
                    <p className="text-foreground mt-1 leading-relaxed text-[11px]">{selectedNode.description}</p>
                  </div>

                  {/* Protocolo & Endpoint */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Contrato & Roteamento
                    </label>
                    <div className="mt-1 bg-muted/50 p-2.5 rounded-lg border border-border font-mono text-[11px] space-y-1">
                      <div>
                        <span className="text-muted-foreground">Protocolo: </span>
                        <span className="font-semibold text-foreground">{selectedNode.protocol}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Alvo: </span>
                        <span className="text-amber-600 dark:text-amber-400">{selectedNode.endpointOrTool}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Architecture Note */}
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-lg text-indigo-950 dark:text-indigo-200">
                    <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase">
                      <Layers size={12} />
                      <span>Regra Clean Architecture</span>
                    </div>
                    <p className="text-[11px] mt-1 leading-relaxed opacity-90">{selectedNode.cleanArchitectureNote}</p>
                  </div>

                  {/* Payload & Schema com Botão de Copiar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Código / Payload Exemplo
                      </label>
                      <button
                        onClick={copyPayload}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition"
                      >
                        {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        <span>{copied ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <pre className="bg-neutral-950 text-emerald-400 p-3 rounded-lg font-mono text-[10px] overflow-x-auto leading-relaxed border border-neutral-800">
                      {selectedNode.samplePayload}
                    </pre>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {selectedNode.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Orquestração Omnichannel</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pronto para Execução</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Comparativo: REST API vs MCP */}
      <AnimatePresence>
        {compareModalOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCompareModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border max-w-2xl w-full rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Scale size={18} className="text-amber-500" />
                  Comparativo Arquitetural: REST API Gateway vs MCP
                </h3>
                <button
                  onClick={() => setCompareModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-md"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Coluna REST API */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">REST API Gateway</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-300 rounded">
                      HTTP/JSON
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Ideal para aplicações determinísticas, frontends web (Next.js), aplicativos móveis e webhooks de parceiros.
                  </p>
                  <ul className="text-foreground/90 space-y-1.5 list-disc list-inside text-[11px] pt-1">
                    <li>Endpoints rígidos e explícitos (<code className="text-xs bg-muted px-1 rounded">/api/chat</code>)</li>
                    <li>Contratos OpenAPI / Swagger padronizados</li>
                    <li>O cliente decide exatamente quando e o que chamar</li>
                    <li>Excelente para pipelines de dados e transações ACID</li>
                  </ul>
                </div>

                {/* Coluna MCP */}
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">Model Context Protocol</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 rounded">
                      JSON-RPC 2.0
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Padrão da indústria para LLMs e assistentes de IA (Claude, Gemini, Antigravity) descobrirem tools autonomamente.
                  </p>
                  <ul className="text-foreground/90 space-y-1.5 list-disc list-inside text-[11px] pt-1">
                    <li>Descoberta automática de Tools (<code className="text-xs bg-muted px-1 rounded">tools/list</code>)</li>
                    <li>Suporte a Prompts e Recursos dinâmicos</li>
                    <li>A própria IA decide qual ferramenta acionar e quando</li>
                    <li>Transporte via <code className="text-xs bg-muted px-1 rounded">stdio</code> ou <code className="text-xs bg-muted px-1 rounded">SSE</code></li>
                  </ul>
                </div>
              </div>

              <div className="bg-muted/40 p-3.5 rounded-xl border border-border text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Decisão de Arquitetura no Omnichannel:</strong> Mantemos os dois mundos! Os controllers REST atendem ao frontend web e canais de mensageria, enquanto o MCP Server expõe os mesmos casos de uso como ferramentas seguras para assistentes inteligentes.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
