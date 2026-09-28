# Backend de IA

Serviço Python que combina FastAPI, gRPC, AgentScope, Ollama e ChromaDB para orquestrar agentes e consultar documentos autorizados. Também gera áudio de respostas em português brasileiro com Kokoro.

## Requisitos

- Docker e Docker Compose (recomendado) ou Python 3.10–3.13.
- Ollama acessível pelo serviço e o modelo indicado por `OLLAMA_MODEL` disponível no servidor Ollama.
- Segredo `AI_SERVICE_TOKEN` com pelo menos 32 caracteres aleatórios. Use o mesmo valor no serviço Java.

Kokoro 0.9.4 não dá suporte a Python 3.14. A imagem Docker usa Python 3.12, instala `espeak-ng` e `libsndfile1`. Os pesos de voz são baixados do Hugging Face no primeiro pedido de síntese; prepare o cache antes de executar em ambiente sem acesso externo. Consulte [`SPEECH.md`](SPEECH.md) para detalhes de voz, latência, limites e privacidade.

## Configuração

Copie `.env.example` para `.env` e configure, no mínimo, `AI_SERVICE_TOKEN`. Ajuste os endereços Ollama, Kafka, Elasticsearch e CORS para o ambiente. Não registre nem compartilhe valores de segredo.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `AI_SERVICE_TOKEN` | Sim | Segredo interno compartilhado pelo Java, REST AI e gRPC; no mínimo 32 caracteres aleatórios. Não enviar ao navegador. |
| `OLLAMA_BASE_URL` | Não; padrão local depende da execução | URL do servidor Ollama (`http://host.docker.internal:11434` no Compose isolado). |
| `OLLAMA_MODEL` | Não; padrão `gemma4:e4b` | Identificador do modelo já baixado no Ollama. |
| HTTP `8000`, gRPC `50051` | Internas fixas no Compose | Portas do serviço dentro da rede Docker; não publicadas no host. |
| `KAFKA_BOOTSTRAP_SERVERS`, `ELASTICSEARCH_URL`, `AI_EVENTS_TOPIC` | Não | Endereços/configuração de serviços de apoio. No Compose integrado, use os nomes DNS internos dos serviços. |
| `CORS_ALLOWED_ORIGINS` | Não | Origens de navegador permitidas. O navegador deve chamar o Java; não publique a API interna de IA ao público. |
| `DOCKER_NETWORK` | Não | Nome da rede Docker compartilhada (padrão `omnichannel-network`). |

O Compose isolado não configura usuário/senha para Ollama, Kafka ou Elasticsearch. Não exponha esses serviços sem adicionar autenticação e TLS conforme o ambiente.

## Executar com Docker

Na pasta `backend-ai`:

```bash
docker compose up --build
```

O serviço disponibiliza HTTP na porta interna `8000` e gRPC na `50051`, sem publicar essas portas no host. Configure todas as variáveis exigidas no `.env`; não há valores padrão no Compose. Para execução integrada com SQL Server, Kafka, Elastic, Prometheus e Grafana, use apenas o Compose em [`../backend/`](../backend/README.md), que já inclui este serviço.

## Executar localmente

Instale Python 3.10–3.13 e `espeak-ng` no sistema. Crie e ative um ambiente virtual, instale as dependências e defina o segredo:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Defina `AI_SERVICE_TOKEN`, `OLLAMA_BASE_URL` e `OLLAMA_MODEL` no ambiente. O gRPC inicia junto com a aplicação FastAPI na porta configurada.

## Endpoints

- `GET /health`: saúde básica do serviço.
- `GET /metrics`: métricas Prometheus.
- `POST /api/chat`: conversa com agente (requer `X-Service-Token`).
- `POST /api/speech`: síntese de áudio WAV Kokoro (requer `X-Service-Token`). Em uso normal, acesse pelo endpoint autenticado do Java.
- `GET /docs`: Swagger UI do FastAPI.
- gRPC `AgentService`: conversa e verificação de saúde, autenticados com metadado `x-service-token`.

Os endpoints REST internos exigem `X-Service-Token: <AI_SERVICE_TOKEN>`, exceto `GET /health` e `GET /metrics`. Use a rota Java com JWT para chamar voz e chat a partir do navegador; não inclua o segredo interno em requisições do frontend.

## Documentos e controles de acesso

O corpus local fica em `data/docs/`; `data/document-access.json` define a classificação mínima por documento. Novos documentos sem classificação ficam restritos a `SUPER_ADMIN`. O índice local é reconstruído quando o serviço inicia; reinicie o serviço após alterar documentos ou suas regras de acesso.

## Verificação

```bash
python -m unittest test_security test_access_control -v
python -m unittest test_agent -v
```

Os testes de segurança e controle de acesso não exigem execução de inferência do modelo. Os testes de agente podem depender do Ollama e do modelo configurado. Leia [`../backend/SECURITY-PRIVACY.md`](../backend/SECURITY-PRIVACY.md) antes de conectar dados reais.
