# Voz do chat

As respostas usam Kokoro 0.9.4 / Kokoro-82M (Apache 2.0), idioma `p`
(português brasileiro), voz `pf_dora`, CPU e WAV mono a 24 kHz.
Referência: https://github.com/hexgrad/kokoro

## Executar

Use o Docker Compose em `backend`, com o `.env` já configurado:

```sh
docker compose up -d --build backend-ai app
```

O Docker usa Python 3.12 e instala espeak-ng. Para execução fora do Docker,
use Python 3.10–3.13, instale espeak-ng no sistema e reinstale requirements.txt.
Kokoro 0.9.4 não suporta Python 3.14. Os pesos e a voz são baixados do
Hugging Face no primeiro uso e armazenados no cache do usuário do serviço;
essa primeira preparação pode ultrapassar o timeout de 180 segundos.
Nesse caso, espere a preparação terminar e tente novamente. Sem acesso à
internet, provisione o cache dos modelos antes de iniciar o serviço.

## Fluxo e limites

O navegador envia o texto para `POST /api/chat/speech` no Java, usando o
mesmo cliente autenticado do chat. O Java chama `POST /api/speech` na IA
com o segredo de serviço, nunca exposto ao navegador. `AI_HTTP_URL` define
o endereço interno (no Compose: `http://backend-ai:8000`). É necessário um
JWT válido: o login demonstrativo existente não emite esse token.

Há uma geração por processo; chamadas concorrentes recebem 429. O limite
é de 4.000 caracteres e seis minutos de áudio por chamada. O frontend divide
respostas longas em trechos e permite cancelar a reprodução ou o carregamento.
Cancelar no navegador não interrompe uma inferência já iniciada no servidor;
ela termina dentro dos limites de entrada e libera o serviço.

Texto e áudio permanecem em memória, com `Cache-Control: no-store` e sem
logs de conteúdo. A auditoria existente registra rota/status. A geração
é local; não há envio do texto para um provedor de síntese externo.

Esta mudança melhora a leitura das respostas. O botão de ditado continua
usando reconhecimento de fala do navegador, cujo processamento depende dele.
Qualidade percebida e latência devem ser avaliadas no hardware de destino.
