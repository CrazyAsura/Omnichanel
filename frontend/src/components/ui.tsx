import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger" }) {
  return <button className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition active:scale-[0.98] hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-primary text-primary-foreground", variant === "outline" && "border border-border bg-card text-foreground", variant === "ghost" && "text-muted-foreground hover:bg-muted", variant === "danger" && "bg-red-50 text-red-700", className)} {...props} />;
}
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200", className)} {...props} />;
}
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-border bg-card", className)}>{children}</section>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">{eyebrow}</p><h1 className="text-[28px] font-semibold tracking-tight">{title}</h1><p className="mt-1.5 text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}
export function Status({ children }: { children: string }) {
  const style =
    children === "Ativo" || children === "Ativa"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
      : children === "Inativo" || children === "Inativa"
      ? "bg-stone-100 text-stone-600 border border-stone-200/60"
      : children === "Bloqueado" || children === "Bloqueada"
      ? "bg-rose-50 text-rose-700 border border-rose-200/60"
      : children === "Pendente" || children === "Atenção" || children === "Alto"
      ? "bg-amber-50 text-amber-700 border border-amber-200/50"
      : children === "Crítico"
      ? "bg-red-50 text-red-700 border border-red-200/60"
      : children === "Médio"
      ? "bg-orange-50 text-orange-700 border border-orange-200/50"
      : "bg-muted text-muted-foreground";
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", style)}>{children}</span>;
}
export function SearchField({ placeholder = "Buscar...", value, onChange }: { placeholder?: string; value?: string; onChange?: (value: string) => void }) {
  return <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-white px-3 text-muted-foreground"><span aria-hidden="true">⌕</span><input aria-label={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70" /></label>;
}
export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700", className)}>{initials}</span>;
}
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-stone-200/80 dark:bg-stone-800", className)} {...props} />;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
    : undefined;
  const endItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min(currentPage * pageSize, totalItems)
    : undefined;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground", className)}>
      <div>
        {totalItems !== undefined && totalItems > 0 && startItem !== undefined && endItem !== undefined ? (
          <span>
            Mostrando <strong className="font-medium text-foreground">{startItem}</strong>–<strong className="font-medium text-foreground">{endItem}</strong> de <strong className="font-medium text-foreground">{totalItems}</strong> itens
          </span>
        ) : totalItems !== undefined ? (
          <span>{totalItems} itens</span>
        ) : (
          <span>Página {currentPage} de {safeTotalPages}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2.5 text-xs font-normal"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
          Anterior
        </Button>

        {safeTotalPages > 1 && (
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: safeTotalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === safeTotalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                  acc.push(`dots-${idx}`);
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item) =>
                typeof item === "string" ? (
                  <span key={item} className="px-1 text-muted-foreground/60 select-none">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPageChange(item)}
                    aria-current={currentPage === item ? "page" : undefined}
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition active:scale-95",
                      currentPage === item
                        ? "bg-neutral-900 text-white font-semibold dark:bg-stone-100 dark:text-stone-900 shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item}
                  </button>
                )
              )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-8 px-2.5 text-xs font-normal"
          disabled={currentPage >= safeTotalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
