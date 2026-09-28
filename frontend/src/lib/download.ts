import { BACKEND_URL } from "@/lib/api";

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
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadReportPdf(options?: {
  filename?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  download?: boolean;
}) {
  const query = new URLSearchParams();
  if (options?.startDate) query.append("startDate", options.startDate);
  if (options?.endDate) query.append("endDate", options.endDate);
  if (options?.title) query.append("title", options.title);
  query.append("download", options?.download !== false ? "true" : "false");

  const url = `${BACKEND_URL}/api/reports/executive/pdf?${query.toString()}`;

  if (options?.download === false) {
    window.open(url, "_blank");
  } else {
    const link = document.createElement("a");
    link.href = url;
    link.download = options?.filename ?? "relatorio-executivo-omnichannel.pdf";
    link.target = "_blank";
    link.click();
  }
}
