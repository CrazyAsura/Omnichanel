---
name: file_generator
description: Skill de compilação, estruturação e geração automatizada de relatórios operacionais, minutas de contratos e resumos executivos em arquivos para download (PDF corporativo por padrão, além de DOCX, XLSX e PPTX).
---

# Skill: Gerador de Arquivos e Relatórios

Esta skill capacita o agente a:
1. Produzir somente o conteúdo textual do documento solicitado.
2. Entregar um objeto JSON com `title`, `summary`, `sections` e `conclusion`. Cada seção contém `heading`, `paragraphs` e, quando necessário, `items`.
3. Escrever texto simples e escolher seções pertinentes ao pedido, sem inventar informações para preencher o modelo.
4. Deixar a formatação visual executiva, o nome do arquivo, a identificação institucional, a data e as fontes a cargo dos modelos padrão aplicados pelo servidor. O formato padrão gerado e exportado para download é PDF corporativo (`.pdf`), com suporte completo a documentos Word (`.docx`), planilhas Excel (`.xlsx`), apresentações PowerPoint (`.pptx`) e Markdown (`.md`).
