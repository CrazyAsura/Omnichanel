import axios from "axios";
import { activity, errors, files, integrations, people, reportRows } from "@/lib/mock-data";
import { store } from "@/lib/store";

export function getBackendBaseUrl(): string {
  if (typeof window === "undefined") {
    const serverUrl = process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://app:8080";
    return serverUrl.replace(/\/+$/, "");
  }
  // No navegador: se acessado via proxy Nginx (porta 8088 ou porta padrão 80/443), usa path relativo ""
  if (window.location.port === "8088" || !window.location.port || window.location.port === "80" || window.location.port === "443") {
    return "";
  }
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured && !configured.includes("empresa.com.br")) {
    return configured.replace(/\/+$/, "");
  }
  return `http://${window.location.hostname}:8088`;
}

export const BACKEND_URL = getBackendBaseUrl();

// O Nginx encaminha /api ao backend Java na mesma origem.
export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 330000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = store.getState().session.accessToken || (typeof window !== "undefined" ? sessionStorage.getItem("omnichanel-access-token") : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const base = getBackendBaseUrl();
    if (config.url && !config.url.startsWith("http")) {
      config.baseURL = `${base}/api`;
    }
  }
  return config;
});

export async function synthesizeSpeech(text: string, signal: AbortSignal): Promise<Blob> {
  const response = await api.post<Blob>("/chat/speech", { text }, {
    responseType: "blob", timeout: 330000, signal,
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
  async files() { return fetchDocumentsApi(); },
  async integrations() { await delay(); return integrations; },
  async reports() { await delay(); return reportRows; },
  async activity() { await delay(); return activity; },
  async errors() { await delay(); return errors; },
};


export type ManagedDocumentDto = {
  id?: string;
  name: string;
  owner: string;
  size: string;
  updated: string;
  type: string;
  accessLevel: string;
};

export async function fetchDocumentsApi(): Promise<ManagedDocumentDto[]> {
  try {
    const response = await api.get<ManagedDocumentDto[]>("/documents");
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return files.map((f) => ({ ...f, accessLevel: "all" }));
  } catch {
    return files.map((f) => ({ ...f, accessLevel: "all" }));
  }
}

export async function createDocumentApi(doc: { name: string; owner?: string; size?: string; type?: string }): Promise<ManagedDocumentDto> {
  const response = await api.post<ManagedDocumentDto>("/documents", doc);
  return response.data;
}

export async function updateDocumentAccessApi(name: string, accessLevel: string): Promise<ManagedDocumentDto> {
  const response = await api.patch<ManagedDocumentDto>(`/documents/${encodeURIComponent(name)}/access`, { accessLevel });
  return response.data;
}

export async function deleteDocumentApi(name: string, reason: string): Promise<void> {
  await api.delete(`/documents/${encodeURIComponent(name)}`, { data: { reason } });
}
