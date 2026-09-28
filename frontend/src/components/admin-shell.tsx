"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRightLeft,
  Bell,
  Bot,
  ChevronDown,
  CircleHelp,
  FileText,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { searchAdmin } from "@/lib/api";
import { setRole, signOut, type AppDispatch, type RootState, type UserRole } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

export function AdminShell({
  children,
  role: propRole,
}: {
  children: React.ReactNode;
  role?: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const session = useSelector((state: RootState) => state.session);

  // Determine current active role from prop or route path
  const currentRole: UserRole =
    propRole ??
    (pathname.startsWith("/super-admin")
      ? "super-admin"
      : pathname.startsWith("/funcionario")
      ? "funcionario"
      : "admin");

  useEffect(() => {
    if (session.role !== currentRole) {
      dispatch(setRole(currentRole));
    }
  }, [currentRole, session.role, dispatch]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fullScreenRoute =
    pathname === "/admin/chat" ||
    pathname === "/super-admin/chat" ||
    pathname === "/funcionario/chat" ||
    pathname === "/funcionario" ||
    pathname === "/super-admin/integrations" ||
    pathname === "/admin/integrations";

  // Build navigation items according to role
  let primaryNav: NavItem[] = [];
  let observabilityNav: NavItem[] = [];

  if (currentRole === "super-admin") {
    primaryNav = [
      { label: "Visão geral", href: "/super-admin", icon: LayoutDashboard },
      { label: "Chat", href: "/super-admin/chat", icon: Bot },
      { label: "Usuários", href: "/super-admin/users", icon: Users },
      { label: "Arquivos", href: "/super-admin/files", icon: FolderOpen },
      { label: "APIs e MCPs", href: "/super-admin/integrations", icon: KeyRound },
      { label: "Relatórios", href: "/super-admin/reports", icon: FileText },
    ];
    observabilityNav = [
      { label: "Atividades", href: "/super-admin/activity", icon: Activity },
      { label: "Erros", href: "/super-admin/errors", icon: ShieldAlert },
    ];
  } else if (currentRole === "admin") {
    primaryNav = [
      { label: "Visão geral", href: "/admin", icon: LayoutDashboard },
      { label: "Chat", href: "/admin/chat", icon: Bot },
      { label: "Usuários", href: "/admin/users", icon: Users },
      { label: "APIs e MCPs", href: "/admin/integrations", icon: KeyRound },
      { label: "Relatórios", href: "/admin/reports", icon: FileText },
    ];
    observabilityNav = [];
  } else {
    // Funcionário ONLY sees the chat.
    primaryNav = [
      { label: "Chat Interno", href: "/funcionario/chat", icon: Bot },
    ];
    observabilityNav = [];
  }

  const allNav = [...primaryNav, ...observabilityNav];

  const { data: searchResults = [], isFetching: searchLoading } = useQuery({
    queryKey: ["admin-search", globalSearch],
    queryFn: () => searchAdmin(globalSearch),
    enabled: searchOpen && globalSearch.trim().length > 1,
  });

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && href !== "/super-admin" && pathname.startsWith(`${href}/`));

  const currentPage = allNav.find((item) => isActive(item.href))?.label ?? "Visão geral";

  const resultHref = (category: string) => {
    if (currentRole === "admin") {
      return { user: "/admin/users" }[category] ?? "/admin";
    }
    return (
      {
        user: "/super-admin/users",
        file: "/super-admin/files",
        integration: "/super-admin/integrations",
        activity: "/super-admin/activity",
        error: "/super-admin/errors",
      }[category] ?? "/super-admin"
    );
  };

  function logout() {
    dispatch(signOut());
    router.push("/login");
  }

  function switchRole(newRole: UserRole) {
    setProfileOpen(false);
    if (newRole === "super-admin") {
      router.push("/super-admin");
    } else if (newRole === "admin") {
      router.push("/admin");
    } else {
      router.push("/funcionario/chat");
    }
  }

  const roleLabels: Record<UserRole, { title: string; badge: string; color: string }> = {
    "super-admin": { title: "Super-admin", badge: "Acesso total", color: "bg-purple-50 text-purple-700 border-purple-200" },
    admin: { title: "Administrador", badge: "Gestão & Equipe", color: "bg-blue-50 text-blue-700 border-blue-200" },
    funcionario: { title: "Funcionário", badge: "Chat exclusivo", color: "bg-stone-100 text-stone-700 border-stone-200" },
  };

  function renderNavItems(items: NavItem[]) {
    return items.map(({ label, href, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? label : undefined}
        aria-label={label}
        aria-current={isActive(href) ? "page" : undefined}
        className={cn(
          "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500",
          collapsed && "lg:justify-center lg:px-0",
          isActive(href)
            ? "bg-stone-100 font-medium text-stone-950"
            : "text-stone-500 hover:bg-stone-100/70 hover:text-stone-900"
        )}
      >
        <Icon size={18} strokeWidth={1.8} className="shrink-0" />
        <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
      </Link>
    ));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {fullScreenRoute && (
        <button
          type="button"
          aria-label="Abrir navegação principal"
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-stone-600 shadow-sm hover:bg-stone-100 lg:hidden"
        >
          <Menu size={19} />
        </button>
      )}

      {mobileOpen && (
        <button
          aria-label="Fechar navegação"
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-white px-3 py-4 transition-[width,transform] duration-200 ease-out lg:translate-x-0",
          collapsed && "lg:w-[72px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-6 flex h-10 items-center justify-between gap-2 px-2">
          <div className={cn("flex flex-col min-w-0", collapsed && "lg:hidden")}>
            <span className="truncate text-sm font-semibold tracking-tight text-stone-900">
              Workspace
            </span>
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              {roleLabels[currentRole].title}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 lg:inline-flex"
          >
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.7} /> : <PanelLeftClose size={18} strokeWidth={1.7} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar navegação"
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Navegação principal" className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">{renderNavItems(primaryNav)}</div>

          {observabilityNav.length > 0 && (
            <div className="border-t border-border pt-4">
              <p
                className={cn(
                  "mb-2 px-3 text-[10px] font-medium uppercase tracking-[.12em] text-stone-400",
                  collapsed && "lg:hidden"
                )}
              >
                Observabilidade
              </p>
              <div className="space-y-1">{renderNavItems(observabilityNav)}</div>
            </div>
          )}
        </nav>

        <div className="space-y-1 border-t border-border pt-3">
          {currentRole === "super-admin" && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                router.push("/super-admin/reports");
              }}
              title={collapsed ? "Configurações" : undefined}
              aria-label="Configurações"
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] text-stone-500 hover:bg-stone-100 hover:text-stone-900",
                collapsed && "lg:justify-center lg:px-0"
              )}
            >
              <Settings2 size={18} strokeWidth={1.8} className="shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>Configurações</span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              window.alert(
                `Central de ajuda · Perfil ativo: ${roleLabels[currentRole].title} (${roleLabels[currentRole].badge}).`
              )
            }
            title={collapsed ? "Ajuda e suporte" : undefined}
            aria-label="Ajuda e suporte"
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] text-stone-500 hover:bg-stone-100 hover:text-stone-900",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <CircleHelp size={18} strokeWidth={1.8} className="shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Ajuda e suporte</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[248px]"
        )}
      >
        {!fullScreenRoute && (
          <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur-md sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:hidden"
                aria-label="Abrir navegação"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={19} />
              </button>
              <span className="truncate text-xs font-medium text-stone-800">{currentPage}</span>
              <span
                className={cn(
                  "hidden sm:inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  roleLabels[currentRole].color
                )}
              >
                {roleLabels[currentRole].title}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {currentRole !== "funcionario" && (
                <div ref={searchRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setSearchOpen((value) => !value)}
                    aria-label="Buscar"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 md:w-[190px] md:justify-start md:gap-2 md:border md:border-border md:px-3"
                  >
                    <Search size={16} />
                    <span className="hidden text-xs md:inline">Buscar</span>
                  </button>

                  {searchOpen && (
                    <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-border bg-white p-3 shadow-xl">
                      <label htmlFor="admin-global-search" className="mb-2 block text-[11px] text-stone-500">
                        Buscar em páginas e recursos
                      </label>
                      <input
                        id="admin-global-search"
                        autoFocus
                        value={globalSearch}
                        onChange={(event) => setGlobalSearch(event.target.value)}
                        placeholder="Digite para filtrar..."
                        className="h-9 w-full rounded-lg border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
                      />
                      <div className="mt-2">
                        {allNav
                          .filter((item) => item.label.toLowerCase().includes(globalSearch.toLowerCase()))
                          .map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setSearchOpen(false)}
                              className="block rounded-md px-2.5 py-2 text-xs hover:bg-stone-100"
                            >
                              {item.label}
                            </Link>
                          ))}
                      </div>
                      {globalSearch.trim().length > 1 && (
                        <div className="mt-2 border-t border-border pt-2">
                          {searchLoading ? (
                            <p className="px-2.5 py-2 text-xs text-stone-500">Buscando...</p>
                          ) : searchResults.length ? (
                            searchResults
                              .filter((item) =>
                                currentRole === "admin"
                                  ? item.category === "user" && !item.content.toLowerCase().includes("super-admin")
                                  : true
                              )
                              .slice(0, 8)
                              .map((item) => (
                                <Link
                                  key={`${item.category}-${item.id}`}
                                  href={resultHref(item.category)}
                                  onClick={() => setSearchOpen(false)}
                                  className="block rounded-md px-2.5 py-2 hover:bg-stone-100"
                                >
                                  <span className="block text-xs font-medium">{item.title}</span>
                                  <span className="mt-0.5 block truncate text-[10px] text-stone-500">
                                    {item.category} · {item.content}
                                  </span>
                                </Link>
                              ))
                          ) : (
                            <p className="px-2.5 py-2 text-xs text-stone-500">Nenhum resultado encontrado.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {currentRole === "super-admin" && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((value) => !value)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
                    aria-label="Notificações"
                  >
                    <Bell size={17} />
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-border bg-white p-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Notificações</p>
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs text-stone-500 hover:text-stone-900"
                        >
                          Fechar
                        </button>
                      </div>
                      {currentRole === "super-admin" ? (
                        <>
                          <p className="mt-3 border-t border-border pt-3 text-xs text-stone-500">
                            3 erros críticos de infraestrutura detectados.
                          </p>
                          <Link
                            href="/super-admin/errors"
                            onClick={() => setNotificationsOpen(false)}
                            className="mt-3 inline-block text-xs font-medium text-foreground underline"
                          >
                            Ver logs de erros
                          </Link>
                        </>
                      ) : currentRole === "admin" ? (
                        <>
                          <p className="mt-3 border-t border-border pt-3 text-xs text-stone-500">
                            Alterações de usuários salvas com justificativa para auditoria.
                          </p>
                          <Link
                            href="/admin/users"
                            onClick={() => setNotificationsOpen(false)}
                            className="mt-3 inline-block text-xs font-medium text-foreground underline"
                          >
                            Ver gestão de usuários
                          </Link>
                        </>
                      ) : (
                        <p className="mt-3 border-t border-border pt-3 text-xs text-stone-500">
                          Nenhuma nova notificação para o seu perfil.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Profile Dropdown & Role Switcher */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  aria-label="Abrir perfil"
                  className="flex items-center gap-2 rounded-lg p-1 hover:bg-stone-100"
                >
                  <Avatar
                    initials={currentRole === "super-admin" ? "MC" : currentRole === "admin" ? "RM" : "LF"}
                    className="h-8 w-8"
                  />
                  <ChevronDown size={14} className="hidden text-stone-500 sm:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-border bg-white p-2 shadow-xl text-xs">
                    <div className="px-2.5 py-2 border-b border-border">
                      <p className="font-semibold text-foreground">
                        {currentRole === "super-admin"
                          ? "Marina Costa"
                          : currentRole === "admin"
                          ? "Rafael Mendes"
                          : "Lucas Ferreira"}
                      </p>
                      <p className="truncate text-muted-foreground">{session.email}</p>
                      <span
                        className={cn(
                          "mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          roleLabels[currentRole].color
                        )}
                      >
                        {roleLabels[currentRole].title} ({roleLabels[currentRole].badge})
                      </span>
                    </div>

                    <div className="py-2 border-b border-border">
                      <p className="px-2.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                        <ArrowRightLeft size={11} /> Alternar área (Demonstração)
                      </p>
                      <button
                        type="button"
                        onClick={() => switchRole("super-admin")}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-1.5 text-left transition flex items-center justify-between",
                          currentRole === "super-admin" ? "bg-muted font-medium" : "hover:bg-stone-50"
                        )}
                      >
                        <span>Super-admin</span>
                        {currentRole === "super-admin" && <span className="text-[10px] text-emerald-600 font-semibold">Ativo</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchRole("admin")}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-1.5 text-left transition flex items-center justify-between",
                          currentRole === "admin" ? "bg-muted font-medium" : "hover:bg-stone-50"
                        )}
                      >
                        <span>Admin</span>
                        {currentRole === "admin" && <span className="text-[10px] text-emerald-600 font-semibold">Ativo</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchRole("funcionario")}
                        className={cn(
                          "w-full rounded-lg px-2.5 py-1.5 text-left transition flex items-center justify-between",
                          currentRole === "funcionario" ? "bg-muted font-medium" : "hover:bg-stone-50"
                        )}
                      >
                        <span>Funcionário</span>
                        {currentRole === "funcionario" && <span className="text-[10px] text-emerald-600 font-semibold">Ativo</span>}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={logout}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 mt-1"
                    >
                      <LogOut size={14} /> Sair da conta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={fullScreenRoute ? "h-dvh min-w-0 overflow-hidden" : "mx-auto max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9"}>
          {children}
        </main>
      </div>
    </div>
  );
}
