import axios from "axios";
import { activity, errors, files, integrations, people, reportRows } from "@/lib/mock-data";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!configuredApiUrl) throw new Error("NEXT_PUBLIC_API_URL is required");
export const BACKEND_URL = configuredApiUrl.replace(/\/+$/, "");

// O Nginx encaminha /api ao backend Java na mesma origem.
export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function synthesizeSpeech(text: string, signal: AbortSignal): Promise<Blob> {
  const response = await api.post<Blob>("/chat/speech", { text }, {
    responseType: "blob", timeout: 180000, signal,
  });
  return response.data;
}

export type SearchResult = {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
};

export type ChatPromptPayload = {
  sessionId: string;
  message: string;
  agentMode?: string;
  selectedDocs?: string[];
  enabledSources?: string[];
};

export type ChatPromptResponse = {
  sessionId: string;
  reply: string;
  agentUsed: string;
  file?: {
    name: string;
    content: string;
    mimeType: string;
  } | null;
  sources: string[];
  executionTimeMs: number;
  success: boolean;
};

/**
 * Envia mensagem para orquestração de IA no backend Java / AgentScope gRPC
 */
export async function sendChatMessage(payload: ChatPromptPayload): Promise<ChatPromptResponse> {
  const response = await api.post<ChatPromptResponse>("/chat", payload);
  return response.data;
}

/**
 * Verifica conectividade com o backend Spring Boot
 */
export async function checkBackendHealth(): Promise<{ status: string; service: string }> {
  const response = await api.get<{ status: string; service: string }>("/health");
  return response.data;
}

/**
 * Busca de documentos e entidades corporativas diretamente no backend / Elasticsearch
 */
export async function searchAdmin(query: string): Promise<SearchResult[]> {
  const response = await api.get<SearchResult[]>("/v1/search", { params: { q: query } });
  return response.data;
}

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApi = {
  async dashboard() {
    await delay();
    return { users: "1.284", requests: "482.910", files: "8.492", errors: "142", activity, reportRows };
  },
  async users() { await delay(); return people; },
  async files() { await delay(); return files; },
  async integrations() { await delay(); return integrations; },
  async reports() { await delay(); return reportRows; },
  async activity() { await delay(); return activity; },
  async errors() { await delay(); return errors; },
};
