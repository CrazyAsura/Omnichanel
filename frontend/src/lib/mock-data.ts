export type Person = { name: string; email: string; role: string; status: string; lastSeen: string; initials: string };
export const people: Person[] = [
  { name: "Marina Costa", email: "marina.costa@exemplo.com", role: "Super-admin", status: "Ativo", lastSeen: "Agora", initials: "MC" },
  { name: "Rafael Mendes", email: "rafael.mendes@exemplo.com", role: "Admin", status: "Ativo", lastSeen: "Há 12 min", initials: "RM" },
  { name: "Camila Oliveira", email: "camila.oliveira@exemplo.com", role: "Funcionário", status: "Bloqueado", lastSeen: "24 set", initials: "CO" },
  { name: "Lucas Ferreira", email: "lucas.ferreira@exemplo.com", role: "Funcionário", status: "Ativo", lastSeen: "Há 2 horas", initials: "LF" },
  { name: "Beatriz Lima", email: "beatriz.lima@exemplo.com", role: "Funcionário", status: "Inativo", lastSeen: "Há 3 dias", initials: "BL" },
  { name: "Rodrigo Silveira", email: "rodrigo.silveira@exemplo.com", role: "Admin", status: "Bloqueado", lastSeen: "Há 1 semana", initials: "RS" },
  { name: "Juliana Santos", email: "juliana.santos@exemplo.com", role: "Funcionário", status: "Inativo", lastSeen: "Há 2 dias", initials: "JS" },
];
export const activity = [
  { initials: "MC", user: "Marina Costa", action: "atualizou as permissões de", target: "Equipe de operações", time: "há 2 min", tone: "neutral" },
  { initials: "RM", user: "Rafael Mendes", action: "adicionou um arquivo em", target: "Documentos compartilhados", time: "há 18 min", tone: "blue" },
  { initials: "LF", user: "Lucas Ferreira", action: "criou uma nova chave de API", target: "Integração de produção", time: "há 43 min", tone: "green" },
  { initials: "MC", user: "Marina Costa", action: "exportou o relatório", target: "Atividade mensal", time: "há 1 hora", tone: "neutral" },
];
export const errors = [
  { id: "ERR-2048", title: "Falha ao processar solicitação", service: "api-gateway", severity: "Crítico", time: "Hoje, 14:32", code: "502" },
  { id: "ERR-2047", title: "Tempo limite na conexão", service: "worker-files", severity: "Alto", time: "Hoje, 14:18", code: "504" },
  { id: "ERR-2046", title: "Token de acesso expirado", service: "auth-service", severity: "Médio", time: "Hoje, 13:56", code: "401" },
  { id: "ERR-2045", title: "Falha ao validar payload", service: "api-gateway", severity: "Baixo", time: "Hoje, 13:21", code: "400" },
];
export const files = [
  { name: "Contrato de integração.pdf", owner: "Marina Costa", size: "2,4 MB", updated: "Hoje, 10:42", type: "PDF" },
  { name: "Especificação da API v2.pdf", owner: "Rafael Mendes", size: "1,8 MB", updated: "Ontem, 16:08", type: "PDF" },
  { name: "Base de conhecimento.docx", owner: "Camila Oliveira", size: "840 KB", updated: "24 set, 11:30", type: "DOC" },
  { name: "Relatório de operações.csv", owner: "Lucas Ferreira", size: "320 KB", updated: "23 set, 09:15", type: "CSV" },
];
export const integrations = [
  { name: "API de produção", kind: "REST API", endpoint: "api.exemplo.com/v1", status: "Ativa", requests: "128,4 mil" },
  { name: "Servidor de arquivos", kind: "MCP Server", endpoint: "files.internal/mcp", status: "Ativa", requests: "32,8 mil" },
  { name: "Ambiente de homologação", kind: "REST API", endpoint: "staging.exemplo.com/v1", status: "Atenção", requests: "8,2 mil" },
  { name: "Assistente interno", kind: "MCP Server", endpoint: "assistant.internal/mcp", status: "Inativa", requests: "—" },
];
export const reportRows = [
  { label: "Usuários ativos", value: "1.284", change: "+12,8%", width: "76%" },
  { label: "Requisições da API", value: "482.910", change: "+8,2%", width: "88%" },
  { label: "Arquivos armazenados", value: "8.492", change: "+4,1%", width: "58%" },
  { label: "Erros registrados", value: "142", change: "−2,4%", width: "24%" },
];
