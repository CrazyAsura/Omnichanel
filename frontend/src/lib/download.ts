import { api } from "@/lib/api";

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadReportPdf(options?: {
  filename?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  download?: boolean;
}): Promise<void> {
  const params: Record<string, string> = {};
  if (options?.startDate) params.startDate = options.startDate;
  if (options?.endDate) params.endDate = options.endDate;
  if (options?.title) params.title = options.title;
  params.download = options?.download !== false ? "true" : "false";

  const response = await api.get<Blob>("/reports/executive/pdf", {
    params,
    responseType: "blob",
    timeout: 60000,
  });

  const filename = options?.filename ?? "relatorio-executivo-omnichannel.pdf";
  triggerBlobDownload(response.data, filename);
}

export async function downloadActivityLogsPdf(filename = "logs-de-atividades.pdf"): Promise<void> {
  const response = await api.get<Blob>("/logs/activity/pdf", {
    responseType: "blob",
    timeout: 60000,
  });
  triggerBlobDownload(response.data, filename);
}

export async function downloadErrorLogsPdf(filename = "logs-de-erros.pdf"): Promise<void> {
  const response = await api.get<Blob>("/logs/errors/pdf", {
    responseType: "blob",
    timeout: 60000,
  });
  triggerBlobDownload(response.data, filename);
}
