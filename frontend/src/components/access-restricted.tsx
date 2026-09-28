"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Button, Card } from "@/components/ui";

export function AccessRestricted({
  title = "Acesso Restrito",
  description = "Você não possui permissão para acessar esta área. Esta funcionalidade é de uso exclusivo de Super-administradores.",
  backHref = "/admin",
  backLabel = "Voltar ao painel",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.15 }}
      className="flex min-h-[60vh] items-center justify-center p-4"
    >
      <Card className="max-w-md p-8 text-center border-border shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-center">
          <Link href={backHref}>
            <Button variant="outline">
              <ArrowLeft size={14} />
              {backLabel}
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}
