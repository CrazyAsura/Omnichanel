# Interface web

Aplicação Next.js 16 com React 19 e TypeScript para a demonstração interna de um assistente corporativo. A interface usa shadcn/ui, Tailwind CSS, Redux Toolkit, React Hook Form, Zod, TanStack Query, Axios, Motion e Recharts.

## Requisitos

- Node.js 20 ou superior e npm.
- O backend Spring Boot para chamadas autenticadas de chat e leitura de respostas em voz.

## Desenvolvimento

Copie `.env.example` para `.env` e preencha `NEXT_PUBLIC_API_URL` com a origem pública do Nginx. Na pasta `frontend`:

```bash
npm ci
npm run dev
```

Acesse `http://localhost:3000` em desenvolvimento local. `NEXT_PUBLIC_API_URL` é obrigatória, inclusive durante o build, e deve apontar para a origem que recebe `/api/`. Para o Compose do exemplo, use `http://localhost:8088`; a URL é incorporada ao bundle do Next.js. Não coloque segredos em variáveis `NEXT_PUBLIC_*`.

## Com Docker Compose

O Compose desta pasta inicia Next.js e Nginx. Crie uma vez a rede Docker externa indicada em `DOCKER_NETWORK`, configure `.env` e inicie primeiro o Compose da pasta `backend` na mesma rede. Depois, nesta pasta:

```bash
docker compose --env-file .env up --build
```

Acesse a origem definida por `NGINX_BIND_ADDRESS` e `NGINX_PORT` (no exemplo: `http://localhost:8088`). O Nginx encaminha `/api/` somente ao Java e as demais rotas ao Next.js; falhas da API são retornadas pela API, sem redirecionamento para o frontend. Next.js, Java e IA não publicam portas HTTP diretamente no host no Compose integrado.

## Scripts

```bash
npm run dev     # servidor de desenvolvimento
npm run build   # compilação de produção
npm run start   # servidor de produção local
npm run lint    # ESLint
```

## Estrutura

- `src/app`: rotas de login, recuperação de senha e áreas de funcionário, administrador e superadministrador.
- `src/components`: componentes e experiências de chat.
- `src/lib`: cliente Axios e dados de demonstração.

## Rotas da interface

Estas são rotas de páginas Next.js, não endpoints REST. Navegação disponível no código:

| Página | Rota |
| --- | --- |
| Início/demonstração | `/` |
| Login | `/login` |
| Recuperar senha | `/reset-password` |
| Área de funcionário | `/funcionario` |
| Chat de funcionário | `/funcionario/chat` |
| Painel de administrador | `/admin` |
| Usuários e edição | `/admin/users`, `/admin/users/:email`, `/admin/users/:email/edit`, `/admin/users/employees`, `/admin/users/admins` |
| Chat, integrações e relatórios de administrador | `/admin/chat`, `/admin/integrations`, `/admin/reports` |
| Painel de superadministrador | `/super-admin` |
| Usuários de superadministrador | `/super-admin/users`, `/super-admin/users/employees`, `/super-admin/users/admins`, `/super-admin/users/super-admins` |
| Arquivos e permissões | `/super-admin/files`, `/super-admin/files/:fileName`, `/super-admin/files/:fileName/access` |
| Chat, integrações, relatórios e atividade | `/super-admin/chat`, `/super-admin/integrations`, `/super-admin/reports`, `/super-admin/activity`, `/super-admin/errors` |

## Credenciais e configuração

O frontend não mantém credenciais corporativas próprias. Login e recuperação de senha são telas demonstrativas; os dados administrativos e parte do histórico ficam no navegador. **Não use dados pessoais ou credenciais reais nessas telas.** O cliente Axios chama a API Java; as rotas protegidas exigem JWT corporativo. A integração de JWT no frontend e o fluxo de autenticação ainda precisam ser conectados ao provedor de identidade.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Sim | Origem pública do Nginx, usada no build do navegador (exemplo: `http://localhost:8088`). Nunca coloque segredo aqui. |
| `NGINX_BIND_ADDRESS`, `NGINX_PORT` | Sim | Endereço e porta publicados pelo Nginx. |
| `NGINX_API_UPSTREAM` | Sim | URL interna do Java, sem barra final (exemplo: `http://app:8080`). |
| `NGINX_FRONTEND_UPSTREAM` | Sim | URL interna do Next.js, sem barra final (exemplo: `http://frontend:3000`). |
| `NGINX_PROXY_READ_TIMEOUT`, `NGINX_CLIENT_MAX_BODY_SIZE` | Sim | Tempo máximo de espera do proxy e limite de corpo das requisições. |
| `DOCKER_NETWORK`, `NODE_ENV` | Sim | Rede externa compartilhada e modo de execução do Next.js. |

Copie `.env.example` para `.env`. O Compose interrompe a inicialização se faltar alguma variável usada na publicação; o Dockerfile também exige `NEXT_PUBLIC_API_URL` no build. Não armazene senhas, tokens de API, JWTs ou segredos em variáveis `NEXT_PUBLIC_*`.

O chat guarda seu histórico demonstrativo no navegador. Leia também [`../backend/README.md`](../backend/README.md) para rotas REST e configuração do JWT e [`../backend-ai/README.md`](../backend-ai/README.md) para credenciais e rotas internas de IA.

## Editor de integrações

As rotas `/admin/integrations` e `/super-admin/integrations` compartilham um editor visual. É possível criar, renomear, duplicar e excluir fluxos; adicionar e mover etapas; conectar e remover ligações; editar parâmetros de HTTP, MCP e agente; cadastrar conexões; filtrar o catálogo; e simular o percurso do fluxo. Fluxos, metadados das conexões e histórico das simulações são guardados em `localStorage` neste navegador.

A simulação valida a estrutura e percorre as etapas, mas não chama APIs, ferramentas MCP nem o agente. O campo de chave de API aceita entrada para compor o cadastro demonstrativo, mas a chave é descartada após salvar; somente os últimos quatro caracteres ficam visíveis. Para execução real, é necessário implementar um serviço de credenciais e execução no backend com controle de acesso e auditoria.
