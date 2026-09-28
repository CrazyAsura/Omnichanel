"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "motion/react";
import { LockKeyhole } from "lucide-react";
import { Button, Input } from "@/components/ui";

const emailSchema = z.object({ email: z.email("Informe um email válido.") });
const codeSchema = z.object({ code: z.string().length(6, "O código deve ter 6 dígitos.").regex(/^\d+$/, "Use apenas números.") });
const passwordSchema = z.object({ password: z.string().min(8, "Use pelo menos 8 caracteres."), confirm: z.string() }).refine((data) => data.password === data.confirm, { path: ["confirm"], message: "As senhas não coincidem." });

export default function ResetPasswordPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const emailForm = useForm<{ email: string }>({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm<{ code: string }>({ resolver: zodResolver(codeSchema) });
  const passwordForm = useForm<{ password: string; confirm: string }>({ resolver: zodResolver(passwordSchema) });
  function nextEmail(values: { email: string }) { setEmail(values.email); setStep(1); }
  function nextCode() { setStep(2); }
  function finish() { setDone(true); }
  const titles = ["Redefina sua senha", "Verifique seu email", "Crie uma nova senha"];
  const descriptions = ["Informe o email associado à sua conta.", `Enviamos um código de 6 dígitos para ${email || "seu email"}.`, "Escolha uma senha segura para sua conta."];
  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[440px]">
    <div className="mb-9 text-center"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white"><LockKeyhole size={19} strokeWidth={1.7}/></div><h1 className="text-2xl font-semibold tracking-tight">{done ? "Senha atualizada" : titles[step]}</h1><p className="mt-2 text-sm text-muted-foreground">{done ? "Sua senha foi redefinida com sucesso." : descriptions[step]}</p></div>
    <div className="mb-6 flex items-center gap-2">{titles.map((_, index) => <div key={index} className={`h-1 flex-1 rounded-full ${index <= step ? "bg-neutral-800" : "bg-neutral-200"}`} />)}</div>
    <div className="rounded-2xl border border-border bg-white p-7 shadow-[0_12px_40px_rgba(0,0,0,.035)]">
      {done ? <div className="space-y-4"><div className="text-center text-sm text-muted-foreground">Agora você já pode entrar usando sua nova senha.</div><Link href="/login"><Button className="w-full">Voltar para o login <span aria-hidden="true">→</span></Button></Link></div> : step === 0 ? <form onSubmit={emailForm.handleSubmit(nextEmail)} className="space-y-5"><div><label className="mb-2 block text-sm font-medium" htmlFor="reset-email">Email</label><Input id="reset-email" type="email" placeholder="nome@empresa.com" {...emailForm.register("email")} />{emailForm.formState.errors.email && <p className="mt-1.5 text-xs text-red-600">{emailForm.formState.errors.email.message}</p>}</div><Button className="w-full">Enviar código <span aria-hidden="true">→</span></Button></form> : step === 1 ? <form onSubmit={codeForm.handleSubmit(nextCode)} className="space-y-5"><div><label className="mb-2 block text-sm font-medium" htmlFor="verification-code">Código de verificação</label><Input id="verification-code" inputMode="numeric" maxLength={6} placeholder="000000" className="text-center text-lg tracking-[.35em]" {...codeForm.register("code")} />{codeForm.formState.errors.code && <p className="mt-1.5 text-xs text-red-600">{codeForm.formState.errors.code.message}</p>}<p className="mt-2 text-xs text-muted-foreground">Para demonstração, use qualquer código com 6 dígitos.</p></div><Button className="w-full">Verificar código <span aria-hidden="true">→</span></Button><button type="button" onClick={() => setStep(0)} className="w-full text-center text-xs text-muted-foreground hover:underline">Usar outro email</button></form> : <form onSubmit={passwordForm.handleSubmit(finish)} className="space-y-5"><div><label htmlFor="new-password" className="mb-2 block text-sm font-medium">Nova senha</label><Input id="new-password" type="password" placeholder="Mínimo de 8 caracteres" {...passwordForm.register("password")} />{passwordForm.formState.errors.password && <p className="mt-1.5 text-xs text-red-600">{passwordForm.formState.errors.password.message}</p>}</div><div><label htmlFor="confirm-password" className="mb-2 block text-sm font-medium">Confirmar nova senha</label><Input id="confirm-password" type="password" placeholder="Digite a senha novamente" {...passwordForm.register("confirm")} />{passwordForm.formState.errors.confirm && <p className="mt-1.5 text-xs text-red-600">{passwordForm.formState.errors.confirm.message}</p>}</div><Button className="w-full">Salvar nova senha <span aria-hidden="true">→</span></Button></form>}
    </div><Link href="/login" className="mt-7 block text-center text-sm text-muted-foreground hover:text-foreground">← Voltar para o login</Link>
  </motion.section></main>;
}
