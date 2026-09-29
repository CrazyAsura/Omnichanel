import axios from "axios";
import { activity, errors, files, integrations, people, reportRows, type Person } from "@/lib/mock-data";
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

export type ActivityLogDto = {
  initials: string;
  user: string;
  action: string;
  target: string;
  time: string;
  tone: string;
  ipAddress?: string;
  outcome?: string;
};

export type ErrorLogDto = {
  id: string;
  title: string;
  service: string;
  severity: string;
  time: string;
  code: string;
  details?: string;
};

export type ReportRowDto = {
  label: string;
  value: string;
  change: string;
  width: string;
};

export type ReportSummaryDto = {
  users: string;
  requests: string;
  files: string;
  errors: string;
  reportRows: ReportRowDto[];
};

export async function fetchActivityLogsApi(): Promise<ActivityLogDto[]> {
  try {
    const response = await api.get<ActivityLogDto[]>("/logs/activity");
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return activity;
  } catch {
    return activity;
  }
}

export async function fetchErrorLogsApi(): Promise<ErrorLogDto[]> {
  try {
    const response = await api.get<ErrorLogDto[]>("/logs/errors");
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return errors;
  } catch {
    return errors;
  }
}

export async function fetchReportsApi(): Promise<ReportRowDto[]> {
  try {
    const response = await api.get<ReportRowDto[]>("/reports");
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return reportRows;
  } catch {
    return reportRows;
  }
}

export async function fetchDashboardSummaryApi() {
  try {
    const [summaryRes, actRes] = await Promise.allSettled([
      api.get<ReportSummaryDto>("/reports/summary"),
      api.get<ActivityLogDto[]>("/logs/activity"),
    ]);

    const summary = summaryRes.status === "fulfilled" ? summaryRes.value.data : null;
    const actList = actRes.status === "fulfilled" && Array.isArray(actRes.value.data) ? actRes.value.data : activity;

    return {
      users: summary?.users ?? "1.284",
      requests: summary?.requests ?? "482.910",
      files: summary?.files ?? "8.492",
      errors: summary?.errors ?? "142",
      activity: actList,
      reportRows: summary?.reportRows ?? reportRows,
    };
  } catch {
    return { users: "1.284", requests: "482.910", files: "8.492", errors: "142", activity, reportRows };
  }
}

export async function fetchUsersApi(): Promise<Person[]> {
  let userList = people;
  try {
    const response = await api.get<Person[]>("/auth/users");
    if (Array.isArray(response.data) && response.data.length > 0) {
      userList = response.data;
    }
  } catch {
    // fallback local
  }

  const currentSession = store.getState().session;
  if (currentSession?.email) {
    const currentName = currentSession.name || currentSession.email.split("@")[0];
    const roleFormatted = currentSession.role === "super-admin" ? "Super-admin" 
                        : (currentSession.role === "admin" ? "Admin" : "Funcionário");
    const existing = userList.find((p) => p.email.toLowerCase() === currentSession.email.toLowerCase());
    if (existing) {
      return [
        { ...existing, name: currentName, role: roleFormatted, lastSeen: "Agora", status: "Ativo" },
        ...userList.filter((p) => p.email.toLowerCase() !== currentSession.email.toLowerCase()),
      ];
    } else {
      const initials = currentName.slice(0, 2).toUpperCase();
      return [
        { name: currentName, email: currentSession.email, role: roleFormatted, status: "Ativo", lastSeen: "Agora", initials },
        ...userList,
      ];
    }
  }

  return userList;
}

export const mockApi = {
  dashboard: fetchDashboardSummaryApi,
  users: fetchUsersApi,
  async files() { return fetchDocumentsApi(); },
  async integrations() { await delay(); return integrations; },
  reports: fetchReportsApi,
  activity: fetchActivityLogsApi,
  errors: fetchErrorLogsApi,
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
  const currentUserName = store.getState().session.name || store.getState().session.email || "Meu Usuário";
  try {
    const response = await api.get<ManagedDocumentDto[]>("/documents");
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }
    return files.map((f) => ({ ...f, owner: currentUserName, accessLevel: "all" }));
  } catch {
    return files.map((f) => ({ ...f, owner: currentUserName, accessLevel: "all" }));
  }
}

export async function createDocumentApi(file: File): Promise<ManagedDocumentDto> {
  if (file.size > 50 * 1024 * 1024) throw new Error("O arquivo excede o limite de 50 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx", "xlsx", "csv", "txt", "md"].includes(extension)) {
    throw new Error("Formato não permitido. Envie PDF, DOCX, XLSX, CSV, TXT ou MD.");
  }
  const form = new FormData();
  form.append("file", file);
  const currentUserName = store.getState().session.name || store.getState().session.email || "Meu Usuário";
  form.append("owner", currentUserName);
  const response = await api.post<ManagedDocumentDto>(`/documents/upload?owner=${encodeURIComponent(currentUserName)}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return response.data;
}

export async function fetchDocumentContentApi(name: string): Promise<Blob> {
  const response = await api.get<Blob>(`/documents/${encodeURIComponent(name)}/content`, { responseType: "blob" });
  return response.data;
}

export async function zipDocumentsApi(names: string[]): Promise<Blob> {
  const response = await api.post<Blob>("/documents/zip", { names }, {
    responseType: "blob",
    timeout: 330000,
  });
  return response.data;
}

export async function unzipDocumentsApi(file: File): Promise<ManagedDocumentDto[]> {
  if (file.size > 200 * 1024 * 1024) throw new Error("O ZIP excede o limite de 200 MB.");
  if (!file.name.toLowerCase().endsWith(".zip")) throw new Error("Selecione um arquivo .zip.");
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<ManagedDocumentDto[]>("/documents/unzip", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 330000,
  });
  return response.data;
}

export async function updateDocumentAccessApi(name: string, accessLevel: string): Promise<ManagedDocumentDto> {
  const response = await api.patch<ManagedDocumentDto>(`/documents/${encodeURIComponent(name)}/access`, { accessLevel });
  return response.data;
}

export async function deleteDocumentApi(name: string, reason: string): Promise<void> {
  await api.delete(`/documents/${encodeURIComponent(name)}`, { data: { reason } });
}
