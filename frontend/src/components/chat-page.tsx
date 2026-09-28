"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AudioLines, Bot, Check, Copy, FileText, History, Menu, Mic, MicOff, Pencil, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import { files } from "@/lib/mock-data";
import { sendChatMessage, synthesizeSpeech } from "@/lib/api";

type Message = { id: number; role: "assistant" | "employee"; content: string; file?: { name: string; text: string }; time: string };
type Thread = { id: string; title: string; messages: Message[]; updatedAt: number };
type AgentMode = "Leitor de documentos internos" | "Analista de dados" | "Gerador de arquivos";
type SpeechEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal?: boolean;
      length: number;
      [item: number]: { transcript: string };
    };
  };
};
type SpeechRecognitionLike = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const storageKey = "omnichanel-chat-history";
const initialMessage: Message = { id: 1, role: "assistant", content: "Olá! Sou o assistente interno. Posso ajudar a encontrar informações nos documentos da empresa, preparar relatórios e gerar arquivos. O que você precisa hoje?", time: "Agora" };
const newThread = (): Thread => ({ id: crypto.randomUUID(), title: "Nova conversa", messages: [initialMessage], updatedAt: Date.now() });
const quickPrompts = ["Resuma o contrato de integração", "Crie um relatório das operações do mês", "Quais são as regras de acesso aos arquivos?"];
const availableDocs = [...files.map((file) => ({ name: file.name, detail: `${file.type} · ${file.size}` })), { name: "Manual de processos internos.pdf", detail: "PDF · 1,2 MB" }, { name: "Política de segurança.docx", detail: "DOC · 540 KB" }];

const agentModes: { id: AgentMode; label: string; description: string }[] = [
  {
    id: "Leitor de documentos internos",
    label: "Leitor de documentos internos",
    description: "Consulta e sintetiza políticas, manuais e bases de conhecimento corporativas.",
  },
  {
    id: "Analista de dados",
    label: "Analista de dados",
    description: "Cruza indicadores, extrai métricas e analisa informações operacionais.",
  },
  {
    id: "Gerador de arquivos",
    label: "Gerador de arquivos",
    description: "Elabora resumos, relatórios estruturados e documentações exportáveis.",
  },
];

export function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([availableDocs[0].name, availableDocs[1].name]);
  const [enabledSources, setEnabledSources] = useState<string[]>(["Base de documentos", "SharePoint", "CRM interno"]);
  const [agentMode, setAgentMode] = useState<AgentMode>("Leitor de documentos internos");
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [notice, setNotice] = useState("");
  const pathname = usePathname();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechRef = useRef<{ controller: AbortController; audio?: HTMLAudioElement; url?: string } | null>(null);
  const [speechText, setSpeechText] = useState<string | null>(null);
  const [speechLoading, setSpeechLoading] = useState(false);

  function stopSpeech() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    const current = speechRef.current;
    speechRef.current = null;
    current?.controller.abort();
    current?.audio?.pause();
    if (current?.url) URL.revokeObjectURL(current.url);
  }

  useEffect(() => {
    stopSpeech();
    setSpeechText(null);
    setSpeechLoading(false);
    return stopSpeech;
  }, [activeId]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modePickerRef = useRef<HTMLDivElement>(null);
  const filePickerRef = useRef<HTMLDivElement>(null);
  const activeThread = threads.find((thread) => thread.id === activeId);
  const messages = activeThread?.messages ?? [initialMessage];

  // Fecha menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modePickerOpen && modePickerRef.current && !modePickerRef.current.contains(event.target as Node)) {
        setModePickerOpen(false);
      }
      if (filePickerOpen && filePickerRef.current && !filePickerRef.current.contains(event.target as Node)) {
        setFilePickerOpen(false);
      }
    }
    if (modePickerOpen || filePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [modePickerOpen, filePickerOpen]);

  // Auto-resize textarea like Gemini with invisible scrollbar
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 200)}px`;
    }
  }, [prompt]);

  // Smooth auto-scroll when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { threads?: Thread[]; activeId?: string } | null;
        if (saved?.threads?.length && saved.threads.every((thread) => typeof thread.id === "string" && Array.isArray(thread.messages))) {
          setThreads(saved.threads);
          setActiveId(saved.threads.some((thread) => thread.id === saved.activeId) ? saved.activeId! : saved.threads[0].id);
        } else {
          const first = newThread();
          setThreads([first]);
          setActiveId(first.id);
        }
      } catch {
        const first = newThread();
        setThreads([first]);
        setActiveId(first.id);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated && threads.length) localStorage.setItem(storageKey, JSON.stringify({ threads, activeId }));
  }, [threads, activeId, hydrated]);

  function startConversation() {
    const thread = newThread();
    setThreads((current) => [thread, ...current]);
    setActiveId(thread.id);
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setEditingMessageId(null);
    setModePickerOpen(false);
    setFilePickerOpen(false);
    setMobileHistoryOpen(false);
    setNotice("");
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setEditingMessageId(null);
    setModePickerOpen(false);
    setFilePickerOpen(false);
    setMobileHistoryOpen(false);
    setNotice("");
  }

  function deleteConversation(id: string) {
    const remaining = threads.filter((thread) => thread.id !== id);
    if (!remaining.length) {
      const next = newThread();
      setThreads([next]);
      setActiveId(next.id);
    } else {
      setThreads(remaining);
      if (activeId === id) setActiveId(remaining[0].id);
    }
    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setEditingMessageId(null);
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>, preset?: string) {
    event?.preventDefault();
    if (!activeThread) return;
    const text = (preset ?? prompt).trim();
    if (!text) return;
    const baseMessages = editingMessageId ? messages.filter((message) => message.id < editingMessageId) : messages;
    const nextId = Math.max(...baseMessages.map((message) => message.id), 0) + 1;
    const employeeMessage: Message = { id: editingMessageId ?? nextId, role: "employee", content: text, time: "Agora" };
    const tempAssistantId = employeeMessage.id + 1;

    // Resposta preliminar de pensamento
    const pendingAssistantMessage: Message = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      time: "Agora",
    };

    const title = activeThread.title === "Nova conversa" ? (text.length > 38 ? `${text.slice(0, 38)}…` : text) : activeThread.title;
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeId
          ? { ...thread, title, messages: [...baseMessages, employeeMessage, pendingAssistantMessage], updatedAt: Date.now() }
          : thread
      )
    );

    setPrompt("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setEditingMessageId(null);
    setModePickerOpen(false);
    setFilePickerOpen(false);
    setNotice("");

    try {
      // Chamada real ao backend Spring Boot / AgentScope
      const backendResp = await sendChatMessage({
        sessionId: activeId,
        message: text,
        agentMode,
        selectedDocs,
        enabledSources,
      });

      const finalAssistantMessage: Message = {
        id: tempAssistantId,
        role: "assistant",
        content: backendResp.reply,
        file: backendResp.file ? { name: backendResp.file.name, text: backendResp.file.content } : undefined,
        time: "Agora",
      };

      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeId
            ? { ...thread, messages: [...baseMessages, employeeMessage, finalAssistantMessage], updatedAt: Date.now() }
            : thread
        )
      );
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      const errorMsg =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.message ||
        (error instanceof Error ? error.message : "Falha na comunicação com o backend");
      const errorAssistantMessage: Message = {
        id: tempAssistantId,
        role: "assistant",
        content: `Erro ao processar mensagem no backend: ${errorMsg}`,
        time: "Agora",
      };

      setThreads((current) =>
        current.map((thread) =>
          thread.id === activeId
            ? { ...thread, messages: [...baseMessages, employeeMessage, errorAssistantMessage], updatedAt: Date.now() }
            : thread
        )
      );
      setNotice(`Falha na API: ${errorMsg}`);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
    else if (event.key === "@" && (event.currentTarget.selectionStart === 0 || /\s/.test(event.currentTarget.value.slice(0, event.currentTarget.selectionStart).slice(-1)))) { event.preventDefault(); setModePickerOpen(true); setFilePickerOpen(false); }
    else if (event.key === "/" && (event.currentTarget.selectionStart === 0 || /\s/.test(event.currentTarget.value.slice(0, event.currentTarget.selectionStart).slice(-1)))) { event.preventDefault(); setFilePickerOpen(true); setModePickerOpen(false); }
    else if (event.key === "Escape") { setModePickerOpen(false); setFilePickerOpen(false); }
  }

  function startVoiceInput() {
    if (voiceListening) {
      recognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }
    const speech = window as SpeechWindow;
    const Recognition = speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("O reconhecimento de voz não está disponível neste navegador.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    const basePrompt = prompt.trim();

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        const text = item?.[0]?.transcript;
        if (text) {
          if (item.isFinal) {
            finalTranscript += (finalTranscript ? " " : "") + text.trim();
          } else {
            interimTranscript += (interimTranscript ? " " : "") + text.trim();
          }
        }
      }
      const combined = [basePrompt, finalTranscript, interimTranscript]
        .filter(Boolean)
        .join(" ");
      setPrompt(combined);
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      setNotice("Não foi possível reconhecer o áudio. Tente novamente.");
    };
    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceListening(true);
      setNotice("Ouvindo... fale sua pergunta.");
    } catch {
      setVoiceListening(false);
      setNotice("Não foi possível acessar o microfone.");
    }
  }

  async function readAnswer(text: string) {
    const stopping = speechText === text;
    stopSpeech();
    setSpeechText(null);
    setSpeechLoading(false);
    if (stopping) { setNotice("Leitura interrompida."); return; }
    const hasWebSpeech = typeof window !== "undefined" && "speechSynthesis" in window;
    const current: NonNullable<typeof speechRef.current> = { controller: new AbortController() };
    speechRef.current = current;
    setSpeechText(text);
    try {
      // Tenta síntese neural de alta qualidade pelo backend
      const chunks: string[] = [];
      let remaining = text.trim();
      while (remaining) {
        let end = Math.min(1800, remaining.length);
        if (end < remaining.length) {
          const boundary = remaining.lastIndexOf(" ", end);
          if (boundary > 0) end = boundary;
        }
        chunks.push(remaining.slice(0, end));
        remaining = remaining.slice(end).trimStart();
      }
      for (const chunk of chunks) {
        if (current.controller.signal.aborted) return;
        setSpeechLoading(true);
        setNotice("Preparando áudio em português…");
        const blob = await synthesizeSpeech(chunk, current.controller.signal);
        if (current.controller.signal.aborted) return;
        current.url = URL.createObjectURL(blob);
        current.audio = new Audio(current.url);
        setSpeechLoading(false);
        setNotice("Lendo resposta com voz neural. Clique no botão de áudio para parar.");
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => resolve();
          const finish = (error?: Error) => {
            current.controller.signal.removeEventListener("abort", onAbort);
            if (error) reject(error); else resolve();
          };
          current.controller.signal.addEventListener("abort", onAbort, { once: true });
          current.audio!.onended = () => finish();
          current.audio!.onerror = () => finish(new Error("Audio playback failed"));
          current.audio!.play().catch(() => finish(new Error("Audio playback blocked")));
        });
        if (current.url) URL.revokeObjectURL(current.url);
        current.url = undefined;
      }
      if (!current.controller.signal.aborted) setNotice("Leitura concluída.");
      return;
    } catch (err: unknown) {
      if (current.controller.signal.aborted) return;
      console.warn("Voz neural do backend indisponível, acionando sintetizador nativo do navegador:", err);
      if (hasWebSpeech) {
        setSpeechLoading(false);
        setNotice("Lendo resposta com voz do navegador. Clique para parar.");
        try {
          window.speechSynthesis.cancel();
          const cleanText = text
            .replace(/```[\s\S]*?```/g, " Trecho de código omitido. ")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/[#*_`>|]/g, " ")
            .trim();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = "pt-BR";
          utterance.rate = 1.0;
          await new Promise<void>((resolve) => {
            const onAbort = () => {
              window.speechSynthesis.cancel();
              resolve();
            };
            current.controller.signal.addEventListener("abort", onAbort, { once: true });
            utterance.onend = () => {
              current.controller.signal.removeEventListener("abort", onAbort);
              resolve();
            };
            utterance.onerror = () => {
              current.controller.signal.removeEventListener("abort", onAbort);
              resolve();
            };
            window.speechSynthesis.speak(utterance);
          });
          if (!current.controller.signal.aborted) setNotice("Leitura concluída.");
          return;
        } catch (synthErr) {
          console.error("Erro na síntese nativa do navegador:", synthErr);
        }
      }
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.detail || axiosErr.response?.data?.message || (err instanceof Error ? err.message : null);
      setNotice(msg ? `Falha na voz: ${msg}` : "Não foi possível reproduzir a voz. Verifique sua conexão e tente novamente.");
    } finally {
      if (speechRef.current === current) {
        stopSpeech();
        setSpeechText(null);
        setSpeechLoading(false);
      }
    }
  }

  async function copyAnswer(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("Resposta copiada."); }
    catch { setNotice("Não foi possível acessar a área de transferência neste navegador."); }
  }

  function downloadFile(file: { name: string; text: string }) {
    const url = URL.createObjectURL(new Blob([file.text], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`${file.name} foi baixado.`);
  }

  return <div className="relative flex h-dvh min-w-0 overflow-hidden bg-white">
    {mobileHistoryOpen && <button type="button" aria-label="Fechar histórico" onClick={() => setMobileHistoryOpen(false)} className="absolute inset-0 z-30 bg-black/20 md:hidden" />}
    <aside className={`${mobileHistoryOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-40 w-[270px] shrink-0 flex-col border-r border-border bg-stone-50 px-3 py-4 md:relative md:z-auto ${historyVisible ? "md:flex" : "md:hidden"}`}>
      <div className="flex items-center justify-between gap-2 px-2">
        <p className="text-xs font-semibold text-stone-800">Histórico</p>
        <button type="button" aria-label="Fechar histórico" onClick={() => setMobileHistoryOpen(false)} className="rounded-md p-1 text-stone-500 hover:bg-stone-200 md:hidden"><X size={16}/></button>
      </div>
      <button type="button" onClick={startConversation} className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium text-stone-800 transition hover:bg-stone-100"><Plus size={16}/>Nova conversa</button>
      <p className="mt-7 px-2 text-[10px] font-medium uppercase tracking-[.12em] text-stone-400">Recentes</p>
      <nav aria-label="Histórico de conversas" className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {[...threads].sort((a, b) => b.updatedAt - a.updatedAt).map((thread) => <div key={thread.id} className={`group flex items-center rounded-lg ${thread.id === activeId ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:bg-white/70"}`}>
          <button type="button" onClick={() => selectConversation(thread.id)} aria-current={thread.id === activeId ? "page" : undefined} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-xs">{thread.title}</button>
          <button type="button" onClick={() => deleteConversation(thread.id)} aria-label={`Excluir ${thread.title}`} title="Excluir conversa" className="mr-1 rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"><Trash2 size={13}/></button>
        </div>)}
      </nav>
      <p className="border-t border-border px-2 pt-3 text-[10px] leading-4 text-stone-400">Histórico salvo neste navegador.</p>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversa">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 pl-14 md:px-5 lg:pl-5">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => setHistoryVisible((value) => !value)} aria-label={historyVisible ? "Ocultar histórico" : "Mostrar histórico"} title="Mostrar ou ocultar histórico" className="hidden rounded-lg p-2 text-stone-500 hover:bg-stone-100 md:block"><History size={17}/></button>
          <button type="button" onClick={() => setMobileHistoryOpen(true)} aria-label="Mostrar histórico" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 md:hidden"><Menu size={17}/></button>
          <span className="truncate text-sm font-medium text-stone-800">{activeThread?.title ?? "Nova conversa"}</span>
        </div>
        <button type="button" onClick={startConversation} aria-label="Nova conversa" title="Nova conversa" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><Plus size={18}/></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 1 && <div className="pt-[min(12vh,100px)] text-center"><div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white"><Sparkles size={19}/></div><h1 className="text-lg font-semibold tracking-tight">Como posso ajudar?</h1><p className="mt-2 text-xs text-stone-500">Pergunte sobre processos, peça um resumo ou gere um arquivo.</p><div className="mt-6 flex flex-wrap justify-center gap-2">{quickPrompts.map((item) => <button type="button" key={item} onClick={() => sendMessage(undefined, item)} className="rounded-full border border-border px-3 py-2 text-[11px] text-stone-600 hover:border-stone-400 hover:text-stone-900">{item}</button>)}</div></div>}
          <AnimatePresence initial={false}>{messages.map((message) => <ChatMessage key={message.id} message={message} speechState={speechText === message.content ? (speechLoading ? "loading" : "playing") : "idle"} onEdit={(item) => { setEditingMessageId(item.id); setPrompt(item.content); setNotice("Edite a pergunta e envie novamente."); }} onRead={readAnswer} onCopy={copyAnswer} onDownload={downloadFile}/>)}</AnimatePresence>
          {notice && <p role="status" className="text-center text-[11px] text-stone-500">{notice}</p>}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 bg-white px-4 pb-4 pt-2 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {selectedDocs.length > 0 && <div className="mb-2 flex flex-wrap gap-1.5">{selectedDocs.map((doc) => <span key={doc} className="flex max-w-full items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-[10px] text-stone-700"><FileText size={11}/><span className="truncate">{doc}</span><button type="button" aria-label={`Remover ${doc}`} onClick={() => setSelectedDocs((current) => current.filter((item) => item !== doc))}><X size={11}/></button></span>)}</div>}
          <div className="relative">
            {modePickerOpen && (
              <div
                ref={modePickerRef}
                className="absolute bottom-full left-0 z-20 mb-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-white p-2 shadow-xl ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between px-2.5 py-1.5 text-stone-400">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Modos do agente</p>
                  <span className="text-[10px] font-medium text-stone-400">@</span>
                </div>
                <div className="space-y-1">
                  {agentModes.map((mode) => {
                    const isSelected = agentMode === mode.id;
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => {
                          setAgentMode(mode.id);
                          setModePickerOpen(false);
                          setNotice(`Modo selecionado: ${mode.id}.`);
                        }}
                        className={`group flex w-full items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                          isSelected ? "bg-stone-100 text-stone-900" : "hover:bg-stone-50 text-stone-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-stone-900 leading-snug">{mode.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{mode.description}</p>
                        </div>
                        {isSelected && <Check size={14} className="mt-0.5 shrink-0 text-stone-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {filePickerOpen && (
              <div
                ref={filePickerRef}
                className="absolute bottom-full left-0 z-20 mb-2 max-h-56 w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-xl ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between px-2.5 py-1.5 text-stone-400">
                  <p className="text-[10px] font-medium text-stone-500">Selecionar arquivo</p>
                  <span className="text-[10px] font-medium text-stone-400">/</span>
                </div>
                {availableDocs.map((doc) => (
                  <button
                    type="button"
                    key={doc.name}
                    onClick={() => {
                      setSelectedDocs((current) => (current.includes(doc.name) ? current : [...current, doc.name]));
                      setFilePickerOpen(false);
                      setNotice(`${doc.name} selecionado como fonte.`);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-stone-100"
                  >
                    <FileText size={14} />
                    <span className="min-w-0 flex-1 truncate text-[10px]">{doc.name}</span>
                    <span className="text-[9px] text-stone-500">{doc.detail}</span>
                  </button>
                ))}
              </div>
            )}
                        <form
              onSubmit={sendMessage}
              className={`rounded-3xl border bg-white p-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all ${
                voiceListening
                  ? "border-red-400 ring-2 ring-red-100/80 shadow-[0_4px_24px_rgba(239,68,68,0.12)]"
                  : "border-border focus-within:border-stone-400"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                placeholder={voiceListening ? "Ouvindo... fale agora..." : "Pergunte sobre documentos, processos ou sistemas internos..."}
                className="max-h-48 min-h-[44px] w-full resize-none overflow-y-auto no-scrollbar bg-transparent px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-stone-400"
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setModePickerOpen((current) => !current);
                    setFilePickerOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-stone-50/80 px-2.5 py-1 text-[11px] font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900"
                  title="Alterar modo do agente (@)"
                >
                  <Bot size={13} className="text-stone-500" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{agentMode}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <AnimatePresence>
                    {voiceListening && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, x: 8 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.85, x: 8 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50/90 px-2.5 py-1 text-red-600 shadow-xs"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                        </span>
                        <span className="text-[11px] font-medium select-none">Ouvindo</span>
                        <span className="flex h-3.5 items-center gap-[2.5px] px-0.5" role="img" aria-label="Microfone ativo gravando áudio">
                          {[
                            { h: [4, 15, 6, 17, 4], d: 0.65 },
                            { h: [6, 19, 9, 13, 6], d: 0.5 },
                            { h: [9, 23, 13, 19, 9], d: 0.75 },
                            { h: [6, 17, 11, 21, 6], d: 0.55 },
                            { h: [4, 13, 7, 15, 4], d: 0.6 },
                          ].map((bar, i) => (
                            <motion.span
                              key={i}
                              className="w-[2.5px] rounded-full bg-red-600"
                              animate={{ height: bar.h, opacity: [0.65, 1, 0.75, 1, 0.65] }}
                              transition={{ duration: bar.d, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
                            />
                          ))}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative flex items-center justify-center">
                    {voiceListening && (
                      <>
                        <motion.span
                          className="absolute inset-0 rounded-full bg-red-500/25 pointer-events-none"
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: [1, 1.7, 2.3], opacity: [0.8, 0.35, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                        <motion.span
                          className="absolute inset-0 rounded-full bg-red-500/35 pointer-events-none"
                          initial={{ scale: 1, opacity: 0.9 }}
                          animate={{ scale: [1, 1.35, 1.75], opacity: [0.9, 0.45, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.35, ease: "easeOut" }}
                        />
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={voiceListening ? "Parar gravação" : "Perguntar por voz"}
                      title={voiceListening ? "Parar gravação (ouvindo...)" : "Perguntar por voz"}
                      className={`relative z-10 h-8 w-8 rounded-full p-0 transition-all ${
                        voiceListening
                          ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/30"
                          : "hover:bg-stone-100 text-stone-600"
                      }`}
                      onClick={startVoiceInput}
                    >
                      <motion.div
                        animate={voiceListening ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                        transition={voiceListening ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : undefined}
                        className="flex items-center justify-center"
                      >
                        {voiceListening ? <MicOff size={15} /> : <Mic size={15} />}
                      </motion.div>
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={!prompt.trim()}
                    aria-label="Enviar mensagem"
                    className="h-8 w-8 rounded-full p-0"
                  >
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            </form>
          </div>
          <p className="mt-2 text-center text-[10px] text-stone-400">Respostas e arquivos são demonstrações e não consultam dados corporativos reais.</p>
        </div>
      </div>
    </section>
  </div>;
}

function ChatMessage({ message, speechState, onEdit, onRead, onCopy, onDownload }: { message: Message; speechState: "idle" | "loading" | "playing"; onEdit: (message: Message) => void; onRead: (text: string) => void; onCopy: (text: string) => void; onDownload: (file: { name: string; text: string }) => void }) {
  const isEmployee = message.role === "employee";
  const isThinking = !isEmployee && !message.content;
  return <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${isEmployee ? "justify-end" : "justify-start"}`}>
    {!isEmployee && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white"><Bot size={14}/></div>}
    <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${isEmployee ? "rounded-br-md bg-neutral-900 text-white" : "rounded-bl-md border border-border bg-white"}`}>
      {isThinking ? <div className="flex h-5 items-center gap-1.5 px-1" role="status" aria-label="Consultando agente especialista via gRPC"><span className="sr-only">Consultando agente especialista via gRPC</span>{[0, 1, 2].map((dot) => <motion.span key={dot} className="h-1.5 w-1.5 rounded-full bg-stone-500" animate={{ y: [0, -4, 0], opacity: [0.45, 1, 0.45] }} transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.16, ease: "easeInOut" }} />)}</div> : <p className="whitespace-pre-line text-xs leading-5">{message.content}</p>}
      {message.file && <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-stone-50 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white"><FileText size={15}/></div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{message.file.name}</p><p className="text-[10px] text-stone-500">Markdown · arquivo gerado</p></div><button type="button" onClick={() => onDownload(message.file!)} aria-label="Baixar arquivo gerado" className="rounded-md px-2 py-1 text-[10px] font-medium hover:bg-white">Baixar</button></div>}
      <div className="mt-2 flex items-center justify-between gap-4"><p className={`text-[9px] ${isEmployee ? "text-white/60" : "text-stone-500"}`}>{message.time}</p>{isEmployee ? <button type="button" aria-label="Editar pergunta" title="Editar pergunta" onClick={() => onEdit(message)} className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"><Pencil size={12}/></button> : <div className="flex items-center gap-1"><button type="button" aria-label={speechState === "idle" ? "Ouvir resposta" : "Parar leitura"} title={speechState === "loading" ? "Preparando áudio — clique para cancelar" : speechState === "playing" ? "Parar leitura" : "Ouvir resposta"} aria-pressed={speechState !== "idle"} onClick={() => onRead(message.content)} className="flex h-6 min-w-7 items-center justify-center gap-[2px] rounded px-1 text-stone-500 hover:bg-stone-100" ><AudioLines size={13} className={speechState === "loading" ? "animate-pulse" : speechState === "playing" ? "text-neutral-900" : ""}/>{speechState === "playing" && <span className="flex h-3 items-center gap-[2px]" role="img" aria-label="Áudio em reprodução">{[0, 1, 2, 3].map((bar) => <motion.span key={bar} className="w-[2px] rounded-full bg-neutral-800" animate={{ height: [3, 11, 5, 9, 3], opacity: [0.55, 1, 0.75, 1, 0.55] }} transition={{ duration: 0.75, repeat: Infinity, delay: bar * 0.12, ease: "easeInOut" }} />)}</span>}</button><button type="button" aria-label="Copiar resposta" title="Copiar resposta" onClick={() => onCopy(message.content)} className="rounded p-1 text-stone-500 hover:bg-stone-100"><Copy size={13}/></button></div>}</div>
    </div>
    {isEmployee && <Avatar initials="LF" className="mt-1 h-7 w-7 text-[9px]"/>}
  </motion.div>;
}
