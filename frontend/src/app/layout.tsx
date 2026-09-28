import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Console de administração",
  description: "Painel neutro de administração e operações",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
