"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { Bot, Database, FileOutput, GitBranch, Play, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DragEvent } from "react";

export type FlowStep = { id: string; kind: "trigger" | "http" | "mcp" | "transform" | "agent" | "output"; x: number; y: number; label: string; endpoint?: string; method?: string; credentialId?: string; operation?: string };
export type FlowLink = { id: string; source: string; target: string };

const META = {
  trigger: { title: "Início manual", caption: "Dispare o fluxo sob demanda", icon: Play, tone: "bg-orange-50 text-orange-600 border-orange-200", strip: "bg-orange-400" },
  http: { title: "Requisição HTTP", caption: "Consulte uma API externa", icon: Webhook, tone: "bg-blue-50 text-blue-600 border-blue-200", strip: "bg-blue-400" },
  mcp: { title: "Ferramenta MCP", caption: "Acesse um servidor MCP", icon: Database, tone: "bg-violet-50 text-violet-600 border-violet-200", strip: "bg-violet-400" },
  transform: { title: "Transformar dados", caption: "Organize a saída anterior", icon: GitBranch, tone: "bg-teal-50 text-teal-600 border-teal-200", strip: "bg-teal-400" },
  agent: { title: "Agente de IA", caption: "Analise com o assistente", icon: Bot, tone: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200", strip: "bg-fuchsia-400" },
  output: { title: "Resultado", caption: "Finalize e entregue os dados", icon: FileOutput, tone: "bg-emerald-50 text-emerald-600 border-emerald-200", strip: "bg-emerald-400" },
} as const;

type StepNode = Node<FlowStep, "workflowStep">;
type StepNodeProps = NodeProps<StepNode> & { onSelect: (id: string) => void; runningId: string | null; completedIds: string[] };

const StepNodeView = memo(function StepNodeView({ id, data, selected, onSelect, runningId, completedIds }: StepNodeProps) {
  const meta = META[data.kind];
  const Icon = meta.icon;
  return <div onClick={() => onSelect(id)} className={cn("w-[232px] select-none rounded-xl border bg-white shadow-[0_4px_18px_rgba(26,32,44,.07)]", selected ? "border-orange-400 ring-[3px] ring-orange-100" : "border-stone-200", runningId === id && "ring-[3px] ring-blue-200", completedIds.includes(id) && "border-emerald-400")}>
    {data.kind !== "trigger" && <Handle type="target" position={Position.Left} className="!h-3.5 !w-3.5 !border-[3px] !border-white !bg-stone-400 !ring-1 !ring-stone-300 hover:!bg-orange-500" />}
    <div className={cn("h-1.5 rounded-t-xl", meta.strip)} />
    <div className="flex items-center gap-3 px-3 pt-3"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", meta.tone)}><Icon size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{data.label}</p><p className="mt-0.5 truncate text-[10px] text-stone-500">{data.kind === "http" ? data.method ?? "GET" : data.kind === "agent" ? data.operation ?? "Agente interno" : meta.caption}</p></div><span className="h-2 w-2 shrink-0 rounded-full bg-stone-200" /></div>
    <div className="mt-3 border-t border-stone-100 px-3 py-2 text-[10px] text-stone-400">{data.kind === "http" || data.kind === "mcp" ? (data.credentialId ? "Conexão selecionada" : "Configure a conexão") : "Etapa de fluxo"}</div>
    {data.kind !== "output" && <Handle type="source" position={Position.Right} className="!h-3.5 !w-3.5 !border-[3px] !border-white !bg-stone-500 !ring-1 !ring-stone-300 hover:!bg-orange-500" />}
  </div>;
});

type Props = {
  steps: FlowStep[];
  links: FlowLink[];
  selectedId: string | null;
  selectedLinkId: string | null;
  runningId: string | null;
  completedIds: string[];
  onSelectStep: (id: string) => void;
  onSelectLink: (id: string) => void;
  onConnect: (source: string, target: string) => void;
  onStepsChange: (steps: FlowStep[]) => void;
  onDropStep: (kind: FlowStep["kind"], x: number, y: number) => void;
  onZoomChange: (zoom: number) => void;
  onCancelConnect: () => void;
  onViewportReady: (controls: { zoomIn: () => void; zoomOut: () => void; fitView: () => void; zoom: () => number }) => void;
};

function FlowEditorInner(props: Props) {
  const reactFlow = useReactFlow();
  const { steps, links } = props;
  const nodes = useMemo<StepNode[]>(() => steps.map((step) => ({ id: step.id, type: "workflowStep", position: { x: step.x, y: step.y }, data: step, selected: step.id === props.selectedId })), [steps, props.selectedId]);
  const edges = useMemo(() => links.map((link) => ({ id: link.id, source: link.source, target: link.target, type: "default", animated: false, style: { stroke: link.id === props.selectedLinkId ? "#ea580c" : "#a8b1bf", strokeWidth: link.id === props.selectedLinkId ? 3 : 2 } })), [links, props.selectedLinkId]);
  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // The persisted workflow remains the source of truth; synchronize React Flow's interaction state.
  useEffect(() => setNodes(nodes), [nodes, setNodes]);
  useEffect(() => setEdges(edges), [edges, setEdges]);

  const nodeTypes = useMemo(() => ({ workflowStep: (nodeProps: NodeProps<StepNode>) => <StepNodeView {...nodeProps} onSelect={props.onSelectStep} runningId={props.runningId} completedIds={props.completedIds} /> }), [props.onSelectStep, props.runningId, props.completedIds]);
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    props.onConnect(connection.source, connection.target);
  }, [props.onConnect]);
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData("application/x-omnichannel-node") as FlowStep["kind"];
    if (!(kind in META)) return;
    const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    props.onDropStep(kind, Math.max(20, Math.round(position.x - 116)), Math.max(20, Math.round(position.y - 56)));
  };

  return <ReactFlow
    nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes}
    onNodesChange={(changes) => { onNodesChange(changes); }}
    onEdgesChange={(changes) => { onEdgesChange(changes); }}
    onNodeDragStop={(_, node) => props.onStepsChange(steps.map((step) => step.id === node.id ? { ...step, x: Math.round(node.position.x), y: Math.round(node.position.y) } : step))}
    onNodeClick={(_, node) => props.onSelectStep(node.id)}
    onEdgeClick={(_, edge) => props.onSelectLink(edge.id)}
    onPaneClick={props.onCancelConnect}
    onMoveEnd={(_, viewport) => props.onZoomChange(viewport.zoom)}
    onConnect={handleConnect}
    isValidConnection={(connection) => Boolean(connection.source && connection.target && connection.source !== connection.target)}
    onInit={(instance) => props.onViewportReady({ zoomIn: () => instance.zoomIn(), zoomOut: () => instance.zoomOut(), fitView: () => instance.fitView({ padding: 0.2 }), zoom: () => instance.getZoom() })}
    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
    onDrop={handleDrop}
    fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.35} maxZoom={1.8} nodesDraggable nodesConnectable elementsSelectable
    className="bg-[#f7f8fa]"
  ><Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#d8dce3" /><Controls position="bottom-right" showInteractive={false} /></ReactFlow>;
}

export function IntegrationFlowEditor(props: Props) { return <ReactFlowProvider><FlowEditorInner {...props} /></ReactFlowProvider>; }
