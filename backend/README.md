# Omnichannel Backend

Spring Boot REST API with SQL Server, Kafka and Elasticsearch, integrated over authenticated gRPC with the Python `backend-ai` service.

## Start locally

1. Copy `.env.example` to `.env` and fill each required secret with a distinct random value. The template is deliberately blank.
2. Set a random `JWT_SECRET` of at least 32 characters and configure `JWT_ISSUER_URI` and `JWT_AUDIENCE`. Login at `POST /api/auth/login` issues 12-hour HS256 JWTs. Seed users use `email|name|base64(BCrypt hash)|ROLE[,ROLE...]`, separated by semicolons.
3. Create the `omnichannel` database and separate SQL Server logins: runtime (`APP_DB_USERNAME`) with DML permissions only, and Flyway (`DB_MIGRATION_USERNAME`) with the DDL permissions needed for migrations. Keep `sa` only for SQL Server administration and health checks.
4. Create the external Docker network named by `DOCKER_NETWORK` in `.env` (the example uses `docker network create omnichannel-network`). Set `FRONTEND_ORIGIN` to the Nginx public origin, matching `NEXT_PUBLIC_API_URL` in `frontend/.env`.
5. Run from this folder, then start the `frontend` Compose project on the same network:

```powershell
docker compose --env-file .env up --build
```

The public entrypoint is Nginx from the `frontend` Compose project (example: `http://localhost:8088`). It proxies `/api/` to Java and all other paths to Next.js. Java HTTP, AI HTTP, and gRPC are available only on the shared Docker network. AI REST still requires `X-Service-Token` on private endpoints. Local infrastructure tools remain loopback-bound. The Compose Elasticsearch instance has security disabled and must not be exposed to an untrusted network.

The Java API requires a valid JWT for application routes. Chat and speech require authentication; reports are restricted to ADMIN and SUPER_ADMIN.

The AI service uses the configured Ollama model and indexes the approved corpus from `backend-ai/data/docs`. Document access is enforced in the AI service and follows `backend-ai/data/document-access.json`. New or unclassified documents are SUPER_ADMIN-only. Restart backend-ai after changing source files or classifications; it rebuilds the vector index at startup.

### Document file storage

Uploaded document bytes are stored as ordinary files on the Docker host server, in the directory configured by `DOCUMENT_STORAGE_HOST_PATH` (default: `backend/document-storage/`). Compose bind-mounts that directory into the Java container at `/app/data/documents`; it does not use a Docker named volume for document contents. Back up this host directory along with the database, since the database stores document metadata and permissions while the original bytes live here. The default directory is ignored by Git.

On a Linux server, create the directory and grant access to the backend container user (UID 10001) before starting Compose:

```sh
mkdir -p ./document-storage
sudo chown 10001:10001 ./document-storage
```

For another host path, set `DOCUMENT_STORAGE_HOST_PATH` in `backend/.env` to that path and apply the same ownership to it. Existing metadata-only document records do not contain original file bytes; upload those files again to enable previews. PDF files open inline; text, Markdown, and CSV files render in the page. DOCX and XLSX files are stored and can be downloaded, but do not yet have an in-page preview renderer.

## Local endpoints

- Java health: `GET /api/v1/health`.
- AI health: `GET /health`; metrics: `/metrics`; private REST routes include `/api/skills`, `POST /api/chat`, `POST /api/speech`, and vector store status/query.
- Speech: authenticated `POST /api/chat/speech`, proxied to the internal Kokoro service. This route accepts the text as JSON and returns WAV audio without storing either payload. See [AI speech setup and limits](../backend-ai/SPEECH.md).
- SQL Server: `localhost:1433`; Elasticsearch: `http://localhost:9200`.

## Tests

Java: `mvn test` from this folder. Python security and access-control tests: from `backend-ai`, run `python -m unittest test_security test_access_control -v`. The full AI test suite may call the configured model and should only be run against an approved development model.

Review [SECURITY-PRIVACY.md](SECURITY-PRIVACY.md) before connecting real employee or customer data. The controls support security and accountability but do not by themselves establish LGPD compliance.

## API routes

The Spring Boot API is available at `<NGINX_PUBLIC_ORIGIN>/api/` through Nginx. Unless marked public below, send `Authorization: Bearer <JWT>` from the configured identity provider. The token must be signed, have the configured issuer and audience, and include a `roles` array. Prefix is `ROLE_` internally. Internal service tokens do not authenticate browser users.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Exchange seed account credentials for an HS256 JWT |
| `GET` | `/api/health`, `/api/v1/health` | Public | Java health check |
| `GET` | `/api/chat/health`, `/api/v1/chat/health` | Public | Chat dependency health check |
| `POST` | `/api/chat`, `/api/v1/chat` | `EMPLOYEE`, `ADMIN`, `SUPER_ADMIN` | Chat with the AI agent |
| `POST` | `/api/chat/speech`, `/api/v1/chat/speech` | `EMPLOYEE`, `ADMIN`, `SUPER_ADMIN` | Generate `audio/wav` from JSON `{ "text": "..." }` |
| `POST` | `/api/documents/upload`, `/api/v1/documents/upload` | `ADMIN`, `SUPER_ADMIN` | Upload PDF, DOCX, XLSX, CSV, TXT, or MD (maximum 50 MB) to host storage and register metadata |
| `GET` | `/api/documents/{name}/content`, `/api/v1/documents/{name}/content` | `EMPLOYEE`, `ADMIN`, `SUPER_ADMIN` | Read the stored original document bytes |
| `POST` | `/api/documents/zip`, `/api/v1/documents/zip` | `ADMIN`, `SUPER_ADMIN` | Stream a lossless ZIP of stored documents; JSON body `{ "names": ["manual.pdf", "resumo.md"] }` |
| `POST` | `/api/documents/unzip`, `/api/v1/documents/unzip` | `ADMIN`, `SUPER_ADMIN` | Stream-extract a ZIP upload and register its supported files in host storage |
| `GET` | `/api/v1/search?q=...` | `ADMIN`, `SUPER_ADMIN` | Search admin index |
| `GET` | `/api/reports/executive/pdf`, `/api/v1/reports/executive/pdf` | `ADMIN`, `SUPER_ADMIN` | Produce/view executive PDF; optional `startDate`, `endDate`, `title`, `download` query parameters |
| `GET` | `/actuator/health`, `/actuator/health/**` | Public | Spring health probes |
| `GET` | `/swagger-ui.html`, `/v3/api-docs/**` | Authenticated | OpenAPI documentation |

Role path prefixes `/api/v1/admin/**` and `/api/v1/super-admin/**` also enforce administrator and super-administrator JWT roles. No controller routes currently exist under those prefixes.

ZIP processing uses 32 KiB buffers and reads/writes directly between disk and the HTTP stream. ZIP compression preserves the original bytes without re-encoding. An archive upload is limited to 200 MB; extraction accepts up to 100 PDF, DOCX, XLSX, CSV, TXT, or MD files, at most 100 MB per file and 500 MB total. Paths inside archives are flattened into the document storage directory, traversal entries and duplicate names are rejected, and the Nginx request-size limit is set to 210 MB.

### AI service routes

Base URL in Docker: `http://backend-ai:8000` from the Java container. There is no host mapping and no Nginx route for the AI service. Internal REST requests require `X-Service-Token: <AI_SERVICE_TOKEN>`. `/health` and `/metrics` are unauthenticated endpoints available only within the Docker network.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | AI HTTP/gRPC health |
| `GET` | `/metrics` | Public | Prometheus metrics |
| `GET` | `/api/skills` | Service token | List loaded AgentScope skills |
| `POST` | `/api/chat` | Service token | Chat endpoint (direct REST requests run with `EMPLOYEE` document access) |
| `POST` | `/api/speech` | Service token | Kokoro Brazilian Portuguese WAV, text up to 4,000 characters |
| `GET` | `/api/vector-store/status` | Service token | Vector collection status |
| `POST` | `/api/vector-store/query` | Service token | Semantic query (direct REST requests run with `EMPLOYEE` document access) |
| gRPC | `AgentService/Chat`, `AgentService/HealthCheck` | Service token metadata `x-service-token` | Private Java-to-AI calls |

FastAPI OpenAPI is at `http://backend-ai:8000/docs` within the Docker network. Java OpenAPI remains on the internal Java service and requires a valid JWT; Nginx publishes only `/api/` for the backend.

## Credentials and environment variables

Copy `.env.example` to `.env` in this folder. **Enter secret values only in the ignored `.env`; never commit them or put them in source code, README files, browser variables, logs, or screenshots.** Use distinct random credentials outside development. `.env.example` lists all supported ports and overrides; principal variables:

| Variable | Used by | Meaning |
| --- | --- | --- |
| `DB_PASSWORD` | SQL Server | SQL Server `sa` administrator password, used only for container initialization/health checks |
| `APP_DB_USERNAME`, `APP_DB_PASSWORD` | Java | Restricted runtime SQL Server login (DML only) |
| `DB_MIGRATION_USERNAME`, `DB_MIGRATION_PASSWORD` | Flyway | Separate SQL Server login for schema migrations (required DDL rights) |
| `JWT_ISSUER_URI`, `JWT_SECRET`, `JWT_AUDIENCE` | Java | Local JWT issuer, HS256 signing secret, and expected token audience |
| `SEED_USERS` | Java | Seed accounts with base64-encoded BCrypt hashes and roles |
| `AI_SERVICE_TOKEN` | Java and AI | Shared internal REST/gRPC service secret; use at least 32 random characters, and keep it out of the browser |
| `AI_HTTP_URL` | Java | Internal AI REST base URL; Compose sets `http://backend-ai:8000` (not secret) |
| `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | RabbitMQ and Java | Broker service account and password |
| `REDIS_PASSWORD` | Redis and Java | Redis authentication secret |
| `FRONTEND_ORIGIN` | Java and AI | Browser origin served by Nginx (example: `http://localhost:8088`); not a secret |
| `SECURITY_AUDIT_RETENTION_DAYS` | Java | Audit event retention; defaults to 365 days |
| `DOCUMENT_STORAGE_HOST_PATH` | Compose | Host-server directory bind-mounted for uploaded file contents; defaults to `./document-storage` relative to this Compose file |
| `OLLAMA_BASE_URL` | AI | URL for the locally hosted Ollama instance |

Fixed local infrastructure mappings: SQL Server `1433`, Kafka `9092` (host client listener `29092`), Elasticsearch `9200`, RabbitMQ `5672`/management `15672`, ChromaDB `8001`, Redis `6379`. Nginx uses the port set in `frontend/.env`; Java and AI ports are internal only.

The backend `.env.example` also contains port and network settings, database connection placeholders, broker settings, monitoring settings, and frontend URL values. Required Compose variables are marked with `:?`; optional settings can have defaults. The integrated Compose file hardcodes several container-to-container addresses and sets the Grafana username to `admin`; editing a placeholder that Compose does not reference has no effect. Check `docker-compose.yml` to confirm a variable is wired before relying on an override.

## Related projects

- [Web interface](../frontend/README.md): Next.js application and browser configuration.
- [AI service](../backend-ai/README.md): FastAPI, gRPC, document access, and local speech generation.
