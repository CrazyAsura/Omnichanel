# Segurança, auditoria e proteção de dados

## Controles no código

- A API Java valida JWT emitido por um provedor OIDC/JWKS configurado pela organização, incluindo emissor, validade e audiência. Sem emissor/JWKS, tokens são rejeitados. O provedor precisa emitir `sub` e a lista `roles` com `EMPLOYEE`, `ADMIN` e `SUPER_ADMIN`.
- O backend aplica RBAC no servidor: chat exige funcionário autenticado; busca Elasticsearch e relatórios exigem ADMIN; rotas `/api/v1/admin/**` exigem ADMIN; `/api/v1/super-admin/**` exigem SUPER_ADMIN.
- Java e backend-ai autenticam a chamada gRPC com um segredo de serviço aleatório com no mínimo 32 caracteres. O segredo não deve ser enviado ao navegador.
- O serviço de IA exige o mesmo segredo no cabeçalho `X-Service-Token` para suas rotas REST privadas e valida-o em tempo constante. A verificação gRPC rejeita chamadas sem credencial.
- RAG aplica classificação no serviço, tanto à busca vetorial quanto aos documentos selecionados. Papéis não reconhecidos viram EMPLOYEE; documentos novos ou sem classificação exigem SUPER_ADMIN. A política está em `backend-ai/data/document-access.json`.
- A trilha de auditoria guarda horário, papel de ação (método), categoria de rota, resultado, ID de requisição e um hash SHA-256 do `sub`. Não guarda prompt, resposta, query string, IP, cookie ou token. Retenção padrão: 365 dias, configurável por `SECURITY_AUDIT_RETENTION_DAYS`.
- O cache de respostas de chat foi removido para evitar retenção incidental de prompts e resultados pessoais. Entradas são validadas com limites de tamanho; erros externos não são retornados ao usuário.
- Portas do Compose são vinculadas a `127.0.0.1`; Redis exige senha; credenciais padrão conhecidas foram removidas. Elasticsearch, Kafka e ChromaDB continuam sem autenticação/TLS no Compose de desenvolvimento e não devem ser expostos fora da máquina. O backend-ai usa Chroma local em arquivo; o container ChromaDB separado existe apenas para compatibilidade e não participa do RAG atual.

## Configuração antes de executar

Copie `.env.example` para `.env` e configure senhas distintas e aleatórias para SQL Server, usuário runtime, usuário de migração, IA, RabbitMQ, Redis e Grafana. Crie logins separados no SQL Server: `APP_DB_USERNAME` deve ter apenas permissões DML necessárias; `DB_MIGRATION_USERNAME` recebe permissões DDL necessárias ao Flyway. A aplicação e as migrações nunca devem usar `sa`. Configure `JWT_ISSUER_URI`, `JWT_JWK_SET_URI` e `JWT_AUDIENCE` para o provedor de identidade da empresa e mapeie os papéis autorizados. Não use os placeholders do exemplo como segredos.

O login da interface ainda precisa ser conectado ao mesmo provedor OIDC para obter e enviar tokens de acesso; esconder páginas no frontend nunca substitui a autorização do backend. Para produção, use HTTPS na entrada e TLS/mTLS entre serviços, credenciais gerenciadas por secret manager, Kafka/Elasticsearch com autenticação e criptografia, backups criptografados e monitoramento de acesso aos logs. O canal gRPC do Compose é plaintext dentro da rede local Docker, protegido por token; isso não substitui TLS em ambiente produtivo.

## Operação responsável de IA e LGPD

Esta implementação fornece controles técnicos e trilhas de evidência, mas não certifica conformidade. A organização controladora precisa definir e documentar finalidade, hipótese legal, necessidade, transparência, papéis de controlador/operador, contratos com fornecedores, aviso interno, canal do encarregado e processo para direitos dos titulares. Avalie e mantenha RIPD quando o risco do tratamento justificar, inclusive antes de disponibilizar documentos com dados pessoais à busca/RAG.

Classifique cada documento antes da indexação. A política atual libera somente o manual operacional para EMPLOYEE; contrato e política de segurança são ADMIN; novos arquivos são SUPER_ADMIN até classificação expressa. Revise a classificação antes de alterar `document-access.json`. O índice vetorial é reconstruído dos arquivos aprovados ao iniciar o backend-ai; reinicie o serviço depois de corrigir classificações ou remover documentos para expurgar vetores antigos. Defina também retenção dos originais e backups no armazenamento que os mantém.

O modelo deve permanecer em infraestrutura aprovada pela empresa; não encaminhe prompts ou documentos a um fornecedor externo sem avaliação, base legal, transparência e contrato de operador adequados. As instruções de sistema tratam documentos recuperados como conteúdo não confiável, mas não eliminam prompt injection nem respostas incorretas. Exija revisão humana para decisões que afetem pessoas, não use o protótipo para decisões exclusivamente automatizadas com efeitos relevantes e não indexe credenciais, dados sensíveis ou documentos restritos sem autorização formal.

Mantenha processo de resposta a incidentes com registro de detecção, avaliação de risco, medidas de contenção, decisão de comunicar e evidências. Para incidentes com dados pessoais que possam acarretar risco ou dano relevante, a Resolução CD/ANPD nº 15/2024 prevê comunicação pelo controlador à ANPD e aos titulares em até três dias úteis; mantenha o registro de incidentes pelo prazo regulatório mínimo de cinco anos, separado da retenção geral de auditoria. A comunicação e avaliação cabem ao controlador/encarregado, não ao software.

Referências oficiais:

- [Lei nº 13.709/2018 (LGPD), texto compilado](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
- [Resolução CD/ANPD nº 15/2024 — comunicação de incidentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca)
- [ANPD — procedimento e prazo de comunicação de incidentes](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis)
- [ANPD — Radar Tecnológico sobre IA generativa](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/radar_tecnologico_ia_generativa_anpd.pdf)
